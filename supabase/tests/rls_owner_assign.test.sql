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
    'aaaaaaaa-0000-0000-0000-000000000021',
    'authenticated', 'authenticated', 'rls.nadmin2@example.com',
    crypt('password123', gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"first_name":"Rls","last_name":"NAdmin2"}'::jsonb,
    now(), now(), '', '', '', ''
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'aaaaaaaa-0000-0000-0000-000000000022',
    'authenticated', 'authenticated', 'rls.ownerassign@example.com',
    crypt('password123', gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"first_name":"Rls","last_name":"Owner"}'::jsonb,
    now(), now(), '', '', '', ''
  );

insert into public.neighborhoods (id, name)
values
  ('bbbbbbbb-0000-0000-0000-000000000211', 'RLS Barrio Assign'),
  ('bbbbbbbb-0000-0000-0000-000000000212', 'RLS Other Barrio');

insert into public.properties (id, neighborhood_id, lot_number)
values
  (
    'bbbbbbbb-0000-0000-0000-000000000221',
    'bbbbbbbb-0000-0000-0000-000000000211',
    '10'
  ),
  (
    'bbbbbbbb-0000-0000-0000-000000000222',
    'bbbbbbbb-0000-0000-0000-000000000212',
    '99'
  );

insert into public.user_roles (user_id, role, neighborhood_id)
values (
  'aaaaaaaa-0000-0000-0000-000000000021',
  'NEIGHBORHOOD_ADMIN',
  'bbbbbbbb-0000-0000-0000-000000000211'
);

select set_config('request.jwt.claim.sub', 'aaaaaaaa-0000-0000-0000-000000000021', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config(
  'request.jwt.claims',
  '{"sub":"aaaaaaaa-0000-0000-0000-000000000021","role":"authenticated","aud":"authenticated"}',
  true
);
set local role authenticated;

select lives_ok(
  $$ insert into public.user_roles (user_id, role, property_id)
     values (
       'aaaaaaaa-0000-0000-0000-000000000022',
       'OWNER',
       'bbbbbbbb-0000-0000-0000-000000000221'
     ) $$,
  'NEIGHBORHOOD_ADMIN can assign OWNER on a lot in their barrio'
);

select throws_ok(
  $$ insert into public.user_roles (user_id, role, property_id)
     values (
       'aaaaaaaa-0000-0000-0000-000000000022',
       'OWNER',
       'bbbbbbbb-0000-0000-0000-000000000222'
     ) $$,
  '42501',
  null,
  'NEIGHBORHOOD_ADMIN cannot assign OWNER on another barrio'
);

select throws_ok(
  $$ insert into public.user_roles (user_id, role, neighborhood_id)
     values (
       'aaaaaaaa-0000-0000-0000-000000000022',
       'NEIGHBORHOOD_ADMIN',
       'bbbbbbbb-0000-0000-0000-000000000211'
     ) $$,
  '42501',
  null,
  'NEIGHBORHOOD_ADMIN cannot assign admin roles'
);

select lives_ok(
  $$ update public.properties
     set phone = '1155550100', notes = 'Frente al SUM', block_name = 'A'
     where id = 'bbbbbbbb-0000-0000-0000-000000000221' $$,
  'NEIGHBORHOOD_ADMIN can update lot contact fields'
);

select * from finish();
rollback;
