// Webhook de Meta para Lomi: aquí llegan los mensajes de WhatsApp (y en la Fase 2 los de
// Messenger e Instagram). Dirección que se registra en Meta: https://www.lomazhome.com/api/meta-webhook
//
// Qué hace, en orden:
//   1. GET: Meta comprueba el webhook con hub.verify_token (variable META_VERIFY_TOKEN).
//   2. POST: verifica la firma X-Hub-Signature-256 con META_APP_SECRET; sin firma válida, se descarta.
//   3. Responde 200 a Meta de inmediato y procesa el mensaje después (con waitUntil de Vercel),
//      porque Meta reintenta si la respuesta tarda.
//   4. Cada mensaje se guarda con su id de Meta: si Meta lo reenvía, no se responde dos veces.
//
// Variables en Vercel: META_VERIFY_TOKEN, META_APP_SECRET, WA_PHONE_NUMBER_ID, WA_TOKEN,
// SUPABASE_SERVICE_KEY y ANTHROPIC_API_KEY.

const crypto = require("crypto");
const { crearAgente } = require("./_lib/agente-mensajeria.js");
const { crearRepositorio } = require("./_lib/supabase-servidor.js");
const { crearClaude } = require("./_lib/claude.js");
const whatsapp = require("./_lib/canales/whatsapp.js");
const otros = require("./_lib/canales/otros.js");

let waitUntil = null;
try{ waitUntil = require("@vercel/functions").waitUntil; }catch(e){ waitUntil = null; }

function firmaValida(crudo, firma, secreto){
  if(!secreto || !firma || !/^sha256=[0-9a-f]{64}$/i.test(firma)) return false;
  const esperada = Buffer.from("sha256=" + crypto.createHmac("sha256", secreto).update(crudo).digest("hex"));
  const recibida = Buffer.from(String(firma).toLowerCase());
  return esperada.length === recibida.length && crypto.timingSafeEqual(esperada, recibida);
}

async function leerCrudo(req){
  if(Buffer.isBuffer(req.rawBody)) return req.rawBody;
  const crudo = await new Promise(function(resolver){
    const partes = [];
    let total = 0;
    req.on("data", function(c){ total += c.length; if(total > 1000000){ req.destroy(); return; } partes.push(Buffer.from(c)); });
    req.on("end", function(){ resolver(Buffer.concat(partes)); });
    req.on("error", function(){ resolver(Buffer.alloc(0)); });
  });
  if(crudo.length) return crudo;
  if(Buffer.isBuffer(req.body)) return req.body;
  if(typeof req.body === "string") return Buffer.from(req.body);
  return crudo;
}

function texto(res, http, cuerpo){
  res.statusCode = http;
  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.end(cuerpo);
}

function dependenciasReales(){
  const repo = crearRepositorio(process.env.SUPABASE_SERVICE_KEY);
  return {
    repo: repo,
    agente: crearAgente({ repo: repo, claude: crearClaude(process.env.ANTHROPIC_API_KEY) }),
    envios: { whatsapp: whatsapp.crearEnvio() }
  };
}

// Se arma así para que las pruebas puedan pasar dependencias falsas.
function crearManejador(opciones){
  opciones = opciones || {};
  const entorno = opciones.entorno || process.env;
  const obtener = opciones.dependencias || dependenciasReales;
  const enSegundoPlano = opciones.enSegundoPlano !== undefined ? opciones.enSegundoPlano : waitUntil;

  async function procesar(cuerpo){
    let entradas = [];
    if(cuerpo.object === "whatsapp_business_account") entradas = whatsapp.leer(cuerpo);
    else if(cuerpo.object === "page") entradas = otros.messenger.leer(cuerpo);
    else if(cuerpo.object === "instagram") entradas = otros.instagram.leer(cuerpo);
    if(!entradas.length) return;

    const dep = obtener();
    const config = await dep.repo.config();
    await Promise.all(entradas.map(async function(entrada){
      const activo = config["activo_" + entrada.canal];
      const enviar = dep.envios[entrada.canal];
      if(!activo || !enviar) return; // canal apagado desde el panel: no se responde
      try{
        const r = await dep.agente.atender(entrada);
        if(r.salidas && r.salidas.length) await enviar(entrada.idExterno, r.salidas);
      }catch(e){
        console.error("meta-webhook:", entrada.canal, e && e.message);
      }
    }));
  }

  return async function manejador(req, res){
    if(req.method === "GET"){
      const q = req.query || Object.fromEntries(new URL(req.url, "http://x").searchParams);
      if(q["hub.mode"] === "subscribe" && entorno.META_VERIFY_TOKEN && q["hub.verify_token"] === entorno.META_VERIFY_TOKEN) return texto(res, 200, String(q["hub.challenge"] || ""));
      return texto(res, 403, "Token de verificación inválido.");
    }
    if(req.method !== "POST") return texto(res, 405, "Método no permitido.");

    const crudo = await leerCrudo(req);
    const firma = req.headers && (req.headers["x-hub-signature-256"] || req.headers["X-Hub-Signature-256"]);
    if(!firmaValida(crudo, firma, entorno.META_APP_SECRET)) return texto(res, 401, "Firma inválida.");

    let cuerpo;
    try{ cuerpo = JSON.parse(crudo.toString("utf8")); }catch(e){ return texto(res, 400, "Cuerpo inválido."); }

    const trabajo = procesar(cuerpo).catch(function(e){ console.error("meta-webhook:", e && e.message); });
    if(enSegundoPlano){
      enSegundoPlano(trabajo);
      return texto(res, 200, "ok");
    }
    await trabajo; // sin waitUntil (por ejemplo, en pruebas locales) se procesa antes de responder
    return texto(res, 200, "ok");
  };
}

module.exports = crearManejador();
// La firma se calcula sobre el cuerpo tal cual llega: no se deja que Vercel lo convierta antes.
module.exports.config = { api: { bodyParser: false } };
module.exports.crearManejador = crearManejador;
module.exports.firmaValida = firmaValida;
