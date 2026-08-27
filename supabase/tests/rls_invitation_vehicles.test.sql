begin;
select plan(5);

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at, confirmation_token, email_change,
  email_change_token_new, recovery_token
)
values
  (
    '00000000-0000-0000-0000-000000000000',
    'aaaaaaaa-0000-0000-0000-000000000051',
    'authenticated', 'authenticated', 'rls.owner.car@example.com',
    crypt('password123', gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"first_name":"Car","last_name":"Owner"}'::jsonb,
    now(), now(), '', '', '', ''
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'aaaaaaaa-0000-0000-0000-000000000052',
    'authenticated', 'authenticated', 'rls.owner2.car@example.com',
    crypt('password123', gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"first_name":"Car","last_name":"Owner2"}'::jsonb,
    now(), now(), '', '', '', ''
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'aaaaaaaa-0000-0000-0000-000000000053',
    'authenticated', 'authenticated', 'rls.security.car@example.com',
    crypt('password123', gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"first_name":"Car","last_name":"Guard"}'::jsonb,
    now(), now(), '', '', '', ''
  );

insert into public.complexes (id, name)
values ('bbbbbbbb-0000-0000-0000-000000000201', 'Car Complex');

insert into public.neighborhoods (id, complex_id, name)
values ('bbbbbbbb-0000-0000-0000-000000000211', 'bbbbbbbb-0000-0000-0000-000000000201', 'Car Hood');

insert into public.properties (id, neighborhood_id, lot_number)
values
  ('bbbbbbbb-0000-0000-0000-000000000221', 'bbbbbbbb-0000-0000-0000-000000000211', 'C1'),
  ('bbbbbbbb-0000-0000-0000-000000000222', 'bbbbbbbb-0000-0000-0000-000000000211', 'C2');

insert into public.gates (id, complex_id, neighborhood_id, name, type)
values (
  'bbbbbbbb-0000-0000-0000-000000000231',
  'bbbbbbbb-0000-0000-0000-000000000201',
  null,
  'Car Main',
  'MAIN_COMPLEX'
);

insert into public.user_roles (user_id, role, complex_id, neighborhood_id, property_id)
values
  ('aaaaaaaa-0000-0000-0000-000000000051', 'OWNER', null, null, 'bbbbbbbb-0000-0000-0000-000000000221'),
  ('aaaaaaaa-0000-0000-0000-000000000052', 'OWNER', null, null, 'bbbbbbbb-0000-0000-0000-000000000222'),
  ('aaaaaaaa-0000-0000-0000-000000000053', 'SECURITY', null, null, null);

insert into public.shifts (id, user_id, gate_id)
values (
  'bbbbbbbb-0000-0000-0000-000000000241',
  'aaaaaaaa-0000-0000-0000-000000000053',
  'bbbbbbbb-0000-0000-0000-000000000231'
);

insert into public.invitations (
  id, neighborhood_id, property_id, created_by_user_id,
  guest_name, qr_token, valid_from, valid_to
)
values
  (
    'cccccccc-0000-0000-0000-000000000251',
    'bbbbbbbb-0000-0000-0000-000000000211',
    'bbbbbbbb-0000-0000-0000-000000000221',
    'aaaaaaaa-0000-0000-0000-000000000051',
    'Guest C1',
    'dddddddd-0000-0000-0000-000000000251',
    now() - interval '1 hour',
    now() + interval '1 day'
  ),
  (
    'cccccccc-0000-0000-0000-000000000252',
    'bbbbbbbb-0000-0000-0000-000000000211',
    'bbbbbbbb-0000-0000-0000-000000000222',
    'aaaaaaaa-0000-0000-0000-000000000052',
    'Guest C2',
    'dddddddd-0000-0000-0000-000000000252',
    now() - interval '1 hour',
    now() + interval '1 day'
  );

insert into public.invitation_vehicles (
  id, invitation_id, plate_normalized, plate_display, plate_format
)
values
  (
    'eeeeeeee-0000-0000-0000-000000000261',
    'cccccccc-0000-0000-0000-000000000251',
    'ABC123',
    'ABC 123',
    'AR_OLD'
  ),
  (
    'eeeeeeee-0000-0000-0000-000000000262',
    'cccccccc-0000-0000-0000-000000000252',
    'AB123CD',
    'AB 123 CD',
    'AR_MERCOSUR'
  );

insert into public.invitation_passengers (
  invitation_id, vehicle_id, full_name, is_driver
)
values
  (
    'cccccccc-0000-0000-0000-000000000251',
    'eeeeeeee-0000-0000-0000-000000000261',
    'Guest C1',
    true
  );

select set_config('request.jwt.claim.sub', 'aaaaaaaa-0000-0000-0000-000000000051', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config(
  'request.jwt.claims',
  '{"sub":"aaaaaaaa-0000-0000-0000-000000000051","role":"authenticated","aud":"authenticated"}',
  true
);
set local role authenticated;

select is(
  (select count(*)::integer from public.invitation_vehicles),
  1,
  'OWNER sees only vehicles of their invitations'
);

select lives_ok(
  $$ insert into public.invitation_vehicles (
       invitation_id, plate_normalized, plate_display, plate_format
     ) values (
       'cccccccc-0000-0000-0000-000000000251',
       'XYZ987',
       'XYZ 987',
       'AR_OLD'
     ) $$,
  'OWNER can add a vehicle to their invitation'
);

select throws_ok(
  $$ insert into public.invitation_vehicles (
       invitation_id, plate_normalized, plate_display, plate_format
     ) values (
       'cccccccc-0000-0000-0000-000000000252',
       'AAA111',
       'AAA 111',
       'AR_OLD'
     ) $$,
  '42501',
  null,
  'OWNER cannot add a vehicle to another lot invitation'
);

reset role;
select set_config('request.jwt.claim.sub', 'aaaaaaaa-0000-0000-0000-000000000053', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config(
  'request.jwt.claims',
  '{"sub":"aaaaaaaa-0000-0000-0000-000000000053","role":"authenticated","aud":"authenticated"}',
  true
);
set local role authenticated;

select is(
  (select count(*)::integer from public.invitation_vehicles where invitation_id in (
    'cccccccc-0000-0000-0000-000000000251',
    'cccccccc-0000-0000-0000-000000000252'
  )),
  3,
  'SECURITY on the main gate can read vehicles of both lots'
);

select throws_ok(
  $$ insert into public.invitation_vehicles (
       invitation_id, plate_normalized, plate_display, plate_format
     ) values (
       'cccccccc-0000-0000-0000-000000000251',
       'BBB222',
       'BBB 222',
       'AR_OLD'
     ) $$,
  '42501',
  null,
  'SECURITY cannot write vehicles'
);

select * from finish();
rollback;
