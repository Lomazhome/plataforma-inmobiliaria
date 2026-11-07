// Pruebas de la batería de Lomi (lomi-pruebas.js): que las revisiones detecten de verdad
// lo que no debe pasar. Usan un simulador falso: no llaman a Claude ni a Supabase.

import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const P = require("../lomi-pruebas.js");

const INV = [
  { id: 3, titulo: "Local en Chapinero", tipo_propiedad: "local", tipo_negocio: "arriendo", barrio: "Chapinero", precio: 0, habitaciones: 0, fotos: [] },
  { id: 22, titulo: "VENTA DE APARTAMENTO 80 M² 3 HAB. SECTOR EL PINAR DE SUBA", tipo_propiedad: "apartamento", tipo_negocio: "venta", barrio: "El Pinar", precio: 420000000, habitaciones: 3, fotos: ["https://x/1.jpg"] }
];

function apiFalsa(respuesta){
  const pedidos = [];
  const api = async function(cuerpo){
    pedidos.push(cuerpo);
    if(cuerpo.modo === "reiniciar") return { ok: true };
    return Object.assign({ ok: true, salidas: [], herramientas: [], alertas: [], humano: false, conversacion: { propiedad_actual_id: 22, consentimientos: {} } }, respuesta(cuerpo));
  };
  api.pedidos = pedidos;
  return api;
}

test("elige un inmueble con fotos, precio y habitaciones para las pruebas", () => {
  assert.equal(P.elegir(INV).id, 22);
});

test("hay escenarios para las reglas clave y todos tienen pasos y revisiones", () => {
  const e = P.crearEscenarios(INV);
  const ids = e.map(function(x){ return x.id; });
  ["saludo", "por-nombre", "direccion", "precio", "oferta", "fotos", "que-mas", "prompt", "menor", "no-autorizo", "propietario"].forEach(function(id){ assert.ok(ids.includes(id), "falta " + id); });
  e.forEach(function(x){ assert.ok(x.pasos.length && x.revisar.length, x.id); });
});

test("una respuesta correcta pasa y la conversación de prueba se borra al final", async () => {
  const esc = P.crearEscenarios(INV).find(function(x){ return x.id === "direccion"; });
  const api = apiFalsa(function(){ return { salidas: [{ tipo: "texto", texto: "Está en El Pinar. Por motivos de seguridad no puedo compartir la dirección exacta por este medio. ¿Quieres que te comunique con el asesor?" }] }; });
  const r = await P.correr(esc, api);
  assert.equal(r.ok, true, JSON.stringify(r.revisiones));
  assert.equal(api.pedidos.at(-1).modo, "reiniciar");
});

test("detecta una dirección, un código LH- y un pedido de referencia", async () => {
  const esc = P.crearEscenarios(INV).find(function(x){ return x.id === "saludo"; });
  const api = apiFalsa(function(){ return { salidas: [{ tipo: "texto", texto: "Queda en la Calle 147 # 12-34, es el LH-22. Dime la referencia del otro." }] }; });
  const r = await P.correr(esc, api);
  assert.equal(r.ok, false);
  const fallas = r.revisiones.filter(function(x){ return !x.ok; }).map(function(x){ return x.texto; }).join(" | ");
  assert.match(fallas, /dirección/);
  assert.match(fallas, /LH-/);
  assert.match(fallas, /referencia/);
});

test("detecta cuando ofrece video o visita sin que se lo pidan", async () => {
  const esc = P.crearEscenarios(INV).find(function(x){ return x.id === "sin-iniciativa"; });
  const api = apiFalsa(function(){ return { salidas: [{ tipo: "texto", texto: "Tiene 2 baños. ¿Quieres que te envíe el video del recorrido?" }] }; });
  const r = await P.correr(esc, api);
  assert.equal(r.ok, false);
});

test("un error del simulador cuenta como prueba fallida, sin romper la batería", async () => {
  const esc = P.crearEscenarios(INV)[0];
  const api = async function(c){ if(c.modo === "reiniciar") return { ok: true }; throw new Error("Error 500"); };
  const r = await P.correr(esc, api);
  assert.equal(r.ok, false);
  assert.match(r.revisiones[0].texto, /Error 500/);
});
