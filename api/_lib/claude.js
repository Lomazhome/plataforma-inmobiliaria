// Llamada a Claude (API de Anthropic) para Lomi. Mismo esquema que api/agente-marketing.js:
// la clave vive en Vercel (ANTHROPIC_API_KEY) y el modelo se puede cambiar con ANTHROPIC_MODEL.

const API_CLAUDE = "https://api.anthropic.com/v1/messages";
const MODELO_BASE = "claude-sonnet-5-5";
const MODELO_RESPALDO = "claude-haiku-4-5"; // solo si el modelo principal no existe en la cuenta
const TIEMPO_MAX_MS = 25000;

function crearClaude(clave){
  const modelos = [process.env.ANTHROPIC_MODEL, MODELO_BASE, MODELO_RESPALDO].filter(function(m, i, a){ return m && a.indexOf(m) === i; });

  // pedido: { system, messages, tools }. Devuelve la respuesta de la API tal cual.
  return async function llamar(pedido){
    let ultimoError = null;
    for(let i = 0; i < modelos.length; i++){
      const corte = new AbortController();
      const reloj = setTimeout(function(){ corte.abort(); }, TIEMPO_MAX_MS);
      try{
        const cuerpo = Object.assign({ model: modelos[i], max_tokens: 900 }, pedido);
        const r = await fetch(API_CLAUDE, {
          method: "POST",
          headers: { "content-type": "application/json", "x-api-key": clave, "anthropic-version": "2023-06-01" },
          body: JSON.stringify(cuerpo),
          signal: corte.signal
        });
        const datos = await r.json().catch(function(){ return {}; });
        if(r.ok) return datos;
        ultimoError = new Error("Claude " + r.status + ": " + JSON.stringify(datos.error || datos).slice(0, 300));
        if(r.status !== 404) break; // solo se prueba el siguiente modelo si este no existe
      }catch(e){
        ultimoError = e;
        break;
      }finally{
        clearTimeout(reloj);
      }
    }
    throw ultimoError || new Error("Claude sin respuesta");
  };
}

module.exports = { crearClaude: crearClaude };
