/* ============================================================
   LoMaz Home — lomaz-contacto.js
   La ÚNICA puerta de entrada de los formularios públicos al CRM.

   Qué hace: guarda a la persona en la tabla `contactos` recordando de
   dónde vino (página, campaña, anuncio). Si llega desde un anuncio con
   ?utm_source=... la base de datos guarda eso y lo recuerda aunque la
   persona navegue por otras páginas antes de escribir.

   Cómo se usa (en cualquier página pública):
     <script src="lomaz-contacto.js"></script>
     await lhCrearContacto(db, { nombre, telefono, email, tipo, negocio,
                                 mensaje, canal, propiedad_id, zona ... });
   `db` es el cliente de Supabase ya creado en la página.
   ============================================================ */
(function () {
  var CLAVE = 'lh_origen_visita';

  // 1) Al entrar al sitio, memoriza los parámetros del anuncio (una vez por visita)
  function guardarOrigen() {
    try {
      var q = new URLSearchParams(window.location.search);
      var o = {};
      ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'fbclid', 'gclid'].forEach(function (k) {
        if (q.get(k)) o[k] = q.get(k);
      });
      if (Object.keys(o).length) {
        o.pagina = window.location.pathname;
        o.referidor = document.referrer || '';
        sessionStorage.setItem(CLAVE, JSON.stringify(o));
      } else if (!sessionStorage.getItem(CLAVE)) {
        sessionStorage.setItem(CLAVE, JSON.stringify({ pagina: window.location.pathname, referidor: document.referrer || '' }));
      }
    } catch (e) {}
  }
  guardarOrigen();

  function origen() {
    try { return JSON.parse(sessionStorage.getItem(CLAVE) || '{}'); } catch (e) { return {}; }
  }

  // Deduce la fuente (de dónde vino) a partir de los datos de la visita
  function deducirFuente(o) {
    var s = (o.utm_source || '').toLowerCase();
    var r = (o.referidor || '').toLowerCase();
    if (o.fbclid || /facebook|fb|instagram|ig/.test(s) || /facebook|instagram/.test(r)) return /instagram|ig/.test(s) || /instagram/.test(r) ? 'instagram' : 'facebook';
    if (o.gclid || /google/.test(s) || /google\./.test(r)) return 'google';
    if (/tiktok/.test(s) || /tiktok/.test(r)) return 'tiktok';
    if (/whatsapp|wa/.test(s)) return 'whatsapp';
    if (/fincaraiz|metrocuadrado|proppit|trovit|mitula/.test(r)) return 'portal';
    if (s) return s;
    return 'web';
  }

  // Autorización de tratamiento de datos (Ley 1581 de 2012) — misma versión que el formulario de captación
  window.LH_CONSENT_VERSION = 'v1-2026-10-03';
  window.LH_POLITICA_URL = 'https://captacionlomaz.netlify.app/politica-datos';
  window.LH_CONSENT_TEXTO = 'Autorizo de manera previa, expresa e informada a LoMaz Home para recolectar, almacenar y usar mis datos personales con el fin de atender esta solicitud y contactarme por teléfono, correo o WhatsApp, incluido su almacenamiento en servidores de proveedores tecnológicos ubicados fuera de Colombia, conforme a la Ley 1581 de 2012 y a la Política de Tratamiento de Datos Personales. Sé que puedo conocer, actualizar, rectificar y suprimir mis datos, o revocar esta autorización, escribiendo a lomazhome@gmail.com.';
  // Casilla lista para pegar en cualquier formulario: <div id="x"></div> + lhCasillaConsent('x')
  window.lhCasillaConsent = function (idContenedor, oscuro) {
    var c = document.getElementById(idContenedor); if (!c) return;
    var col = oscuro ? '#d9d2c5' : '#4a4a4a';
    c.innerHTML = '<label style="display:flex;gap:10px;align-items:flex-start;font-size:12px;line-height:1.5;color:' + col + ';cursor:pointer;text-align:left">' +
      '<input type="checkbox" name="consent" required style="width:18px;height:18px;flex-shrink:0;margin-top:2px;accent-color:#c9a96e">' +
      '<span>' + window.LH_CONSENT_TEXTO.replace('Política de Tratamiento de Datos Personales', '<a href="' + window.LH_POLITICA_URL + '" target="_blank" rel="noopener" style="color:#c9a96e;text-decoration:underline">Política de Tratamiento de Datos Personales</a>') + '</span></label>';
  };
  window.lhConsentOk = function (form) {
    var cb = form && form.querySelector('input[name="consent"]');
    return !!(cb && cb.checked);
  };

  // 2) Crear el contacto
  window.lhCrearContacto = async function (db, datos) {
    var o = origen();
    var fila = {
      nombre: (datos.nombre || '').trim() || 'Sin nombre',
      telefono: datos.telefono || null,
      email: datos.email || null,
      tipo: datos.tipo || 'comprador',
      negocio: datos.negocio || null,
      mensaje: datos.mensaje || null,
      canal: datos.canal || 'formulario_web',
      fuente: datos.fuente || deducirFuente(o),
      campana: datos.campana || o.utm_campaign || null,
      anuncio: datos.anuncio || o.utm_content || null,
      utm_source: o.utm_source || null,
      utm_medium: o.utm_medium || null,
      utm_campaign: o.utm_campaign || null,
      utm_content: o.utm_content || null,
      pagina_origen: window.location.pathname + window.location.search,
      propiedad_id: datos.propiedad_id != null ? String(datos.propiedad_id) : null,
      zona: datos.zona || null,
      zonas_interes: datos.zonas_interes || null,
      tipo_inmueble: datos.tipo_inmueble || null,
      m2: datos.m2 || null,
      habitaciones: datos.habitaciones || null,
      precio_esperado: datos.precio_esperado || null,
      tiempo_publicado: datos.tiempo_publicado || null,
      inmobiliaria_actual: datos.inmobiliaria_actual || null,
      fecha_venta: datos.fecha_venta || null,
      presupuesto_max: datos.presupuesto_max || null,
      etapa: 'nuevo',
      // Prueba de la autorización (art. 7 y 8, Decreto 1377 de 2013)
      consent_at: datos.consent ? new Date().toISOString() : null,
      consent_version: datos.consent ? window.LH_CONSENT_VERSION : null,
      consent_canal: datos.consent ? (datos.canal || 'formulario_web') : null,
      consent_pagina: datos.consent ? window.location.pathname : null
    };
    var r = await db.from('contactos').insert([fila]);
    if (r.error) throw r.error;
    return fila;
  };

  // Traduce la opción "Me interesa..." de los formularios a tipo + negocio
  window.lhTipoDesdeInteres = function (v) {
    v = (v || '').toLowerCase();
    if (/vender/.test(v)) return { tipo: 'propietario', negocio: 'venta' };
    if (/arrendar mi|poner en arriendo|mi inmueble en arriendo/.test(v)) return { tipo: 'propietario', negocio: 'arriendo' };
    if (/tomar en arriendo|arrendar|arriendo/.test(v)) return { tipo: 'inquilino', negocio: 'arriendo' };
    if (/inversi/.test(v)) return { tipo: 'comprador', negocio: 'venta' };
    if (/comprar|compra/.test(v)) return { tipo: 'comprador', negocio: 'venta' };
    return { tipo: 'otro', negocio: null };
  };
})();
