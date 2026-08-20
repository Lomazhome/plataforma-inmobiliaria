// =============================================================
// Edge Function: fincaraiz-webhook
// Receptor del webhook de Fincaraiz. Fincaraiz llama a esta URL
// cuando una tarea de integracion (POST/PATCH /listing) finaliza.
// Lee el objeto task, extrae status + listing_id + external_code
// y actualiza la tabla publicaciones_portales de LoMaz Home.
//
// Seguridad: la spec de Fincaraiz NO documenta firma de callback,
// por eso exigimos un parametro secreto propio en la URL (?k=...)
// que debe coincidir con el secret WEBHOOK_SHARED_SECRET.
//
// Secretos usados:
//   SUPABASE_URL                (auto)
//   SUPABASE_SERVICE_ROLE_KEY   (auto)
//   WEBHOOK_SHARED_SECRET       (defina uno propio en Secrets)
// =============================================================
import { createClient } from "jsr:@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}

// Extrae los datos utiles del objeto task de Fincaraiz.
// listing_id vive en task.content[0].listing_id (estructura real confirmada),
// con fallback a task.messages.listings[0].
function readTask(task: any) {
  const c0 = Array.isArray(task?.content) ? task.content[0] : (task?.content ?? null);
  const l = (task?.messages?.listings && task.messages.listings[0]) ? task.messages.listings[0] : null;
  const status = (c0 && c0.status) || task?.status || null;
  const listing_id = (c0 && c0.listing_id != null) ? c0.listing_id
                   : (l && l.listing_id != null) ? l.listing_id
                   : null;
  const external_code = (c0 && c0.external_code != null) ? c0.external_code : null;
  const error = (c0 && c0.error && (c0.error.message || c0.error))
             || (l && l.error && (l.error.message || l.error))
             || null;
  return { status, listing_id, external_code, error };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ ok: false, msg: "Metodo no permitido" }, 405);

  // --- Validacion del secreto compartido (?k=...) ---
  const SHARED = Deno.env.get("WEBHOOK_SHARED_SECRET") || "";
  const url = new URL(req.url);
  const k = url.searchParams.get("k") || req.headers.get("x-webhook-secret") || "";
  if (!SHARED || k !== SHARED) {
    return json({ ok: false, msg: "No autorizado" }, 401);
  }

  // --- Parsear el cuerpo (objeto task o { task }) ---
  let payload: any = null;
  try { payload = await req.json(); } catch { return json({ ok: false, msg: "JSON invalido" }, 400); }
  const task = payload?.task ?? payload;
  const info = readTask(task);

  if (info.external_code == null) {
    return json({ ok: true, handled: false, msg: "Sin external_code, nada que actualizar" });
  }

  const propiedadId = Number(info.external_code);
  if (!Number.isFinite(propiedadId)) {
    return json({ ok: true, handled: false, msg: "external_code no numerico" });
  }

  const st = String(info.status || "").toUpperCase();
  let estado: string;
  let mensaje: string;
  if (st === "COMPLETED" || st === "FORWARDED") {
    estado = "publicado";
    mensaje = "Fincaraiz: integracion completada" + (info.listing_id ? " (listing " + info.listing_id + ")" : "");
  } else if (st === "ERROR") {
    estado = "error";
    mensaje = "Fincaraiz: " + (info.error || "la integracion finalizo con error");
  } else {
    return json({ ok: true, handled: false, msg: "Estado no final: " + st });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const update: Record<string, unknown> = {
    estado,
    mensaje,
    fecha: new Date().toISOString(),
  };
  if (info.listing_id) update.url_publicacion = String(info.listing_id);

  const { error: upErr, data: upData } = await supabase
    .from("publicaciones_portales")
    .update(update)
    .eq("propiedad_id", propiedadId)
    .eq("portal", "fincaraiz")
    .select("id");

  if (upErr) {
    return json({ ok: false, msg: "Error al actualizar", detail: String(upErr.message || upErr) }, 500);
  }

  return json({
    ok: true,
    handled: true,
    propiedad_id: propiedadId,
    estado,
    rows: Array.isArray(upData) ? upData.length : 0,
  });
});
