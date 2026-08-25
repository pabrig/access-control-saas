-- Local development seed. Passwords are for local Auth only (never production).
-- Login: <email> / password123

create or replace function public._seed_auth_user(
  p_id uuid,
  p_email text,
  p_password text,
  p_first_name text,
  p_last_name text
)
returns void
language plpgsql
security definer
set search_path = auth, extensions, public
as $$
begin
  insert into auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    email_change,
    email_change_token_new,
    recovery_token
  )
  values (
    '00000000-0000-0000-0000-000000000000',
    p_id,
    'authenticated',
    'authenticated',
    p_email,
    crypt(p_password, gen_salt('bf')),
    now(),
    jsonb_build_object('provider', 'email', 'providers', jsonb_build_array('email')),
    jsonb_build_object('first_name', p_first_name, 'last_name', p_last_name),
    now(),
    now(),
    '',
    '',
    '',
    ''
  );

  insert into auth.identities (
    id,
    user_id,
    identity_data,
    provider,
    provider_id,
    last_sign_in_at,
    created_at,
    updated_at
  )
  values (
    gen_random_uuid(),
    p_id,
    jsonb_build_object('sub', p_id::text, 'email', p_email),
    'email',
    p_id::text,
    now(),
    now(),
    now()
  );
end;
$$;

select public._seed_auth_user(
  '00000000-0000-0000-0000-000000000001',
  'superadmin@example.com',
  'password123',
  'Super',
  'Admin'
);

select public._seed_auth_user(
  '00000000-0000-0000-0000-000000000002',
  'complex.admin@example.com',
  'password123',
  'Carla',
  'Complejo'
);

select public._seed_auth_user(
  '00000000-0000-0000-0000-000000000003',
  'neighborhood.admin@example.com',
  'password123',
  'Nico',
  'Barrio'
);

select public._seed_auth_user(
  '00000000-0000-0000-0000-000000000004',
  'owner@example.com',
  'password123',
  'Olivia',
  'Lote1'
);

select public._seed_auth_user(
  '00000000-0000-0000-0000-000000000005',
  'owner2@example.com',
  'password123',
  'Omar',
  'Lote2'
);

select public._seed_auth_user(
  '00000000-0000-0000-0000-000000000006',
  'security@example.com',
  'password123',
  'Sofia',
  'Guardia'
);

drop function public._seed_auth_user(uuid, text, text, text, text);

insert into public.complexes (id, name)
values ('10000000-0000-0000-0000-000000000001', 'Master Plan Norte');

insert into public.neighborhoods (id, complex_id, name)
values
  ('10000000-0000-0000-0000-000000000011', '10000000-0000-0000-0000-000000000001', 'Barrio Los Robles'),
  ('10000000-0000-0000-0000-000000000012', null, 'Barrio Independiente');

insert into public.properties (id, neighborhood_id, lot_number, street_name)
values
  ('10000000-0000-0000-0000-000000000021', '10000000-0000-0000-0000-000000000011', '1', 'Calle Robles'),
  ('10000000-0000-0000-0000-000000000022', '10000000-0000-0000-0000-000000000011', '2', 'Calle Robles');

insert into public.gates (id, complex_id, neighborhood_id, name, type)
values
  (
    '10000000-0000-0000-0000-000000000031',
    '10000000-0000-0000-0000-000000000001',
    null,
    'Barrera principal',
    'MAIN_COMPLEX'
  ),
  (
    '10000000-0000-0000-0000-000000000032',
    null,
    '10000000-0000-0000-0000-000000000011',
    'Barrera interna Los Robles',
    'INTERNAL_NEIGHBORHOOD'
  );

insert into public.user_roles (user_id, role, complex_id, neighborhood_id, property_id)
values
  ('00000000-0000-0000-0000-000000000001', 'SUPERADMIN', null, null, null),
  (
    '00000000-0000-0000-0000-000000000002',
    'COMPLEX_ADMIN',
    '10000000-0000-0000-0000-000000000001',
    null,
    null
  ),
  (
    '00000000-0000-0000-0000-000000000003',
    'NEIGHBORHOOD_ADMIN',
    null,
    '10000000-0000-0000-0000-000000000011',
    null
  ),
  (
    '00000000-0000-0000-0000-000000000004',
    'OWNER',
    null,
    null,
    '10000000-0000-0000-0000-000000000021'
  ),
  (
    '00000000-0000-0000-0000-000000000005',
    'OWNER',
    null,
    null,
    '10000000-0000-0000-0000-000000000022'
  ),
  ('00000000-0000-0000-0000-000000000006', 'SECURITY', null, null, null);

insert into public.shifts (id, user_id, gate_id)
values (
  '10000000-0000-0000-0000-000000000051',
  '00000000-0000-0000-0000-000000000006',
  '10000000-0000-0000-0000-000000000031'
);

insert into public.invitations (
  id,
  neighborhood_id,
  property_id,
  created_by_user_id,
  guest_name,
  guest_dni,
  qr_token,
  valid_from,
  valid_to,
  is_single_use
)
values
  (
    '10000000-0000-0000-0000-000000000041',
    '10000000-0000-0000-0000-000000000011',
    '10000000-0000-0000-0000-000000000021',
    '00000000-0000-0000-0000-000000000004',
    'Invitado Lote 1',
    '30111222',
    '20000000-0000-0000-0000-000000000041',
    now() - interval '1 day',
    now() + interval '30 days',
    false
  ),
  (
    '10000000-0000-0000-0000-000000000042',
    '10000000-0000-0000-0000-000000000011',
    '10000000-0000-0000-0000-000000000022',
    '00000000-0000-0000-0000-000000000005',
    'Invitado Lote 2',
    '30999888',
    '20000000-0000-0000-0000-000000000042',
    now() - interval '1 day',
    now() + interval '30 days',
    false
  );
