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

// ---------------------------------------------------------------------------
// Token de Metrocuadrado (login) con "memoria" de rechazos.
//
// Metrocuadrado usa un login que se bloquea temporalmente tras varios intentos
// fallidos seguidos (y el contador solo se limpia con un login exitoso o con
// 15 minutos sin intentos). Por eso:
//   - cada verificacion hace UN solo intento de login;
//   - si Metrocuadrado rechaza la contrasena, se recuerda ese rechazo (en la
//     misma tabla metro_tokens) y no se vuelve a intentar con esas mismas
//     credenciales durante RECHAZO_MINUTOS, salvo que se guarde una contrasena
//     distinta o se pulse "Probar" (forzar);
//   - si Metrocuadrado avisa que la cuenta esta bloqueada, no se intenta con
//     ninguna credencial durante BLOQUEO_MINUTOS.
// En metro_tokens, un token real se guarda tal cual; un rechazo se guarda como
// "ERR|<huella>|<tipo>|<mensaje>" (la huella es un hash, nunca la contrasena).
// ---------------------------------------------------------------------------
const RECHAZO_MINUTOS = 15;
const BLOQUEO_MINUTOS = 5;

class MetroAuthError extends Error {
  kind: "rejected" | "locked" | "network";
  status: number;
  cached: boolean;
  hasta: string | null;
  constructor(message: string, kind: "rejected" | "locked" | "network", status: number, cached: boolean, hasta: string | null) {
    super(message);
    this.kind = kind;
    this.status = status;
    this.cached = cached;
    this.hasta = hasta;
  }
}

function horaColombia(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(new Date(iso).getTime() - 5 * 60 * 60 * 1000); // Colombia = UTC-5, sin horario de verano
  const hh = String(d.getUTCHours()).padStart(2, "0");
  const mm = String(d.getUTCMinutes()).padStart(2, "0");
  return hh + ":" + mm;
}

async function huellaCredenciales(cfg: any): Promise<string> {
  const data = new TextEncoder().encode(String(cfg.username) + "|" + String(cfg.password) + "|" + String(cfg.identification));
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash)).slice(0, 8).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function jwtPayload(token: string): any {
  try {
    const p = token.split(".")[1];
    if (!p) return null;
    const b64 = p.replace(/-/g, "+").replace(/_/g, "/").padEnd(p.length + ((4 - (p.length % 4)) % 4), "=");
    return JSON.parse(atob(b64));
  } catch (_e) {
    return null;
  }
}

function tokenEsDelUsuario(token: string, username: string): boolean {
  const pl = jwtPayload(token);
  if (!pl) return true; // no se puede saber: se acepta
  const claim = pl.email || pl["cognito:username"] || pl.username || "";
  if (!claim) return true;
  return String(claim).trim().toLowerCase() === String(username).trim().toLowerCase();
}

function parseRechazo(token: string): { huella: string; kind: "rejected" | "locked"; message: string } | null {
  if (!token || !token.startsWith("ERR|")) return null;
  const partes = token.split("|");
  const kind = partes[2] === "locked" ? "locked" : "rejected";
  return { huella: partes[1] || "", kind, message: partes.slice(3).join("|") };
}

type TokenResult = { token: string | null; status: number; message: string };

