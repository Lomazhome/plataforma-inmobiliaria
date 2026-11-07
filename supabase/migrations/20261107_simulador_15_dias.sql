-- Las conversaciones del simulador de Lomi se borran a los 15 días del último mensaje
-- (antes 30), para no acumular datos de prueba. Las conversaciones reales sin
-- autorización siguen borrándose a los 90 días, como dice la política de datos.
create or replace function public.depurar_mensajeria()
returns int language plpgsql security definer set search_path = '' as $$
declare n int;
begin
  delete from public.msj_conversaciones c
  where (c.canal = 'simulador' and c.ultimo_mensaje_at < now() - interval '15 days')
     or (c.canal <> 'simulador' and c.contacto_id is null
         and c.ultimo_mensaje_at < now() - interval '90 days');
  get diagnostics n = row_count;
  return n;
end;
$$;
revoke all on function public.depurar_mensajeria() from public, anon;
grant execute on function public.depurar_mensajeria() to authenticated;

-- Comprobación: debe mostrar «15 days» y el cron diario debe seguir activo.
select position('15 days' in pg_get_functiondef('public.depurar_mensajeria()'::regprocedure)) > 0 as usa_15_dias,
       (select active from cron.job where jobname = 'lomaz-depurar-mensajeria') as cron_activo;
