// Edge Function: metrocuadrado-integracion
// Integra Lomaz Home con la API de Metrocuadrado: autenticacion, publicar, actualizar, despublicar, consultar y catalogos.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const XAPIKEY_DEV = Deno.env.get("METRO_XAPIKEY_DEV") ?? "";
const XAPIKEY_PROD = Deno.env.get("METRO_XAPIKEY_PROD") ?? "";

const URLS = {
  dev: {
    token: "https://ptec-core-dev-third-party-apis.metrocuadrado.com/v1/api/core/oauth2/tokens",
    base: "https://ptec-core-dev.metrocuadrado.com",
  },
  prod: {
    token: "https://third-party-apis.metrocuadrado.com/v1/api/core/oauth2/tokens",
    base: "https://www.metrocuadrado.com",
  },
};

const REALESTATE_TYPE: Record<string, number> = {
  apartamento: 1,
  casa: 2,
  oficina: 3,
  casa_lote: 4,
  consultorio: 5,
  local: 6,
  finca: 7,
  bodega: 8,
  edificio_apartamentos: 9,
  edificio_oficinas: 10,
  apartaestudio: 14,
  lote: 15,
};

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-user-token",
    "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, OPTIONS",
  };
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
      status,
      headers: { "Content-Type": "application/json", ...corsHeaders() },
    });
}

function xApiKey(ambiente: string) {
  return ambiente === "prod" ? XAPIKEY_PROD : XAPIKEY_DEV;
}

function baseUrls(ambiente: string) {
  return ambiente === "prod" ? URLS.prod : URLS.dev;
}

async function getConfig(admin: any) {
  const { data, error } = await admin
  .from("configuracion_portales")
  .select("*")
  .eq("portal", "metrocuadrado")
  .single();
  if (error || !data) throw new Error("No hay credenciales configuradas para Metrocuadrado. Ve a Ajustes > Portales.");
  if (!data.activo) throw new Error("La integracion con Metrocuadrado esta desactivada.");
  const _envU = Deno.env.get("METRO_USERNAME") ?? "";
  const _envP = Deno.env.get("METRO_PASSWORD") ?? "";
  const _envI = Deno.env.get("METRO_IDENTIFICATION") ?? "";
  if (_envU) data.username = _envU;
  if (_envP) data.password = _envP;
  if (_envI) data.identification = _envI;
  if (!data.username || !data.password || !data.identification) {
    throw new Error("Faltan credenciales de Metrocuadrado (usuario, password o identificacion/NIT).");
  }
  return data;
}

async function getToken(admin: any, ambiente: string, cfg: any): Promise<string> {
  const { data: cached } = await admin
  .from("metro_tokens")
  .select("*")
  .eq("ambiente", ambiente)
  .single();
  if (cached && new Date(cached.expires_at).getTime() > Date.now() + 60000) {
    return cached.token;
  }
  const urls = baseUrls(ambiente);
  const resp = await fetch(urls.token, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": xApiKey(ambiente) },
      body: JSON.stringify({ username: cfg.username, password: cfg.password, identification: cfg.identification }),
    });
  const text = await resp.text();
  let parsed: any = {};
  try { parsed = JSON.parse(text); } catch (_e) { /* noop */ }
  if (resp.status !== 200) {
    throw new Error("No se pudo generar el token de Metrocuadrado (status " + resp.status + "): " + text);
  }
  const token = parsed.token || parsed.jwt || parsed.access_token || (parsed.data && (parsed.data.id_token || parsed.data.token || parsed.data.access_token));
  if (!token) throw new Error("Respuesta de token inesperada: " + text);
  const expiresAt = new Date(Date.now() + 55 * 60 * 1000).toISOString();
  await admin.from("metro_tokens").upsert({ ambiente, token, expires_at: expiresAt }, { onConflict: "ambiente" });
  return token;
}

