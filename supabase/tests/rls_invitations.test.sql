begin;
select plan(7);

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at, confirmation_token, email_change,
  email_change_token_new, recovery_token
)
values
  (
    '00000000-0000-0000-0000-000000000000',
    'aaaaaaaa-0000-0000-0000-000000000001',
    'authenticated', 'authenticated', 'rls.super@example.com',
    crypt('password123', gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"first_name":"Rls","last_name":"Super"}'::jsonb,
    now(), now(), '', '', '', ''
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'aaaaaaaa-0000-0000-0000-000000000002',
    'authenticated', 'authenticated', 'rls.complex@example.com',
    crypt('password123', gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"first_name":"Rls","last_name":"Complex"}'::jsonb,
    now(), now(), '', '', '', ''
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'aaaaaaaa-0000-0000-0000-000000000003',
    'authenticated', 'authenticated', 'rls.owner1@example.com',
    crypt('password123', gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"first_name":"Rls","last_name":"Owner1"}'::jsonb,
    now(), now(), '', '', '', ''
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'aaaaaaaa-0000-0000-0000-000000000004',
    'authenticated', 'authenticated', 'rls.owner2@example.com',
    crypt('password123', gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"first_name":"Rls","last_name":"Owner2"}'::jsonb,
    now(), now(), '', '', '', ''
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'aaaaaaaa-0000-0000-0000-000000000005',
    'authenticated', 'authenticated', 'rls.othercomplex@example.com',
    crypt('password123', gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"first_name":"Rls","last_name":"Other"}'::jsonb,
    now(), now(), '', '', '', ''
  );

insert into public.complexes (id, name)
values
  ('bbbbbbbb-0000-0000-0000-000000000001', 'RLS Complex A'),
  ('bbbbbbbb-0000-0000-0000-000000000002', 'RLS Complex B');

insert into public.neighborhoods (id, complex_id, name)
values
  ('bbbbbbbb-0000-0000-0000-000000000011', 'bbbbbbbb-0000-0000-0000-000000000001', 'RLS Neighborhood A'),
  ('bbbbbbbb-0000-0000-0000-000000000012', 'bbbbbbbb-0000-0000-0000-000000000002', 'RLS Neighborhood B');

insert into public.properties (id, neighborhood_id, lot_number)
values
  ('bbbbbbbb-0000-0000-0000-000000000021', 'bbbbbbbb-0000-0000-0000-000000000011', 'A1'),
  ('bbbbbbbb-0000-0000-0000-000000000022', 'bbbbbbbb-0000-0000-0000-000000000011', 'A2'),
  ('bbbbbbbb-0000-0000-0000-000000000023', 'bbbbbbbb-0000-0000-0000-000000000012', 'B1');

insert into public.user_roles (user_id, role, complex_id, neighborhood_id, property_id)
values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'SUPERADMIN', null, null, null),
  ('aaaaaaaa-0000-0000-0000-000000000002', 'COMPLEX_ADMIN', 'bbbbbbbb-0000-0000-0000-000000000001', null, null),
  ('aaaaaaaa-0000-0000-0000-000000000003', 'OWNER', null, null, 'bbbbbbbb-0000-0000-0000-000000000021'),
  ('aaaaaaaa-0000-0000-0000-000000000004', 'OWNER', null, null, 'bbbbbbbb-0000-0000-0000-000000000022'),
  ('aaaaaaaa-0000-0000-0000-000000000005', 'COMPLEX_ADMIN', 'bbbbbbbb-0000-0000-0000-000000000002', null, null);

insert into public.invitations (
  id, neighborhood_id, property_id, created_by_user_id,
  guest_name, qr_token, valid_from, valid_to
)
values
  (
    'cccccccc-0000-0000-0000-000000000041',
    'bbbbbbbb-0000-0000-0000-000000000011',
    'bbbbbbbb-0000-0000-0000-000000000021',
    'aaaaaaaa-0000-0000-0000-000000000003',
    'Guest A1',
    'dddddddd-0000-0000-0000-000000000041',
    now() - interval '1 hour',
    now() + interval '1 day'
  ),
  (
    'cccccccc-0000-0000-0000-000000000042',
    'bbbbbbbb-0000-0000-0000-000000000011',
    'bbbbbbbb-0000-0000-0000-000000000022',
    'aaaaaaaa-0000-0000-0000-000000000004',
    'Guest A2',
    'dddddddd-0000-0000-0000-000000000042',
    now() - interval '1 hour',
    now() + interval '1 day'
  ),
  (
    'cccccccc-0000-0000-0000-000000000043',
    'bbbbbbbb-0000-0000-0000-000000000012',
    'bbbbbbbb-0000-0000-0000-000000000023',
    'aaaaaaaa-0000-0000-0000-000000000005',
    'Guest B1',
    'dddddddd-0000-0000-0000-000000000043',
    now() - interval '1 hour',
    now() + interval '1 day'
  );

