// Página de cada artículo del blog de LoMaz Home, armada en el servidor.
//
// Dirección:  https://www.lomazhome.com/blog/<nombre-del-articulo>
//
// Qué hace:
// - Lee el artículo de la tabla articulos_blog de Supabase (solo los que están en estado «publicado»).
// - Devuelve la página ya armada, con su título, descripción e imagen: así WhatsApp, Facebook y Google
//   la ven completa sin tener que ejecutar nada.
// - Del contenido saca sola lo que la plantilla necesita: índice (los subtítulos H2), tiempo de lectura,
//   cajas «Consejo LoMaz», lista de chequeo con botón de copiar, preguntas frecuentes, tablas que se leen
//   bien en celular, botón de WhatsApp con mensaje de origen, firma del autor, fechas y fuentes citadas.
// - Si el artículo no existe o no está publicado, lleva al blog (/blog.html), como antes.
//
// Cómo se escribe el contenido (columna «contenido», en HTML):
//   <h2>…</h2>                          Cada H2 es una sección y aparece en el índice.
//   <blockquote><strong>Consejo LoMaz.</strong> …</blockquote>     Caja dorada de consejo.
//   <ul class="checklist">…</ul>       Lista de chequeo con casillas y botón de copiar.
//   <h2>Preguntas frecuentes</h2> y debajo cada pregunta en un <h3> seguida de su respuesta.
//   <div class="cierre">…</div>        Párrafo de cierre.
//   <div class="cta">…</div>           Caja final con el botón de WhatsApp (si falta, la plantilla pone una).
//   Los enlaces a wa.me sin texto reciben solos el mensaje «Hola, vengo del artículo de …».
//
// Ajustes opcionales de cada artículo: van al comienzo del contenido, dentro de un comentario que el lector no ve:
//   <!--lomaz {"titulo_seo":"…","tema":"…","portada":false,"revisado":"2026-09-29","autor_bio":"…","autor_cargo":"…"}-->
//   titulo_seo        Título corto para Google y para la pestaña (si falta, se usa el título).
//   tema              Completa la frase del WhatsApp: «Hola, vengo del artículo de <tema> y tengo una pregunta.»
//   imagen_compartir  Imagen que se ve al compartir el enlace (si falta: la de la columna imagen_url y, si no hay, la del blog).
//   portada           false = no repetir la imagen dentro de la página (cuando imagen_url es una tarjeta con el título).
//   revisado          Fecha de la última revisión (AAAA-MM-DD).
//   indice            Rótulos cortos para el índice, uno por cada H2 y en el mismo orden (si falta, se usan los subtítulos).
//   autor_bio, autor_cargo   Texto y cargo de la firma.
//
// Vista previa de un borrador (solo con sesión iniciada en la plataforma): la pide vista-previa-articulo.html,
// que envía la sesión del asesor. Sin sesión válida, un borrador nunca se muestra.

const SITE = "https://www.lomazhome.com";
const SUPABASE_URL = "https://lniouebpuuuqctrgxoiw.supabase.co";
// Llave pública (la misma de config.js). Solo permite leer lo que ya es público.
const SUPABASE_ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxuaW91ZWJwdXV1cWN0cmd4b2l3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgwODM5NjgsImV4cCI6MjA5MzY1OTk2OH0.8w-TcD8JKkHQpnybaj-ANz-4k4hznFoIwFr_ZatqPtA";
const WHATSAPP = "573003300343";
const IMAGEN_BLOG = SITE + "/og-blog.jpg";
const MARCA = "LoMaz Home";

/* ====================== Utilidades ====================== */

function esc(s){
  return String(s === null || s === undefined ? "" : s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

function slugify(s){
  return String(s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+/, "").replace(/-+$/, "");
}

const ENTIDADES = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: "\u00a0", aacute: "á", eacute: "é", iacute: "í", oacute: "ó", uacute: "ú",
  Aacute: "Á", Eacute: "É", Iacute: "Í", Oacute: "Ó", Uacute: "Ú", ntilde: "ñ", Ntilde: "Ñ", uuml: "ü", Uuml: "Ü", iquest: "¿", iexcl: "¡",
  laquo: "«", raquo: "»", ldquo: "“", rdquo: "”", lsquo: "‘", rsquo: "’", mdash: "—", ndash: "–", hellip: "…", deg: "°", middot: "·", bull: "•",
  copy: "©", reg: "®", trade: "™", euro: "€", times: "×", frac12: "½", sup2: "²", sup3: "³", ordm: "º", ordf: "ª", rarr: "→", larr: "←" };

function decodificar(s){
  return String(s || "").replace(/&(#x[0-9a-fA-F]+|#\d+|[a-zA-Z][a-zA-Z0-9]*);/g, function(todo, e){
    if(e.charAt(0) === "#"){
      const n = e.charAt(1).toLowerCase() === "x" ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
      if(!isFinite(n) || n <= 0 || n > 0x10ffff || (n >= 0xd800 && n <= 0xdfff)) return "";
      try{ return String.fromCodePoint(n); }catch(err){ return ""; }
    }
    return Object.prototype.hasOwnProperty.call(ENTIDADES, e) ? ENTIDADES[e] : todo;
  });
}

// Texto dentro de la página: sin signos que el navegador pueda tomar por etiquetas
function escTexto(s){ return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }

// Detalles de tipografía: que «5,10 %», «art. 16» o «Ley 820» no queden partidos entre dos renglones
function tipografia(t){
  return t.replace(/(\d) %/g, "$1\u00a0%").replace(/\b(arts?\.) (\d)/gi, "$1\u00a0$2").replace(/\b(Ley) (\d)/g, "$1\u00a0$2");
}

const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
// Fecha en hora de Bogotá (UTC-5 todo el año)
function partesFecha(iso){
  if(!iso) return null;
  const solo = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso));
  if(solo) return { a: +solo[1], m: +solo[2], d: +solo[3] };
  const t = Date.parse(iso);
  if(isNaN(t)) return null;
  const b = new Date(t - 5 * 3600 * 1000);
  return { a: b.getUTCFullYear(), m: b.getUTCMonth() + 1, d: b.getUTCDate() };
}
function fechaLarga(iso){ const p = partesFecha(iso); return p ? p.d + " de " + MESES[p.m - 1] + " de " + p.a : ""; }
function fechaClave(iso){ const p = partesFecha(iso); return p ? p.a * 10000 + p.m * 100 + p.d : 0; }
function fechaIso(iso){
  if(!iso) return "";
  if(/^\d{4}-\d{2}-\d{2}$/.test(String(iso))) return iso + "T12:00:00-05:00";
  const t = Date.parse(iso); return isNaN(t) ? "" : new Date(t).toISOString();
}

function urlSegura(u, paraImagen){
  let s = String(u || "").replace(/[\u0000-\u001f\u007f\s]+/g, function(m){ return /^[ ]+$/.test(m) ? "%20" : ""; }).trim();
  s = s.replace(/^(%20)+|(%20)+$/g, "");
  if(!s) return "";
  const esquema = /^([a-zA-Z][a-zA-Z0-9+.-]*):/.exec(s);
  if(esquema){
    const e = esquema[1].toLowerCase();
    if(e === "http" || e === "https") return s;
    if(!paraImagen && (e === "mailto" || e === "tel")) return s;
    return "";
  }
  if(s.slice(0, 2) === "//") return "https:" + s;
  return s;
}

/* ====================== Leer de Supabase ====================== */

async function pedir(ruta, token){
  const control = new AbortController();
  const reloj = setTimeout(function(){ control.abort(); }, 7000);
  try{
    const r = await fetch(SUPABASE_URL + "/rest/v1/" + ruta, {
      headers: { apikey: SUPABASE_ANON, Authorization: "Bearer " + (token || SUPABASE_ANON) }, signal: control.signal
    });
    if(!r.ok) return { ok: false, status: r.status, filas: null };
    const d = await r.json();
    return { ok: Array.isArray(d), status: r.status, filas: Array.isArray(d) ? d : null };
  }catch(e){
    return { ok: false, status: 0, filas: null };
  }finally{
    clearTimeout(reloj);
  }
}

const COLUMNAS = "id,titulo,slug,categoria,extracto,contenido,imagen_url,tiempo_lectura,estado,autor_id,autor_nombre,published_at,created_at,updated_at";

async function leerArticulo(slug, token){
  const filtro = "&slug=eq." + encodeURIComponent(slug) + (token ? "" : "&estado=eq.publicado") + "&limit=1";
  return pedir("articulos_blog?select=" + COLUMNAS + filtro, token);
}
async function leerPorId(id){
  return pedir("articulos_blog?select=slug&id=eq." + encodeURIComponent(id) + "&estado=eq.publicado&limit=1");
}
async function leerOtros(slug){
  return pedir("articulos_blog?select=titulo,slug,categoria,extracto,imagen_url,tiempo_lectura,published_at&estado=eq.publicado&slug=neq." + encodeURIComponent(slug) + "&order=published_at.desc&limit=12");
}
async function leerAutor(id){
  if(!/^[0-9a-fA-F-]{36}$/.test(String(id || ""))) return null;
  const r = await pedir("perfiles_usuarios?select=id,nombre_completo,avatar_url,cargo,datos_perfil&id=eq." + encodeURIComponent(id) + "&limit=1");
  return r.ok && r.filas.length ? r.filas[0] : null;
}

/* ====================== Ajustes del artículo ====================== */

function separarAjustes(contenido){
  const html = String(contenido || "");
  const m = /^\s*<!--\s*lomaz\b([\s\S]*?)-->/i.exec(html);
  if(!m) return { ajustes: {}, html: html };
  let ajustes = {};
  try{ const j = JSON.parse(m[1]); if(j && typeof j === "object" && !Array.isArray(j)) ajustes = j; }catch(e){ ajustes = {}; }
  return { ajustes: ajustes, html: html.slice(m[0].length) };
}

/* ====================== El contenido: leer el HTML y dejar solo lo permitido ====================== */

const SIN_CIERRE = { br: 1, hr: 1, img: 1 };
// Estas etiquetas se descartan con todo lo que llevan dentro
const SE_BORRAN = { script: 1, style: 1, iframe: 1, object: 1, embed: 1, noscript: 1, template: 1, svg: 1, math: 1, form: 1, select: 1, textarea: 1, button: 1, input: 1, head: 1, title: 1, link: 1, meta: 1, video: 1, audio: 1, canvas: 1 };
const PERMITIDAS = { p: 1, br: 1, hr: 1, h2: 1, h3: 1, h4: 1, ul: 1, ol: 1, li: 1, strong: 1, em: 1, u: 1, s: 1, sup: 1, sub: 1, blockquote: 1, a: 1, img: 1, figure: 1, figcaption: 1,
  table: 1, thead: 1, tbody: 1, tfoot: 1, tr: 1, th: 1, td: 1, caption: 1, code: 1, pre: 1, small: 1, mark: 1, cite: 1, div: 1, span: 1, aside: 1 };