function buildPayload(p: any, responseUrl: string) {
  if (!p.metro_city_id || !p.metro_zone_id || !p.metro_sector_id) {
    throw new Error("A esta propiedad le falta el mapeo de ciudad/zona/sector de Metrocuadrado. Completalo antes de publicar.");
  }
  const realEstateType = p.metro_realestate_type || REALESTATE_TYPE[p.tipo_propiedad] || 1;
  const realEstateOffer = p.metro_business_type || (p.tipo_operacion === "arriendo" ? 2 : 1);
  return {
    realEstateType,
    realEstateOffer,
    price: String(Math.round(Number(p.precio) || 0)),
    administration: String(Math.round(Number(p.precio_admin) || 0)),
    city: String(p.metro_city_id),
    neighborhood: p.barrio || "",
    stratum: p.metro_stratum || p.estrato || 3,
    zone: Number(p.metro_zone_id),
    sector: Number(p.metro_sector_id),
    reference1: String(p.id),
    address: p.direccion || "",
    latitude: p.latitud != null ? String(p.latitud) : undefined,
    longitude: p.longitud != null ? String(p.longitud) : undefined,
    amenities: {
      rooms: String(p.habitaciones ?? 0),
      bathrooms: String(p.banos ?? 0),
      garages: String(p.garajes ?? p.parqueaderos ?? 0),
      builtArea: String(p.m2_construccion ?? p.area_construida ?? 0),
      area: String(p.m2_terreno ?? p.area_total ?? p.area_construida ?? 0),
      negotiable: p.precio_negociable ? "true" : "false",
    },
    images: Array.isArray(p.fotos) && p.fotos.length ? p.fotos.slice(0, 30) : (Array.isArray(p.imagenes) ? p.imagenes.slice(0, 30) : []),
    video: p.video_url || undefined,
    comments: p.descripcion || "",
    responseUrl,
  };
}

