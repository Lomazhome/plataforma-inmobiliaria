// Revisa que los archivos de configuración y datos estén bien escritos.
// Un vercel.json dañado tumba todo el despliegue; un sitemap dañado lo ignora Google.

import { test } from "node:test";
import assert from "node:assert/strict";
import { listarArchivos, leer } from "./utilidades.mjs";

const archivos = listarArchivos();

test("archivos .json válidos", () => {
  const errores = [];
  for (const f of archivos.filter((f) => f.endsWith(".json"))) {
    try {
      JSON.parse(leer(f));
    } catch (e) {
      errores.push(`${f}: ${e.message}`);
    }
  }
  assert.deepEqual(errores, [], errores.join("\n"));
});

test("vercel.json: redirecciones y reescrituras completas", () => {
  const cfg = JSON.parse(leer("vercel.json"));
  for (const tipo of ["redirects", "rewrites"]) {
    for (const [i, r] of (cfg[tipo] || []).entries()) {
      assert.ok(r.source && r.destination, `${tipo}[${i}] sin source o destination`);
    }
  }
  for (const ruta of Object.keys(cfg.functions || {})) {
    assert.ok(archivos.includes(ruta), `vercel.json menciona ${ruta}, pero ese archivo no existe`);
  }
});

test("archivos .xml (sitemaps) bien cerrados", () => {
  for (const f of archivos.filter((f) => f.endsWith(".xml"))) {
    const xml = leer(f).trim();
    assert.match(xml, /^<\?xml/, `${f} no empieza con la declaración <?xml`);
    const raiz = xml.match(/<(urlset|sitemapindex)\b/);
    assert.ok(raiz, `${f} no tiene <urlset> ni <sitemapindex>`);
    assert.ok(xml.endsWith(`</${raiz[1]}>`), `${f} no termina con </${raiz[1]}>`);
  }
});
