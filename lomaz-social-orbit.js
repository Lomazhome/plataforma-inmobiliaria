/**
 * LoMaz Home - Social Orbit System v3.1
 * Sol circular luminoso (ARIA) centrado como eje, planetas equidistantes orbitando.
 */
(function () {
  'use strict';

  const PLANETS = [
    {
      id: 'ig',
      name: 'Instagram',
      url: 'https://www.instagram.com/lomazhome',
      brand: '#d6249f',
      svg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none"/></svg>'
    },
    {
      id: 'fb',
      name: 'Facebook',
      url: 'https://www.facebook.com/LomelinAngeliK',
      brand: '#1877F2',
      svg: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M22 12a10 10 0 1 0-11.56 9.88v-6.99H7.9V12h2.54V9.8c0-2.5 1.49-3.89 3.78-3.89 1.09 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.77-1.63 1.56V12h2.77l-.44 2.89h-2.33v6.99A10 10 0 0 0 22 12z"/></svg>'
    },
    {
      id: 'wa',
      name: 'WhatsApp',
      url: 'https://wa.me/573003300343?text=Hola%20LoMaz%20Home%2C%20quiero%20m%C3%A1s%20informaci%C3%B3n.',
      brand: '#25D366',
      svg: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M20.52 3.48A11.86 11.86 0 0 0 12.05 0C5.5 0 .18 5.32.18 11.87a11.8 11.8 0 0 0 1.62 5.95L0 24l6.34-1.66a11.86 11.86 0 0 0 5.7 1.45h.01c6.55 0 11.87-5.32 11.87-11.87a11.78 11.78 0 0 0-3.4-8.44zM12.05 21.8h-.01a9.84 9.84 0 0 1-5.02-1.37l-.36-.21-3.76.99 1-3.66-.23-.37a9.83 9.83 0 0 1-1.51-5.31c0-5.44 4.43-9.87 9.88-9.87 2.64 0 5.12 1.03 6.98 2.9a9.79 9.79 0 0 1 2.89 6.98c0 5.44-4.43 9.87-9.87 9.87zm5.42-7.39c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15s-.77.97-.94 1.17c-.17.2-.35.22-.65.07-.3-.15-1.25-.46-2.38-1.47a8.94 8.94 0 0 1-1.65-2.05c-.17-.3-.02-.46.13-.6.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.07-.15-.67-1.62-.92-2.22-.24-.58-.49-.5-.67-.51l-.57-.01c-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.48s1.07 2.88 1.22 3.08c.15.2 2.1 3.21 5.09 4.5.71.31 1.27.5 1.7.63.71.23 1.36.2 1.88.12.57-.08 1.76-.72 2.01-1.41.25-.7.25-1.29.17-1.41-.07-.12-.27-.2-.57-.35z"/></svg>'
    }
  ];

  const ORBIT_W = 160;
  const ORBIT_H = 160;
  const SUN_D = 38;
  const PLANET_D = 30;
  const RADIUS = 58;
  const SPIN_SEC = 60;

  const style = document.createElement('style');
  style.textContent = `
    /* Ocultar FAB ARIA legacy cuando el sistema orbital esta activo */
    #lm-aria-fab, .lm-aria-fab { display: none !important; }

    .lm-orbit-wrap {
      position: fixed;
      bottom: 18px;
      right: 18px;
      width: ${ORBIT_W}px;
      height: ${ORBIT_H}px;
      z-index: 9998;
      pointer-events: none;
      font-family: 'Inter', system-ui, sans-serif;
    }
    .lm-orbit-stage {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
    }
    .lm-orbit-ring {
      position: absolute;
      top: 50%;
      left: 50%;
      width: ${RADIUS * 2}px;
      height: ${RADIUS * 2}px;
      margin-left: -${RADIUS}px;
      margin-top: -${RADIUS}px;
      border-radius: 50%;
      border: 1px dashed rgba(201,169,110,0.18);
      opacity: 0.6;
      pointer-events: none;
    }
    .lm-orbit-rotor {
      position: absolute;
      top: 50%;
      left: 50%;
      width: 0;
      height: 0;
      animation: lm-spin ${SPIN_SEC}s linear infinite;
    }
    @keyframes lm-spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
    .lm-orbit-wrap:hover .lm-orbit-rotor { animation-play-state: paused; }

    .lm-sun {
      position: absolute;
      top: 50%;
      left: 50%;
      width: ${SUN_D}px;
      height: ${SUN_D}px;
      margin-left: -${SUN_D / 2}px;
      margin-top: -${SUN_D / 2}px;
      border-radius: 50%;
      background:
        radial-gradient(circle at 35% 30%, rgba(255,255,255,0.95) 0%, rgba(255,247,225,0.85) 35%, rgba(232,205,150,0.7) 70%, rgba(201,169,110,0.55) 100%);
      border: 1px solid rgba(201,169,110,0.55);
      box-shadow:
        0 0 0 1px rgba(255,255,255,0.6) inset,
        0 0 12px rgba(232,205,150,0.55),
        0 0 28px rgba(201,169,110,0.35),
        0 0 48px rgba(201,169,110,0.18),
        0 4px 16px rgba(28,25,23,0.08);
      cursor: pointer;
      pointer-events: auto;
      transition: transform 0.4s cubic-bezier(0.4,0,0.2,1);
      animation: lm-sun-glow 4s ease-in-out infinite;
      display: flex; align-items: center; justify-content: center;
      padding: 0;
      z-index: 2;
    }
    .lm-sun::before {
      content: '';
      position: absolute;
      inset: -8px;
      border-radius: 50%;
      background: radial-gradient(circle, rgba(201,169,110,0.18) 0%, rgba(201,169,110,0) 70%);
      pointer-events: none;
      animation: lm-sun-aura 4s ease-in-out infinite;
    }
    .lm-sun-letter {
      font-family: 'Cormorant Garamond', 'Playfair Display', Georgia, serif;
      font-size: 20px;
      font-weight: 600;
      font-style: italic;
      line-height: 1;
      color: #6b4a1a;
      text-shadow:
        0 0 6px rgba(255,255,255,0.8),
        0 0 12px rgba(232,205,150,0.6),
        0 1px 0 rgba(255,255,255,0.5);
      animation: lm-letter-pulse 3.2s ease-in-out infinite;
      position: relative;
      z-index: 1;
      letter-spacing: 0;
      user-select: none;
      pointer-events: none;
    }
    @keyframes lm-sun-glow {
      0%,100% {
        box-shadow:
          0 0 0 1px rgba(255,255,255,0.6) inset,
          0 0 12px rgba(232,205,150,0.55),
          0 0 28px rgba(201,169,110,0.35),
          0 0 48px rgba(201,169,110,0.18),
          0 4px 16px rgba(28,25,23,0.08);
      }
      50% {
        box-shadow:
          0 0 0 1px rgba(255,255,255,0.7) inset,
          0 0 18px rgba(232,205,150,0.7),
          0 0 38px rgba(201,169,110,0.45),
          0 0 62px rgba(201,169,110,0.25),
          0 4px 18px rgba(28,25,23,0.1);
      }
    }
    @keyframes lm-sun-aura {
      0%,100% { opacity: 0.6; transform: scale(1); }
      50% { opacity: 1; transform: scale(1.12); }
    }
    @keyframes lm-letter-pulse {
      0%,100% { opacity: 1; transform: scale(1); text-shadow: 0 0 6px rgba(255,255,255,0.8), 0 0 12px rgba(232,205,150,0.6), 0 1px 0 rgba(255,255,255,0.5); }
      50% { opacity: 0.95; transform: scale(0.96); text-shadow: 0 0 10px rgba(255,255,255,0.95), 0 0 18px rgba(232,205,150,0.8), 0 1px 0 rgba(255,255,255,0.6); }
    }
    .lm-sun:hover {
      transform: scale(1.08);
    }

    .lm-planet {
      position: absolute;
      top: 0;
      left: 0;
      width: ${PLANET_D}px;
      height: ${PLANET_D}px;
      margin-left: -${PLANET_D / 2}px;
      margin-top: -${PLANET_D / 2}px;
      border-radius: 50%;
      background: rgba(255,255,255,0.7);
      backdrop-filter: blur(10px) saturate(160%);
      -webkit-backdrop-filter: blur(10px) saturate(160%);
      border: 1px solid rgba(201,169,110,0.3);
      box-shadow:
        0 2px 10px rgba(28,25,23,0.06),
        inset 0 1px 0 rgba(255,255,255,0.55);
      display: flex; align-items: center; justify-content: center;
      color: #a07840;
      cursor: pointer;
      pointer-events: auto;
      text-decoration: none;
      transition: all 0.35s cubic-bezier(0.4,0,0.2,1);
    }
    .lm-planet svg { width: 14px; height: 14px; display: block; }
    .lm-planet-inner {
      animation: lm-anti-spin ${SPIN_SEC}s linear infinite;
      display: flex; align-items: center; justify-content: center;
    }
    @keyframes lm-anti-spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(-360deg); }
    }
    .lm-orbit-wrap:hover .lm-planet-inner { animation-play-state: paused; }

    .lm-planet:hover {
      background: rgba(255,255,255,0.92);
      border-color: color-mix(in srgb, var(--lm-brand) 55%, rgba(201,169,110,0.4));
      color: var(--lm-brand);
      box-shadow:
        0 4px 18px color-mix(in srgb, var(--lm-brand) 25%, transparent),
        0 0 0 3px color-mix(in srgb, var(--lm-brand) 12%, transparent),
        inset 0 1px 0 rgba(255,255,255,0.7);
    }

    .lm-tooltip {
      position: absolute;
      bottom: calc(100% + 6px);
      left: 50%;
      transform: translateX(-50%);
      background: rgba(28,25,23,0.92);
      color: #f5efe3;
      font-size: 10px;
      letter-spacing: 0.04em;
      padding: 3px 7px;
      border-radius: 4px;
      white-space: nowrap;
      opacity: 0;
      pointer-events: none;
      transition: opacity 0.25s;
    }
    .lm-planet:hover .lm-tooltip { opacity: 1; }

    @media (max-width: 640px) {
      .lm-orbit-wrap { width: 130px; height: 130px; bottom: 12px; right: 12px; }
    }
  `;
  document.head.appendChild(style);

  const wrap = document.createElement('div');
  wrap.className = 'lm-orbit-wrap';
  wrap.setAttribute('aria-label', 'Redes sociales LoMaz Home');

  const stage = document.createElement('div');
  stage.className = 'lm-orbit-stage';
  wrap.appendChild(stage);

  const ring = document.createElement('div');
  ring.className = 'lm-orbit-ring';
  stage.appendChild(ring);

  const rotor = document.createElement('div');
  rotor.className = 'lm-orbit-rotor';
  stage.appendChild(rotor);

  const N = PLANETS.length;
  PLANETS.forEach((p, i) => {
    const angle = (360 / N) * i - 90;
    const rad = angle * Math.PI / 180;
    const x = Math.cos(rad) * RADIUS;
    const y = Math.sin(rad) * RADIUS;

    const a = document.createElement('a');
    a.className = 'lm-planet';
    a.href = p.url;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    a.style.left = x + 'px';
    a.style.top = y + 'px';
    a.style.setProperty('--lm-brand', p.brand);
    a.setAttribute('aria-label', p.name);

    const inner = document.createElement('span');
    inner.className = 'lm-planet-inner';
    inner.innerHTML = p.svg;
    a.appendChild(inner);

    const tip = document.createElement('span');
    tip.className = 'lm-tooltip';
    tip.textContent = p.name;
    a.appendChild(tip);

    rotor.appendChild(a);
  });

  const sun = document.createElement('button');
  sun.type = 'button';
  sun.className = 'lm-sun';
  sun.setAttribute('aria-label', 'ARIA - Asistente LoMaz');
  sun.innerHTML = '<span class="lm-sun-letter" aria-hidden="true">A</span>';
  sun.addEventListener('click', () => {
    const triggers = ['#lm-aria-fab', '.lm-aria-nav-btn', '[data-aria-trigger]', '#aria-trigger'];
    for (const sel of triggers) {
      const el = document.querySelector(sel);
      if (el) { el.click(); return; }
    }
    window.location.href = 'aria.html';
  });
  stage.appendChild(sun);

  function mount() {
    if (!document.body.contains(wrap)) document.body.appendChild(wrap);
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mount);
  } else {
    mount();
  }
})();
