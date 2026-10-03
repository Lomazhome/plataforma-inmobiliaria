-- Perfiles: solo un administrador cambia el rol o el estado de un usuario.
-- Auditoría 2026-10-03, AL-6.
--
-- Antes:
--   - La política "Usuario actualiza su propio perfil" impedía cambiar rol_id
--     con un subselect en WITH CHECK, pero dejaba cambiar `activo`: un asesor
--     desactivado podía reactivarse solo.
--   - is_admin_user() (da acceso a todos los clientes) no revisaba `activo` ni
--     fijaba search_path.
--
-- El panel de administración (admin-usuarios.html) sigue cambiando rol y
-- estado: is_admin() lo permite. perfil-asesor.html no envía esos campos.

create or replace function public.proteger_campos_perfil()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  -- auth.uid() nulo = SQL del panel de Supabase o funciones con service_role.
  if auth.uid() is null or public.is_admin() then
    return new;
  end if;

  if new.rol_id is distinct from old.rol_id
     or new.activo is distinct from old.activo
     or new.creado_por is distinct from old.creado_por
     or new.created_at is distinct from old.created_at then
    raise exception 'Solo un administrador puede cambiar el rol o el estado de un usuario'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

revoke all on function public.proteger_campos_perfil() from public, anon, authenticated;

drop trigger if exists proteger_campos_perfil on public.perfiles_usuarios;
create trigger proteger_campos_perfil
  before update on public.perfiles_usuarios
  for each row execute function public.proteger_campos_perfil();

-- Un usuario desactivado deja de ver todos los clientes.
create or replace function public.is_admin_user()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.perfiles_usuarios
    where id = auth.uid()
      and rol_id in (1, 4, 6)
      and coalesce(activo, true)
  );
$$;
