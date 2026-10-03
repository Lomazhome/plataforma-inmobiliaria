// Utilidades compartidas por los tests de LoMaz Home.
// No usan paquetes externos: solo Node (v22 o superior).

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

export const RAIZ = fileURLToPath(new URL("..", import.meta.url));

// Carpetas que nunca se revisan.
const EXCLUIDAS = new Set([".git", "node_modules", ".vercel"]);

export function listarArchivos(dir = RAIZ) {
  const salida = [];
  for (const nombre of readdirSync(dir)) {
    if (EXCLUIDAS.has(nombre)) continue;
    const ruta = join(dir, nombre);
    if (statSync(ruta).isDirectory()) salida.push(...listarArchivos(ruta));
    else salida.push(relative(RAIZ, ruta));
  }
  return salida.sort();
}

export const leer = (rel) => readFileSync(join(RAIZ, rel), "utf8");
