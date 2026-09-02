begin;
select plan(12);

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
    'authenticated', 'authenticated', 'crud.nadmin@example.com',
    crypt('password123', gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"first_name":"Nadmin","last_name":"Crud"}'::jsonb,
    now(), now(), '', '', '', ''
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'aaaaaaaa-0000-0000-0000-000000000032',
    'authenticated', 'authenticated', 'crud.cadmintwo@example.com',
    crypt('password123', gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"first_name":"Cadmin","last_name":"Crud"}'::jsonb,
    now(), now(), '', '', '', ''
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'aaaaaaaa-0000-0000-0000-000000000033',
    'authenticated', 'authenticated', 'crud.otherowner@example.com',
    crypt('password123', gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"first_name":"Other","last_name":"Owner"}'::jsonb,
    now(), now(), '', '', '', ''
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'aaaaaaaa-0000-0000-0000-000000000034',
    'authenticated', 'authenticated', 'crud.plainowner@example.com',
    crypt('password123', gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"first_name":"Plain","last_name":"Owner"}'::jsonb,
    now(), now(), '', '', '', ''
  );

insert into public.complexes (id, name)
values ('bbbbbbbb-0000-0000-0000-000000000301', 'CRUD Complex');

insert into public.neighborhoods (id, complex_id, name)
values
  (
    'bbbbbbbb-0000-0000-0000-000000000311',
    'bbbbbbbb-0000-0000-0000-000000000301',
    'CRUD Barrio'
  ),
  (
    'bbbbbbbb-0000-0000-0000-000000000312',
    'bbbbbbbb-0000-0000-0000-000000000301',
    'CRUD Other Barrio'
  );

insert into public.properties (id, neighborhood_id, lot_number)
values
  (
    'bbbbbbbb-0000-0000-0000-000000000321',
    'bbbbbbbb-0000-0000-0000-000000000311',
    '10'
  ),
  (
    'bbbbbbbb-0000-0000-0000-000000000322',
    'bbbbbbbb-0000-0000-0000-000000000312',
    '99'
  );

insert into public.user_roles (user_id, role, complex_id, neighborhood_id, property_id)
values
  (
    'aaaaaaaa-0000-0000-0000-000000000031',
    'NEIGHBORHOOD_ADMIN',
    null,
    'bbbbbbbb-0000-0000-0000-000000000311',
    null
  ),
  (
    'aaaaaaaa-0000-0000-0000-000000000032',
    'COMPLEX_ADMIN',
    'bbbbbbbb-0000-0000-0000-000000000301',
    null,
    null
  ),
  (
    'aaaaaaaa-0000-0000-0000-000000000033',
    'OWNER',
    null,
    null,
    'bbbbbbbb-0000-0000-0000-000000000322'
  ),
  (
    'aaaaaaaa-0000-0000-0000-000000000034',
    'OWNER',
    null,
    null,
    'bbbbbbbb-0000-0000-0000-000000000321'
  );

select set_config('request.jwt.claim.sub', 'aaaaaaaa-0000-0000-0000-000000000031', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config(
  'request.jwt.claims',
  '{"sub":"aaaaaaaa-0000-0000-0000-000000000031","role":"authenticated","aud":"authenticated"}',
  true
);
set local role authenticated;

select lives_ok(
  $$ select public.admin_create_person(
       'crud.newowner@example.com',
       'password123',
       'Ana',
       'Lote',
       '30123456',
       'OWNER',
       null,
       null,
       'bbbbbbbb-0000-0000-0000-000000000321'
     ) $$,
  'NEIGHBORHOOD_ADMIN can create an OWNER on a lot in their barrio'
);

select is(
  (select first_name from public.profiles where email = 'crud.newowner@example.com'),
  'Ana',
  'created owner profile is visible to neighborhood admin'
);

select is(
  (
    select ur.role::text
    from public.user_roles ur
    join public.profiles p on p.id = ur.user_id
    where p.email = 'crud.newowner@example.com'
  ),
  'OWNER',
  'created owner has OWNER on the lot'
);

select throws_ok(
  $$ select public.admin_create_person(
       'crud.out@example.com',
       'password123',
       'Fuera',
       'Barrio',
       '30123457',
       'OWNER',
       null,
       null,
       'bbbbbbbb-0000-0000-0000-000000000322'
     ) $$,
  '42501',
  null,
  'NEIGHBORHOOD_ADMIN cannot create an OWNER on another barrio'
);

select lives_ok(
  $$ select public.admin_create_person(
       'crud.guard@example.com',
       'password123',
       'Sofia',
       'Guardia',
       '30123458',
       'SECURITY',
       null,
       null,
       null
     ) $$,
  'NEIGHBORHOOD_ADMIN can create SECURITY'
);

select lives_ok(
  $$ update public.profiles
     set first_name = 'Anita'
     where email = 'crud.newowner@example.com' $$,
  'NEIGHBORHOOD_ADMIN can update a resident in their barrio'
);

select is(
  (select first_name from public.profiles where email = 'crud.newowner@example.com'),
  'Anita',
  'resident name change is visible'
);

update public.profiles
set first_name = 'Hacked'
where id = 'aaaaaaaa-0000-0000-0000-000000000033';

reset role;
select is(
  (
    select first_name
    from public.profiles
    where id = 'aaaaaaaa-0000-0000-0000-000000000033'
  ),
  'Other',
  'NEIGHBORHOOD_ADMIN cannot update people outside their barrio'
);

select set_config('request.jwt.claim.sub', 'aaaaaaaa-0000-0000-0000-000000000032', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config(
  'request.jwt.claims',
  '{"sub":"aaaaaaaa-0000-0000-0000-000000000032","role":"authenticated","aud":"authenticated"}',
  true
);
set local role authenticated;

select lives_ok(
  $$ select public.admin_create_person(
       'crud.newnadmin@example.com',
       'password123',
       'Nora',
       'Barrio',
       '30123459',
       'NEIGHBORHOOD_ADMIN',
       null,
       'bbbbbbbb-0000-0000-0000-000000000311',
       null
     ) $$,
  'COMPLEX_ADMIN can create a neighborhood admin in their complex'
);

select lives_ok(
  $$ select public.admin_create_person(
       'crud.newsecurity@example.com',
       'password123',
       'Saul',
       'Guardia',
       '30123460',
       'SECURITY',
       null,
       null,
       null
     ) $$,
  'COMPLEX_ADMIN can create SECURITY'
);

select throws_ok(
  $$ select public.admin_create_person(
       'crud.newsuper@example.com',
       'password123',
       'Super',
       'No',
       '30123461',
       'SUPERADMIN',
       null,
       null,
       null
     ) $$,
  '42501',
  null,
  'COMPLEX_ADMIN cannot create SUPERADMIN'
);

reset role;
select set_config('request.jwt.claim.sub', 'aaaaaaaa-0000-0000-0000-000000000034', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config(
  'request.jwt.claims',
  '{"sub":"aaaaaaaa-0000-0000-0000-000000000034","role":"authenticated","aud":"authenticated"}',
  true
);
set local role authenticated;

select throws_ok(
  $$ select public.admin_create_person(
       'crud.ownercreate@example.com',
       'password123',
       'No',
       'Puede',
       '30123462',
       'OWNER',
       null,
       null,
       'bbbbbbbb-0000-0000-0000-000000000321'
     ) $$,
  '42501',
  null,
  'OWNER cannot create people'
);

select * from finish();
rollback;
