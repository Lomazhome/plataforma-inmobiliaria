// Adaptador de WhatsApp (WhatsApp Cloud API de Meta) para Lomi.
//
// - leer(cuerpo): convierte el aviso que manda Meta al webhook en una lista de mensajes
//   con el formato del núcleo (api/_lib/agente-mensajeria.js).
// - enviar(destino, salidas): manda las respuestas de Lomi en orden (texto, foto o botones).
//
// Variables en Vercel: WA_PHONE_NUMBER_ID y WA_TOKEN (token permanente de usuario del sistema).

const GRAPH = "https://graph.facebook.com/v21.0";

function leer(cuerpo){
  const salida = [];
  ((cuerpo && cuerpo.entry) || []).forEach(function(entrada){
    ((entrada && entrada.changes) || []).forEach(function(cambio){
      const v = (cambio && cambio.value) || {};
      const nombres = {};
      (v.contacts || []).forEach(function(c){ if(c && c.wa_id) nombres[c.wa_id] = c.profile && c.profile.name; });
      (v.messages || []).forEach(function(m){
        if(!m || !m.from || !m.id) return;
        const msj = { canal: "whatsapp", idExterno: String(m.from), nombre: nombres[m.from] || null, idMensaje: String(m.id), tipo: "otro", texto: "" };
        if(m.type === "text" && m.text){ msj.tipo = "texto"; msj.texto = String(m.text.body || ""); }
        else if(m.type === "interactive" && m.interactive){
          const r = m.interactive.button_reply || m.interactive.list_reply || {};
          msj.tipo = "boton"; msj.botonId = r.id || ""; msj.botonTitulo = r.title || "";
        }
        else if(m.type === "button" && m.button){ msj.tipo = "boton"; msj.botonId = m.button.payload || ""; msj.botonTitulo = m.button.text || ""; }
        else if(m.type === "image"){ msj.tipo = "imagen"; msj.texto = (m.image && m.image.caption) || ""; }
        else if(m.type === "audio" || m.type === "voice"){ msj.tipo = "audio"; }
        // Anuncio «clic a WhatsApp»: Meta manda los datos del anuncio en el primer mensaje.
        if(m.referral){
          const r = m.referral;
          msj.referral = { ad_id: r.source_id || null, tipo: r.source_type || null, source_url: r.source_url || null, headline: r.headline || null, body: r.body || null, ctwa_clid: r.ctwa_clid || null };
        }
        salida.push(msj);
      });
    });
  });
  return salida;
}

function aMeta(destino, s){
  if(s.tipo === "imagen") return { messaging_product: "whatsapp", to: destino, type: "image", image: { link: s.url, caption: s.pie || undefined } };
  if(s.tipo === "botones") return {
    messaging_product: "whatsapp", to: destino, type: "interactive",
    interactive: { type: "button", body: { text: String(s.texto).slice(0, 1024) }, action: { buttons: s.botones.slice(0, 3).map(function(b){ return { type: "reply", reply: { id: b.id, title: String(b.titulo).slice(0, 20) } }; }) } }
  };
  return { messaging_product: "whatsapp", to: destino, type: "text", text: { body: String(s.texto).slice(0, 4096), preview_url: /https?:\/\//.test(s.texto) } };
}

function crearEnvio(opciones){
  opciones = opciones || {};
  const idNumero = opciones.idNumero || process.env.WA_PHONE_NUMBER_ID;
  const token = opciones.token || process.env.WA_TOKEN;
  const pedir = opciones.fetch || fetch;
  return async function enviar(destino, salidas){
    if(!idNumero || !token) throw new Error("Faltan WA_PHONE_NUMBER_ID o WA_TOKEN en Vercel.");
    for(let i = 0; i < salidas.length; i++){
      const r = await pedir(GRAPH + "/" + idNumero + "/messages", {
        method: "POST",
        headers: { Authorization: "Bearer " + token, "Content-Type": "application/json" },
        body: JSON.stringify(aMeta(destino, salidas[i]))
      });
      if(!r.ok) throw new Error("WhatsApp " + r.status + ": " + (await r.text()).slice(0, 300));
    }
  };
}

module.exports = { leer: leer, crearEnvio: crearEnvio, aMeta: aMeta };