// Un unico intento de login contra Metrocuadrado. Nunca devuelve la contrasena en el mensaje.
async function pedirToken(ambiente: string, cfg: any): Promise<TokenResult> {
  const urls = baseUrls(ambiente);
  let resp: Response;
  try {
    resp = await fetch(urls.token, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": xApiKey(ambiente) },
      body: JSON.stringify({ username: cfg.username, password: cfg.password, identification: cfg.identification }),
    });
  } catch (_e) {
    return { token: null, status: -1, message: "No se pudo contactar el servidor de Metrocuadrado." };
  }
  const text = await resp.text().catch(() => "");
  let parsed: any = null;
  try { parsed = JSON.parse(text); } catch (_e) { parsed = null; }
  const token = parsed ? (parsed.token || parsed.jwt || parsed.access_token || (parsed.data && (parsed.data.id_token || parsed.data.token || parsed.data.access_token))) : null;
  let message = "";
  if (parsed && parsed.data && parsed.data.message) message = String(parsed.data.message);
  else if (parsed && parsed.message) message = String(parsed.message);
  else message = text.slice(0, 200);
  if (cfg.password) message = message.split(String(cfg.password)).join("***");
  if (!token && !message) message = "Respuesta de token inesperada (status " + resp.status + ").";
  return { token: token ? String(token) : null, status: resp.status, message };
}

async function getToken(admin: any, ambiente: string, cfg: any, opts: { forzar?: boolean } = {}): Promise<string> {
  const huella = await huellaCredenciales(cfg);
  const { data: cached } = await admin
  .from("metro_tokens")
  .select("*")
  .eq("ambiente", ambiente)
  .maybeSingle();
  if (cached && cached.token) {
    const venceEn = new Date(cached.expires_at).getTime();
    const rechazo = parseRechazo(cached.token);
    if (!rechazo) {
      // Token real: se reutiliza mientras este vigente y sea del usuario configurado.
      if (venceEn > Date.now() + 60000 && tokenEsDelUsuario(cached.token, cfg.username)) return cached.token;
    } else if (venceEn > Date.now()) {
      if (rechazo.kind === "locked") {
        throw new MetroAuthError(rechazo.message, "locked", 200, true, cached.expires_at);
      }
      if (rechazo.huella === huella && !opts.forzar) {
        throw new MetroAuthError(rechazo.message, "rejected", 200, true, cached.expires_at);
      }
    }
  }

  const r = await pedirToken(ambiente, cfg);
  if (r.token) {
    const pl = jwtPayload(r.token);
    const expJwt = pl && Number(pl.exp) ? Number(pl.exp) * 1000 - 60 * 1000 : 0;
    const expiresAt = new Date(expJwt > Date.now() ? Math.min(expJwt, Date.now() + 55 * 60 * 1000) : Date.now() + 55 * 60 * 1000).toISOString();
    await admin.from("metro_tokens").upsert({ ambiente, token: r.token, expires_at: expiresAt }, { onConflict: "ambiente" });
    return r.token;
  }

  if (r.status === -1 || r.status >= 500) {
    // Problema de red o del servidor de Metrocuadrado: no se recuerda, se reintenta la proxima vez.
    throw new MetroAuthError(r.message || ("Metrocuadrado no respondio (status " + r.status + ")."), "network", r.status, false, null);
  }
  const bloqueada = /locked|bloquead|attempts exceeded/i.test(r.message);
  const kind: "rejected" | "locked" = bloqueada ? "locked" : "rejected";
  const minutos = bloqueada ? BLOQUEO_MINUTOS : RECHAZO_MINUTOS;
  const hasta = new Date(Date.now() + minutos * 60 * 1000).toISOString();
  const registro = "ERR|" + (bloqueada ? "*" : huella) + "|" + kind + "|" + r.message.replace(/\|/g, "/").slice(0, 300);
  await admin.from("metro_tokens").upsert({ ambiente, token: registro, expires_at: hasta }, { onConflict: "ambiente" });
  throw new MetroAuthError(r.message, kind, r.status, false, hasta);
}

// Mensaje claro para el usuario cuando falla el login (se usa en publish/update/unpublish/status).
function explicarAuthError(e: MetroAuthError, ambiente: string): string {
  if (e.kind === "locked") {
    return "Metrocuadrado tiene la cuenta bloqueada temporalmente por intentos de login fallidos. La plataforma no volvera a intentar hasta las " + horaColombia(e.hasta) + " (hora Colombia). Mensaje de Metrocuadrado: " + e.message;
  }
  if (e.kind === "rejected") {
    return "Metrocuadrado rechazo el usuario o la contrasena en " + ambiente + ": " + e.message + (e.cached ? " (ultimo intento; se reintenta al guardar una contrasena distinta o al pulsar Probar)" : "");
  }
  return "No se pudo generar el token de Metrocuadrado: " + e.message;
}

