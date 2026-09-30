// Edge Function: proppit-feed
// Genera el feed XML para Proppit (Colombia) siguiendo al pie de la letra la
// "Guia de especificaciones Proppit XML Feed - COLOMBIA" (actualizada el 22 de septiembre de 2026):
// https://docs.google.com/document/d/1AoHgr9W7FS6SCAi9KeN2NmsFTMQxKsO8oi8Q_NPh2ts
//
// Reglas de esa guia que aplica esta funcion:
//  - Etiquetas obligatorias: reference_id, contact (email + phone con +57), title, description,
//    prices, propertyType, coordinates, bedrooms, bathrooms, areas (floorArea + usableArea, o plotArea en lotes) y pictures.
//    Si falta una sola, Proppit descarta el aviso. Por eso, si a una propiedad le falta un dato,
//    NO se incluye en el feed y se deja el motivo en un comentario al inicio del XML.
//  - Los textos van en CDATA (sin HTML), los numeros de dormitorios/banos son enteros.
//  - Las amenidades solo pueden ser las de la lista oficial: un valor fuera de la lista hace que
//    Proppit descarte el aviso ENTERO. Aqui se traducen y se filtran contra esa lista.
//
// Solo incluye propiedades activas que el asesor haya enviado a Proppit (casilla "Proppit" marcada)
// y que no esten pausadas/retiradas en ese portal (evita duplicar avisos creados a mano en Proppit).
// Distribucion: puntopropiedad, Trovit, Mitula, Nestoria, Nuroa. Proppit lee el feed una vez al dia.
// URL publica: https://lniouebpuuuqctrgxoiw.supabase.co/functions/v1/proppit-feed

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

// Contacto de respaldo de la agencia (se usa cuando el asesor no tiene el dato en su perfil)
const AGENCIA = {
  phone: "+573003300343",
  whatsapp: "+573003300343",
  email: "lomazhome@gmail.com",
  name: "Lomaz Home",
};

// Tipo de inmueble de LoMaz Home -> valor exacto que acepta Proppit Colombia
const TIPO_MAP: Record<string, string> = {
  apartamento: "apartment",
  apartaestudio: "studio",
  casa: "house",
  finca: "villa",
  local: "commercial",
  bodega: "industrial unit",
  oficina: "office",
  consultorio: "office",
  lote: "land",
  parqueadero: "car park",
  habitacion: "apartment",
};

// Segun la guia: dormitorios = 0 para land, commercial, industrial unit y car park; banos = 0 para land, industrial unit y car park.
const CERO_DORMITORIOS = new Set(["land", "commercial", "industrial unit", "car park"]);
const CERO_BANOS = new Set(["land", "industrial unit", "car park"]);
// plotArea: obligatorio en land, opcional en house / industrial unit / car park y NO se envia en apartment, villa, commercial, office ni studio.
const PLOT_OPCIONAL = new Set(["house", "industrial unit", "car park"]);
// Las reglas (pets allowed, etc.) solo aplican a house, apartment y villa en arriendo.
const TIPOS_CON_REGLAS = new Set(["house", "apartment", "villa"]);

// Lista oficial de amenidades de Proppit Colombia. Nada fuera de esta lista puede salir en el feed.
const AMENITIES_PROPPIT = new Set([
  "air conditioning", "alarm", "balcony", "car park", "children's area", "disabled access",
  "equipped kitchen", "fireplace", "garden", "grill", "gym", "guardhouse", "heating", "internet",
  "jacuzzi", "lift", "natural gas", "panoramic view", "sauna", "security", "service room",
  "swimming pool", "tennis court", "terrace", "water", "water tank", "yard",
]);

