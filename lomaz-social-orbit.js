/**
 * LoMaz Home — Social Orbit System v1
 * Sistema solar de redes sociales orbitando alrededor de la cápsula ARIA.
 * Carga después de lomaz-nav.js. No modifica el navbar existente.
 *
 * Avance progresivo: se agregarán más planetas conforme se confirmen URLs.
 * Estado actual: Instagram + Facebook + WhatsApp activos.
 */
(function () {
  'use strict';

  const PLANETS = [
    {
      id: 'ig',
      name: 'Instagram',
      url: 'https://www.instagram.com/lomazhome',
      brand: 'radial-gradient(circle at 30% 110%, #fdf497 0%, #fdf497 5%, #fd5949 45%, #d6249f 60%, #285AEB 90%)',
      brandShadow: 'rgba(214,36,159,0.55)',
      orbit: 92, duration: 26, offset: 0,
      svg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="0.9" fill="currentColor"/></svg>'
    },
    {
      id: 'fb',
      name: 'Facebook',
      url: 'https://www.facebook.com/LomelinAngeliK',
      brand: '#1877F2',
      brandShadow: 'rgba(24,119,242,0.55)',
      orbit: 122, duration: 34, offset: 140,
      svg: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M13.5 21v-7.5h2.55l.4-3h-2.95V8.6c0-.87.24-1.46 1.49-1.46H16.5V4.45c-.27-.04-1.2-.12-2.27-.12-2.25 0-3.79 1.37-3.79 3.9v2.27H7.9v3h2.55V21h3.05z"/></svg>'
    },
    {
      id: 'wa',
      name: 'WhatsApp',
      url: 'https://wa.me/573003300343?text=Hola%20LoMaz%20Home%2C%20quiero%20m%C3%A1s%20informaci%C3%B3n.',
      brand: '#25D366',
      brandShadow: 'rgba(37,211,102,0.55)',
      orbit: 152, duration: 42, offset: 260,
      svg: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M17.5 14.4c-.3-.1-1.7-.8-1.9-.9-.3-.1-.4-.1-.6.1s-.7.9-.9 1.1c-.2.2-.3.2-.6.1-.3-.1-1.2-.4-2.3-1.4-.8-.7-1.4-1.7-1.6-2-.2-.3 0-.4.1-.5.1-.1.3-.3.4-.5.1-.1.2-.3.3-.5.1-.2 0-.4 0-.5 0-.1-.6-1.4-.8-1.9-.2-.5-.4-.4-.6-.4h-.5c-.2 0-.4.1-.7.3-.2.3-.9.9-.9 2.2 0 1.3.9 2.6 1.1 2.8.1.2 1.9 2.9 4.6 4 .6.3 1.1.4 1.5.6.6.2 1.2.2 1.7.1.5-.1 1.7-.7 1.9-1.3.2-.7.2-1.2.2-1.3-.1-.2-.3-.2-.6-.4zM12 2C6.5 2 2 6.5 2 12c0 1.9.5 3.6 1.4 5.2L2 22l4.9-1.3c1.5.8 3.3 1.3 5.1 1.3 5.5 0 10-4.5 10-10S17.5 2 12 2zm0 18.1c-1.7 0-3.3-.5-4.6-1.3l-.3-.2-3.4.9.9-3.3-.2-.3C3.5 14.5 3 13.3 3 12c0-5 4-9 9-9s9 4 9 9-4 9-9 9z"/></svg>'
    }
  ];

  const STYLES = `
    #lm-aria-fab { display:none !important; }
    #lm-orbit-system {
      position: fixed; bottom: 32px; right: 32px;
      width: 320px; height: 320px;
      z-index: 99990; pointer-events: none;
      font-family: var(--lm-sans, 'Inter', sans-serif);
    }
    #lm-orbit-system * { box-sizing: border-box; }
    .lm-sun {
      position: absolute; top: 50%; left: 50%;
      transform: translate(-50%, -50%);
      width: 86px; height: 50px; border-radius: 999px;
      background: linear-gradient(135deg, #0D1B2E 0%, #162540 100%);
      border: 1px solid rgba(201,169,110,0.35);
      box-shadow: 0 8px 32px rgba(13,27,46,0.45), 0 0 24px rgba(201,169,110,0.18), inset 0 1px 0 rgba(255,255,255,0.06);
      display: flex; align-items: center; justify-content: center; gap: 7px;
      cursor: pointer; pointer-events: auto;
      transition: all 0.4s cubic-bezier(0.4,0,0.2,1); overflow: hidden;
    }
    .lm-sun::before {
      content: ''; position: absolute; inset: -2px; border-radius: 999px;
      background: radial-gradient(circle at 50% 50%, rgba(201,169,110,0.25), transparent 70%);
      opacity: 0.6; animation: lm-sun-pulse 4s ease-in-out infinite; pointer-events: none;
    }
    @keyframes lm-sun-pulse { 0%,100% { opacity: 0.4; transform: scale(1); } 50% { opacity: 0.8; transform: scale(1.08); } }
    .lm-sun-dot {
      width: 6px; height: 6px; background: #c9a96e; border-radius: 50%;
      box-shadow: 0 0 8px rgba(201,169,110,0.9);
      animation: lm-dot-pulse 2.2s ease-in-out infinite;
    }
    @keyframes lm-dot-pulse { 0%,100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.55; transform: scale(0.75); } }
    .lm-sun-label {
      font-family: var(--lm-serif, 'Cormorant Garamond', Georgia, serif);
      font-style: italic; font-size: 1rem; letter-spacing: 0.12em;
      color: #c9a96e; text-shadow: 0 0 12px rgba(201,169,110,0.4);
    }
    .lm-sun:hover {
      transform: translate(-50%, -50%) scale(1.04);
      border-color: rgba(201,169,110,0.7);
      box-shadow: 0 12px 40px rgba(13,27,46,0.55), 0 0 36px rgba(201,169,110,0.35), inset 0 1px 0 rgba(255,255,255,0.1);
    }
    .lm-orbit-ring {
      position: absolute; top: 50%; left: 50%;
      transform: translate(-50%, -50%); border-radius: 50%;
      border: 1px dashed rgba(201,169,110,0.08); pointer-events: none;
    }
    .lm-orbit-track {
      position: absolute; top: 50%; left: 50%;
      width: 0; height: 0; transform-origin: 0 0;
      animation: lm-orbit-rotate linear infinite; pointer-events: none;
    }
    @keyframes lm-orbit-rotate { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
    .lm-planet {
      position: absolute; width: 38px; height: 38px;
      margin: -19px 0 0 -19px; border-radius: 50%;
      background: rgba(13,27,46,0.85);
      backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px);
      border: 1px solid rgba(201,169,110,0.35);
      color: #c9a96e;
      display: flex; align-items: center; justify-content: center;
      text-decoration: none; pointer-events: auto; cursor: pointer;
      transition: transform 0.35s cubic-bezier(0.4,0,0.2,1), background 0.35s ease, color 0.35s ease, box-shadow 0.35s ease, border-color 0.35s ease;
      box-shadow: 0 4px 14px rgba(13,27,46,0.35);
      animation: lm-planet-counter linear infinite;
    }
    @keyframes lm-planet-counter { from { transform: rotate(0deg); } to { transform: rotate(-360deg); } }
    .lm-planet svg { width: 18px; height: 18px; transition: transform 0.35s ease; }
    .lm-planet:hover { color: #ffffff; border-color: transparent; }
    .lm-planet:hover svg { transform: scale(1.15); }
    #lm-orbit-system:hover .lm-orbit-track, #lm-orbit-system:hover .lm-planet {
      animation-play-state: paused;
    }
    .lm-planet::after {
      content: attr(data-name); position: absolute; bottom: calc(100% + 8px); left: 50%;
      transform: translateX(-50%); background: rgba(13,27,46,0.95); color: #c9a96e;
      padding: 4px 10px; border-radius: 4px; font-size: 0.7rem;
      letter-spacing: 0.08em; text-transform: uppercase; white-space: nowrap;
      opacity: 0; pointer-events: none; transition: opacity 0.2s ease;
      border: 1px solid rgba(201,169,110,0.25);
    }
    .lm-planet:hover::after { opacity: 1; }
    @media (max-width: 768px) {
      #lm-orbit-system { width: 240px; height: 240px; bottom: 18px; right: 18px; }
      .lm-sun { width: 70px; height: 42px; }
      .lm-sun-label { font-size: 0.85rem; }
      .lm-planet { width: 34px; height: 34px; margin: -17px 0 0 -17px; }
      .lm-planet svg { width: 16px; height: 16px; }
    }
    @media (prefers-reduced-motion: reduce) {
      .lm-orbit-track, .lm-planet, .lm-sun::before, .lm-sun-dot { animation: none !important; }
    }
  `;

  function init() {
    const style = document.createElement('style');
    style.id = 'lm-orbit-styles';
    style.textContent = STYLES;
    document.head.appendChild(style);

    const root = document.createElement('div');
    root.id = 'lm-orbit-system';
    root.setAttribute('aria-label', 'Redes sociales LoMaz Home');

    const sun = document.createElement('button');
    sun.className = 'lm-sun';
    sun.type = 'button';
    sun.setAttribute('aria-label', 'Abrir asistente ARIA');
    sun.innerHTML = '<span class="lm-sun-dot"></span><span class="lm-sun-label">ARIA</span>';
    sun.addEventListener('click', function () {
      const ariaPanel = document.getElementById('lm-aria-panel');
      if (ariaPanel) {
        ariaPanel.classList.toggle('lm-open');
      } else {
        document.dispatchEvent(new CustomEvent('aria:toggle'));
      }
    });
    root.appendChild(sun);

    PLANETS.forEach(function (p) {
      const ring = document.createElement('div');
      ring.className = 'lm-orbit-ring';
      ring.style.width = (p.orbit * 2) + 'px';
      ring.style.height = (p.orbit * 2) + 'px';
      root.appendChild(ring);

      const track = document.createElement('div');
      track.className = 'lm-orbit-track';
      track.style.animationDuration = p.duration + 's';
      track.style.animationDelay = (-p.duration * (p.offset / 360)) + 's';

      const planet = document.createElement('a');
      planet.className = 'lm-planet';
      planet.href = p.url;
      planet.target = '_blank';
      planet.rel = 'noopener noreferrer';
      planet.dataset.name = p.name;
      planet.setAttribute('aria-label', 'Visitar perfil de ' + p.name);
      planet.innerHTML = p.svg;
      planet.style.left = p.orbit + 'px';
      planet.style.top = '0';
      planet.style.animationDuration = p.duration + 's';
      planet.style.animationDelay = (-p.duration * (p.offset / 360)) + 's';

      planet.addEventListener('mouseenter', function () {
        planet.style.background = p.brand;
        planet.style.boxShadow = '0 8px 28px ' + p.brandShadow + ', 0 0 0 1px ' + p.brandShadow;
      });
      planet.addEventListener('mouseleave', function () {
        planet.style.background = '';
        planet.style.boxShadow = '';
      });

      track.appendChild(planet);
      root.appendChild(track);
    });

    document.body.appendChild(root);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
