// Simulador de Lomi para el panel (mensajeria.html, pestaña «Simulador»).
//
// El equipo chatea con Lomi como si fuera un cliente, con el inventario real y el mismo
// núcleo que atiende WhatsApp, pero nada sale por Meta y no se guarda nada en Contactos.
// Solo responde a usuarios del equipo con la sesión iniciada y el perfil activo.
//
// Pedido (POST, con «Authorization: Bearer <token de la sesión>»):
//   { modo: "mensaje", sesion, texto }          → Lomi responde
//   { modo: "boton", sesion, botonId, titulo }  → el «cliente» toca un botón (Autorizo / No autorizo)
//   { modo: "devolver", sesion }                → la conversación vuelve al agente
//   { modo: "reiniciar", sesion }               → borra la conversación de prueba
//   { modo: "estado" }                          → dice si falta alguna variable en Vercel
//   { modo: "textos" }                          → los mensajes fijos por defecto (los revisados por legal)

const { crearAgente } = require("./_lib/agente-mensajeria.js");
const { crearRepositorio, SUPABASE_URL } = require("./_lib/supabase-servidor.js");
const { crearClaude } = require("./_lib/claude.js");
const { MENSAJES } = require("./_lib/textos-lomi.js");

// Llave pública (la misma de config.js). Solo sirve para comprobar la sesión.
const SUPABASE_ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxuaW91ZWJwdXV1cWN0cmd4b2l3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgwODM5NjgsImV4cCI6MjA5MzY1OTk2OH0.8w-TcD8JKkHQpnybaj-ANz-4k4hznFoIwFr_ZatqPtA";

async function usuarioDeLaSesion(token){
  if(!token || token.length < 20) return null;
  try{
    const r = await fetch(SUPABASE_URL + "/auth/v1/user", { headers: { apikey: SUPABASE_ANON, Authorization: "Bearer " + token } });
    if(!r.ok) return null;
    const u = await r.json();
    return u && u.id ? u : null;
  }catch(e){ return null; }
}

async function leerCuerpo(req){
  if(req.body && typeof req.body === "object" && !Buffer.isBuffer(req.body)) return req.body;
  let crudo = typeof req.body === "string" ? req.body : (Buffer.isBuffer(req.body) ? req.body.toString("utf8") : "");
  if(!crudo){
    crudo = await new Promise(function(resolver){
      let t = "";
      req.on("data", function(c){ t += c; if(t.length > 100000) req.destroy(); });
      req.on("end", function(){ resolver(t); });
      req.on("error", function(){ resolver(""); });
    });
  }
  try{ return JSON.parse(crudo || "{}"); }catch(e){ return null; }
}

function responder(res, http, cuerpo){
  res.statusCode = http;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.end(JSON.stringify(cuerpo));
}

function resumen(conv){
  conv = conv || {};
  return { estado: conv.estado || "nuevo", atendido_por: conv.atendido_por || "agente", propiedad_actual_id: conv.propiedad_actual_id || null, motivo_humano: conv.motivo_humano || null, consentimientos: conv.consentimientos || {} };
}

async function atender(req, res){
  if(req.method !== "POST") return responder(res, 405, { ok: false, mensaje: "Esta dirección solo recibe solicitudes del panel." });
  const cuerpo = await leerCuerpo(req);
  if(!cuerpo) return responder(res, 400, { ok: false, mensaje: "La solicitud no se pudo leer." });

  const token = String((req.headers && (req.headers.authorization || req.headers.Authorization)) || "").replace(/^Bearer\s+/i, "");
  const usuario = await usuarioDeLaSesion(token);
  if(!usuario) return responder(res, 401, { ok: false, mensaje: "Tu sesión venció. Vuelve a entrar a la plataforma." });

  const faltan = ["SUPABASE_SERVICE_KEY", "ANTHROPIC_API_KEY"].filter(function(v){ return !process.env[v]; });
  if(cuerpo.modo === "estado") return responder(res, 200, { ok: true, faltan: faltan });
  if(cuerpo.modo === "textos") return responder(res, 200, { ok: true, mensajes: MENSAJES });
  if(faltan.length) return responder(res, 503, { ok: false, mensaje: "Falta configurar en Vercel: " + faltan.join(", ") + "." });

  const repo = crearRepositorio(process.env.SUPABASE_SERVICE_KEY);
  if(!(await repo.perfilActivo(usuario.id))) return responder(res, 403, { ok: false, mensaje: "Tu usuario no está activo en la plataforma." });

  const sesion = String(cuerpo.sesion || "").replace(/[^a-z0-9-]/gi, "").slice(0, 40);
  if(sesion.length < 6) return responder(res, 400, { ok: false, mensaje: "Falta el identificador de la conversación de prueba." });
  const idExterno = usuario.id + ":" + sesion;

  if(cuerpo.modo === "reiniciar" || cuerpo.modo === "devolver"){
    const conv = await repo.conversacion("simulador", idExterno, null);
    if(cuerpo.modo === "reiniciar"){ await repo.borrarConversacion(conv.id); return responder(res, 200, { ok: true }); }
    const c = await repo.actualizarConversacion(conv.id, { atendido_por: "agente", motivo_humano: null, estado: conv.propiedad_actual_id ? "informando" : "filtrando" });
    return responder(res, 200, { ok: true, conversacion: resumen(c) });
  }

  const texto = String(cuerpo.texto || "").slice(0, 2000).trim();
  if(cuerpo.modo === "mensaje" && !texto) return responder(res, 400, { ok: false, mensaje: "Escribe un mensaje." });
  if(cuerpo.modo !== "mensaje" && cuerpo.modo !== "boton") return responder(res, 400, { ok: false, mensaje: "Modo desconocido." });

  const agente = crearAgente({ repo: repo, claude: crearClaude(process.env.ANTHROPIC_API_KEY) });
  const entrada = cuerpo.modo === "boton"
    ? { canal: "simulador", idExterno: idExterno, nombre: "Prueba", tipo: "boton", botonId: String(cuerpo.botonId || ""), botonTitulo: String(cuerpo.titulo || ""), esperaMs: 0 }
    : { canal: "simulador", idExterno: idExterno, nombre: "Prueba", tipo: "texto", texto: texto, esperaMs: 0 };
  const r = await agente.atender(entrada);
  return responder(res, 200, { ok: true, salidas: r.salidas || [], herramientas: r.herramientas || [], alertas: r.alertas || [], humano: !!r.humano, conversacion: resumen(r.conversacion) });
}

module.exports = async function handler(req, res){
  try{ await atender(req, res); }
  catch(e){
    console.error("mensajeria-simulador:", e && e.message);
    try{ responder(res, 500, { ok: false, mensaje: "Lomi tuvo un problema para responder: " + String(e && e.message || "").slice(0, 200) }); }catch(_){}
  }
};
