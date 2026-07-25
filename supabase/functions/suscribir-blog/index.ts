// Edge Function: suscribir-blog
// Guarda el correo en public.suscriptores_blog y envia un email de
// confirmacion (fondo azul + letras doradas + agradecimiento) via Resend.
// Secretos: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, RESEND_API_KEY, FROM_EMAIL

import { createClient } from `https://esm.sh/@supabase/supabase-js@2`;

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? "";
const FROM_EMAIL = Deno.env.get("FROM_EMAIL") ?? "LoMaz Home <noreply@lomazhome.com>";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}

function esValido(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function plantillaHTML(email: string) {
  const NAVY = "#0d1b2e";
  const NAVY2 = "#12294a";
  const GOLD = "#c9a96e";
  return `<!DOCTYPE html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:${NAVY};font-family:Georgia,serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${NAVY};padding:40px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:${NAVY2};border:1px solid ${GOLD};border-radius:14px;overflow:hidden;">
        <tr><td align="center" style="padding:40px 40px 8px;">
          <div style="font-size:30px;font-weight:bold;color:${GOLD};letter-spacing:1px;">LoMaz Home</div>
          <div style="font-size:12px;color:${GOLD};letter-spacing:3px;text-transform:uppercase;opacity:.8;margin-top:6px;">Inmobiliaria Boutique</div>
        </td></tr>
        <tr><td style="padding:8px 40px;"><div style="height:1px;background:${GOLD};opacity:.4;"></div></td></tr>
        <tr><td align="center" style="padding:24px 40px 8px;">
          <h1 style="margin:0;font-size:26px;color:${GOLD};font-weight:normal;line-height:1.3;">Te has suscrito con exito</h1>
        </td></tr>
        <tr><td align="center" style="padding:8px 44px 8px;">
          <p style="margin:0;font-size:16px;color:${GOLD};line-height:1.7;">Gracias por unirte al <strong>Blog de Consejos Inmobiliarios de LoMaz Home</strong>.</p>
        </td></tr>
        <tr><td align="center" style="padding:8px 44px 24px;">
          <p style="margin:0;font-size:15px;color:${GOLD};line-height:1.7;opacity:.9;">A partir de ahora recibiras nuestros articulos, analisis de mercado y oportunidades de inversion directo en tu bandeja de entrada. Te damos la mas calurosa bienvenida a nuestra comunidad.</p>
        </td></tr>
        <tr><td align="center" style="padding:8px 40px 36px;">
          <a href="https://www.lomazhome.com/blog.html" style="display:inline-block;background:${GOLD};color:${NAVY};text-decoration:none;font-size:14px;font-weight:bold;letter-spacing:1px;padding:13px 30px;border-radius:6px;">EXPLORAR EL BLOG</a>
        </td></tr>
        <tr><td style="padding:0 40px;"><div style="height:1px;background:${GOLD};opacity:.25;"></div></td></tr>
        <tr><td align="center" style="padding:20px 40px 34px;">
          <p style="margin:0;font-size:12px;color:${GOLD};opacity:.65;line-height:1.6;">LoMaz Home Inmobiliaria &middot; Bogota, Colombia<br>Recibiste este correo porque ${email} se suscribio a nuestro blog.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "Metodo no permitido" }, 405);

  let email = "";
  try {
    const body = await req.json();
    email = (body?.email ?? "").toString().trim().toLowerCase();
  } catch (_e) {
    return json({ error: "JSON invalido" }, 400);
  }

  if (!esValido(email)) return json({ error: "Correo invalido" }, 400);

  const sb = createClient(SUPABASE_URL, SERVICE_ROLE);
  const { error: dbErr } = await sb
    .from("suscriptores_blog")
    .upsert({ email, confirmado: true }, { onConflict: "email" });
  if (dbErr) return json({ error: "No se pudo guardar la suscripcion" }, 500);

  if (RESEND_API_KEY) {
    try {
      const r = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: FROM_EMAIL,
          to: [email],
          subject: "Bienvenido al Blog de Consejos Inmobiliarios de LoMaz Home",
          html: plantillaHTML(email),
        }),
      });
      if (!r.ok) { console.error("Resend error:", await r.text()); }
    } catch (e) { console.error("Fallo al enviar correo:", e); }
  }

  return json({ ok: true, mensaje: "Suscripcion registrada" });
});
