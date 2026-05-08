/**
 * ux-widgets.js - Lomaz Home
 * Utilidades UX globales reutilizables
 * Incluir con: <script src="ux-widgets.js"></script>
 * Version: 2.0
 */

(function() {

// ===================================================
// 1. INJECT GLOBAL STYLES
// ===================================================
var css = [
/* TOAST */
"#lh-toast-container{position:fixed;bottom:24px;left:50%;transform:translateX(-50%);z-index:99999;display:flex;flex-direction:column;gap:10px;align-items:center;pointer-events:none;width:320px}",
".lh-toast{background:#1a1a2e;color:#fff;padding:12px 20px;border-radius:12px;font-size:13px;font-weight:600;display:flex;align-items:center;gap:10px;box-shadow:0 8px 32px rgba(0,0,0,0.3);pointer-events:all;width:100%;border-left:4px solid #e4a853;animation:lhSlideUp 0.35s ease}",
".lh-toast.success{border-left-color:#27ae60}.lh-toast.error{border-left-color:#e74c3c}.lh-toast.info{border-left-color:#3498db}.lh-toast.warn{border-left-color:#f39c12}",
"@keyframes lhSlideUp{from{transform:translateY(20px);opacity:0}to{transform:translateY(0);opacity:1}}",
"@keyframes lhSlideDown{from{transform:translateY(0);opacity:1}to{transform:translateY(20px);opacity:0}}",
".lh-toast.hiding{animation:lhSlideDown 0.3s ease forwards}",
".lh-toast .lh-toast-close{margin-left:auto;cursor:pointer;opacity:0.6;font-size:16px;line-height:1;flex-shrink:0;background:none;border:none;color:#fff;padding:0}",
".lh-toast .lh-toast-close:hover{opacity:1}",
/* BACK TO TOP */
"#lh-back-top{position:fixed;bottom:88px;right:22px;width:44px;height:44px;background:#1a1a2e;color:#fff;border-radius:50%;display:none;align-items:center;justify-content:center;font-size:20px;cursor:pointer;box-shadow:0 4px 16px rgba(0,0,0,0.25);z-index:9000;border:none;transition:all 0.2s}",
"#lh-back-top:hover{background:#e4a853;color:#1a1a2e;transform:translateY(-3px)}",
"#lh-back-top.lh-visible{display:flex}",
/* ARIA FLOAT */
"#lh-aria-btn{position:fixed;bottom:28px;right:22px;width:52px;height:52px;background:linear-gradient(135deg,#e4a853,#c8861f);border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:24px;cursor:pointer;box-shadow:0 4px 20px rgba(228,168,83,0.55);z-index:9001;text-decoration:none;transition:transform 0.2s,box-shadow 0.2s;animation:lhPulse 2.5s infinite}",
"#lh-aria-btn:hover{transform:scale(1.12);box-shadow:0 6px 28px rgba(228,168,83,0.7)}",
"@keyframes lhPulse{0%,100%{box-shadow:0 4px 20px rgba(228,168,83,0.55)}50%{box-shadow:0 4px 32px rgba(228,168,83,0.85)}}",
"#lh-aria-tooltip{position:fixed;bottom:90px;right:22px;background:#1a1a2e;color:#fff;padding:5px 12px;border-radius:8px;font-size:12px;font-weight:700;white-space:nowrap;z-index:9002;opacity:0;transition:opacity 0.2s;pointer-events:none}",
"#lh-aria-tooltip::after{content:'';position:absolute;top:100%;right:18px;border:6px solid transparent;border-top-color:#1a1a2e}",
/* SCROLL PROGRESS BAR */
"#lh-scroll-bar{position:fixed;top:0;left:0;height:3px;background:linear-gradient(90deg,#e4a853,#d4923f);z-index:99998;transition:width 0.1s;width:0}",
/* NOTIF BADGE */
".lh-notif-badge{display:inline-flex;align-items:center;justify-content:center;background:#e74c3c;color:#fff;border-radius:10px;font-size:10px;font-weight:700;padding:2px 6px;min-width:18px;height:18px;line-height:1;margin-left:6px}",
/* PAGE LOADER */
"#lh-page-loader{position:fixed;inset:0;background:rgba(26,26,46,0.7);z-index:99997;display:none;align-items:center;justify-content:center;backdrop-filter:blur(4px)}",
"#lh-page-loader.lh-active{display:flex}",
".lh-spinner{width:44px;height:44px;border:4px solid rgba(228,168,83,0.3);border-top-color:#e4a853;border-radius:50%;animation:lhSpin 0.8s linear infinite}",
"@keyframes lhSpin{to{transform:rotate(360deg)}}",
/* TOOLTIP */
"[data-lh-tip]{position:relative;cursor:pointer}",
"[data-lh-tip]::before{content:attr(data-lh-tip);position:absolute;bottom:calc(100% + 6px);left:50%;transform:translateX(-50%);background:#1a1a2e;color:#fff;padding:5px 10px;border-radius:6px;font-size:11px;font-weight:600;white-space:nowrap;opacity:0;transition:opacity 0.2s;pointer-events:none;z-index:9990}",
"[data-lh-tip]:hover::before{opacity:1}"
].join("");

var styleEl = document.createElement("style");
styleEl.id = "lh-ux-styles";
styleEl.textContent = css;
document.head.appendChild(styleEl);

// ===================================================
// 2. INJECT DOM ELEMENTS
// ===================================================
function injectDOM() {
  // Toast container
  if (!document.getElementById("lh-toast-container")) {
    var tc = document.createElement("div");
    tc.id = "lh-toast-container";
    document.body.appendChild(tc);
  }
  // Scroll progress bar
  if (!document.getElementById("lh-scroll-bar")) {
    var bar = document.createElement("div");
    bar.id = "lh-scroll-bar";
    document.body.appendChild(bar);
  }
  // Back to top button
  if (!document.getElementById("lh-back-top")) {
    var btn = document.createElement("button");
    btn.id = "lh-back-top";
    btn.innerHTML = "&#8679;";
    btn.title = "Volver arriba";
    btn.setAttribute("aria-label", "Volver al inicio de la pagina");
    btn.onclick = function() { window.scrollTo({top: 0, behavior: "smooth"}); };
    document.body.appendChild(btn);
  }
  // ARIA floating button
  if (!document.getElementById("lh-aria-btn")) {
    var ariaBtn = document.createElement("a");
    ariaBtn.id = "lh-aria-btn";
    ariaBtn.href = "aria.html";
    ariaBtn.innerHTML = "&#129302;";
    ariaBtn.title = "Hablar con ARIA";
    ariaBtn.setAttribute("aria-label", "Abrir chatbot ARIA");
    document.body.appendChild(ariaBtn);
    // Tooltip
    var tip = document.createElement("div");
    tip.id = "lh-aria-tooltip";
    tip.textContent = "Hablar con ARIA";
    document.body.appendChild(tip);
    ariaBtn.addEventListener("mouseenter", function() {
      document.getElementById("lh-aria-tooltip").style.opacity = "1";
    });
    ariaBtn.addEventListener("mouseleave", function() {
      document.getElementById("lh-aria-tooltip").style.opacity = "0";
    });
  }
  // Page loader
  if (!document.getElementById("lh-page-loader")) {
    var loader = document.createElement("div");
    loader.id = "lh-page-loader";
    loader.innerHTML = '<div class="lh-spinner"></div>';
    document.body.appendChild(loader);
  }
}

// ===================================================
// 3. SCROLL PROGRESS BAR + BACK TO TOP
// ===================================================
function initScroll() {
  window.addEventListener("scroll", function() {
    // Progress bar
    var bar = document.getElementById("lh-scroll-bar");
    if (bar) {
      var scrolled = window.scrollY;
      var total = document.documentElement.scrollHeight - window.innerHeight;
      var pct = total > 0 ? Math.round((scrolled / total) * 100) : 0;
      bar.style.width = pct + "%";
    }
    // Back to top
    var btn = document.getElementById("lh-back-top");
    if (btn) {
      if (window.scrollY > 320) btn.classList.add("lh-visible");
      else btn.classList.remove("lh-visible");
    }
  }, {passive: true});
}

// ===================================================
// 4. TOAST SYSTEM
// ===================================================
function showToast(msg, type, duration) {
  var icons = {success: "✅", error: "❌", info: "ℹ️", warn: "⚠️", default: "🔔"};
  var tc = document.getElementById("lh-toast-container");
  if (!tc) return;
  var t = document.createElement("div");
  t.className = "lh-toast " + (type || "default");
  t.innerHTML = (icons[type] || icons.default) + ' <span style="flex:1">' + String(msg) + '</span>' +
    '<button class="lh-toast-close" onclick="this.parentNode.remove()">&#215;</button>';
  tc.appendChild(t);
  var ms = duration || 3800;
  setTimeout(function() {
    if (!t.parentNode) return;
    t.classList.add("hiding");
    setTimeout(function() { if (t.parentNode) tc.removeChild(t); }, 320);
  }, ms);
  return t;
}

// ===================================================
// 5. PAGE LOADER
// ===================================================
function showLoader() {
  var el = document.getElementById("lh-page-loader");
  if (el) el.classList.add("lh-active");
}
function hideLoader() {
  var el = document.getElementById("lh-page-loader");
  if (el) el.classList.remove("lh-active");
}

// ===================================================
// 6. NOTIFICATION BADGE UPDATER
// ===================================================
function updateNotifBadge(count) {
  var badges = document.querySelectorAll(".lh-notif-badge");
  badges.forEach(function(b) {
    b.textContent = count > 99 ? "99+" : count;
    b.style.display = count > 0 ? "inline-flex" : "none";
  });
}

async function loadNotifCount() {
  try {
    var readSet = new Set(JSON.parse(localStorage.getItem("lh_notif_read") || "[]"));
    var sbUrl = "https://lniouebpuuuqctrgxoiw.supabase.co";
    var sbKey = atob("ZXlKaGJHY2lPaUpJVXpJMU5pSXNJblI1Y0NJNklrcFhWQ0o5LmV5SnBjM01pT2lKemRYQmhZbUZ6WlNJc0luSmxaaUk2SW14dWFXOTFaV0p3ZFhWMWNXTjBjbWQ0YjJsM0lpd2ljbTlzWlNJNkltRnViMjRpTENKcFlYUWlPakUzTnpnd09ETTVOamdzSW1WNGNDSTZNakE1TXpZMU9UazJPSDAuOHctVGNEOEpLa0hRcG55YmFqLUFOei00azRoem5Gb0l3RnJfWmF0cVB0QQ==");
    var r = await fetch(sbUrl + "/rest/v1/leads?select=id&order=created_at.desc&limit=20", {
      headers: {"apikey": sbKey, "Authorization": "Bearer " + sbKey}
    });
    if (r.ok) {
      var data = await r.json();
      var unread = data.filter(function(l) { return !readSet.has("lead_" + l.id); }).length;
      if (unread > 0) updateNotifBadge(unread);
    }
  } catch(e) {}
}

// ===================================================
// 7. KEYBOARD SHORTCUTS
// ===================================================
function initKeyboard() {
  document.addEventListener("keydown", function(e) {
    if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;
    // Alt+H = Home / Dashboard
    if (e.altKey && e.key === "h") { e.preventDefault(); window.location.href = "dashboard.html"; }
    // Alt+P = Propiedades
    if (e.altKey && e.key === "p") { e.preventDefault(); window.location.href = "propiedades.html"; }
    // Alt+N = Notificaciones
    if (e.altKey && e.key === "n") { e.preventDefault(); window.location.href = "notificaciones.html"; }
    // Alt+A = ARIA
    if (e.altKey && e.key === "a") { e.preventDefault(); window.location.href = "aria.html"; }
    // Alt+C = Calculadora
    if (e.altKey && e.key === "c") { e.preventDefault(); window.location.href = "calculadora.html"; }
    // Escape closes any open modal
    if (e.key === "Escape") {
      var modals = document.querySelectorAll(".modal-overlay.open, .modal-overlay.lh-active");
      modals.forEach(function(m) { m.classList.remove("open", "lh-active"); });
    }
  });
}

// ===================================================
// 8. SMOOTH PAGE TRANSITIONS
// ===================================================
function initPageTransitions() {
  document.addEventListener("click", function(e) {
    var link = e.target.closest("a[href]");
    if (!link) return;
    var href = link.getAttribute("href");
    if (!href || href.startsWith("#") || href.startsWith("http") ||
        href.startsWith("mailto") || href.startsWith("tel") ||
        link.target === "_blank" || e.ctrlKey || e.metaKey) return;
    if (!href.endsWith(".html") && !href.includes(".html?")) return;
    e.preventDefault();
    document.body.style.opacity = "0";
    document.body.style.transition = "opacity 0.18s ease";
    setTimeout(function() { window.location.href = href; }, 180);
  });
  // Fade in on load
  window.addEventListener("load", function() {
    document.body.style.opacity = "0";
    document.body.style.transition = "opacity 0.25s ease";
    requestAnimationFrame(function() {
      requestAnimationFrame(function() { document.body.style.opacity = "1"; });
    });
  });
}

// ===================================================
// 9. CONFIRM DIALOG (replaces native confirm)
// ===================================================
function lhConfirm(msg, onYes, onNo) {
  var overlay = document.createElement("div");
  overlay.style.cssText = "position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:99996;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(3px)";
  var box = document.createElement("div");
  box.style.cssText = "background:#fff;border-radius:16px;padding:28px;width:90%;max-width:380px;box-shadow:0 20px 60px rgba(0,0,0,0.2);text-align:center";
  box.innerHTML = '<div style="font-size:36px;margin-bottom:12px">⚠️</div>' +
    '<div style="font-size:16px;font-weight:700;color:#1a1a2e;margin-bottom:8px">Confirmar accion</div>' +
    '<div style="font-size:14px;color:#666;margin-bottom:24px">' + String(msg) + '</div>' +
    '<div style="display:flex;gap:10px;justify-content:center">' +
    '<button id="lh-confirm-no" style="padding:9px 22px;border-radius:8px;border:1.5px solid #ddd;background:#fff;color:#666;font-weight:600;cursor:pointer;font-size:13px">Cancelar</button>' +
    '<button id="lh-confirm-yes" style="padding:9px 22px;border-radius:8px;border:none;background:#e74c3c;color:#fff;font-weight:600;cursor:pointer;font-size:13px">Confirmar</button>' +
    '</div>';
  overlay.appendChild(box);
  document.body.appendChild(overlay);
  function close(result) {
    document.body.removeChild(overlay);
    if (result && onYes) onYes();
    if (!result && onNo) onNo();
  }
  box.querySelector("#lh-confirm-yes").onclick = function() { close(true); };
  box.querySelector("#lh-confirm-no").onclick = function() { close(false); };
  overlay.onclick = function(e) { if (e.target === overlay) close(false); };
}

// ===================================================
// 10. COPY TO CLIPBOARD
// ===================================================
function lhCopy(text, label) {
  navigator.clipboard.writeText(text).then(function() {
    showToast((label || "Texto") + " copiado al portapapeles", "success", 2500);
  }).catch(function() {
    showToast("No se pudo copiar", "error", 2500);
  });
}

// ===================================================
// 11. FORMAT HELPERS
// ===================================================
function lhMoney(n) {
  if (!n && n !== 0) return "--";
  return "$ " + Number(n).toLocaleString("es-CO");
}
function lhDate(d) {
  if (!d) return "--";
  try { return new Date(d).toLocaleDateString("es-CO", {day:"2-digit", month:"short", year:"numeric"}); }
  catch(e) { return d; }
}
function lhRelTime(d) {
  if (!d) return "--";
  var diff = Date.now() - new Date(d).getTime();
  var m = Math.floor(diff / 60000);
  var h = Math.floor(m / 60);
  var dy = Math.floor(h / 24);
  if (dy > 0) return "hace " + dy + " dia" + (dy > 1 ? "s" : "");
 * ux-widgets.js - Lomaz Home
 * Utilidades UX globales reutilizables
 * Incluir con: <script src="ux-widgets.js"></script>
 * Version: 2.0
 */

(function() {

// ===================================================
// 1. INJECT GLOBAL STYLES
// ===================================================
var css = [
/* TOAST */
"#lh-toast-container{position:fixed;bottom:24px;left:50%;transform:translateX(-50%);z-index:99999;display:flex;flex-direction:column;gap:10px;align-items:center;pointer-events:none;width:320px}",
".lh-toast{background:#1a1a2e;color:#fff;padding:12px 20px;border-radius:12px;font-size:13px;font-weight:600;display:flex;align-items:center;gap:10px;box-shadow:0 8px 32px rgba(0,0,0,0.3);pointer-events:all;width:100%;border-left:4px solid #e4a853;animation:lhSlideUp 0.35s ease}",
".lh-toast.success{border-left-color:#27ae60}.lh-toast.error{border-left-color:#e74c3c}.lh-toast.info{border-left-color:#3498db}.lh-toast.warn{border-left-color:#f39c12}",
"@keyframes lhSlideUp{from{transform:translateY(20px);opacity:0}to{transform:translateY(0);opacity:1}}",
"@keyframes lhSlideDown{from{transform:translateY(0);opacity:1}to{transform:translateY(20px);opacity:0}}",
".lh-toast.hiding{animation:lhSlideDown 0.3s ease forwards}",
".lh-toast .lh-toast-close{margin-left:auto;cursor:pointer;opacity:0.6;font-size:16px;line-height:1;flex-shrink:0;background:none;border:none;color:#fff;padding:0}",
".lh-toast .lh-toast-close:hover{opacity:1}",
/* BACK TO TOP */
"#lh-back-top{position:fixed;bottom:88px;right:22px;width:44px;height:44px;background:#1a1a2e;color:#fff;border-radius:50%;display:none;align-items:center;justify-content:center;font-size:20px;cursor:pointer;box-shadow:0 4px 16px rgba(0,0,0,0.25);z-index:9000;border:none;transition:all 0.2s}",
"#lh-back-top:hover{background:#e4a853;color:#1a1a2e;transform:translateY(-3px)}",
"#lh-back-top.lh-visible{display:flex}",
/* ARIA FLOAT */
"#lh-aria-btn{position:fixed;bottom:28px;right:22px;width:52px;height:52px;background:linear-gradient(135deg,#e4a853,#c8861f);border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:24px;cursor:pointer;box-shadow:0 4px 20px rgba(228,168,83,0.55);z-index:9001;text-decoration:none;transition:transform 0.2s,box-shadow 0.2s;animation:lhPulse 2.5s infinite}",
"#lh-aria-btn:hover{transform:scale(1.12);box-shadow:0 6px 28px rgba(228,168,83,0.7)}",
"@keyframes lhPulse{0%,100%{box-shadow:0 4px 20px rgba(228,168,83,0.55)}50%{box-shadow:0 4px 32px rgba(228,168,83,0.85)}}",
"#lh-aria-tooltip{position:fixed;bottom:90px;right:22px;background:#1a1a2e;color:#fff;padding:5px 12px;border-radius:8px;font-size:12px;font-weight:700;white-space:nowrap;z-index:9002;opacity:0;transition:opacity 0.2s;pointer-events:none}",
"#lh-aria-tooltip::after{content:'';position:absolute;top:100%;right:18px;border:6px solid transparent;border-top-color:#1a1a2e}",
/* SCROLL PROGRESS BAR */
"#lh-scroll-bar{position:fixed;top:0;left:0;height:3px;background:linear-gradient(90deg,#e4a853,#d4923f);z-index:99998;transition:width 0.1s;width:0}",
/* NOTIF BADGE */
".lh-notif-badge{display:inline-flex;align-items:center;justify-content:center;background:#e74c3c;color:#fff;border-radius:10px;font-size:10px;font-weight:700;padding:2px 6px;min-width:18px;height:18px;line-height:1;margin-left:6px}",
/* PAGE LOADER */
"#lh-page-loader{position:fixed;inset:0;background:rgba(26,26,46,0.7);z-index:99997;display:none;align-items:center;justify-content:center;backdrop-filter:blur(4px)}",
"#lh-page-loader.lh-active{display:flex}",
".lh-spinner{width:44px;height:44px;border:4px solid rgba(228,168,83,0.3);border-top-color:#e4a853;border-radius:50%;animation:lhSpin 0.8s linear infinite}",
"@keyframes lhSpin{to{transform:rotate(360deg)}}",
/* TOOLTIP */
"[data-lh-tip]{position:relative;cursor:pointer}",
"[data-lh-tip]::before{content:attr(data-lh-tip);position:absolute;bottom:calc(100% + 6px);left:50%;transform:translateX(-50%);background:#1a1a2e;color:#fff;padding:5px 10px;border-radius:6px;font-size:11px;font-weight:600;white-space:nowrap;opacity:0;transition:opacity 0.2s;pointer-events:none;z-index:9990}",
"[data-lh-tip]:hover::before{opacity:1}"
].join("");

var styleEl = document.createElement("style");
styleEl.id = "lh-ux-styles";
styleEl.textContent = css;
document.head.appendChild(styleEl);

// ===================================================
// 2. INJECT DOM ELEMENTS
// ===================================================
function injectDOM() {
  // Toast container
  if (!document.getElementById("lh-toast-container")) {
    var tc = document.createElement("div");
    tc.id = "lh-toast-container";
    document.body.appendChild(tc);
  }
  // Scroll progress bar
  if (!document.getElementById("lh-scroll-bar")) {
    var bar = document.createElement("div");
    bar.id = "lh-scroll-bar";
    document.body.appendChild(bar);
  }
  // Back to top button
  if (!document.getElementById("lh-back-top")) {
    var btn = document.createElement("button");
    btn.id = "lh-back-top";
    btn.innerHTML = "&#8679;";
    btn.title = "Volver arriba";
    btn.setAttribute("aria-label", "Volver al inicio de la pagina");
    btn.onclick = function() { window.scrollTo({top: 0, behavior: "smooth"}); };
    document.body.appendChild(btn);
  }
  // ARIA floating button
  if (!document.getElementById("lh-aria-btn")) {
    var ariaBtn = document.createElement("a");
    ariaBtn.id = "lh-aria-btn";
    ariaBtn.href = "aria.html";
    ariaBtn.innerHTML = "&#129302;";
    ariaBtn.title = "Hablar con ARIA";
    ariaBtn.setAttribute("aria-label", "Abrir chatbot ARIA");
    document.body.appendChild(ariaBtn);
    // Tooltip
    var tip = document.createElement("div");
    tip.id = "lh-aria-tooltip";
    tip.textContent = "Hablar con ARIA";
    document.body.appendChild(tip);
    ariaBtn.addEventListener("mouseenter", function() {
      document.getElementById("lh-aria-tooltip").style.opacity = "1";
    });
    ariaBtn.addEventListener("mouseleave", function() {
      document.getElementById("lh-aria-tooltip").style.opacity = "0";
    });
  }
  // Page loader
  if (!document.getElementById("lh-page-loader")) {
    var loader = document.createElement("div");
    loader.id = "lh-page-loader";
    loader.innerHTML = '<div class="lh-spinner"></div>';
    document.body.appendChild(loader);
  }
}

// ===================================================
// 3. SCROLL PROGRESS BAR + BACK TO TOP
// ===================================================
function initScroll() {
  window.addEventListener("scroll", function() {
    // Progress bar
    var bar = document.getElementById("lh-scroll-bar");
    if (bar) {
      var scrolled = window.scrollY;
      var total = document.documentElement.scrollHeight - window.innerHeight;
      var pct = total > 0 ? Math.round((scrolled / total) * 100) : 0;
      bar.style.width = pct + "%";
    }
    // Back to top
    var btn = document.getElementById("lh-back-top");
    if (btn) {
      if (window.scrollY > 320) btn.classList.add("lh-visible");
      else btn.classList.remove("lh-visible");
    }
  }, {passive: true});
}

// ===================================================
// 4. TOAST SYSTEM
// ===================================================
function showToast(msg, type, duration) {
  var icons = {success: "✅", error: "❌", info: "ℹ️", warn: "⚠️", default: "🔔"};
  var tc = document.getElementById("lh-toast-container");
  if (!tc) return;
  var t = document.createElement("div");
  t.className = "lh-toast " + (type || "default");
  t.innerHTML = (icons[type] || icons.default) + ' <span style="flex:1">' + String(msg) + '</span>' +
    '<button class="lh-toast-close" onclick="this.parentNode.remove()">&#215;</button>';
  tc.appendChild(t);
  var ms = duration || 3800;
  setTimeout(function() {
    if (!t.parentNode) return;
    t.classList.add("hiding");
    setTimeout(function() { if (t.parentNode) tc.removeChild(t); }, 320);
  }, ms);
  return t;
}

// ===================================================
// 5. PAGE LOADER
// ===================================================
function showLoader() {
  var el = document.getElementById("lh-page-loader");
  if (el) el.classList.add("lh-active");
}
function hideLoader() {
  var el = document.getElementById("lh-page-loader");
  if (el) el.classList.remove("lh-active");
}

// ===================================================
// 6. NOTIFICATION BADGE UPDATER
// ===================================================
function updateNotifBadge(count) {
  var badges = document.querySelectorAll(".lh-notif-badge");
  badges.forEach(function(b) {
    b.textContent = count > 99 ? "99+" : count;
    b.style.display = count > 0 ? "inline-flex" : "none";
  });
}

async function loadNotifCount() {
  try {
    var readSet = new Set(JSON.parse(localStorage.getItem("lh_notif_read") || "[]"));
    var sbUrl = "https://lniouebpuuuqctrgxoiw.supabase.co";
    var sbKey = atob("ZXlKaGJHY2lPaUpJVXpJMU5pSXNJblI1Y0NJNklrcFhWQ0o5LmV5SnBjM01pT2lKemRYQmhZbUZ6WlNJc0luSmxaaUk2SW14dWFXOTFaV0p3ZFhWMWNXTjBjbWQ0YjJsM0lpd2ljbTlzWlNJNkltRnViMjRpTENKcFlYUWlPakUzTnpnd09ETTVOamdzSW1WNGNDSTZNakE1TXpZMU9UazJPSDAuOHctVGNEOEpLa0hRcG55YmFqLUFOei00azRoem5Gb0l3RnJfWmF0cVB0QQ==");
    var r = await fetch(sbUrl + "/rest/v1/leads?select=id&order=created_at.desc&limit=20", {
      headers: {"apikey": sbKey, "Authorization": "Bearer " + sbKey}
    });
    if (r.ok) {
      var data = await r.json();
      var unread = data.filter(function(l) { return !readSet.has("lead_" + l.id); }).length;
      if (unread > 0) updateNotifBadge(unread);
    }
  } catch(e) {}
}

// ===================================================
// 7. KEYBOARD SHORTCUTS
// ===================================================
function initKeyboard() {
  document.addEventListener("keydown", function(e) {
    if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;
    // Alt+H = Home / Dashboard
    if (e.altKey && e.key === "h") { e.preventDefault(); window.location.href = "dashboard.html"; }
    // Alt+P = Propiedades
    if (e.altKey && e.key === "p") { e.preventDefault(); window.location.href = "propiedades.html"; }
    // Alt+N = Notificaciones
    if (e.altKey && e.key === "n") { e.preventDefault(); window.location.href = "notificaciones.html"; }
    // Alt+A = ARIA
    if (e.altKey && e.key === "a") { e.preventDefault(); window.location.href = "aria.html"; }
    // Alt+C = Calculadora
    if (e.altKey && e.key === "c") { e.preventDefault(); window.location.href = "calculadora.html"; }
    // Escape closes any open modal
    if (e.key === "Escape") {
      var modals = document.querySelectorAll(".modal-overlay.open, .modal-overlay.lh-active");
      modals.forEach(function(m) { m.classList.remove("open", "lh-active"); });
    }
  });
}

// ===================================================
// 8. SMOOTH PAGE TRANSITIONS
// ===================================================
function initPageTransitions() {
  document.addEventListener("click", function(e) {
    var link = e.target.closest("a[href]");
    if (!link) return;
    var href = link.getAttribute("href");
    if (!href || href.startsWith("#") || href.startsWith("http") ||
        href.startsWith("mailto") || href.startsWith("tel") ||
        link.target === "_blank" || e.ctrlKey || e.metaKey) return;
    if (!href.endsWith(".html") && !href.includes(".html?")) return;
    e.preventDefault();
    document.body.style.opacity = "0";
    document.body.style.transition = "opacity 0.18s ease";
    setTimeout(function() { window.location.href = href; }, 180);
  });
  // Fade in on load
  window.addEventListener("load", function() {
    document.body.style.opacity = "0";
    document.body.style.transition = "opacity 0.25s ease";
    requestAnimationFrame(function() {
      requestAnimationFrame(function() { document.body.style.opacity = "1"; });
    });
  });
}

// ===================================================
// 9. CONFIRM DIALOG (replaces native confirm)
// ===================================================
function lhConfirm(msg, onYes, onNo) {
  var overlay = document.createElement("div");
  overlay.style.cssText = "position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:99996;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(3px)";
  var box = document.createElement("div");
  box.style.cssText = "background:#fff;border-radius:16px;padding:28px;width:90%;max-width:380px;box-shadow:0 20px 60px rgba(0,0,0,0.2);text-align:center";
  box.innerHTML = '<div style="font-size:36px;margin-bottom:12px">⚠️</div>' +
    '<div style="font-size:16px;font-weight:700;color:#1a1a2e;margin-bottom:8px">Confirmar accion</div>' +
    '<div style="font-size:14px;color:#666;margin-bottom:24px">' + String(msg) + '</div>' +
    '<div style="display:flex;gap:10px;justify-content:center">' +
    '<button id="lh-confirm-no" style="padding:9px 22px;border-radius:8px;border:1.5px solid #ddd;background:#fff;color:#666;font-weight:600;cursor:pointer;font-size:13px">Cancelar</button>' +
    '<button id="lh-confirm-yes" style="padding:9px 22px;border-radius:8px;border:none;background:#e74c3c;color:#fff;font-weight:600;cursor:pointer;font-size:13px">Confirmar</button>' +
    '</div>';
  overlay.appendChild(box);
  document.body.appendChild(overlay);
  function close(result) {
    document.body.removeChild(overlay);
    if (result && onYes) onYes();
    if (!result && onNo) onNo();
  }
  box.querySelector("#lh-confirm-yes").onclick = function() { close(true); };
  box.querySelector("#lh-confirm-no").onclick = function() { close(false); };
  overlay.onclick = function(e) { if (e.target === overlay) close(false); };
}

// ===================================================
// 10. COPY TO CLIPBOARD
// ===================================================
function lhCopy(text, label) {
  navigator.clipboard.writeText(text).then(function() {
    showToast((label || "Texto") + " copiado al portapapeles", "success", 2500);
  }).catch(function() {
    showToast("No se pudo copiar", "error", 2500);
  });
}

// ===================================================
// 11. FORMAT HELPERS
// ===================================================
function lhMoney(n) {
  if (!n && n !== 0) return "--";
  return "$ " + Number(n).toLocaleString("es-CO");
}
function lhDate(d) {
  if (!d) return "--";
  try { return new Date(d).toLocaleDateString("es-CO", {day:"2-digit", month:"short", year:"numeric"}); }
  catch(e) { return d; }
}
function lhRelTime(d) {
  if (!d) return "--";
  var diff = Date.now() - new Date(d).getTime();
  var m = Math.floor(diff / 60000);
  var h = Math.floor(m / 60);
  var dy = Math.floor(h / 24);
  if (dy > 0) return "hace " + dy + " dia" + (dy > 1 ? "s" : "");
  if (h > 0) return "hace " + h + " hora" + (h > 1 ? "s" : "");
  if (m > 0) return "hace " + m + " min";
  return "ahora mismo";
}
function lhEscape(s) {
  if (!s) return "";
  return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
}

// ===================================================
// 12. INIT ALL
// ===================================================
function init() {
  injectDOM();
  initScroll();
  initKeyboard();
  initPageTransitions();
  // Load notif count after small delay
  setTimeout(loadNotifCount, 1500);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}

// ===================================================
// 13. EXPOSE GLOBAL API
// ===================================================
window.LH = {
  toast: showToast,
  confirm: lhConfirm,
  copy: lhCopy,
  money: lhMoney,
  date: lhDate,
  relTime: lhRelTime,
  escape: lhEscape,
  showLoader: showLoader,
  hideLoader: hideLoader,
  updateNotifBadge: updateNotifBadge
};
// Legacy alias
window.showToast = showToast;

})(); // end IIFE