// Amenidad de LoMaz Home (como se guarda en la tabla propiedades) -> amenidades de Proppit.
// Las claves se comparan sin tildes ni mayusculas (ver normalizar()).
const AMENITY_MAP: Record<string, string[]> = {
  "aire acondicionado": ["air conditioning"],
  "balcon": ["balcony"],
  "parqueadero privado": ["car park"],
  "parqueadero cubierto": ["car park"],
  "parqueadero descubierto": ["car park"],
  "parqueadero doble": ["car park"],
  "parqueadero comunal": ["car park"],
  "juegos infantiles": ["children's area"],
  "parque infantil": ["children's area"],
  "cocina integral": ["equipped kitchen"],
  "cocina semi-integral": ["equipped kitchen"],
  "chimenea": ["fireplace"],
  "jardin": ["garden"],
  "zona bbq": ["grill"],
  "terraza bbq": ["grill", "terrace"],
  "gimnasio": ["gym"],
  "porteria 24h": ["guardhouse", "security"],
  "conserjeria": ["guardhouse"],
  "calefaccion": ["heating"],
  "internet fibra optica": ["internet"],
  "jacuzzi": ["jacuzzi"],
  "ascensor": ["lift"],
  "gas natural": ["natural gas"],
  "vista panoramica": ["panoramic view"],
  "vista al mar": ["panoramic view"],
  "vista a la montana": ["panoramic view"],
  "vista ciudad": ["panoramic view"],
  "vista al lago": ["panoramic view"],
  "sauna": ["sauna"],
  "seguridad 24h": ["security"],
  "vigilancia privada": ["security"],
  "camara seguridad": ["security"],
  "control acceso": ["security"],
  "cuarto servicio": ["service room"],
  "piscina": ["swimming pool"],
  "piscina climatizada": ["swimming pool"],
  "piscina privada": ["swimming pool"],
  "cancha de tenis": ["tennis court"],
  "terraza": ["terrace"],
  "pozo agua": ["water"],
  "cisterna": ["water tank"],
  "patio": ["yard"],
};

// ---------- utilidades ----------

function normalizar(s: any): string {
  return String(s ?? "")
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .toLowerCase().trim().replace(/\s+/g, " ");
}

// Texto seguro dentro de CDATA: sin caracteres invalidos en XML 1.0, sin etiquetas HTML y sin cerrar el CDATA.
function cd(s: any): string {
  const t = String(s ?? "")
    .replace(/\r\n?/g, "\n")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F￾￿]/g, "")
    .replace(/<\/?[a-zA-Z][^>]*>/g, "")
    .replace(/\]\]>/g, "]]]]><![CDATA[>");
  return "<![CDATA[" + t + "]]>";
}

function num(v: any): number {
  const n = Number(String(v ?? "").replace(",", "."));
  return isFinite(n) ? n : 0;
}

function entero(v: any): number {
  return Math.max(0, Math.round(num(v)));
}

// Telefono colombiano con prefijo internacional (+57XXXXXXXXXX), como pide la guia. Devuelve "" si no sirve.
function telCO(v: any): string {
  const d = String(v ?? "").replace(/\D/g, "");
  if (!d) return "";
  if (d.length === 10) return "+57" + d;
  if (d.length === 12 && d.startsWith("57")) return "+" + d;
  if (d.length === 13 && d.startsWith("057")) return "+" + d.slice(1);
  if (d.length >= 11 && d.length <= 15) return "+" + d; // otro pais, ya con indicativo
  return "";
}

function emailValido(v: any): string {
  const e = String(v ?? "").trim();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e) ? e : "";
}

function listaTexto(v: any): string[] {
  if (Array.isArray(v)) return v.map((x) => String(x ?? "").trim()).filter(Boolean);
  if (typeof v === "string" && v.trim()) {
    try { const j = JSON.parse(v); if (Array.isArray(j)) return listaTexto(j); } catch (_e) { /* no es JSON */ }
    return v.split(",").map((s) => s.trim()).filter(Boolean);
  }
  return [];
}

function urlHttp(u: any): string {
  const s = String(u ?? "").trim();
  return /^https?:\/\//i.test(s) ? s : "";
}

// ---------- datos derivados de una propiedad ----------

function tipoProppit(p: any): string {
  return TIPO_MAP[normalizar(p.tipo_propiedad)] || "";
}

function operacionProppit(p: any): string {
  const op = normalizar(p.tipo_operacion || p.tipo_negocio);
  if (op === "venta" || op === "permuta") return "sale";
  if (op === "arriendo" || op === "arriendo_temporal" || op === "alquiler" || op === "alquiler_vacacional") return "rent";
  return "";
}

function areas(p: any) {
  const construida = num(p.m2_construccion) || num(p.area_construida);
  const privada = num(p.area_privada) || construida;
  const usable = construida || privada;
  const terreno = num(p.m2_terreno) || num(p.area_total);
  return { construida, privada, usable, terreno };
}

function fotos(p: any): string[] {
  const lista = listaTexto(p.fotos).map(urlHttp).filter(Boolean);
  const principal = urlHttp(p.foto_principal);
  if (principal && lista.indexOf(principal) > 0) { // la principal siempre de primera: es la portada en los portales
    lista.splice(lista.indexOf(principal), 1);
    lista.unshift(principal);
  }
  return Array.from(new Set(lista)).slice(0, 200);
}

