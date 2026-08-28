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
    'aaaaaaaa-0000-0000-0000-000000000041',
    'authenticated', 'authenticated', 'rls.owner.gate.a@example.com',
    crypt('password123', gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"first_name":"Gate","last_name":"OwnerA"}'::jsonb,
    now(), now(), '', '', '', ''
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'aaaaaaaa-0000-0000-0000-000000000042',
    'authenticated', 'authenticated', 'rls.owner.gate.b@example.com',
    crypt('password123', gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"first_name":"Gate","last_name":"OwnerB"}'::jsonb,
    now(), now(), '', '', '', ''
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'aaaaaaaa-0000-0000-0000-000000000043',
    'authenticated', 'authenticated', 'rls.security.gate@example.com',
    crypt('password123', gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"first_name":"Gate","last_name":"Guard"}'::jsonb,
    now(), now(), '', '', '', ''
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'aaaaaaaa-0000-0000-0000-000000000044',
    'authenticated', 'authenticated', 'rls.security.gate2@example.com',
    crypt('password123', gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"first_name":"Gate","last_name":"Guard2"}'::jsonb,
    now(), now(), '', '', '', ''
  );

insert into public.complexes (id, name)
values ('bbbbbbbb-0000-0000-0000-000000000201', 'Owner Gate Complex');

insert into public.neighborhoods (id, complex_id, name)
values ('bbbbbbbb-0000-0000-0000-000000000211', 'bbbbbbbb-0000-0000-0000-000000000201', 'Owner Gate Hood');

insert into public.properties (id, neighborhood_id, lot_number)
values
  ('bbbbbbbb-0000-0000-0000-000000000221', 'bbbbbbbb-0000-0000-0000-000000000211', 'A1'),
  ('bbbbbbbb-0000-0000-0000-000000000222', 'bbbbbbbb-0000-0000-0000-000000000211', 'A2');

insert into public.gates (id, complex_id, neighborhood_id, name, type)
values (
  'bbbbbbbb-0000-0000-0000-000000000231',
  'bbbbbbbb-0000-0000-0000-000000000201',
  null,
  'Owner Gate Main',
  'MAIN_COMPLEX'
);

insert into public.user_roles (user_id, role, complex_id, neighborhood_id, property_id)
values
  ('aaaaaaaa-0000-0000-0000-000000000041', 'OWNER', null, null, 'bbbbbbbb-0000-0000-0000-000000000221'),
  ('aaaaaaaa-0000-0000-0000-000000000042', 'OWNER', null, null, 'bbbbbbbb-0000-0000-0000-000000000222'),
  ('aaaaaaaa-0000-0000-0000-000000000043', 'SECURITY', null, null, null);

insert into public.access_logs (
  profile_id, property_id, gate_id, security_user_id, action_type
)
values
  (
    'aaaaaaaa-0000-0000-0000-000000000041',
    'bbbbbbbb-0000-0000-0000-000000000221',
    'bbbbbbbb-0000-0000-0000-000000000231',
    'aaaaaaaa-0000-0000-0000-000000000044',
    'IN_COMPLEX'
  ),
  (
    'aaaaaaaa-0000-0000-0000-000000000042',
    'bbbbbbbb-0000-0000-0000-000000000222',
    'bbbbbbbb-0000-0000-0000-000000000231',
    'aaaaaaaa-0000-0000-0000-000000000044',
    'IN_COMPLEX'
  );

select set_config('request.jwt.claim.sub', 'aaaaaaaa-0000-0000-0000-000000000041', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config(
  'request.jwt.claims',
  '{"sub":"aaaaaaaa-0000-0000-0000-000000000041","role":"authenticated","aud":"authenticated"}',
  true
);
set local role authenticated;

select is(
  (select count(*)::integer from public.access_logs where profile_id in (
    'aaaaaaaa-0000-0000-0000-000000000041',
    'aaaaaaaa-0000-0000-0000-000000000042'
  )),
  1,
  'OWNER A sees only their own owner access log'
);

select is(
  (select count(*)::integer from public.access_logs where profile_id = 'aaaaaaaa-0000-0000-0000-000000000042'),
  0,
  'OWNER A cannot read owner access log of OWNER B'
);

reset role;
select set_config('request.jwt.claim.sub', 'aaaaaaaa-0000-0000-0000-000000000043', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config(
  'request.jwt.claims',
  '{"sub":"aaaaaaaa-0000-0000-0000-000000000043","role":"authenticated","aud":"authenticated"}',
  true
);
set local role authenticated;

select is(
  (select count(*)::integer from public.access_logs where profile_id in (
    'aaaaaaaa-0000-0000-0000-000000000041',
    'aaaaaaaa-0000-0000-0000-000000000042'
  )),
  0,
  'SECURITY without active shift cannot read owner access logs'
);

insert into public.shifts (user_id, gate_id)
values ('aaaaaaaa-0000-0000-0000-000000000043', 'bbbbbbbb-0000-0000-0000-000000000231');

select is(
  (select count(*)::integer from public.access_logs where profile_id in (
    'aaaaaaaa-0000-0000-0000-000000000041',
    'aaaaaaaa-0000-0000-0000-000000000042'
  )),
  2,
  'SECURITY on active shift sees owner access logs at their gate'
);

select is(
  (select count(*)::integer from public.profiles where id = 'aaaaaaaa-0000-0000-0000-000000000041'),
  1,
  'SECURITY on shift can read owner profile for gate feed'
);

select * from finish();
rollback;
