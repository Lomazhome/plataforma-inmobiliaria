// Edge Function: notificar-articulo
// Envia un correo a los suscriptores confirmados cuando se publica un articulo.
// Se dispara via Database Webhook al insertar/actualizar articulos_blog.
// Secretos: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, RESEND_API_KEY, FROM_EMAIL

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL   = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_ROLE   = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? "";
const FROM_EMAIL     = Deno.env.get("FROM_EMAIL") ?? "LoMaz Home <noreply@lomazhome.com>";
const SITE_URL       = "https://www.lomazhome.com";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status, headers: { ...CORS, "Content-Type": "application/json" },
  });
}

function plantillaHTML(articulo: any, email: string) {
  const NAVY = "#0d1b2e", NAVY2 = "#12294a", GOLD = "#c9a96e";
  const url = `${SITE_URL}/articulo.html?id=${articulo.id}`;
  const img = articulo.imagen_url
    ? `<tr><td style="padding:0 40px 20px;"><img src="${articulo.imagen_url}" alt="" width="100%" style="border-radius:10px;display:block;max-width:100%;"></td></tr>`
    : "";
  const cat = articulo.categoria
    ? `<div style="font-size:12px;color:${GOLD};letter-spacing:2px;text-transform:uppercase;opacity:.8;margin-bottom:10px;">${articulo.categoria}</div>`
    : "";
  return `<!DOCTYPE html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:${NAVY};font-family:Georgia,serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${NAVY};padding:40px 16px;">
<tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:${NAVY2};border:1px solid ${GOLD};border-radius:14px;overflow:hidden;">
<tr><td align="center" style="padding:36px 40px 8px;">
<div style="font-size:28px;font-weight:bold;color:${GOLD};letter-spacing:1px;">LoMaz Home</div>
<div style="font-size:11px;color:${GOLD};letter-spacing:3px;text-transform:uppercase;opacity:.8;margin-top:6px;">Nuevo articulo en el blog</div>
</td></tr>
<tr><td style="padding:8px 40px;"><div style="height:1px;background:${GOLD};opacity:.4;"></div></td></tr>
${img}
<tr><td style="padding:20px 40px 4px;">${cat}
<h1 style="margin:0;font-size:24px;color:${GOLD};font-weight:normal;line-height:1.35;">${articulo.titulo}</h1>
</td></tr>
<tr><td style="padding:10px 40px 8px;">
<p style="margin:0;font-size:15px;color:${GOLD};line-height:1.7;opacity:.92;">${articulo.extracto ?? ""}</p>
</td></tr>
<tr><td align="center" style="padding:20px 40px 36px;">
<a href="${url}" style="display:inline-block;background:${GOLD};color:${NAVY};text-decoration:none;font-size:14px;font-weight:bold;letter-spacing:1px;padding:13px 34px;border-radius:6px;">LEER ARTICULO</a>
</td></tr>
<tr><td style="padding:0 40px;"><div style="height:1px;background:${GOLD};opacity:.25;"></div></td></tr>
<tr><td align="center" style="padding:20px 40px 32px;">
<p style="margin:0;font-size:12px;color:${GOLD};opacity:.65;line-height:1.6;">LoMaz Home Inmobiliaria &middot; Bogota, Colombia<br>Recibiste este correo porque ${email} esta suscrito a nuestro blog.</p>
</td></tr>
</table>
</td></tr>
</table>
</body></html>`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "Metodo no permitido" }, 405);

  let record: any = null;
  try {
    const body = await req.json();
    record = body?.record ?? body;
  } catch (_e) {
    return json({ error: "JSON invalido" }, 400);
  }

  if (!record?.id) return json({ error: "Sin registro" }, 400);

  const sb = createClient(SUPABASE_URL, SERVICE_ROLE);

  const { data: art } = await sb
    .from("articulos_blog")
    .select("id, titulo, extracto, categoria, imagen_url, estado, notificado")
    .eq("id", record.id)
    .single();

  if (!art)                       return json({ skip: "no existe" });
  if (art.estado !== "publicado") return json({ skip: "no publicado" });
  if (art.notificado === true)    return json({ skip: "ya notificado" });

  const { data: subs } = await sb
    .from("suscriptores_blog")
    .select("email")
    .eq("confirmado", true);

  const emails = (subs ?? []).map((s: any) => s.email).filter(Boolean);

  let enviados = 0;
  if (RESEND_API_KEY && emails.length > 0) {
    for (const email of emails) {
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
            subject: `Nuevo articulo: ${art.titulo}`,
            html: plantillaHTML(art, email),
          }),
        });
        if (r.ok) enviados++;
        else console.error("Resend error:", await r.text());
      } catch (e) { console.error("Fallo envio a", email, e); }
    }
  }

  await sb.from("articulos_blog").update({ notificado: true }).eq("id", art.id);

  return json({ ok: true, suscriptores: emails.length, enviados });
});
