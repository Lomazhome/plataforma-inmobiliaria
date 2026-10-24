// Acceso a Supabase desde las funciones del servidor de Lomi.
//
// - Usa la llave de servicio (variable SUPABASE_SERVICE_KEY en Vercel), que salta las
//   reglas RLS. Por eso SOLO se usa aquí, en el servidor; el navegador nunca la ve.
// - Habla directo con la API REST de Supabase con fetch: sin paquetes externos.
// - Expone un «repositorio» con las operaciones que necesita el agente. Las pruebas
//   (tests/mensajeria.test.mjs) usan uno falso en memoria con las mismas funciones.

const SUPABASE_URL = process.env.SUPABASE_URL || "https://lniouebpuuuqctrgxoiw.supabase.co";

// Columnas del inventario que Lomi puede ver. La dirección, las coordenadas, la
// comisión y los datos del propietario NO están aquí a propósito: el modelo nunca los recibe.
const COLUMNAS_INMUEBLE = [
  "id", "titulo", "codigo_interno", "tipo_negocio", "tipo_propiedad", "subtipo", "barrio", "ciudad",
  "precio", "precio_admin", "administracion", "precio_negociable", "area_construida", "area_privada", "area_total",
  "m2_construccion", "habitaciones", "banos", "garajes", "parqueaderos", "estrato", "piso", "antiguedad",
  "edad_inmueble", "deposito", "acepta_mascotas", "amenidades", "caracteristicas", "descripcion",
  "video_url", "tour_virtual_url", "fotos", "foto_principal", "estado", "asesor_id"
].join(",");

function crearCliente(clave, base){
  base = base || SUPABASE_URL;
  async function pedir(metodo, ruta, cuerpo, prefer){
    const cabeceras = { apikey: clave, Authorization: "Bearer " + clave, "Content-Type": "application/json" };
    if(prefer) cabeceras.Prefer = prefer;
    const r = await fetch(base + "/rest/v1/" + ruta, { method: metodo, headers: cabeceras, body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo) });
    const texto = await r.text();
    if(!r.ok) throw new Error("Supabase " + metodo + " " + ruta.split("?")[0] + " → " + r.status + ": " + texto.slice(0, 300));
    return texto ? JSON.parse(texto) : null;
  }
  return {
    leer: function(ruta){ return pedir("GET", ruta); },
    insertar: function(tabla, filas, extra){ return pedir("POST", tabla + (extra || ""), filas, "return=representation"); },
    insertarSinDuplicar: function(tabla, filas, columna){ return pedir("POST", tabla + "?on_conflict=" + columna, filas, "resolution=ignore-duplicates,return=representation"); },
    actualizar: function(tabla, filtro, cambios){ return pedir("PATCH", tabla + "?" + filtro, cambios, "return=representation"); },
    borrar: function(tabla, filtro){ return pedir("DELETE", tabla + "?" + filtro); }
  };
}

const e = encodeURIComponent;

