begin;
select plan(4);

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at, confirmation_token, email_change,
  email_change_token_new, recovery_token
)
values
  (
    '00000000-0000-0000-0000-000000000000',
    'aaaaaaaa-0000-0000-0000-000000000061',
    'authenticated', 'authenticated', 'rls.owner.adminlogs@example.com',
    crypt('password123', gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"first_name":"Owner","last_name":"AdminLogs"}'::jsonb,
    now(), now(), '', '', '', ''
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'aaaaaaaa-0000-0000-0000-000000000062',
    'authenticated', 'authenticated', 'rls.hood.adminlogs@example.com',
    crypt('password123', gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"first_name":"Hood","last_name":"AdminLogs"}'::jsonb,
    now(), now(), '', '', '', ''
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'aaaaaaaa-0000-0000-0000-000000000063',
    'authenticated', 'authenticated', 'rls.complex.adminlogs@example.com',
    crypt('password123', gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"first_name":"Complex","last_name":"AdminLogs"}'::jsonb,
    now(), now(), '', '', '', ''
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'aaaaaaaa-0000-0000-0000-000000000064',
    'authenticated', 'authenticated', 'rls.other.adminlogs@example.com',
    crypt('password123', gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"first_name":"Other","last_name":"AdminLogs"}'::jsonb,
    now(), now(), '', '', '', ''
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'aaaaaaaa-0000-0000-0000-000000000065',
    'authenticated', 'authenticated', 'rls.guard.adminlogs@example.com',
    crypt('password123', gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"first_name":"Guard","last_name":"AdminLogs"}'::jsonb,
    now(), now(), '', '', '', ''
  );

insert into public.complexes (id, name)
values
  ('bbbbbbbb-0000-0000-0000-000000000401', 'Admin Logs Complex'),
  ('bbbbbbbb-0000-0000-0000-000000000402', 'Other Complex');

insert into public.neighborhoods (id, complex_id, name)
values
  ('bbbbbbbb-0000-0000-0000-000000000411', 'bbbbbbbb-0000-0000-0000-000000000401', 'Admin Logs Hood'),
  ('bbbbbbbb-0000-0000-0000-000000000412', 'bbbbbbbb-0000-0000-0000-000000000402', 'Other Hood');

insert into public.properties (id, neighborhood_id, lot_number)
values
  ('bbbbbbbb-0000-0000-0000-000000000421', 'bbbbbbbb-0000-0000-0000-000000000411', 'L1'),
  ('bbbbbbbb-0000-0000-0000-000000000422', 'bbbbbbbb-0000-0000-0000-000000000412', 'X1');

insert into public.gates (id, complex_id, neighborhood_id, name, type)
values (
  'bbbbbbbb-0000-0000-0000-000000000431',
  'bbbbbbbb-0000-0000-0000-000000000401',
  null,
  'Admin Logs Main',
  'MAIN_COMPLEX'
);

insert into public.user_roles (user_id, role, complex_id, neighborhood_id, property_id)
values
  ('aaaaaaaa-0000-0000-0000-000000000061', 'OWNER', null, null, 'bbbbbbbb-0000-0000-0000-000000000421'),
  ('aaaaaaaa-0000-0000-0000-000000000062', 'NEIGHBORHOOD_ADMIN', null, 'bbbbbbbb-0000-0000-0000-000000000411', null),
  ('aaaaaaaa-0000-0000-0000-000000000063', 'COMPLEX_ADMIN', 'bbbbbbbb-0000-0000-0000-000000000401', null, null),
  ('aaaaaaaa-0000-0000-0000-000000000064', 'NEIGHBORHOOD_ADMIN', null, 'bbbbbbbb-0000-0000-0000-000000000412', null),
  ('aaaaaaaa-0000-0000-0000-000000000065', 'SECURITY', null, null, null);

insert into public.access_logs (
  profile_id, property_id, gate_id, security_user_id, action_type
)
values (
  'aaaaaaaa-0000-0000-0000-000000000061',
  'bbbbbbbb-0000-0000-0000-000000000421',
  'bbbbbbbb-0000-0000-0000-000000000431',
  'aaaaaaaa-0000-0000-0000-000000000065',
  'IN_COMPLEX'
);

select set_config('request.jwt.claim.sub', 'aaaaaaaa-0000-0000-0000-000000000062', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config(
  'request.jwt.claims',
  '{"sub":"aaaaaaaa-0000-0000-0000-000000000062","role":"authenticated","aud":"authenticated"}',
  true
);
set local role authenticated;

select is(
  (select count(*)::integer from public.access_logs where profile_id = 'aaaaaaaa-0000-0000-0000-000000000061'),
  1,
  'NEIGHBORHOOD_ADMIN sees owner access logs in their barrio'
);

reset role;
select set_config('request.jwt.claim.sub', 'aaaaaaaa-0000-0000-0000-000000000063', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config(
  'request.jwt.claims',
  '{"sub":"aaaaaaaa-0000-0000-0000-000000000063","role":"authenticated","aud":"authenticated"}',
  true
);
set local role authenticated;

select is(
  (select count(*)::integer from public.access_logs where profile_id = 'aaaaaaaa-0000-0000-0000-000000000061'),
  1,
  'COMPLEX_ADMIN sees owner access logs in child neighborhoods'
);

select is(
  (select count(*)::integer from public.profiles where id = 'aaaaaaaa-0000-0000-0000-000000000061'),
  1,
  'COMPLEX_ADMIN can read owner profile for movement detail'
);

reset role;
select set_config('request.jwt.claim.sub', 'aaaaaaaa-0000-0000-0000-000000000064', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config(
  'request.jwt.claims',
  '{"sub":"aaaaaaaa-0000-0000-0000-000000000064","role":"authenticated","aud":"authenticated"}',
  true
);
set local role authenticated;

select is(
  (select count(*)::integer from public.access_logs where profile_id = 'aaaaaaaa-0000-0000-0000-000000000061'),
  0,
  'NEIGHBORHOOD_ADMIN of another barrio cannot see those owner logs'
);

select * from finish();
rollback;
