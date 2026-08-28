-- Admins create people (auth user + profile + role) without a service-role key
-- in Next.js. Scoped admins may update names / is_active for people they manage.
-- Complex admins may assign NEIGHBORHOOD_ADMIN and SECURITY in addition to OWNER.

alter table public.profiles
  add column if not exists email text;

update public.profiles p
set email = u.email
from auth.users u
where u.id = p.id
  and p.email is null;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, first_name, last_name, email)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data->>'first_name', ''), 'User'),
    coalesce(nullif(new.raw_user_meta_data->>'last_name', ''), 'Account'),
    new.email
  );
  return new;
end;
$$;

create or replace function public.is_complex_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_roles ur
    where ur.user_id = auth.uid()
      and ur.role = 'COMPLEX_ADMIN'
  );
$$;

create or replace function public.is_neighborhood_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_roles ur
    where ur.user_id = auth.uid()
      and ur.role = 'NEIGHBORHOOD_ADMIN'
  );
$$;

create or replace function public.is_tenant_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_superadmin()
      or public.is_complex_admin()
      or public.is_neighborhood_admin();
$$;

revoke all on function public.is_complex_admin() from public, anon;
revoke all on function public.is_neighborhood_admin() from public, anon;
revoke all on function public.is_tenant_admin() from public, anon;
grant execute on function public.is_complex_admin() to authenticated, service_role;
grant execute on function public.is_neighborhood_admin() to authenticated, service_role;
grant execute on function public.is_tenant_admin() to authenticated, service_role;

create or replace function public.admin_may_assign_role(
  p_role public.role,
  p_complex_id uuid,
  p_neighborhood_id uuid,
  p_property_id uuid
)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if p_role = 'SUPERADMIN' or p_role = 'SECURITY' then
    if p_complex_id is not null or p_neighborhood_id is not null or p_property_id is not null then
      return false;
    end if;
  elsif p_role = 'COMPLEX_ADMIN' then
    if p_complex_id is null or p_neighborhood_id is not null or p_property_id is not null then
      return false;
    end if;
  elsif p_role = 'NEIGHBORHOOD_ADMIN' then
    if p_neighborhood_id is null or p_complex_id is not null or p_property_id is not null then
      return false;
    end if;
  elsif p_role = 'OWNER' then
    if p_property_id is null or p_complex_id is not null or p_neighborhood_id is not null then
      return false;
    end if;
  else
    return false;
  end if;

  if public.is_superadmin() then
    return true;
  end if;

  if public.is_complex_admin() then
    if p_role in ('SUPERADMIN', 'COMPLEX_ADMIN') then
      return false;
    end if;
    if p_role = 'SECURITY' then
      return true;
    end if;
    if p_role = 'NEIGHBORHOOD_ADMIN' then
      return p_neighborhood_id in (select public.managed_neighborhood_ids());
    end if;
    if p_role = 'OWNER' then
      return exists (
        select 1
        from public.properties p
        where p.id = p_property_id
          and p.neighborhood_id in (select public.managed_neighborhood_ids())
      );
    end if;
  end if;

  if public.is_neighborhood_admin() then
    if p_role <> 'OWNER' then
      return false;
    end if;
    return exists (
      select 1
      from public.properties p
      where p.id = p_property_id
        and p.neighborhood_id in (select public.managed_neighborhood_ids())
    );
  end if;

  return false;
end;
$$;

