-- Demo data for development. Passwords are password123 (never use in production).
-- Single DO block so `supabase db query --linked -f` executes the whole file.

do $$
begin
  insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at, confirmation_token, email_change,
      email_change_token_new, recovery_token
    )
    values
      (
        '00000000-0000-0000-0000-000000000000',
        '00000000-0000-0000-0000-000000000001',
        'authenticated', 'authenticated', 'superadmin@example.com',
        crypt('password123', gen_salt('bf')), now(),
        '{"provider":"email","providers":["email"]}'::jsonb,
        '{"first_name":"Super","last_name":"Admin"}'::jsonb,
        now(), now(), '', '', '', ''
      ),
      (
        '00000000-0000-0000-0000-000000000000',
        '00000000-0000-0000-0000-000000000002',
        'authenticated', 'authenticated', 'complex.admin@example.com',
        crypt('password123', gen_salt('bf')), now(),
        '{"provider":"email","providers":["email"]}'::jsonb,
        '{"first_name":"Carla","last_name":"Complejo"}'::jsonb,
        now(), now(), '', '', '', ''
      ),
      (
        '00000000-0000-0000-0000-000000000000',
        '00000000-0000-0000-0000-000000000003',
        'authenticated', 'authenticated', 'neighborhood.admin@example.com',
        crypt('password123', gen_salt('bf')), now(),
        '{"provider":"email","providers":["email"]}'::jsonb,
        '{"first_name":"Nico","last_name":"Barrio"}'::jsonb,
        now(), now(), '', '', '', ''
      ),
      (
        '00000000-0000-0000-0000-000000000000',
        '00000000-0000-0000-0000-000000000004',
        'authenticated', 'authenticated', 'owner@example.com',
        crypt('password123', gen_salt('bf')), now(),
        '{"provider":"email","providers":["email"]}'::jsonb,
        '{"first_name":"Olivia","last_name":"Lote1"}'::jsonb,
        now(), now(), '', '', '', ''
      ),
      (
        '00000000-0000-0000-0000-000000000000',
        '00000000-0000-0000-0000-000000000005',
        'authenticated', 'authenticated', 'owner2@example.com',
        crypt('password123', gen_salt('bf')), now(),
        '{"provider":"email","providers":["email"]}'::jsonb,
        '{"first_name":"Omar","last_name":"Lote2"}'::jsonb,
        now(), now(), '', '', '', ''
      ),
      (
        '00000000-0000-0000-0000-000000000000',
        '00000000-0000-0000-0000-000000000006',
        'authenticated', 'authenticated', 'security@example.com',
        crypt('password123', gen_salt('bf')), now(),
        '{"provider":"email","providers":["email"]}'::jsonb,
        '{"first_name":"Sofia","last_name":"Guardia"}'::jsonb,
        now(), now(), '', '', '', ''
      )
    on conflict (id) do nothing;

    insert into auth.identities (
      id, user_id, identity_data, provider, provider_id,
      last_sign_in_at, created_at, updated_at
    )
    select * from (
      values
        (
          gen_random_uuid(), '00000000-0000-0000-0000-000000000001'::uuid,
          '{"sub":"00000000-0000-0000-0000-000000000001","email":"superadmin@example.com"}'::jsonb,
          'email', '00000000-0000-0000-0000-000000000001', now(), now(), now()
        ),
        (
          gen_random_uuid(), '00000000-0000-0000-0000-000000000002'::uuid,
          '{"sub":"00000000-0000-0000-0000-000000000002","email":"complex.admin@example.com"}'::jsonb,
          'email', '00000000-0000-0000-0000-000000000002', now(), now(), now()
        ),
        (
          gen_random_uuid(), '00000000-0000-0000-0000-000000000003'::uuid,
          '{"sub":"00000000-0000-0000-0000-000000000003","email":"neighborhood.admin@example.com"}'::jsonb,
          'email', '00000000-0000-0000-0000-000000000003', now(), now(), now()
        ),
        (
          gen_random_uuid(), '00000000-0000-0000-0000-000000000004'::uuid,
          '{"sub":"00000000-0000-0000-0000-000000000004","email":"owner@example.com"}'::jsonb,
          'email', '00000000-0000-0000-0000-000000000004', now(), now(), now()
        ),
        (
          gen_random_uuid(), '00000000-0000-0000-0000-000000000005'::uuid,
          '{"sub":"00000000-0000-0000-0000-000000000005","email":"owner2@example.com"}'::jsonb,
          'email', '00000000-0000-0000-0000-000000000005', now(), now(), now()
        ),
        (
          gen_random_uuid(), '00000000-0000-0000-0000-000000000006'::uuid,
          '{"sub":"00000000-0000-0000-0000-000000000006","email":"security@example.com"}'::jsonb,
          'email', '00000000-0000-0000-0000-000000000006', now(), now(), now()
        )
    ) as v(id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
    where not exists (
      select 1 from auth.identities i
      where i.user_id = v.user_id and i.provider = 'email'
    );

  insert into public.complexes (id, name)
  values ('10000000-0000-0000-0000-000000000001', 'Master Plan Norte')
  on conflict (id) do nothing;

  insert into public.neighborhoods (id, complex_id, name)
  values
    ('10000000-0000-0000-0000-000000000011', '10000000-0000-0000-0000-000000000001', 'Barrio Los Robles'),
    ('10000000-0000-0000-0000-000000000012', null, 'Barrio Independiente')
  on conflict (id) do nothing;

  insert into public.properties (id, neighborhood_id, lot_number, street_name)
  values
    ('10000000-0000-0000-0000-000000000021', '10000000-0000-0000-0000-000000000011', '1', 'Calle Robles'),
    ('10000000-0000-0000-0000-000000000022', '10000000-0000-0000-0000-000000000011', '2', 'Calle Robles')
  on conflict (id) do nothing;

  update public.properties
  set
    block_name = 'A',
    phone = '11 5555-0101',
    notes = 'Frente al SUM'
  where id = '10000000-0000-0000-0000-000000000021';

  update public.properties
  set
    block_name = 'A',
    phone = '11 5555-0102',
    notes = 'Esquina con Calle Robles'
  where id = '10000000-0000-0000-0000-000000000022';

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
    )
  on conflict (id) do nothing;

  insert into public.user_roles (user_id, role, complex_id, neighborhood_id, property_id)
  select * from (
    values
      ('00000000-0000-0000-0000-000000000001'::uuid, 'SUPERADMIN'::public.role, null::uuid, null::uuid, null::uuid),
      ('00000000-0000-0000-0000-000000000002'::uuid, 'COMPLEX_ADMIN'::public.role, '10000000-0000-0000-0000-000000000001'::uuid, null::uuid, null::uuid),
      ('00000000-0000-0000-0000-000000000003'::uuid, 'NEIGHBORHOOD_ADMIN'::public.role, null::uuid, '10000000-0000-0000-0000-000000000011'::uuid, null::uuid),
      ('00000000-0000-0000-0000-000000000004'::uuid, 'OWNER'::public.role, null::uuid, null::uuid, '10000000-0000-0000-0000-000000000021'::uuid),
      ('00000000-0000-0000-0000-000000000005'::uuid, 'OWNER'::public.role, null::uuid, null::uuid, '10000000-0000-0000-0000-000000000022'::uuid),
      ('00000000-0000-0000-0000-000000000006'::uuid, 'SECURITY'::public.role, null::uuid, null::uuid, null::uuid)
  ) as v(user_id, role, complex_id, neighborhood_id, property_id)
  where not exists (
    select 1 from public.user_roles ur
    where ur.user_id = v.user_id and ur.role = v.role
  );

  insert into public.shifts (id, user_id, gate_id)
  values (
    '10000000-0000-0000-0000-000000000051',
    '00000000-0000-0000-0000-000000000006',
    '10000000-0000-0000-0000-000000000031'
  )
  on conflict (id) do nothing;

  insert into public.invitations (
    id, neighborhood_id, property_id, created_by_user_id,
    guest_name, guest_dni, qr_token, valid_from, valid_to, is_single_use
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
    )
  on conflict (id) do nothing;

  insert into public.invitation_vehicles (
    id, invitation_id, plate_normalized, plate_display, plate_format, color
  )
  values
    (
      '10000000-0000-0000-0000-000000000061',
      '10000000-0000-0000-0000-000000000041',
      'ABC123',
      'ABC 123',
      'AR_OLD',
      'Blanco'
    ),
    (
      '10000000-0000-0000-0000-000000000062',
      '10000000-0000-0000-0000-000000000041',
      'AB123CD',
      'AB 123 CD',
      'AR_MERCOSUR',
      'Gris'
    )
  on conflict (id) do nothing;

  insert into public.invitation_passengers (
    id, invitation_id, vehicle_id, full_name, dni, is_driver
  )
  values
    (
      '10000000-0000-0000-0000-000000000071',
      '10000000-0000-0000-0000-000000000041',
      '10000000-0000-0000-0000-000000000061',
      'Invitado Lote 1',
      '30111222',
      true
    ),
    (
      '10000000-0000-0000-0000-000000000072',
      '10000000-0000-0000-0000-000000000041',
      '10000000-0000-0000-0000-000000000061',
      'Ana López',
      '30111333',
      false
    ),
    (
      '10000000-0000-0000-0000-000000000073',
      '10000000-0000-0000-0000-000000000041',
      '10000000-0000-0000-0000-000000000062',
      'Carlos Pérez',
      '30999001',
      true
    )
  on conflict (id) do nothing;
end $$;
