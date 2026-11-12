/* ============================================================
   LoMaz Home — lomaz-pauta.js
   Pestaña «Pauta» del Centro de Mando (marketing.html).

   Qué hace: muestra cada campaña publicitaria (Meta, Google, TikTok)
   como una ficha con su inmueble, asesor, presupuesto, fechas y los
   resultados de cada anuncio, y la compara con la pauta anterior del
   mismo inmueble. También entrega el mensaje y el enlace rastreables
   de cada campaña, para que ningún interesado llegue sin su origen.

   Cómo se instala: una sola línea al final de marketing.html
     <script src="lomaz-pauta.js" defer></script>
   Usa el cliente de Supabase `sb` que ya crea la página.
   Tablas: marketing_pautas, marketing_pauta_resultados
   (supabase/migrations/20261112_pautas.sql).
   ============================================================ */
(function () {
  if (typeof sb === 'undefined' || !document.querySelector('.tabs')) return;

  var pautas = [], resultados = [], contactos = [], propiedades = [];
  var cargado = false, filtroPlat = '', filtroEstado = '';
  var PLAT = { meta: 'Meta Ads', google: 'Google Ads', tiktok: 'TikTok Ads' };
  var FUENTE = { meta: 'facebook', google: 'google', tiktok: 'tiktok' };
  var ESTADO = {
    activa: ['Activa', '#7ed9a1', 'rgba(60,180,110,.14)'],
    terminada: ['Terminada', '#a8a29e', 'rgba(255,255,255,.06)'],
    pausada: ['Pausada', '#f0c674', 'rgba(240,198,116,.14)'],
    borrador: ['Borrador', '#9fc0f5', 'rgba(96,140,220,.14)']
  };

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function plata(n) { return '$' + Math.round(Number(n) || 0).toLocaleString('es-CO'); }
  function num(n) { return (Number(n) || 0).toLocaleString('es-CO'); }
  function fecha(d) { if (!d) return '—'; var p = String(d).slice(0, 10).split('-'); var m = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']; return Number(p[2]) + ' ' + m[Number(p[1]) - 1] + ' ' + p[0]; }
  function hoyIso() { var d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
  function el(id) { return document.getElementById(id); }
  function aviso(t) { if (typeof window.toast === 'function') { window.toast(t); return; } var a = el('ptAviso'); if (!a) return; a.textContent = t; a.style.opacity = '1'; clearTimeout(aviso._t); aviso._t = setTimeout(function () { a.style.opacity = '0'; }, 2600); }

  /* ---------- Estilos y estructura ---------- */
  var css = document.createElement('style');
  css.textContent =
    '.pt-kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:1rem;margin-bottom:1.4rem}' +
    '.pt-card{background:linear-gradient(180deg,#162540 0%,#0F1E36 100%);border:1px solid var(--line);border-radius:var(--r);padding:1.3rem 1.4rem;margin-bottom:1.1rem}' +
    '.pt-top{display:flex;gap:.8rem;align-items:flex-start;justify-content:space-between;flex-wrap:wrap}' +
    '.pt-cod{font-size:.68rem;letter-spacing:1.6px;text-transform:uppercase;color:var(--gold);font-weight:700}' +
    '.pt-nom{font-family:var(--serif);font-size:1.35rem;color:#fff;line-height:1.2;margin:.15rem 0 .3rem}' +
    '.pt-inm{font-size:.86rem;color:var(--txt-soft);line-height:1.45}' +
    '.pt-meta{display:grid;grid-template-columns:repeat(4,1fr);gap:.9rem;margin:1rem 0;padding:.9rem 0;border-top:1px solid var(--line);border-bottom:1px solid var(--line)}' +
    '.pt-meta div span{display:block;font-size:.62rem;letter-spacing:1.2px;text-transform:uppercase;color:var(--txt-mute);font-weight:700;margin-bottom:.2rem}' +
    '.pt-meta div b{font-size:.86rem;color:var(--txt);font-weight:500}' +
    '.pt-barra{height:6px;border-radius:4px;background:rgba(255,255,255,.08);overflow:hidden;margin-top:.35rem}' +
    '.pt-barra i{display:block;height:100%;background:linear-gradient(90deg,var(--gold),var(--gold-d))}' +
    '.pt-tabla{width:100%;border-collapse:collapse;min-width:0;margin:.3rem 0 .2rem}' +
    '.pt-tabla th{padding:.5rem .6rem;font-size:.6rem}' +
    '.pt-tabla td{padding:.55rem .6rem;font-size:.82rem}' +
    '.pt-tabla td.n,.pt-tabla th.n{text-align:right;font-variant-numeric:tabular-nums}' +
    '#panel-pauta .toolbar select{width:auto;min-width:190px}' +
    '.pt-gana{white-space:nowrap}' +
    '.pt-tabla tr.tot td{font-weight:700;color:#fff;border-top:1px solid var(--line-strong)}' +
    '.pt-gana{color:var(--gold-l);font-size:.66rem;font-weight:700;letter-spacing:.8px;text-transform:uppercase;margin-left:.4rem}' +
    '.pt-nota{font-size:.82rem;color:var(--txt-soft);line-height:1.5;margin-top:.7rem}' +
    '.pt-nota b{color:var(--txt)}' +
    '.pt-acc{display:flex;gap:.5rem;flex-wrap:wrap;margin-top:1rem}' +
    '.pt-acc .btn{padding:.5rem .9rem;font-size:.68rem}' +
    '.pt-filas{display:grid;grid-template-columns:2fr 1.1fr 1fr 1fr 1fr 1fr auto;gap:.5rem;align-items:center;margin-bottom:.5rem}' +
    '.pt-filas input,.pt-filas select{padding:.5rem .6rem;font-size:.82rem}' +
    '.pt-filas .h{font-size:.6rem;letter-spacing:1px;text-transform:uppercase;color:var(--gold);font-weight:700}' +
    '.pt-x{background:none;border:none;color:var(--txt-mute);cursor:pointer;font-size:1rem;padding:.2rem .4rem}' +
    '#ptAviso{position:fixed;bottom:22px;left:50%;transform:translateX(-50%);background:#162540;border:1px solid var(--line-strong);color:var(--txt);padding:.7rem 1.2rem;border-radius:10px;font-size:.84rem;opacity:0;transition:opacity .3s;z-index:300;pointer-events:none}' +
    '@media(max-width:760px){.pt-kpis{grid-template-columns:1fr 1fr}.pt-meta{grid-template-columns:1fr 1fr}.pt-filas{grid-template-columns:1fr 1fr}.pt-filas .h{display:none}.pt-tabla th:nth-child(3),.pt-tabla td:nth-child(3),.pt-tabla th:nth-child(4),.pt-tabla td:nth-child(4){display:none}.pt-tabla th,.pt-tabla td{padding:.5rem .3rem}.pt-tabla th{letter-spacing:.4px}.pt-gana{display:block;margin-left:0}.pt-card{padding:1.1rem 1rem}#panel-pauta .toolbar select{flex:1;min-width:0}}';
  document.head.appendChild(css);

  var tab = document.createElement('div');
  tab.className = 'tab'; tab.dataset.panel = 'pauta'; tab.innerHTML = '&#128226; Pauta';
  tab.onclick = function () { window.switchTab('pauta'); };
  document.querySelector('.tabs').appendChild(tab);

  var panel = document.createElement('div');
  panel.className = 'panel'; panel.id = 'panel-pauta';
  panel.innerHTML =
    '<div class="pt-kpis" id="ptKpis"></div>' +
    '<div class="toolbar">' +
    '<select id="ptPlat"><option value="">Todas las plataformas</option><option value="meta">Meta Ads</option><option value="google">Google Ads</option><option value="tiktok">TikTok Ads</option></select>' +
    '<select id="ptEst"><option value="">Todos los estados</option><option value="activa">Activas</option><option value="terminada">Terminadas</option><option value="pausada">Pausadas</option><option value="borrador">Borrador</option></select>' +
    '<div class="spacer"></div>' +
    '<button class="btn btn-primary" id="ptNueva">+ Nueva pauta</button>' +
    '</div>' +
    '<div id="ptHost"><div class="empty">Cargando las pautas...</div></div>';
  var ultimo = document.querySelectorAll('.panel'); ultimo = ultimo[ultimo.length - 1];
  ultimo.parentNode.insertBefore(panel, ultimo.nextSibling);

  var ov = document.createElement('div');
  ov.innerHTML =
    '<div class="overlay" id="ptOvPauta"><div class="modal"><h3 id="ptTitPauta">Nueva <em>pauta</em></h3><input type="hidden" id="ptId">' +
    '<div class="grid3"><div class="fg"><label>Plataforma</label><select id="ptFPlat"><option value="meta">Meta Ads</option><option value="google">Google Ads</option><option value="tiktok">TikTok Ads</option></select></div>' +
    '<div class="fg"><label>Código</label><input type="text" id="ptFCod" placeholder="P-1112"></div>' +
    '<div class="fg"><label>Estado</label><select id="ptFEst"><option value="activa">Activa</option><option value="borrador">Borrador</option><option value="pausada">Pausada</option><option value="terminada">Terminada</option></select></div></div>' +
    '<div class="fg"><label>Nombre de la campaña en la plataforma</label><input type="text" id="ptFNom" placeholder="LH · Venta · Los Monjes · 2026-11-12"></div>' +
    '<div class="fg"><label>Inmueble del inventario</label><select id="ptFProp"><option value="">— Sin inmueble —</option></select></div>' +
    '<div class="fg"><label>Descripción corta del inmueble</label><input type="text" id="ptFInm" placeholder="Apartaestudio frente al C.C. Nuestro Bogotá · venta · $280.000.000"></div>' +
    '<div class="grid2"><div class="fg"><label>Asesor que recibe los mensajes</label><input type="text" id="ptFAse" placeholder="Francy Lomelin"></div>' +
    '<div class="fg"><label>Destino del clic</label><input type="text" id="ptFDes" placeholder="WhatsApp 301 139 8390"></div></div>' +
    '<div class="grid3"><div class="fg"><label>Presupuesto total (COP)</label><input type="number" id="ptFPre" min="0" step="1000"></div>' +
    '<div class="fg"><label>Inicio</label><input type="date" id="ptFIni"></div>' +
    '<div class="fg"><label>Fin</label><input type="date" id="ptFFin"></div></div>' +
    '<div class="grid2"><div class="fg"><label>Objetivo</label><input type="text" id="ptFObj" placeholder="Mensajes a WhatsApp"></div>' +
    '<div class="fg"><label>Público</label><input type="text" id="ptFPub" placeholder="Bogotá · desde 25 años · Advantage+"></div></div>' +
    '<div class="fg"><label>Notas</label><textarea id="ptFNot" placeholder="Qué anuncios lleva, qué se cambió frente a la anterior..."></textarea></div>' +
    '<div class="fg"><label>Aprendizaje para la próxima pauta</label><textarea id="ptFApr" placeholder="Una frase: qué funcionó y qué no."></textarea></div>' +
    '<div class="modal-btns"><button class="btn btn-danger" id="ptBorrar" style="margin-right:auto;display:none">Eliminar</button><button class="btn btn-secondary" id="ptCancelar">Cancelar</button><button class="btn btn-primary" id="ptGuardar">Guardar</button></div></div></div>' +
    '<div class="overlay" id="ptOvRes"><div class="modal" style="max-width:820px"><h3>Cargar <em>resultados</em></h3><input type="hidden" id="ptRPauta">' +
    '<p class="pt-nota" id="ptRNom" style="margin:-.6rem 0 1rem"></p>' +
    '<div class="grid2"><div class="fg"><label>Fecha de corte</label><input type="date" id="ptRFecha"></div>' +
    '<div class="fg"><label>Tipo de corte</label><select id="ptRFinal"><option value="0">Parcial (la campaña sigue)</option><option value="1">Cierre (resultado final)</option></select></div></div>' +
    '<div class="pt-filas"><div class="h">Anuncio</div><div class="h">Formato</div><div class="h">Gastado</div><div class="h">Alcance</div><div class="h">Clics</div><div class="h">Conversac.</div><div></div></div>' +
    '<div id="ptRFilas"></div>' +
    '<button class="btn btn-secondary" id="ptRMas" style="margin-top:.3rem">+ Otro anuncio</button>' +
    '<div class="modal-btns"><button class="btn btn-secondary" id="ptRCancelar">Cancelar</button><button class="btn btn-primary" id="ptRGuardar">Guardar resultados</button></div></div></div>' +
    '<div id="ptAviso"></div>';
  while (ov.firstChild) document.body.appendChild(ov.firstChild);

  /* ---------- Enganche con las pestañas existentes ---------- */
  var _sw = window.switchTab;
  window.switchTab = function (name) {
    if (typeof _sw === 'function') _sw(name);
    document.querySelectorAll('.tab').forEach(function (t) { t.classList.toggle('active', t.dataset.panel === name); });
    panel.classList.toggle('active', name === 'pauta');
    if (name === 'pauta' && !cargado) { cargado = true; cargar(); }
  };

  /* ---------- Datos ---------- */
  async function cargar() {
    var host = el('ptHost');
    var r = await Promise.all([
      sb.from('marketing_pautas').select('*').order('fecha_inicio', { ascending: false }),
      sb.from('marketing_pauta_resultados').select('*').order('fecha_corte', { ascending: false }),
      sb.from('contactos').select('pauta_codigo,etapa').not('pauta_codigo', 'is', null),
      sb.from('propiedades').select('id,titulo,barrio,tipo_operacion,precio').order('id', { ascending: false })
    ]);
    if (r[0].error) {
      host.innerHTML = '<div class="empty">La pestaña de Pauta todavía no está activada.<br><span style="font-size:.85rem">Falta ejecutar en Supabase el archivo <b>20261112_pautas.sql</b>.</span></div>';
      el('ptKpis').innerHTML = ''; cargado = false; return;
    }
    pautas = r[0].data || []; resultados = (r[1].data || []);
    contactos = r[2].error ? [] : (r[2].data || []);
    propiedades = r[3].error ? [] : (r[3].data || []);
    var sel = el('ptFProp');
    sel.innerHTML = '<option value="">— Sin inmueble —</option>' + propiedades.map(function (p) {
      return '<option value="' + p.id + '">#' + p.id + ' · ' + esc((p.titulo || '').slice(0, 70)) + (p.barrio ? ' · ' + esc(p.barrio) : '') + '</option>';
    }).join('');
    pintar();
  }

  // Último corte de cada anuncio de una pauta
  function cortes(pautaId) {
    var visto = {}, lista = [];
    resultados.filter(function (x) { return x.pauta_id === pautaId; }).forEach(function (x) {
      if (!visto[x.anuncio]) { visto[x.anuncio] = 1; lista.push(x); }
    });
    return lista.sort(function (a, b) { return b.conversaciones - a.conversaciones || b.gasto - a.gasto; });
  }
  function totales(pautaId) {
    var c = cortes(pautaId), t = { gasto: 0, alcance: 0, clics: 0, conv: 0, n: c.length, corte: null };
    c.forEach(function (x) { t.gasto += Number(x.gasto) || 0; t.alcance += x.alcance || 0; t.clics += x.clics || 0; t.conv += x.conversaciones || 0; if (!t.corte || x.fecha_corte > t.corte) t.corte = x.fecha_corte; });
    t.cpc = t.conv ? t.gasto / t.conv : null;
    return t;
  }
  // La pauta anterior del mismo inmueble que ya tenga resultados
  function anterior(p) {
    if (!p.propiedad_id) return null;
    var cand = pautas.filter(function (x) { return x.id !== p.id && String(x.propiedad_id) === String(p.propiedad_id) && x.fecha_inicio < p.fecha_inicio; });
    for (var i = 0; i < cand.length; i++) { var t = totales(cand[i].id); if (t.cpc) return { pauta: cand[i], t: t }; }
    return null;
  }

  /* ---------- Pintar ---------- */
  function pintar() {
    var lista = pautas.filter(function (p) { return (!filtroPlat || p.plataforma === filtroPlat) && (!filtroEstado || p.estado === filtroEstado); });
    var inv = 0, conv = 0, activas = 0, presAct = 0;
    pautas.forEach(function (p) { var t = totales(p.id); inv += t.gasto; conv += t.conv; if (p.estado === 'activa') { activas++; presAct += Number(p.presupuesto) || 0; } });
    el('ptKpis').innerHTML =
      kpi('Pautas activas', activas, activas ? '<span><b>' + plata(presAct) + '</b> en presupuesto</span>' : '<span>Ninguna en curso</span>') +
      kpi('Inversión leída', plata(inv), '<span>Suma del gasto cargado</span>') +
      kpi('Conversaciones', num(conv), '<span>Iniciadas desde anuncios</span>') +
      kpi('Costo por conversación', conv ? plata(inv / conv) : '—', '<span>Promedio de todas las pautas</span>');
    if (!lista.length) { el('ptHost').innerHTML = '<div class="empty">Todavía no hay pautas con ese filtro.</div>'; return; }
    el('ptHost').innerHTML = lista.map(tarjeta).join('');
  }
  function kpi(l, n, m) { return '<div class="kpi"><div class="lbl">' + l + '</div><div class="num">' + n + '</div><div class="mini">' + m + '</div></div>'; }

  function tarjeta(p) {
    var e = ESTADO[p.estado] || ESTADO.borrador, c = cortes(p.id), t = totales(p.id), ant = anterior(p);
    var pct = p.presupuesto > 0 ? Math.min(100, Math.round(t.gasto / p.presupuesto * 100)) : 0;
    var nCont = contactos.filter(function (x) { return x.pauta_codigo === p.codigo; }).length;
    var h = '<div class="pt-card"><div class="pt-top"><div>' +
      '<div class="pt-cod">' + esc(p.codigo) + ' · ' + esc(PLAT[p.plataforma] || p.plataforma) + '</div>' +
      '<div class="pt-nom">' + esc(p.nombre) + '</div>' +
      '<div class="pt-inm">' + esc(p.inmueble || 'Sin inmueble asociado') + '</div></div>' +
      '<span class="badge" style="color:' + e[1] + ';background:' + e[2] + ';border:1px solid ' + e[1] + '33">' + e[0] + '</span></div>';
    h += '<div class="pt-meta">' +
      '<div><span>Fechas</span><b>' + fecha(p.fecha_inicio) + ' – ' + fecha(p.fecha_fin) + '</b></div>' +
      '<div><span>Asesor</span><b>' + esc(p.asesor || '—') + '</b></div>' +
      '<div><span>Destino</span><b>' + esc(p.destino || '—') + '</b></div>' +
      '<div><span>Presupuesto</span><b>' + plata(t.gasto) + ' de ' + plata(p.presupuesto) + '</b><div class="pt-barra"><i style="width:' + pct + '%"></i></div></div></div>';
    if (c.length) {
      var mejor = c[0].conversaciones > 0 ? c[0].anuncio : null;
      h += '<div style="overflow-x:auto"><table class="pt-tabla"><thead><tr><th>Anuncio</th><th class="n">Gastado</th><th class="n">Alcance</th><th class="n">Clics</th><th class="n" title="Conversaciones iniciadas">Conv.</th><th class="n" title="Costo por conversación">Costo c/u</th></tr></thead><tbody>' +
        c.map(function (x) {
          return '<tr><td>' + esc(x.anuncio) + (x.anuncio === mejor && c.length > 1 ? '<span class="pt-gana">Ganador</span>' : '') + '</td><td class="n">' + plata(x.gasto) + '</td><td class="n">' + num(x.alcance) + '</td><td class="n">' + num(x.clics) + '</td><td class="n">' + num(x.conversaciones) + '</td><td class="n">' + (x.conversaciones ? plata(x.gasto / x.conversaciones) : '—') + '</td></tr>';
        }).join('') +
        '<tr class="tot"><td>Total</td><td class="n">' + plata(t.gasto) + '</td><td class="n">' + num(t.alcance) + '</td><td class="n">' + num(t.clics) + '</td><td class="n">' + num(t.conv) + '</td><td class="n">' + (t.cpc ? plata(t.cpc) : '—') + '</td></tr></tbody></table></div>';
      var frase = 'Corte del <b>' + fecha(t.corte) + '</b>' + (c[0].es_final ? ' (cierre)' : ' (parcial)') + '.';
      if (ant && t.cpc) {
        var d = Math.round((t.cpc - ant.t.cpc) / ant.t.cpc * 100);
        frase += ' Frente a <b>' + esc(ant.pauta.codigo) + '</b> (' + plata(ant.t.cpc) + ' por conversación), esta va <b>' + (d === 0 ? 'igual' : Math.abs(d) + ' % ' + (d < 0 ? 'más barata' : 'más cara')) + '</b>.';
      } else if (ant) {
        frase += ' Referencia: <b>' + esc(ant.pauta.codigo) + '</b> dio ' + num(ant.t.conv) + ' conversaciones a ' + plata(ant.t.cpc) + ' cada una.';
      }
      h += '<div class="pt-nota">' + frase + '</div>';
    } else {
      h += '<div class="pt-nota">Aún no hay resultados cargados.' + (ant ? ' Referencia: <b>' + esc(ant.pauta.codigo) + '</b> dio ' + num(ant.t.conv) + ' conversaciones a ' + plata(ant.t.cpc) + ' cada una.' : '') + '</div>';
    }
    h += '<div class="pt-nota">Contactos en el CRM atados a esta pauta: <b>' + nCont + '</b>.</div>';
    if (p.notas) h += '<div class="pt-nota">' + esc(p.notas) + '</div>';
    if (p.aprendizaje) h += '<div class="pt-nota"><b>Aprendizaje:</b> ' + esc(p.aprendizaje) + '</div>';
    h += '<div class="pt-acc">' +
      '<button class="btn btn-primary" data-pt="res" data-id="' + p.id + '">Cargar resultados</button>' +
      '<button class="btn btn-secondary" data-pt="msg" data-id="' + p.id + '">Copiar mensaje rastreable</button>' +
      (p.propiedad_id ? '<button class="btn btn-secondary" data-pt="url" data-id="' + p.id + '">Copiar enlace rastreable</button>' : '') +
      '<button class="btn btn-secondary" data-pt="edit" data-id="' + p.id + '">Editar</button></div></div>';
    return h;
  }

  /* ---------- Mensaje y enlace rastreables ---------- */
  function mensaje(p) {
    var que = (p.inmueble || 'el inmueble').split('·')[0].trim();
    que = que.charAt(0).toLowerCase() + que.slice(1);
    return 'Hola, quiero más información sobre ' + (/^(apart|inmueble|local|lote)/.test(que) ? 'el ' : 'la ') + que + ' (REF ' + (p.propiedad_id || '—') + ' · ' + p.codigo + ')';
  }
  function enlace(p) {
    return 'https://www.lomazhome.com/propiedad-publica.html?id=' + p.propiedad_id + '&utm_source=' + (FUENTE[p.plataforma] || p.plataforma) + '&utm_medium=pauta&utm_campaign=' + encodeURIComponent(p.codigo);
  }
  function copiar(txt, ok) {
    var fin = function () { aviso(ok); };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(txt).then(fin, function () { window.prompt('Copia este texto:', txt); });
    else window.prompt('Copia este texto:', txt);
  }

  /* ---------- Formulario de pauta ---------- */
  function codigoNuevo() {
    var d = new Date(), base = 'P-' + String(d.getMonth() + 1).padStart(2, '0') + String(d.getDate()).padStart(2, '0'), c = base, i = 2;
    while (pautas.some(function (p) { return p.codigo === c; })) { c = base + '-' + i; i++; }
    return c;
  }
  function abrirPauta(id) {
    var p = id ? pautas.filter(function (x) { return x.id === id; })[0] : null;
    el('ptTitPauta').innerHTML = p ? 'Editar <em>pauta</em>' : 'Nueva <em>pauta</em>';
    el('ptId').value = p ? p.id : '';
    el('ptFPlat').value = p ? p.plataforma : 'meta';
    el('ptFCod').value = p ? p.codigo : codigoNuevo();
    el('ptFEst').value = p ? p.estado : 'activa';
    el('ptFNom').value = p ? p.nombre : '';
    el('ptFProp').value = p && p.propiedad_id ? p.propiedad_id : '';
    el('ptFInm').value = p ? (p.inmueble || '') : '';
    el('ptFAse').value = p ? (p.asesor || '') : '';
    el('ptFDes').value = p ? (p.destino || '') : '';
    el('ptFPre').value = p ? p.presupuesto : '';
    el('ptFIni').value = p ? p.fecha_inicio : hoyIso();
    el('ptFFin').value = p ? (p.fecha_fin || '') : '';
    el('ptFObj').value = p ? (p.objetivo || '') : 'Mensajes a WhatsApp';
    el('ptFPub').value = p ? (p.publico || '') : '';
    el('ptFNot').value = p ? (p.notas || '') : '';
    el('ptFApr').value = p ? (p.aprendizaje || '') : '';
    el('ptBorrar').style.display = p ? '' : 'none';
    el('ptOvPauta').classList.add('show');
  }
  async function guardarPauta() {
    var id = el('ptId').value, fila = {
      plataforma: el('ptFPlat').value, codigo: el('ptFCod').value.trim(), estado: el('ptFEst').value,
      nombre: el('ptFNom').value.trim(), propiedad_id: el('ptFProp').value ? Number(el('ptFProp').value) : null,
      inmueble: el('ptFInm').value.trim() || null, asesor: el('ptFAse').value.trim() || null, destino: el('ptFDes').value.trim() || null,
      presupuesto: Number(el('ptFPre').value) || 0, fecha_inicio: el('ptFIni').value, fecha_fin: el('ptFFin').value || null,
      objetivo: el('ptFObj').value.trim() || null, publico: el('ptFPub').value.trim() || null,
      notas: el('ptFNot').value.trim() || null, aprendizaje: el('ptFApr').value.trim() || null, updated_at: new Date().toISOString()
    };
    if (!fila.codigo || !fila.nombre || !fila.fecha_inicio) { aviso('Faltan el código, el nombre o la fecha de inicio.'); return; }
    if (fila.fecha_fin && fila.fecha_fin < fila.fecha_inicio) { aviso('La fecha de fin no puede ser anterior al inicio.'); return; }
    var b = el('ptGuardar'); b.disabled = true;
    var r = id ? await sb.from('marketing_pautas').update(fila).eq('id', id) : await sb.from('marketing_pautas').insert([fila]);
    b.disabled = false;
    if (r.error) { aviso(/duplicate|unique/i.test(r.error.message) ? 'Ya existe una pauta con ese código.' : 'No se pudo guardar: ' + r.error.message); return; }
    el('ptOvPauta').classList.remove('show'); aviso('Pauta guardada.'); cargar();
  }
  async function borrarPauta() {
    var id = el('ptId').value; if (!id) return;
    if (!window.confirm('¿Eliminar esta pauta y todos sus resultados? No se puede deshacer.')) return;
    var r = await sb.from('marketing_pautas').delete().eq('id', id);
    if (r.error) { aviso('No se pudo eliminar: ' + r.error.message); return; }
    el('ptOvPauta').classList.remove('show'); aviso('Pauta eliminada.'); cargar();
  }

  /* ---------- Formulario de resultados ---------- */
  function filaRes(x) {
    x = x || {};
    var d = document.createElement('div'); d.className = 'pt-filas';
    d.innerHTML = '<input type="text" class="a" placeholder="Video · Recorrido" value="' + esc(x.anuncio || '') + '">' +
      '<select class="f">' + ['video', 'carrusel', 'imagen', 'texto', 'otro'].map(function (f) { return '<option' + (x.formato === f ? ' selected' : '') + '>' + f + '</option>'; }).join('') + '</select>' +
      '<input type="number" class="g" min="0" placeholder="Gastado $" title="Gastado $" aria-label="Gastado $" value="' + (x.gasto != null ? x.gasto : '') + '">' +
      '<input type="number" class="al" min="0" placeholder="Alcance" title="Alcance" aria-label="Alcance" value="' + (x.alcance != null ? x.alcance : '') + '">' +
      '<input type="number" class="c" min="0" placeholder="Clics" title="Clics" aria-label="Clics" value="' + (x.clics != null ? x.clics : '') + '">' +
      '<input type="number" class="cv" min="0" placeholder="Conversaciones" title="Conversaciones" aria-label="Conversaciones" value="' + (x.conversaciones != null ? x.conversaciones : '') + '">' +
      '<button class="pt-x" title="Quitar">&#10005;</button>';
    d.querySelector('.pt-x').onclick = function () { d.remove(); };
    el('ptRFilas').appendChild(d);
  }
  function abrirRes(id) {
    var p = pautas.filter(function (x) { return x.id === id; })[0]; if (!p) return;
    el('ptRPauta').value = id; el('ptRNom').innerHTML = '<b>' + esc(p.codigo) + '</b> · ' + esc(p.nombre);
    el('ptRFecha').value = hoyIso(); el('ptRFinal').value = p.estado === 'terminada' ? '1' : '0';
    el('ptRFilas').innerHTML = '';
    var c = cortes(id);
    // Trae los anuncios ya conocidos con sus últimos números, para solo actualizar
    if (c.length) c.forEach(function (x) { filaRes(x); }); else { filaRes(); filaRes(); }
    el('ptOvRes').classList.add('show');
  }
  async function guardarRes() {
    var pid = el('ptRPauta').value, f = el('ptRFecha').value, fin = el('ptRFinal').value === '1';
    if (!f) { aviso('Falta la fecha de corte.'); return; }
    var filas = [];
    el('ptRFilas').querySelectorAll('.pt-filas').forEach(function (d) {
      var a = d.querySelector('.a').value.trim(); if (!a) return;
      filas.push({ pauta_id: pid, anuncio: a, formato: d.querySelector('.f').value, fecha_corte: f, es_final: fin,
        gasto: Number(d.querySelector('.g').value) || 0, alcance: Number(d.querySelector('.al').value) || 0,
        clics: Number(d.querySelector('.c').value) || 0, conversaciones: Number(d.querySelector('.cv').value) || 0 });
    });
    if (!filas.length) { aviso('Escribe al menos un anuncio.'); return; }
    var nombres = filas.map(function (x) { return x.anuncio; });
    if (nombres.some(function (n, i) { return nombres.indexOf(n) !== i; })) { aviso('Hay dos anuncios con el mismo nombre.'); return; }
    var b = el('ptRGuardar'); b.disabled = true;
    var r = await sb.from('marketing_pauta_resultados').upsert(filas, { onConflict: 'pauta_id,anuncio,fecha_corte' });
    if (!r.error && fin) await sb.from('marketing_pautas').update({ estado: 'terminada', updated_at: new Date().toISOString() }).eq('id', pid);
    b.disabled = false;
    if (r.error) { aviso('No se pudo guardar: ' + r.error.message); return; }
    el('ptOvRes').classList.remove('show'); aviso('Resultados guardados.'); cargar();
  }

  /* ---------- Eventos ---------- */
  el('ptPlat').onchange = function () { filtroPlat = this.value; pintar(); };
  el('ptEst').onchange = function () { filtroEstado = this.value; pintar(); };
  el('ptNueva').onclick = function () { abrirPauta(null); };
  el('ptCancelar').onclick = function () { el('ptOvPauta').classList.remove('show'); };
  el('ptGuardar').onclick = guardarPauta;
  el('ptBorrar').onclick = borrarPauta;
  el('ptRCancelar').onclick = function () { el('ptOvRes').classList.remove('show'); };
  el('ptRGuardar').onclick = guardarRes;
  el('ptRMas').onclick = function () { filaRes(); };
  el('ptFProp').onchange = function () {
    var p = propiedades.filter(function (x) { return String(x.id) === el('ptFProp').value; })[0];
    if (p && !el('ptFInm').value) el('ptFInm').value = [(p.titulo || '').slice(0, 60), p.tipo_operacion, p.precio ? plata(p.precio) : ''].filter(Boolean).join(' · ');
  };
  el('ptHost').addEventListener('click', function (ev) {
    var b = ev.target.closest('[data-pt]'); if (!b) return;
    var p = pautas.filter(function (x) { return x.id === b.dataset.id; })[0]; if (!p) return;
    if (b.dataset.pt === 'res') abrirRes(p.id);
    if (b.dataset.pt === 'edit') abrirPauta(p.id);
    if (b.dataset.pt === 'msg') copiar(mensaje(p), 'Mensaje copiado: pégalo como mensaje prellenado del anuncio.');
    if (b.dataset.pt === 'url') copiar(enlace(p), 'Enlace copiado: úsalo como destino cuando el anuncio lleve a la página.');
  });

  // Para pruebas y para que otros módulos puedan refrescar la pestaña
  window.lhPauta = { recargar: cargar, mensaje: mensaje, enlace: enlace };
})();
