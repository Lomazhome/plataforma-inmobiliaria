// Edge Function: proppit-feed
// Genera XML feed compatible con Proppit (Colombia) leyendo propiedades activas de Supabase
// Distribucion: Trovit, Mitula, Nestoria, Nuroa, puntopropiedad
// URL publica: https://lniouebpuuuqctrgxoiw.supabase.co/functions/v1/proppit-feed

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const TIPO_MAP: Record<string,string> = {
  apartamento: "apartment",
  casa: "house",
  finca: "villa",
  local: "commercial",
  bodega: "industrial unit",
  oficina: "office",
  lote: "land",
  parqueadero: "car park",
  consultorio: "office",
  habitacion: "apartment"
};

const AMENITY_MAP: Record<string,string> = {
  "Piscina": "swimming pool",
  "Piscina climatizada": "swimming pool",
  "Piscina privada": "swimming pool",
  "Gimnasio": "gym",
  "Jacuzzi": "jacuzzi",
  "Sauna": "sauna",
  "Cancha de tenis": "tennis court",
  "Aire acondicionado": "air conditioning",
  "Calefaccion": "heating",
  "Ascensor": "lift",
  "Gas natural": "natural gas",
  "Internet fibra optica": "internet",
  "Cocina integral": "integral kitchen",
  "Seguridad 24h": "security",
  "Porteria 24h": "security",
  "Cuarto servicio": "service room",
  "Terraza": "terrace",
  "Vista panoramica": "panoramic view",
  "Vista al mar": "panoramic view",
  "Vista a la monta\u00f1a": "panoramic view",
  "Pozo agua": "water",
  "Cisterna": "water tank",
  "Jardin": "yard",
  "Patio": "yard",
  "Estudio": "office",
};

function cdata(s: any): string {
  const t = String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/[\u0080-\uFFFF]/g, (c) => "&#" + c.charCodeAt(0) + ";");
  return t;
}

