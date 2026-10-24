// Núcleo de Lomi, el agente de mensajería de LoMaz Home.
//
// Es el mismo «cerebro» para todos los canales (WhatsApp, Messenger, Instagram y el
// simulador del panel): recibe un mensaje ya traducido por el adaptador del canal,
// decide qué responder con Claude y el inventario, y devuelve las «salidas» (textos,
// fotos o botones) para que el adaptador las envíe.
//
// Las reglas importantes NO dependen de que Claude «se acuerde»: se verifican aquí.
//   · La dirección, las coordenadas y la comisión nunca llegan al modelo.
//   · Ningún precio sale si no está en el inventario o lo dijo el cliente.
//   · Solo se escriben enlaces de lomazhome.com; fotos y video los manda el código.
//   · Máximo 4 fotos y 1 video por respuesta; la búsqueda devuelve máximo 3 candidatos.
//   · Sin autorización expresa no se guarda ningún contacto.
//   · En modo «humano» Lomi no responde.
//   · Mensajes seguidos en pocos segundos se responden una sola vez.
//
// Uso: const agente = crearAgente({ repo, claude }); const r = await agente.atender(entrada);

const T = require("./textos-lomi.js");

const MAX_RONDAS = 6;
const MAX_FOTOS = 4;
const MAX_CANDIDATOS = 3;
const MAX_CORRECCIONES = 30;
const MAX_MENSAJES_SALIDA = 4;

/* ============================== Utilidades ============================== */

function sinTildes(t){ return String(t || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase(); }
function palabras(t){ return sinTildes(t).split(/[^a-z0-9ñ]+/).filter(function(p){ return p.length >= 3; }); }
function num(v){ if(v === null || v === undefined || v === "") return null; const n = Number(String(v).replace(/[^\d.-]/g, "")); return isFinite(n) && n > 0 ? n : null; }
function miles(n){ return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, "."); }

function precioTexto(n, negocio){
  if(!n) return null;
  if(negocio !== "arriendo" && n >= 1000000){
    const m = n / 1000000;
    return "$" + (Number.isInteger(m) ? miles(m) : String(Math.round(m * 10) / 10).replace(".", ",")) + " millones";
  }
  return "$" + miles(n);
}

