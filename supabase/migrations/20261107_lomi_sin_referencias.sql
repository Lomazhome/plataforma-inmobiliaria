-- Lomi ya no pide la referencia (REF LH-…) para ubicar un inmueble: pide el nombre con el que
-- aparece publicado o sus características. Cambia solo esas tres respuestas modelo de la ficha
-- guardada; el resto de la ficha (incluido lo que se haya editado desde el panel) queda igual.
update public.msj_config set ficha = replace(replace(replace(ficha,
  '«¿De cuál inmueble? Si lo viste en una publicación, dime el barrio o la referencia (REF LH-…) y te paso todo.»',
  '«¿De cuál inmueble? Dime el nombre con el que lo viste publicado o lo que recuerdes de él (barrio, habitaciones, precio) y te paso todo.»'),
  'Todo lo que tenemos publicado está en lomazhome.com; si ves uno que te interese, dime la referencia y te cuento.»',
  'Todo lo que tenemos publicado está en lomazhome.com; si ves uno que te interese, dime su nombre o el barrio y te cuento.»'),
  'Todo lo que tenemos publicado está en lomazhome.com. Si ves uno que te interese, dime la referencia y te cuento.»',
  'Todo lo que tenemos publicado está en lomazhome.com. Si ves uno que te interese, dime su nombre o el barrio y te cuento.»')
where id = 1;

-- Comprobación: debe devolver 0.
select (length(ficha) - length(replace(ficha, 'dime la referencia', ''))) / length('dime la referencia') as quedan,
       position('REF LH-' in ficha) as ref_lh
from public.msj_config where id = 1;