function escapeAttr(s: any): string {
  return String(s ?? "").replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function buildListing(p: any, contact: any): string {
  const tipoProppit = TIPO_MAP[p.tipo_propiedad] || "apartment";
  const operation = p.tipo_operacion === "venta" ? "sale" : "rent";
  const precio = Math.round(Number(p.precio) || 0);
  const lat = Number(p.latitud) || null;
  const lng = Number(p.longitud) || null;
  const fotos = Array.isArray(p.fotos) ? p.fotos : [];
  const amenidades = Array.isArray(p.amenidades) ? p.amenidades : [];
  const isLand = tipoProppit === "land";

  const lines: string[] = [];
  lines.push("  <listing>");
  lines.push("    <reference_id>" + cdata(p.id) + "</reference_id>");
  lines.push("    <contact>");
  lines.push("      <phone>" + cdata(contact.phone || "3003300343") + "</phone>");
  lines.push("      <whatsapp>" + cdata(contact.whatsapp || "3003300343") + "</whatsapp>");
  if (contact.email) lines.push("      <email>" + cdata(contact.email) + "</email>");
  lines.push("      <name>" + cdata(contact.name || "Lomaz Home") + "</name>");
  lines.push("    </contact>");
  lines.push("    <title>" + cdata(p.titulo || "") + "</title>");
  lines.push("    <description>" + cdata(p.descripcion || "") + "</description>");
  lines.push("    <prices>");
  lines.push("      <price currency=\"COP\" operation=\"" + escapeAttr(operation) + "\">" + precio + "</price>");
  lines.push("    </prices>");
  lines.push("    <property_type>" + cdata(tipoProppit) + "</property_type>");

  lines.push("    <address>");
  if (p.direccion) lines.push("      <street>" + cdata(p.direccion) + "</street>");
  if (p.barrio) lines.push("      <neighborhood>" + cdata(p.barrio) + "</neighborhood>");
  if (p.ciudad) lines.push("      <city>" + cdata(p.ciudad) + "</city>");
  if (p.departamento) lines.push("      <region>" + cdata(p.departamento) + "</region>");
  lines.push("      <country>" + cdata("Colombia") + "</country>");
  lines.push("    </address>");

  if (lat !== null && lng !== null) {
    lines.push("    <coordinates>");
    lines.push("      <latitude>" + cdata(lat) + "</latitude>");
    lines.push("      <longitude>" + cdata(lng) + "</longitude>");
    lines.push("    </coordinates>");
    lines.push("    <positionOnMap>" + (p.direccion ? "Accurate" : "Approximate") + "</positionOnMap>");
  }

  const bedrooms = isLand || tipoProppit === "commercial" || tipoProppit === "industrial unit" || tipoProppit === "car park"
    ? 0 : Math.max(1, Number(p.habitaciones) || 1);
  lines.push("    <bedrooms>" + cdata(bedrooms) + "</bedrooms>");

  if (p.banos) lines.push("    <bathrooms>" + cdata(Math.round(Number(p.banos) || 0)) + "</bathrooms>");
  if (p.piso) lines.push("    <floor>" + cdata(Math.round(Number(p.piso) || 0)) + "</floor>");
  if (p.precio_admin && Number(p.precio_admin) > 0) lines.push("    <maintenanceFee currency=\"COP\">" + Math.round(Number(p.precio_admin)) + "</maintenanceFee>");

  if (!isLand && (Number(p.m2_construccion) || Number(p.area_construida))) {
    lines.push("    <floorArea unit=\"sqm\">" + Math.round(Number(p.m2_construccion) || Number(p.area_construida)) + "</floorArea>");
  }
  if (isLand && (Number(p.m2_terreno) || Number(p.area_total))) {
    lines.push("    <plotArea unit=\"sqm\">" + Math.round(Number(p.m2_terreno) || Number(p.area_total)) + "</plotArea>");
  } else if ((Number(p.m2_terreno) || Number(p.area_total)) && (tipoProppit === "house" || tipoProppit === "villa")) {
    lines.push("    <plotArea unit=\"sqm\">" + Math.round(Number(p.m2_terreno) || Number(p.area_total)) + "</plotArea>");
  }

  if (fotos.length > 0) {
    lines.push("    <pictures>");
    for (const u of fotos.slice(0, 30)) {
      lines.push("      <url>" + cdata(u) + "</url>");
    }
    lines.push("    </pictures>");
  }

  if (p.video_url) {
    lines.push("    <videos>");
    lines.push("      <video>" + cdata(p.video_url) + "</video>");
    lines.push("    </videos>");
  }

  if (p.tour_virtual_url) {
    lines.push("    <virtualTours>");
    lines.push("      <virtualTour>" + cdata(p.tour_virtual_url) + "</virtualTour>");
    lines.push("    </virtualTours>");
  }

  const proppitAmenities = new Set<string>();
  for (const a of amenidades) {
    const mapped = AMENITY_MAP[a];
    if (mapped) proppitAmenities.add(mapped);
  }
  if (proppitAmenities.size > 0) {
    lines.push("    <amenities>");
    for (const a of proppitAmenities) {
      lines.push("      <amenity>" + cdata(a) + "</amenity>");
    }
    lines.push("    </amenities>");
  }

  lines.push("  </listing>");
  return lines.join("\n");
}

Deno.serve(async (_req) => {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE);
  
  const { data: propsRaw, error } = await supabase
    .from("propiedades")
    .select("*")
    .in("estado", ["activo", "activa", "publicada"])
    .not("latitud", "is", null)
    .not("longitud", "is", null);

  if (error) {
    return new Response("<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n<error>" + error.message + "</error>", {
      status: 500,
      headers: { "Content-Type": "application/xml; charset=utf-8" }
    });
  }

  // Se excluyen del feed las propiedades que el asesor pauso o retiro
  // de Proppit desde la edicion de la propiedad en LoMaz Home.
  const fueraDeProppit = (p: any) => {
    try {
      const arr = Array.isArray(p.publicado_portales) ? p.publicado_portales : [];
      const reg = arr.find((x: any) => x && String(x.portal || "").toLowerCase() === "proppit");
      if (!reg) return false;
      const e = String(reg.estado || "").toLowerCase();
      return e === "pausado" || e === "pausada" || e === "retirado" || e === "retirada" || e === "inactivo";
    } catch (_e) { return false; }
  };
  const props = (propsRaw || []).filter((p: any) => !fueraDeProppit(p));

  // Cargar perfiles de asesores y emails de auth.users
  const asesorIds = [...new Set((props||[]).map((p: any) => p.asesor_id).filter(Boolean))];
  const contactosPorAsesor: Record<string, any> = {};
  
  if (asesorIds.length > 0) {
    // Perfiles tiene email, telefono, whatsapp
    const { data: perfiles } = await supabase
      .from("perfiles")
      .select("*")
      .in("user_id", asesorIds);
    
    for (const perfil of (perfiles || [])) {
      contactosPorAsesor[perfil.user_id] = {
        email: perfil.email || null,
        phone: perfil.telefono || null,
        whatsapp: perfil.whatsapp || null,
        name: perfil.nombre_completo || perfil.nombre || null
      };
    }
    
    // Fallback: auth.users.email para los que no tengan perfil
    for (const aid of asesorIds) {
      if (!contactosPorAsesor[aid] || !contactosPorAsesor[aid].email) {
        try {
          const { data: u } = await supabase.auth.admin.getUserById(aid);
          if (u && u.user) {
            contactosPorAsesor[aid] = contactosPorAsesor[aid] || {};
            contactosPorAsesor[aid].email = contactosPorAsesor[aid].email || u.user.email || null;
          }
        } catch (e) { /* ignore */ }
      }
    }
  }

  const validProps = (props || []).filter((p: any) => {
    return p.titulo && p.descripcion && p.precio && p.tipo_propiedad && p.tipo_operacion;
  });

  const body: string[] = [];
  body.push("<?xml version=\"1.0\" encoding=\"UTF-8\"?>");
  body.push("<listings>");
  for (const p of validProps) {
    const contact = contactosPorAsesor[p.asesor_id] || {};
    body.push(buildListing(p, contact));
  }
  body.push("</listings>");

  return new Response(body.join("\n"), {
    status: 200,
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600"
    }
  });
});
