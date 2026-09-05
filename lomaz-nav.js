/**
 * LoMaz Home — Universal Navigation System v2
 * Navbar + Chat Widget ARIA compacto + FAB orb
 */
(function() {
'use strict';

const S = `
:root {
  --lm-navy:#0D1B2E; --lm-navy-light:#162540; --hlm-gold:#c9a96e;
  --lm-gold-dark:#a07840; --lm-cream:#f5f0e8; --lm-cream-light:#faf8f4;
  --lm-ink:#1c1917; --lm-ink-soft:#4a4540; --lm-white:#ffffff;
  --lm-serif:'Cormorant Garamond','Georgia',serif;
  --lm-sans:'Inter','Helvetica Neue',sans-serif;
  --lm-tr:0.25s cubic-bezier(0.4,0,0.2,1);
  --lm-sh:0 4px 24px rgba(13,27,46,0.12);
}
/* Hide old navs and ARIA legacy */
#lhNav,#lhOverlay,.nav__overlay,
nav.topnav,nav.nav__primary,nav.legacy-nav,nav.main-nav,nav.top-bar,nav.navbar:not(#lm-nav) { display:none!important; }
#aria-fab,#aria-overlay,#aria-panel { display:none!important; }
/* Hide WhatsApp float */
.wa-float,.whatsapp-float,.float-wa,.wa-btn-float,
a.wa-float,[class*="wa-float"],[class*="whatsapp-float"] {
  display:none!important; visibility:hidden!important;
}
/* Progress bar */
#lm-progress {
  position:fixed; top:0; left:0; height:2px;
  background:linear-gradient(90deg,var(--lm-navy),var(--lm-gold));
  transition:width 0.1s; z-index:99999; pointer-events:none;
}
/* NAV */
#lm-nav {
  position:fixed; top:0; left:0; right:0; z-index:9999;
  font-family:var(--lm-sans); transition:all var(--lm-tr);
}
#lm-nav.lm-scrolled { background:rgba(255,255,255,0.97); backdrop-filter:blur(12px); box-shadow:var(--lm-sh); }
#lm-nav.lm-dark { background:rgba(13,27,46,0.97); backdrop-filter:blur(12px); }
#lm-nav.lm-transparent { background:transparent; }
.lm-nav-inner {
  display:flex; align-items:center; justify-content:space-between;
  padding:0 2rem; height:64px; max-width:1440px; margin:0 auto;
}
.lm-logo {
  text-decoration:none; font-family:var(--lm-serif);
  font-size:1.35rem; color:var(--lm-ink); flex-shrink:0;
}
.lm-logo span { color:var(--lm-gold); font-style:italic; }
#lm-nav.lm-dark .lm-logo { color:var(--lm-white); }
.lm-menu { display:flex; align-items:center; gap:0.25rem; list-style:none; margin:0; padding:0; }
.lm-item { position:relative; } .lm-item::after { content:''; position:absolute; bottom:-8px; left:0; right:0; height:8px; }
.lm-link {
  display:flex; align-items:center; gap:4px; padding:0.5rem 0.75rem;
  font-size:0.78rem; font-weight:500; letter-spacing:0.08em; text-transform:uppercase;
  text-decoration:none; color:var(--lm-ink-soft); border-radius:4px;
  transition:color var(--lm-tr); white-space:nowrap; position:relative;
}
.lm-link:hover { color:var(--lm-ink); }
.lm-link svg { width:10px; height:10px; opacity:0.5; transition:transform var(--lm-tr); }
.lm-item:hover .lm-link svg { transform:rotate(180deg); opacity:1; }
#lm-nav.lm-dark .lm-link { color:rgba(255,255,255,0.7); }
#lm-nav.lm-dark .lm-link:hover { color:var(--lm-white); }
.lm-link.lm-active { color:var(--lm-ink); }
.lm-link.lm-active::after {
  content:''; position:absolute; bottom:-2px; left:0.75rem; right:0.75rem;
  height:1px; background:var(--lm-gold);
}
.lm-dropdown {
  position:absolute; top:calc(100% + 2px); left:0; min-width:220px;
  background:var(--lm-white); border:1px solid rgba(0,0,0,0.06);
  border-radius:8px; box-shadow:0 12px 40px rgba(0,0,0,0.12);
  padding:0.5rem; opacity:0; visibility:hidden; transform:translateY(-8px);
  transition:all 0.2s cubic-bezier(0.4,0,0.2,1); pointer-events:none;
}
.lm-item:hover .lm-dropdown {
  opacity:1; visibility:visible; transform:translateY(0); pointer-events:all;
}
.lm-dropdown a {
  display:flex; align-items:center; gap:10px; padding:0.6rem 0.875rem;
  text-decoration:none; color:var(--lm-ink-soft); font-size:0.83rem;
  border-radius:6px; transition:all 0.15s;
}
.lm-dropdown a:hover { background:var(--lm-cream-light); color:var(--lm-ink); }
.dd-icon { font-size:1rem; flex-shrink:0; }
.dd-text { display:flex; flex-direction:column; gap:1px; }
.dd-label { font-weight:500; font-size:0.83rem; }
.dd-sub { font-size:0.7rem; color:var(--lm-ink-soft); opacity:0.7; }
.lm-nav-right { display:flex; align-items:center; gap:0.75rem; flex-shrink:0; }
.lm-aria-nav-btn {
  display:flex; align-items:center; gap:6px;
  padding:0.35rem 0.875rem 0.35rem 0.6rem;
  background:rgba(255,255,255,0.55); backdrop-filter:blur(14px) saturate(160%); -webkit-backdrop-filter:blur(14px) saturate(160%); color:var(--lm-gold-dark);
  border:1px solid rgba(201,169,110,0.3); border-radius:20px;
  font-size:0.75rem; font-weight:600; letter-spacing:0.06em;
  cursor:pointer; font-family:var(--lm-sans); transition:all var(--lm-tr);
}
.lm-aria-nav-btn:hover { background:rgba(255,255,255,0.75); border-color:rgba(201,169,110,0.55); box-shadow:0 4px 18px rgba(201,169,110,0.18); }
.lm-aria-dot {
  width:5px; height:5px; background:var(--lm-gold); border-radius:50%;
  box-shadow:0 0 6px rgba(201,169,110,0.7); animation:lm-pulse 2s infinite;
}
@keyframes lm-pulse {
  0%,100% { opacity:1; transform:scale(1); }
  50% { opacity:0.7; transform:scale(0.85); }
}
.lm-asesores-btn {
  padding:0.4rem 1rem; border:1px solid var(--lm-ink); border-radius:2px;
  font-size:0.72rem; font-weight:600; letter-spacing:0.1em; text-transform:uppercase;
  color:var(--lm-ink); text-decoration:none; transition:all var(--lm-tr);
}
.lm-asesores-btn:hover { background:var(--lm-ink); color:var(--lm-white); }
#lm-nav.lm-dark .lm-asesores-btn { border-color:rgba(255,255,255,0.4); color:var(--lm-white); }
#lm-nav.lm-dark .lm-asesores-btn:hover { background:var(--lm-white); color:var(--lm-navy); }
.lm-hamburger { display:none; flex-direction:column; gap:4px; cursor:pointer; padding:4px; background:none; border:none; }
.lm-hamburger span { display:block; width:22px; height:1.5px; background:var(--lm-ink); }
#lm-nav.lm-dark .lm-hamburger span { background:var(--lm-white); }
/* FAB ORB */
#lm-aria-fab {
  position:fixed; bottom:28px; right:28px; z-index:99990;
  cursor:pointer; display:flex; align-items:center; justify-content:center;
}
.lm-fab-orb { position:relative; width:52px; height:52px; }
.lm-fab-ring {
  position:absolute; inset:-6px; border-radius:50%;
  border:1px solid rgba(201,169,110,0.25);
  animation:lm-frp 3s ease-in-out infinite;
}
.lm-fab-ring-2 {
  position:absolute; inset:-12px; border-radius:50%;
  border:1px solid rgba(201,169,110,0.12);
  animation:lm-frp 3s ease-in-out infinite 0.8s;
}
@keyframes lm-frp {
  0%,100% { opacity:0; transform:scale(0.9); }
  50% { opacity:1; transform:scale(1); }
}
.lm-fab-circle {
  position:relative; width:52px; height:52px; border-radius:50%;
  background:radial-gradient(135deg at 35% 35%,#1e3a5f,#0D1B2E);
  border:1px solid rgba(201,169,110,0.4);
  box-shadow:0 0 0 1px rgba(201,169,110,0.15),0 8px 32px rgba(13,27,46,0.4),0 0 20px rgba(201,169,110,0.12);
  display:flex; align-items:center; justify-content:center;
  transition:all 0.35s cubic-bezier(0.34,1.56,0.64,1);
}
#lm-aria-fab:hover .lm-fab-circle {
  transform:scale(1.08);
  box-shadow:0 0 0 1px rgba(201,169,110,0.3),0 12px 40px rgba(13,27,46,0.5),0 0 30px rgba(201,169,110,0.25);
}
.lm-fab-letter {
  font-family:'Cormorant Garamond','Georgia',serif;
  font-size:1.4rem; font-weight:600; font-style:italic;
  color:var(--lm-gold); text-shadow:0 0 12px rgba(201,169,110,0.5);
  position:relative; z-index:2; line-height:1;
}
.lm-fab-status {
  position:absolute; bottom:2px; right:2px; width:10px; height:10px;
  background:#4ade80; border-radius:50%; border:2px solid white;
  box-shadow:0 0 8px rgba(74,222,128,0.6); animation:lm-pulse 2s infinite; z-index:3;
}
.lm-fab-tooltip {
  position:absolute; bottom:calc(100% + 10px); right:0;
  background:var(--lm-navy); color:var(--lm-white);
  font-family:var(--lm-sans); font-size:0.72rem; font-weight:500;
  padding:0.35rem 0.7rem; border-radius:6px;
  border:1px solid rgba(201,169,110,0.2); white-space:nowrap;
  opacity:0; transform:translateY(4px); transition:all 0.2s; pointer-events:none;
}
.lm-fab-tooltip::after {
  content:''; position:absolute; top:100%; right:18px;
  border:4px solid transparent; border-top-color:var(--lm-navy);
}
#lm-aria-fab:hover .lm-fab-tooltip { opacity:1; transform:translateY(0); }
/* CHAT WIDGET */
#lm-chat-widget {
  position:fixed; bottom:96px; right:28px; width:380px; height:520px;
  z-index:99980; display:flex; flex-direction:column; border-radius:16px;
  overflow:hidden; background:#0c1420; border:1px solid rgba(201,169,110,0.2);
  box-shadow:0 24px 80px rgba(0,0,0,0.4);
  font-family:var(--lm-sans); transform:scale(0.9) translateY(16px);
  transform-origin:bottom right; opacity:0; visibility:hidden;
  transition:all 0.3s cubic-bezier(0.34,1.56,0.64,1); pointer-events:none;
}
#lm-chat-widget.lm-chat-open {
  transform:scale(1) translateY(0); opacity:1; visibility:visible; pointer-events:all;
}
.lm-chat-header {
  display:flex; align-items:center; gap:10px; padding:14px 16px;
  background:linear-gradient(135deg,#0D1B2E,#1a2d4a);
  border-bottom:1px solid rgba(201,169,110,0.15); flex-shrink:0;
}
.lm-chat-avatar {
  width:36px; height:36px; border-radius:50%;
  background:radial-gradient(135deg,#1e3a5f,#0D1B2E);
  border:1px solid rgba(201,169,110,0.5);
  display:flex; align-items:center; justify-content:center;
  font-family:var(--lm-serif); font-style:italic;
  font-size:1rem; color:var(--lm-gold); flex-shrink:0;
}
.lm-chat-info { flex:1; min-width:0; }
.lm-chat-name { font-size:0.88rem; font-weight:600; color:#fff; margin:0; }
.lm-chat-status {
  display:flex; align-items:center; gap:5px;
  font-size:0.68rem; color:rgba(255,255,255,0.5); margin-top:1px;
}
.lm-chat-status-dot {
  width:5px; height:5px; background:#4ade80; border-radius:50%;
  box-shadow:0 0 6px rgba(74,222,128,0.7); animation:lm-pulse 2s infinite;
}
.lm-chat-actions { display:flex; gap:4px; align-items:center; }
.lm-chat-action-btn,.lm-chat-close-btn {
  width:28px; height:28px; background:rgba(255,255,255,0.07);
  border:none; border-radius:6px; color:rgba(255,255,255,0.5);
  cursor:pointer; display:flex; align-items:center; justify-content:center;
  font-size:0.9rem; transition:all 0.15s;
}
.lm-chat-action-btn:hover { background:rgba(255,255,255,0.12); color:#fff; }
.lm-chat-close-btn { font-size:1.1rem; }
.lm-chat-close-btn:hover { background:rgba(220,50,50,0.2); color:#ff6b6b; }
.lm-chat-messages {
  flex:1; overflow-y:auto; padding:16px; display:flex;
  flex-direction:column; gap:12px; background:#0a1019; scroll-behavior:smooth;
}
.lm-chat-messages::-webkit-scrollbar { width:3px; }
.lm-chat-messages::-webkit-scrollbar-thumb { background:rgba(201,169,110,0.3); border-radius:2px; }
.lm-msg { display:flex; gap:8px; align-items:flex-end; animation:lm-mi 0.25s ease-out; }
@keyframes lm-mi { from{opacity:0;transform:translateY(8px);} to{opacity:1;transform:translateY(0);} }
.lm-msg.lm-msg-user { flex-direction:row-reverse; }
.lm-msg-bubble { max-width:82%; padding:10px 13px; border-radius:14px; font-size:0.82rem; line-height:1.55; word-break:break-word; }
.lm-msg-aria .lm-msg-bubble { background:rgba(13,27,46,0.7); border:1px solid rgba(201,169,110,0.12); color:rgba(255,255,255,0.9); border-radius:4px 14px 14px 14px; }
.lm-msg-user .lm-msg-bubble { background:linear-gradient(135deg,#c9a96e,#a07840); color:#0D1B2E; font-weight:500; border-radius:14px 14px 4px 14px; }
.lm-msg-avatar { width:24px; height:24px; border-radius:50%; background:radial-gradient(135deg,#1e3a5f,#0D1B2E); border:1px solid rgba(201,169,110,0.3); display:flex; align-items:center; justify-content:center; font-family:var(--lm-serif); font-style:italic; font-size:0.7rem; color:var(--lm-gold); flex-shrink:0; }
.lm-typing { display:flex; gap:8px; align-items:flex-end; animation:lm-mi 0.25s ease-out; }
.lm-typing-bubble { background:rgba(13,27,46,0.7); border:1px solid rgba(201,169,110,0.12); border-radius:4px 14px 14px 14px; padding:12px 16px; display:flex; gap:4px; align-items:center; }
.lm-typing-dot { width:5px; height:5px; background:rgba(201,169,110,0.6); border-radius:50%; animation:lm-tb 1.2s infinite ease-in-out; }
.lm-typing-dot:nth-child(2){animation-delay:0.15s;} .lm-typing-dot:nth-child(3){animation-delay:0.3s;}
@keyframes lm-tb { 0%,60%,100%{transform:translateY(0);} 30%{transform:translateY(-5px);} }
.lm-chat-welcome { flex:1; display:flex; flex-direction:column; align-items:center; justify-content:center; text-align:center; padding:1.5rem; gap:12px; }
.lm-chat-welcome-logo { width:52px; height:52px; border-radius:50%; background:radial-gradient(135deg,#1e3a5f,#0D1B2E); border:1px solid rgba(201,169,110,0.4); display:flex; align-items:center; justify-content:center; font-family:var(--lm-serif); font-style:italic; font-size:1.6rem; color:var(--lm-gold); text-shadow:0 0 16px rgba(201,169,110,0.5); box-shadow:0 0 24px rgba(201,169,110,0.12); margin-bottom:4px; }
.lm-chat-welcome h3 { font-family:var(--lm-serif); font-size:1.1rem; font-weight:600; color:#fff; margin:0; }
.lm-chat-welcome p { font-size:0.77rem; color:rgba(255,255,255,0.45); margin:0; line-height:1.5; }
.lm-chat-suggestions { display:flex; flex-direction:column; gap:6px; width:100%; margin-top:4px; }
.lm-suggestion-chip { background:rgba(201,169,110,0.07); border:1px solid rgba(201,169,110,0.18); border-radius:8px; padding:8px 12px; font-size:0.75rem; color:rgba(201,169,110,0.85); cursor:pointer; text-align:left; transition:all 0.15s; font-family:var(--lm-sans); width:100%; }
.lm-suggestion-chip:hover { background:rgba(201,169,110,0.12); border-color:rgba(201,169,110,0.35); color:var(--lm-gold); }
.lm-chat-input-area { padding:12px; background:#0c1420; border-top:1px solid rgba(255,255,255,0.05); flex-shrink:0; }
.lm-chat-input-row { display:flex; align-items:flex-end; gap:8px; background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.08); border-radius:12px; padding:8px 10px; transition:border-color 0.2s; }
.lm-chat-input-row:focus-within { border-color:rgba(201,169,110,0.35); box-shadow:0 0 0 3px rgba(201,169,110,0.06); }
.lm-chat-textarea { flex:1; background:none; border:none; outline:none; color:rgba(255,255,255,0.9); font-family:var(--lm-sans); font-size:0.82rem; line-height:1.5; resize:none; max-height:100px; min-height:20px; }
.lm-chat-textarea::placeholder { color:rgba(255,255,255,0.2); }
.lm-chat-send-btn { width:30px; height:30px; background:linear-gradient(135deg,#c9a96e,#a07840); border:none; border-radius:8px; display:flex; align-items:center; justify-content:center; cursor:pointer; flex-shrink:0; transition:all 0.2s; color:var(--lm-navy); }
.lm-chat-send-btn:hover { transform:scale(1.05); }
.lm-chat-send-btn:disabled { opacity:0.4; cursor:not-allowed; transform:none; }
.lm-chat-footer-note { text-align:center; font-size:0.62rem; color:rgba(255,255,255,0.15); margin-top:6px; }
@media (max-width:768px) {
  /* MOVIL: se ocultan los enlaces de escritorio y los botones ARIA/Acceso,
     pero la barra derecha sigue visible para que el boton hamburguesa (☰) aparezca */
  .lm-menu { display:none; }
  .lm-nav-right .lm-aria-nav-btn, .lm-nav-right .lm-asesores-btn { display:none; }
  .lm-hamburger { display:flex; align-items:center; justify-content:center; width:44px; height:44px; margin-right:-8px; }
  .lm-hamburger span { width:24px; height:2px; }
  .lm-nav-inner { padding:0 1.1rem; }
  #lm-chat-widget { bottom:0; right:0; left:0; width:100%; height:70vh; border-radius:20px 20px 0 0; transform-origin:bottom center; }
  #lm-aria-fab { bottom:20px; right:20px; }
}
#lm-mobile-menu { display:none; position:fixed; inset:0; background:rgba(13,27,46,0.98); z-index:10001; flex-direction:column; padding:80px 2rem 2rem; overflow-y:auto; }
#lm-mobile-menu.lm-open { display:flex; }
.lm-mob-link { display:block; padding:1.05rem 0; min-height:48px; border-bottom:1px solid rgba(255,255,255,0.06); color:rgba(255,255,255,0.8); font-size:1.2rem; text-decoration:none; font-family:var(--lm-serif); }
.lm-mob-link:hover { color:var(--lm-gold); }
`;

const NAV = [
  {l:'Propiedades',h:'propiedades.html',d:[
    {i:'🏠',l:'Apartamentos',s:'Unidades residenciales',h:'propiedades.html?tipo=apartamento'},
    {i:'🏡',l:'Casas',s:'Propiedades independientes',h:'propiedades.html?tipo=casa'},
    {i:'🏢',l:'Oficinas',s:'Espacios corporativos',h:'propiedades.html?tipo=oficina'},
    {i:'🏪',l:'Locales Comerciales',s:'Comercio y retail',h:'propiedades.html?tipo=local'},
    {i:'🔍',l:'Ver todo el portafolio',s:'Todas las propiedades',h:'propiedades.html'},
  ]},
  {l:'Zonas',h:'propiedades.html',d:[
    {i:'⭐',l:'Usaquén',s:'Norte exclusivo',h:'propiedades.html?zona=usaquen'},
    {i:'🌿',l:'Chapinero',s:'Arte y gastronomía',h:'propiedades.html?zona=chapinero'},
    {i:'💎',l:'La Cabrera',s:'Lujo y exclusividad',h:'propiedades.html?zona=la-cabrera'},
    {i:'🌳',l:'Rosales',s:'Tradición y elegancia',h:'propiedades.html?zona=rosales'},
    {i:'🏙️',l:'Santa Bárbara',s:'Modernidad y confort',h:'propiedades.html?zona=santa-barbara'},
  ]},
  {l:'Blog',h:'blog.html',d:[
    {i:'📊',l:'Mercado Inmobiliario',s:'Tendencias y análisis',h:'blog.html?cat=mercado'},
    {i:'💡',l:'Consejos Compradores',s:'Guías prácticas',h:'blog.html?cat=compradores'},
    {i:'📋',l:'Legal y Notarial',s:'Trámites y documentos',h:'blog.html?cat=legal'},
    {i:'🏗️',l:'Inversión Inmobiliaria',s:'Rentabilidad y estrategia',h:'blog.html?cat=inversion'},
    {i:'📰',l:'Ver todos los artículos',s:'Toda nuestra biblioteca',h:'blog.html'},
  ]},
  {l:'Calculadora',h:'calculadora.html',d:[
    {i:'📝',l:'Gastos Notariales',s:'Escrituración y cierre',h:'calculadora.html#notariales'},
    {i:'🏦',l:'Crédito Hipotecario',s:'Cuota y amortización',h:'calculadora.html#credito'},
    {i:'📈',l:'Rentabilidad',s:'Cap Rate e inversión',h:'calculadora.html#rentabilidad'},
    {i:'💸',l:'Ganancia Ocasional',s:'Impuesto al vender',h:'calculadora.html#ganancia'},
    {i:'💳',l:'Capacidad Endeudamiento',s:'VIS / No VIS',h:'calculadora.html#endeudamiento'},
    {i:'🏨',l:'Tradicional vs Airbnb',s:'Comparador de modelo',h:'calculadora.html#airbnb'},
    {i:'📊',l:'Vacancia y Reserva',s:'Costos ocultos',h:'calculadora.html#vacancia'},
    {i:'🔄',l:'Compra de Cartera',s:'Refinanciación',h:'calculadora.html#cartera'},
    {i:'🧮',l:'Suite Completa',s:'Todas las calculadoras',h:'calculadora.html'},
  ]},
  {l:'Nosotros',h:'index.html#nosotros',d:[
    {i:'🏛️',l:'Nuestra Historia',s:'Quiénes somos',h:'index.html#nosotros'},
    {i:'👥',l:'El Equipo',s:'Asesores especializados',h:'asesores.html'},
    {i:'🤝',l:'Valores y Filosofía',s:'Lo que nos mueve',h:'index.html#valores'},
  ]},
  {l:'Contacto',h:'contacto.html',d:[
    {i:'📞',l:'Hablar con un Asesor',s:'Asesoría personalizada',h:'contacto.html'},
    {i:'📍',l:'Nuestra Oficina',s:'Bogotá, Colombia',h:'contacto.html#ubicacion'},
    {i:'✉️',l:'Escríbenos',s:'info@lomazhome.com',h:'mailto:info@lomazhome.com'},
  ]},
];

const CV = '<svg viewBox="0 0 10 6" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M1 1l4 4 4-4"/></svg>';

function lmEnsureSb(cb){
  if(window.supabase&&window.supabase.createClient){cb();return;}
  var ex=document.getElementById("lm-sb-lib");
  if(ex){ex.addEventListener("load",cb);return;}
  var s=document.createElement("script");
  s.id="lm-sb-lib";
  s.src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2";
  s.onload=cb;
  s.onerror=function(){};
  document.head.appendChild(s);
}
function lmFilterZonas(){
  lmEnsureSb(function(){
    try{
      if(!window.supabase||!window.supabase.createClient)return;
      var _u="https://lniouebpuuuqctrgxoiw.supabase.co";
      var _k=atob("ZXlKaGJHY2lPaUpJVXpJMU5pSXNJblI1Y0NJNklrcFhWQ0o5LmV5SnBjM01pT2lKemRYQmhZbUZ6WlNJc0luSmxaaUk2SW14dWFXOTFaV0p3ZFhWMWNXTjBjbWQ0YjJsM0lpd2ljbTlzWlNJNkltRnViMjRpTENKcFlYUWlPakUzTnpnd09ETTVOamdzSW1WNGNDSTZNakE1TXpZMU9UazJPSDAuOHctVGNEOEpLa0hRcG55YmFqLUFOei00azRoem5Gb0l3RnJfWmF0cVB0QQ==");
      var sb=window.supabase.createClient(_u,_k);
      sb.from("propiedades").select("barrio").eq("estado","activa").limit(1000).then(function(r){
        if(r.error||!r.data)return;
        var barrios=r.data.map(function(x){return (x.barrio||"").toLowerCase().trim();}).filter(Boolean);
        var lis=document.querySelectorAll("#lm-nav .lm-item");
        var zonasLi=null;
        lis.forEach(function(li){var lk=li.querySelector(".lm-link");if(lk&&/zonas/i.test(lk.textContent))zonasLi=li;});
        if(!zonasLi)return;
        var items=zonasLi.querySelectorAll(".lm-dropdown a");
        var visible=0;
        items.forEach(function(a){
          var el=a.querySelector(".dd-label");
          var z=(el?el.textContent:"").toLowerCase().trim();
          var match=!!z&&barrios.some(function(b){return b.indexOf(z)>-1||z.indexOf(b)>-1;});
          if(match){a.style.display="";visible++;}else{a.style.display="none";}
        });
        zonasLi.style.display=(visible===0)?"none":"";
      });
    }catch(e){}
  });
}
function bNav() {
  const cp = location.pathname.split('/').pop()||'index.html';
  const mi = NAV.map(n=>{
    const act = cp===n.h||cp.includes(n.h.split('.')[0]);
    const dd = n.d.map(d=>'<a href="'+d.h+'"><span class="dd-icon">'+d.i+'</span><span class="dd-text"><span class="dd-label">'+d.l+'</span><span class="dd-sub">'+d.s+'</span></span></a>').join('');
    return '<li class="lm-item"><a class="lm-link'+(act?' lm-active':'')+'" href="'+n.h+'">'+n.l+' '+CV+'</a><div class="lm-dropdown">'+dd+'</div></li>';
  }).join('');
  return '<nav id="lm-nav" class="lm-transparent"><div id="lm-progress"></div><div class="lm-nav-inner"><a class="lm-logo" href="index.html">Lo<span>Maz</span> Home</a><ul class="lm-menu">'+mi+'</ul><div class="lm-nav-right"><button class="lm-aria-nav-btn" id="lm-aria-btn"><span class="lm-aria-dot"></span>ARIA IA</button><a class="lm-asesores-btn" href="login.html">ACCESO ASESORES</a><button class="lm-hamburger" id="lm-ham"><span></span><span></span><span></span></button></div></div></nav>';
}

function bFAB() {
  return '<div id="lm-aria-fab" role="button" tabindex="0"><div class="lm-fab-orb"><div class="lm-fab-ring-2"></div><div class="lm-fab-ring"></div><div class="lm-fab-circle"><span class="lm-fab-letter">A</span><span class="lm-fab-status"></span></div></div><div class="lm-fab-tooltip">ARIA · Asesora IA</div></div>';
}

function bChat() {
  return '<div id="lm-chat-widget"><div class="lm-chat-header"><div class="lm-chat-avatar">A</div><div class="lm-chat-info"><p class="lm-chat-name">ARIA</p><div class="lm-chat-status"><span class="lm-chat-status-dot"></span><span>Asesora IA · En línea</span></div></div><div class="lm-chat-actions"><button class="lm-chat-action-btn" id="lm-chat-exp">⤢</button><button class="lm-chat-close-btn" id="lm-chat-cls">✕</button></div></div><div class="lm-chat-messages" id="lm-msgs"><div class="lm-chat-welcome" id="lm-cwel"><div class="lm-chat-welcome-logo">A</div><h3>Hola, soy ARIA</h3><p>Tu asesora inmobiliaria IA.<br>¿En qué puedo ayudarte?</p><div class="lm-chat-suggestions"><button class="lm-suggestion-chip" data-msg="¿Cuáles son las propiedades en Usaquén?">🏠 Propiedades en Usaquén</button><button class="lm-suggestion-chip" data-msg="¿Cómo funciona el proceso de compra?">📋 Proceso de compra</button><button class="lm-suggestion-chip" data-msg="¿Qué gastos notariales debo considerar?">💸 Gastos notariales</button></div></div></div><div class="lm-chat-input-area"><div class="lm-chat-input-row"><textarea class="lm-chat-textarea" id="lm-cinp" placeholder="Escribe tu consulta..." rows="1"></textarea><button class="lm-chat-send-btn" id="lm-csnd" disabled><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M22 2L11 13"/><path d="M22 2L15 22 11 13 2 9l20-7z"/></svg></button></div><div class="lm-chat-footer-note">ARIA · LoMaz Home IA</div></div></div>';
}

function bMob() {
  return '<div id="lm-mobile-menu"><button id="lm-mob-cls" aria-label="Cerrar menu" style="position:absolute;top:1rem;right:1rem;width:48px;height:48px;background:none;border:none;color:white;font-size:1.6rem;cursor:pointer">✕</button>'+NAV.map(n=>'<a class="lm-mob-link" href="'+n.h+'">'+n.l+'</a>').join('')+'<a class="lm-mob-link" href="login.html" style="color:var(--lm-gold)">Acceso Asesores</a></div>';
}

const KB = {
  p:'Tenemos un portafolio selecto en Bogotá: Usaquén, Chapinero, La Cabrera, Rosales y Santa Bárbara. Apartamentos, casas y locales disponibles. ¿Filtro por zona o tipo?',
  u:'Usaquén es uno de los barrios más exclusivos de Bogotá Norte. Ofrecemos desde $450M COP. Ambiente tranquilo, gastronomía premium y cercanía empresarial.',
  c:'Chapinero Alto: zona cotizada con arquitectura moderna, restaurantes y cultura. Excelente para inversión y arriendo con alta rentabilidad.',
  b:'El proceso de compra incluye: promesa de compraventa, estudio jurídico, crédito hipotecario, escrituración notarial y registro ORIP. Te acompañamos en cada paso.',
  n:'Gastos notariales 2026: derechos notariales 0.27%, beneficencia 1%, registro ORIP 0.5%, IVA sobre honorarios. Usa nuestra calculadora para tu estimado exacto.',
  h:'Para un crédito hipotecario necesitas ingresos demostrables, historial limpio y cuota inicial mínima del 30% (VIS) o 20% (No VIS). ¿Calculamos tu capacidad?',
  k:'Contáctanos: lomazhome@gmail.com | +57 300 330 0343. Agenda tu consulta privada sin costo desde nuestra página de contacto.',
  d:'Soy ARIA, asesora inmobiliaria IA de LoMaz Home. Te ayudo con propiedades, zonas, proceso de compra, gastos y créditos. ¿Qué necesitas?'
};

// === ARIA: Motor de captacion de leads ===
const LEAD={intencion:null,nombre:null,whatsapp:null,email:null,zona:null,tipo_inmueble:null,habitaciones:null,area_m2:null,precio_esperado:null,presupuesto_aprox:null,mensaje_libre:'',consentimiento:false};
let LEAD_STEP='idle';
let RETRY=0;
const HIST=[];
const RX={email:/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i,wa:/(?:\+?57\s?)?(3\d{2})\s?\d{3}\s?\d{4}/,hab:/(\d+)\s*(hab|habitaciones|alcobas|cuartos|dormitorios)/i,area:/(\d{2,4})\s*(m2|m²|metros)/i};
const ZONAS=['usaquen','usaquén','chapinero','la cabrera','cabrera','rosales','santa bárbara','santa barbara'];
const TIPOS=['apartamento','apto','casa','local','oficina','penthouse','duplex','dúplex','lote','bodega'];
const norm=s=>(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
function cleanName(s){
  let n=(s||'').replace(/^\s*(soy|me llamo|mi nombre es|me dicen|soy el|soy la)\s+/i,'');
  // Cortar antes del primer correo/teléfono/conector
  n=n.replace(RX.email,'').replace(RX.wa,'');
  n=n.split(/[,;.]|\s+(?:mi|y |con |whatsapp|wpp|wa|tel|telefono|teléfono|cel|celular|correo|email|e-mail|@)/i)[0];
  // Quedarnos con solo letras y espacios
  n=n.replace(/[^A-Za-zÁÉÍÓÚáéíóúñÑ\s'-]/g,'').trim().replace(/\s+/g,' ');
  return n.substring(0,80);
}
function detectIntent(t){
  const x=norm(t);
  if(/\bvend(o|er|emos|iendo)\b|deseo vender|quiero vender|soy propietari|tengo (un|una) (apartamento|apto|casa|local|oficina|propiedad|inmueble|finca)|consignar|publicar mi/.test(x)) return 'venta';
  if(/\barriend(o|ar|amiento)\b|alquil(o|ar|er)|rentar|en renta/.test(x)) return 'arriendo';
  if(/\bcompr(o|ar|ando)\b|busco (un|una|apartamento|apto|casa)|estoy buscando|interesa(do|da) en (un|una)/.test(x)) return 'compra';
  return null;
}
function extractContacts(t){
  const e=t.match(RX.email); if(e&&!LEAD.email) LEAD.email=e[0].toLowerCase();
  const w=t.match(RX.wa); if(w&&!LEAD.whatsapp){let n=w[0].replace(/\D/g,'');if(n.startsWith('57'))n=n.slice(2);LEAD.whatsapp=n.slice(0,10);}
}
function extractDetails(t){
  const x=norm(t);
  if(!LEAD.zona){for(const z of ZONAS){if(x.includes(norm(z))){LEAD.zona=norm(z);break;}}}
  if(!LEAD.tipo_inmueble){for(const tp of TIPOS){if(x.includes(tp)){LEAD.tipo_inmueble=tp;break;}}}
  const h=t.match(RX.hab); if(h&&!LEAD.habitaciones) LEAD.habitaciones=parseInt(h[1],10);
  const a=t.match(RX.area); if(a&&!LEAD.area_m2) LEAD.area_m2=parseInt(a[1],10);
}
function extractName(t){if(LEAD.nombre)return;const m=t.match(/(?:^|\b)(?:soy|me llamo|mi nombre es)\s+([A-Za-zÁÉÍÓÚáéíóúñÑ][A-Za-zÁÉÍÓÚáéíóúñÑ\s'-]{2,60})(?=[,.;]|\s+(?:mi|y |con |whatsapp|wpp|wa|tel|telefono|teléfono|cel|celular|correo|email|e-mail|@)|$)/i);if(m){const n=cleanName(m[1]);if(n.length>=2)LEAD.nombre=n;}}
function isValidName(s){const n=cleanName(s);return n.length>=2&&/[A-Za-zÁÉÍÓÚáéíóúñÑ]/.test(n)&&!RX.email.test(s)&&!RX.wa.test(s)?n:null;}
function isValidEmail(s){const m=s.match(RX.email);return m?m[0].toLowerCase():null;}
function isValidWhatsapp(s){const m=s.match(RX.wa);if(!m)return null;let n=m[0].replace(/\D/g,'');if(n.startsWith('57'))n=n.slice(2);return n.length===10?n:null;}
function hasDetailInfo(){return !!(LEAD.area_m2||LEAD.habitaciones||LEAD.precio_esperado||LEAD.presupuesto_aprox);}
async function saveLead(){
  try{
    if(!window.supabase||!window.SUPABASE_URL||!window.SUPABASE_ANON_KEY)return;
    const c=window.supabase.createClient(window.SUPABASE_URL,window.SUPABASE_ANON_KEY);
    const payload={...LEAD,url_origen:location.href,user_agent:navigator.userAgent.slice(0,300),conversacion:HIST.slice(-20)};
    await c.from('leads_aria').insert(payload);
  }catch(e){console.warn('saveLead',e);}
}
function nextQuestion(){
  if(!LEAD.intencion) return '¿Quieres comprar, vender o arrendar? Cuéntame en una frase qué necesitas.';
  if(!LEAD.nombre){LEAD_STEP='nombre';return '¡Perfecto! Para que un asesor te contacte necesito unos datos rápidos. ¿Cuál es tu nombre?';}
  if(!LEAD.email){LEAD_STEP='email';return 'Gracias '+LEAD.nombre.split(' ')[0]+'. ¿Cuál es tu correo electrónico?';}
  if(!LEAD.whatsapp){LEAD_STEP='whatsapp';return '¿Cuál es tu número de WhatsApp (10 dígitos)?';}
  if(LEAD.intencion==='venta'&&!hasDetailInfo()){LEAD_STEP='detalle_venta';return 'Cuéntame en una frase: área aproximada (m²), número de habitaciones y precio que esperas por la propiedad.';}
  if(LEAD.intencion==='compra'&&!hasDetailInfo()){LEAD_STEP='detalle_compra';return '¿Qué tipo de inmueble buscas, en qué zona y cuál es tu presupuesto aproximado?';}
  if(LEAD.intencion==='arriendo'&&!hasDetailInfo()){LEAD_STEP='detalle_arriendo';return '¿Qué tipo de inmueble quieres arrendar, en qué zona y cuál es tu presupuesto mensual?';}
  if(!LEAD.consentimiento){LEAD_STEP='consent';return 'Para conectarte con un asesor necesito tu autorización para tratar tus datos según la Ley 1581 de 2012. ¿Aceptas? (sí/no)';}
  LEAD_STEP='done';return finalizeLead();
}
function finalizeLead(){
  if(LEAD.consentimiento){
    saveLead();
    const wa=(window.LH_WHATSAPP_ASESOR||'573003300343');
    const txt=encodeURIComponent('Hola, soy '+LEAD.nombre+'. Vengo del chat de LoMaz Home. Intención: '+LEAD.intencion+'.');
    return '¡Listo '+LEAD.nombre.split(' ')[0]+'! Un asesor te contactará al '+LEAD.whatsapp+' muy pronto. Si quieres escribir ya, contáctanos por <a href="https://wa.me/'+wa+'?text='+txt+'" target="_blank" rel="noopener" style="color:#25D366;font-weight:600;text-decoration:underline">WhatsApp</a>';
  }
  return 'Entendido, no guardo tus datos. Si cambias de opinión, escríbeme.';
}
const KB_ARIA={
  usaquen:'Tenemos un portafolio activo en Usaquén con apartamentos desde 2 habitaciones. ¿Quieres que un asesor te muestre opciones?',
  chapinero:'Chapinero (La Cabrera, Rosales, El Refugio) tiene gran oferta boutique. ¿Te ayudo con compra, arriendo o venta?',
  notarial:'En Bogotá los gastos notariales y de registro rondan el 3-4% del valor del inmueble. ¿Quieres una cotización personalizada?',
  credito:'Trabajamos con asesores hipotecarios. Aprobaciones desde 70% del valor con tasa preferencial. ¿Te conectamos con uno?'
};
function kbAnswerAria(t){
  const x=norm(t);
  if(/usaquen|usaqu\u00e9n/.test(x)) return KB_ARIA.usaquen;
  if(/chapinero|cabrera|rosales|refugio/.test(x)) return KB_ARIA.chapinero;
  if(/notarial|escritura|registro/.test(x)) return KB_ARIA.notarial;
  if(/credito|crédito|hipotec|financ/.test(x)) return KB_ARIA.credito;
  if(/contacto|asesor|hablar con|llamar|wpp|whatsapp/.test(x)) return 'Con gusto te conecto con un asesor. ¿Cuál es tu nombre?';
  return null;
}
async function resp(m){
  const txt=(m||'').trim();
  HIST.push({who:'user',text:txt,ts:Date.now()});
  if(txt) LEAD.mensaje_libre=(LEAD.mensaje_libre+' '+txt).trim().slice(0,1000);

  // En cualquier momento extraemos contactos y detalles oportunistamente
  extractName(txt);
  extractContacts(txt);
  extractDetails(txt);

  // Si aún no hay intención, intentar detectar
  if(!LEAD.intencion){
    const it=detectIntent(txt);
    if(it){LEAD.intencion=it;RETRY=0;return nextQuestion();}
    // Si no es intención pero pregunta del KB_ARIA, responder y seguir
    const kb=kbAnswerAria(txt);
    if(kb) return kb;
    if(LEAD_STEP==='idle'){RETRY++;if(RETRY===1)return '¡Hola! Soy ARIA. ¿Quieres comprar, vender o arrendar una propiedad? También puedo resolver dudas sobre zonas, crédito o gastos notariales.';return 'Cuéntame en una frase qué necesitas: comprar, vender o arrendar.';}
  }

  // Flujo paso a paso
  if(LEAD_STEP==='nombre'){
    const n=isValidName(txt);
    if(!n){RETRY++;return RETRY>=2?'Para continuar necesito tu nombre real (solo letras). ¿Cómo te llamas?':'Necesito tu nombre para que el asesor te identifique. ¿Cuál es tu nombre?';}
    LEAD.nombre=n;RETRY=0;return nextQuestion();
  }
  if(LEAD_STEP==='email'){
    const e=isValidEmail(txt);
    if(!e){RETRY++;return RETRY>=2?'El correo no parece válido. Debe tener formato nombre@dominio.com.':'Necesito un correo válido (ej: tucorreo@gmail.com). ¿Cuál es tu correo?';}
    LEAD.email=e;RETRY=0;return nextQuestion();
  }
  if(LEAD_STEP==='whatsapp'){
    const w=isValidWhatsapp(txt);
    if(!w){RETRY++;return RETRY>=2?'El número debe tener 10 dígitos y empezar por 3.':'Necesito tu WhatsApp con 10 dígitos (ej: 3001234567). ¿Cuál es?';}
    LEAD.whatsapp=w;RETRY=0;return nextQuestion();
  }
  if(LEAD_STEP==='detalle_venta'){
    // Validar que mencione área, habitaciones o precio
    if(/\b(si|sí|acepto|claro|ok|de acuerdo)\b/i.test(txt)&&txt.length<20){RETRY++;return 'Necesito un poco más de información sobre la propiedad. ¿Puedes contarme área (m²), número de habitaciones y precio que esperas?';}
    if(!/\d/.test(txt)){RETRY++;return RETRY>=2?'Para que el asesor te haga una propuesta seria necesito al menos un dato numérico: área en m², habitaciones o precio esperado.':'Necesito datos del inmueble. ¿Cuál es el área aproximada en m², cuántas habitaciones tiene y qué precio esperas?';}
    LEAD.precio_esperado=txt.substring(0,200);RETRY=0;return nextQuestion();
  }
  if(LEAD_STEP==='detalle_compra'){
    if(/\b(si|sí|acepto|claro|ok|de acuerdo)\b/i.test(txt)&&txt.length<20){RETRY++;return '¿Puedes contarme qué tipo de inmueble buscas, en qué zona y cuál es tu presupuesto aproximado?';}
    if(!/\d/.test(txt)&&!LEAD.tipo_inmueble&&!LEAD.zona){RETRY++;return 'Necesito al menos un dato: tipo de inmueble, zona o presupuesto. ¿Qué buscas?';}
    LEAD.presupuesto_aprox=txt.substring(0,200);RETRY=0;return nextQuestion();
  }
  if(LEAD_STEP==='detalle_arriendo'){
    if(/\b(si|sí|acepto|claro|ok|de acuerdo)\b/i.test(txt)&&txt.length<20){RETRY++;return '¿Qué tipo de inmueble quieres arrendar, en qué zona y cuál es tu presupuesto mensual?';}
    if(!/\d/.test(txt)&&!LEAD.tipo_inmueble&&!LEAD.zona){RETRY++;return 'Cuéntame al menos el tipo de inmueble, zona o presupuesto mensual.';}
    LEAD.presupuesto_aprox=txt.substring(0,200);RETRY=0;return nextQuestion();
  }
  if(LEAD_STEP==='consent'){
    const x=norm(txt);
    if(/\b(si|claro|acepto|de acuerdo|ok|dale|autorizo)\b/.test(x)){LEAD.consentimiento=true;LEAD_STEP='done';return finalizeLead();}
    if(/\b(no|nunca|jamas|jamás|niego)\b/.test(x)){LEAD.consentimiento=false;LEAD_STEP='done';return finalizeLead();}
    RETRY++;return 'Por favor responde sí o no. ¿Aceptas que un asesor te contacte y trate tus datos según la Ley 1581 de 2012?';
  }

  // Sin step activo: responder KB_ARIA o repreguntar
  const kb=kbAnswerAria(txt);
  if(kb) return kb;
  if(LEAD.intencion) return nextQuestion();
  return 'Cuéntame: ¿quieres comprar, vender o arrendar? También puedo ayudarte con dudas de zonas, crédito o gastos notariales.';
}
// === Fin motor ARIA ===


let open=false,typing=false;

function addMsg(t,r) {
  const m=document.getElementById('lm-msgs'), w=document.getElementById('lm-cwel');
  if(w) w.remove();
  const d=document.createElement('div'); d.className='lm-msg lm-msg-'+r;
  d.innerHTML=r==='aria'?'<div class="lm-msg-avatar">A</div><div class="lm-msg-bubble">'+t+'</div>':'<div class="lm-msg-bubble">'+t+'</div>';
  m.appendChild(d); m.scrollTop=m.scrollHeight;
}

function showTyp() {
  const m=document.getElementById('lm-msgs'), d=document.createElement('div');
  d.id='lm-typ'; d.className='lm-typing';
  d.innerHTML='<div class="lm-msg-avatar">A</div><div class="lm-typing-bubble"><span class="lm-typing-dot"></span><span class="lm-typing-dot"></span><span class="lm-typing-dot"></span></div>';
  m.appendChild(d); m.scrollTop=m.scrollHeight;
}
function hideTyp() { const e=document.getElementById('lm-typ'); if(e) e.remove(); }

async function stream(t) {
  const m=document.getElementById('lm-msgs'), w=document.getElementById('lm-cwel'); if(w) w.remove();
  const d=document.createElement('div'); d.className='lm-msg lm-msg-aria';
  const b=document.createElement('div'); b.className='lm-msg-bubble';
  d.innerHTML='<div class="lm-msg-avatar">A</div>'; d.appendChild(b); m.appendChild(d);
  let i=0;
  return new Promise(r=>{(function f(){if(i<t.length){b.textContent+=t[i++];m.scrollTop=m.scrollHeight;setTimeout(f,16);}else{b.innerHTML=t;m.scrollTop=m.scrollHeight;r();}})();});
}

async function send(t) {
  if(!t.trim()||typing) return; typing=true;
  const sb=document.getElementById('lm-csnd'), inp=document.getElementById('lm-cinp');
  if(sb) sb.disabled=true; if(inp){inp.value='';inp.style.height='auto';}
  addMsg(t,'user');
  await new Promise(r=>setTimeout(r,300)); showTyp();
  await new Promise(r=>setTimeout(r,800+Math.random()*600)); hideTyp();
  await stream(await resp(t));
  typing=false; if(sb) sb.disabled=false; if(inp) inp.focus();
}

function tog() {
  open=!open;
  const w=document.getElementById('lm-chat-widget'); if(!w) return;
  if(open){w.classList.add('lm-chat-open');setTimeout(()=>{const i=document.getElementById('lm-cinp');if(i)i.focus();},350);}
  else w.classList.remove('lm-chat-open');
}

function init() {
  // Styles
  const st=document.createElement('style'); st.textContent=S; document.head.appendChild(st);
  
  // Hide old elements immediately
  ['#lhNav','#lhOverlay','.nav__overlay','#aria-fab','#aria-overlay','#aria-panel'].forEach(sel=>{
    document.querySelectorAll(sel).forEach(el=>{el.style.cssText+='display:none!important;';});
  });
  
  // Build UI
  const ne=document.createElement('div'); ne.innerHTML=bNav(); document.body.prepend(ne.firstChild);
  lmFilterZonas();
  [bFAB,bChat,bMob].forEach(fn=>{const d=document.createElement('div');d.innerHTML=fn();document.body.appendChild(d.firstChild);});
  
  // Body padding
  if(!document.body.style.paddingTop) document.body.style.paddingTop='64px';
  
  // Hide WA float
  const hideWA=()=>{
    ['.wa-float','.whatsapp-float','.float-wa','.wa-btn-float'].forEach(s=>{try{document.querySelectorAll(s).forEach(e=>{e.style.cssText+='display:none!important;';});}catch(e){}});
    document.querySelectorAll('a[href*="wa.me"]').forEach(e=>{if(['fixed','sticky'].includes(getComputedStyle(e).position)){e.style.cssText+='display:none!important;';}});
    // Also re-hide old ARIA elements
    ['#aria-fab','#aria-overlay','#aria-panel'].forEach(s=>{document.querySelectorAll(s).forEach(e=>{e.style.cssText+='display:none!important;';});});
  };
  [0,300,1000,3000].forEach(t=>setTimeout(hideWA,t));
  
  // Scroll
  const nav=document.getElementById('lm-nav'), pb=document.getElementById('lm-progress');
  const dark=['calculadora','panel','admin','clientes','leads'].some(p=>location.pathname.includes(p));
  if(dark){nav.classList.remove('lm-transparent');nav.classList.add('lm-dark');}
  window.addEventListener('scroll',()=>{
    const sy=scrollY;
    if(!dark){if(sy>80){nav.classList.remove('lm-transparent');nav.classList.add('lm-scrolled');}else{nav.classList.remove('lm-scrolled');nav.classList.add('lm-transparent');}}
    if(pb){const dh=document.documentElement.scrollHeight-innerHeight;pb.style.width=dh>0?(sy/dh*100)+'%':'0';}
  },{passive:true});
  
  // FAB events
  const fab=document.getElementById('lm-aria-fab');
  fab.addEventListener('click',tog);
  fab.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' ')tog();});
  document.getElementById('lm-chat-cls').addEventListener('click',()=>{if(open){open=true;tog();}});
  document.getElementById('lm-chat-exp').addEventListener('click',()=>{location.href='aria.html';});
  document.getElementById('lm-aria-btn').addEventListener('click',()=>{open?(open=true,tog()):tog();});
  
  // Input
  const inp=document.getElementById('lm-cinp'), sb=document.getElementById('lm-csnd');
  inp.addEventListener('input',function(){this.style.height='auto';this.style.height=Math.min(this.scrollHeight,100)+'px';sb.disabled=!this.value.trim();});
  inp.addEventListener('keydown',function(e){if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();if(!sb.disabled)send(this.value.trim());}});
  sb.addEventListener('click',()=>send(inp.value.trim()));
  
  document.querySelectorAll('.lm-suggestion-chip').forEach(c=>c.addEventListener('click',function(){send(this.dataset.msg);}));
  
  // Mobile menu
  // Menu movil: el boton ☰ abre/cierra (toggle), la ✕ cierra, y tocar cualquier enlace tambien cierra
  const mm=document.getElementById('lm-mobile-menu');
  const cerrarMenu=()=>{mm.classList.remove('lm-open');document.body.style.overflow='';};
  const abrirMenu=()=>{mm.classList.add('lm-open');document.body.style.overflow='hidden';};
  document.getElementById('lm-ham').addEventListener('click',e=>{e.stopPropagation();mm.classList.contains('lm-open')?cerrarMenu():abrirMenu();});
  document.getElementById('lm-mob-cls').addEventListener('click',e=>{e.stopPropagation();cerrarMenu();});
  mm.querySelectorAll('a').forEach(a=>a.addEventListener('click',cerrarMenu));
  mm.addEventListener('click',e=>{if(e.target===mm)cerrarMenu();});
  
  // Keyboard
  document.addEventListener('keydown',e=>{
    if(e.key==='Escape'){if(open){open=true;tog();}cerrarMenu();}
  });
  
  // Click outside
  document.addEventListener('click',e=>{
    if(open){
      const cw=document.getElementById('lm-chat-widget'),f=document.getElementById('lm-aria-fab'),nb=document.getElementById('lm-aria-btn');
      if(cw&&f&&nb&&!cw.contains(e.target)&&!f.contains(e.target)&&!nb.contains(e.target)){open=true;tog();}
    }
  });
}

if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init);
else init();

})();