const EQUIVALE = { h1: "h2", h5: "h4", h6: "h4", b: "strong", i: "em", strike: "s", del: "s", section: "div", article: "div" };
const CLASES = { checklist: 1, consejo: 1, nota: 1, cta: 1, cierre: 1, destacado: 1 };
const EN_LINEA = { strong: 1, em: 1, u: 1, s: 1, sup: 1, sub: 1, a: 1, code: 1, small: 1, mark: 1, cite: 1, span: 1, br: 1, img: 1 };
const DE_BLOQUE = { p: 1, h2: 1, h3: 1, h4: 1, ul: 1, ol: 1, blockquote: 1, table: 1, div: 1, aside: 1, figure: 1, hr: 1, pre: 1 };

function leerAtributos(txt){
  const at = {};
  const re = /([a-zA-Z_:][-a-zA-Z0-9_:.]*)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+)))?/g;
  let m;
  while((m = re.exec(txt || ""))){
    const k = m[1].toLowerCase();
    if(!(k in at)) at[k] = decodificar(m[2] !== undefined ? m[2] : m[3] !== undefined ? m[3] : m[4] !== undefined ? m[4] : "");
  }
  return at;
}

function atributosLimpios(tag, at){
  const o = {};
  if(at.class){
    const c = at.class.split(/\s+/).filter(function(x){ return CLASES[x]; });
    if(c.length) o.class = c.join(" ");
  }
  if(tag === "a"){
    const h = urlSegura(at.href);
    if(h) o.href = h;
    if(at.title) o.title = at.title.slice(0, 200);
  }
  if(tag === "img"){
    const s = urlSegura(at.src, true);
    if(s) o.src = s;
    o.alt = (at.alt || "").slice(0, 300);
    if(/^\d{1,4}$/.test(at.width || "")) o.width = at.width;
    if(/^\d{1,4}$/.test(at.height || "")) o.height = at.height;
  }
  if(tag === "td" || tag === "th"){
    if(/^\d{1,2}$/.test(at.colspan || "")) o.colspan = at.colspan;
    if(/^\d{1,2}$/.test(at.rowspan || "")) o.rowspan = at.rowspan;
  }
  if(tag === "ol" && /^\d{1,3}$/.test(at.start || "")) o.start = at.start;
  return o;
}

