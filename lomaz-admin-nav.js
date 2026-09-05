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

  var SECCIONES = [
    { t: 'Principal', l: [
      { h: 'dashboard.html',       i: '🏠', n: 'Dashboard' },
      { h: 'catalogo-global.html', i: '🌐', n: 'Inventario Compartido' },
      { h: 'propiedades.html',     i: '🏢', n: 'Ver Propiedades' } ] },
    { t: 'Mis Herramientas', l: [
      { h: 'agregar-propiedad.html', i: '➕', n: 'Agregar Propiedad' },
      { h: 'mis-propiedades.html',   i: '📋', n: 'Mis Propiedades' },
      { h: 'leads.html',             i: '🎯', n: 'Leads' },
      { h: 'clientes.html',          i: '👥', n: 'Clientes' },
      { h: 'pipeline.html',          i: '📊', n: 'Pipeline de Ventas' } ] },
    { t: 'Publicación', l: [
      { h: 'portales.html',       i: '🌐', n: 'Portales' },
      { h: 'marketing.html',      i: '📣', n: 'Marketing / Contenido' },
      { h: 'crear-articulo.html', i: '✍️', n: 'Crear Artículo' } ] },
    { t: 'Análisis', l: [
      { h: 'calculadora.html', i: '🧮', n: 'Calculadoras' } ] },
    { t: 'Cuenta', l: [
      { h: 'admin-usuarios.html', i: '🛡️', n: 'Usuarios' },
      { h: 'perfil-asesor.html',  i: '👤', n: 'Mi Perfil' },
      { h: 'index.html',          i: '🌍', n: 'Ver sitio público' } ] }
  ];

  var css = '\
  #lmz-adm-btn{display:none;position:fixed;left:14px;bottom:14px;z-index:9990;width:54px;height:54px;border-radius:50%;border:1px solid rgba(201,169,110,.6);background:linear-gradient(135deg,#c9a96e,#a07840);color:#0D1B2E;font-size:22px;font-weight:700;box-shadow:0 8px 24px rgba(0,0,0,.45);cursor:pointer;align-items:center;justify-content:center;-webkit-tap-highlight-color:transparent}\
  #lmz-adm-ov{display:none;position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:9991}\
  #lmz-adm-dw{position:fixed;top:0;bottom:0;left:0;width:min(300px,84vw);background:#0A1626;border-right:1px solid rgba(201,169,110,.25);z-index:9992;transform:translateX(-105%);transition:transform .25s ease;overflow-y:auto;padding:0 0 2rem;font-family:Inter,system-ui,sans-serif;-webkit-overflow-scrolling:touch}\
  #lmz-adm-dw.abierto{transform:translateX(0)}\
  #lmz-adm-ov.abierto{display:block}\
  .lmz-adm-head{display:flex;align-items:center;justify-content:space-between;padding:1rem 1rem 1rem 1.25rem;border-bottom:1px solid rgba(201,169,110,.2);position:sticky;top:0;background:#0A1626}\
  .lmz-adm-head b{font-family:"Playfair Display",Georgia,serif;color:#f3e7c9;font-size:1.15rem;letter-spacing:1px}\
  .lmz-adm-head b span{color:#c9a96e}\
  .lmz-adm-cls{width:44px;height:44px;border:none;background:none;color:#f3e7c9;font-size:1.5rem;cursor:pointer}\
  .lmz-adm-sec{font-size:.68rem;color:#c9a96e;letter-spacing:2px;text-transform:uppercase;font-weight:600;padding:1.2rem 1.25rem .4rem}\
  #lmz-adm-dw a{display:flex;align-items:center;gap:.8rem;padding:.85rem 1.25rem;color:#c7cfdb;text-decoration:none;font-size:.95rem;min-height:48px;border-left:3px solid transparent}\
  #lmz-adm-dw a.activo{color:#f3e7c9;background:rgba(201,169,110,.12);border-left-color:#c9a96e}\
  #lmz-adm-dw a .ic{width:24px;text-align:center;font-size:1.05rem}\
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
  var html = '<div class="lmz-adm-head"><b>Lo<span>Maz</span> Home</b><button class="lmz-adm-cls" aria-label="Cerrar menú">✕</button></div>';
  SECCIONES.forEach(function (s) {
    html += '<div class="lmz-adm-sec">' + s.t + '</div>';
    s.l.forEach(function (x) {
      html += '<a href="' + x.h + '"' + (x.h === actual ? ' class="activo"' : '') + '><span class="ic">' + x.i + '</span>' + x.n + '</a>';
    });
  });

  var btn = document.createElement('button'); btn.id = 'lmz-adm-btn'; btn.type = 'button'; btn.setAttribute('aria-label', 'Abrir menú del panel'); btn.textContent = '☰';
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
