/* ============================================================
   LoMaz Home — lomaz-legal.js
   Franja legal pequeña al final de cada página pública: enlace a la
   Política de Tratamiento de Datos Personales y contacto para titulares.

   Cómo se usa: agregar <script src="/lomaz-legal.js" defer></script>
   antes de </body> en cada página pública (no en el panel de asesores).
   Si la página ya tiene ese enlace en su pie de página, no se duplica.
   ============================================================ */
(function () {
  if (document.getElementById('lmz-legal')) return;
  if (/politica-de-datos\.html$/.test(location.pathname)) return;
  var enPie = document.querySelector('footer a[href*="politica-de-datos.html"]');
  if (enPie) return;

  var css = '\
  #lmz-legal{background:#0A1628;color:#D6D0C8;border-top:1px solid rgba(191,139,48,.35);padding:14px 16px calc(14px + env(safe-area-inset-bottom,0px));font:400 12.5px/1.6 "DM Sans",Inter,system-ui,-apple-system,sans-serif;text-align:center}\
  #lmz-legal a{color:#D4A84B;text-decoration:none;font-weight:500}\
  #lmz-legal a:hover,#lmz-legal a:focus-visible{color:#E8C470;text-decoration:underline}\
  #lmz-legal .sep{color:#7A8898;margin:0 6px}';
  var st = document.createElement('style');
  st.textContent = css;
  document.head.appendChild(st);

  var d = document.createElement('div');
  d.id = 'lmz-legal';
  d.setAttribute('role', 'contentinfo');
  d.innerHTML = '© ' + new Date().getFullYear() + ' LoMaz Home · Bogotá' +
    '<span class="sep">·</span><a href="/politica-de-datos.html">Política de Tratamiento de Datos Personales</a>' +
    '<span class="sep">·</span>Tus datos: <a href="mailto:lomazhome@gmail.com">lomazhome@gmail.com</a>';
  document.body.appendChild(d);
})();