create or replace function public.admin_create_person(
  p_email text,
  p_password text,
  p_first_name text,
  p_last_name text,
  p_role public.role,
  p_complex_id uuid,
  p_neighborhood_id uuid,
  p_property_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = public, auth, extensions
as $$
declare
  v_email text;
  v_first text;
  v_last text;
  v_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Tenés que estar autenticado'
      using errcode = '42501';
  end if;

  v_email := lower(trim(coalesce(p_email, '')));
  v_first := trim(coalesce(p_first_name, ''));
  v_last := trim(coalesce(p_last_name, ''));

  if v_email = '' or v_email !~ '^[^@]+@[^@]+\.[^@]+$' then
    raise exception 'El email no es válido'
      using errcode = '22023';
  end if;

  if v_first = '' or v_last = '' then
    raise exception 'Nombre y apellido son obligatorios'
      using errcode = '22023';
  end if;

  if char_length(coalesce(p_password, '')) < 8 then
    raise exception 'La contraseña tiene que tener al menos 8 caracteres'
      using errcode = '22023';
  end if;

  if not public.admin_may_assign_role(
    p_role,
    p_complex_id,
    p_neighborhood_id,
    p_property_id
  ) then
    raise exception 'No podés asignar ese rol en ese alcance'
      using errcode = '42501';
  end if;

  if exists (select 1 from auth.users u where lower(u.email) = v_email) then
    raise exception 'Ya existe una cuenta con ese email'
      using errcode = '23505';
  end if;

  v_id := gen_random_uuid();

  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at, confirmation_token, email_change,
    email_change_token_new, recovery_token
  )
  values (
    '00000000-0000-0000-0000-000000000000',
    v_id,
    'authenticated',
    'authenticated',
    v_email,
    crypt(p_password, gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    jsonb_build_object('first_name', v_first, 'last_name', v_last),
    now(),
    now(),
    '',
    '',
    '',
    ''
  );

  insert into auth.identities (
    id, user_id, identity_data, provider, provider_id,
    last_sign_in_at, created_at, updated_at
  )
  values (
    gen_random_uuid(),
    v_id,
    jsonb_build_object('sub', v_id::text, 'email', v_email),
    'email',
    v_id::text,
    now(),
    now(),
    now()
  );

  update public.profiles
  set
    first_name = v_first,
    last_name = v_last,
    email = v_email
  where id = v_id;

  insert into public.user_roles (
    user_id, role, complex_id, neighborhood_id, property_id
  )
  values (
    v_id,
    p_role,
    p_complex_id,
    p_neighborhood_id,
    p_property_id
  );

  return v_id;
end;
$$;

revoke all on function public.admin_may_assign_role(public.role, uuid, uuid, uuid)
  from public, anon;
revoke all on function public.admin_create_person(
  text, text, text, text, public.role, uuid, uuid, uuid
) from public, anon;
grant execute on function public.admin_create_person(
  text, text, text, text, public.role, uuid, uuid, uuid
) to authenticated, service_role;

drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles
  for select to authenticated
  using (
    public.is_superadmin()
    or id = auth.uid()
    or id in (
      select ur.user_id from public.user_roles ur
      where ur.property_id in (select public.owned_property_ids())
    )
    or id in (
      select ur.user_id
      from public.user_roles ur
      where ur.neighborhood_id in (select public.managed_neighborhood_ids())
         or ur.complex_id in (select public.managed_complex_ids())
         or ur.property_id in (
           select p.id from public.properties p
           where p.neighborhood_id in (select public.managed_neighborhood_ids())
         )
    )
    or id in (
      select al.security_user_id
      from public.access_logs al
      join public.invitations i on i.id = al.invitation_id
      where i.property_id in (select public.owned_property_ids())
         or i.neighborhood_id in (select public.managed_neighborhood_ids())
    )
    or (
      public.is_complex_admin()
      and id in (
        select ur.user_id from public.user_roles ur where ur.role = 'SECURITY'
      )
    )
  );

create policy profiles_update_admin on public.profiles
  for update to authenticated
  using (
    public.is_tenant_admin()
    and (
      id in (
        select ur.user_id
        from public.user_roles ur
        where ur.neighborhood_id in (select public.managed_neighborhood_ids())
           or ur.complex_id in (select public.managed_complex_ids())
           or ur.property_id in (
             select p.id from public.properties p
             where p.neighborhood_id in (select public.managed_neighborhood_ids())
           )
      )
      or (
        public.is_complex_admin()
        and id in (
          select ur.user_id from public.user_roles ur where ur.role = 'SECURITY'
        )
      )
    )
  )
  with check (
    public.is_tenant_admin()
    and (
      id in (
        select ur.user_id
        from public.user_roles ur
        where ur.neighborhood_id in (select public.managed_neighborhood_ids())
           or ur.complex_id in (select public.managed_complex_ids())
           or ur.property_id in (
             select p.id from public.properties p
             where p.neighborhood_id in (select public.managed_neighborhood_ids())
           )
      )
      or (
        public.is_complex_admin()
        and id in (
          select ur.user_id from public.user_roles ur where ur.role = 'SECURITY'
        )
      )
    )
  );

drop policy if exists user_roles_select on public.user_roles;
create policy user_roles_select on public.user_roles
  for select to authenticated
  using (
    public.is_superadmin()
    or user_id = auth.uid()
    or complex_id in (select public.managed_complex_ids())
    or neighborhood_id in (select public.managed_neighborhood_ids())
    or property_id in (
      select p.id from public.properties p
      where p.neighborhood_id in (select public.managed_neighborhood_ids())
    )
    or (
      role = 'SECURITY'
      and public.is_complex_admin()
    )
  );

create policy user_roles_insert_neighborhood_admin on public.user_roles
  for insert to authenticated
  with check (
    role = 'NEIGHBORHOOD_ADMIN'
    and neighborhood_id is not null
    and complex_id is null
    and property_id is null
    and neighborhood_id in (select public.managed_neighborhood_ids())
    and public.is_complex_admin()
  );

create policy user_roles_delete_neighborhood_admin on public.user_roles
  for delete to authenticated
  using (
    role = 'NEIGHBORHOOD_ADMIN'
    and neighborhood_id in (select public.managed_neighborhood_ids())
    and public.is_complex_admin()
  );

create policy user_roles_insert_security_admin on public.user_roles
  for insert to authenticated
  with check (
    role = 'SECURITY'
    and complex_id is null
    and neighborhood_id is null
    and property_id is null
    and (public.is_superadmin() or public.is_complex_admin())
  );

create policy user_roles_delete_security_admin on public.user_roles
  for delete to authenticated
  using (
    role = 'SECURITY'
    and (public.is_superadmin() or public.is_complex_admin())
  );
