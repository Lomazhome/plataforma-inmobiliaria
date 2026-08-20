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

function buildListingPayload(p) {
  const photos = [];
  let urls = [];
  if (Array.isArray(p.fotos)) urls = p.fotos;
  else if (typeof p.fotos === "string" && p.fotos) urls = p.fotos.split(",").map((u) => u.trim());
  else if (typeof p.fotos_url === "string" && p.fotos_url) urls = p.fotos_url.split(",").map((u) => u.trim());
  urls = urls.filter((u) => u && u.startsWith("http")).slice(0, 30);
  urls.forEach((u, i) => photos.push({ sort_order: i + 1, is_main: i === 0, image: u }));

  const payload = {
    external_code: String(p.id),
    client_id: SECRETS.FR_CLIENT,
    offer: offerFor(p.tipo_operacion),
    property_type: propertyTypeFor(p.tipo_propiedad),
    description: p.descripcion || p.titulo || "Inmueble LoMaz Home",
    price: Number(p.precio) || 0,
    currency: currencyId(p),
    area: Number(p.m2_construccion) || Number(p.area_construida) || Number(p.area_total) || 0,
    address: { address: p.direccion || p.barrio || p.ciudad || "Bogota" },
    locations: {
      location_point: {
        latitude: p.latitud || 4.710988,
        longitude: p.longitud || -74.072092,
      },
      view_map: (p.latitud && p.longitud) ? 0 : 2,
    },
    listing_contact: { emails: [{ email: p.contacto_email || "contacto@lomazhome.com" }], phones: [] },
  };
  if (SECRETS.FR_AGENT) payload.client_agent = SECRETS.FR_AGENT;
  if (p.habitaciones > 0) payload.rooms = p.habitaciones;
  if (p.banos > 0) payload.baths = p.banos;
  if (p.garajes > 0) payload.garages = p.garajes;
  if (p.piso > 0) payload.floor = p.piso;
  if (p.estrato > 0) payload.stratum = p.estrato;
  if (photos.length > 0) payload.photos = photos;
  if (p.video_url) payload.video = p.video_url;
  if (p.tour_virtual_url) payload.virtual_tour = p.tour_virtual_url;
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

    // ===== Accion default: crear/actualizar aviso (POST /listing) =====
    const { propiedad } = body;
    if (!propiedad?.id) {
      return new Response(
        JSON.stringify({ ok: false, status: "error", msg: "Falta propiedad.id" }),
        { status: 400, headers: { ...CORS, "Content-Type": "application/json" } }
      );
    }

    const payload = buildListingPayload(propiedad);
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
