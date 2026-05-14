/**
 * LoMaz Home — Universal Navigation System v2
 * Navbar premium con dropdowns hover + Chat Widget ARIA flotante
 * Sistema de diseño unificado para todas las páginas
 */

(function() {
'use strict';

const LOMAZ_STYLES = `
/* ======= LOMAZ NAV UNIVERSAL ======= */
:root {
  --lm-navy: #0D1B2E;
  --lm-navy-light: #162540;
  --lm-navy-dark: #080f1a;
  --lm-gold: #c9a96e;
  --lm-gold-light: #e8d5b0;
  --lm-gold-dark: #a07840;
  --lm-cream: #f5f0e8;
  --lm-cream-light: #faf8f4;
  --lm-ink: #1c1917;
  --lm-ink-soft: #4a4540;
  --lm-white: #ffffff;
  --lm-font-serif: 'Cormorant Garamond', 'Georgia', serif;
  --lm-font-sans: 'Inter', 'Helvetica Neue', sans-serif;
  --lm-radius: 4px;
  --lm-transition: 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  --lm-shadow: 0 4px 24px rgba(13, 27, 46, 0.12);
}

/* Hide old navigation elements — replaced by lomaz-nav universal system */
#lhNav,
#lhOverlay,
.nav:not(#lm-nav),
nav:not(#lm-nav) {
  display: none !important;
}

/* Hide WhatsApp float buttons */
.wa-float,
.aria-wa-btn,
.whatsapp-float,
.float-wa,
.wa-btn-float,
a.wa-float,
[class*="wa-float"],
[class*="whatsapp-float"] {
  display: none !important;
  visibility: hidden !important;
}

/* ===== PROGRESS BAR ===== */
#lm-progress {
  position: fixed;
  top: 0;
  left: 0;
  height: 2px;
  background: linear-gradient(90deg, var(--lm-navy), var(--lm-gold));
  transition: width 0.1s;
  z-index: 99999;
  pointer-events: none;
}

/* ===== UNIVERSAL NAVBAR ===== */
#lm-nav {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 9999;
  font-family: var(--lm-font-sans);
  transition: all var(--lm-transition);
}
#lm-nav.lm-scrolled {
  background: rgba(255,255,255,0.97);
  backdrop-filter: blur(12px);
  box-shadow: var(--lm-shadow);
}
#lm-nav.lm-dark {
  background: rgba(13, 27, 46, 0.97);
  backdrop-filter: blur(12px);
}
#lm-nav.lm-transparent {
  background: transparent;
}

.lm-nav-inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 2rem;
  height: 64px;
  max-width: 1440px;
  margin: 0 auto;
}

.lm-logo {
  text-decoration: none;
  font-family: var(--lm-font-serif);
  font-size: 1.35rem;
  letter-spacing: 0.01em;
  color: var(--lm-ink);
  display: flex;
  align-items: center;
  flex-shrink: 0;
}
.lm-logo span { color: var(--lm-gold); font-style: italic; }
#lm-nav.lm-dark .lm-logo { color: var(--lm-white); }

.lm-menu {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  list-style: none;
  margin: 0;
  padding: 0;
}

.lm-item { position: relative; }

.lm-link {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 0.5rem 0.75rem;
  font-size: 0.78rem;
  font-weight: 500;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  text-decoration: none;
  color: var(--lm-ink-soft);
  border-radius: var(--lm-radius);
  transition: color var(--lm-transition);
  white-space: nowrap;
  position: relative;
}
.lm-link:hover { color: var(--lm-ink); }
.lm-link svg { width: 10px; height: 10px; opacity: 0.5; transition: transform var(--lm-transition); }
.lm-item:hover .lm-link svg { transform: rotate(180deg); opacity: 1; }
#lm-nav.lm-dark .lm-link { color: rgba(255,255,255,0.7); }
#lm-nav.lm-dark .lm-link:hover { color: var(--lm-white); }

.lm-link.lm-active { color: var(--lm-ink); }
.lm-link.lm-active::after {
  content: '';
  position: absolute;
  bottom: -2px;
  left: 0.75rem;
  right: 0.75rem;
  height: 1px;
  background: var(--lm-gold);
}

.lm-dropdown {
  position: absolute;
  top: calc(100% + 8px);
  left: 0;
  min-width: 220px;
  background: var(--lm-white);
  border: 1px solid rgba(0,0,0,0.06);
  border-radius: 8px;
  box-shadow: 0 12px 40px rgba(0,0,0,0.12), 0 0 0 1px rgba(201,169,110,0.08);
  padding: 0.5rem;
  opacity: 0;
  visibility: hidden;
  transform: translateY(-8px);
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  pointer-events: none;
}
.lm-item:hover .lm-dropdown {
  opacity: 1;
  visibility: visible;
  transform: translateY(0);
  pointer-events: all;
}

.lm-dropdown a {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0.6rem 0.875rem;
  text-decoration: none;
  color: var(--lm-ink-soft);
  font-size: 0.83rem;
  border-radius: 6px;
  transition: all 0.15s;
}
.lm-dropdown a:hover {
  background: var(--lm-cream-light);
  color: var(--lm-ink);
}
.lm-dropdown a .dd-icon { font-size: 1rem; flex-shrink: 0; }
.lm-dropdown a .dd-text { display: flex; flex-direction: column; gap: 1px; }
.lm-dropdown a .dd-label { font-weight: 500; font-size: 0.83rem; }
.lm-dropdown a .dd-sub { font-size: 0.7rem; color: var(--lm-ink-soft); opacity: 0.7; }

.lm-nav-right {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-shrink: 0;
}

.lm-aria-nav-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 0.35rem 0.875rem 0.35rem 0.6rem;
  background: var(--lm-navy);
  color: var(--lm-gold);
  border: 1px solid rgba(201,169,110,0.3);
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: 600;
  letter-spacing: 0.06em;
  cursor: pointer;
  transition: all var(--lm-transition);
  font-family: var(--lm-font-sans);
}
.lm-aria-nav-btn:hover {
  background: var(--lm-navy-light);
  border-color: var(--lm-gold);
  box-shadow: 0 0 16px rgba(201,169,110,0.2);
}
.lm-aria-dot {
  width: 6px; height: 6px;
  background: #4ade80; border-radius: 50%;
  box-shadow: 0 0 6px rgba(74,222,128,0.6);
  animation: lm-pulse 2s infinite;
}
@keyframes lm-pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.7; transform: scale(0.85); }
}

.lm-asesores-btn {
  padding: 0.4rem 1rem;
  border: 1px solid var(--lm-ink);
  border-radius: 2px;
  font-size: 0.72rem;
  font-weight: 600;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--lm-ink);
  text-decoration: none;
  transition: all var(--lm-transition);
}
.lm-asesores-btn:hover { background: var(--lm-ink); color: var(--lm-white); }
#lm-nav.lm-dark .lm-asesores-btn { border-color: rgba(255,255,255,0.4); color: var(--lm-white); }
#lm-nav.lm-dark .lm-asesores-btn:hover { background: var(--lm-white); color: var(--lm-navy); }

.lm-hamburger {
  display: none;
  flex-direction: column;
  gap: 4px;
  cursor: pointer;
  padding: 4px;
  background: none;
  border: none;
}
.lm-hamburger span {
  display: block;
  width: 22px;
  height: 1.5px;
  background: var(--lm-ink);
  transition: all 0.3s;
}
#lm-nav.lm-dark .lm-hamburger span { background: var(--lm-white); }

/* ===== ARIA FLOATING ORB ===== */
#lm-aria-fab {
  position: fixed;
  bottom: 28px;
  right: 28px;
  z-index: 99990;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}
.lm-fab-orb { position: relative; width: 52px; height: 52px; }
.lm-fab-ring {
  position: absolute;
  inset: -6px;
  border-radius: 50%;
  border: 1px solid rgba(201, 169, 110, 0.25);
  animation: lm-fab-ring-pulse 3s ease-in-out infinite;
}
.lm-fab-ring-2 {
  position: absolute;
  inset: -12px;
  border-radius: 50%;
  border: 1px solid rgba(201, 169, 110, 0.12);
  animation: lm-fab-ring-pulse 3s ease-in-out infinite 0.8s;
}
@keyframes lm-fab-ring-pulse {
  0%, 100% { opacity: 0; transform: scale(0.9); }
  50% { opacity: 1; transform: scale(1); }
}
.lm-fab-circle {
  position: relative;
  width: 52px;
  height: 52px;
  border-radius: 50%;
  background: radial-gradient(135deg at 35% 35%, #1e3a5f, #0D1B2E);
  border: 1px solid rgba(201, 169, 110, 0.4);
  box-shadow:
    0 0 0 1px rgba(201, 169, 110, 0.15),
    0 8px 32px rgba(13, 27, 46, 0.4),
    0 0 20px rgba(201, 169, 110, 0.12),
    inset 0 1px 0 rgba(255,255,255,0.08);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
}
#lm-aria-fab:hover .lm-fab-circle {
  transform: scale(1.08);
  border-color: rgba(201, 169, 110, 0.7);
  box-shadow:
    0 0 0 1px rgba(201, 169, 110, 0.3),
    0 12px 40px rgba(13, 27, 46, 0.5),
    0 0 30px rgba(201, 169, 110, 0.25),
    inset 0 1px 0 rgba(255,255,255,0.12);
}
.lm-fab-letter {
  font-family: 'Cormorant Garamond', 'Georgia', serif;
  font-size: 1.4rem;
  font-weight: 600;
  font-style: italic;
  color: var(--lm-gold);
  text-shadow: 0 0 12px rgba(201, 169, 110, 0.5);
  position: relative;
  z-index: 2;
  line-height: 1;
}
.lm-fab-status {
  position: absolute;
  bottom: 2px; right: 2px;
  width: 10px; height: 10px;
  background: #4ade80; border-radius: 50%;
  border: 2px solid white;
  box-shadow: 0 0 8px rgba(74,222,128,0.6);
  animation: lm-pulse 2s infinite;
  z-index: 3;
}
.lm-fab-tooltip {
  position: absolute;
  bottom: calc(100% + 10px);
  right: 0;
  background: var(--lm-navy);
  color: var(--lm-white);
  font-family: var(--lm-font-sans);
  font-size: 0.72rem;
  font-weight: 500;
  letter-spacing: 0.04em;
  padding: 0.35rem 0.7rem;
  border-radius: 6px;
  border: 1px solid rgba(201,169,110,0.2);
  white-space: nowrap;
  opacity: 0;
  transform: translateY(4px);
  transition: all 0.2s;
  pointer-events: none;
}
.lm-fab-tooltip::after {
  content: '';
  position: absolute;
  top: 100%;
  right: 18px;
  border: 4px solid transparent;
  border-top-color: var(--lm-navy);
}
#lm-aria-fab:hover .lm-fab-tooltip { opacity: 1; transform: translateY(0); }

/* ===== ARIA CHAT WIDGET ===== */
#lm-chat-widget {
  position: fixed;
  bottom: 96px;
  right: 28px;
  width: 380px;
  height: 520px;
  z-index: 99980;
  display: flex;
  flex-direction: column;
  border-radius: 16px;
  overflow: hidden;
  background: #0c1420;
  border: 1px solid rgba(201,169,110,0.2);
  box-shadow: 0 24px 80px rgba(0,0,0,0.4), 0 0 0 1px rgba(201,169,110,0.08);
  font-family: var(--lm-font-sans);
  transform: scale(0.9) translateY(16px);
  transform-origin: bottom right;
  opacity: 0;
  visibility: hidden;
  transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
  pointer-events: none;
}
#lm-chat-widget.lm-chat-open {
  transform: scale(1) translateY(0);
  opacity: 1;
  visibility: visible;
  pointer-events: all;
}
.lm-chat-header {
  display: flex; align-items: center; gap: 10px;
  padding: 14px 16px;
  background: linear-gradient(135deg, #0D1B2E, #1a2d4a);
  border-bottom: 1px solid rgba(201,169,110,0.15);
  flex-shrink: 0;
}
.lm-chat-avatar {
  width: 36px; height: 36px; border-radius: 50%;
  background: radial-gradient(135deg, #1e3a5f, #0D1B2E);
  border: 1px solid rgba(201,169,110,0.5);
  display: flex; align-items: center; justify-content: center;
  font-family: var(--lm-font-serif); font-style: italic;
  font-size: 1rem; color: var(--lm-gold); flex-shrink: 0;
  text-shadow: 0 0 8px rgba(201,169,110,0.4);
}
.lm-chat-info { flex: 1; min-width: 0; }
.lm-chat-name { font-size: 0.88rem; font-weight: 600; color: #fff; margin: 0; }
.lm-chat-status {
  display: flex; align-items: center; gap: 5px;
  font-size: 0.68rem; color: rgba(255,255,255,0.5); margin-top: 1px;
}
.lm-chat-status-dot {
  width: 5px; height: 5px; background: #4ade80; border-radius: 50%;
  box-shadow: 0 0 6px rgba(74,222,128,0.7); animation: lm-pulse 2s infinite;
}
.lm-chat-actions { display: flex; gap: 4px; align-items: center; }
.lm-chat-action-btn, .lm-chat-close-btn {
  width: 28px; height: 28px; background: rgba(255,255,255,0.07);
  border: none; border-radius: 6px; color: rgba(255,255,255,0.5);
  cursor: pointer; display: flex; align-items: center; justify-content: center;
  font-size: 0.9rem; transition: all 0.15s;
}
.lm-chat-action-btn:hover { background: rgba(255,255,255,0.12); color: #fff; }
.lm-chat-close-btn { font-size: 1.1rem; }
.lm-chat-close-btn:hover { background: rgba(220,50,50,0.2); color: #ff6b6b; }
.lm-chat-messages {
  flex: 1; overflow-y: auto; padding: 16px;
  display: flex; flex-direction: column; gap: 12px;
  background: #0a1019; scroll-behavior: smooth;
}
.lm-chat-messages::-webkit-scrollbar { width: 3px; }
.lm-chat-messages::-webkit-scrollbar-thumb { background: rgba(201,169,110,0.3); border-radius: 2px; }
.lm-msg {
  display: flex; gap: 8px; align-items: flex-end;
  animation: lm-msg-in 0.25s ease-out;
}
@keyframes lm-msg-in {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}
.lm-msg.lm-msg-user { flex-direction: row-reverse; }
.lm-msg-bubble {
  max-width: 82%; padding: 10px 13px; border-radius: 14px;
  font-size: 0.82rem; line-height: 1.55; word-break: break-word;
}
.lm-msg-aria .lm-msg-bubble {
  background: rgba(13,27,46,0.7); border: 1px solid rgba(201,169,110,0.12);
  color: rgba(255,255,255,0.9); border-radius: 4px 14px 14px 14px;
}
.lm-msg-user .lm-msg-bubble {
  background: linear-gradient(135deg, #c9a96e, #a07840);
  color: #0D1B2E; font-weight: 500; border-radius: 14px 14px 4px 14px;
}
.lm-msg-avatar {
  width: 24px; height: 24px; border-radius: 50%;
  background: radial-gradient(135deg, #1e3a5f, #0D1B2E);
  border: 1px solid rgba(201,169,110,0.3);
  display: flex; align-items: center; justify-content: center;
  font-family: var(--lm-font-serif); font-style: italic;
  font-size: 0.7rem; color: var(--lm-gold); flex-shrink: 0;
}
.lm-typing { display: flex; gap: 8px; align-items: flex-end; animation: lm-msg-in 0.25s ease-out; }
.lm-typing-bubble {
  background: rgba(13,27,46,0.7); border: 1px solid rgba(201,169,110,0.12);
  border-radius: 4px 14px 14px 14px; padding: 12px 16px;
  display: flex; gap: 4px; align-items: center;
}
.lm-typing-dot {
  width: 5px; height: 5px; background: rgba(201,169,110,0.6);
  border-radius: 50%; animation: lm-typing-bounce 1.2s infinite ease-in-out;
}
.lm-typing-dot:nth-child(2) { animation-delay: 0.15s; }
.lm-typing-dot:nth-child(3) { animation-delay: 0.3s; }
@keyframes lm-typing-bounce {
  0%, 60%, 100% { transform: translateY(0); }
  30% { transform: translateY(-5px); }
}
.lm-chat-welcome {
  flex: 1; display: flex; flex-direction: column;
  align-items: center; justify-content: center;
  text-align: center; padding: 1.5rem; gap: 12px;
}
.lm-chat-welcome-logo {
  width: 52px; height: 52px; border-radius: 50%;
  background: radial-gradient(135deg, #1e3a5f, #0D1B2E);
  border: 1px solid rgba(201,169,110,0.4);
  display: flex; align-items: center; justify-content: center;
  font-family: var(--lm-font-serif); font-style: italic;
  font-size: 1.6rem; color: var(--lm-gold);
  text-shadow: 0 0 16px rgba(201,169,110,0.5);
  box-shadow: 0 0 24px rgba(201,169,110,0.12); margin-bottom: 4px;
}
.lm-chat-welcome h3 {
  font-family: var(--lm-font-serif); font-size: 1.1rem;
  font-weight: 600; color: #fff; margin: 0;
}
.lm-chat-welcome p { font-size: 0.77rem; color: rgba(255,255,255,0.45); margin: 0; line-height: 1.5; }
.lm-chat-suggestions { display: flex; flex-direction: column; gap: 6px; width: 100%; margin-top: 4px; }
.lm-suggestion-chip {
  background: rgba(201,169,110,0.07); border: 1px solid rgba(201,169,110,0.18);
  border-radius: 8px; padding: 8px 12px; font-size: 0.75rem;
  color: rgba(201,169,110,0.85); cursor: pointer; text-align: left;
  transition: all 0.15s; font-family: var(--lm-font-sans); width: 100%;
}
.lm-suggestion-chip:hover { background: rgba(201,169,110,0.12); border-color: rgba(201,169,110,0.35); color: var(--lm-gold); }
.lm-chat-input-area {
  padding: 12px; background: #0c1420;
  border-top: 1px solid rgba(255,255,255,0.05); flex-shrink: 0;
}
.lm-chat-input-row {
  display: flex; align-items: flex-end; gap: 8px;
  background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.08);
  border-radius: 12px; padding: 8px 10px; transition: border-color 0.2s;
}
.lm-chat-input-row:focus-within { border-color: rgba(201,169,110,0.35); box-shadow: 0 0 0 3px rgba(201,169,110,0.06); }
.lm-chat-textarea {
  flex: 1; background: none; border: none; outline: none;
  color: rgba(255,255,255,0.9); font-family: var(--lm-font-sans);
  font-size: 0.82rem; line-height: 1.5; resize: none; max-height: 100px; min-height: 20px;
}
.lm-chat-textarea::placeholder { color: rgba(255,255,255,0.2); }
.lm-chat-send-btn {
  width: 30px; height: 30px;
  background: linear-gradient(135deg, #c9a96e, #a07840);
  border: none; border-radius: 8px;
  display: flex; align-items: center; justify-content: center;
  cursor: pointer; flex-shrink: 0; transition: all 0.2s; color: var(--lm-navy);
}
.lm-chat-send-btn:hover { transform: scale(1.05); box-shadow: 0 4px 12px rgba(201,169,110,0.3); }
.lm-chat-send-btn:disabled { opacity: 0.4; cursor: not-allowed; transform: none; }
.lm-chat-footer-note {
  text-align: center; font-size: 0.62rem;
  color: rgba(255,255,255,0.15); margin-top: 6px; letter-spacing: 0.02em;
}
@media (max-width: 768px) {
  .lm-menu, .lm-nav-right { display: none; }
  .lm-hamburger { display: flex; }
  #lm-chat-widget {
    bottom: 0; right: 0; left: 0; width: 100%; height: 70vh;
    border-radius: 20px 20px 0 0; border-bottom: none;
    transform-origin: bottom center;
  }
  #lm-aria-fab { bottom: 20px; right: 20px; }
}
#lm-mobile-menu {
  display: none; position: fixed; inset: 0;
  background: rgba(13,27,46,0.98); z-index: 9998;
  flex-direction: column; padding: 80px 2rem 2rem; overflow-y: auto;
}
#lm-mobile-menu.lm-open { display: flex; }
.lm-mob-link {
  display: block; padding: 1rem 0;
  border-bottom: 1px solid rgba(255,255,255,0.06);
  color: rgba(255,255,255,0.8); font-size: 1.2rem;
  text-decoration: none; font-family: var(--lm-font-serif);
}
.lm-mob-link:hover { color: var(--lm-gold); }
`;

const NAV_ITEMS = [
  { label: 'Propiedades', href: 'propiedades.html', items: [
    { icon: '🏠', label: 'Apartamentos', sub: 'Unidades residenciales', href: 'propiedades.html?tipo=apartamento' },
    { icon: '🏡', label: 'Casas', sub: 'Propiedades independientes', href: 'propiedades.html?tipo=casa' },
    { icon: '🏢', label: 'Oficinas', sub: 'Espacios corporativos', href: 'propiedades.html?tipo=oficina' },
    { icon: '🏪', label: 'Locales Comerciales', sub: 'Comercio y retail', href: 'propiedades.html?tipo=local' },
    { icon: '🔍', label: 'Ver todo el portafolio', sub: 'Todas las propiedades', href: 'propiedades.html' },
  ]},
  { label: 'Zonas', href: 'propiedades.html', items: [
    { icon: '⭐', label: 'Usaquén', sub: 'Norte exclusivo', href: 'propiedades.html?zona=usaquen' },
    { icon: '🌿', label: 'Chapinero', sub: 'Arte y gastronomía', href: 'propiedades.html?zona=chapinero' },
    { icon: '💎', label: 'La Cabrera', sub: 'Lujo y exclusividad', href: 'propiedades.html?zona=la-cabrera' },
    { icon: '🌳', label: 'Rosales', sub: 'Tradición y elegancia', href: 'propiedades.html?zona=rosales' },
    { icon: '🏙️', label: 'Santa Bárbara', sub: 'Modernidad y confort', href: 'propiedades.html?zona=santa-barbara' },
  ]},
  { label: 'Blog', href: 'blog.html', items: [
    { icon: '📊', label: 'Mercado Inmobiliario', sub: 'Tendencias y análisis', href: 'blog.html?cat=mercado' },
    { icon: '💡', label: 'Consejos Compradores', sub: 'Guías prácticas', href: 'blog.html?cat=compradores' },
    { icon: '📋', label: 'Legal y Notarial', sub: 'Trámites y documentos', href: 'blog.html?cat=legal' },
    { icon: '🏗️', label: 'Inversión Inmobiliaria', sub: 'Rentabilidad y estrategia', href: 'blog.html?cat=inversion' },
    { icon: '📰', label: 'Ver todos los artículos', sub: 'Toda nuestra biblioteca', href: 'blog.html' },
  ]},
  { label: 'Calculadora', href: 'calculadora.html', items: [
    { icon: '📝', label: 'Gastos Notariales', sub: 'Escrituración y cierre', href: 'calculadora.html#notariales' },
    { icon: '🏦', label: 'Crédito Hipotecario', sub: 'Cuota y amortización', href: 'calculadora.html#credito' },
    { icon: '📈', label: 'Rentabilidad', sub: 'Cap Rate e inversión', href: 'calculadora.html#rentabilidad' },
    { icon: '💸', label: 'Ganancia Ocasional', sub: 'Impuesto al vender', href: 'calculadora.html#ganancia' },
    { icon: '💳', label: 'Capacidad Endeudamiento', sub: 'VIS / No VIS', href: 'calculadora.html#endeudamiento' },
    { icon: '🧮', label: 'Suite Completa', sub: 'Todas las calculadoras', href: 'calculadora.html' },
  ]},
  { label: 'Nosotros', href: '#nosotros', items: [
    { icon: '🏛️', label: 'Nuestra Historia', sub: 'Quiénes somos', href: '#nosotros' },
    { icon: '👥', label: 'El Equipo', sub: 'Asesores especializados', href: '#equipo' },
    { icon: '🤝', label: 'Valores y Filosofía', sub: 'Lo que nos mueve', href: '#valores' },
  ]},
  { label: 'Contacto', href: 'contacto.html', items: [
    { icon: '📞', label: 'Hablar con un Asesor', sub: 'Asesoría personalizada', href: 'contacto.html' },
    { icon: '📍', label: 'Nuestra Oficina', sub: 'Bogotá, Colombia', href: 'contacto.html#ubicacion' },
    { icon: '✉️', label: 'Escríbenos', sub: 'info@lomazhome.com', href: 'mailto:info@lomazhome.com' },
  ]},
];

const CHEVRON = '<svg viewBox="0 0 10 6" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M1 1l4 4 4-4"/></svg>';

function buildNav() {
  const cp = window.location.pathname.split('/').pop() || 'index.html';
  const items = NAV_ITEMS.map(item => {
    const active = cp === item.href || cp.includes(item.href.split('.')[0]);
    const dd = item.items.map(d =>
      '<a href="' + d.href + '"><span class="dd-icon">' + d.icon + '</span><span class="dd-text"><span class="dd-label">' + d.label + '</span><span class="dd-sub">' + d.sub + '</span></span></a>'
    ).join('');
    return '<li class="lm-item"><a class="lm-link' + (active ? ' lm-active' : '') + '" href="' + item.href + '">' + item.label + ' ' + CHEVRON + '</a><div class="lm-dropdown">' + dd + '</div></li>';
  }).join('');
  return '<nav id="lm-nav" class="lm-transparent"><div id="lm-progress"></div><div class="lm-nav-inner"><a class="lm-logo" href="index.html">Lo<span>Maz</span> Home</a><ul class="lm-menu">' + items + '</ul><div class="lm-nav-right"><button class="lm-aria-nav-btn" id="lm-aria-nav-trigger"><span class="lm-aria-dot"></span>ARIA IA</button><a class="lm-asesores-btn" href="panel.html">ACCESO ASESORES</a><button class="lm-hamburger" id="lm-ham"><span></span><span></span><span></span></button></div></div></nav>';
}

function buildFAB() {
  return '<div id="lm-aria-fab" role="button" aria-label="Habla con ARIA" tabindex="0"><div class="lm-fab-orb"><div class="lm-fab-ring-2"></div><div class="lm-fab-ring"></div><div class="lm-fab-circle"><span class="lm-fab-letter">A</span><span class="lm-fab-status"></span></div></div><div class="lm-fab-tooltip">ARIA · Asesora IA</div></div>';
}

function buildChat() {
  return '<div id="lm-chat-widget"><div class="lm-chat-header"><div class="lm-chat-avatar">A</div><div class="lm-chat-info"><p class="lm-chat-name">ARIA</p><div class="lm-chat-status"><span class="lm-chat-status-dot"></span><span>Asesora IA · En línea</span></div></div><div class="lm-chat-actions"><button class="lm-chat-action-btn" id="lm-chat-expand" title="Chat completo">⤢</button><button class="lm-chat-close-btn" id="lm-chat-close">✕</button></div></div><div class="lm-chat-messages" id="lm-chat-msgs"><div class="lm-chat-welcome" id="lm-chat-welcome"><div class="lm-chat-welcome-logo">A</div><h3>Hola, soy ARIA</h3><p>Tu asesora inmobiliaria IA.<br>¿En qué puedo ayudarte?</p><div class="lm-chat-suggestions"><button class="lm-suggestion-chip" data-msg="¿Cuáles son las propiedades en Usaquén?">🏠 Propiedades en Usaquén</button><button class="lm-suggestion-chip" data-msg="¿Cómo funciona el proceso de compra?">📋 Proceso de compra</button><button class="lm-suggestion-chip" data-msg="¿Qué gastos notariales debo considerar?">💸 Gastos notariales</button></div></div></div><div class="lm-chat-input-area"><div class="lm-chat-input-row"><textarea class="lm-chat-textarea" id="lm-chat-input" placeholder="Escribe tu consulta..." rows="1"></textarea><button class="lm-chat-send-btn" id="lm-chat-send" disabled><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M22 2L11 13"/><path d="M22 2L15 22 11 13 2 9l20-7z"/></svg></button></div><div class="lm-chat-footer-note">ARIA · LoMaz Home IA</div></div></div>';
}

function buildMob() {
  return '<div id="lm-mobile-menu"><button id="lm-mob-close" style="position:absolute;top:1.5rem;right:1.5rem;background:none;border:none;color:white;font-size:1.5rem;cursor:pointer">✕</button>' + NAV_ITEMS.map(i => '<a class="lm-mob-link" href="' + i.href + '">' + i.label + '</a>').join('') + '<a class="lm-mob-link" href="panel.html" style="color:var(--lm-gold)">Acceso Asesores</a></div>';
}

const ARIA_KB = {
  propiedades: 'Tenemos un portafolio selecto en los mejores barrios de Bogotá: Usaquén, Chapinero, La Cabrera, Rosales y Santa Bárbara. Apartamentos, casas y espacios comerciales disponibles. ¿Te gustaría filtrar por zona o tipo de inmueble?',
  usaquen: 'Usaquén es uno de los barrios más exclusivos de Bogotá. Ofrecemos apartamentos y casas desde $450M COP. Ambiente tranquilo, gastronomía y cercanía a centros empresariales.',
  chapinero: 'Chapinero Alto es una zona muy cotizada: arquitectura moderna, restaurantes y vida cultural. Excelente para inversión y arriendo.',
  compra: 'El proceso de compra incluye: 1) Oferta y promesa de compraventa, 2) Estudio jurídico, 3) Crédito hipotecario (si aplica), 4) Escrituración ante notaría, 5) Registro ORIP. En LoMaz Home te acompañamos en cada paso.',
  notariales: 'Los gastos notariales en 2026 incluyen: derechos notariales (0.27%), beneficencia (1%), registro ORIP (0.5%), IVA sobre honorarios. Usa nuestra calculadora para un estimado exacto.',
  credito: 'Para un crédito hipotecario necesitas: ingresos demostrables, historial crediticio limpio, cuota inicial mínima del 30% (VIS). Los bancos financian hasta el 70-80%. ¿Calculamos tu capacidad de endeudamiento?',
  contacto: 'Contáctanos: info@lomazhome.com o +57 (300) 000-0000. Agenda una consulta privada sin costo desde nuestra página de contacto.',
  default: 'Soy ARIA, asesora inmobiliaria IA de LoMaz Home. Puedo ayudarte con propiedades, zonas de Bogotá, proceso de compra, gastos notariales y créditos. ¿Qué necesitas saber?'
};

function ariaResp(msg) {
  const m = msg.toLowerCase();
  if (m.includes('usaqu')) return ARIA_KB.usaquen;
  if (m.includes('chapinero')) return ARIA_KB.chapinero;
  if (m.includes('propiedad') || m.includes('apartamento') || m.includes('casa')) return ARIA_KB.propiedades;
  if (m.includes('compra') || m.includes('proceso') || m.includes('escritura')) return ARIA_KB.compra;
  if (m.includes('notarial') || m.includes('gastos')) return ARIA_KB.notariales;
  if (m.includes('crédito') || m.includes('credito') || m.includes('hipotecario')) return ARIA_KB.credito;
  if (m.includes('contacto') || m.includes('teléfono') || m.includes('email')) return ARIA_KB.contacto;
  return ARIA_KB.default;
}

let chatOpen = false, chatTyping = false, chatMsgs = [];

function addMsg(text, role) {
  const msgs = document.getElementById('lm-chat-msgs');
  const w = document.getElementById('lm-chat-welcome');
  if (w) w.remove();
  const d = document.createElement('div');
  d.className = 'lm-msg lm-msg-' + role;
  d.innerHTML = role === 'aria'
    ? '<div class="lm-msg-avatar">A</div><div class="lm-msg-bubble">' + text + '</div>'
    : '<div class="lm-msg-bubble">' + text + '</div>';
  msgs.appendChild(d);
  msgs.scrollTop = msgs.scrollHeight;
}

function showTyping() {
  const msgs = document.getElementById('lm-chat-msgs');
  const d = document.createElement('div');
  d.id = 'lm-typ'; d.className = 'lm-typing';
  d.innerHTML = '<div class="lm-msg-avatar">A</div><div class="lm-typing-bubble"><span class="lm-typing-dot"></span><span class="lm-typing-dot"></span><span class="lm-typing-dot"></span></div>';
  msgs.appendChild(d); msgs.scrollTop = msgs.scrollHeight;
}
function hideTyping() { const e = document.getElementById('lm-typ'); if (e) e.remove(); }

async function streamMsg(text) {
  const msgs = document.getElementById('lm-chat-msgs');
  const w = document.getElementById('lm-chat-welcome'); if (w) w.remove();
  const d = document.createElement('div');
  d.className = 'lm-msg lm-msg-aria';
  const b = document.createElement('div'); b.className = 'lm-msg-bubble';
  d.innerHTML = '<div class="lm-msg-avatar">A</div>'; d.appendChild(b);
  msgs.appendChild(d);
  let i = 0;
  return new Promise(r => {
    (function t() { if (i < text.length) { b.textContent += text[i++]; msgs.scrollTop = msgs.scrollHeight; setTimeout(t, 16); } else r(); })();
  });
}

async function sendMsg(text) {
  if (!text.trim() || chatTyping) return;
  chatTyping = true;
  const sb = document.getElementById('lm-chat-send');
  const inp = document.getElementById('lm-chat-input');
  if (sb) sb.disabled = true; if (inp) { inp.value = ''; inp.style.height = 'auto'; }
  addMsg(text, 'user');
  await new Promise(r => setTimeout(r, 300));
  showTyping();
  await new Promise(r => setTimeout(r, 800 + Math.random() * 600));
  hideTyping();
  await streamMsg(ariaResp(text));
  chatTyping = false; if (sb) sb.disabled = false; if (inp) inp.focus();
}

function toggleChat() {
  chatOpen = !chatOpen;
  const w = document.getElementById('lm-chat-widget');
  if (!w) return;
  if (chatOpen) {
    w.classList.add('lm-chat-open');
    setTimeout(() => { const i = document.getElementById('lm-chat-input'); if (i) i.focus(); }, 350);
  } else { w.classList.remove('lm-chat-open'); }
}

function lmInit() {
  // Styles
  const s = document.createElement('style'); s.textContent = LOMAZ_STYLES; document.head.appendChild(s);
  
  // Hide old nav — specifically target #lhNav, #lhOverlay
  ['#lhNav','#lhOverlay','.nav__overlay'].forEach(sel => {
    document.querySelectorAll(sel).forEach(el => { el.style.cssText += 'display:none!important;'; });
  });
  
  // Build and inject elements
  [buildNav, buildFAB, buildChat, buildMob].forEach(fn => {
    const div = document.createElement('div'); div.innerHTML = fn();
    if (fn === buildNav) document.body.prepend(div.firstChild);
    else document.body.appendChild(div.firstChild);
  });
  
  // Body padding
  if (!document.body.style.paddingTop) document.body.style.paddingTop = '64px';
  
  // Hide WhatsApp
  const hideWA = () => {
    ['.wa-float','.whatsapp-float','.float-wa','.wa-btn-float'].forEach(sel => {
      try { document.querySelectorAll(sel).forEach(el => { el.style.cssText += 'display:none!important;'; }); } catch(e) {}
    });
    document.querySelectorAll('a[href*="wa.me"]').forEach(el => {
      if (['fixed','sticky'].includes(window.getComputedStyle(el).position)) {
        el.style.cssText += 'display:none!important;';
      }
    });
  };
  [0,300,1000,3000].forEach(t => setTimeout(hideWA, t));
  
  // Scroll
  const nav = document.getElementById('lm-nav');
  const pb = document.getElementById('lm-progress');
  const dark = ['calculadora','panel','admin','clientes','leads'].some(p => window.location.pathname.includes(p));
  if (dark) { nav.classList.remove('lm-transparent'); nav.classList.add('lm-dark'); }
  
  window.addEventListener('scroll', () => {
    const sy = window.scrollY;
    if (!dark) {
      if (sy > 80) { nav.classList.remove('lm-transparent'); nav.classList.add('lm-scrolled'); }
      else { nav.classList.remove('lm-scrolled'); nav.classList.add('lm-transparent'); }
    }
    if (pb) { const dh = document.documentElement.scrollHeight - window.innerHeight; pb.style.width = dh > 0 ? (sy/dh*100) + '%' : '0'; }
  }, {passive:true});
  
  // FAB
  const fab = document.getElementById('lm-aria-fab');
  fab.addEventListener('click', toggleChat);
  fab.addEventListener('keydown', e => { if (e.key==='Enter'||e.key===' ') toggleChat(); });
  
  document.getElementById('lm-chat-close').addEventListener('click', () => { if (chatOpen) { chatOpen=true; toggleChat(); } });
  document.getElementById('lm-chat-expand').addEventListener('click', () => { window.location.href='aria.html'; });
  document.getElementById('lm-aria-nav-trigger').addEventListener('click', () => { chatOpen ? (chatOpen=true,toggleChat()) : toggleChat(); });
  
  const inp = document.getElementById('lm-chat-input');
  const sb = document.getElementById('lm-chat-send');
  inp.addEventListener('input', function() { this.style.height='auto'; this.style.height=Math.min(this.scrollHeight,100)+'px'; sb.disabled=!this.value.trim(); });
  inp.addEventListener('keydown', function(e) { if (e.key==='Enter'&&!e.shiftKey) { e.preventDefault(); if (!sb.disabled) sendMsg(this.value.trim()); } });
  sb.addEventListener('click', () => sendMsg(inp.value.trim()));
  
  document.querySelectorAll('.lm-suggestion-chip').forEach(c => c.addEventListener('click', function() { sendMsg(this.dataset.msg); }));
  
  document.getElementById('lm-ham').addEventListener('click', () => document.getElementById('lm-mobile-menu').classList.add('lm-open'));
  document.getElementById('lm-mob-close').addEventListener('click', () => document.getElementById('lm-mobile-menu').classList.remove('lm-open'));
  
  document.addEventListener('keydown', e => {
    if (e.key==='Escape') { if (chatOpen){chatOpen=true;toggleChat();} document.getElementById('lm-mobile-menu').classList.remove('lm-open'); }
  });
  document.addEventListener('click', e => {
    if (chatOpen) {
      const cw=document.getElementById('lm-chat-widget'), f=document.getElementById('lm-aria-fab'), nb=document.getElementById('lm-aria-nav-trigger');
      if (cw&&f&&nb&&!cw.contains(e.target)&&!f.contains(e.target)&&!nb.contains(e.target)) { chatOpen=true; toggleChat(); }
    }
  });
}

if (document.readyState==='loading') document.addEventListener('DOMContentLoaded', lmInit);
else lmInit();

})();
