/* ============================================================
   LoMaz Home — lomaz-admin-nav.js
   Menú lateral deslizable para el PANEL DE ASESORES en celular.

   Qué hace: en pantallas de 900px o menos agrega un botón redondo
   "☰" abajo a la izquierda. Al tocarlo se abre un panel con los mismos
   enlaces que la barra lateral del dashboard. En computador no se ve.

   Cómo se usa: agregar <script src="lomaz-admin-nav.js" defer></script>
   antes de </body> en cada página del panel.
   ============================================================ */
(function () {
  if (document.getElementById('lmz-adm-btn')) return; // evita duplicados

  function ic(d) { return '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + d + '</svg>'; }
  var IC = {
      "dashboard.html": "<path d=\"M3 11.5 12 4l9 7.5\"/><path d=\"M5.5 10v10h13V10\"/><path d=\"M10 20v-5h4v5\"/>",
      "catalogo-global.html": "<rect x=\"3\" y=\"4\" width=\"18\" height=\"16\" rx=\"1\"/><path d=\"M3 9h18M9 9v11M15 9v11\"/>",
      "propiedades-publica.html": "<path d=\"M4 20V8l6-4v16\"/><path d=\"M10 20V10h10v10\"/><path d=\"M2.5 20h19M13.5 13.5h3M13.5 16.5h3\"/>",
      "agregar-propiedad.html": "<circle cx=\"12\" cy=\"12\" r=\"9\"/><path d=\"M12 8v8M8 12h8\"/>",
      "mis-propiedades.html": "<path d=\"M8 6h12M8 12h12M8 18h12\"/><path d=\"M4 6h.01M4 12h.01M4 18h.01\"/>",
      "contactos.html": "<circle cx=\"9\" cy=\"8\" r=\"3.5\"/><path d=\"M2.5 20c.6-3.6 3.2-5.5 6.5-5.5s5.9 1.9 6.5 5.5\"/><path d=\"M16 4.8a3.5 3.5 0 0 1 0 6.4M18.5 14.8c1.7.8 2.7 2.5 3 5.2\"/>",
      "formatos.html": "<path d=\"M6 3h8l4 4v14H6z\"/><path d=\"M14 3v4h4M9 12h6M9 16h6\"/>",
      "mensajeria.html": "<path d=\"M4 5h16v11H9l-5 4z\"/>",
      "portales.html": "<circle cx=\"12\" cy=\"12\" r=\"9\"/><path d=\"M3 12h18M12 3c2.8 3 2.8 15 0 18M12 3c-2.8 3-2.8 15 0 18\"/>",
      "marketing.html": "<path d=\"M4 10v4h3l8 4V6L7 10z\"/><path d=\"M18 9.5a3.5 3.5 0 0 1 0 5\"/>",
      "crear-articulo.html": "<path d=\"M4 20l1-4.5L16.5 4a2.1 2.1 0 0 1 3 3L8 18.5 4 20z\"/><path d=\"M14.5 6l3 3\"/>",
      "calculadora.html": "<rect x=\"5\" y=\"3\" width=\"14\" height=\"18\" rx=\"1\"/><path d=\"M8 7h8M8.5 12h.01M12 12h.01M15.5 12h.01M8.5 16h.01M12 16h.01M15.5 16h.01\"/>",
      "admin-usuarios.html": "<path d=\"M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6z\"/><path d=\"M9.5 12l2 2 3.5-4\"/>",
      "perfil-asesor.html": "<circle cx=\"12\" cy=\"8\" r=\"4\"/><path d=\"M4 21c.8-4.2 4-6.5 8-6.5s7.2 2.3 8 6.5\"/>",
      "index.html": "<path d=\"M14 5h5v5M19 5l-8 8\"/><path d=\"M11 6H5v13h13v-6\"/>"
  };
  var SECCIONES = [
    { t: 'Principal', l: [
      { h: 'dashboard.html',       n: 'Inicio' },
      { h: 'catalogo-global.html', n: 'Inventario compartido' },
      { h: 'propiedades-publica.html',     n: 'Todos los inmuebles' } ] },
    { t: 'Mis herramientas', l: [
      { h: 'agregar-propiedad.html', n: 'Agregar inmueble' },
      { h: 'mis-propiedades.html',   n: 'Mis inmuebles' },
      { h: 'contactos.html',         n: 'Contactos (CRM)' },
      { h: 'formatos.html',          n: 'Formatos' },
      { h: 'mensajeria.html',        n: 'Mensajes (Lomi)' } ] },
    { t: 'Publicación', l: [
      { h: 'portales.html',       n: 'Portales' },
      { h: 'marketing.html',      n: 'Marketing y contenido' },
      { h: 'crear-articulo.html', n: 'Crear artículo' } ] },
    { t: 'Análisis', l: [
      { h: 'calculadora.html', n: 'Calculadoras' } ] },
    { t: 'Cuenta', l: [
      { h: 'admin-usuarios.html', n: 'Usuarios' },
      { h: 'perfil-asesor.html',  n: 'Mi perfil' },
      { h: 'index.html',          n: 'Ver el sitio público' } ] }
  ];

  var css = '\
  #lmz-adm-btn{display:none;position:fixed;left:14px;bottom:14px;z-index:9990;width:54px;height:54px;border-radius:50%;border:1px solid rgba(201,169,110,.6);background:linear-gradient(135deg,#c9a96e,#a07840);color:#0D1B2E;font-size:22px;font-weight:700;box-shadow:0 8px 24px rgba(0,0,0,.45);cursor:pointer;align-items:center;justify-content:center;-webkit-tap-highlight-color:transparent}\
  #lmz-adm-ov{display:none;position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:9991}\
  #lmz-adm-dw{position:fixed;top:0;bottom:0;left:0;width:min(300px,84vw);background:#0A1626;border-right:1px solid rgba(201,169,110,.25);z-index:9992;transform:translateX(-105%);transition:transform .25s ease;overflow-y:auto;padding:0 0 2rem;font-family:Inter,system-ui,sans-serif;-webkit-overflow-scrolling:touch}\
  #lmz-adm-dw.abierto{transform:translateX(0)}\
  #lmz-adm-ov.abierto{display:block}\
  .lmz-adm-head{display:flex;align-items:center;justify-content:space-between;padding:1rem 1rem 1rem 1.25rem;border-bottom:1px solid rgba(201,169,110,.2);position:sticky;top:0;background:#0A1626}\
  .lmz-adm-head b{font-family:"Cormorant Garamond",Georgia,serif;color:#f3e7c9;font-size:1.2rem;font-weight:500;letter-spacing:0}\
  .lmz-adm-head b span{color:#c9a96e;font-style:italic}\
  .lmz-adm-cls{width:44px;height:44px;border:none;background:none;color:#f3e7c9;font-size:1.5rem;cursor:pointer}\
  .lmz-adm-sec{font-size:.8125rem;color:#8b96a8;letter-spacing:0;font-weight:500;padding:1.2rem 1.25rem .4rem}\
  #lmz-adm-dw a{display:flex;align-items:center;gap:.8rem;padding:.85rem 1.25rem;color:#c7cfdb;text-decoration:none;font-size:.95rem;min-height:48px;border-left:3px solid transparent}\
  #lmz-adm-dw a.activo{color:#f3e7c9;background:rgba(201,169,110,.12);border-left-color:#c9a96e}\
  #lmz-adm-dw a .ic{display:inline-flex;width:24px;justify-content:center;color:#c9a96e}\
  @media (max-width:900px){#lmz-adm-btn{display:flex}}\
  @media (max-width:768px){\
    /* tablas anchas del panel: se deslizan de lado dentro de su caja, sin romper la página */\
    .table-wrap,.tabla-scroll{overflow-x:auto;-webkit-overflow-scrolling:touch}\
    table{display:block;max-width:100%;overflow-x:auto}\
    /* barra superior del dashboard: se oculta el correo para que quepan avatar + cerrar sesión */\
    .topbar .user-email,.topbar .user-role{display:none}\
    .topbar .btn-logout{padding:.5rem .7rem;font-size:.75rem;white-space:nowrap}\
    input,select,textarea{font-size:16px!important}\
  }';
  var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);

  var actual = (location.pathname.split('/').pop() || 'dashboard.html').toLowerCase();
  var html = '<div class="lmz-adm-head"><b>Lo<span>Maz</span> Home</b><button class="lmz-adm-cls" aria-label="Cerrar menú">&times;</button></div>';
  SECCIONES.forEach(function (s) {
    html += '<div class="lmz-adm-sec">' + s.t + '</div>';
    s.l.forEach(function (x) {
      html += '<a href="' + x.h + '"' + (x.h === actual ? ' class="activo"' : '') + '><span class="ic">' + ic(IC[x.h]) + '</span>' + x.n + '</a>';
    });
  });

  var btn = document.createElement('button'); btn.id = 'lmz-adm-btn'; btn.type = 'button'; btn.setAttribute('aria-label', 'Abrir menú del panel'); btn.innerHTML = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16"/></svg>';
  var ov = document.createElement('div'); ov.id = 'lmz-adm-ov';
  var dw = document.createElement('nav'); dw.id = 'lmz-adm-dw'; dw.setAttribute('aria-label', 'Menú del panel'); dw.innerHTML = html;

  function abrir() { dw.classList.add('abierto'); ov.classList.add('abierto'); document.body.style.overflow = 'hidden'; }
  function cerrar() { dw.classList.remove('abierto'); ov.classList.remove('abierto'); document.body.style.overflow = ''; }
  btn.addEventListener('click', abrir);
  ov.addEventListener('click', cerrar);
  dw.querySelector('.lmz-adm-cls').addEventListener('click', cerrar);
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') cerrar(); });

  function montar() { document.body.appendChild(btn); document.body.appendChild(ov); document.body.appendChild(dw); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', montar); else montar();
})();