function limpiarTexto(t: any, max: number) {
  let s = String(t ?? "").replace(/<[^>]*>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();
  if (s.length > max) {
    let corte = s.slice(0, max).lastIndexOf(".");
    if (corte < max * 0.5) corte = s.slice(0, max).lastIndexOf(" ");
    if (corte < 1) corte = max - 1;
    s = s.slice(0, corte + 1).trim();
  }
  return s;
}

function builtTimeDesde(p: any) {
  const a = Number(p.antiguedad ?? p.edad_inmueble ?? -1);
  if (!(a >= 0)) return null;
  if (a <= 5) return "Entre 0 y 5 anos";
  if (a <= 10) return "Entre 5 y 10 anos";
  if (a <= 20) return "Entre 10 y 20 anos";
  return "Mas de 20 anos";
}

function agentIdDe(p: any, cfg: any) {
  const v = Number((p && p.metro_agent_id) || (cfg && cfg.account_id) || Deno.env.get("METRO_AGENT_ID") || 0);
  return Number.isFinite(v) && v > 0 ? v : null;
}

// Un usuario es admin si en perfiles_usuarios (clave: id = auth.users.id) tiene rol_id 1 o el rol se llama "admin".
// (Antes se buscaba por una columna user_id que no existe, y por eso ningun admin podia publicar propiedades de otro asesor.)
async function esAdmin(admin: any, uid: string | null): Promise<boolean> {
  if (!uid) return false;
  try {
    const { data } = await admin.from("perfiles_usuarios").select("rol_id, roles(nombre)").eq("id", uid).maybeSingle();
    if (!data) return false;
    const rol: any = Array.isArray(data.roles) ? data.roles[0] : data.roles;
    const nombre = String((rol && rol.nombre) || "").toLowerCase();
    return Number(data.rol_id) === 1 || nombre === "admin";
  } catch (_e) {
    return false;
  }
}

// El asesor dueno de la propiedad o un admin pueden publicar/actualizar/retirar el aviso.
async function puedeGestionar(admin: any, prop: any, uid: string | null): Promise<boolean> {
  if (!uid) return false;
  if (prop && prop.asesor_id === uid) return true;
  return await esAdmin(admin, uid);
}

// Arma el payload segun la documentacion PTEC: valida lo obligatorio y omite lo vacio.
function buildPayload(p: any, responseUrl: string, cfg?: any) {
  const faltan: string[] = [];
  if (!p.metro_city_id || !p.metro_zone_id || !p.metro_sector_id) faltan.push("el mapeo de ciudad/zona/sector de Metrocuadrado");
  if (p.latitud === null || p.latitud === undefined || p.longitud === null || p.longitud === undefined) faltan.push("latitud y longitud (Metrocuadrado las exige)");
  var dirBase = String(p.direccion || [p.calle_carrera, p.numero].filter(Boolean).join(" ") || "").trim();
  if (!dirBase) dirBase = [p.barrio, p.ciudad].filter(Boolean).join(", ").trim();
  const direccion = dirBase;
  if (!direccion) faltan.push("la direccion");
  const fotosRaw = (Array.isArray(p.fotos) && p.fotos.length) ? p.fotos : (Array.isArray(p.imagenes) ? p.imagenes : []);
  const fotos = fotosRaw.map((f: any) => (typeof f === "string" ? f : ((f && (f.url || f.src)) || ""))).filter((u: string) => /^https:\/\//i.test(u));
  if (fotos.length < 3) faltan.push("minimo 3 fotos con URL https (hay " + fotos.length + ")");
  const precio = Math.round(Number(p.precio) || 0);
  if (precio < 100000) faltan.push("un precio valido (minimo 100.000)");
  if (faltan.length) throw new Error("No se puede publicar en Metrocuadrado. Falta: " + faltan.join("; ") + ".");

  const realEstateType = Number(p.metro_realestate_type || REALESTATE_TYPE[p.tipo_propiedad] || 1);
  const realEstateOffer = Number(p.metro_business_type || (p.tipo_operacion === "arriendo" ? 2 : 1));
  const admin = Math.round(Number(p.precio_admin ?? p.administracion) || 0);
  const areaConstruida = Number(p.m2_construccion || p.area_construida || 0);
  const areaPrivada = Number(p.m2_terreno || p.area_total || areaConstruida || 0);

  const amenities: Record<string, any> = {};
  const set = (k: string, val: any) => { if (val !== null && val !== undefined && val !== "") amenities[k] = val; };
  set("builtTime", builtTimeDesde(p));
  if (Number(p.habitaciones) > 0) set("rooms", String(Number(p.habitaciones)));
  if (p.banos !== null && p.banos !== undefined) set("bathrooms", String(Number(p.banos)));
  const gar = Number(p.garajes ?? p.parqueaderos ?? -1);
  if (gar >= 0) set("garages", String(gar));
  if (areaConstruida > 0) set("builtArea", String(areaConstruida));
  if (areaPrivada > 0) set("area", String(areaPrivada));
  if (Number(p.piso) > 0) set("floorNumber", String(Number(p.piso)));
  const asc = Number(p.num_elevadores || 0);
  if (asc > 0) { set("lifts", String(Math.min(asc, 4))); set("elevator", true); }
  set("negotiable", p.precio_negociable ? "true" : "false");
  set("petsAllowed", p.acepta_mascotas ? "true" : "false");
  if (p.deposito === true) set("utilityRoom", "true");
  if (p.tiene_piscina === true) set("pool", "true");
  set("inBuilding", true);
  set("residentialZone", true);

  const payload: Record<string, any> = {
    realEstateType,
    realEstateOffer,
    price: String(precio),
    city: String(p.metro_city_id),
    zone: Number(p.metro_zone_id),
    sector: Number(p.metro_sector_id),
    stratum: Number(p.metro_stratum || p.estrato || 3),
    address: direccion,
    latitude: String(p.latitud),
    longitude: String(p.longitud),
    reference1: String(p.id),
    comments: limpiarTexto(p.descripcion, 1000),
    images: fotos.slice(0, 20),
    amenities,
    responseUrl,
  };
  if (admin >= 10000) payload.administration = String(admin);
  const barrio = limpiarTexto(p.barrio, 60);
  if (barrio) payload.neighborhood = barrio;
  if (Number(p.metro_neighborhood_id) > 0) payload.neighborhoodId = Number(p.metro_neighborhood_id);
  if (p.video_url) payload.video = String(p.video_url);
  const ag = agentIdDe(p, cfg);
  if (ag) payload.agentId = ag;
  return payload;
}

Deno.serve(async (req) => {
    if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders() });

    const url = new URL(req.url);
    const parts = url.pathname.split("/").filter(Boolean);
    const action = parts[parts.length - 1];

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

    // Diagnostico SOLO LECTURA de los catalogos de Metrocuadrado.
    // Prueba variantes de cabecera contra endpoints de catalogo (GET, sin efectos)
    // y devuelve unicamente status y un fragmento del cuerpo. Nunca expone secretos.
    if (action === "diag-catalogos") {
      const { data: cfgD } = await admin.from("configuracion_portales").select("*").eq("portal", "metrocuadrado").maybeSingle();
      const ambD = (url.searchParams.get("ambiente") || (cfgD && cfgD.ambiente) || "dev").toLowerCase();
      const urlsD = baseUrls(ambD);
      const keyD = xApiKey(ambD);
      let tkD = "";
      try { if (cfgD) tkD = (await getToken(admin, ambD, cfgD)) || ""; } catch (_e) { tkD = ""; }
      const paths = ["/rest-catalogue/businesstypes/", "/rest-catalogue/neighborhoods/?cityId=1", "/rest-catalogue/cities/"];
      const variantes = {
        solo_apikey: { "Content-Type": "application/json", "x-api-key": keyD },
        apikey_mas_token: { "Content-Type": "application/json", "x-api-key": keyD, "token": tkD },
        apikey_mas_bearer: { "Content-Type": "application/json", "x-api-key": keyD, "Authorization": "Bearer " + tkD },
        solo_bearer: { "Content-Type": "application/json", "Authorization": "Bearer " + tkD }
      };
      const out: any = { ambiente: ambD, base: urlsD.base, tiene_apikey: !!keyD, largo_apikey: keyD ? keyD.length : 0, tiene_token: !!tkD, pruebas: [] };
      for (const p of paths) {
        for (const vn of Object.keys(variantes)) {
          try {
            const rr = await fetch(urlsD.base + p, { headers: (variantes as any)[vn] });
            const tt = await rr.text().catch(() => "");
            out.pruebas.push({ path: p, variante: vn, status: rr.status, cuerpo: tt.substring(0, 110) });
          } catch (e) {
            out.pruebas.push({ path: p, variante: vn, status: -1, cuerpo: String(e).substring(0, 90) });
          }
        }
      }
      return json(out, 200);
    }

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
    const isCatalogRoute = parts.includes("catalog");
    let uid: string | null = null;

    // 1) Ticket de publicacion: lo crea mc_create_ticket con la sesion del asesor (vale 30 minutos, un solo uso).
    //    Permite publicar mandando por el gateway solo la anon key (evita el bloqueo del gateway con el JWT del usuario).
    //    Antes este ticket se revisaba DESPUES del chequeo de sesion, asi que toda publicacion respondia "No autenticado".
    let bodyPublish: any = null;
    if (action === "publish" && req.method === "POST") {
      bodyPublish = await req.json().catch(() => ({}));
      if (bodyPublish && bodyPublish.ticket) {
        const cutoff = new Date(Date.now() - 30 * 60 * 1000).toISOString();
        const { data: tk } = await admin.from("metro_publish_tickets").select("*").eq("ticket", String(bodyPublish.ticket)).eq("used", false).gte("created_at", cutoff).maybeSingle();
        if (tk && String(tk.property_id) === String(bodyPublish.propertyId)) {
          await admin.from("metro_publish_tickets").update({ used: true }).eq("ticket", String(bodyPublish.ticket));
          uid = tk.user_id;
        }
      }
    }

    // 2) Sin ticket valido: se exige la sesion del usuario (JWT en Authorization o en x-user-token en base64).
    if (!uid) {
      const { data: userData, error: userErr } = await userClient.auth.getUser();
      if ((userErr || !userData?.user) && !isCatalogRoute) {
        return json({ error: "No autenticado" }, 401);
      }
      uid = (userData && userData.user) ? userData.user.id : null;
    }

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
      const forzar = url.searchParams.get('forzar') === '1'; // "Probar" en Ajustes: reintenta aunque haya un rechazo reciente
      // 1) Credenciales: UN solo intento de login (o el resultado recordado, ver getToken).
      let credStatus = 0;
      let credOk = false;
      let credCache = false;
      let credKind = '';
      let credHasta: string | null = null;
      let mensajeMc = '';
      let tokenE = '';
      try {
        tokenE = await getToken(admin, ambEst, cfgE, { forzar });
        credOk = true;
        credStatus = 200;
        mensajeMc = 'Token generado correctamente.';
      } catch (e) {
        if (e instanceof MetroAuthError) {
          credStatus = e.status;
          credCache = e.cached;
          credKind = e.kind;
          credHasta = e.hasta;
          mensajeMc = e.message;
        } else {
          credStatus = -1;
          mensajeMc = String((e as Error).message || e);
        }
      }
      // 2) Catalogos: en produccion basta la llave; en desarrollo se manda tambien el token si existe.
      const hdrsE: Record<string, string> = { 'Content-Type': 'application/json', 'x-api-key': xApiKey(ambEst) };
      if (tokenE) hdrsE['token'] = tokenE;
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
      const listo = !!cfgE.activo && catOk && credOk;
      let resumen = '';
      if (listo) resumen = 'Todo listo: llave y credenciales validas en ' + ambEst + '.';
      else if (!cfgE.activo) resumen = 'La integracion esta desactivada (marca Activo y guarda).';
      else if (!credOk && credKind === 'locked') resumen = 'Metrocuadrado tiene la cuenta bloqueada temporalmente por intentos de login fallidos. No se volvera a intentar hasta las ' + horaColombia(credHasta) + ' (hora Colombia); despues pulsa Probar una sola vez. Mensaje: ' + mensajeMc;
      else if (!credOk && credKind === 'rejected') resumen = 'Metrocuadrado rechaza el usuario en ' + ambEst + ': ' + mensajeMc + (credCache ? ' (ultimo intento; guarda la contrasena correcta o pulsa Probar para reintentar)' : '');
      else if (!credOk) resumen = 'No se pudo verificar el usuario en Metrocuadrado: ' + mensajeMc;
      else if (!catOk) resumen = 'La API de Metrocuadrado no responde bien a los catalogos (status ' + catStatus + ').';
      return json({ portal: 'metrocuadrado', configurado: true, activo: !!cfgE.activo, ambiente: ambEst, credenciales_origen: (Deno.env.get("METRO_PASSWORD") ? "secrets" : "tabla"), catalogos_ok: catOk, catalogos_status: catStatus, credenciales_ok: credOk, credenciales_status: credStatus, credenciales_recordado: credCache, credenciales_tipo: credKind, reintento_desde: credHasta, mensaje_metrocuadrado: mensajeMc, listo_para_publicar: listo, resumen: resumen }, 200);
    }

    let ambienteActual = "dev";
    try {
      const cfg = await getConfig(admin);
      const ambiente = (cfg.ambiente || "dev").toLowerCase();
      ambienteActual = ambiente;
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
          neighborhoods: "/rest-catalogue/neighborhoods/",
          neighborhoods_search: "/rest-catalogue/neighborhoods/search",
          agents: "/rest-api/agents/",
          offices: "/rest-api/offices/",
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
        const body = bodyPublish || {}; // el cuerpo ya se leyo arriba (ticket)
        if (!uid) { return json({ error: "No autenticado" }, 401); }
        if (!body.propertyId) return json({ error: "Falta propertyId" }, 400);
        const { data: prop, error } = await admin.from("propiedades").select("*").eq("id", body.propertyId).single();
        if (error || !prop) return json({ error: "Propiedad no encontrada" }, 404);
        if (!(await puedeGestionar(admin, prop, uid))) return json({ error: "No tienes permiso sobre esta propiedad" }, 403);
        const token = await getToken(admin, ambiente, cfg);
        const payload = buildPayload(prop, responseUrl, cfg);
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
        if (!(await puedeGestionar(admin, prop, uid))) return json({ error: "No tienes permiso sobre esta propiedad" }, 403);
        const token = await getToken(admin, ambiente, cfg);
        const payload: any = buildPayload(prop, responseUrl, cfg);
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
        if (!(await puedeGestionar(admin, prop, uid))) return json({ error: "No tienes permiso sobre esta propiedad" }, 403);
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
      if (e instanceof MetroAuthError) {
        return json({ error: explicarAuthError(e, ambienteActual), auth_tipo: e.kind, reintento_desde: e.hasta }, e.kind === "locked" ? 423 : 502);
      }
      return json({ error: (e as Error).message }, 500);
    }
  });

