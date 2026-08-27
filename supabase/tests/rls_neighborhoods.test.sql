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
    'aaaaaaaa-0000-0000-0000-000000000011',
    'authenticated', 'authenticated', 'rls.nadmin@example.com',
    crypt('password123', gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"first_name":"Rls","last_name":"NAdmin"}'::jsonb,
    now(), now(), '', '', '', ''
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'aaaaaaaa-0000-0000-0000-000000000012',
    'authenticated', 'authenticated', 'rls.cadmintwo@example.com',
    crypt('password123', gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"first_name":"Rls","last_name":"CAdmin"}'::jsonb,
    now(), now(), '', '', '', ''
  );

insert into public.complexes (id, name)
values ('bbbbbbbb-0000-0000-0000-000000000101', 'RLS Complex N');

insert into public.neighborhoods (id, complex_id, name)
values (
  'bbbbbbbb-0000-0000-0000-000000000111',
  'bbbbbbbb-0000-0000-0000-000000000101',
  'RLS Neighborhood N'
);

insert into public.user_roles (user_id, role, complex_id, neighborhood_id, property_id)
values
  (
    'aaaaaaaa-0000-0000-0000-000000000011',
    'NEIGHBORHOOD_ADMIN',
    null,
    'bbbbbbbb-0000-0000-0000-000000000111',
    null
  ),
  (
    'aaaaaaaa-0000-0000-0000-000000000012',
    'COMPLEX_ADMIN',
    'bbbbbbbb-0000-0000-0000-000000000101',
    null,
    null
  );

select set_config('request.jwt.claim.sub', 'aaaaaaaa-0000-0000-0000-000000000011', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config(
  'request.jwt.claims',
  '{"sub":"aaaaaaaa-0000-0000-0000-000000000011","role":"authenticated","aud":"authenticated"}',
  true
);
set local role authenticated;

select throws_ok(
  $$ insert into public.neighborhoods (name, complex_id)
     values (
       'Should fail',
       'bbbbbbbb-0000-0000-0000-000000000101'
     ) $$,
  '42501',
  null,
  'NEIGHBORHOOD_ADMIN cannot create a neighborhood'
);

reset role;
select set_config('request.jwt.claim.sub', 'aaaaaaaa-0000-0000-0000-000000000012', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config(
  'request.jwt.claims',
  '{"sub":"aaaaaaaa-0000-0000-0000-000000000012","role":"authenticated","aud":"authenticated"}',
  true
);
set local role authenticated;

select lives_ok(
  $$ insert into public.neighborhoods (id, name, complex_id)
     values (
       'bbbbbbbb-0000-0000-0000-000000000112',
       'Second barrio',
       'bbbbbbbb-0000-0000-0000-000000000101'
     ) $$,
  'COMPLEX_ADMIN can create a neighborhood in their complex'
);

select lives_ok(
  $$ insert into public.neighborhoods (id, name, complex_id)
     values (
       'bbbbbbbb-0000-0000-0000-000000000113',
       'Third barrio',
       'bbbbbbbb-0000-0000-0000-000000000101'
     ) $$,
  'COMPLEX_ADMIN can create more than one neighborhood in their complex'
);

select is(
  (
    select count(*)::integer from public.neighborhoods
    where complex_id = 'bbbbbbbb-0000-0000-0000-000000000101'
  ),
  3,
  'COMPLEX_ADMIN sees all neighborhoods of their complex'
);

select * from finish();
rollback;