function referencia(p){ return p.codigo_interno ? String(p.codigo_interno).replace(/^REF\s*/i, "") : "LH-" + p.id; }
function paginaDe(p){ return T.SITIO + "/propiedad-publica.html?id=" + p.id; }
function admin(p){ return num(p.precio_admin) || num(p.administracion); }
function listaFotos(p){
  let f = p.fotos;
  if(typeof f === "string"){ try{ f = JSON.parse(f); }catch(e){ f = f.split(","); } }
  return (Array.isArray(f) ? f : []).map(function(x){ return typeof x === "string" ? x.trim() : (x && x.url) || ""; }).filter(function(u){ return /^https:\/\//.test(u); });
}

// Lo que el modelo sabe de un inmueble. Lista blanca de campos: nada más sale de aquí.
function fichaParaModelo(p){
  const f = {
    ref: referencia(p), id: p.id, titulo: p.titulo, negocio: p.tipo_negocio, tipo: p.tipo_propiedad, subtipo: p.subtipo,
    barrio: p.barrio, ciudad: p.ciudad,
    precio: precioTexto(num(p.precio), p.tipo_negocio),
    administracion: admin(p) ? precioTexto(admin(p), "arriendo") : null,
    precio_negociable: p.precio_negociable === true ? "sí" : (p.precio_negociable === false ? "no" : null),
    area_m2: num(p.area_construida) || num(p.m2_construccion) || num(p.area_privada) || num(p.area_total),
    habitaciones: p.habitaciones, banos: p.banos,
    garajes: p.garajes !== null && p.garajes !== undefined ? p.garajes : p.parqueaderos,
    estrato: p.estrato, piso: p.piso, antiguedad: p.antiguedad || p.edad_inmueble, deposito: p.deposito,
    acepta_mascotas: p.acepta_mascotas === true ? "sí" : (p.acepta_mascotas === false ? "no" : null),
    amenidades: p.amenidades, caracteristicas: p.caracteristicas,
    descripcion: p.descripcion ? String(p.descripcion).slice(0, 700) : null,
    tiene_video: p.video_url ? "sí" : "no",
    fotos_disponibles: listaFotos(p).length,
    pagina: paginaDe(p)
  };
  Object.keys(f).forEach(function(k){
    const v = f[k];
    if(v === null || v === undefined || v === "" || (Array.isArray(v) && !v.length)) delete f[k];
  });
  return f;
}

// Montos que aparecen en un texto, en pesos: «$480 millones», «$2.600.000», «320 mil».
function montos(texto){
  const salida = [];
  const re = /(\$\s?)?(\d{1,3}(?:\.\d{3})+|\d+(?:,\d+)?)\s*(millones|millón|millon|mil\b)?/gi;
  let m;
  while((m = re.exec(String(texto || "")))){
    const signo = !!m[1], unidad = (m[3] || "").toLowerCase(), conPuntos = /\.\d{3}/.test(m[2]);
    let n = Number(m[2].replace(/\./g, "").replace(",", "."));
    if(/^mill/.test(unidad)) n *= 1000000;
    else if(unidad === "mil") n *= 1000;
    if(!signo && !unidad && !(conPuntos && n >= 100000)) continue; // «3 habitaciones», «85 m²» no son plata
    if(n >= 10000) salida.push(n);
  }
  return salida;
}

// Cifras que escribe el cliente («te ofrezco 430», «como de 2,5»): se aceptan en pesos, miles o millones.
function montosCliente(texto){
  const salida = montos(texto);
  (String(texto || "").match(/\d+(?:[.,]\d+)*/g) || []).forEach(function(c){
    const n = Number(/\.\d{3}/.test(c) ? c.replace(/\./g, "").replace(",", ".") : c.replace(",", "."));
    if(isFinite(n) && n > 0) salida.push(n, n * 1000, n * 1000000);
  });
  return salida;
}

function montoPermitido(n, permitidos){
  return permitidos.some(function(p){ return Math.abs(p - n) <= Math.max(1000, p * 0.005); });
}

// Deja el texto en formato de chat: *negrita*, sin encabezados, sin enlaces ajenos.
function formatoChat(texto){
  let t = String(texto || "");
  t = t.replace(/\*\*([^*]+)\*\*/g, "*$1*").replace(/__([^_]+)__/g, "_$1_");
  t = t.replace(/^\s{0,3}#{1,6}\s+/gm, "");
  t = t.replace(/(?:https?:\/\/|www\.)[^\s)]+/gi, function(url){
    return /^(?:https?:\/\/)?(?:www\.)?lomazhome\.com(?:[\/?#]|$)/i.test(url) ? url : "";
  });
  // Dominios sin «http» (youtube.com/…, bit.ly/…); los correos se respetan.
  t = t.replace(/(?<![@\w.\/-])(?:[a-z0-9-]+\.)+(?:com|co|net|org|io|me|be|ly|tv)(?:\/[^\s)]*)?/gi, function(dom){
    return /^(?:www\.)?lomazhome\.com(?:\/|$)/i.test(dom) ? dom : "";
  });
  t = t.replace(/\(\s*\)/g, "").replace(/[ \t]+\n/g, "\n").replace(/[ \t]{2,}/g, " ").replace(/\n{3,}/g, "\n\n");
  return t.trim();
}

function partirEnMensajes(texto){
  const partes = texto.split(/\n\s*\n/).map(function(p){ return p.trim(); }).filter(Boolean);
  if(partes.length <= MAX_MENSAJES_SALIDA) return partes;
  return partes.slice(0, MAX_MENSAJES_SALIDA - 1).concat([partes.slice(MAX_MENSAJES_SALIDA - 1).join("\n\n")]);
}

function similitud(a, b){
  const A = new Set(palabras(a)), B = new Set(palabras(b));
  if(!A.size || !B.size) return 0;
  let comun = 0;
  A.forEach(function(x){ if(B.has(x)) comun++; });
  return comun / (A.size + B.size - comun);
}

// Las correcciones del equipo más parecidas al mensaje actual (máximo 30).
function elegirCorrecciones(lista, texto){
  const puntuadas = (lista || []).map(function(c, i){ return { c: c, s: similitud(c.mensaje_cliente, texto), i: i }; });
  const parecidas = puntuadas.filter(function(x){ return x.s > 0; }).sort(function(a, b){ return b.s - a.s || a.i - b.i; });
  let elegidas = parecidas.slice(0, MAX_CORRECCIONES);
  if(elegidas.length < 5){
    puntuadas.forEach(function(x){ if(elegidas.length < 5 && elegidas.indexOf(x) < 0) elegidas.push(x); });
  }
  return elegidas.map(function(x){ return x.c; });
}

// Referencia o enlace del inmueble escrito por el cliente: «REF LH-042», «lh 42», «propiedad-publica.html?id=42».
function idEnTexto(texto, inventario){
  const t = String(texto || "");
  const url = t.match(/propiedad(?:-publica)?\.html\?id=(\d+)/i);
  if(url) return Number(url[1]);
  const codigo = (inventario || []).find(function(p){
    if(!p.codigo_interno) return false;
    const c = sinTildes(String(p.codigo_interno).replace(/^REF\s*/i, "")).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return c && new RegExp("(^|[^a-z0-9])" + c + "($|[^a-z0-9])").test(sinTildes(t));
  });
  if(codigo) return codigo.id;
  const lh = t.match(/\bLH[\s-]?0*(\d{1,6})\b/i);
  return lh ? Number(lh[1]) : null;
}

function respuestaAutorizacion(texto){
  const t = sinTildes(texto).trim();
  if(/^no\s+autorizo\b/.test(t)) return "no_autorizo";
  if(/^(si,?\s*)?autorizo\b/.test(t)) return "autorizo";
  return null;
}

/* ============================== Herramientas para Claude ============================== */

const HERRAMIENTAS = [
  {
    name: "buscar_inmuebles",
    description: "Busca en el inventario activo de LoMaz Home los inmuebles que coinciden con lo que el cliente describe, SOLO para identificar cuál vio. Devuelve máximo 3 candidatos con barrio, habitaciones y precio. Nunca uses el resultado como catálogo.",
    input_schema: { type: "object", properties: {
      negocio: { type: "string", enum: ["venta", "arriendo"] },
      tipo: { type: "string", description: "apartamento, casa, apartaestudio, local, lote, finca…" },
      barrio: { type: "string" },
      habitaciones: { type: "integer" },
      precio_aprox: { type: "number", description: "Precio que menciona el cliente, en pesos (450 millones = 450000000)." }
    } }
  },
  {
    name: "detalle_inmueble",
    description: "Trae los datos de un inmueble del inventario (por id o referencia LH-…) y lo fija como inmueble actual de la conversación. No incluye la dirección exacta.",
    input_schema: { type: "object", properties: { id: { type: "string", description: "Número o referencia (LH-42)." } }, required: ["id"] }
  },
  {
    name: "enviar_video",
    description: "Envía al cliente el video de YouTube del inmueble. Si no tiene video, envía hasta 4 fotos y el enlace a la ficha. Úsalo solo cuando el cliente pide video, fotos o «verlo».",
    input_schema: { type: "object", properties: { id: { type: "string" } }, required: ["id"] }
  },
  {
    name: "enviar_fotos",
    description: "Envía hasta 4 fotos del inmueble y el enlace a la ficha. Solo cuando el cliente pide fotos.",
    input_schema: { type: "object", properties: { id: { type: "string" }, cantidad: { type: "integer", minimum: 1, maximum: 4 } }, required: ["id"] }
  },
  {
    name: "enviar_ficha",
    description: "Envía el enlace de la página del inmueble en lomazhome.com, donde se descarga la ficha técnica en PDF.",
    input_schema: { type: "object", properties: { id: { type: "string" } }, required: ["id"] }
  },
  {
    name: "pedir_autorizacion",
    description: "Envía al cliente el texto legal de autorización de datos con los botones «Autorizo» y «No autorizo». Obligatorio antes de pedir el nombre, guardar el contacto o pasar la solicitud a un asesor. Después de usarla, no escribas nada más: espera la respuesta del cliente.",
    input_schema: { type: "object", properties: { tipo: { type: "string", enum: ["interesado", "propietario"] } }, required: ["tipo"] }
  },
  {
    name: "guardar_contacto",
    description: "Guarda o actualiza al cliente en Contactos (CRM). Solo funciona si el cliente ya autorizó.",
    input_schema: { type: "object", properties: {
      tipo: { type: "string", enum: ["comprador", "inquilino", "propietario", "otro"] },
      nombre: { type: "string" },
      email: { type: "string" },
      negocio: { type: "string", enum: ["venta", "arriendo", "ambos"] },
      zonas_interes: { type: "string" },
      presupuesto_max: { type: "number" },
      habitaciones_min: { type: "integer" },
      tipo_inmueble: { type: "string", description: "Para propietarios: tipo de su inmueble." },
      zona: { type: "string", description: "Para propietarios: barrio de su inmueble." },
      nota: { type: "string", description: "Oferta, preferencia de visita u otro dato útil para el asesor." }
    }, required: ["tipo", "nombre"] }
  },
  {
    name: "pasar_a_humano",
    description: "Pasa la conversación al equipo: negociación u oferta, el cliente pide una persona, falta un dato y el cliente quiere que lo comuniques, propietario, visita, o cliente molesto. Desde ahí Lomi deja de responder.",
    input_schema: { type: "object", properties: {
      motivo: { type: "string", enum: ["negociacion", "persona", "dato_faltante", "propietario", "visita", "molesto", "otro"] },
      resumen: { type: "string", description: "Dos líneas para el asesor." }
    }, required: ["motivo", "resumen"] }
  },
  {
    name: "registrar_interes_no_inmueble",
    description: "Marca la conversación cuando no es interés en un inmueble: proveedor, spam, publicidad o tema ajeno.",
    input_schema: { type: "object", properties: { tipo: { type: "string", enum: ["proveedor", "spam", "ajeno"] }, nota: { type: "string" } }, required: ["tipo"] }
  }
];

/* ============================== El agente ============================== */

function crearAgente(dep){
  const repo = dep.repo, claude = dep.claude;
  const esperar = dep.esperar || function(ms){ return new Promise(function(r){ setTimeout(r, ms); }); };
  const ahora = dep.ahora || function(){ return new Date(); };

  async function atender(entrada){
    const conv0 = await repo.conversacion(entrada.canal, entrada.idExterno, entrada.nombre);
    const contenido = entrada.tipo === "boton" ? (entrada.botonTitulo || entrada.botonId || "") : (entrada.texto || "");
    const guardado = await repo.guardarMensaje({
      conversacion_id: conv0.id, direccion: "entrada",
      tipo: entrada.tipo === "boton" ? "botones" : (["texto", "audio", "imagen"].indexOf(entrada.tipo) >= 0 ? entrada.tipo : (entrada.tipo ? "otro" : "texto")),
      contenido: (entrada.tipo === "boton" ? "[botón:" + (entrada.botonId || "") + "] " : "") + contenido,
      id_externo_mensaje: entrada.idMensaje || null
    });
    if(!guardado) return { duplicado: true, salidas: [] };

    const cambiosIniciales = { ultimo_mensaje_at: ahora().toISOString() };
    if(entrada.nombre && !conv0.nombre) cambiosIniciales.nombre = entrada.nombre;
    if(entrada.referral && !conv0.referral_json) cambiosIniciales.referral_json = entrada.referral;
    await repo.actualizarConversacion(conv0.id, cambiosIniciales);

    // Mensajes seguidos: se espera un momento y solo responde la llamada del último.
    const config = await repo.config();
    const espera = entrada.esperaMs !== undefined ? entrada.esperaMs : (config.espera_agrupar_ms !== undefined ? config.espera_agrupar_ms : 3500);
    if(espera > 0){
      await esperar(espera);
      const ultima = await repo.ultimaEntrada(conv0.id);
      if(ultima && ultima.id !== guardado.id) return { agrupado: true, salidas: [] };
    }

    const conv = await repo.conversacionPorId(conv0.id);
    const pendientes = await repo.entradasPendientes(conv.id);
    const idsPendientes = pendientes.map(function(m){ return m.id; });
    await repo.marcarProcesados(idsPendientes);

    if(conv.atendido_por === "humano") return { humano: true, salidas: [], conversacion: conv };

    const res = await responder(conv, pendientes, entrada, config);
    for(let i = 0; i < res.salidas.length; i++){
      const s = res.salidas[i];
      await repo.guardarMensaje({
        conversacion_id: conv.id, direccion: "salida", procesado: true,
        tipo: s.tipo === "imagen" ? "imagen" : (s.tipo === "botones" ? "botones" : "texto"),
        contenido: s.texto || s.pie || null, media_url: s.url || null,
        herramienta_usada: res.herramientas.join(",") || null
      });
    }
    const actualizada = await repo.actualizarConversacion(conv.id, res.cambios);
    return { salidas: res.salidas, herramientas: res.herramientas, alertas: res.alertas, conversacion: actualizada || Object.assign({}, conv, res.cambios) };
  }

  async function responder(conv, pendientes, entrada, config){
    const mensajesFijos = Object.assign({}, T.MENSAJES, config.mensajes || {});
    const salidas = [], herramientas = [], alertas = [];
    const datos = Object.assign({}, conv.datos || {});
    const consentimientos = Object.assign({}, conv.consentimientos || {});
    const cambios = { datos: datos, consentimientos: consentimientos };
    let propiedadActual = conv.propiedad_actual_id || null;

    if(!conv.aviso_enviado_at){
      salidas.push({ tipo: "texto", texto: mensajesFijos.aviso });
      cambios.aviso_enviado_at = ahora().toISOString();
    }

    // Texto del cliente en este turno (si mandó varios seguidos, van juntos).
    const textos = pendientes.filter(function(m){ return m.tipo === "texto" || m.tipo === "imagen" || m.tipo === "botones"; })
      .map(function(m){ return String(m.contenido || "").replace(/^\[botón:[^\]]*\]\s*/, ""); }).filter(Boolean);
    let textoCliente = textos.join("\n");

    // Respuesta a la autorización de datos: la registra el código, no Claude.
    const pendienteTipo = datos.autorizacion_pendiente;
    let decision = null;
    if(pendienteTipo){
      if(entrada.tipo === "boton" && (entrada.botonId === "autorizo" || entrada.botonId === "no_autorizo")) decision = entrada.botonId;
      else decision = respuestaAutorizacion(textoCliente);
    }
    if(decision){
      consentimientos[pendienteTipo] = {
        estado: decision, at: ahora().toISOString(), mensaje: entrada.idMensaje || null,
        version: T.VERSION_TEXTO[pendienteTipo], politica: config.politica_version || null
      };
      delete datos.autorizacion_pendiente;
      if(decision === "no_autorizo"){
        salidas.push({ tipo: "texto", texto: mensajesFijos.no_autorizo });
        cambios.estado = propiedadActual ? "informando" : "filtrando";
        return { salidas: salidas, herramientas: ["registro_no_autorizo"], alertas: alertas, cambios: cambios };
      }
      textoCliente = "[El cliente tocó «Autorizo» en la autorización de datos (" + pendienteTipo + "). Continúa: si falta, pídele su nombre.]";
    }

    if(!textoCliente){
      salidas.push({ tipo: "texto", texto: mensajesFijos.solo_texto });
      return { salidas: salidas, herramientas: [], alertas: alertas, cambios: cambios };
    }

    // Pistas 1 y 2: anuncio registrado, referencia o enlace del inmueble.
    let inventario = null;
    async function inventarioActivo(){ if(!inventario) inventario = (await repo.inventario()) || []; return inventario; }
    const referral = conv.referral_json || entrada.referral || null;
    if(!propiedadActual && referral && referral.ad_id){
      const anuncio = await repo.anuncio(conv.canal, String(referral.ad_id));
      if(anuncio){ propiedadActual = anuncio.propiedad_id; datos.campana = anuncio.campana || datos.campana; }
    }
    const idEscrito = idEnTexto(textoCliente, await inventarioActivo()) || (referral && idEnTexto(referral.ref || "", inventario));
    if(idEscrito) propiedadActual = idEscrito;

    let fichaActual = null;
    if(propiedadActual){
      const p = await repo.inmueble(propiedadActual);
      if(p && p.estado === "activa") fichaActual = p;
      else { propiedadActual = null; datos.inmueble_no_disponible = idEscrito || null; }
    }

    // Montos que Lomi puede decir: los del inventario que vio y los que escribió el cliente.
    const permitidos = [];
    function permitirPreciosDe(p){ [num(p.precio), admin(p)].forEach(function(n){ if(n) permitidos.push(n); }); }
    if(fichaActual) permitirPreciosDe(fichaActual);
    const historial = (await repo.historial(conv.id, 20)).filter(function(m){ return pendientes.every(function(p){ return p.id !== m.id; }); });
    historial.concat(pendientes).forEach(function(m){ if(m.direccion === "entrada") montosCliente(m.contenido).forEach(function(n){ permitidos.push(n); }); });

    function propiedadDe(idTexto){
      const id = idEnTexto(String(idTexto), inventario) || num(idTexto);
      return (inventario || []).find(function(p){ return Number(p.id) === Number(id); }) || null;
    }

    let fotosEnviadas = 0, videosEnviados = 0, finTurno = false;

    async function ejecutar(nombre, args){
      herramientas.push(nombre);
      await inventarioActivo();
      if(nombre === "buscar_inmuebles"){
        const barrio = sinTildes(args.barrio), tipo = sinTildes(args.tipo);
        const candidatos = inventario.map(function(p){
          let puntos = 0;
          if(args.negocio){ if(p.tipo_negocio !== args.negocio) return null; puntos += 1; }
          if(tipo){ if(sinTildes([p.tipo_propiedad, p.subtipo, p.titulo].join(" ")).indexOf(tipo) < 0) return null; puntos += 1; }
          if(barrio){
            const b = sinTildes(p.barrio + " " + p.titulo);
            if(b.indexOf(barrio) >= 0 || barrio.indexOf(sinTildes(p.barrio)) >= 0) puntos += 3;
            else if(palabras(barrio).some(function(w){ return b.indexOf(w) >= 0; })) puntos += 2;
            else return null;
          }
          if(args.habitaciones){ if(Number(p.habitaciones) === Number(args.habitaciones)) puntos += 2; else if(Math.abs(Number(p.habitaciones) - args.habitaciones) > 1) return null; }
          const precio = num(p.precio);
          if(args.precio_aprox && precio){ const r = Math.abs(precio - args.precio_aprox) / args.precio_aprox; if(r > 0.25) return null; puntos += r < 0.08 ? 2 : 1; }
          return { p: p, puntos: puntos };
        }).filter(Boolean).sort(function(a, b){ return b.puntos - a.puntos; }).slice(0, MAX_CANDIDATOS);
        candidatos.forEach(function(c){ permitirPreciosDe(c.p); });
        return { candidatos: candidatos.map(function(c){
          return { id: c.p.id, ref: referencia(c.p), tipo: c.p.tipo_propiedad, negocio: c.p.tipo_negocio, barrio: c.p.barrio, habitaciones: c.p.habitaciones, precio: precioTexto(num(c.p.precio), c.p.tipo_negocio) };
        }), nota: candidatos.length ? "Para confirmar cuál vio, nombra solo barrio, habitaciones y precio. Sin enlaces ni fotos." : "No hay coincidencias en el inventario activo. Dilo y remite a lomazhome.com." };
      }

      if(["detalle_inmueble", "enviar_video", "enviar_fotos", "enviar_ficha"].indexOf(nombre) >= 0){
        const p = propiedadDe(args.id);
        if(!p) return { ok: false, motivo: "Ese inmueble no está en el inventario activo (puede estar cerrado). Dilo y remite a lomazhome.com." };
        propiedadActual = p.id; fichaActual = p; permitirPreciosDe(p);
        if(nombre === "detalle_inmueble") return fichaParaModelo(p);
        if(nombre === "enviar_ficha"){
          salidas.push({ tipo: "texto", texto: "Ficha completa y fotos: " + paginaDe(p) });
          return { ok: true, enviado: "enlace a la ficha" };
        }
        if(nombre === "enviar_video" && p.video_url && videosEnviados < 1){
          videosEnviados++;
          salidas.push({ tipo: "texto", texto: String(p.video_url) });
          return { ok: true, enviado: "video de YouTube" };
        }
        const fotos = listaFotos(p);
        const cupo = Math.max(0, Math.min(MAX_FOTOS - fotosEnviadas, Number(args.cantidad) || MAX_FOTOS, MAX_FOTOS));
        const elegidas = fotos.slice(0, cupo);
        elegidas.forEach(function(url){ salidas.push({ tipo: "imagen", url: String(url) }); });
        fotosEnviadas += elegidas.length;
        salidas.push({ tipo: "texto", texto: "Ficha completa y fotos: " + paginaDe(p) });
        return { ok: true, enviado: (nombre === "enviar_video" ? "no tiene video; " : "") + elegidas.length + " fotos y el enlace a la ficha" };
      }

      if(nombre === "pedir_autorizacion"){
        const tipo = args.tipo === "propietario" ? "propietario" : "interesado";
        if(consentimientos[tipo] && consentimientos[tipo].estado === "autorizo") return { ok: true, ya_autorizado: true };
        datos.autorizacion_pendiente = tipo;
        salidas.push({ tipo: "botones", texto: mensajesFijos["autorizacion_" + tipo], botones: T.BOTONES_AUTORIZACION });
        finTurno = true;
        return { ok: true, enviado: "texto de autorización con botones" };
      }

      if(nombre === "guardar_contacto"){
        const tipoAut = args.tipo === "propietario" ? "propietario" : "interesado";
        const c = consentimientos[tipoAut];
        if(!c || c.estado !== "autorizo") return { ok: false, motivo: "El cliente no ha autorizado. Usa primero pedir_autorizacion con tipo «" + tipoAut + "»." };
        if(!args.nombre || String(args.nombre).trim().length < 2) return { ok: false, motivo: "Falta el nombre del cliente." };
        datos.nombre = String(args.nombre).trim();
        if(conv.canal === "simulador") return { ok: true, simulado: true, nota: "Simulador: no se guardó en Contactos." };
        const anuncio = referral && referral.ad_id ? String(referral.ad_id) : null;
        const primer = (historial.concat(pendientes).find(function(m){ return m.direccion === "entrada" && m.contenido; }) || {}).contenido || textoCliente;
        const contactoId = await repo.guardarContacto({
          nombre: datos.nombre, telefono: conv.canal === "whatsapp" ? conv.id_externo : null, email: args.email || null,
          tipo: args.tipo, negocio: args.negocio || (fichaActual ? fichaActual.tipo_negocio : null),
          propiedad_id: tipoAut === "interesado" && propiedadActual ? String(propiedadActual) : null,
          zonas_interes: args.zonas_interes || null, presupuesto_max: args.presupuesto_max || null, habitaciones_min: args.habitaciones_min || null,
          tipo_inmueble: tipoAut === "propietario" ? (args.tipo_inmueble || null) : null, zona: tipoAut === "propietario" ? (args.zona || null) : null,
          fuente: conv.canal, canal: "chat_lomi", campana: datos.campana || (referral && referral.headline) || null, anuncio: anuncio,
          mensaje: String(primer).slice(0, 1000), notas: args.nota || null, asesor_id: fichaActual ? fichaActual.asesor_id || null : null,
          consent_at: c.at, consent_version: c.version + " · política " + (c.politica || ""), consent_canal: "chat_lomi_" + conv.canal
        });
        if(contactoId) cambios.contacto_id = contactoId;
        return { ok: !!contactoId };
      }

      if(nombre === "pasar_a_humano"){
        cambios.atendido_por = "humano";
        cambios.motivo_humano = String(args.motivo || "otro");
        datos.resumen_humano = String(args.resumen || "").slice(0, 600);
        datos.aviso_pendiente = true; // Fase 2: aviso a Salomón por plantilla de WhatsApp
        if(fichaActual && fichaActual.asesor_id) cambios.asesor_id = fichaActual.asesor_id;
        return { ok: true, nota: "Listo. Despídete en una línea diciendo que el asesor encargado te escribe por aquí tan pronto como sea posible." };
      }

      if(nombre === "registrar_interes_no_inmueble"){
        datos.no_inmueble = args.tipo;
        if(args.tipo !== "ajeno") cambios.estado = "cerrado";
        return { ok: true };
      }
      return { ok: false, motivo: "Herramienta desconocida." };
    }

    // Prompt del sistema: reglas fijas + ficha editable + estado de la conversación.
    const ejemplos = elegirCorrecciones(await repo.correcciones(), textoCliente);
    const sistema = [
      T.REGLAS,
      "",
      "FICHA DE " + String(config.nombre_agente || "Lomi").toUpperCase() + " (lo que sabes de LoMaz Home)",
      config.ficha || "",
      "",
      "ESTADO DE LA CONVERSACIÓN",
      "- Canal: " + conv.canal + ". Estado: " + (conv.estado || "nuevo") + ".",
      "- Autorización de datos: interesado = " + ((consentimientos.interesado || {}).estado || "sin pedir") + "; propietario = " + ((consentimientos.propietario || {}).estado || "sin pedir") + "." +
        (datos.autorizacion_pendiente ? " Ya se le envió el texto de autorización (" + datos.autorizacion_pendiente + ") y aún no responde: no la vuelvas a pedir en este turno." : ""),
      datos.nombre ? "- Nombre del cliente: " + datos.nombre + "." : "- Aún no sabes el nombre del cliente.",
      datos.inmueble_no_disponible ? "- El inmueble que mencionó (LH-" + datos.inmueble_no_disponible + ") ya no está disponible." : "",
      referral && !fichaActual ? "- Llegó desde un anuncio no registrado. Título: «" + (referral.headline || "") + "». Texto: «" + String(referral.body || "").slice(0, 300) + "». Usa buscar_inmuebles para ubicarlo y confírmalo con el cliente." : "",
      fichaActual ? "\nINMUEBLE ACTUAL (datos del inventario)\n" + JSON.stringify(fichaParaModelo(fichaActual)) : "",
      ejemplos.length ? "\nRESPUESTAS CORREGIDAS POR EL EQUIPO (imita el tono y el fondo cuando el caso se parezca)\n" + ejemplos.map(function(c){ return "Cliente: " + c.mensaje_cliente + "\nRespuesta correcta: " + c.respuesta_correcta; }).join("\n---\n") : ""
    ].filter(function(l){ return l !== ""; }).join("\n");

    const mensajes = [];
    historial.forEach(function(m){
      const rol = m.direccion === "entrada" ? "user" : "assistant";
      const texto = String(m.contenido || "").replace(/^\[botón:[^\]]*\]\s*/, "").trim();
      if(!texto) return;
      if(mensajes.length && mensajes[mensajes.length - 1].role === rol) mensajes[mensajes.length - 1].content += "\n" + texto;
      else mensajes.push({ role: rol, content: texto });
    });
    while(mensajes.length && mensajes[0].role !== "user") mensajes.shift();
    if(mensajes.length && mensajes[mensajes.length - 1].role === "user") mensajes[mensajes.length - 1].content += "\n" + textoCliente;
    else mensajes.push({ role: "user", content: textoCliente });

    let textoFinal = "";
    for(let ronda = 0; ronda < MAX_RONDAS && !finTurno; ronda++){
      const r = await claude({ system: sistema, messages: mensajes, tools: HERRAMIENTAS });
      const bloques = (r && r.content) || [];
      const texto = bloques.filter(function(b){ return b.type === "text"; }).map(function(b){ return b.text; }).join("\n").trim();
      const usos = bloques.filter(function(b){ return b.type === "tool_use"; });
      if(texto) textoFinal = texto;
      if(!usos.length || r.stop_reason !== "tool_use") break;
      mensajes.push({ role: "assistant", content: bloques });
      const resultados = [];
      for(let i = 0; i < usos.length; i++){
        const salida = await ejecutar(usos[i].name, usos[i].input || {});
        resultados.push({ type: "tool_result", tool_use_id: usos[i].id, content: JSON.stringify(salida) });
      }
      mensajes.push({ role: "user", content: resultados });
      textoFinal = finTurno ? texto : "";
    }

    // Verificaciones finales del texto antes de enviarlo.
    let final = formatoChat(textoFinal);
    if(final.indexOf(T.MARCA_PROMPT) >= 0 || /pedir_autorizacion|buscar_inmuebles|detalle_inmueble|INMUEBLE ACTUAL/.test(final)){
      alertas.push("intento_de_revelar_prompt");
      final = mensajesFijos.fuera_de_tema;
    }
    const inventados = montos(final).filter(function(n){ return !montoPermitido(n, permitidos); });
    if(inventados.length){
      alertas.push("precio_no_verificado:" + inventados.join("|"));
      final = mensajesFijos.sin_dato;
    }
    const textosSalida = final ? partirEnMensajes(final).map(function(t){ return { tipo: "texto", texto: t }; }) : [];
    // El texto de Claude va después de los medios y antes de los botones de autorización.
    const iBotones = salidas.findIndex(function(s){ return s.tipo === "botones"; });
    if(iBotones >= 0) salidas.splice.apply(salidas, [iBotones, 0].concat(textosSalida));
    else textosSalida.forEach(function(s){ salidas.push(s); });
    if(!salidas.length) salidas.push({ tipo: "texto", texto: mensajesFijos.sin_dato });

    // Estado de la conversación según lo que pasó en este turno.
    if(cambios.atendido_por === "humano") cambios.estado = "humano";
    else if(!cambios.estado){
      if(datos.autorizacion_pendiente || herramientas.indexOf("guardar_contacto") >= 0) cambios.estado = "datos";
      else if(herramientas.some(function(h){ return /^enviar_/.test(h); })) cambios.estado = "medios";
      else if(propiedadActual) cambios.estado = "informando";
      else if(herramientas.indexOf("buscar_inmuebles") >= 0) cambios.estado = "identificando";
      else cambios.estado = "filtrando";
    }
    cambios.propiedad_actual_id = propiedadActual || null;
    return { salidas: salidas, herramientas: herramientas, alertas: alertas, cambios: cambios };
  }

  return { atender: atender };
}

module.exports = {
  crearAgente: crearAgente,
  interno: { formatoChat: formatoChat, montos: montos, montosCliente: montosCliente, montoPermitido: montoPermitido, idEnTexto: idEnTexto, precioTexto: precioTexto, fichaParaModelo: fichaParaModelo, elegirCorrecciones: elegirCorrecciones, partirEnMensajes: partirEnMensajes, HERRAMIENTAS: HERRAMIENTAS }
};
