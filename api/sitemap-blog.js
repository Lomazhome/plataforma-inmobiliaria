// Lista de los artículos del blog para Google (sitemap), armada en el servidor.
//
// Dirección:  https://www.lomazhome.com/sitemap-blog.xml
//
// Qué hace: lee de Supabase los artículos publicados y devuelve la lista con la dirección de cada uno
// (/blog/<nombre-del-articulo>) y la fecha de su último cambio. Así, cada artículo nuevo aparece solo,
// sin tocar ningún archivo. El archivo sitemap.xml del sitio apunta a esta lista y a la de las páginas fijas.

const SITE = "https://www.lomazhome.com";
const SUPABASE_URL = "https://lniouebpuuuqctrgxoiw.supabase.co";
// Llave pública (la misma de config.js). Solo permite leer lo que ya es público.
const SUPABASE_ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxuaW91ZWJwdXV1cWN0cmd4b2l3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgwODM5NjgsImV4cCI6MjA5MzY1OTk2OH0.8w-TcD8JKkHQpnybaj-ANz-4k4hznFoIwFr_ZatqPtA";

function esc(s){
  return String(s === null || s === undefined ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}

// Fecha AAAA-MM-DD en hora de Bogotá
function dia(iso){
  const t = Date.parse(iso || "");
  if(isNaN(t)) return "";
  return new Date(t - 5 * 3600 * 1000).toISOString().slice(0, 10);
}

module.exports = async function handler(req, res){
  let filas = null;
  const control = new AbortController();
  const reloj = setTimeout(function(){ control.abort(); }, 7000);
  try{
    const r = await fetch(SUPABASE_URL + "/rest/v1/articulos_blog?select=slug,published_at,updated_at&estado=eq.publicado&order=published_at.desc&limit=1000", {
      headers: { apikey: SUPABASE_ANON, Authorization: "Bearer " + SUPABASE_ANON }, signal: control.signal
    });
    if(r.ok){ const d = await r.json(); if(Array.isArray(d)) filas = d; }
  }catch(e){ filas = null; }
  finally{ clearTimeout(reloj); }

  if(!filas){
    // Si Supabase no responde, mejor que Google vuelva más tarde a que lea una lista incompleta
    res.statusCode = 503;
    res.setHeader("Retry-After", "600");
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    return res.end("No se pudo armar la lista en este momento.");
  }

  const articulos = filas.filter(function(a){ return /^[a-z0-9][a-z0-9-]{0,119}$/.test(String(a.slug || "")); });
  const fechas = articulos.map(function(a){ return dia(a.updated_at) > dia(a.published_at) ? dia(a.updated_at) : dia(a.published_at); });
  const ultima = fechas.slice().sort().pop() || "";

  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';
  xml += "  <url>\n    <loc>" + SITE + "/blog.html</loc>\n" + (ultima ? "    <lastmod>" + ultima + "</lastmod>\n" : "") + "    <changefreq>weekly</changefreq>\n    <priority>0.8</priority>\n  </url>\n";
  articulos.forEach(function(a, i){
    xml += "  <url>\n    <loc>" + esc(SITE + "/blog/" + a.slug) + "</loc>\n" + (fechas[i] ? "    <lastmod>" + fechas[i] + "</lastmod>\n" : "") + "    <changefreq>monthly</changefreq>\n    <priority>0.7</priority>\n  </url>\n";
  });
  xml += "</urlset>\n";

  res.statusCode = 200;
  res.setHeader("Content-Type", "application/xml; charset=utf-8");
  res.setHeader("Cache-Control", "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400");
  res.end(xml);
};
