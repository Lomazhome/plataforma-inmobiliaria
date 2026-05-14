/**
 * LoMaz Home — Universal Navigation System
 * Navbar premium con dropdowns hover + botón flotante ARIA
 * Sistema de diseño unificado para todas las páginas
 */

(function() {
'use strict';

// ============================================================
// VARIABLES DE MARCA LOMAZ
// Navy: #0D1B2E | Gold: #c9a96e | Cream: #f5f0e8 | Ink: #1c1917
// ============================================================

const LOMAZ_STYLES = `
/* ======= LOMAZ NAV UNIVERSAL ======= */
:root{
  --lm-navy:#0D1B2E;
  --lm-navy-light:#162540;
  --lm-navy-dark:#080f1a;
  --lm-gold:#c9a96e;
  --lm-gold-light:#e8d5b0;
  --lm-gold-dark:#a07840;
  --lm-cream:#f5f0e8;
  --lm-ink:#1c1917;
  --lm-white:#ffffff;
  --lm-muted:#78716c;
  --lm-serif:'Cormorant Garamond',Georgia,serif;
  --lm-sans:'Inter',system-ui,sans-serif;
  --lm-expo:cubic-bezier(.16,1,.3,1);
  --lm-io:cubic-bezier(.4,0,.2,1);
}

/* === NAV BASE === */
.lm-nav{
  position:fixed;top:0;left:0;right:0;z-index:900;
  height:68px;
  display:flex;align-items:center;
  padding:0 clamp(24px,6vw,96px);
  transition:background 300ms var(--lm-io), box-shadow 300ms var(--lm-io);
}
.lm-nav--transparent{background:transparent;}
.lm-nav--solid{
  background:rgba(245,240,232,0.96);
  backdrop-filter:blur(24px) saturate(180%);
  -webkit-backdrop-filter:blur(24px) saturate(180%);
  box-shadow:0 1px 0 rgba(28,25,23,0.08);
}
.lm-nav--dark{
  background:rgba(13,27,46,0.96);
  backdrop-filter:blur(24px) saturate(180%);
  -webkit-backdrop-filter:blur(24px) saturate(180%);
  box-shadow:0 1px 0 rgba(0,0,0,0.2);
}
.lm-nav--dark .lm-nav__logo{color:var(--lm-white);}
.lm-nav--dark .lm-nav__logo em{color:var(--lm-gold);}
.lm-nav--dark .lm-nav__menu > li > a{color:rgba(255,255,255,0.75);}
.lm-nav--dark .lm-nav__menu > li > a:hover{color:var(--lm-white);}
.lm-nav--dark .lm-nav__menu > li > a::after{background:var(--lm-gold);}
.lm-nav--dark .lm-nav__btn{border-color:var(--lm-gold);color:var(--lm-gold);}
.lm-nav--dark .lm-nav__btn:hover{background:var(--lm-gold);color:var(--lm-navy);border-color:var(--lm-gold);}
.lm-nav--dark .lm-nav__aria-btn{background:rgba(201,169,110,0.15);color:var(--lm-gold);border-color:rgba(201,169,110,0.3);}
.lm-nav--dark .lm-nav__aria-btn:hover{background:var(--lm-gold);color:var(--lm-navy);}
.lm-nav--dark .lm-nav__toggle span{background:var(--lm-white);}

/* === LOGO === */
.lm-nav__logo{
  font-family:var(--lm-serif);
  font-size:1.35rem;font-weight:500;
  letter-spacing:.02em;flex-shrink:0;
  color:var(--lm-ink);text-decoration:none;
  transition:color 200ms;
}
.lm-nav__logo em{font-style:italic;color:var(--lm-gold);font-weight:400;}
.lm-nav__logo:hover em{color:var(--lm-gold-dark);}

/* === MENU === */
.lm-nav__menu{
  display:flex;align-items:center;gap:2px;
  list-style:none;margin:0;padding:0;
  margin-left:auto;margin-right:24px;
}
.lm-nav__menu > li{position:relative;}
.lm-nav__menu > li > a{
  display:flex;align-items:center;gap:5px;
  padding:8px 14px;
  font-size:.68rem;font-weight:500;letter-spacing:.12em;
  text-transform:uppercase;
  color:var(--lm-muted);text-decoration:none;
  position:relative;transition:color 180ms;
  border-radius:4px;white-space:nowrap;
}
.lm-nav__menu > li > a::after{
  content:'';position:absolute;left:14px;right:14px;bottom:2px;
  height:1px;background:var(--lm-gold);
  transform:scaleX(0);transform-origin:left;
  transition:transform 300ms var(--lm-expo);
}
.lm-nav__menu > li > a:hover{color:var(--lm-ink);}
.lm-nav__menu > li > a:hover::after{transform:scaleX(1);}
.lm-nav__menu > li > a.active{color:var(--lm-ink);}
.lm-nav__menu > li > a.active::after{transform:scaleX(1);}

/* Chevron icon */
.lm-nav__chevron{
  width:10px;height:10px;display:inline-block;
  border-right:1.5px solid currentColor;border-bottom:1.5px solid currentColor;
  transform:rotate(45deg) translateY(-2px);
  transition:transform 200ms;
  flex-shrink:0;margin-top:-1px;
}
.lm-nav__menu > li:hover .lm-nav__chevron{transform:rotate(225deg) translateY(-2px);}

/* === DROPDOWN === */
.lm-dropdown{
  position:absolute;top:calc(100% + 8px);left:50%;
  transform:translateX(-50%) translateY(-8px);
  min-width:220px;
  background:var(--lm-white);
  border:1px solid rgba(201,169,110,0.25);
  border-radius:12px;
  box-shadow:0 20px 60px rgba(13,27,46,0.15), 0 4px 16px rgba(13,27,46,0.08);
  padding:8px;
  opacity:0;pointer-events:none;
  transition:opacity 200ms var(--lm-io), transform 200ms var(--lm-io);
  z-index:910;
}
.lm-nav__menu > li:hover .lm-dropdown,
.lm-nav__menu > li:focus-within .lm-dropdown{
  opacity:1;pointer-events:all;
  transform:translateX(-50%) translateY(0);
}
.lm-dropdown::before{
  content:'';position:absolute;top:-5px;left:50%;transform:translateX(-50%);
  width:10px;height:10px;background:var(--lm-white);
  border-left:1px solid rgba(201,169,110,0.25);
  border-top:1px solid rgba(201,169,110,0.25);
  transform:translateX(-50%) rotate(45deg);
}
.lm-dropdown__header{
  padding:8px 12px 6px;
  font-size:.58rem;font-weight:600;letter-spacing:.15em;
  text-transform:uppercase;color:var(--lm-gold-dark);
  border-bottom:1px solid rgba(201,169,110,0.2);
  margin-bottom:4px;
}
.lm-dropdown a{
  display:flex;align-items:center;gap:10px;
  padding:9px 12px;border-radius:8px;
  font-size:.8rem;font-weight:400;
  color:var(--lm-ink);text-decoration:none;
  transition:background 150ms, color 150ms, transform 150ms;
  white-space:nowrap;
}
.lm-dropdown a:hover{
  background:rgba(13,27,46,0.04);
  color:var(--lm-gold-dark);
  transform:translateX(3px);
}
.lm-dropdown a .dd-icon{
  font-size:15px;width:22px;text-align:center;flex-shrink:0;
  opacity:0.8;
}
.lm-dropdown a .dd-info{flex:1;}
.lm-dropdown a .dd-title{font-weight:500;font-size:.82rem;}
.lm-dropdown a .dd-sub{font-size:.72rem;color:var(--lm-muted);margin-top:1px;}
.lm-dropdown--wide{min-width:280px;}

/* Navy Dropdown (for dark nav) */
.lm-nav--dark .lm-dropdown{
  background:var(--lm-navy-light);
  border-color:rgba(201,169,110,0.2);
}
.lm-nav--dark .lm-dropdown::before{background:var(--lm-navy-light);border-color:rgba(201,169,110,0.2);}
.lm-nav--dark .lm-dropdown a{color:rgba(255,255,255,0.85);}
.lm-nav--dark .lm-dropdown a:hover{background:rgba(201,169,110,0.1);color:var(--lm-gold);}
.lm-nav--dark .lm-dropdown__header{color:var(--lm-gold);}

/* === RIGHT SIDE === */
.lm-nav__right{display:flex;align-items:center;gap:10px;flex-shrink:0;}

/* ARIA button */
.lm-nav__aria-btn{
  display:flex;align-items:center;gap:7px;
  padding:8px 16px;
  background:rgba(13,27,46,0.06);
  border:1px solid rgba(13,27,46,0.15);
  border-radius:30px;
  font-size:.68rem;font-weight:500;letter-spacing:.08em;
  text-transform:uppercase;color:var(--lm-navy);
  cursor:pointer;text-decoration:none;
  transition:all 200ms var(--lm-io);
  white-space:nowrap;
}
.lm-nav__aria-btn:hover{
  background:var(--lm-navy);color:var(--lm-white);
  border-color:var(--lm-navy);
  transform:translateY(-1px);
  box-shadow:0 6px 20px rgba(13,27,46,0.25);
}
.lm-nav__aria-dot{
  width:7px;height:7px;border-radius:50%;
  background:#22c55e;animation:lm-pulse 2s infinite;flex-shrink:0;
}
@keyframes lm-pulse{0%,100%{opacity:1;transform:scale(1);}50%{opacity:0.6;transform:scale(0.8);}}

/* Acceso btn */
.lm-nav__btn{
  padding:9px 20px;
  border:1px solid var(--lm-ink);
  background:transparent;color:var(--lm-ink);
  font-family:var(--lm-sans);
  font-size:.68rem;font-weight:500;letter-spacing:.12em;
  text-transform:uppercase;
  cursor:pointer;white-space:nowrap;text-decoration:none;
  transition:background 180ms, color 180ms, transform 180ms;
  display:inline-flex;align-items:center;
}
.lm-nav__btn:hover{background:var(--lm-ink);color:var(--lm-cream);transform:translateY(-1px);}

/* === TOGGLE MOBILE === */
.lm-nav__toggle{
  display:none;flex-direction:column;gap:5px;
  background:none;border:none;cursor:pointer;padding:6px;
  margin-left:12px;
}
.lm-nav__toggle span{display:block;width:22px;height:1.5px;background:var(--lm-ink);transition:all 300ms;}
.lm-nav__toggle.open span:nth-child(1){transform:translateY(6.5px) rotate(45deg);}
.lm-nav__toggle.open span:nth-child(2){opacity:0;}
.lm-nav__toggle.open span:nth-child(3){transform:translateY(-6.5px) rotate(-45deg);}

/* === MOBILE OVERLAY === */
.lm-nav__overlay{
  position:fixed;inset:0;top:68px;z-index:899;
  background:var(--lm-navy);
  transform:translateX(100%);
  transition:transform 400ms var(--lm-expo);
  padding:32px 24px;overflow-y:auto;display:flex;flex-direction:column;gap:8px;
}
.lm-nav__overlay.open{transform:translateX(0);}
.lm-nav__overlay a{
  display:flex;align-items:center;gap:12px;
  padding:14px 16px;
  font-size:1rem;font-weight:400;letter-spacing:.04em;
  color:rgba(255,255,255,0.8);text-decoration:none;
  border-bottom:1px solid rgba(255,255,255,0.08);
  transition:color 200ms, padding-left 200ms;
}
.lm-nav__overlay a:hover{color:var(--lm-gold);padding-left:24px;}
.lm-nav__overlay .section-label{
  font-size:.6rem;font-weight:600;letter-spacing:.2em;
  text-transform:uppercase;color:var(--lm-gold);
  padding:20px 16px 8px;opacity:0.8;
}
.lm-nav__overlay .overlay-aria-btn{
  display:flex;align-items:center;justify-content:center;gap:10px;
  margin:24px 0 12px;padding:16px;
  background:rgba(201,169,110,0.15);
  border:1px solid rgba(201,169,110,0.3);
  border-radius:12px;
  font-size:.9rem;font-weight:500;
  color:var(--lm-gold);text-decoration:none;
  letter-spacing:.05em;
}

/* === ARIA FLOATING BUTTON === */
.lm-aria-fab{
  position:fixed;bottom:28px;right:28px;z-index:800;
  display:flex;align-items:center;gap:0;
  cursor:pointer;
}
.lm-aria-fab__inner{
  display:flex;align-items:center;gap:10px;
  padding:12px 20px 12px 14px;
  background:var(--lm-navy);
  border-radius:50px;
  box-shadow:0 8px 32px rgba(13,27,46,0.35), 0 2px 8px rgba(13,27,46,0.2);
  transition:all 300ms var(--lm-expo);
  border:1px solid rgba(201,169,110,0.2);
}
.lm-aria-fab:hover .lm-aria-fab__inner{
  transform:translateY(-3px) scale(1.02);
  box-shadow:0 16px 48px rgba(13,27,46,0.4), 0 4px 16px rgba(201,169,110,0.15);
  background:var(--lm-navy-light);
  border-color:rgba(201,169,110,0.4);
}
.lm-aria-fab__avatar{
  width:34px;height:34px;border-radius:50%;
  background:linear-gradient(135deg,var(--lm-gold) 0%,var(--lm-gold-dark) 100%);
  display:flex;align-items:center;justify-content:center;
  font-family:var(--lm-serif);font-size:1rem;font-weight:600;
  color:var(--lm-navy);flex-shrink:0;
  position:relative;
}
.lm-aria-fab__avatar::after{
  content:'';position:absolute;bottom:0;right:0;
  width:9px;height:9px;border-radius:50%;
  background:#22c55e;border:2px solid var(--lm-navy);
}
.lm-aria-fab__text{flex:1;}
.lm-aria-fab__name{font-size:.82rem;font-weight:600;color:var(--lm-white);letter-spacing:.02em;}
.lm-aria-fab__status{font-size:.7rem;color:var(--lm-gold);margin-top:1px;}
.lm-aria-fab__pulse{
  position:absolute;top:0;left:0;right:0;bottom:0;
  border-radius:50px;border:1px solid rgba(201,169,110,0.3);
  animation:lm-fab-pulse 3s infinite;
}
@keyframes lm-fab-pulse{
  0%{transform:scale(1);opacity:0.6;}
  70%{transform:scale(1.04);opacity:0;}
  100%{transform:scale(1.04);opacity:0;}
}

/* Close button for ARIA if in modal mode */
.lm-aria-close{
  position:fixed;bottom:28px;right:28px;z-index:1001;display:none;
  width:48px;height:48px;border-radius:50%;
  background:var(--lm-navy);border:none;cursor:pointer;
  align-items:center;justify-content:center;
  color:var(--lm-white);font-size:20px;
  box-shadow:0 4px 20px rgba(13,27,46,0.3);
  transition:all 200ms;
}
.lm-aria-close:hover{background:var(--lm-gold-dark);}

/* Progress bar */
.lm-progress{
  position:fixed;top:0;left:0;z-index:9999;
  height:2px;width:0%;
  background:linear-gradient(90deg,var(--lm-gold-dark),var(--lm-gold),var(--lm-gold-light));
  transition:width 60ms linear;pointer-events:none;
}

/* === RESPONSIVE === */
@media(max-width:900px){
  .lm-nav__menu{display:none;}
  .lm-nav__aria-btn{display:none;}
  .lm-nav__toggle{display:flex;}
}
@media(max-width:640px){
  .lm-aria-fab__text{display:none;}
  .lm-aria-fab__inner{padding:12px;}
  .lm-aria-fab__avatar{width:40px;height:40px;}
  .lm-aria-fab{bottom:20px;right:20px;}
}
`;

// ============================================================
// NAV STRUCTURE DATA
// ============================================================
const NAV_ITEMS = [
  {
    label:'Propiedades',
    href:'propiedades.html',
    dropdown:[
      {icon:'🏢',title:'Apartamentos',sub:'Unidades en edificios premium',href:'propiedades.html#apartamentos'},
      {icon:'🏡',title:'Casas y Villas',sub:'Residencias con jardín y patio',href:'propiedades.html#casas'},
      {icon:'🔑',title:'En Arriendo',sub:'Inmuebles disponibles para rentar',href:'propiedades.html?tipo=arriendo'},
      {icon:'🏷️',title:'En Venta',sub:'Oportunidades de compra',href:'propiedades.html?tipo=venta'},
      {icon:'💎',title:'Propiedades Premium',sub:'Selección boutique exclusiva',href:'propiedades.html?tipo=premium'},
    ]
  },
  {
    label:'Zonas',
    href:'#zonas',
    dropdown:[
      {icon:'⭐',title:'Usaquén',sub:'Alta valorización · Norte exclusivo',href:'index.html#usaquen'},
      {icon:'🌿',title:'Rosales',sub:'Tranquilidad y arquitectura premium',href:'index.html#rosales'},
      {icon:'🔷',title:'Chapinero Alto',sub:'Zona vibrante y cosmopolita',href:'index.html#chapinero'},
      {icon:'👑',title:'La Cabrera',sub:'El sector más exclusivo de Bogotá',href:'index.html#lacabrera'},
      {icon:'🌆',title:'El Chicó',sub:'Barrio residencial de alto nivel',href:'index.html#chico'},
    ]
  },
  {
    label:'Blog',
    href:'blog.html',
    dropdown:[
      {icon:'📰',title:'Mercado Inmobiliario',sub:'Tendencias y análisis 2025',href:'blog.html#mercado'},
      {icon:'💡',title:'Guías de Compra',sub:'Paso a paso para comprar',href:'blog.html#guias'},
      {icon:'📊',title:'Inversión',sub:'Cap Rate, rendimientos y más',href:'blog.html#inversion'},
      {icon:'⚖️',title:'Legal y Tributario',sub:'Impuestos, escrituración, ORIP',href:'blog.html#legal'},
      {icon:'🏗️',title:'Finca Raíz',sub:'Noticias del sector en Colombia',href:'blog-fincaraiz.html'},
    ]
  },
  {
    label:'Calculadora',
    href:'calculadora.html',
    dropdown:[
      {icon:'📋',title:'Gastos Notariales',sub:'Escrituración y cierre · Res. 964/26',href:'calculadora.html#notariales'},
      {icon:'🏦',title:'Crédito Hipotecario',sub:'Cuota mensual y amortización',href:'calculadora.html#hipotecario'},
      {icon:'📈',title:'Rentabilidad (Cap Rate)',sub:'Retorno sobre inversión',href:'calculadora.html#rentabilidad'},
      {icon:'💰',title:'Ganancia Ocasional',sub:'Impuesto al vender propiedad',href:'calculadora.html#ganancia'},
      {icon:'📉',title:'Capacidad de Endeudamiento',sub:'¿Cuánto puedes pedir prestado?',href:'calculadora.html#endeudamiento'},
      {icon:'⚖️',title:'Comparador',sub:'Evalúa dos propiedades lado a lado',href:'comparador.html'},
    ]
  },
  {
    label:'Nosotros',
    href:'#nosotros',
    dropdown:[
      {icon:'🏛️',title:'Nuestra Historia',sub:'Inmobiliaria boutique desde 2024',href:'index.html#nosotros'},
      {icon:'🤝',title:'Nuestro Equipo',sub:'Asesores especializados en Bogotá',href:'index.html#equipo'},
      {icon:'🏅',title:'Por qué LoMaz',sub:'Lo que nos hace diferentes',href:'index.html#diferencial'},
    ]
  },
  {
    label:'Contacto',
    href:'contacto.html',
    dropdown:[
      {icon:'📞',title:'Hablar con Asesor',sub:'Atención personalizada',href:'contacto.html'},
      {icon:'🤖',title:'ARIA — IA Inmobiliaria',sub:'Respuestas instantáneas 24/7',href:'aria.html'},
      {icon:'📍',title:'Visitar Oficina',sub:'Bogotá · Zonas premium',href:'contacto.html#ubicacion'},
    ]
  },
];

// ============================================================
// BUILD & INJECT NAV
// ============================================================
function buildNav(options = {}) {
  const {
    dark = false,          // true = nav oscuro (navy)
    transparent = false,   // true = inicia transparente
    activeSection = ''     // nombre de sección activa para resaltar
  } = options;

  const navClass = dark ? 'lm-nav lm-nav--dark' : 
                   transparent ? 'lm-nav lm-nav--transparent' : 'lm-nav lm-nav--solid';

  const menuHTML = NAV_ITEMS.map(item => {
    const isActive = activeSection && item.label.toLowerCase().includes(activeSection.toLowerCase()) ? 'active' : '';
    const ddHTML = item.dropdown ? `
      <div class="lm-dropdown ${item.dropdown.length > 4 ? 'lm-dropdown--wide' : ''}">
        <div class="lm-dropdown__header">${item.label}</div>
        ${item.dropdown.map(dd => `
          <a href="${dd.href}">
            <span class="dd-icon">${dd.icon}</span>
            <span class="dd-info">
              <div class="dd-title">${dd.title}</div>
              <div class="dd-sub">${dd.sub}</div>
            </span>
          </a>
        `).join('')}
      </div>
    ` : '';

    return `
      <li>
        <a href="${item.href}" class="${isActive}">
          ${item.label}
          ${item.dropdown ? '<span class="lm-nav__chevron"></span>' : ''}
        </a>
        ${ddHTML}
      </li>
    `;
  }).join('');

  // Mobile overlay
  const overlayHTML = `
    <nav class="lm-nav__overlay" id="lm-overlay">
      <a href="aria.html" class="overlay-aria-btn">
        <span>🤖</span> Hablar con ARIA
      </a>
      ${NAV_ITEMS.map(item => `
        <div class="section-label">${item.label}</div>
        ${item.dropdown ? item.dropdown.map(dd => `
          <a href="${dd.href}">${dd.icon} ${dd.title}</a>
        `).join('') : `<a href="${item.href}">${item.label}</a>`}
      `).join('')}
      <div style="height:32px"></div>
      <a href="panel.html" style="margin-top:auto;color:rgba(255,255,255,0.5);font-size:.75rem;text-align:center;border:none;padding:12px;">Acceso Asesores →</a>
    </nav>
  `;

  const navHTML = `
    <div class="lm-progress" id="lm-progress"></div>
    <nav class="${navClass}" id="lm-nav" role="navigation" aria-label="Navegación principal">
      <a href="index.html" class="lm-nav__logo" aria-label="LoMaz Home — Inicio">Lo<em>Maz</em> Home</a>
      <ul class="lm-nav__menu" role="list">${menuHTML}</ul>
      <div class="lm-nav__right">
        <a href="aria.html" class="lm-nav__aria-btn" title="Hablar con ARIA, asesora virtual IA">
          <span class="lm-nav__aria-dot"></span> ARIA IA
        </a>
        <a href="panel.html" class="lm-nav__btn">Acceso Asesores</a>
        <button class="lm-nav__toggle" id="lm-toggle" aria-label="Abrir menú">
          <span></span><span></span><span></span>
        </button>
      </div>
    </nav>
    ${overlayHTML}
  `;

  // Floating ARIA button
  const fabHTML = `
    <a href="aria.html" class="lm-aria-fab" title="Hablar con ARIA — Asesora Virtual IA" aria-label="Abrir chat con ARIA">
      <span class="lm-aria-fab__pulse"></span>
      <div class="lm-aria-fab__inner">
        <div class="lm-aria-fab__avatar">A</div>
        <div class="lm-aria-fab__text">
          <div class="lm-aria-fab__name">ARIA</div>
          <div class="lm-aria-fab__status">Asesora IA · En línea</div>
        </div>
      </div>
    </a>
  `;

  return { navHTML, fabHTML };
}

// ============================================================
// INJECT INTO PAGE
// ============================================================
function inject(options = {}) {
  // Inject styles
  if(!document.getElementById('lm-nav-styles')) {
    const style = document.createElement('style');
    style.id = 'lm-nav-styles';
    style.textContent = LOMAZ_STYLES;
    document.head.appendChild(style);
  }

  // Detect page type for dark/transparent nav
  const pathname = window.location.pathname;
  const filename = pathname.split('/').pop() || 'index.html';
  
  // Pages with dark nav
  const darkPages = ['aria.html', 'admin.html', 'panel.html', 'calculadora.html'];
  const transparentPages = ['index.html', '', 'propiedades.html'];
  
  const isDark = darkPages.some(p => filename.includes(p)) || options.dark;
  const isTransparent = !isDark && (transparentPages.some(p => filename === p) || options.transparent);
  
  const { navHTML, fabHTML } = buildNav({ dark: isDark, transparent: isTransparent });

  // Remove existing nav if present
  document.querySelector('#lm-nav')?.remove();
  document.querySelector('.lm-nav__overlay')?.remove();
  document.querySelector('.lm-aria-fab')?.remove();
  document.querySelector('.lm-progress')?.remove();
  
  // Also remove old nav elements if they exist  
  document.querySelector('.nav')?.remove();
  document.querySelector('nav:not(#lm-nav):not(.lm-nav__overlay)')?.remove();

  // Inject nav at top of body
  const wrapper = document.createElement('div');
  wrapper.innerHTML = navHTML;
  document.body.prepend(...wrapper.childNodes);

  // Inject FAB (not on aria.html itself)
  if(!filename.includes('aria.html')) {
    const fabWrapper = document.createElement('div');
    fabWrapper.innerHTML = fabHTML;
    document.body.appendChild(fabWrapper.firstElementChild);
  }

  // Add body padding for fixed nav
  document.body.style.paddingTop = document.body.style.paddingTop || '0px';

  initBehaviors(isDark, isTransparent);
}

// ============================================================
// BEHAVIORS
// ============================================================
function initBehaviors(isDark, isTransparent) {
  const nav = document.getElementById('lm-nav');
  const toggle = document.getElementById('lm-toggle');
  const overlay = document.getElementById('lm-overlay');
  const progress = document.getElementById('lm-progress');

  // Toggle mobile menu
  if(toggle && overlay) {
    toggle.addEventListener('click', () => {
      const isOpen = overlay.classList.toggle('open');
      toggle.classList.toggle('open', isOpen);
      document.body.style.overflow = isOpen ? 'hidden' : '';
    });
    // Close on link click
    overlay.querySelectorAll('a').forEach(a => {
      a.addEventListener('click', () => {
        overlay.classList.remove('open');
        toggle.classList.remove('open');
        document.body.style.overflow = '';
      });
    });
  }

  // Scroll behavior
  if(nav && isTransparent) {
    const updateNav = () => {
      const scrolled = window.scrollY > 60;
      nav.className = scrolled ? 'lm-nav lm-nav--solid' : 'lm-nav lm-nav--transparent';
    };
    window.addEventListener('scroll', updateNav, { passive: true });
    updateNav();
  }

  // Scroll progress
  if(progress) {
    window.addEventListener('scroll', () => {
      const total = document.documentElement.scrollHeight - window.innerHeight;
      const pct = total > 0 ? (window.scrollY / total) * 100 : 0;
      progress.style.width = pct + '%';
    }, { passive: true });
  }

  // Active link detection
  const currentFile = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.lm-nav__menu > li > a').forEach(a => {
    const href = a.getAttribute('href');
    if(href && (href === currentFile || currentFile.startsWith(href.split('#')[0].split('?')[0]))) {
      a.classList.add('active');
    }
  });

  // Close dropdowns on outside click
  document.addEventListener('click', (e) => {
    if(!e.target.closest('.lm-nav__menu > li')) {
      // Dropdowns auto-hide via CSS :hover
    }
  });

  // Keyboard navigation
  document.querySelectorAll('.lm-nav__menu > li > a').forEach(a => {
    a.addEventListener('keydown', (e) => {
      if(e.key === 'Enter' || e.key === ' ') {
        const dd = a.parentElement.querySelector('.lm-dropdown');
        if(dd) { e.preventDefault(); dd.style.opacity = dd.style.opacity === '1' ? '' : '1'; }
      }
    });
  });
}

// ============================================================
// AUTO-INIT
// ============================================================
if(document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => inject());
} else {
  inject();
}

// Export for manual use
window.LoMazNav = { inject, buildNav, NAV_ITEMS };

})();
