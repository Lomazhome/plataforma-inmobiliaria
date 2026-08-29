// ============================================================
// Edge Function: publicar-en-fincaraiz
// Recibe los datos de una propiedad LoMaz Home y la publica en
// el portal Fincaraiz usando su API oficial (OpenAPI v1.0).
// Tambien soporta accion 'activar' para PATCH /listing/status
// ============================================================
// Secretos esperados (Edge Functions > Secrets):
//   FINCARAIZ_API_URL    Ej QA: https://kong-qa.frcol.io/management/api/1.0
//                        Ej PROD: https://msi-infofinca.fincaraiz.com.co/management/api/1.0
//   FINCARAIZ_API_KEY    Token de cabecera apikey
//   FINCARAIZ_CLIENT_ID  UUID asignado por Fincaraiz
//   FINCARAIZ_CLIENT_AGENT (opcional) numero de agente/sucursal
// ============================================================

import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// --- Ambiente: si existe el secret FINCARAIZ_API_KEY_PROD se usa PRODUCCION. ---
// Asi pasar de pruebas a produccion es UN SOLO secret, sin tocar el codigo.
// Opcionales: FINCARAIZ_API_URL_PROD y FINCARAIZ_CLIENT_ID_PROD.
// OJO: la URL de produccion NO se adivina. QA usa el gateway kong-qa.frcol.io con
// header "apikey"; el host msi-infofinca.fincaraiz.com.co exige JWT y devuelve 401.
// Solo se pasa a produccion cuando existen AMBOS secrets: la llave y la URL reales.
const KEY_PROD = Deno.env.get("FINCARAIZ_API_KEY_PROD") || "";
const URL_PROD = Deno.env.get("FINCARAIZ_API_URL_PROD") || "";
const ES_PROD = KEY_PROD.length > 0 && URL_PROD.length > 0;

const SECRETS = {
  FR_URL: ES_PROD
    ? URL_PROD
    : (Deno.env.get("FINCARAIZ_API_URL") || ""),
  FR_KEY: ES_PROD ? KEY_PROD : (Deno.env.get("FINCARAIZ_API_KEY") || ""),
  FR_CLIENT: ES_PROD
    ? (Deno.env.get("FINCARAIZ_CLIENT_ID_PROD") || Deno.env.get("FINCARAIZ_CLIENT_ID") || "")
    : (Deno.env.get("FINCARAIZ_CLIENT_ID") || ""),
  FR_AGENT: Deno.env.get("FINCARAIZ_CLIENT_AGENT") || "",
  WEBHOOK_SECRET: Deno.env.get("WEBHOOK_SHARED_SECRET") || "",
};

function frcolHeaders() {
  return {
    "Content-Type": "application/json",
    "apikey": SECRETS.FR_KEY,
  };
}

function offerFor(tipo) {
  const m = { venta: "sell", arriendo: "rent", arriendo_temporal: "lease", alquiler_vacacional: "lease" };
  return m[tipo] || "sell";
}

function propertyTypeFor(tipo) {
  const m = {
    apartamento: "apartment", casa: "house", lote: "lot", local: "commercial",
    oficina: "office", bodega: "warehouse", finca: "farm", habitacion: "room",
    consultorio: "consulting-room", edificio: "building", cabana: "cabin",
    casa_campestre: "country-house", estudio: "studio", casa_lote: "house-lot",
    apartaestudio: "studio",
    parqueadero: "parking",
  };
  return m[tipo] || "apartment";
}

function currencyId(p) {
  // Fincaraiz espera el ID NUMERICO de la moneda, no el codigo ISO.
  // Enviar "COP" produce 400: [{"currency":["A valid integer is required."]}]
  // Se lee el ISO guardado en la propiedad (columna moneda) y se traduce al id.
  // Los ids se ajustan sin redeploy con los secrets FINCARAIZ_CURRENCY_ID (COP)
  // y FINCARAIZ_CURRENCY_ID_USD (USD).
  const iso = String((p && p.moneda) || "COP").trim().toUpperCase();
  const envCop = Number(Deno.env.get("FINCARAIZ_CURRENCY_ID"));
  const envUsd = Number(Deno.env.get("FINCARAIZ_CURRENCY_ID_USD"));
  const idCop = (Number.isFinite(envCop) && envCop > 0) ? envCop : 1;
  const idUsd = (Number.isFinite(envUsd) && envUsd > 0) ? envUsd : 2;
  return (iso === "USD" || iso === "DOLAR" || iso === "DOLARES") ? idUsd : idCop;
}