function crearRepositorio(clave, base){
  const sb = crearCliente(clave, base);
  let cacheInventario = null;

  return {
    async config(){
      const f = await sb.leer("msj_config?id=eq.1&select=*");
      return (f && f[0]) || {};
    },

    async conversacion(canal, idExterno, nombre){
      const filtro = "canal=eq." + e(canal) + "&id_externo=eq." + e(idExterno);
      let f = await sb.leer("msj_conversaciones?" + filtro + "&select=*");
      if(f && f[0]) return f[0];
      await sb.insertarSinDuplicar("msj_conversaciones", [{ canal: canal, id_externo: idExterno, nombre: nombre || null }], "canal,id_externo");
      f = await sb.leer("msj_conversaciones?" + filtro + "&select=*");
      return f[0];
    },

    async conversacionPorId(id){
      const f = await sb.leer("msj_conversaciones?id=eq." + e(id) + "&select=*");
      return (f && f[0]) || null;
    },

    async actualizarConversacion(id, cambios){
      cambios.updated_at = new Date().toISOString();
      const f = await sb.actualizar("msj_conversaciones", "id=eq." + e(id), cambios);
      return f && f[0];
    },

    async borrarConversacion(id){ await sb.borrar("msj_conversaciones", "id=eq." + e(id)); },

    // Devuelve la fila guardada, o null si ese id de Meta ya estaba (mensaje repetido).
    async guardarMensaje(fila){
      if(!fila.id_externo_mensaje){
        const f = await sb.insertar("msj_mensajes", [fila]);
        return f[0];
      }
      const f = await sb.insertarSinDuplicar("msj_mensajes", [fila], "id_externo_mensaje");
      return (f && f[0]) || null;
    },

    async ultimaEntrada(conversacionId){
      const f = await sb.leer("msj_mensajes?conversacion_id=eq." + e(conversacionId) + "&direccion=eq.entrada&select=id,created_at&order=created_at.desc,id.desc&limit=1");
      return (f && f[0]) || null;
    },

    async entradasPendientes(conversacionId){
      return sb.leer("msj_mensajes?conversacion_id=eq." + e(conversacionId) + "&direccion=eq.entrada&procesado=eq.false&select=*&order=created_at.asc");
    },

    async marcarProcesados(ids){
      if(!ids.length) return;
      await sb.actualizar("msj_mensajes", "id=in.(" + ids.map(e).join(",") + ")", { procesado: true });
    },

    async historial(conversacionId, limite){
      const f = await sb.leer("msj_mensajes?conversacion_id=eq." + e(conversacionId) + "&procesado=eq.true&select=id,direccion,tipo,contenido,created_at&order=created_at.desc&limit=" + (limite || 20));
      return (f || []).reverse();
    },

    async correcciones(){
      return sb.leer("msj_correcciones?activa=eq.true&select=mensaje_cliente,respuesta_correcta,created_at&order=created_at.desc&limit=300");
    },

    async anuncio(canal, adId){
      const f = await sb.leer("msj_anuncios?ad_id=eq." + e(adId) + "&canal=in.(" + e(canal) + ",todos)&select=*&limit=1");
      return (f && f[0]) || null;
    },

    // El inventario activo completo es pequeño: se lee una vez por llamada y se filtra en el código.
    async inventario(){
      if(cacheInventario) return cacheInventario;
      cacheInventario = await sb.leer("propiedades?estado=eq.activa&select=" + COLUMNAS_INMUEBLE + "&order=id.asc&limit=1000");
      return cacheInventario;
    },

    async inmueble(id){
      const f = await sb.leer("propiedades?id=eq." + e(id) + "&select=" + COLUMNAS_INMUEBLE);
      return (f && f[0]) || null;
    },

    // El trigger de contactos evita duplicados por teléfono: si ya existe, no inserta y
    // deja una nota en su historial. Por eso, después se busca por teléfono.
    async guardarContacto(datos){
      const f = await sb.insertar("contactos", [datos]);
      if(f && f[0]) return f[0].id;
      if(!datos.telefono) return null;
      const tel = String(datos.telefono).replace(/\D/g, "").replace(/^57(\d{10})$/, "$1");
      const g = await sb.leer("contactos?telefono=eq." + e(tel) + "&select=id&order=created_at.desc&limit=1");
      if(g && g[0]){
        const cambios = {};
        ["consent_at", "consent_version", "consent_canal"].forEach(function(k){ if(datos[k]) cambios[k] = datos[k]; });
        if(Object.keys(cambios).length) await sb.actualizar("contactos", "id=eq." + e(g[0].id) + "&consent_at=is.null", cambios);
        return g[0].id;
      }
      return null;
    },

    async perfilActivo(usuarioId){
      const f = await sb.leer("perfiles_usuarios?id=eq." + e(usuarioId) + "&select=id,nombre_completo,activo");
      const p = f && f[0];
      return !!(p && p.activo !== false);
    }
  };
}

module.exports = { crearRepositorio: crearRepositorio, COLUMNAS_INMUEBLE: COLUMNAS_INMUEBLE, SUPABASE_URL: SUPABASE_URL };
