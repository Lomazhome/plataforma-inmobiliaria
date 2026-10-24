// Canales que quedan preparados para después.
//
// - Messenger (página de Facebook) e Instagram (mensajes directos): Fase 2. Llegan al mismo
//   webhook (object "page" y "instagram") y usan la Send API de Meta. Hasta que se
//   construyan, sus avisos se reciben y se ignoran.
// - TikTok: no tiene API pública de mensajes directos. Los clientes de TikTok llegan a
//   WhatsApp por un enlace wa.me con la referencia del inmueble ya escrita. Este adaptador
//   queda vacío por si TikTok abre el acceso en el futuro.

function pendiente(canal){
  return {
    leer: function(){ return []; },
    crearEnvio: function(){ return async function(){ throw new Error("El canal " + canal + " todavía no está conectado (Fase 2)."); }; }
  };
}

module.exports = { messenger: pendiente("facebook"), instagram: pendiente("instagram"), tiktok: pendiente("tiktok") };
