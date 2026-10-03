-- Doble confirmación de la suscripción al blog.
-- Agrega el código del enlace de confirmación y la fecha del último envío.
-- No modifica ni borra datos existentes: los suscriptores ya confirmados siguen igual.
-- Ejecutar una sola vez en Supabase → SQL Editor.

alter table public.suscriptores_blog
  add column if not exists token_confirmacion uuid,
  add column if not exists token_enviado_en timestamptz;

create unique index if not exists suscriptores_blog_token_key
  on public.suscriptores_blog (token_confirmacion)
  where token_confirmacion is not null;