function amenidadesProppit(p: any): string[] {
  const out = new Set<string>();
  for (const a of listaTexto(p.amenidades).concat(listaTexto(p.caracteristicas))) {
    const m = AMENITY_MAP[normalizar(a)];
    if (!m) continue;
    for (const v of m) if (AMENITIES_PROPPIT.has(v)) out.add(v);
  }
  return Array.from(out);
}

function amoblado(p: any): string {
  const set = new Set(listaTexto(p.amenidades).concat(listaTexto(p.caracteristicas)).map(normalizar));
  if (set.has("amoblado")) return "FULLY";
  if (set.has("semi amoblado") || set.has("semiamoblado")) return "PARTIALLY";
  const amo = normalizar(p.amoblado);
  if (amo === "si" || amo === "true" || amo === "amoblado") return "FULLY";
  return "";
}

function anioConstruccion(p: any): number {
  const hoy = new Date().getFullYear();
  const edad = num(p.antiguedad) || num(p.edad_inmueble);
  let anio = 0;
  if (edad > 0) anio = hoy - Math.round(edad);
  else if (num(p.ano_construccion) > 0) anio = Math.round(num(p.ano_construccion));
  return (anio >= 1500 && anio <= 2100) ? anio : 0;
}

// Motivos por los que Proppit descartaria el aviso. Si hay alguno, la propiedad no entra al feed.
function faltantes(p: any): string[] {
  const f: string[] = [];
  const tipo = tipoProppit(p);
  if (!String(p.titulo ?? "").trim()) f.push("sin titulo");
  if (!String(p.descripcion ?? "").trim()) f.push("sin descripcion");
  if (!(num(p.precio) > 0)) f.push("sin precio");
  if (!operacionProppit(p)) f.push("tipo de negocio no valido para Proppit (" + String(p.tipo_operacion ?? "") + ")");
  if (!tipo) f.push("tipo de inmueble no valido para Proppit (" + String(p.tipo_propiedad ?? "") + ")");
  const lat = num(p.latitud), lng = num(p.longitud);
  if (!(lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180 && (lat !== 0 || lng !== 0))) f.push("sin ubicacion en el mapa (latitud/longitud)");
  if (fotos(p).length === 0) f.push("sin fotos");
  const a = areas(p);
  if (tipo === "land") { if (!(a.terreno > 0 || a.construida > 0)) f.push("sin area del terreno"); }
  else if (tipo && !(a.usable > 0)) f.push("sin area construida");
  return f;
}

// ---------- XML de un aviso ----------

