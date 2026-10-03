// Edge Function: confirmar-suscripcion
// Recibe el clic del enlace del correo de confirmacion (GET ?token=...),
// marca la suscripcion como confirmada y redirige a blog.html con el resultado.
// Secretos: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
//
// IMPORTANTE: publicar con "Verify JWT" DESACTIVADO, porque el enlace del correo
// no lleva credenciales. La seguridad la da el codigo unico (UUID) del enlace.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const BLOG = "https://www.lomazhome.com/blog.html";
const VIGENCIA_MS = 7 * 24 * 60 * 60 * 1000;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

function ir(resultado: string) {
  return new Response(null, {
    status: 303,
    headers: { Location: `${BLOG}?suscripcion=${resultado}#newsletter`, "Cache-Control": "no-store" },
  });
}

Deno.serve(async (req) => {
  if (req.method !== "GET") return new Response("Metodo no permitido", { status: 405 });

  const token = (new URL(req.url).searchParams.get("token") ?? "").toLowerCase();
  if (!UUID.test(token)) return ir("invalida");

  const sb = createClient(SUPABASE_URL, SERVICE_ROLE);
  const { data: fila, error } = await sb
    .from("suscriptores_blog")
    .select("email, token_enviado_en")
    .eq("token_confirmacion", token)
    .maybeSingle();
  if (error) return ir("error");
  if (!fila) return ir("invalida");

  const enviado = fila.token_enviado_en ? new Date(fila.token_enviado_en).getTime() : 0;
  if (Date.now() - enviado > VIGENCIA_MS) return ir("vencida");

  const { error: updErr } = await sb
    .from("suscriptores_blog")
    .update({ confirmado: true, token_confirmacion: null })
    .eq("token_confirmacion", token);
  if (updErr) return ir("error");

  return ir("confirmada");
});
