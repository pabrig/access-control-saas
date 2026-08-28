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
    'authenticated', 'authenticated', 'indep.nadmin@example.com',
    crypt('password123', gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"first_name":"Indep","last_name":"Nadmin"}'::jsonb,
    now(), now(), '', '', '', ''
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'aaaaaaaa-0000-0000-0000-000000000042',
    'authenticated', 'authenticated', 'nested.nadmin@example.com',
    crypt('password123', gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"first_name":"Nested","last_name":"Nadmin"}'::jsonb,
    now(), now(), '', '', '', ''
  );

insert into public.complexes (id, name)
values ('bbbbbbbb-0000-0000-0000-000000000401', 'Nested Complex');

insert into public.neighborhoods (id, complex_id, name)
values
  (
    'bbbbbbbb-0000-0000-0000-000000000411',
    null,
    'Independent Barrio'
  ),
  (
    'bbbbbbbb-0000-0000-0000-000000000412',
    'bbbbbbbb-0000-0000-0000-000000000401',
    'Nested Barrio'
  );

insert into public.properties (id, neighborhood_id, lot_number)
values (
  'bbbbbbbb-0000-0000-0000-000000000421',
  'bbbbbbbb-0000-0000-0000-000000000411',
  '1'
);

insert into public.user_roles (user_id, role, neighborhood_id)
values
  (
    'aaaaaaaa-0000-0000-0000-000000000041',
    'NEIGHBORHOOD_ADMIN',
    'bbbbbbbb-0000-0000-0000-000000000411'
  ),
  (
    'aaaaaaaa-0000-0000-0000-000000000042',
    'NEIGHBORHOOD_ADMIN',
    'bbbbbbbb-0000-0000-0000-000000000412'
  );

select set_config('request.jwt.claim.sub', 'aaaaaaaa-0000-0000-0000-000000000041', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config(
  'request.jwt.claims',
  '{"sub":"aaaaaaaa-0000-0000-0000-000000000041","role":"authenticated","aud":"authenticated"}',
  true
);
set local role authenticated;

select lives_ok(
  $$ select public.admin_create_person(
       'indep.guard@example.com',
       'password123',
       'Gina',
       'Guardia',
       'SECURITY',
       null,
       null,
       null
     ) $$,
  'independent NEIGHBORHOOD_ADMIN can create SECURITY'
);

select lives_ok(
  $$ insert into public.gates (name, type, neighborhood_id)
     values (
       'Puerta del barrio',
       'INTERNAL_NEIGHBORHOOD',
       'bbbbbbbb-0000-0000-0000-000000000411'
     ) $$,
  'independent NEIGHBORHOOD_ADMIN can create a barrio gate'
);

select throws_ok(
  $$ select public.admin_create_person(
       'indep.super@example.com',
       'password123',
       'No',
       'Super',
       'SUPERADMIN',
       null,
       null,
       null
     ) $$,
  '42501',
  null,
  'independent NEIGHBORHOOD_ADMIN cannot create SUPERADMIN'
);

reset role;
select set_config('request.jwt.claim.sub', 'aaaaaaaa-0000-0000-0000-000000000042', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config(
  'request.jwt.claims',
  '{"sub":"aaaaaaaa-0000-0000-0000-000000000042","role":"authenticated","aud":"authenticated"}',
  true
);
set local role authenticated;

select lives_ok(
  $$ select public.admin_create_person(
       'nested.guard@example.com',
       'password123',
       'Nestor',
       'Guardia',
       'SECURITY',
       null,
       null,
       null
     ) $$,
  'NEIGHBORHOOD_ADMIN inside a complex can create SECURITY'
);

select lives_ok(
  $$ insert into public.gates (name, type, neighborhood_id)
     values (
       'Barrera interna',
       'INTERNAL_NEIGHBORHOOD',
       'bbbbbbbb-0000-0000-0000-000000000412'
     ) $$,
  'NEIGHBORHOOD_ADMIN inside a complex can still create an internal gate'
);

select * from finish();
rollback;
