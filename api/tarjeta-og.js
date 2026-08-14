// Vista previa (Open Graph) de las tarjetas digitales de LoMaz Home.
// Solo la usan los robots de WhatsApp, Facebook y LinkedIn:
// las personas siguen viendo la tarjeta normal en /asesor.html.

const SITE = "https://www.lomazhome.com";
const COLS = "id,nombre_completo,avatar_url,notas,cargo,datos_perfil";

function esc(s){
  return String(s === null || s === undefined ? "" : s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function slugify(s){
  return String(s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+/, "")
    .replace(/-+$/, "");
}

async function credenciales(){
  const r = await fetch(SITE + "/config.js");
  const txt = await r.text();
  const url = (txt.match(/SUPABASE_URL\s*=\s*['"]([^'"]+)['"]/) || [])[1];
  const key = (txt.match(/SUPABASE_ANON_KEY\s*=\s*['"]([^'"]+)['"]/) || [])[1];
  return { url: url, key: key };
}

async function buscarPerfil(slug){
  if(!slug) return null;
  const c = await credenciales();
  if(!c.url || !c.key) return null;
  const cab = { apikey: c.key, Authorization: "Bearer " + c.key };
  const base = c.url + "/rest/v1/perfiles_usuarios?select=" + encodeURIComponent(COLS);
  try{
    const r1 = await fetch(base + "&" + encodeURIComponent("datos_perfil->>slug") + "=eq." + encodeURIComponent(slug) + "&limit=1", { headers: cab });
    const d1 = await r1.json();
    if(Array.isArray(d1) && d1.length) return d1[0];
  }catch(e){}
  try{
    const r2 = await fetch(base, { headers: cab });
    const d2 = await r2.json();
    if(Array.isArray(d2)){
      for(let i = 0; i < d2.length; i++){
        if(slugify(d2[i].nombre_completo) === slugify(slug)) return d2[i];
      }
    }
  }catch(e){}
  return null;
}

function paginaOg(perf, slug){
  const dp = (perf && perf.datos_perfil) || {};
  const nombre = (perf && perf.nombre_completo) || "Asesor LoMaz Home";
  const cargo = dp.cargo_publico || (perf && perf.cargo) || "Asesor inmobiliario";
  const ciudad = dp.ciudad || "Bogot\u00e1";
  const marca = /lomaz/i.test(cargo) ? "" : " de LoMaz Home";
  const bio = String(dp.bio || (perf && perf.notas) || (cargo + marca + " en " + ciudad + ". Escr\u00edbeme por WhatsApp, llamada o correo.")).replace(/\s+/g, " ").slice(0, 190);
  const foto = (perf && perf.avatar_url) || (SITE + "/og-home.jpg");
  const url = SITE + "/asesor/" + slug;
  const titulo = nombre + " | " + (/lomaz/i.test(cargo) ? cargo : cargo + " LoMaz Home");
  const destino = "/asesor.html?slug=" + encodeURIComponent(slug);
  return "<!DOCTYPE html>\n" +
    '<html lang="es"><head><meta charset="utf-8">\n' +
    "<title>" + esc(titulo) + "</title>\n" +
    '<meta name="description" content="' + esc(bio) + '">\n' +
    '<link rel="canonical" href="' + esc(url) + '">\n' +
    '<meta property="og:type" content="profile">\n' +
    '<meta property="og:site_name" content="LoMaz Home">\n' +
    '<meta property="og:locale" content="es_CO">\n' +
    '<meta property="og:title" content="' + esc(titulo) + '">\n' +
    '<meta property="og:description" content="' + esc(bio) + '">\n' +
    '<meta property="og:image" content="' + esc(foto) + '">\n' +
    '<meta property="og:image:alt" content="' + esc(nombre) + '">\n' +
    '<meta property="og:url" content="' + esc(url) + '">\n' +
    '<meta name="twitter:card" content="summary_large_image">\n' +
    '<meta name="twitter:title" content="' + esc(titulo) + '">\n' +
    '<meta name="twitter:description" content="' + esc(bio) + '">\n' +
    '<meta name="twitter:image" content="' + esc(foto) + '">\n' +
    "</head><body>\n" +
    "<h1>" + esc(nombre) + "</h1>\n<p>" + esc(cargo) + "</p>\n<p>" + esc(bio) + "</p>\n" +
    '<p><a href="' + esc(destino) + '">Ver la tarjeta digital</a></p>\n' +
    "<scr" + "ipt>location.replace(" + JSON.stringify(destino) + ");</scr" + "ipt>\n" +
    "</body></html>";
}

module.exports = async function handler(req, res){
  let slug = "";
  try{
    const u = new URL(req.url, SITE);
    slug = u.searchParams.get("slug") || "";
    if(!slug){
      const partes = u.pathname.replace(/\/+$/, "").split("/");
      slug = decodeURIComponent(partes[partes.length - 1] || "");
    }
  }catch(e){}
  slug = slugify(slug);

  let perf = null;
  try{ perf = await buscarPerfil(slug); }catch(e){ perf = null; }

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader("Cache-Control", "public, s-maxage=300, stale-while-revalidate=86400");
  res.status(perf ? 200 : 404).send(paginaOg(perf, slug));
};