select set_config('request.jwt.claim.sub', 'aaaaaaaa-0000-0000-0000-000000000003', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config(
  'request.jwt.claims',
  '{"sub":"aaaaaaaa-0000-0000-0000-000000000003","role":"authenticated","aud":"authenticated"}',
  true
);
set local role authenticated;

select is(
  (select count(*)::integer from public.invitations where id in (
    'cccccccc-0000-0000-0000-000000000041',
    'cccccccc-0000-0000-0000-000000000042',
    'cccccccc-0000-0000-0000-000000000043'
  )),
  1,
  'OWNER of A1 sees only their invitation'
);

select is(
  (select count(*)::integer from public.invitations where id = 'cccccccc-0000-0000-0000-000000000042'),
  0,
  'OWNER of A1 cannot read invitation of A2'
);

select throws_ok(
  $$ insert into public.invitations (
       neighborhood_id, property_id, created_by_user_id,
       guest_name, valid_from, valid_to
     ) values (
       'bbbbbbbb-0000-0000-0000-000000000011',
       'bbbbbbbb-0000-0000-0000-000000000022',
       'aaaaaaaa-0000-0000-0000-000000000003',
       'Sneaky guest',
       now(),
       now() + interval '1 day'
     ) $$,
  '42501',
  null,
  'OWNER cannot create an invitation for another property'
);

reset role;
select set_config('request.jwt.claim.sub', 'aaaaaaaa-0000-0000-0000-000000000002', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config(
  'request.jwt.claims',
  '{"sub":"aaaaaaaa-0000-0000-0000-000000000002","role":"authenticated","aud":"authenticated"}',
  true
);
set local role authenticated;

select is(
  (select count(*)::integer from public.invitations where id in (
    'cccccccc-0000-0000-0000-000000000041',
    'cccccccc-0000-0000-0000-000000000042',
    'cccccccc-0000-0000-0000-000000000043'
  )),
  2,
  'COMPLEX_ADMIN of A sees both child-neighborhood invitations'
);

select is(
  (select count(*)::integer from public.invitations where id = 'cccccccc-0000-0000-0000-000000000043'),
  0,
  'COMPLEX_ADMIN of A cannot read invitations of complex B'
);

reset role;
select set_config('request.jwt.claim.sub', 'aaaaaaaa-0000-0000-0000-000000000001', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config(
  'request.jwt.claims',
  '{"sub":"aaaaaaaa-0000-0000-0000-000000000001","role":"authenticated","aud":"authenticated"}',
  true
);
set local role authenticated;

select is(
  (select count(*)::integer from public.invitations where id in (
    'cccccccc-0000-0000-0000-000000000041',
    'cccccccc-0000-0000-0000-000000000042',
    'cccccccc-0000-0000-0000-000000000043'
  )),
  3,
  'SUPERADMIN sees all test invitations'
);

reset role;
select set_config('request.jwt.claim.sub', 'aaaaaaaa-0000-0000-0000-000000000005', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config(
  'request.jwt.claims',
  '{"sub":"aaaaaaaa-0000-0000-0000-000000000005","role":"authenticated","aud":"authenticated"}',
  true
);
set local role authenticated;

select is(
  (select array_agg(id order by id) from public.invitations where id in (
    'cccccccc-0000-0000-0000-000000000041',
    'cccccccc-0000-0000-0000-000000000042',
    'cccccccc-0000-0000-0000-000000000043'
  )),
  array['cccccccc-0000-0000-0000-000000000043'::uuid],
  'COMPLEX_ADMIN of B only sees invitation B1'
);

select * from finish();
rollback;