function buildListing(p: any, contact: any): string {
  const tipo = tipoProppit(p);
  const operacion = operacionProppit(p);
  const esLote = tipo === "land";
  const a = areas(p);
  const L: string[] = [];

  L.push("  <listing>");
  L.push("    <reference_id>" + cd(p.id) + "</reference_id>");

  // Contacto: email y telefono (con +57) son obligatorios
  const email = emailValido(contact.email) || AGENCIA.email;
  const phone = telCO(contact.phone) || AGENCIA.phone;
  const whatsapp = telCO(contact.whatsapp) || phone;
  const name = String(contact.name ?? "").trim() || AGENCIA.name;
  L.push("    <contact>");
  L.push("      <email>" + cd(email) + "</email>");
  L.push("      <phone>" + cd(phone) + "</phone>");
  L.push("      <whatsapp>" + cd(whatsapp) + "</whatsapp>");
  L.push("      <name>" + cd(name) + "</name>");
  L.push("    </contact>");

  L.push("    <title>" + cd(String(p.titulo).trim()) + "</title>");
  L.push("    <description>" + cd(String(p.descripcion).trim()) + "</description>");

  L.push("    <prices>");
  L.push("      <price currency=\"COP\" operation=\"" + operacion + "\">" + Math.round(num(p.precio)) + "</price>");
  L.push("    </prices>");

  L.push("    <propertyType>" + cd(tipo) + "</propertyType>");

  L.push("    <coordinates>");
  L.push("      <latitude>" + cd(num(p.latitud)) + "</latitude>");
  L.push("      <longitude>" + cd(num(p.longitud)) + "</longitude>");
  L.push("    </coordinates>");
  L.push("    <positionOnMap>" + (String(p.direccion ?? "").trim() ? "Accurate" : "Approximate") + "</positionOnMap>");

  // Dormitorios y banos: siempre presentes, enteros, con los minimos que exige la guia
  const dormitorios = CERO_DORMITORIOS.has(tipo) ? 0 : Math.min(500, Math.max(1, entero(p.habitaciones)));
  const banos = CERO_BANOS.has(tipo) ? 0 : Math.min(500, Math.max(1, entero(p.banos)));
  L.push("    <bedrooms>" + cd(dormitorios) + "</bedrooms>");
  L.push("    <bathrooms>" + cd(banos) + "</bathrooms>");

  const furn = amoblado(p);
  if (furn) L.push("    <furnished>" + cd(furn) + "</furnished>");
  const anio = anioConstruccion(p);
  if (anio) L.push("    <year>" + cd(anio) + "</year>");
  if (entero(p.piso) > 0) L.push("    <floor>" + cd(entero(p.piso)) + "</floor>");
  const admin = Math.round(num(p.precio_admin) || num(p.administracion));
  if (admin > 0) L.push("    <communityFeesPrice>" + cd(admin) + "</communityFeesPrice>");
  const estrato = entero(p.estrato);
  if (estrato >= 1 && estrato <= 7) L.push("    <stratum>" + cd(estrato) + "</stratum>");

  // Areas (en m2). Guia Colombia: usableArea = area construida, floorArea = area privada, plotArea = terreno.
  if (esLote) {
    L.push("    <plotArea unit=\"sqm\">" + Math.round(a.terreno || a.construida) + "</plotArea>");
  } else {
    L.push("    <floorArea unit=\"sqm\">" + Math.round(a.privada) + "</floorArea>");
    if (PLOT_OPCIONAL.has(tipo) && a.terreno > 0) L.push("    <plotArea unit=\"sqm\">" + Math.round(a.terreno) + "</plotArea>");
    L.push("    <usableArea unit=\"sqm\">" + Math.round(a.usable) + "</usableArea>");
  }

  L.push("    <pictures>");
  for (const u of fotos(p)) L.push("      <url>" + cd(u) + "</url>");
  L.push("    </pictures>");

  const video = urlHttp(p.video_url);
  if (video) {
    L.push("    <videos>");
    L.push("      <video>" + cd(video) + "</video>");
    L.push("    </videos>");
  }
  const tour = urlHttp(p.tour_virtual_url);
  if (tour) {
    L.push("    <virtualTours>");
    L.push("      <virtualTour>" + cd(tour) + "</virtualTour>");
    L.push("    </virtualTours>");
  }

  const excl = normalizar(p.exclusiva);
  if (excl === "si" || excl === "true") L.push("    <isExclusive>true</isExclusive>");

  const am = amenidadesProppit(p);
  if (am.length > 0) {
    L.push("    <amenities>");
    for (const v of am) L.push("      <amenity>" + cd(v) + "</amenity>");
    L.push("    </amenities>");
  }

  // Mascotas: solo casa, apartamento o finca en arriendo (unico caso donde la guia acepta <rules>)
  if (operacion === "rent" && TIPOS_CON_REGLAS.has(tipo)) {
    const set = new Set(listaTexto(p.amenidades).concat(listaTexto(p.caracteristicas)).map(normalizar));
    if (set.has("pet friendly") || set.has("acepta mascotas")) {
      L.push("    <rules>");
      L.push("      <rule>" + cd("pets allowed") + "</rule>");
      L.push("    </rules>");
    }
  }

  L.push("  </listing>");
  return L.join("\n");
}

// Arma el documento completo. `props` ya viene filtrado (activas y enviadas a Proppit).
function generarXml(props: any[], contactosPorAsesor: Record<string, any>): { xml: string; incluidas: number; excluidas: string[] } {
  const body: string[] = [];
  const excluidas: string[] = [];
  body.push("<?xml version=\"1.0\" encoding=\"UTF-8\"?>");
  const cuerpo: string[] = [];
  for (const p of props) {
    const f = faltantes(p);
    if (f.length) { excluidas.push("propiedad " + p.id + ": " + f.join(", ")); continue; }
    cuerpo.push(buildListing(p, contactosPorAsesor[p.asesor_id] || {}));
  }
  body.push("<listings>");
  if (excluidas.length) {
    // Comentario informativo (Proppit lo ignora): sirve para ver desde el navegador por que una propiedad no salio.
    body.push("  <!-- LoMaz Home: " + excluidas.length + " propiedad(es) NO incluida(s) por datos incompletos que Proppit exige: " + excluidas.join(" | ").replace(/--/g, "- -") + " -->");
  }
  body.push(...cuerpo);
  body.push("</listings>");
  return { xml: body.join("\n"), incluidas: cuerpo.length, excluidas };
}