// Agente registrado en Finca Raiz (GET /client/<id>/agent). Se usa para el
// telefono/whatsapp y el email de contacto del aviso. Cacheado en memoria.
let _AGENTE_CACHE = null;
async function getAgenteFR() {
  if (_AGENTE_CACHE !== null) return _AGENTE_CACHE;
  try {
    const r = await fetch(SECRETS.FR_URL + "/client/" + encodeURIComponent(SECRETS.FR_CLIENT) + "/agent", { headers: frcolHeaders() });
    if (!r.ok) { _AGENTE_CACHE = false; return false; }
    const j = await r.json();
    _AGENTE_CACHE = (Array.isArray(j) && j.length > 0) ? j[0] : false;
  } catch (_e) { _AGENTE_CACHE = false; }
  return _AGENTE_CACHE;
}

// Mapa LoMaz Home -> ids de caracteristicas de Finca Raiz.
// FUENTE VALIDA (confirmada 28/08/2026): el catalogo bueno para mapear las
// caracteristicas NO es la lista cruda de GET /category, sino el enum + la
// descripcion del campo "categories" del OpenAPI Integradores 1.0.0
// (app.swaggerhub.com/apis-docs/Fincaraiz.com.co/Integradores/1.0.0).
// Todos los ids de abajo estan verificados contra ese enum.
const CAT_MAP = {
  "piscina": 17, "piscina climatizada": 17, "piscina privada": 17,
  "jacuzzi": 125, "sauna": 125, "turco": 125,
  "gimnasio": 103,
  "cancha de tenis": 101, "cancha futbol": 163, "cancha squash": 100, "cancha multiple": 102,
  "juegos infantiles": 106, "parque infantil": 106, "zona infantil": 106,
  "salon comunal": 112, "salon social": 112,
  "zona bbq": 177, "terraza bbq": 177,
  "senderos ecologicos": 107, "zonas verdes": 107,
  "porteria 24h": 115, "conserjeria": 115,
  "seguridad 24h": 147, "vigilancia privada": 245,
  "camara seguridad": 117, "camaras de seguridad": 117,
  "control acceso": 253, "citofono": 130, "alarma": 120,
  "porton electrico": 152, "puerta blindada": 218,
  "cuarto de escoltas": 108,
  "detector de humo": 212, "detector incendio": 149,
  "ascensor": 13, "elevador de carga": 317,
  "gas natural": 133, "aire acondicionado": 1,
  "calefaccion": 116, "calentador agua": 116,
  "pozo agua": 166, "cisterna": 150, "planta electrica": 118,
  "internet fibra optica": 190,
  "terraza": 10, "balcon": 32, "patio": 16, "jardin": 7,
  "sotano": 274, "mezanine": 153, "mezzanine": 153,
  "estudio": 122, "cuarto servicio": 123, "bano servicio": 273,
  "lavanderia": 134, "zona de ropas": 134,
  "closets": 180, "closet": 180, "vestidor": 180, "vestier": 180,
  "cuarto util": 11, "deposito": 11, "bodega privada": 11,
  "cocina integral": 20, "cocina semi integral": 174, "cocina equipada": 174,
  "cocina abierta": 131, "cocina americana": 131,
  "comedor auxiliar": 132,
  "horno": 174, "estufa gas": 174, "estufa electrica": 174,
  "microondas": 174, "nevera": 174, "lavavajillas": 174,
  "chimenea": 129, "barra desayunadora": 127,
  "parqueadero cubierto": 207, "parqueadero descubierto": 290,
  "parqueadero doble": 109, "parqueadero visitantes": 5,
  "parqueadero moto": 164, "parqueadero privado": 230, "parqueadero comunal": 164,
  "vista al mar": 126, "vista a la montana": 126, "vista panoramica": 126,
  "vista ciudad": 126, "vista al lago": 126,
  "frente parque": 142, "esquinero": 201,
  "amoblado": 19,
  "pisos en madera": 217, "pisos en porcelanato": 4, "pisos en marmol": 4
};
// Tipo de piso declarado en LoMaz Home -> id de caracteristica de Finca Raiz.
const PISO_MAP = {
  "madera": 217, "laminado": 217, "parquet": 217,
  "marmol": 4, "baldosa": 4, "porcelanato": 4, "ceramica": 4,
  "alfombra": 216, "cemento": 191
};
function normTxt(s) {
  const t = String(s || "").toLowerCase().normalize("NFD");
  let out = "";
  for (let i = 0; i < t.length; i++) {
    const c = t.charAt(i);
    const n = t.charCodeAt(i);
    if (n >= 768 && n <= 879) continue;
    if ((c >= "a" && c <= "z") || (c >= "0" && c <= "9")) out += c;
    else out += " ";
  }
  return out.replace(/[ ]+/g, " ").trim();
}
function _listaCaract(p) {
  const vals = [];
  const add = function (v) {
    if (!v) return;
    if (Array.isArray(v)) { v.forEach(function (x) { if (x) vals.push(String(x)); }); return; }
    if (typeof v === "string") {
      const s = v.trim();
      if (!s) return;
      if (s.charAt(0) === "[") { try { add(JSON.parse(s)); return; } catch (_e) { /* noop */ } }
      s.split(",").forEach(function (x) { if (x.trim()) vals.push(x.trim()); });
    }
  };
  add(p.caracteristicas);
  add(p.amenidades);
  return vals;
}
function mapCategorias(p) {
  const ids = [];
  const push = function (id) { if (id && ids.indexOf(id) === -1) ids.push(id); };
  _listaCaract(p).forEach(function (t) { push(CAT_MAP[normTxt(t)]); });
  if (p.deposito === true) push(11);
  if (p.tiene_piscina === true) push(17);
  push(PISO_MAP[normTxt(p.tipo_piso)]);
  return ids.sort(function (a, b) { return a - b; });
}
// Antiguedad: Finca Raiz espera el CODIGO del rango, no los anios.
// 0 Indefinido | 1 Menor a un anio | 2 De 1 a 8 | 3 De 9 a 15 | 4 De 16 a 30 | 5 Mas de 30
function ageFor(p) {
  const raw = (p.antiguedad !== null && p.antiguedad !== undefined && p.antiguedad !== "") ? p.antiguedad : p.edad_inmueble;
  if (raw === null || raw === undefined || raw === "") return 0;
  const n = Number(raw);
  if (isFinite(n) && String(raw).trim() !== "" && !isNaN(n)) {
    if (n <= 0) return 0;
    if (n < 1) return 1;
    if (n <= 8) return 2;
    if (n <= 15) return 3;
    if (n <= 30) return 4;
    return 5;
  }
  const t = normTxt(raw);
  if (t.indexOf("menor") >= 0 || t.indexOf("nuev") >= 0 || t.indexOf("estren") >= 0) return 1;
  if (t.indexOf("1 a 8") >= 0) return 2;
  if (t.indexOf("9 a 15") >= 0) return 3;
  if (t.indexOf("16 a 30") >= 0) return 4;
  if (t.indexOf("mas de 30") >= 0) return 5;
  return 0;
}
// Condicion del inmueble (enum de Finca Raiz)
function conditionFor(p) {
  const t = normTxt(p.estado_conservacion || p.condicion || "");
  const cs = _listaCaract(p).map(function (x) { return normTxt(x); });
  if (cs.indexOf("construccion nueva") >= 0 || t.indexOf("nuev") >= 0) return 1;
  if (cs.indexOf("recien remodelado") >= 0 || t.indexOf("remodel") >= 0) return 4;
  if (t.indexOf("excelente") >= 0) return 2;
  if (t.indexOf("buen") >= 0) return 3;
  if (t.indexOf("plano") >= 0) return 7;
  if (t.indexOf("inmediata") >= 0) return 8;
  return 0;
}
// Pisos interiores (0 sin especificar, 18 = mas de 16)
function interiorFloorsFor(p) {
  const n = Number(p.niveles || p.pisos_totales || 0);
  if (!isFinite(n) || n <= 0) return 0;
  if (n > 16) return 18;
  return Math.round(n);
}
// Descripcion completa: titulo + descripcion + como llegar
function descFor(p) {
  const NL = String.fromCharCode(10) + String.fromCharCode(10);
  const partes = [];
  if (p.titulo) partes.push(String(p.titulo).trim());
  if (p.descripcion) partes.push(String(p.descripcion).trim());
  if (p.como_llegar) partes.push("Como llegar: " + String(p.como_llegar).trim());
  const txt = partes.join(NL).trim();
  return txt || "Inmueble LoMaz Home";
}