Deno.serve(async (req) => {
    if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders() });

    const url = new URL(req.url);
    const parts = url.pathname.split("/").filter(Boolean);
    const action = parts[parts.length - 1];

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

    if (action === "callback") {
      try {
        let payload: any = {};
        if (["POST", "PATCH", "PUT"].includes(req.method)) {
          payload = await req.json().catch(() => ({}));
        } else {
          payload = Object.fromEntries(url.searchParams.entries());
        }
        await admin.from("metro_callbacks").insert({
            transaction_id: payload.transactionId || payload.transaction_id || null,
            payload,
          });
      } catch (_e) { /* noop */ }
      return new Response("OK", { status: 200, headers: { "Content-Type": "text/plain", ...corsHeaders() } });
    }

    const rawAuth = req.headers.get("Authorization") || "";
    const xUserTokenRaw = req.headers.get("x-user-token") || "";
    let userToken = "";
    if (xUserTokenRaw) { try { userToken = atob(xUserTokenRaw); } catch (_e) { userToken = xUserTokenRaw; } }
    else { userToken = rawAuth.replace(/^Bearer\s+/i, ""); }
    userToken = userToken.trim();
    const authHeader = userToken ? ("Bearer " + userToken) : rawAuth;
    const userClient = createClient(SUPABASE_URL, ANON_KEY, { global: { headers: { Authorization: authHeader } } });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    const isCatalogRoute = parts.includes("catalog");
    if ((userErr || !userData?.user) && !isCatalogRoute) {
      return json({ error: "No autenticado" }, 401);
    }
    let uid = (userData && userData.user) ? userData.user.id : null;

    // Ruta de estado: revisa de verdad si Metrocuadrado esta listo (no devuelve secretos).
    if (parts.includes('estado')) {
      const { data: cfgE } = await admin.from('configuracion_portales').select('*').eq('portal', 'metrocuadrado').maybeSingle();
      if (!cfgE) {
        return json({ portal: 'metrocuadrado', configurado: false, listo_para_publicar: false, mensaje: 'Aun no hay credenciales guardadas para Metrocuadrado.' }, 200);
      }
      const ambEst = (url.searchParams.get('ambiente') || cfgE.ambiente || 'dev').toLowerCase();
      if (!cfgE.username || !cfgE.password || !cfgE.identification) {
        return json({ portal: 'metrocuadrado', configurado: true, activo: !!cfgE.activo, ambiente: ambEst, credenciales_origen: (Deno.env.get("METRO_PASSWORD") ? "secrets" : "tabla"), listo_para_publicar: false, mensaje: 'Faltan datos: usuario, contrasena o identificacion/NIT.' }, 200);
      }
      const urlsE = baseUrls(ambEst);
      const hdrsE: Record<string, string> = { 'Content-Type': 'application/json', 'x-api-key': xApiKey(ambEst) }; try { const _tkE = await getToken(admin, ambEst, cfgE); if (_tkE) hdrsE['token'] = _tkE; } catch (_e) { /* sin token */ }
      let catStatus = 0;
      let catOk = false;
      try {
        const rc = await fetch(urlsE.base + '/rest-catalogue/businesstypes/', { headers: hdrsE });
        catStatus = rc.status;
        const tc = await rc.text().catch(() => '');
        catOk = rc.ok && tc.trim().charAt(0) === '[';
      } catch (_e) {
        catStatus = -1;
      }
      let credStatus = 0;
      let credOk = false;
      let mensajeMc = '';
      try {
        const rt = await fetch(urlsE.token, { method: 'POST', headers: hdrsE, body: JSON.stringify({ username: cfgE.username, password: cfgE.password, identification: cfgE.identification }) });
        credStatus = rt.status;
        const tt = await rt.text().catch(() => '');
        let pt: any = null;
        try { pt = JSON.parse(tt); } catch (_e) { pt = null; }
        const tk = pt ? (pt.token || pt.jwt || pt.access_token || (pt.data && (pt.data.id_token || pt.data.token || pt.data.access_token))) : null;
        credOk = !!tk;
        let crudo = '';
        if (pt && pt.data && pt.data.message) crudo = String(pt.data.message);
        else if (pt && pt.message) crudo = String(pt.message);
        else crudo = tt.slice(0, 200);
        mensajeMc = String(crudo).split(String(cfgE.password)).join('***');
      } catch (_e) {
        credStatus = -1;
        mensajeMc = 'No se pudo contactar el servidor de Metrocuadrado.';
      }
      const listo = !!cfgE.activo && catOk && credOk;
      let resumen = '';
      if (listo) resumen = 'Todo listo: llave y credenciales validas en ' + ambEst + '.';
      else if (!cfgE.activo) resumen = 'La integracion esta desactivada (marca Activo y guarda).';
      else if (!catOk) resumen = 'La API de Metrocuadrado no responde bien a los catalogos (status ' + catStatus + ').';
      else if (!credOk) resumen = 'Metrocuadrado rechaza el usuario en ' + ambEst + ': ' + mensajeMc;
      return json({ portal: 'metrocuadrado', configurado: true, activo: !!cfgE.activo, ambiente: ambEst, credenciales_origen: (Deno.env.get("METRO_PASSWORD") ? "secrets" : "tabla"), catalogos_ok: catOk, catalogos_status: catStatus, credenciales_ok: credOk, credenciales_status: credStatus, mensaje_metrocuadrado: mensajeMc, listo_para_publicar: listo, resumen: resumen }, 200);
    }

    try {
      const cfg = await getConfig(admin);
      const ambiente = (cfg.ambiente || "dev").toLowerCase();
      const responseUrl = SUPABASE_URL + "/functions/v1/metrocuadrado-integracion/callback";

      if (parts.includes("catalog")) {
        const idx = parts.indexOf("catalog");
        const _b = await req.json().catch(() => ({})); let tipo = parts[idx + 1] || url.searchParams.get("tipo") || (_b && _b.tipo) || ""; tipo = ({reg:"regions",cit:"cities",zon:"zones",sec:"sectors",ret:"realestatetypes",bus:"businesstypes",ame:"amenities"})[tipo] || tipo;
        const urls = baseUrls(ambiente);
        const map: Record<string, string> = {
          regions: "/rest-catalogue/regions/",
          cities: "/rest-catalogue/cities/",
          zones: "/rest-catalogue/zones/",
          sectors: "/rest-catalogue/sectors/",
          realestatetypes: "/rest-catalogue/realestatetypes/",
          businesstypes: "/rest-catalogue/businesstypes/",
          amenities: "/rest-catalogue/amenities/",
        };
        const path = map[tipo];
        if (!path) return json({ error: "Catalogo desconocido: " + tipo }, 400);
        const ambCat = (url.searchParams.get("ambiente") || ambiente).toLowerCase(); const urlsCat = baseUrls(ambCat); const _sp = new URLSearchParams(url.search); _sp.delete("ambiente"); try { if (_b && typeof _b === "object") { for (const _k of Object.keys(_b)) { if (_k === "tipo" || _k === "ambiente") continue; const _v = (_b as any)[_k]; if (_v !== null && _v !== undefined && String(_v) !== "") _sp.set(_k, String(_v)); } } } catch (_eb) { /* sin params */ } const qs = _sp.toString() ? "?" + _sp.toString() : ""; const hdrs: Record<string,string> = { "Content-Type": "application/json", "x-api-key": xApiKey(ambCat) }; try { const _tk = await getToken(admin, ambCat, cfg); if (_tk) hdrs["token"] = _tk; } catch (_e) { /* sin token: se intenta igual */ } const u1 = urlsCat.base + path + qs; const u2 = urlsCat.base + "/rest-api" + path + qs; const diag: any[] = []; let resp = await fetch(u1, { headers: hdrs }); diag.push({ intento: 1, ambiente: ambCat, url: u1, status: resp.status }); if (!resp.ok) { resp = await fetch(u2, { headers: hdrs }); diag.push({ intento: 2, ambiente: ambCat, url: u2, status: resp.status }); }
        if (!resp.ok && ambCat !== "prod") {
          const _pu = URLS.prod.base + path + qs;
          const _ph: Record<string, string> = { "Content-Type": "application/json", "x-api-key": xApiKey("prod") };
          try {
            const _pr = await fetch(_pu, { headers: _ph });
            diag.push({ intento: 3, ambiente: "prod (respaldo de catalogo)", url: _pu, status: _pr.status });
            if (_pr.ok) resp = _pr;
          } catch (_e3) { diag.push({ intento: 3, ambiente: "prod (respaldo de catalogo)", error: String(_e3).slice(0, 120) }); }
        }
        const _raw = await resp.text().catch(() => ""); let data: any = null; try { data = JSON.parse(_raw); } catch (_e) { data = null; }
        if (!resp.ok || data === null) return json({ diagnostico: "catalogo Metrocuadrado", intentos: diag, status_final: resp.status, content_type: resp.headers.get("content-type"), largo: _raw.length, muestra: _raw.slice(0, 600) }, resp.ok ? 200 : resp.status);
        return json(data, resp.status);
      }

      if (action === "publish" && req.method === "POST") {
        const body = await req.json();
        if (body && body.ticket) {
          const svcTicket = createClient(SUPABASE_URL, SERVICE_ROLE);
          const cutoff = new Date(Date.now() - 30 * 60 * 1000).toISOString();
          const { data: tk } = await svcTicket.from("metro_publish_tickets").select("*").eq("ticket", body.ticket).eq("used", false).gte("created_at", cutoff).maybeSingle();
          if (tk && String(tk.property_id) === String(body.propertyId)) {
            await svcTicket.from("metro_publish_tickets").update({ used: true }).eq("ticket", body.ticket);
            uid = tk.user_id;
          }
        }
        if (!uid) { return json({ error: "No autenticado" }, 401); }
        const { data: prop, error } = await admin.from("propiedades").select("*").eq("id", body.propertyId).single();
        if (error || !prop) return json({ error: "Propiedad no encontrada" }, 404);
        if (prop.asesor_id !== uid) {
          const { data: perfil } = await admin.from("perfiles_usuarios").select("roles(nombre)").eq("user_id", uid).single();
          if ((perfil?.roles?.nombre) !== "admin") return json({ error: "No tienes permiso sobre esta propiedad" }, 403);
        }
        const token = await getToken(admin, ambiente, cfg);
        const payload = buildPayload(prop, responseUrl);
        const urls = baseUrls(ambiente);
        const resp = await fetch(urls.base + "/rest-api/realestate/publish", {
            method: "POST",
            headers: { "Content-Type": "application/json", "x-api-key": xApiKey(ambiente), token },
            body: JSON.stringify(payload),
          });
        const respBody = await resp.text();
        let parsed: any = {};
        try { parsed = JSON.parse(respBody); } catch (_e) { /* noop */ }
        if (resp.status === 201) {
          await admin.from("propiedades").update({
              metro_transaction_id: parsed.transactionId || parsed.transaction_id || null,
              metro_realestate_id: parsed.realEstateId || parsed.realEstateid || prop.metro_realestate_id || null,
              metro_status: "publicado",
              metro_last_published_at: new Date().toISOString(),
            }).eq("id", prop.id);
        }
        return json({ status: resp.status, respuesta: Object.keys(parsed).length ? parsed : respBody }, resp.status);
      }

      if (action === "update" && (req.method === "PUT" || req.method === "POST")) {
        const body = await req.json();
        const { data: prop, error } = await admin.from("propiedades").select("*").eq("id", body.propertyId).single();
        if (error || !prop) return json({ error: "Propiedad no encontrada" }, 404);
        const token = await getToken(admin, ambiente, cfg);
        const payload: any = buildPayload(prop, responseUrl);
        if (prop.metro_realestate_id) payload.realEstateId = prop.metro_realestate_id;
        const urls = baseUrls(ambiente);
        const resp = await fetch(urls.base + "/rest-api/realestate/update", {
            method: "PUT",
            headers: { "Content-Type": "application/json", "x-api-key": xApiKey(ambiente), token },
            body: JSON.stringify(payload),
          });
        const respBody = await resp.text();
        let parsed: any = {};
        try { parsed = JSON.parse(respBody); } catch (_e) { /* noop */ }
        return json({ status: resp.status, respuesta: Object.keys(parsed).length ? parsed : respBody }, resp.status);
      }

      if (action === "unpublish" && (req.method === "PATCH" || req.method === "POST")) {
        const body = await req.json();
        const { data: prop, error } = await admin.from("propiedades").select("*").eq("id", body.propertyId).single();
        if (error || !prop) return json({ error: "Propiedad no encontrada" }, 404);
        if (!prop.metro_realestate_id) return json({ error: "Esta propiedad no tiene un realEstateId de Metrocuadrado registrado" }, 400);
        const token = await getToken(admin, ambiente, cfg);
        const urls = baseUrls(ambiente);
        const resp = await fetch(urls.base + "/rest-api/realestate/unpublish", {
            method: "PATCH",
            headers: { "Content-Type": "application/json", "x-api-key": xApiKey(ambiente), token },
            body: JSON.stringify({ realEstateId: prop.metro_realestate_id, responseUrl }),
          });
        const respBody = await resp.text();
        if (resp.status === 200) {
          await admin.from("propiedades").update({ metro_status: "despublicado" }).eq("id", prop.id);
        }
        return json({ status: resp.status, respuesta: respBody }, resp.status);
      }

      if (parts.includes("status")) {
        const idx = parts.indexOf("status");
        const transactionId = parts[idx + 1];
        const token = await getToken(admin, ambiente, cfg);
        const urls = baseUrls(ambiente);
        const resp = await fetch(urls.base + "/rest-api/transactions/" + transactionId, {
            headers: { "x-api-key": xApiKey(ambiente), token },
          });
        const data = await resp.json().catch(() => null);
        return json(data, resp.status);
      }

      return json({ error: "Ruta no encontrada: " + url.pathname }, 404);
    } catch (e) {
      return json({ error: (e as Error).message }, 500);
    }
  });

