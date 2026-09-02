-- Basic location / surface fields for admin entity forms.
-- Extend admin_create_person to persist DNI on profile creation.

alter table public.complexes
  add column if not exists location text;

alter table public.neighborhoods
  add column if not exists location text;

alter table public.properties
  add column if not exists surface_m2 numeric(10, 2);

comment on column public.complexes.location is 'City or address label for the complex';
comment on column public.neighborhoods.location is 'City or address label for the neighborhood';
comment on column public.properties.surface_m2 is 'Lot surface area in square meters';

drop function if exists public.admin_create_person(
  text, text, text, text, public.role, uuid, uuid, uuid
);

create or replace function public.admin_create_person(
  p_email text,
  p_password text,
  p_first_name text,
  p_last_name text,
  p_dni text,
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
  v_dni text;
  v_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Tenés que estar autenticado'
      using errcode = '42501';
  end if;

  v_email := lower(trim(coalesce(p_email, '')));
  v_first := trim(coalesce(p_first_name, ''));
  v_last := trim(coalesce(p_last_name, ''));
  v_dni := regexp_replace(trim(coalesce(p_dni, '')), '\D', '', 'g');

  if v_email = '' or v_email !~ '^[^@]+@[^@]+\.[^@]+$' then
    raise exception 'El email no es válido'
      using errcode = '22023';
  end if;

  if v_first = '' or v_last = '' then
    raise exception 'Nombre y apellido son obligatorios'
      using errcode = '22023';
  end if;

  if char_length(v_dni) < 7 or char_length(v_dni) > 12 then
    raise exception 'El DNI es obligatorio (7 a 12 dígitos)'
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
    email = v_email,
    dni = v_dni
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

revoke all on function public.admin_create_person(
  text, text, text, text, text, public.role, uuid, uuid, uuid
) from public, anon;
grant execute on function public.admin_create_person(
  text, text, text, text, text, public.role, uuid, uuid, uuid
) to authenticated, service_role;
