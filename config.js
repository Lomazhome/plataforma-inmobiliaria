// Lomaz Home - Configuracion de Supabase
// La anon key es publica y segura para usar en el frontend con RLS activado

const SUPABASE_URL = 'https://lniouebpuuuqctrgxoiw.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxuaW91ZWJwdXV1cWN0cmd4b2l3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgwODM5NjgsImV4cCI6MjA5MzY1OTk2OH0.8w-TcD8JKkHQpnybaj-ANz-4k4hznFoIwFr_ZatqPtA';

// WhatsApp comercial para handover de leads desde el chat ARIA
// Formato: codigo de pais + numero, sin '+' ni espacios
const LH_WHATSAPP_ASESOR = '573003300343';

// Exponer en window para que cualquier modulo pueda usarlos
if (typeof window !== 'undefined') {
  window.SUPABASE_URL = SUPABASE_URL;
  window.SUPABASE_ANON_KEY = SUPABASE_ANON_KEY;
  window.LH_WHATSAPP_ASESOR = LH_WHATSAPP_ASESOR;
}

// Para usar Supabase en HTML, incluye primero:
// <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
// Luego:
// const { createClient } = supabase;
// const db = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