// Convierte el HTML del artículo en un árbol sencillo: { tag, at, hijos } o { texto }
function leerHtml(html){
  const raiz = { tag: "#raiz", at: {}, hijos: [] };
  const pila = [raiz];
  let borrando = null;
  const re = /<!--[\s\S]*?-->|<(\/?)([a-zA-Z][a-zA-Z0-9]*)\b((?:[^>"']|"[^"]*"|'[^']*')*)>|[^<]+|</g;
  let m;
  while((m = re.exec(String(html || "")))){
    const trozo = m[0];
    if(trozo.slice(0, 4) === "<!--") continue;
    if(m[2] === undefined){
      if(borrando) continue;
      const txt = decodificar(trozo);
      if(txt) pila[pila.length - 1].hijos.push({ texto: txt });
      continue;
    }
    const cierra = m[1] === "/";
    let tag = m[2].toLowerCase();
    if(borrando){ if(cierra && tag === borrando) borrando = null; continue; }
    if(SE_BORRAN[tag]){ if(!cierra && !/\/\s*$/.test(m[3] || "")) borrando = tag; continue; }
    if(EQUIVALE[tag]) tag = EQUIVALE[tag];
    if(!PERMITIDAS[tag]) continue;
    if(cierra){
      if(SIN_CIERRE[tag]) continue;
      for(let i = pila.length - 1; i > 0; i--){
        if(pila[i].tag === tag){ pila.length = i; break; }
      }
      continue;
    }
    // Un párrafo abierto se cierra solo cuando llega otro bloque; un <li> abierto, cuando llega el siguiente
    const arriba = pila[pila.length - 1];
    if(arriba.tag === "p" && DE_BLOQUE[tag]) pila.pop();
    else if(arriba.tag === "li" && tag === "li") pila.pop();
    else if((arriba.tag === "td" || arriba.tag === "th") && (tag === "td" || tag === "th" || tag === "tr")){ pila.pop(); if(tag === "tr" && pila[pila.length - 1].tag === "tr") pila.pop(); }
    else if(arriba.tag === "tr" && tag === "tr") pila.pop();
    const nodo = { tag: tag, at: atributosLimpios(tag, leerAtributos(m[3])), hijos: [] };
    pila[pila.length - 1].hijos.push(nodo);
    if(!SIN_CIERRE[tag]) pila.push(nodo);
  }
  return raiz;
}

function textoDe(n){
  if(n.crudo !== undefined) return "";
  if(n.texto !== undefined) return n.texto;
  if(n.tag === "br") return " ";
  let t = "";
  for(let i = 0; i < n.hijos.length; i++) t += textoDe(n.hijos[i]);
  if(DE_BLOQUE[n.tag] || n.tag === "li" || n.tag === "tr" || n.tag === "td" || n.tag === "th") t += " ";
  return t;
}
function textoLimpio(n){ return textoDe(n).replace(/[\s\u00a0]+/g, " ").trim(); }

function esEnLinea(n){ return n.texto !== undefined || !!EN_LINEA[n.tag]; }
function estaVacio(n){
  if(n.crudo !== undefined) return false;
  if(n.texto !== undefined) return !n.texto.replace(/[\s\u00a0]+/g, "");
  if(n.tag === "img" || n.tag === "hr") return false;
  if(n.tag === "br") return true;
  return n.hijos.every(estaVacio);
}

// Deja el contenido como una lista ordenada de bloques (párrafos, títulos, listas, tablas…)
function ordenarBloques(nodo){
  const salida = [];
  let suelto = [];
  function cerrarSuelto(){
    if(suelto.length && !suelto.every(estaVacio)) salida.push({ tag: "p", at: {}, hijos: suelto });
    suelto = [];
  }
  nodo.hijos.forEach(function(h){
    if(h.texto === undefined && (h.tag === "div" || h.tag === "span") && !h.at.class){
      // un <div> o <span> sin clase conocida no aporta nada: se queda lo que lleva dentro
      if(h.tag === "div"){ cerrarSuelto(); ordenarBloques(h).forEach(function(x){ salida.push(x); }); }
      else h.hijos.forEach(function(x){ suelto.push(x); });
      return;
    }
    if(esEnLinea(h)){ suelto.push(h); return; }
    cerrarSuelto();
    if(h.tag === "div" || h.tag === "aside" || h.tag === "blockquote" || h.tag === "figure") h.hijos = ordenarBloques(h);
    if(h.tag === "p" && estaVacio(h)) return;
    salida.push(h);
  });
  cerrarSuelto();
  return salida;
}

// Quita los <span> sin uso que dejan los editores, en cualquier nivel
function quitarSpans(n){
  if(n.texto !== undefined) return;
  const nuevos = [];
  n.hijos.forEach(function(h){
    if(h.texto === undefined){
      quitarSpans(h);
      if(h.tag === "span" && !h.at.class){ h.hijos.forEach(function(x){ nuevos.push(x); }); return; }
    }
    nuevos.push(h);
  });
  n.hijos = nuevos;
}

function recorrer(n, fn){
  if(n.texto !== undefined) return;
  for(let i = 0; i < n.hijos.length; i++){ fn(n.hijos[i], n, i); recorrer(n.hijos[i], fn); }
}

function escribir(n){
  if(n.crudo !== undefined) return n.crudo;   // solo lo arma la plantilla (por ejemplo, un ícono); nunca viene del artículo
  if(n.texto !== undefined) return escTexto(n.texto);
  let at = "";
  Object.keys(n.at).forEach(function(k){ at += " " + k + '="' + esc(n.at[k]) + '"'; });
  if(SIN_CIERRE[n.tag]) return "<" + n.tag + at + ">";
  return "<" + n.tag + at + ">" + n.hijos.map(escribir).join("") + "</" + n.tag + ">";
}

/* ====================== El contenido: armar las piezas de la plantilla ====================== */

function el(tag, at, hijos){ return { tag: tag, at: at || {}, hijos: hijos || [] }; }
function txt(t){ return { texto: t }; }

function mensajeWhatsApp(ajustes, articulo){
  let tema = String(ajustes.tema || "").trim();
  if(!tema){
    const t = String(articulo.titulo || "").trim();
    const corte = /^(.{12,90}?[?:])(\s|$)/.exec(t);
    let corto = corte ? corte[1].replace(/:$/, "") : t;
    if(corto.length > 90) corto = corto.slice(0, 87).replace(/\s+\S*$/, "") + "…";
    tema = "«" + corto + "»";
    return "Hola, vengo del artículo " + tema + " y tengo una pregunta.";
  }
  return "Hola, vengo del artículo de " + tema + " y tengo una pregunta.";
}
function enlaceWhatsApp(mensaje){ return "https://wa.me/" + WHATSAPP + "?text=" + encodeURIComponent(mensaje); }

const REDES_Y_PROPIOS = /(^|\.)(lomazhome\.com|wa\.me|whatsapp\.com|facebook\.com|instagram\.com|tiktok\.com|youtube\.com|youtu\.be|linkedin\.com|threads\.net|x\.com|twitter\.com)$/i;

function prepararContenido(articulo, ajustes, htmlContenido, direccion){
  const info = { indice: [], preguntas: [], fuentes: [], palabras: 0, tieneCta: false };
  const raiz = leerHtml(htmlContenido);
  quitarSpans(raiz);
  let bloques = ordenarBloques(raiz);
  if(!bloques.length && articulo.extracto) bloques = [el("p", {}, [txt(String(articulo.extracto))])];
  const mensaje = mensajeWhatsApp(ajustes, articulo);

  // 1. Cajas «Consejo LoMaz»: una cita que empieza por esas palabras
  bloques = bloques.map(function(b){
    const esConsejo = (b.tag === "blockquote" && /^consejo\s+lomaz\b/i.test(textoLimpio(b))) || ((b.tag === "div" || b.tag === "aside") && /\bconsejo\b/.test(b.at.class || ""));
    if(!esConsejo) return b;
    const cuerpo = b.hijos.length ? b.hijos : [el("p", {}, [])];
    const primero = cuerpo[0];
    if(primero && primero.hijos && primero.hijos.length){
      const h0 = primero.hijos[0];
      if(h0.texto === undefined && h0.tag === "strong" && /^consejo\s+lomaz[.:]?$/i.test(textoLimpio(h0))){
        primero.hijos.shift();
        if(primero.hijos[0] && primero.hijos[0].texto !== undefined) primero.hijos[0].texto = primero.hijos[0].texto.replace(/^[\s\u00a0]+/, "");
      }else if(h0.texto !== undefined){
        h0.texto = h0.texto.replace(/^[\s\u00a0]*consejo\s+lomaz[.:]?[\s\u00a0]*/i, "");
      }
    }
    return el("aside", { class: "consejo" }, [el("p", { class: "consejo-rotulo" }, [txt("Consejo LoMaz")])].concat(cuerpo));
  });

  // 2. Preguntas frecuentes: el H2 «Preguntas frecuentes» y lo que sigue hasta el siguiente H2 o el cierre
  const iFaq = bloques.findIndex(function(b){ return b.tag === "h2" && /preguntas\s+frecuentes/i.test(textoLimpio(b)); });
  if(iFaq >= 0){
    let fin = bloques.length;
    for(let i = iFaq + 1; i < bloques.length; i++){
      const b = bloques[i];
      if(b.tag === "h2" || (b.tag === "div" && /\b(cta|cierre)\b/.test(b.at.class || ""))){ fin = i; break; }
    }
    const tramo = bloques.slice(iFaq + 1, fin);
    const items = [];
    let actual = null;
    tramo.forEach(function(b){
      if(b.tag === "h3"){ actual = { pregunta: b.hijos, respuesta: [] }; items.push(actual); return; }
      const h0 = b.tag === "p" && b.hijos[0];
      if(h0 && h0.texto === undefined && h0.tag === "strong" && /\?\s*$/.test(textoLimpio(h0))){
        const resto = b.hijos.slice(1);
        if(resto[0] && resto[0].texto !== undefined) resto[0] = txt(resto[0].texto.replace(/^[\s\u00a0]+/, ""));
        actual = { pregunta: h0.hijos, respuesta: resto.length && !resto.every(estaVacio) ? [el("p", {}, resto)] : [] };
        items.push(actual);
        return;
      }
      if(actual) actual.respuesta.push(b);
    });
    if(items.length){
      const caja = el("div", { class: "faq" }, items.map(function(it, n){
        const p = textoLimpio(el("p", {}, it.pregunta));
        const r = it.respuesta.map(textoLimpio).join(" ").trim();
        if(p && r) info.preguntas.push({ pregunta: p, respuesta: r });
        const at = { class: "faq-item" };
        if(n === 0) at.open = "";
        return el("details", at, [el("summary", {}, [el("h3", {}, it.pregunta)]), el("div", { class: "faq-resp" }, it.respuesta)]);
      }));
      bloques = bloques.slice(0, iFaq + 1).concat([caja], bloques.slice(fin));
    }
  }

  // 3. Índice: cada H2 recibe su ancla. En el índice va el rótulo corto del artículo (ajuste «indice»)
  //    o el subtítulo sin su número, porque la lista ya los numera.
  const titulos = bloques.filter(function(b){ return b.tag === "h2" && textoLimpio(b); });
  const rotulos = Array.isArray(ajustes.indice) && ajustes.indice.length === titulos.length ? ajustes.indice : null;
  const usados = {};
  titulos.forEach(function(b, i){
    const corto = (rotulos && String(rotulos[i] || "").trim()) || textoLimpio(b).replace(/^\d+[.)]\s+/, "");
    let id = slugify(corto).slice(0, 60).replace(/-+$/, "") || "seccion";
    if(/^\d/.test(id)) id = "s-" + id;
    let unico = id, n = 2;
    while(usados[unico]) unico = id + "-" + (n++);
    usados[unico] = 1;
    b.at.id = unico;
    info.indice.push({ id: unico, texto: corto });
  });

  // 4. Caja final de WhatsApp: la del artículo o, si no trae, la de la plantilla
  bloques.forEach(function(b){ if(b.tag === "div" && /\bcta\b/.test(b.at.class || "")) info.tieneCta = true; });
  if(!info.tieneCta){
    bloques.push(el("div", { class: "cta" }, [
      el("p", {}, [el("strong", {}, [txt("¿Tienes una pregunta sobre tu caso?")]), txt(" Escríbenos por WhatsApp y te decimos qué haríamos en tu lugar, sin compromiso.")]),
      el("p", {}, [el("a", { href: "https://wa.me/" + WHATSAPP }, [txt("Hablar con LoMaz Home por WhatsApp")])])
    ]));
  }

  const arbol = el("#raiz", {}, bloques);

  // 5. Listas de chequeo, tablas, enlaces e imágenes
  const fuentesVistas = {};
  function arreglar(n){
    if(n.texto !== undefined) return;
    n.hijos = n.hijos.map(function(h){
      if(h.texto !== undefined) return h;
      arreglar(h);
      if(h.tag === "ul" && /\bchecklist\b/.test(h.at.class || "")){
        h.hijos.forEach(function(li){
          if(li.tag === "li") li.hijos = [el("label", {}, [{ crudo: '<input type="checkbox" class="chk-in">' }, el("span", { class: "chk", "aria-hidden": "true" }, []), el("span", { class: "chk-txt" }, li.hijos)])];
        });
        return el("div", { class: "checklist-caja" }, [h, el("div", { class: "checklist-botones" }, [
          el("button", { type: "button", class: "btn-sec", "data-accion": "copiar-lista" }, [txt("Copiar la lista")]),
          el("button", { type: "button", class: "btn-sec", "data-accion": "enviar-lista" }, [txt("Enviármela por WhatsApp")])
        ])]);
      }
      if(h.tag === "table"){
        const filas = [];
        recorrer(h, function(x){ if(x.tag === "tr") filas.push(x); });
        const cab = filas.length && filas[0].hijos.filter(function(c){ return c.tag === "th" || c.tag === "td"; });
        const hayCab = cab && cab.length && cab.every(function(c){ return c.tag === "th"; });
        if(hayCab){
          const rotulos = cab.map(textoLimpio);
          filas.slice(1).forEach(function(tr){
            let col = 0;
            tr.hijos.forEach(function(c){
              if(c.tag !== "td" && c.tag !== "th") return;
              if(rotulos[col] && col > 0) c.at["data-rotulo"] = rotulos[col];
              col += parseInt(c.at.colspan || "1", 10) || 1;
            });
            const c0 = tr.hijos.find(function(c){ return c.tag === "td" || c.tag === "th"; });
            if(c0) c0.at.class = "celda-titulo";
          });
          filas[0].at.class = "fila-cab";
          h.at.class = "tabla";
        }else h.at.class = "tabla tabla-simple";
        return el("div", { class: "tabla-caja" }, [h]);
      }
      if(h.tag === "a"){
        const href = h.at.href || "";
        if(!href){ return el("span", {}, h.hijos); }
        const abs = /^https?:\/\//i.test(href);
        let host = "";
        if(abs){ try{ host = new URL(href).hostname.toLowerCase(); }catch(e){ host = ""; } }
        if(host === "wa.me" || host === "api.whatsapp.com"){
          // el número del sitio, siempre con el mensaje que dice de qué artículo viene
          if(!/[?&]text=/.test(href)) h.at.href = enlaceWhatsApp(mensaje);
          h.at.target = "_blank"; h.at.rel = "noopener"; h.at["data-wa"] = "articulo";
        }else if(host === "www.lomazhome.com" || host === "lomazhome.com"){
          h.at.href = href.replace(/^https?:\/\/(www\.)?lomazhome\.com/i, "") || "/";
        }else if(abs){
          h.at.target = "_blank"; h.at.rel = "noopener";
          if(!REDES_Y_PROPIOS.test(host) && !fuentesVistas[href]){
            fuentesVistas[href] = 1;
            info.fuentes.push({ url: href, texto: (h.at.title || textoLimpio(h) || host).trim(), sitio: host.replace(/^www\./, "") });
          }
        }else if(href.charAt(0) === "#"){
          h.at.href = direccion + href; h.at["data-ancla"] = href.slice(1);
        }else if(!/^(mailto:|tel:|\/|\?)/i.test(href)){
          h.at.href = "/" + href.replace(/^\.\//, "");
        }
        return h;
      }
      if(h.tag === "img"){
        if(!h.at.src) return txt("");
        h.at.loading = "lazy"; h.at.decoding = "async";
        return h;
      }
      return h;
    });
  }
  arreglar(arbol);

  // 6. En la caja final, un párrafo que solo trae el enlace de WhatsApp se vuelve botón
  arbol.hijos.forEach(function(b){
    if(b.tag !== "div" || !/\bcta\b/.test(b.at.class || "")) return;
    b.hijos.forEach(function(p){
      if(p.tag !== "p") return;
      const reales = p.hijos.filter(function(x){ return !estaVacio(x); });
      if(reales.length === 1 && reales[0].tag === "a" && reales[0].at["data-wa"]){
        reales[0].at.class = "btn-wa"; p.at.class = "cta-boton";
        reales[0].hijos = [{ crudo: ICONO_WA }, el("span", {}, reales[0].hijos)];
      }
    });
  });

  // 7. Tipografía y conteo de palabras
  (function pulir(n, enCodigo){
    n.hijos.forEach(function(h){
      if(h.crudo !== undefined) return;
      if(h.texto !== undefined){ if(!enCodigo) h.texto = tipografia(h.texto.replace(/\u00a0/g, " ").replace(/[ \t\r\n]+/g, " ")); return; }
      pulir(h, enCodigo || h.tag === "pre" || h.tag === "code");
    });
  })(arbol, false);
  info.palabras = textoLimpio(arbol).split(" ").filter(Boolean).length;

  return { html: arbol.hijos.map(escribir).join("\n"), info: info, mensaje: mensaje };
}

/* ====================== La página ====================== */

const ICONO_WA = '<svg class="ico-wa" viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false"><path fill="currentColor" d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38a9.9 9.9 0 0 0 4.74 1.21h.01c5.46 0 9.9-4.45 9.9-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2Zm0 1.67c2.2 0 4.27.86 5.82 2.42a8.2 8.2 0 0 1 2.41 5.83c0 4.54-3.7 8.23-8.24 8.23a8.2 8.2 0 0 1-4.19-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.2 8.2 0 0 1-1.26-4.38c0-4.54 3.7-8.24 8.25-8.24Zm-3.5 4.4c-.17 0-.44.06-.67.31-.23.25-.87.85-.87 2.07 0 1.22.89 2.4 1.01 2.57.13.16 1.75 2.67 4.24 3.74.59.26 1.05.41 1.41.52.6.19 1.14.16 1.57.1.48-.07 1.47-.6 1.68-1.18.21-.58.21-1.08.14-1.18-.06-.11-.23-.17-.48-.29-.25-.13-1.47-.73-1.7-.81-.23-.08-.39-.12-.56.13-.16.25-.64.81-.78.97-.15.17-.29.19-.54.06-.25-.12-1.05-.39-2-1.23-.74-.66-1.24-1.47-1.38-1.72-.15-.25-.02-.38.11-.5.11-.11.25-.29.37-.44.13-.14.17-.25.25-.41.08-.17.04-.31-.02-.44-.06-.12-.56-1.35-.77-1.84-.2-.49-.4-.42-.56-.43h-.46Z"/></svg>';

const ESTILOS = [
":root{--navy:#0D1B2E;--navy2:#162540;--gold:#C4992A;--gold-osc:#7A5C10;--cream:#F4E5C2;--crema:#FBF6EA;--white:#fff;--text:#22262e;--muted:#5d6672;--linea:rgba(196,153,42,.3);}",
"*{margin:0;padding:0;box-sizing:border-box;}",
"html{scroll-behavior:smooth;-webkit-text-size-adjust:100%;}",
"body{font-family:\"Inter\",system-ui,-apple-system,\"Segoe UI\",sans-serif;background:var(--white);color:var(--text);min-height:100vh;overflow-x:hidden;}",
"a{color:inherit;}",
"img{max-width:100%;height:auto;display:block;}",
"[hidden]{display:none!important;}",
".salto{position:absolute;left:-9999px;top:0;background:var(--gold);color:var(--navy);padding:.7rem 1rem;z-index:100000;font-weight:600;}",
".salto:focus{left:.5rem;top:.5rem;}",
/* barra de arriba, igual a la del blog */
"#main-nav{position:static;width:100%;padding:1.2rem 3rem;display:flex;align-items:center;justify-content:space-between;background:rgba(13,27,46,.97);border-bottom:1px solid rgba(196,153,42,.2);}",
".nav-logo{font-family:\"Playfair Display\",Georgia,serif;font-size:1.4rem;font-weight:700;letter-spacing:3px;color:#F4E5C2;text-decoration:none;}",
".nav-logo span{color:#C4992A;}",
".nav-links{display:flex;gap:2rem;list-style:none;align-items:center;margin:0;padding:0;}",
".nav-links a{font-size:.75rem;letter-spacing:2px;text-transform:uppercase;color:rgba(244,229,194,.75);text-decoration:none;transition:color .25s;}",
".nav-links a:hover,.nav-links a.activo{color:#C4992A;}",
".nav-links a.activo{font-weight:700;}",
".nav-acceso{border:1px solid #C4992A;color:#F4E5C2;padding:.5rem 1.2rem;font-size:.72rem;letter-spacing:2px;text-transform:uppercase;font-weight:600;text-decoration:none;transition:background .3s;}",
".nav-acceso:hover{background:#C4992A;color:var(--navy);}",
".nav-ham{display:none;flex-direction:column;gap:5px;cursor:pointer;background:none;border:none;width:44px;height:44px;align-items:center;justify-content:center;position:relative;z-index:400;}",
".nav-ham span{display:block;width:22px;height:2px;background:#fff;transition:all .3s;}",
".nav-ham.is-open span:nth-child(1){transform:translateY(7px) rotate(45deg);}.nav-ham.is-open span:nth-child(2){opacity:0;}.nav-ham.is-open span:nth-child(3){transform:translateY(-7px) rotate(-45deg);}",
"#lm-nav{transform:translateY(-105%)!important;transition:transform .28s ease;will-change:transform;}",
"body.nav-show #lm-nav{transform:translateY(0)!important;}",
/* encabezado del artículo */
".art-hero{background:var(--navy);padding:3rem 2rem 3.2rem;position:relative;overflow:hidden;}",
".art-hero::before{content:\"\";position:absolute;top:-90px;right:-110px;width:420px;height:420px;border:1px solid rgba(196,153,42,.12);border-radius:50%;pointer-events:none;}",
".art-hero-in{max-width:1036px;margin:0 auto;position:relative;z-index:1;}",
".art-hero.angosto .art-hero-in{max-width:696px;}",
".migas{font-size:.74rem;letter-spacing:.06em;color:rgba(255,255,255,.55);margin-bottom:1rem;display:flex;flex-wrap:wrap;gap:.1rem .45rem;align-items:center;}",
".migas a{color:rgba(255,255,255,.75);text-decoration:none;padding:.6rem 0;display:inline-block;}",
".migas a:hover{color:var(--gold);}",
".art-hero h1{font-family:\"Playfair Display\",Georgia,serif;font-weight:700;font-size:clamp(1.75rem,4.2vw,2.9rem);color:var(--white);line-height:1.18;margin-bottom:1.1rem;text-wrap:balance;max-width:900px;}",
".art-bajada{font-size:clamp(1rem,2vw,1.12rem);line-height:1.65;color:rgba(255,255,255,.78);max-width:720px;margin-bottom:1.6rem;}",
".art-meta{display:flex;flex-wrap:wrap;gap:.4rem 1.1rem;align-items:center;font-size:.82rem;color:rgba(255,255,255,.62);}",
".art-meta strong{color:var(--cream);font-weight:600;}",
".art-meta a{color:var(--cream);text-decoration:none;border-bottom:1px solid rgba(196,153,42,.6);}",
".art-meta .punto{color:var(--gold);}",
".gold-div{height:1px;background:linear-gradient(90deg,transparent,var(--gold),transparent);}",
".aviso-borrador{background:#7a1f1f;color:#fff;text-align:center;font-size:.85rem;font-weight:600;padding:.7rem 1rem;letter-spacing:.03em;}",
".art-portada{max-width:1100px;margin:2.2rem auto 0;padding:0 2rem;}",
".art-portada img{width:100%;max-height:460px;object-fit:cover;border:1px solid rgba(196,153,42,.2);}",
/* cuerpo: texto + columna del índice */
".art-layout{max-width:1100px;margin:0 auto;padding:2.8rem 2rem 1rem;display:grid;grid-template-columns:minmax(0,1fr) 290px;gap:4rem;align-items:start;}",
".art-layout.sin-lado{grid-template-columns:minmax(0,760px);justify-content:center;}",
".art-cuerpo{min-width:0;font-size:1.06rem;line-height:1.82;color:var(--text);}",
".art-cuerpo>*{max-width:720px;}",
".art-cuerpo p{margin:1.05rem 0;}",
".art-cuerpo>p:first-of-type{font-size:1.16rem;line-height:1.75;color:#161a22;}",
".art-cuerpo h2{font-family:\"Playfair Display\",Georgia,serif;font-size:clamp(1.45rem,3vw,1.85rem);line-height:1.25;color:var(--navy);margin:3rem 0 1rem;padding-top:1.4rem;border-top:1px solid var(--linea);scroll-margin-top:92px;text-wrap:balance;}",
".art-cuerpo h3{font-family:\"Playfair Display\",Georgia,serif;font-size:1.25rem;line-height:1.3;color:var(--navy);margin:2rem 0 .7rem;scroll-margin-top:92px;}",
".art-cuerpo h4{font-size:1rem;font-weight:600;color:var(--navy);margin:1.6rem 0 .5rem;}",
".art-cuerpo ul,.art-cuerpo ol{margin:1.05rem 0 1.05rem 1.35rem;}",
".art-cuerpo li{margin:.55rem 0;padding-left:.25rem;}",
".art-cuerpo li::marker{color:var(--gold-osc);font-weight:600;}",
".art-cuerpo a{color:var(--navy);text-decoration:underline;text-decoration-color:var(--gold);text-decoration-thickness:2px;text-underline-offset:3px;font-weight:500;}",
".art-cuerpo a:hover{color:var(--gold-osc);}",
".art-cuerpo a[target=_blank]:not(.btn-wa)::after{content:\"\\00a0↗\";font-size:.8em;color:var(--gold-osc);}",
".art-cuerpo strong{font-weight:600;color:#12161d;}",
".art-cuerpo blockquote{border-left:3px solid var(--gold);margin:1.6rem 0;padding:.3rem 0 .3rem 1.2rem;color:var(--muted);font-style:italic;}",
".art-cuerpo hr{border:0;height:1px;background:var(--linea);margin:2.4rem 0;}",
".art-cuerpo figure{margin:1.8rem 0;}",
".art-cuerpo figcaption{font-size:.82rem;color:var(--muted);margin-top:.5rem;}",
".art-cuerpo .destacado{font-size:1.15rem;color:var(--navy);}",
/* caja de consejo */
".consejo{background:var(--crema);border:1px solid var(--linea);border-left:4px solid var(--gold);padding:1.1rem 1.3rem 1.15rem;margin:1.9rem 0;}",
".consejo p{margin:.35rem 0;}",
".consejo-rotulo{font-size:.74rem;font-weight:700;letter-spacing:.14em;color:var(--gold-osc);margin:0 0 .3rem!important;display:flex;align-items:center;gap:.5rem;}",
".consejo-rotulo::before{content:\"\";width:18px;height:1px;background:var(--gold);display:inline-block;}",
".nota{background:#f4f6f9;border:1px solid #e1e6ee;padding:1rem 1.2rem;margin:1.6rem 0;font-size:.98rem;}",
/* lista de chequeo */
".checklist-caja{border:1px solid var(--linea);padding:1.2rem 1.3rem 1.3rem;margin:1.7rem 0;background:#fff;}",
".art-cuerpo ul.checklist{list-style:none;margin:0;}",
".checklist li{margin:0;padding:0;border-bottom:1px solid rgba(13,27,46,.08);}",
".checklist label{display:flex;gap:.85rem;align-items:flex-start;padding:.7rem .2rem;cursor:pointer;position:relative;-webkit-tap-highlight-color:transparent;}",
".chk-in{position:absolute;opacity:0;left:.2rem;top:.95rem;width:22px;height:22px;margin:0;cursor:pointer;}",
".checklist li:last-child{border-bottom:0;}",
".chk{flex:0 0 22px;width:22px;height:22px;border:2px solid var(--gold);margin-top:.28rem;display:inline-flex;align-items:center;justify-content:center;background:#fff;transition:background .15s;}",
".chk-in:checked+.chk{background:var(--navy);border-color:var(--navy);}",
".chk-in:checked+.chk::after{content:\"\";width:6px;height:11px;border:solid var(--cream);border-width:0 2px 2px 0;transform:rotate(45deg) translate(-1px,-1px);}",
".chk-in:checked~.chk-txt{color:var(--muted);text-decoration:line-through;text-decoration-color:rgba(93,102,114,.5);}",
".chk-in:focus-visible+.chk{outline:2px solid var(--navy);outline-offset:3px;}",
".checklist-botones{display:flex;flex-wrap:wrap;gap:.7rem;margin-top:1.1rem;}",
".btn-sec{font-family:inherit;font-size:.78rem;font-weight:600;letter-spacing:.06em;text-transform:uppercase;color:var(--navy);background:#fff;border:1px solid var(--gold);padding:.75rem 1.1rem;min-height:44px;cursor:pointer;transition:all .2s;}",
".btn-sec:hover{background:var(--navy);border-color:var(--navy);color:var(--cream);}",
/* tablas */
".tabla-caja{margin:1.7rem 0;overflow-x:auto;-webkit-overflow-scrolling:touch;max-width:100%!important;}",
".tabla{width:100%;border-collapse:collapse;font-size:.95rem;line-height:1.55;}",
".tabla th,.tabla td{padding:.8rem .95rem;text-align:left;vertical-align:top;border-bottom:1px solid rgba(13,27,46,.1);}",
".tabla .fila-cab th{background:var(--navy);color:var(--cream);font-weight:600;font-size:.8rem;letter-spacing:.04em;border-bottom:0;}",
".tabla .celda-titulo{font-weight:600;color:var(--navy);width:26%;}",
".tabla tr:nth-child(even) td{background:rgba(244,229,194,.16);}",
/* preguntas frecuentes */
".faq{margin:1.2rem 0 1.6rem;border-top:1px solid var(--linea);}",
".faq-item{border-bottom:1px solid var(--linea);}",
".faq-item summary{list-style:none;cursor:pointer;padding:1.05rem 2.4rem 1.05rem 0;position:relative;min-height:44px;}",
".faq-item summary::-webkit-details-marker{display:none;}",
".faq-item summary h3{font-family:\"Inter\",system-ui,sans-serif;font-size:1.04rem;font-weight:600;line-height:1.45;color:var(--navy);margin:0;display:inline;}",
".faq-item summary::after{content:\"+\";position:absolute;right:.2rem;top:.82rem;font-size:1.5rem;font-weight:300;color:var(--gold-osc);line-height:1;}",
".faq-item[open] summary::after{content:\"–\";}",
".faq-item summary:focus-visible{outline:2px solid var(--gold);outline-offset:2px;}",
".faq-resp{padding:0 0 1.15rem;}",
".faq-resp p:first-child{margin-top:0;}",
/* cierre y caja de WhatsApp */
".cierre{margin:2.4rem 0 0;font-size:1.12rem;}",
".cta{background:var(--navy);color:rgba(255,255,255,.88);padding:2rem 1.8rem;margin:2.2rem 0 1rem;border-top:3px solid var(--gold);}",
".cta p{margin:.7rem 0;}",
".cta strong{color:var(--white);}",
".art-cuerpo .cta a:not(.btn-wa){color:var(--cream);text-decoration-color:var(--gold);}",
".cta-boton{margin:1.2rem 0!important;}",
".btn-wa{display:inline-flex;align-items:center;justify-content:center;gap:.6rem;background:var(--gold);color:var(--navy)!important;font-weight:700;font-size:.98rem;line-height:1.3;letter-spacing:.01em;text-decoration:none!important;padding:.9rem 1.5rem;min-height:48px;text-align:left;transition:background .2s,transform .2s;}",
".btn-wa:hover{background:#d9ad3a;transform:translateY(-1px);}",
".btn-wa .ico-wa{flex:0 0 20px;}",
/* compartir y firma */
".compartir{display:flex;flex-wrap:wrap;gap:.6rem;align-items:center;margin:2.2rem 0 0;padding:1.2rem 0;border-top:1px solid var(--linea);border-bottom:1px solid var(--linea);}",
".compartir-rotulo{font-size:.74rem;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:var(--muted);margin-right:.4rem;}",
".art-cuerpo .compartir a,.compartir button{font-family:inherit;font-size:.8rem;font-weight:600;color:var(--navy);background:#fff;border:1px solid rgba(13,27,46,.22);padding:.6rem 1rem;min-height:44px;display:inline-flex;align-items:center;gap:.45rem;text-decoration:none;cursor:pointer;transition:all .2s;}",
".art-cuerpo .compartir a:hover,.compartir button:hover{border-color:var(--gold);color:var(--gold-osc);}",
".art-cuerpo .compartir a::after{content:none!important;}",
".firma{margin:2.2rem 0 0;}",
".autor{display:flex;gap:1.2rem;align-items:flex-start;background:var(--crema);border:1px solid var(--linea);padding:1.5rem;}",
".autor-foto{flex:0 0 68px;width:68px;height:68px;border-radius:50%;background:var(--navy);color:var(--gold);font-family:\"Playfair Display\",Georgia,serif;font-size:1.5rem;font-weight:700;display:flex;align-items:center;justify-content:center;overflow:hidden;border:2px solid var(--gold);}",
".autor-foto img{width:100%;height:100%;object-fit:cover;}",
".autor-rotulo{font-size:.68rem;font-weight:700;letter-spacing:.16em;text-transform:uppercase;color:var(--gold-osc);margin:0 0 .25rem!important;}",
".autor-nombre{font-family:\"Playfair Display\",Georgia,serif;font-size:1.25rem;color:var(--navy);margin:0!important;line-height:1.3;}",
".autor-cargo{font-size:.86rem;color:var(--muted);margin:.15rem 0 .55rem!important;}",
".autor-bio{font-size:.95rem;line-height:1.65;margin:0!important;}",
".autor-enlace{font-size:.86rem;margin:.6rem 0 0!important;}",
".fechas{font-size:.86rem;color:var(--muted);margin:1.2rem 0 0!important;}",
".fuentes{font-size:.88rem;color:var(--muted);margin:1rem 0 0;}",
".fuentes-rotulo{font-weight:700;color:var(--navy);margin:0 0 .3rem!important;}",
".art-cuerpo .fuentes ul{margin:.2rem 0 0 1.1rem;}",
".fuentes li{margin:.25rem 0;}",
".aviso-legal{font-size:.84rem;color:var(--muted);font-style:italic;margin:1rem 0 0!important;}",
/* columna del índice */
".art-lado{position:sticky;top:96px;align-self:start;max-height:calc(100vh - 120px);overflow-y:auto;padding-bottom:1rem;}",
".indice-rotulo{font-size:.68rem;font-weight:700;letter-spacing:.2em;text-transform:uppercase;color:var(--gold-osc);margin-bottom:.9rem;}",
".indice ol{list-style:none;border-left:1px solid var(--linea);counter-reset:ind;}",
".indice li{counter-increment:ind;}",
".indice a::before{content:counter(ind) \". \";color:var(--gold-osc);font-weight:600;}",
".indice a{display:block;padding:.48rem 0 .48rem 1rem;margin-left:-1px;border-left:2px solid transparent;font-size:.86rem;line-height:1.4;color:var(--muted);text-decoration:none;transition:color .2s,border-color .2s;}",
".indice a:hover{color:var(--navy);}",
".indice a.activo{color:var(--navy);font-weight:600;border-left-color:var(--gold);}",
".lado-cta{margin-top:1.8rem;background:var(--navy);color:rgba(255,255,255,.85);padding:1.3rem 1.2rem 1.4rem;border-top:3px solid var(--gold);}",
".lado-cta p{font-size:.9rem;line-height:1.55;margin-bottom:1rem;}",
".lado-cta strong{color:#fff;display:block;font-family:\"Playfair Display\",Georgia,serif;font-size:1.08rem;margin-bottom:.35rem;}",
".lado-cta .btn-wa{width:100%;font-size:.92rem;padding:.8rem .8rem;}",
".indice-movil{display:none;border:1px solid var(--linea);background:var(--crema);margin:0 0 1.8rem;}",
".indice-movil summary{list-style:none;cursor:pointer;padding:1rem 2.6rem 1rem 1.1rem;font-size:.78rem;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:var(--navy);position:relative;min-height:48px;display:flex;align-items:center;}",
".indice-movil summary::-webkit-details-marker{display:none;}",
".indice-movil summary::after{content:\"\";position:absolute;right:1.2rem;top:50%;width:8px;height:8px;border:solid var(--gold-osc);border-width:0 2px 2px 0;transform:translateY(-70%) rotate(45deg);transition:transform .2s;}",
".indice-movil[open] summary::after{transform:translateY(-30%) rotate(-135deg);}",
".art-cuerpo .indice-movil ol{list-style:none;margin:0;padding:0 1.1rem 1rem;counter-reset:indm;}",
".art-cuerpo .indice-movil li{margin:0;padding:0;border-top:1px solid rgba(13,27,46,.07);counter-increment:indm;}",
".art-cuerpo .indice-movil a::before{content:counter(indm) \". \";color:var(--gold-osc);font-weight:600;}",
".art-cuerpo .indice-movil a{display:block;padding:.8rem 0;font-size:.95rem;font-weight:500;text-decoration:none;color:var(--navy);min-height:44px;}",
/* otros artículos */
".otros{background:#f7f3ea;margin-top:3.5rem;padding:3.2rem 2rem;}",
".otros-in{max-width:1036px;margin:0 auto;}",
".otros-rotulo{font-size:.68rem;font-weight:700;letter-spacing:.2em;text-transform:uppercase;color:var(--gold-osc);margin-bottom:.5rem;}",
".otros h2{font-family:\"Playfair Display\",Georgia,serif;font-size:clamp(1.4rem,3vw,1.9rem);color:var(--navy);margin-bottom:1.8rem;}",
".otros-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:1.6rem;}",
".otro{background:#fff;border:1px solid rgba(196,153,42,.2);display:flex;flex-direction:column;text-decoration:none;color:inherit;transition:box-shadow .3s,transform .3s;}",
".otro:hover{box-shadow:0 16px 44px rgba(13,27,46,.12);transform:translateY(-3px);}",
".otro-img{aspect-ratio:16/9;overflow:hidden;background:var(--navy);}",
".otro-img img{width:100%;height:100%;object-fit:cover;}",
".otro-cuerpo{padding:1.2rem 1.3rem 1.4rem;display:flex;flex-direction:column;gap:.5rem;flex:1;}",
".otro-cat{font-size:.64rem;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:var(--gold-osc);}",
".otro-titulo{font-family:\"Playfair Display\",Georgia,serif;font-size:1.08rem;line-height:1.35;color:var(--navy);}",
".otro-leer{margin-top:auto;font-size:.72rem;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:var(--gold-osc);padding-top:.5rem;}",
".volver{text-align:center;padding:2.6rem 1.5rem 3.2rem;}",
".btn-volver{display:inline-flex;align-items:center;gap:.5rem;font-size:.75rem;font-weight:600;letter-spacing:.1em;text-transform:uppercase;color:var(--navy);border:1px solid var(--gold);padding:.85rem 1.4rem;min-height:44px;text-decoration:none;transition:all .25s;}",
".btn-volver:hover{background:var(--gold);}",
/* pie */
".site-footer{background:var(--navy);color:rgba(255,255,255,.75);padding:4rem 2rem 2rem;}",
".footer-inner{max-width:1200px;margin:0 auto;}",
".footer-grid{display:grid;grid-template-columns:2fr 1fr 1fr 1fr;gap:3rem;margin-bottom:3rem;}",
".brand-name{font-family:\"Playfair Display\",Georgia,serif;font-size:1.8rem;color:#fff;margin-bottom:.3rem;}",
".brand-name span{color:var(--gold);}",
".footer-tagline{font-size:.75rem;color:var(--gold);letter-spacing:.1em;text-transform:uppercase;margin-bottom:1rem;}",
".footer-desc{font-size:.82rem;line-height:1.7;color:rgba(255,255,255,.6);margin-bottom:1rem;}",
".footer-col h4{font-size:.65rem;font-weight:700;letter-spacing:.15em;text-transform:uppercase;color:var(--gold);margin-bottom:1.2rem;}",
".footer-col ul{list-style:none;}",
".footer-col li{margin-bottom:.7rem;}",
".footer-col a{color:rgba(255,255,255,.62);font-size:.82rem;text-decoration:none;transition:color .2s;display:inline-block;padding:.15rem 0;}",
".footer-col a:hover{color:var(--cream);}",
".footer-bottom{border-top:1px solid rgba(196,153,42,.2);padding-top:1.5rem;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:1rem;}",
".footer-copy{font-size:.75rem;color:rgba(255,255,255,.45);}",
".footer-city{font-family:\"Playfair Display\",Georgia,serif;font-size:.85rem;color:rgba(255,255,255,.4);letter-spacing:.05em;}",
".footer-admin-link{font-size:.72rem;color:rgba(255,255,255,.45);text-decoration:none;}",
/* botón fijo de WhatsApp en celular */
".cta-fija{display:none;}",
".aviso-copiado{position:fixed;left:50%;bottom:92px;transform:translateX(-50%) translateY(20px);background:var(--navy);color:var(--cream);font-size:.86rem;font-weight:500;padding:.75rem 1.2rem;border:1px solid var(--gold);opacity:0;pointer-events:none;transition:opacity .25s,transform .25s;z-index:100001;max-width:90vw;text-align:center;}",
".aviso-copiado.ver{opacity:1;transform:translateX(-50%) translateY(0);}",
"@media(max-width:1020px){",
".art-layout{grid-template-columns:minmax(0,1fr);gap:0;max-width:780px;}",
".art-hero-in,.art-hero.angosto .art-hero-in{max-width:716px;}",
".art-lado{display:none;}",
".indice-movil{display:block;}",
".otros-grid{grid-template-columns:repeat(2,1fr);}",
"}",
"@media(max-width:900px){",
"#main-nav{padding:1rem 1.2rem;}",
".nav-links{display:none;}.nav-ham{display:flex;}",
".nav-links.open{display:flex;flex-direction:column;align-items:flex-start;position:fixed;top:0;right:0;width:min(300px,86vw);height:100vh;background:var(--navy);padding:5rem 2rem 2rem;z-index:300;box-shadow:-4px 0 30px rgba(0,0,0,.3);overflow-y:auto;gap:0;}",
".nav-links.open li{width:100%;}",
".nav-links.open li a{display:block;padding:.95rem 0;font-size:.9rem;}",
".footer-grid{grid-template-columns:1fr 1fr;gap:2rem;}",
"}",
"@media(max-width:768px){",
".art-hero{padding:2.2rem 1.25rem 2.4rem;}",
".art-layout{padding:1.8rem 1.25rem .5rem;}",
".art-portada{padding:0 1.25rem;margin-top:1.4rem;}",
".art-cuerpo{font-size:1.07rem;line-height:1.78;}",
".art-cuerpo>p:first-of-type{font-size:1.12rem;line-height:1.72;}",
".art-cuerpo h2{margin-top:2.4rem;scroll-margin-top:78px;}",
".art-cuerpo h3{scroll-margin-top:78px;}",
".consejo{padding:1rem 1.05rem 1.05rem;}",
".checklist-caja{padding:.9rem 1rem 1.1rem;}",
".checklist-botones .btn-sec{flex:1 1 100%;}",
".cta{padding:1.6rem 1.25rem;}",
".cta .btn-wa{width:100%;}",
".autor{flex-direction:column;gap:.9rem;padding:1.25rem;}",
".otros{padding:2.4rem 1.25rem;}",
".otros-grid{grid-template-columns:1fr;}",
/* en celular cada fila de la tabla se lee como una ficha */
".tabla,.tabla tbody,.tabla tr,.tabla td,.tabla th{display:block;width:100%;}",
".tabla .fila-cab{display:none;}",
".tabla tr{border:1px solid var(--linea);margin-bottom:.9rem;background:#fff;}",
".tabla tr:nth-child(even) td{background:transparent;}",
".tabla td,.tabla th{border-bottom:1px solid rgba(13,27,46,.07);padding:.7rem .95rem;}",
".tabla tr td:last-child{border-bottom:0;}",
".tabla .celda-titulo{width:100%;background:var(--navy)!important;color:var(--cream);font-size:.92rem;}",
".tabla td[data-rotulo]::before{content:attr(data-rotulo);display:block;font-size:.68rem;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:var(--gold-osc);margin-bottom:.2rem;}",
".cta-fija{display:flex;position:fixed;left:0;right:0;bottom:0;z-index:99980;background:rgba(13,27,46,.98);border-top:1px solid var(--gold);padding:.6rem .8rem calc(.6rem + env(safe-area-inset-bottom));transform:translateY(110%);transition:transform .3s ease;gap:.7rem;align-items:center;}",
".cta-fija.ver{transform:translateY(0);}",
".cta-fija-txt{flex:1;min-width:0;font-size:.78rem;line-height:1.3;color:rgba(255,255,255,.85);}",
".cta-fija-txt strong{display:block;color:#fff;font-size:.86rem;}",
".cta-fija .btn-wa{flex:0 0 auto;font-size:.92rem;padding:.65rem 1.05rem;min-height:44px;}",
"body.cta-on #lm-aria-fab{bottom:calc(84px + env(safe-area-inset-bottom))!important;}",
"body.cta-on{padding-bottom:0;}",
".site-footer{padding-bottom:6.5rem;}",
"}",
"@media(max-width:600px){.footer-grid{grid-template-columns:1fr;}}",
"@media(max-width:380px){.cta-fija-txt{display:none;}.cta-fija .btn-wa{flex:1 1 auto;}}",
"@media(prefers-reduced-motion:reduce){html{scroll-behavior:auto;}*{transition:none!important;}}",
"@media print{#main-nav,#lm-nav,.art-lado,.cta-fija,.compartir,.otros,.volver,.site-footer,#lm-aria-fab,#lm-chat-widget,.checklist-botones,.indice-movil{display:none!important;}.art-hero{background:#fff;padding:0 0 1rem;}.art-hero::before{display:none;}.art-hero h1{color:#000;}.art-bajada,.art-meta,.migas,.migas a,.art-meta a,.art-meta strong{color:#333!important;}.art-layout{display:block;padding:0;}.faq-item .faq-resp{display:block;}}"
].join("\n");

// Lo que hace la página en el navegador: índice, lista de chequeo, compartir y botón fijo de WhatsApp
const GUION = [
"(function(){",
"var D=document,A=window.__ART||{};",
"function $(s,r){return (r||D).querySelector(s);}",
"function $$(s,r){return Array.prototype.slice.call((r||D).querySelectorAll(s));}",
"function aviso(t){var a=$('#avisoCopiado');if(!a)return;a.textContent=t;a.classList.add('ver');clearTimeout(aviso.t);aviso.t=setTimeout(function(){a.classList.remove('ver');},2600);}",
"function copiar(t){if(navigator.clipboard&&window.isSecureContext){return navigator.clipboard.writeText(t);}return new Promise(function(ok,no){try{var x=D.createElement('textarea');x.value=t;x.setAttribute('readonly','');x.style.cssText='position:fixed;left:-9999px;top:0';D.body.appendChild(x);x.select();var r=D.execCommand('copy');x.remove();r?ok():no();}catch(e){no(e);}});}",
"var y=$('#footer-year');if(y)y.textContent=new Date().getFullYear();",
/* menú de arriba (igual al del blog) */
"D.body.style.paddingTop='0px';",
"var ham=$('#nav-ham'),nl=$('#nav-links');",
"if(ham&&nl){ham.addEventListener('click',function(){var o=nl.classList.toggle('open');ham.setAttribute('aria-expanded',o?'true':'false');ham.classList.toggle('is-open',o);});nl.addEventListener('click',function(e){if(e.target.closest('a')){nl.classList.remove('open');ham.classList.remove('is-open');ham.setAttribute('aria-expanded','false');}});}",
"function menuFijo(){var lm=$('#lm-nav'),mn=$('#main-nav');if(!lm||!mn||window.__navIO||!('IntersectionObserver' in window))return;window.__navIO=new IntersectionObserver(function(en){en.forEach(function(e){if(e.isIntersecting){D.body.classList.remove('nav-show');lm.style.pointerEvents='none';}else{D.body.classList.add('nav-show');lm.style.pointerEvents='auto';}});},{threshold:0});window.__navIO.observe(mn);$$('#lm-nav .lm-link').forEach(function(a){if(/blog\\.html$/.test(a.getAttribute('href')||''))a.classList.add('lm-active');});}",
"window.addEventListener('load',function(){menuFijo();setTimeout(menuFijo,400);setTimeout(menuFijo,1200);});D.addEventListener('DOMContentLoaded',menuFijo);",
/* índice: ir a la sección sin recargar y marcar la que se está leyendo */
"D.addEventListener('click',function(e){var a=e.target.closest&&e.target.closest('a[data-ancla]');if(!a)return;var el=D.getElementById(a.getAttribute('data-ancla'));if(!el)return;e.preventDefault();var dm=a.closest('details.indice-movil');if(dm)dm.removeAttribute('open');el.scrollIntoView({behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'});try{history.replaceState(null,'',location.pathname+location.search+'#'+el.id);}catch(x){}});",
"var enl=$$('.indice a[data-ancla]'),secs=enl.map(function(a){return D.getElementById(a.getAttribute('data-ancla'));});",
"if(enl.length){var pend=false,marcar=function(){pend=false;var act=-1;secs.forEach(function(s,i){if(s&&s.getBoundingClientRect().top<=140)act=i;});enl.forEach(function(a,i){a.classList.toggle('activo',i===act);});};window.addEventListener('scroll',function(){if(!pend){pend=true;(window.requestAnimationFrame||setTimeout)(marcar);}},{passive:true});marcar();}",
/* lista de chequeo */
"$$('.checklist-caja').forEach(function(caja,n){var clave='lomaz-lista:'+(A.slug||'')+':'+n,items=$$('li',caja),casillas=$$('.chk-in',caja),hechos={};",
"try{hechos=JSON.parse(localStorage.getItem(clave)||'{}')||{};}catch(e){hechos={};}",
"casillas.forEach(function(c,i){c.checked=!!hechos[i];c.addEventListener('change',function(){hechos[i]=c.checked;try{localStorage.setItem(clave,JSON.stringify(hechos));}catch(e){}});});",
"function texto(){var t=(A.titulo?A.titulo+'\\n':'')+'Lista de chequeo\\n\\n';items.forEach(function(li){var s=$('.chk-txt',li);t+='\\u2610 '+(s?s.textContent:li.textContent).replace(/\\s+/g,' ').trim()+'\\n';});return t+'\\n'+(A.url||location.href);}",
"$$('[data-accion=copiar-lista]',caja).forEach(function(b){b.addEventListener('click',function(){copiar(texto()).then(function(){aviso('Lista copiada. Pégala en tus notas o en un chat.');},function(){aviso('No se pudo copiar. Mantén presionado el texto para copiarlo.');});});});",
"$$('[data-accion=enviar-lista]',caja).forEach(function(b){b.addEventListener('click',function(){window.open('https://wa.me/?text='+encodeURIComponent(texto()),'_blank','noopener');});});",
"});",
/* compartir */
"$$('[data-accion=copiar-enlace]').forEach(function(b){b.addEventListener('click',function(){copiar(A.url||location.href).then(function(){aviso('Enlace copiado.');},function(){aviso('No se pudo copiar el enlace.');});});});",
"$$('[data-accion=compartir]').forEach(function(b){if(!navigator.share){b.hidden=true;return;}b.addEventListener('click',function(){navigator.share({title:A.titulo||D.title,text:A.descripcion||'',url:A.url||location.href}).catch(function(){});});});",
/* botón fijo de WhatsApp en celular: aparece al empezar a leer y se quita frente a la caja final */
"var fija=$('#ctaFija');",
"if(fija){var frenteCaja=false,final=$('.art-cuerpo .cta'),pie=$('.site-footer');",
"if('IntersectionObserver' in window){var io2=new IntersectionObserver(function(en){en.forEach(function(e){e.target.__v=e.isIntersecting;});frenteCaja=!!((final&&final.__v)||(pie&&pie.__v));mover();},{threshold:0});if(final)io2.observe(final);if(pie)io2.observe(pie);}",
"var mover=function(){var on=window.scrollY>520&&!frenteCaja;fija.classList.toggle('ver',on);D.body.classList.toggle('cta-on',on);};",
"window.addEventListener('scroll',mover,{passive:true});mover();}",
"})();"
].join("\n");

function metaEtiqueta(prop, valor, esName){
  if(!valor) return "";
  return "<meta " + (esName ? "name" : "property") + '="' + prop + '" content="' + esc(valor) + '">\n';
}

function absoluta(u){
  const s = urlSegura(u, true);
  if(!s) return "";
  if(/^https?:\/\//i.test(s)) return s;
  return SITE + (s.charAt(0) === "/" ? "" : "/") + s;
}

// La firma solo habla de LoMaz Home: si un dato del perfil menciona otra marca, no se usa
function soloLomaz(t){ const s = String(t || "").trim(); return /century|c21|cuvik/i.test(s) ? "" : s; }

function iniciales(nombre){
  const p = String(nombre || "").trim().split(/\s+/).filter(Boolean);
  return ((p[0] || "L").charAt(0) + (p[1] ? p[1].charAt(0) : "")).toUpperCase();
}

function paginaArticulo(a, perfil, otros, opciones){
  const borrador = !!(opciones && opciones.borrador);
  const sep = separarAjustes(a.contenido);
  const aj = sep.ajustes;
  const slug = String(a.slug || "");
  const ruta = "/blog/" + encodeURIComponent(slug);
  const url = SITE + ruta;
  const cont = prepararContenido(a, aj, sep.html, ruta);
  const info = cont.info;

  const titulo = String(a.titulo || "Artículo").trim();
  const tituloSeo = String(aj.titulo_seo || titulo).trim();
  const descripcion = String(a.extracto || "").replace(/\s+/g, " ").trim().slice(0, 300);
  const imagen = absoluta(aj.imagen_compartir) || absoluta(a.imagen_url) || IMAGEN_BLOG;
  const imagenPropia = /^https:\/\/www\.lomazhome\.com\/og-/.test(imagen);
  const minutos = parseInt(a.tiempo_lectura, 10) > 0 ? parseInt(a.tiempo_lectura, 10) : Math.max(1, Math.round(info.palabras / 200));
  const publicado = a.published_at || a.created_at || "";
  let revisado = aj.revisado && fechaClave(aj.revisado) ? aj.revisado : "";
  if(!revisado && a.updated_at && publicado && Date.parse(a.updated_at) - Date.parse(publicado) > 36 * 3600 * 1000) revisado = a.updated_at;
  const muestraRevisado = revisado && fechaClave(revisado) > fechaClave(publicado);
  const modificado = muestraRevisado ? revisado : publicado;

  const dp = (perfil && perfil.datos_perfil) || {};
  const autorNombre = String(a.autor_nombre || (perfil && perfil.nombre_completo) || MARCA).trim();
  const autorEsMarca = /lomaz/i.test(autorNombre);
  const autorCargo = String(aj.autor_cargo || (autorEsMarca ? "" : soloLomaz(dp.cargo_publico) || "Equipo de " + MARCA)).trim();
  const autorBio = String(aj.autor_bio || soloLomaz(dp.bio) || "").replace(/\s+/g, " ").trim();
  const autorSlug = !autorEsMarca && perfil ? (dp.slug || slugify(perfil.nombre_completo)) : "";
  const autorUrl = autorSlug ? "/asesor/" + encodeURIComponent(autorSlug) : "";
  const autorFoto = !autorEsMarca && perfil ? absoluta(perfil.avatar_url) : "";
  const categoria = String(a.categoria || "").trim();
  const waEnlace = enlaceWhatsApp(cont.mensaje);

  /* ---- datos estructurados para Google ---- */
  const autorLd = autorEsMarca ? { "@type": "Organization", name: MARCA, url: SITE + "/" } : Object.assign({ "@type": "Person", name: autorNombre }, autorUrl ? { url: SITE + autorUrl } : {}, autorCargo ? { jobTitle: autorCargo } : {});
  const grafo = [
    Object.assign({ "@type": "BlogPosting", "@id": url + "#articulo", headline: titulo.slice(0, 110), description: descripcion, image: [imagen], inLanguage: "es-CO",
      mainEntityOfPage: { "@type": "WebPage", "@id": url }, author: autorLd,
      publisher: { "@type": "Organization", name: MARCA, url: SITE + "/" }, wordCount: info.palabras },
      categoria ? { articleSection: categoria } : {}, fechaIso(publicado) ? { datePublished: fechaIso(publicado) } : {}, fechaIso(modificado) ? { dateModified: fechaIso(modificado) } : {}),
    { "@type": "BreadcrumbList", itemListElement: [
      { "@type": "ListItem", position: 1, name: "Inicio", item: SITE + "/" },
      { "@type": "ListItem", position: 2, name: "Blog", item: SITE + "/blog.html" },
      { "@type": "ListItem", position: 3, name: titulo, item: url } ] }
  ];
  if(info.preguntas.length){
    grafo.push({ "@type": "FAQPage", "@id": url + "#preguntas", mainEntity: info.preguntas.map(function(q){ return { "@type": "Question", name: q.pregunta, acceptedAnswer: { "@type": "Answer", text: q.respuesta } }; }) });
  }
  const ld = JSON.stringify({ "@context": "https://schema.org", "@graph": grafo }).replace(/</g, "\\u003c");
  const datosPagina = JSON.stringify({ slug: slug, titulo: titulo, descripcion: descripcion, url: url }).replace(/</g, "\\u003c");

  /* ---- piezas ---- */
  const indiceHtml = info.indice.length >= 3 ? info.indice.map(function(s){ return '<li><a href="' + esc(ruta + "#" + s.id) + '" data-ancla="' + esc(s.id) + '">' + escTexto(s.texto) + "</a></li>"; }).join("") : "";
  const lado = indiceHtml ?
    '<aside class="art-lado" aria-label="Índice del artículo">\n<nav class="indice"><p class="indice-rotulo">En esta guía</p><ol>' + indiceHtml + "</ol></nav>\n" +
    '<div class="lado-cta"><p><strong>¿Tienes una pregunta?</strong>Escríbenos por WhatsApp y te respondemos, sin compromiso.</p><a class="btn-wa" data-wa="lado" href="' + esc(waEnlace) + '" target="_blank" rel="noopener">' + ICONO_WA + "<span>Escríbenos</span></a></div>\n</aside>" : "";
  const indiceMovil = indiceHtml ? '<details class="indice-movil"><summary>En esta guía</summary><ol>' + indiceHtml + "</ol></details>\n" : "";

  const compartirTexto = titulo + " " + url;
  const compartir =
    '<div class="compartir"><span class="compartir-rotulo">Compartir</span>' +
    '<a href="https://wa.me/?text=' + esc(encodeURIComponent(compartirTexto)) + '" target="_blank" rel="noopener">WhatsApp</a>' +
    '<a href="https://www.facebook.com/sharer/sharer.php?u=' + esc(encodeURIComponent(url)) + '" target="_blank" rel="noopener">Facebook</a>' +
    '<button type="button" data-accion="copiar-enlace">Copiar enlace</button>' +
    '<button type="button" data-accion="compartir">Más opciones</button></div>';

  let fechas = publicado ? "Publicado el " + fechaLarga(publicado) : "";
  if(muestraRevisado) fechas += (fechas ? " · " : "") + "Última revisión: " + fechaLarga(revisado);
  const fuentes = info.fuentes.length ?
    '<div class="fuentes"><p class="fuentes-rotulo">Fuentes citadas</p><ul>' + info.fuentes.map(function(f){
      return '<li><a href="' + esc(f.url) + '" target="_blank" rel="noopener">' + escTexto(f.texto) + "</a> (" + escTexto(f.sitio) + ")</li>";
    }).join("") + "</ul></div>" : "";
  const firma =
    '<section class="firma" aria-label="Sobre el autor">\n<div class="autor">' +
    '<div class="autor-foto">' + (autorFoto ? '<img src="' + esc(autorFoto) + '" alt="' + esc(autorNombre) + '" loading="lazy" width="68" height="68">' : escTexto(autorEsMarca ? "LH" : iniciales(autorNombre))) + "</div>" +
    '<div><p class="autor-rotulo">Escrito por</p><p class="autor-nombre">' + escTexto(autorNombre) + "</p>" +
    (autorCargo ? '<p class="autor-cargo">' + escTexto(autorCargo) + "</p>" : "") +
    (autorBio ? '<p class="autor-bio">' + escTexto(autorBio) + "</p>" : "") +
    (autorUrl ? '<p class="autor-enlace"><a href="' + esc(autorUrl) + '">Ver su tarjeta de contacto</a></p>' : "") +
    "</div></div>\n" +
    (fechas ? '<p class="fechas">' + escTexto(fechas) + "</p>" : "") + fuentes +
    '<p class="aviso-legal">Información general; no reemplaza la asesoría sobre tu caso.</p>\n</section>';

  let relacionados = "";
  if(otros && otros.length){
    const mismos = otros.filter(function(o){ return categoria && o.categoria === categoria; });
    const lista = mismos.concat(otros.filter(function(o){ return mismos.indexOf(o) < 0; })).slice(0, 3);
    relacionados = '<section class="otros" aria-label="Otras guías"><div class="otros-in"><p class="otros-rotulo">Sigue leyendo</p><h2>Otras guías de ' + MARCA + '</h2><div class="otros-grid">' +
      lista.map(function(o){
        const im = absoluta(o.imagen_url) || IMAGEN_BLOG;
        return '<a class="otro" href="/blog/' + esc(encodeURIComponent(o.slug || "")) + '"><div class="otro-img"><img src="' + esc(im) + '" alt="" loading="lazy"></div><div class="otro-cuerpo">' +
          (o.categoria ? '<span class="otro-cat">' + escTexto(o.categoria) + "</span>" : "") + '<span class="otro-titulo">' + escTexto(o.titulo || "") + '</span><span class="otro-leer">Leer la guía →</span></div></a>';
      }).join("") + "</div></div></section>";
  }

  const metaPartes = [];
  metaPartes.push("<span>Por " + (autorUrl ? '<a href="' + esc(autorUrl) + '">' + escTexto(autorNombre) + "</a>" : "<strong>" + escTexto(autorNombre) + "</strong>") + "</span>");
  if(publicado) metaPartes.push('<span><time datetime="' + esc(fechaIso(publicado)) + '">' + escTexto(fechaLarga(publicado)) + "</time></span>");
  metaPartes.push("<span>" + minutos + " min de lectura</span>");

  const portada = aj.portada !== false && a.imagen_url && absoluta(a.imagen_url) ? '<div class="art-portada"><img src="' + esc(absoluta(a.imagen_url)) + '" alt="' + esc(titulo) + '" fetchpriority="high"></div>\n' : "";

  return "<!DOCTYPE html>\n" +
'<html lang="es">\n<head>\n<meta charset="UTF-8">\n<meta name="viewport" content="width=device-width,initial-scale=1.0">\n<base href="/">\n' +
"<title>" + escTexto(tituloSeo) + " | " + MARCA + "</title>\n" +
metaEtiqueta("description", descripcion, true) +
(borrador ? '<meta name="robots" content="noindex,nofollow">\n' : '<meta name="robots" content="index,follow,max-image-preview:large">\n') +
'<link rel="canonical" href="' + esc(url) + '">\n' +
metaEtiqueta("og:type", "article") + metaEtiqueta("og:site_name", MARCA) + metaEtiqueta("og:locale", "es_CO") +
metaEtiqueta("og:title", tituloSeo) + metaEtiqueta("og:description", descripcion) + metaEtiqueta("og:url", url) + metaEtiqueta("og:image", imagen) +
(imagenPropia ? metaEtiqueta("og:image:width", "1200") + metaEtiqueta("og:image:height", "630") : "") + metaEtiqueta("og:image:alt", titulo) +
metaEtiqueta("article:published_time", fechaIso(publicado)) + metaEtiqueta("article:modified_time", fechaIso(modificado)) + metaEtiqueta("article:section", categoria) +
metaEtiqueta("twitter:card", "summary_large_image", true) + metaEtiqueta("twitter:title", tituloSeo, true) + metaEtiqueta("twitter:description", descripcion, true) + metaEtiqueta("twitter:image", imagen, true) +
'<link rel="preconnect" href="https://fonts.googleapis.com">\n<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n' +
'<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400;1,600&family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">\n' +
"<style>\n" + ESTILOS + "\n</style>\n" +
'<link rel="stylesheet" href="/lomaz-mobile.css">\n' +
'<script type="application/ld+json">' + ld + "</script>\n" +
"</head>\n<body>\n" +
'<a class="salto" href="' + esc(ruta) + '#contenido" data-ancla="contenido">Ir al contenido</a>\n' +
(borrador ? '<div class="aviso-borrador">Borrador · así se verá cuando lo publiques. Solo lo ves tú, con tu sesión.</div>\n' : "") +
'<nav id="main-nav" class="nav" aria-label="Principal">\n' +
'<a href="index.html" class="nav-logo">LoMaz <span>Home</span></a>\n' +
'<ul class="nav-links" id="nav-links">' +
'<li><a href="index.html">Inicio</a></li><li><a href="propiedades.html">Propiedades</a></li><li><a href="blog.html" class="activo">Blog</a></li>' +
'<li><a href="calculadora.html">Calculadora</a></li><li><a href="sobre-nosotros.html">Nosotros</a></li><li><a href="contacto.html">Contacto</a></li></ul>\n' +
'<a href="login.html" class="nav-acceso">Acceso Asesores</a>\n' +
'<button class="nav-ham" id="nav-ham" type="button" aria-label="Abrir menú" aria-expanded="false"><span></span><span></span><span></span></button>\n</nav>\n' +
'<main>\n<header class="art-hero' + (lado ? "" : " angosto") + '"><div class="art-hero-in">\n' +
'<nav class="migas" aria-label="Ruta"><a href="/index.html">Inicio</a><span aria-hidden="true">›</span><a href="/blog.html">Blog</a>' + (categoria ? '<span aria-hidden="true">›</span><a href="/blog.html?cat=' + esc(encodeURIComponent(categoria)) + '">' + escTexto(categoria) + "</a>" : "") + "</nav>\n" +
"<h1>" + escTexto(tipografia(titulo)) + "</h1>\n" +
(descripcion ? '<p class="art-bajada">' + escTexto(tipografia(descripcion)) + "</p>\n" : "") +
'<div class="art-meta">' + metaPartes.join('<span class="punto" aria-hidden="true">·</span>') + "</div>\n" +
"</div></header>\n<div class=\"gold-div\"></div>\n" + portada +
'<div class="art-layout' + (lado ? "" : " sin-lado") + '">\n<article class="art-cuerpo" id="contenido">\n' + indiceMovil + cont.html + "\n" + compartir + "\n" + firma + "\n</article>\n" + lado + "\n</div>\n" +
relacionados +
'<div class="volver"><a class="btn-volver" href="/blog.html">← Volver al blog</a></div>\n</main>\n' +
'<footer class="site-footer"><div class="footer-inner"><div class="footer-grid">' +
'<div><div class="brand-name">LoMaz <span>Home</span></div><p class="footer-tagline">Inmobiliaria boutique</p><p class="footer-desc">Conectamos personas con propiedades excepcionales en Bogotá. Asesoría personalizada, transparencia total y resultados reales.</p></div>' +
'<div class="footer-col"><h4>Propiedades</h4><ul><li><a href="propiedades.html?tipo=arriendo">Arriendo</a></li><li><a href="propiedades.html?tipo=venta">Venta</a></li><li><a href="propiedades.html?barrio=Chapinero">Chapinero</a></li><li><a href="propiedades.html?barrio=Usaquén">Usaquén</a></li><li><a href="propiedades.html?barrio=Chicó">Chicó</a></li></ul></div>' +
'<div class="footer-col"><h4>Blog</h4><ul><li><a href="blog.html?cat=Arrendamiento">Arrendamiento</a></li><li><a href="blog.html?cat=Compraventa">Compraventa</a></li><li><a href="blog.html?cat=Financiación">Financiación</a></li><li><a href="blog.html?cat=Trámites">Trámites</a></li></ul></div>' +
'<div class="footer-col"><h4>Contacto</h4><ul><li><a href="https://wa.me/' + WHATSAPP + '" target="_blank" rel="noopener">+57 300 330 0343</a></li><li><a href="mailto:lomazhome@gmail.com">lomazhome@gmail.com</a></li><li><a href="https://www.instagram.com/lomazhome" target="_blank" rel="noopener">Instagram @lomazhome</a></li><li><a href="contacto.html">Bogotá, Colombia</a></li></ul></div>' +
'</div><div class="footer-bottom"><span class="footer-copy">© <span id="footer-year">2026</span> LoMaz Home. Todos los derechos reservados.</span><span class="footer-city">Bogotá · Desde 2024</span><a href="login.html" class="footer-admin-link">Acceso asesores</a></div></div></footer>\n' +
'<div class="cta-fija" id="ctaFija"><div class="cta-fija-txt"><strong>¿Tienes una pregunta?</strong>Te respondemos por WhatsApp.</div><a class="btn-wa" data-wa="fijo" href="' + esc(waEnlace) + '" target="_blank" rel="noopener">' + ICONO_WA + "<span>Escríbenos</span></a></div>\n" +
'<div class="aviso-copiado" id="avisoCopiado" role="status" aria-live="polite"></div>\n' +
"<script>window.__ART=" + datosPagina + ";</script>\n<script>\n" + GUION + "\n</script>\n" +
'<script src="/config.js"></script>\n<script src="/lomaz-nav.js" defer></script>\n' +
"</body>\n</html>\n";
}

function paginaError(){
  return '<!DOCTYPE html>\n<html lang="es"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><meta name="robots" content="noindex">' +
    "<title>No pudimos cargar el artículo | " + MARCA + "</title><style>body{font-family:system-ui,sans-serif;background:#0D1B2E;color:#F4E5C2;display:flex;min-height:100vh;align-items:center;justify-content:center;text-align:center;padding:2rem;margin:0}a{color:#C4992A}h1{font-family:Georgia,serif;font-weight:400}</style></head>" +
    '<body><div><h1>No pudimos cargar el artículo</h1><p>Vuelve a intentarlo en un momento o <a href="/blog.html">entra al blog</a>.</p></div></body></html>';
}

/* ====================== Entrada ====================== */

function redirigir(res, codigo, destino, cache){
  res.statusCode = codigo;
  res.setHeader("Location", destino);
  res.setHeader("Cache-Control", cache || "no-store");
  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  res.end("Redirigiendo a " + destino);
}

module.exports = async function handler(req, res){
  let slug = "", id = "", pideBorrador = false;
  try{
    const u = new URL(req.url, SITE);
    slug = u.searchParams.get("slug") || "";
    id = u.searchParams.get("id") || "";
    pideBorrador = u.searchParams.get("borrador") === "1";
    if(!slug && !id){
      const partes = u.pathname.replace(/\/+$/, "").split("/");
      const ultimo = decodeURIComponent(partes[partes.length - 1] || "");
      if(partes.length >= 3 && partes[partes.length - 2] === "blog") slug = ultimo;
    }
  }catch(e){}
  slug = String(slug).trim().toLowerCase();

  // Enlaces viejos por id (los de los correos ya enviados): se busca su dirección nueva
  if(!slug && id){
    const r = /^[0-9a-fA-F-]{36}$/.test(id) ? await leerPorId(id) : { ok: true, filas: [] };
    if(r.ok && r.filas.length && r.filas[0].slug) return redirigir(res, 301, "/blog/" + encodeURIComponent(r.filas[0].slug), "public, s-maxage=300");
    return redirigir(res, 302, "/blog.html");
  }
  if(!slug || !/^[a-z0-9][a-z0-9-]{0,119}$/.test(slug)) return redirigir(res, 302, "/blog.html");

  // Vista previa de un borrador: solo con la sesión de un asesor
  let token = "";
  if(pideBorrador){
    const aut = String((req.headers && (req.headers.authorization || req.headers.Authorization)) || "");
    token = /^Bearer\s+\S+/i.test(aut) ? aut.replace(/^Bearer\s+/i, "").trim() : "";
    if(!token || token === SUPABASE_ANON){ res.statusCode = 401; res.setHeader("Cache-Control", "no-store"); res.setHeader("Content-Type", "text/plain; charset=utf-8"); return res.end("La vista previa necesita una sesión iniciada."); }
  }

  const r = await leerArticulo(slug, token);
  if(!r.ok){
    if(token && (r.status === 401 || r.status === 403)){ res.statusCode = 401; res.setHeader("Cache-Control", "no-store"); res.setHeader("Content-Type", "text/plain; charset=utf-8"); return res.end("Tu sesión venció. Vuelve a entrar a la plataforma."); }
    res.statusCode = 503;
    res.setHeader("Retry-After", "30");
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    return res.end(paginaError());
  }
  if(!r.filas.length){
    if(token){ res.statusCode = 404; res.setHeader("Cache-Control", "no-store"); res.setHeader("Content-Type", "text/plain; charset=utf-8"); return res.end("No existe un artículo con esa dirección."); }
    return redirigir(res, 302, "/blog.html");
  }
  const articulo = r.filas[0];
  const esBorrador = articulo.estado !== "publicado";

  let html = "";
  try{
    const extras = await Promise.all([leerAutor(articulo.autor_id), leerOtros(slug)]);
    html = paginaArticulo(articulo, extras[0], extras[1].ok ? extras[1].filas : [], { borrador: esBorrador });
  }catch(e){
    // Algo inesperado en el contenido: mejor un aviso amable que una página de error del servidor
    console.error("blog-articulo: no se pudo armar " + slug, e);
    res.statusCode = 500;
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    return res.end(paginaError());
  }

  res.statusCode = 200;
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader("Cache-Control", esBorrador || token ? "private, no-store" : "public, max-age=0, s-maxage=300, stale-while-revalidate=86400");
  if(esBorrador) res.setHeader("X-Robots-Tag", "noindex, nofollow");
  res.end(html);
};

// Para las pruebas
module.exports._interno = { leerHtml: leerHtml, ordenarBloques: ordenarBloques, prepararContenido: prepararContenido, paginaArticulo: paginaArticulo, separarAjustes: separarAjustes, urlSegura: urlSegura, mensajeWhatsApp: mensajeWhatsApp, fechaLarga: fechaLarga, decodificar: decodificar, slugify: slugify };