// ---------- servidor ----------

Deno.serve(async (_req) => {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE);

  const { data: propsRaw, error } = await supabase
    .from("propiedades")
    .select("*")
    .in("estado", ["activo", "activa", "publicada"])
    .not("latitud", "is", null)
    .not("longitud", "is", null);

  if (error) {
    return new Response("<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n<error>" + cd(error.message) + "</error>", {
      status: 500,
      headers: { "Content-Type": "application/xml; charset=utf-8" },
    });
  }

  // OPT-IN: solo entran al feed las propiedades que el asesor envio a Proppit
  // marcando la casilla "Proppit" al publicar o editar en LoMaz Home.
  // Una propiedad sin registro de Proppit, o con el aviso pausado/retirado,
  // NO se incluye (evita duplicar avisos creados manualmente en Proppit).
  const ESTADOS_ACTIVOS = ["publicado_xml_feed", "publicado", "publicada", "activo", "activa", "en_proceso"];
  const esActivo = (e: any) => ESTADOS_ACTIVOS.indexOf(String(e || "").toLowerCase().replace(/\s+/g, "_")) !== -1;

  // Estado mas reciente por propiedad segun el historial publicaciones_portales
  // (respaldo por si propiedades.publicado_portales no se sincronizo).
  const ultimoEstadoProppit: Record<string, { estado: string; fecha: string }> = {};
  try {
    const { data: pubs } = await supabase
      .from("publicaciones_portales")
      .select("propiedad_id,estado,fecha")
      .eq("portal", "proppit");
    for (const r of (pubs || [])) {
      const id = String(r.propiedad_id || "");
      if (!id) continue;
      const prev = ultimoEstadoProppit[id];
      if (prev && (prev.fecha || "") > (r.fecha || "")) continue;
      ultimoEstadoProppit[id] = { estado: String(r.estado || ""), fecha: String(r.fecha || "") };
    }
  } catch (_e) { /* sin historial: se usa solo publicado_portales */ }

  const enviadaAProppit = (p: any) => {
    try {
      const arr = Array.isArray(p.publicado_portales) ? p.publicado_portales : [];
      const reg = arr.find((x: any) => x && String(x.portal || "").toLowerCase() === "proppit");
      const hist = ultimoEstadoProppit[String(p.id)];
      let estado = "";
      if (reg && hist) {
        estado = ((reg.fecha || "") >= (hist.fecha || "")) ? reg.estado : hist.estado;
      } else if (reg) {
        estado = reg.estado;
      } else if (hist) {
        estado = hist.estado;
      } else {
        return false; // nunca se marco la casilla Proppit
      }
      return esActivo(estado);
    } catch (_e) { return false; }
  };
  const props = (propsRaw || []).filter((p: any) => enviadaAProppit(p));

  // Contacto de cada asesor (perfiles) con respaldo en auth.users para el email
  const asesorIds = [...new Set(props.map((p: any) => p.asesor_id).filter(Boolean))];
  const contactosPorAsesor: Record<string, any> = {};

  if (asesorIds.length > 0) {
    const { data: perfiles } = await supabase
      .from("perfiles")
      .select("*")
      .in("user_id", asesorIds);

    for (const perfil of (perfiles || [])) {
      contactosPorAsesor[perfil.user_id] = {
        email: perfil.email || null,
        phone: perfil.telefono || null,
        whatsapp: perfil.whatsapp || null,
        name: perfil.nombre_completo || perfil.nombre || null,
      };
    }

    for (const aid of asesorIds) {
      if (!contactosPorAsesor[aid] || !emailValido(contactosPorAsesor[aid].email)) {
        try {
          const { data: u } = await supabase.auth.admin.getUserById(aid);
          if (u && u.user) {
            contactosPorAsesor[aid] = contactosPorAsesor[aid] || {};
            contactosPorAsesor[aid].email = emailValido(contactosPorAsesor[aid].email) || u.user.email || null;
          }
        } catch (_e) { /* se usa el correo de la agencia */ }
      }
    }
  }

  const { xml, incluidas, excluidas } = generarXml(props, contactosPorAsesor);

  return new Response(xml, {
    status: 200,
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
      "Access-Control-Allow-Origin": "*",
      "X-Lomaz-Incluidas": String(incluidas),
      "X-Lomaz-Excluidas": String(excluidas.length),
    },
  });
});
