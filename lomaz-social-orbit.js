/**
 * LoMaz Home — Social Orbit System v2 (Refinado)
 * Sistema compacto crista/dorado en armonía con la paleta de la página.
 * Estado actual: Instagram + Facebook + WhatsApp activos.
 * Preparado para crecer hasta 7+ planetas equidistantes en una sola órbita.
 */
(function () {
  'use strict';

  const PLANETS = [
    {
      id: 'ig',
      name: 'Instagram',
      url: 'https://www.instagram.com/lomazhome',
      brand: '#d6249f',
      svg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="0.9" fill="currentColor"/></svg>'
    },
    {
      id: 'fb',
      name: 'Facebook',
      url: 'https://www.facebook.com/LomelinAngeliK',
      brand: '#1877F2',
      svg: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M13.5 21v-7.5h2.55l.4-3h-2.95V8.6c0-.87.24-1.46 1.49-1.46H16.5V4.45c-.27-.04-1.2-.12-2.27-.12-2.25 0-3.79 1.37-3.79 3.9v2.27H7.9v3h2.55V21h3.05z"/></svg>'
    },
    {
      id: 'wa',
      name: 'WhatsApp',
      url: 'https://wa.me/573003300343?text=Hola%20LoMaz%20Home%2C%20quiero%20m%C3%A1s%20informaci%C3%B3n.',
      brand: '#25D366',
      svg: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M17.5 14.4c-.3-.1-1.7-.8-1.9-.9-.3-.1-.4-.1-.6.1s-.7.9-.9 1.1c-.2.2-.3.2-.6.1-.3-.1-1.2-.4-2.3-1.4-.8-.7-1.4-1.7-1.6-2-.2-.3 0-.4.1-.5.1-.1.3-.3.4-.5.1-.1.2-.3.3-.5.1-.2 0-.4 0-.5 0-.1-.6-1.4-.8-1.9-.2-.5-.4-.4-.6-.4h-.5c-.2 0-.4.1-.7.3-.2.3-.9.9-.9 2.2 0 1.3.9 2.6 1.1 2.8.1.2 1.9 2.9 4.6 4 .6.3 1.1.4 1.5.6.6.2 1.2.2 1.7.1.5-.1 1.7-.7 1.9-1.3.2-.7.2-1.2.2-1.3-.1-.2-.3-.2-.6-.4zM12 2C6.5 2 2 6.5 2 12c0 1.9.5 3.6 1.4 5.2L2 22l4.9-1.3c1.5.8 3.3 1.3 5.1 1.3 5.5 0 10-4.5 10-10S17.5 2 12 2zm0 18.1c-1.7 0-3.3-.5-4.6-1.3l-.3-.2-3.4.9.9-3.3-.2-.3C3.5 14.5 3 13.3 3 12c0-5 4-9 9-9s9 4 9 9-4 9-9 9z"/></svg>'
    }
  ];

  // Parámetros geométricos
  const ORBIT_RADIUS = 58;      // distancia del centro al planeta
  const PLANET_SIZE  = 30;      // diámetro de cada planeta
  const SUN_W        = 60;      // ancho cápsula ARIA
  const SUN_H        = 24;      // alto cápsula ARIA
  const CONTAINER    = 160;     // contenedor total
  const SPIN_DURATION = 60;     // segundos por vuelta completa (muy lento, elegante)

  const STYLES = `
    /* Ocultar el FAB orbe antiguo de lomaz-nav.js */
    #lm-aria-fab { display:none !important; }

    #lm-orbit-system {
      position: fixed;
      bottom: 22px;
      right: 22px;
      width: ${CONTAINER}px;
      height: ${CONTAINER}px;
      z-index: 99990;
      pointer-events: none;
      font-family: var(--lm-sans, 'Inter', sans-serif);
    }
    #lm-orbit-system * { box-sizing: border-box; }

    /* Sol — Cápsula ARIA discreta tipo cristal */
    .lm-sun {
      position: absolute;
      top: 50%; left: 50%;
      transform: translate(-50%, -50%);
      width: ${SUN_W}px;
      height: ${SUN_H}px;
      border-radius: 999px;
      background: rgba(255,255,255,0.55);
      backdrop-filter: blur(14px) saturate(160%);
      -webkit-backdrop-filter: blur(14px) saturate(160%);
      border: 1px solid rgba(201,169,110,0.35);
      box-shadow:
        0 4px 18px rgba(28,25,23,0.06),
        inset 0 1px 0 rgba(255,255,255,0.5);
      display: flex; align-items: center; justify-content: center;
      gap: 5px;
      cursor: pointer;
      pointer-events: auto;
      transition: all 0.4s cubic-bezier(0.4,0,0.2,1);
      padding: 0 6px;
    }
    .lm-sun-dot {
      width: 4px; height: 4px;
      background: #c9a96e;
      border-radius: 50%;
      box-shadow: 0 0 6px rgba(201,169,110,0.7);
      animation: lm-dot-pulse 2.4s ease-in-out infinite;
      flex-shrink: 0;
    }
    @keyframes lm-dot-pulse {
      0%,100% { opacity: 1; transform: scale(1); box-shadow: 0 0 6px rgba(201,169,110,0.7); }
      50% { opacity: 0.5; transform: scale(0.8); box-shadow: 0 0 10px rgba(201,169,110,0.9); }
    }
    .lm-sun-label {
      font-family: var(--lm-serif, 'Cormorant Garamond', Georgia, serif);
      font-style: italic;
      font-size: 0.72rem;
      letter-spacing: 0.14em;
      color: #a07840;
      line-height: 1;
    }
    .lm-sun:hover {
      background: rgba(255,255,255,0.75);
      border-color: rgba(201,169,110,0.55);
      box-shadow:
        0 6px 22px rgba(201,169,110,0.18),
        0 0 0 1px rgba(201,169,110,0.15),
        inset 0 1px 0 rgba(255,255,255,0.6);
    }

    /* Track giratorio (contiene un planeta) */
    .lm-orbit-track {
      position: absolute;
      top: 50%; left: 50%;
      width: 0; height: 0;
      transform-origin: 0 0;
      animation: lm-orbit-rotate ${SPIN_DURATION}s linear infinite;
      pointer-events: none;
    }
    @keyframes lm-orbit-rotate {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }

    /* Planeta — círculo de cristal con borde dorado */
    .lm-planet {
      position: absolute;
      width: ${PLANET_SIZE}px;
      height: ${PLANET_SIZE}px;
      margin: ${-PLANET_SIZE/2}px 0 0 ${-PLANET_SIZE/2}px;
      border-radius: 50%;
      background: rgba(255,255,255,0.55);
      backdrop-filter: blur(14px) saturate(160%);
      -webkit-backdrop-filter: blur(14px) saturate(160%);
      border: 1px solid rgba(201,169,110,0.3);
      color: #a07840;
      display: flex; align-items: center; justify-content: center;
      text-decoration: none;
      pointer-events: auto;
      cursor: pointer;
      box-shadow:
        0 3px 10px rgba(28,25,23,0.05),
        inset 0 1px 0 rgba(255,255,255,0.5);
      transition:
        color 0.4s ease,
        border-color 0.4s ease,
        box-shadow 0.4s ease,
        transform 0.35s cubic-bezier(0.4,0,0.2,1);
      /* Contrarrotación para que el ícono no gire */
      animation: lm-planet-counter ${SPIN_DURATION}s linear infinite;
    }
    @keyframes lm-planet-counter {
      from { transform: rotate(0deg); }
      to { transform: rotate(-360deg); }
    }
    .lm-planet svg {
      width: 15px; height: 15px;
      transition: transform 0.35s ease;
    }

    /* Hover: el ícono y borde adoptan el color de la red, halo fluorescente sutil */
    .lm-planet:hover {
      color: var(--lm-brand);
      border-color: var(--lm-brand);
      box-shadow:
        0 0 0 3px color-mix(in srgb, var(--lm-brand) 14%, transparent),
        0 4px 18px color-mix(in srgb, var(--lm-brand) 28%, transparent),
        inset 0 1px 0 rgba(255,255,255,0.6);
    }
    .lm-planet:hover svg { transform: scale(1.12); }

    /* Pausar órbita al hover sobre cualquier elemento del sistema */
    #lm-orbit-system:hover .lm-orbit-track,
    #lm-orbit-system:hover .lm-planet {
      animation-play-state: paused;
    }

    /* Tooltip refinado */
    .lm-planet::after {
      content: attr(data-name);
      position: absolute;
      bottom: calc(100% + 6px);
      left: 50%;
      transform: translateX(-50%);
      background: rgba(255,255,255,0.92);
      backdrop-filter: blur(10px);
      color: #4a4540;
      padding: 3px 8px;
      border-radius: 3px;
      font-size: 0.62rem;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      white-space: nowrap;
      opacity: 0;
      pointer-events: none;
      transition: opacity 0.2s ease;
      border: 1px solid rgba(201,169,110,0.2);
      box-shadow: 0 2px 8px rgba(28,25,23,0.06);
      font-family: var(--lm-sans, 'Inter', sans-serif);
      font-weight: 500;
    }
    .lm-planet:hover::after { opacity: 1; }

    /* Móvil */
    @media (max-width: 768px) {
      #lm-orbit-system { width: 130px; height: 130px; bottom: 16px; right: 16px; }
    }

    /* Reducir movimiento */
    @media (prefers-reduced-motion: reduce) {
      .lm-orbit-track, .lm-planet, .lm-sun-dot { animation: none !important; }
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

    // Sol ARIA
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

    // Planetas equidistantes
    const total = PLANETS.length;
    const angleStep = 360 / total;

    PLANETS.forEach(function (p, i) {
      const offsetDeg = i * angleStep;

      const track = document.createElement('div');
      track.className = 'lm-orbit-track';
      // Desfase inicial para que cada planeta arranque en su posición equidistante
      track.style.animationDelay = (-SPIN_DURATION * (offsetDeg / 360)) + 's';

      const planet = document.createElement('a');
      planet.className = 'lm-planet';
      planet.href = p.url;
      planet.target = '_blank';
      planet.rel = 'noopener noreferrer';
      planet.dataset.name = p.name;
      planet.setAttribute('aria-label', 'Visitar perfil de ' + p.name);
      planet.style.setProperty('--lm-brand', p.brand);
      planet.innerHTML = p.svg;

      // Posición sobre la órbita (lado derecho del track)
      planet.style.left = ORBIT_RADIUS + 'px';
      planet.style.top = '0';
      planet.style.animationDelay = (-SPIN_DURATION * (offsetDeg / 360)) + 's';

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