function buildListingPayload(p, opts) {
  const FMT = (opts && opts.fmt) ? String(opts.fmt) : "obj_image";
  let urls = [];
  const _addFotos = function (v) {
    if (!v) return;
    if (Array.isArray(v)) {
      v.forEach(function (x) {
        if (typeof x === "string") urls.push(x.trim());
        else if (x && typeof x.url === "string") urls.push(String(x.url).trim());
        else if (x && typeof x.image === "string") urls.push(String(x.image).trim());
      });
      return;
    }
    if (typeof v === "string") {
      const s = v.trim();
      if (!s) return;
      if (s.charAt(0) === "[") { try { _addFotos(JSON.parse(s)); return; } catch (_e) { /* noop */ } }
      s.split(",").forEach(function (x) { if (x.trim()) urls.push(x.trim()); });
    }
  };
  if (typeof p.foto_principal === "string" && p.foto_principal.trim()) urls.push(p.foto_principal.trim());
  _addFotos(p.fotos);
  _addFotos(p.imagenes);
  _addFotos(p.fotos_url);
  const _yaVi = {};
  const _fotosOk = [];
  urls.forEach(function (u) {
    if (u && u.indexOf("http") === 0 && !_yaVi[u]) { _yaVi[u] = 1; _fotosOk.push(u); }
  });
  urls = _fotosOk.slice(0, 30);
  const photos = [];
  if (FMT === "obj_image") urls.forEach(function (u, i) { photos.push({ sort_order: i + 1, is_main: i === 0, image: u }); });
  else if (FMT === "obj_url") urls.forEach(function (u, i) { photos.push({ sort_order: i + 1, is_main: i === 0, url: u }); });
  else urls.forEach(function (u) { photos.push(u); });

  const _ag = (opts && opts.agente) ? opts.agente : null;
  const _mail = (_ag && _ag.email) || p.contacto_email || "contacto@lomazhome.com";
  const _tel = String((_ag && (_ag.whatsapp || _ag.phone)) || p.contacto_telefono || p.telefono || "").replace(/[^0-9+]/g, "");
  let _contact;
  if (FMT === "str") _contact = { emails: [_mail], phones: _tel ? [_tel] : [] };
  else _contact = { emails: [{ email: _mail }], phones: _tel ? [{ phone: _tel }] : [] };

  const payload = {
    external_code: String(p.id),
    client_id: SECRETS.FR_CLIENT,
    offer: offerFor(p.tipo_operacion),
    property_type: propertyTypeFor(p.tipo_propiedad),
    description: descFor(p),
    price: Number(p.precio) || 0,
    currency: currencyId(p),
    area: Number(p.m2_construccion) || Number(p.area_construida) || Number(p.area_total) || 0,
    address: { address: p.direccion || p.barrio || p.ciudad || "Bogota" },
    locations: {
      location_point: {
        latitude: p.latitud || 4.710988,
        longitude: p.longitud || -74.072092
      },
      view_map: (p.latitud && p.longitud) ? 0 : 2
    },
    listing_contact: _contact
  };
  if (SECRETS.FR_AGENT) payload.client_agent = SECRETS.FR_AGENT;
  else if (_ag && _ag.id) payload.client_agent = _ag.id;
  if (p.habitaciones > 0) { payload.rooms = p.habitaciones; payload.bedrooms = p.habitaciones; }
  if (p.banos > 0) payload.baths = p.banos;
  if (p.garajes > 0) payload.garages = p.garajes;
  if (p.piso > 0) payload.floor = p.piso;
  if (p.estrato > 0) payload.stratum = p.estrato;
  const _adm = Number(p.precio_admin || p.administracion || 0) || 0;
  if (_adm > 0) payload.administration = { is_included: false, price: _adm };
  else if (payload.offer === "rent") payload.administration = { is_included: true, price: 0 };
  const _priv = Number(p.area_privada) || 0;
  const _terr = Number(p.m2_terreno) || 0;
  if (_priv > 0) payload.living_area = _priv;
  else if (_terr > 0 && (payload.property_type === "lot" || payload.property_type === "house-lot" || payload.property_type === "farm" || payload.property_type === "country-house")) payload.living_area = _terr;
  // "age" SI existe y SI es escribible: espera el CODIGO del rango (0..5) del
  // OpenAPI, no el numero de anios. Por eso 13 o 2015 se descartaban en silencio.
  payload.age = ageFor(p);
  // "condition" se deja en 0 (Sin especificar) a proposito. Prueba del 28/08/2026:
  // se envio 4 (Remodelado) y el aviso quedo guardado con 5 (Deuda sin recurso),
  // o sea la API corre el valor. Hasta que Frank confirme la tabla real preferimos
  // no publicar un dato equivocado. conditionFor(p) queda listo para cuando se aclare.
  payload.condition = (opts && typeof opts.condition === "number") ? opts.condition : 0;
  payload.negotiable = !!(p.precio_negociable || p.negociable);
  const _pisosInt = interiorFloorsFor(p);
  if (_pisosInt > 0) payload.interior_floors = _pisosInt;
  if (p.codigo_postal) payload.postal_code = String(p.codigo_postal);
  if (photos.length > 0) payload.photos = photos;
  const _abs = function (u) { const s = String(u || "").trim(); if (!s) return ""; return /^https?:\/\//i.test(s) ? s : "https://" + s.replace(/^\/+/, ""); };
  if (_abs(p.video_url)) payload.video = _abs(p.video_url);
  if (_abs(p.tour_virtual_url)) payload.virtual_tour = _abs(p.tour_virtual_url);
  const _cats = mapCategorias(p);
  if (_cats.length > 0) payload.categories = _cats;
  return [payload];
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  // Ruta de estado: dice la verdad sobre Finca Raiz sin exponer ningun secreto.
  const _urlEstado = new URL(req.url);
  if (_urlEstado.pathname.split('/').filter(Boolean).includes('estado')) {
    const tieneUrl = !!SECRETS.FR_URL;
    const tieneLlave = !!SECRETS.FR_KEY;
    const tieneCliente = !!SECRETS.FR_CLIENT;
    let ambiente = 'sin configurar';
    if (tieneUrl) {
      const h = SECRETS.FR_URL.toLowerCase();
      if (h.indexOf('qa') >= 0 || h.indexOf('sandbox') >= 0 || h.indexOf('staging') >= 0) ambiente = 'pruebas';
      else if (h.indexOf('fincaraiz.com.co') >= 0) ambiente = 'produccion';
      else ambiente = 'desconocido';
    }
    let apiStatus = 0;
    let credencialesOk = false;
    if (tieneUrl && tieneLlave && tieneCliente) {
      try {
        const sonda = SECRETS.FR_URL + '/client?_ts=' + Date.now();
        const rp = await fetch(sonda, { method: 'GET', headers: frcolHeaders() });
        apiStatus = rp.status;
        credencialesOk = apiStatus >= 200 && apiStatus < 300;
      } catch (_e) {
        apiStatus = -1;
      }
    }
    const listo = credencialesOk && ambiente === 'produccion';
    let resumen = '';
    if (!tieneUrl || !tieneLlave || !tieneCliente) resumen = 'Faltan datos de Finca Raiz en el servidor.';
    else if (apiStatus === 401 || apiStatus === 403) resumen = 'Finca Raiz rechaza la llave (status ' + apiStatus + ').';
    else if (apiStatus === 404) resumen = 'La sonda GET /client no existe en este servidor de Finca Raiz (404); no se pudo verificar la llave.';
    else if (apiStatus === -1) resumen = 'No se pudo contactar el servidor de Finca Raiz.';
    else if (!credencialesOk) resumen = 'Finca Raiz no responde bien (status ' + apiStatus + ').';
    else if (ambiente === 'pruebas') resumen = 'Las credenciales sirven, pero apuntan al ambiente de pruebas de Finca Raiz, no al real.';
    else if (ambiente === 'produccion') resumen = 'Todo listo: credenciales validas en produccion.';
    else resumen = 'Las credenciales sirven, pero no se pudo identificar el ambiente.';
    return new Response(JSON.stringify({
      portal: 'fincaraiz',
      tiene_direccion: tieneUrl,
      tiene_llave: tieneLlave,
      tiene_cliente: tieneCliente,
      ambiente: ambiente,
      api_status: apiStatus,
      credenciales_ok: credencialesOk,
      listo_para_publicar: listo,
      resumen: resumen,
    }), { status: 200, headers: { ...CORS, 'Content-Type': 'application/json' } });
  }


  // ---- Helper: consulta GET /task/{id} con parametro anti-cache, sondeo acotado (~28s) ----
  async function pollTask(taskId) {
    const MAX_ATTEMPTS = 20;
    const DELAY_MS = 3000;
    let last = null;
    for (let i = 0; i < MAX_ATTEMPTS; i++) {
      const ts = Date.now() + "-" + Math.random().toString(36).slice(2);
      const url = SECRETS.FR_URL + "/task/" + encodeURIComponent(taskId) + "?_ts=" + ts;
      const r = await fetch(url, { method: "GET", headers: frcolHeaders() });
      last = await r.json().catch(() => ({}));
      const st = last?.task?.status;
      if (st === "COMPLETED" || st === "FORWARDED") return { done: true, ok: true, task: last.task };
      if (st === "ERROR") return { done: true, ok: false, task: last.task };
      // Deteccion temprana: la tarea global puede quedar en RUNNING por multimedia,
      // pero si el aviso ya quedo COMPLETED con listing_id la publicacion es valida.
      const _c0 = (last && last.task && Array.isArray(last.task.content)) ? last.task.content[0] : null;
      if (_c0 && _c0.status === "ERROR") return { done: true, ok: false, task: last.task };
      if (_c0 && _c0.status === "COMPLETED" && _c0.listing_id) return { done: true, ok: true, task: last.task };
      await new Promise((res) => setTimeout(res, DELAY_MS));
    }
    return { done: false, ok: false, task: last?.task || null };
  }

  // ---- Helper: extrae listing_id y/o error del resultado de la tarea ----
function readListingResult(task) {
  // El listing_id de Fincaraiz llega en task.content[0].listing_id (estructura real confirmada).
  // Se mantiene fallback a task.messages.listings[0] por compatibilidad.
  const c0 = Array.isArray(task?.content) ? task.content[0] : (task?.content ?? null);
  const l = (task?.messages?.listings && task.messages.listings[0]) ? task.messages.listings[0] : null;
  const listing_id = (c0 && c0.listing_id != null) ? c0.listing_id
                   : (l && l.listing_id != null) ? l.listing_id
                   : null;
  const external_code = (c0 && c0.external_code != null) ? c0.external_code : null;
  const _errTxt = (e) => {
      if (!e) return null;
      if (typeof e === "string") return e;
      const st0 = e.status || e;
      const d = st0.description || st0.detail || e.message || null;
      const cd = st0.default_code || st0.status_code || null;
      if (d && cd) return d + " (" + cd + ")";
      return d || (cd ? String(cd) : JSON.stringify(e).substring(0, 300));
    };
    const error = _errTxt(c0 && c0.error) || _errTxt(l && l.error) || null;
  return { listing_id, external_code, error };
}

  try {
    if (!SECRETS.FR_URL || !SECRETS.FR_KEY || !SECRETS.FR_CLIENT) {
      return new Response(
        JSON.stringify({ ok: false, status: "pendiente_credenciales", msg: "Faltan secrets FINCARAIZ_*" }),
        { status: 200, headers: { ...CORS, "Content-Type": "application/json" } }
      );
    }

    const body = await req.json();

  // --- Accion: consultar_task -> GET /task/{id} para verificar estado final (COMPLETED/ERROR) ---
  if (body && body.accion === "consultar_task") {
    const taskId = body.task_id;
    if (!taskId) {
      return new Response(JSON.stringify({ ok: false, status: "error", msg: "Falta task_id" }), { status: 400, headers: { ...CORS, "Content-Type": "application/json" } });
    }
    const ts = Date.now() + "" + Math.random().toString(36).slice(2);
    const url = SECRETS.FR_URL + "/task/" + encodeURIComponent(taskId) + "?_ts=" + ts;
    const r = await fetch(url, { method: "GET", headers: frcolHeaders() });
    const j = await r.json().catch(() => null);
    const st = j?.task?.status ?? null;
    return new Response(JSON.stringify({ ok: true, status: st, task: j?.task ?? j }), { status: 200, headers: { ...CORS, "Content-Type": "application/json" } });
  }

    // --- Accion dry_run: construye el payload y lo devuelve SIN llamar a Finca Raiz ---
    if (body && body.accion === "dry_run") {
      const _pp = body.propiedad || {};
      const _agDry = await getAgenteFR();
      const _out = buildListingPayload(_pp, { fmt: body.fmt, agente: _agDry || null });
      return new Response(JSON.stringify({ ok: true, fmt: body.fmt || "str", payload: _out }), { status: 200, headers: { ...CORS, "Content-Type": "application/json" } });
    }

    // --- Accion fr_validate: DESHABILITADA PERMANENTEMENTE ---
    // PELIGRO: POST /validate-listing NO es un validador en seco. Es un endpoint de
    // sincronizacion de inventario: DESACTIVA en el portal todo aviso que no venga en el
    // payload enviado. Enviar un solo inmueble desactiva TODOS los demas. No reactivar.
    if (body && body.accion === "fr_validate") {
      return new Response(JSON.stringify({ ok: false, msg: "Accion deshabilitada por seguridad: /validate-listing desactiva todo el inventario que no venga en el payload." }), { status: 400, headers: { ...CORS, "Content-Type": "application/json" } });
    }

    // --- Accion fr_get: diagnostico de SOLO LECTURA contra la API de Finca Raiz ---
    if (body && body.accion === "fr_get") {
      const p = String(body.path || "").replace(/^\/+/, "");
      if (!/^[A-Za-z0-9._\/-]{1,120}$/.test(p)) {
        return new Response(JSON.stringify({ ok: false, msg: "path invalido" }), { status: 400, headers: { ...CORS, "Content-Type": "application/json" } });
      }
      const q = String(body.q || "");
      const qOk = /^[A-Za-z0-9_=&.,%\-]{0,200}$/.test(q);
      const _hG = frcolHeaders();
      // Algunos endpoints de listado exigen ademas el identificador del cliente
      // en la cabecera Cookie (ver parametro "Cookie" en el OpenAPI).
      if (body.with_client && SECRETS.FR_CLIENT) _hG["Cookie"] = "client_id=" + SECRETS.FR_CLIENT;
      const rG = await fetch(SECRETS.FR_URL + "/" + p + "?_ts=" + Date.now() + (qOk && q ? "&" + q : ""), { method: "GET", headers: _hG });
      const tG = await rG.text();
      return new Response(JSON.stringify({ ok: rG.ok, http_status: rG.status, body: tG.substring(0, 30000) }), { status: 200, headers: { ...CORS, "Content-Type": "application/json" } });
    }



    // --- Accion subscribe_webhook: POST /webhook/{id}/subscribe (registra el target en Fincaraiz) ---
    if (body && body.accion === "subscribe_webhook") {
      const webhookId = body.webhook_id || "438258b8-debf-424e-8d02-55350f3c0691";
      const receiverBase = body.target_base || "https://lniouebpuuuqctrgxoiw.supabase.co/functions/v1/fincaraiz-webhook";
      const k = SECRETS.WEBHOOK_SECRET;
      if (!k) {
        return new Response(JSON.stringify({ ok: false, status: "error", msg: "Falta WEBHOOK_SHARED_SECRET en secrets" }), { status: 400, headers: { ...CORS, "Content-Type": "application/json" } });
      }
      const target = receiverBase + "?k=" + encodeURIComponent(k);
      const subUrl = SECRETS.FR_URL + "/webhook/" + encodeURIComponent(webhookId) + "/subscribe";
      const subBody = { target };
      if (SECRETS.FR_CLIENT) subBody.client_id = SECRETS.FR_CLIENT;
      const rSub = await fetch(subUrl, { method: "POST", headers: frcolHeaders(), body: JSON.stringify(subBody) });
      const jSub = await rSub.json().catch(() => null);
      return new Response(JSON.stringify({ ok: rSub.ok, http_status: rSub.status, response: jSub }), { status: 200, headers: { ...CORS, "Content-Type": "application/json" } });
    }


    // ===== Acciones: activar / cambiar_estado (PATCH /listing/status) =====
    if (body && (body.accion === "activar" || body.accion === "cambiar_estado")) {
      const propId = body.propiedad_id || body.id;
      if (!propId) {
        return new Response(
          JSON.stringify({ ok: false, status: "error", msg: "Falta propiedad_id" }),
          { status: 400, headers: { ...CORS, "Content-Type": "application/json" } }
        );
      }
      // El listing_id valido es el que devuelve la tarea del MISMO ambiente.
      // Se resuelve primero desde task_id para no reutilizar un listing_id
      // guardado de otro ambiente (QA vs produccion).
      let _lid = null;
      if (body.task_id) {
        try {
          const _rt = await fetch(SECRETS.FR_URL + "/task/" + encodeURIComponent(body.task_id) + "?_ts=" + Date.now(), { method: "GET", headers: frcolHeaders() });
          const _jt = await _rt.json().catch(() => ({}));
          _lid = readListingResult(_jt?.task || _jt).listing_id || null;
        } catch (_e) { /* noop */ }
      }
      if (!_lid) _lid = body.listing_id || null;
      if (!_lid) {
        return new Response(
          JSON.stringify({ ok: false, status: "error", msg: "Falta listing_id. Envia listing_id o task_id de la publicacion." }),
          { status: 400, headers: { ...CORS, "Content-Type": "application/json" } }
        );
      }
      // Estado del aviso en Finca Raiz. "activar" siempre pone ACTIVE;
      // "cambiar_estado" acepta INACTIVE (pausar) o DELETED (retirar).
      const _EST_OK = ["ACTIVE", "INACTIVE", "DELETED", "SOLD", "RENTED"];
      let _st = String(body.estado || body.status || "ACTIVE").toUpperCase();
      if (body.accion === "activar") _st = "ACTIVE";
      if (_EST_OK.indexOf(_st) === -1) _st = "ACTIVE";
      const patchPayload = { listing_id: _lid, client_id: SECRETS.FR_CLIENT, status: _st };
      const rPatch = await fetch(SECRETS.FR_URL + "/listing/status", {
        method: "PATCH", headers: frcolHeaders(), body: JSON.stringify([patchPayload])
      });
      const jPatch = await rPatch.json().catch(() => ({}));
      if (!rPatch.ok || !jPatch?.task?.id) {
        return new Response(
          JSON.stringify({ ok: false, status: "error_activar", msg: jPatch?.message || "Sin task id", detail: JSON.stringify(jPatch).substring(0, 500) }),
          { status: 200, headers: { ...CORS, "Content-Type": "application/json" } }
        );
      }
      const pr = await pollTask(jPatch.task.id);
      if (pr.done && pr.ok) {
        return new Response(
          JSON.stringify({ ok: true, status: "activado", estado: _st, task_id: jPatch.task.id, fincaraiz: pr.task }),
          { status: 200, headers: { ...CORS, "Content-Type": "application/json" } }
        );
      }
      if (pr.done && !pr.ok) {
        const res = readListingResult(pr.task);
        return new Response(
          JSON.stringify({ ok: false, status: "error", task_id: jPatch.task.id, msg: (/no_quota|No quota/i.test(String(res.error || "")) ? "Finca Raiz rechazo la operacion: la cuenta no tiene cupos de inmuebles disponibles (No quota). Libera o compra un cupo en la Oficina Virtual y vuelve a intentar." : (res.error || "La activacion finalizo con error")) }),
          { status: 200, headers: { ...CORS, "Content-Type": "application/json" } }
        );
      }
      return new Response(
        JSON.stringify({ ok: false, status: "en_proceso", task_id: jPatch.task.id, listing_id: _lid, msg: "La activacion sigue en proceso; consulta el task_id mas tarde." }),
        { status: 200, headers: { ...CORS, "Content-Type": "application/json" } }
      );
    }

        // ===== Accion actualizar: completa un aviso YA creado (PATCH /listing) =====
    // No consume cupo: reescribe el aviso existente con el payload completo
    // (fotos + caracteristicas + antiguedad + condicion). Requiere listing_id.
    if (body && (body.accion === "actualizar" || body.accion === "completar")) {
      const _pu = body.propiedad || {};
      const _lidU = body.listing_id || null;
      if (!_pu.id || !_lidU) {
        return new Response(
          JSON.stringify({ ok: false, status: "error", msg: "Falta propiedad.id o listing_id" }),
          { status: 400, headers: { ...CORS, "Content-Type": "application/json" } }
        );
      }
      const _agU = await getAgenteFR();
      const _payU = buildListingPayload(_pu, { fmt: body.fmt, agente: _agU || null, condition: (typeof body.condition === "number" ? body.condition : undefined) });
      _payU[0].listing_id = _lidU;
      // Si las fotos ya estan cargadas en Finca Raiz, reenviar las mismas URLs
      // hace que la tarea de multimedia termine en ERROR. Con omitir_fotos:true
      // se actualiza solo la ficha y se deja la galeria como esta.
      if (body.omitir_fotos === true) delete _payU[0].photos;
      const rU = await fetch(SECRETS.FR_URL + "/listing", {
        method: "PATCH", headers: frcolHeaders(), body: JSON.stringify(_payU)
      });
      const jU = await rU.json().catch(() => ({}));
      if (!rU.ok || !(jU && jU.task && jU.task.id)) {
        return new Response(
          JSON.stringify({ ok: false, status: "error_api", http_status: rU.status, detail: JSON.stringify(jU).substring(0, 800) }),
          { status: 200, headers: { ...CORS, "Content-Type": "application/json" } }
        );
      }
      const prU = await pollTask(jU.task.id);
      const resU = readListingResult(prU.task);
      return new Response(
        JSON.stringify({ ok: !!(prU.done && prU.ok), status: prU.done ? (prU.ok ? "actualizado" : "error") : "en_proceso", task_id: jU.task.id, listing_id: resU.listing_id || _lidU, msg: resU.error || "", fincaraiz: prU.task }),
        { status: 200, headers: { ...CORS, "Content-Type": "application/json" } }
      );
    }

    // ===== Accion default: crear/actualizar aviso (POST /listing) =====
    const { propiedad } = body;
    if (!propiedad?.id) {
      return new Response(
        JSON.stringify({ ok: false, status: "error", msg: "Falta propiedad.id" }),
        { status: 400, headers: { ...CORS, "Content-Type": "application/json" } }
      );
    }

    const _agFR = await getAgenteFR();
    const payload = buildListingPayload(propiedad, { fmt: body.fmt, agente: _agFR || null });
    const rPost = await fetch(SECRETS.FR_URL + "/listing", {
      method: "POST", headers: frcolHeaders(), body: JSON.stringify(payload)
    });
    const jPost = await rPost.json().catch(() => ({}));

    if (!rPost.ok || !jPost?.task?.id) {
      return new Response(
        JSON.stringify({ ok: false, status: "error_api", msg: (rPost.status === 401 || rPost.status === 403)
          ? ("Finca Raiz rechazo las credenciales (" + rPost.status + "). Revisa FINCARAIZ_API_URL/KEY.")
          : (jPost?.message || ("Finca Raiz respondio " + rPost.status + " sin task id")), detail: JSON.stringify(jPost).substring(0, 500) }),
        { status: 200, headers: { ...CORS, "Content-Type": "application/json" } }
      );
    }

    const pr = await pollTask(jPost.task.id);

    if (pr.done && pr.ok) {
      const res = readListingResult(pr.task);
      return new Response(
        JSON.stringify({ ok: true, status: "publicado", task_id: jPost.task.id, listing_id: res.listing_id, fincaraiz: pr.task }),
        { status: 200, headers: { ...CORS, "Content-Type": "application/json" } }
      );
    }
    if (pr.done && !pr.ok) {
      const res = readListingResult(pr.task);
      return new Response(
        JSON.stringify({ ok: false, status: "error", task_id: jPost.task.id, msg: (/no_quota|No quota/i.test(String(res.error || "")) ? "Finca Raiz rechazo la operacion: la cuenta no tiene cupos de inmuebles disponibles (No quota). Libera o compra un cupo en la Oficina Virtual y vuelve a intentar." : (res.error || "La integracion finalizo con error")) }),
        { status: 200, headers: { ...CORS, "Content-Type": "application/json" } }
      );
    }
    return new Response(
      JSON.stringify({ ok: false, status: "en_proceso", task_id: jPost.task.id, listing_id: (function(){ try { return readListingResult((pr && pr.task) || {}).listing_id || null; } catch (_e) { return null; } })(), msg: "La integracion sigue en proceso; consulta el task_id mas tarde." }),
      { status: 200, headers: { ...CORS, "Content-Type": "application/json" } }
    );

  } catch (e) {
    return new Response(
      JSON.stringify({ ok: false, status: "error_servidor", msg: String(e) }),
      { status: 200, headers: { ...CORS, "Content-Type": "application/json" } }
    );
  }
});
