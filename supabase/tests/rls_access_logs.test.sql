begin;
select plan(3);

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at, confirmation_token, email_change,
  email_change_token_new, recovery_token
)
values
  (
    '00000000-0000-0000-0000-000000000000',
    'aaaaaaaa-0000-0000-0000-000000000031',
    'authenticated', 'authenticated', 'rls.owner.audit@example.com',
    crypt('password123', gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"first_name":"Audit","last_name":"Owner"}'::jsonb,
    now(), now(), '', '', '', ''
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'aaaaaaaa-0000-0000-0000-000000000032',
    'authenticated', 'authenticated', 'rls.owner2.audit@example.com',
    crypt('password123', gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"first_name":"Audit","last_name":"Owner2"}'::jsonb,
    now(), now(), '', '', '', ''
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'aaaaaaaa-0000-0000-0000-000000000033',
    'authenticated', 'authenticated', 'rls.security.audit@example.com',
    crypt('password123', gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"first_name":"Audit","last_name":"Guard"}'::jsonb,
    now(), now(), '', '', '', ''
  );

insert into public.complexes (id, name)
values ('bbbbbbbb-0000-0000-0000-000000000101', 'Audit Complex');

insert into public.neighborhoods (id, complex_id, name)
values ('bbbbbbbb-0000-0000-0000-000000000111', 'bbbbbbbb-0000-0000-0000-000000000101', 'Audit Hood');

insert into public.properties (id, neighborhood_id, lot_number)
values
  ('bbbbbbbb-0000-0000-0000-000000000121', 'bbbbbbbb-0000-0000-0000-000000000111', 'A1'),
  ('bbbbbbbb-0000-0000-0000-000000000122', 'bbbbbbbb-0000-0000-0000-000000000111', 'A2');

insert into public.gates (id, complex_id, neighborhood_id, name, type)
values (
  'bbbbbbbb-0000-0000-0000-000000000131',
  'bbbbbbbb-0000-0000-0000-000000000101',
  null,
  'Audit Main',
  'MAIN_COMPLEX'
);

insert into public.user_roles (user_id, role, complex_id, neighborhood_id, property_id)
values
  ('aaaaaaaa-0000-0000-0000-000000000031', 'OWNER', null, null, 'bbbbbbbb-0000-0000-0000-000000000121'),
  ('aaaaaaaa-0000-0000-0000-000000000032', 'OWNER', null, null, 'bbbbbbbb-0000-0000-0000-000000000122'),
  ('aaaaaaaa-0000-0000-0000-000000000033', 'SECURITY', null, null, null);

insert into public.invitations (
  id, neighborhood_id, property_id, created_by_user_id,
  guest_name, qr_token, valid_from, valid_to
)
values
  (
    'cccccccc-0000-0000-0000-000000000141',
    'bbbbbbbb-0000-0000-0000-000000000111',
    'bbbbbbbb-0000-0000-0000-000000000121',
    'aaaaaaaa-0000-0000-0000-000000000031',
    'Guest A1',
    'dddddddd-0000-0000-0000-000000000141',
    now() - interval '1 hour',
    now() + interval '1 day'
  ),
  (
    'cccccccc-0000-0000-0000-000000000142',
    'bbbbbbbb-0000-0000-0000-000000000111',
    'bbbbbbbb-0000-0000-0000-000000000122',
    'aaaaaaaa-0000-0000-0000-000000000032',
    'Guest A2',
    'dddddddd-0000-0000-0000-000000000142',
    now() - interval '1 hour',
    now() + interval '1 day'
  );

insert into public.access_logs (
  invitation_id, gate_id, security_user_id, action_type
)
values
  (
    'cccccccc-0000-0000-0000-000000000141',
    'bbbbbbbb-0000-0000-0000-000000000131',
    'aaaaaaaa-0000-0000-0000-000000000033',
    'IN_COMPLEX'
  ),
  (
    'cccccccc-0000-0000-0000-000000000142',
    'bbbbbbbb-0000-0000-0000-000000000131',
    'aaaaaaaa-0000-0000-0000-000000000033',
    'IN_COMPLEX'
  );

select set_config('request.jwt.claim.sub', 'aaaaaaaa-0000-0000-0000-000000000031', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config(
  'request.jwt.claims',
  '{"sub":"aaaaaaaa-0000-0000-0000-000000000031","role":"authenticated","aud":"authenticated"}',
  true
);
set local role authenticated;

select is(
  (select count(*)::integer from public.access_logs where invitation_id in (
    'cccccccc-0000-0000-0000-000000000141',
    'cccccccc-0000-0000-0000-000000000142'
  )),
  1,
  'OWNER sees only access logs for their invitation'
);

select is(
  (select count(*)::integer from public.gates where id = 'bbbbbbbb-0000-0000-0000-000000000131'),
  1,
  'OWNER can read the MAIN_COMPLEX gate that scanned their guest'
);

reset role;
select set_config('request.jwt.claim.sub', 'aaaaaaaa-0000-0000-0000-000000000033', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config(
  'request.jwt.claims',
  '{"sub":"aaaaaaaa-0000-0000-0000-000000000033","role":"authenticated","aud":"authenticated"}',
  true
);
set local role authenticated;

select is(
  (select count(*)::integer from public.access_logs where invitation_id in (
    'cccccccc-0000-0000-0000-000000000141',
    'cccccccc-0000-0000-0000-000000000142'
  )),
  2,
  'SECURITY sees the scans they performed'
);

select * from finish();
rollback;
