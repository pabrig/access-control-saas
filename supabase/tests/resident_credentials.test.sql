begin;
select plan(4);

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at, confirmation_token, email_change,
  email_change_token_new, recovery_token
)
values (
  '00000000-0000-0000-0000-000000000000',
  'aaaaaaaa-0000-0000-0000-000000000051',
  'authenticated', 'authenticated', 'rls.resident.cred@example.com',
  crypt('password123', gen_salt('bf')), now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"first_name":"Res","last_name":"Cred"}'::jsonb,
  now(), now(), '', '', '', ''
);

insert into public.complexes (id, name)
values ('bbbbbbbb-0000-0000-0000-000000000301', 'Resident Cred Complex');

insert into public.neighborhoods (id, complex_id, name)
values ('bbbbbbbb-0000-0000-0000-000000000311', 'bbbbbbbb-0000-0000-0000-000000000301', 'Resident Cred Hood');

insert into public.properties (id, neighborhood_id, lot_number)
values ('bbbbbbbb-0000-0000-0000-000000000321', 'bbbbbbbb-0000-0000-0000-000000000311', 'R1');

insert into public.user_roles (user_id, role, property_id, complex_id, neighborhood_id)
values ('aaaaaaaa-0000-0000-0000-000000000051', 'OWNER', 'bbbbbbbb-0000-0000-0000-000000000321', null, null);

select isnt(
  (select qr_token from public.resident_credentials where profile_id = 'aaaaaaaa-0000-0000-0000-000000000051'),
  null,
  'OWNER role auto-creates resident credential'
);

select set_config('request.jwt.claim.sub', 'aaaaaaaa-0000-0000-0000-000000000051', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config(
  'request.jwt.claims',
  '{"sub":"aaaaaaaa-0000-0000-0000-000000000051","role":"authenticated","aud":"authenticated"}',
  true
);
set local role authenticated;

select lives_ok(
  $$ update public.profiles set dni = '30111222' where id = 'aaaaaaaa-0000-0000-0000-000000000051' $$,
  'OWNER can update own DNI'
);

select lives_ok(
  $$ insert into public.resident_vehicles (
       credential_id, plate_normalized, plate_display, plate_format
     ) select id, 'ABC123', 'ABC 123', 'AR_OLD'::public.plate_format
       from public.resident_credentials
       where profile_id = 'aaaaaaaa-0000-0000-0000-000000000051' $$,
  'OWNER can add a resident vehicle'
);

select is(
  (select count(*)::integer from public.resident_vehicles rv
     join public.resident_credentials rc on rc.id = rv.credential_id
     where rc.profile_id = 'aaaaaaaa-0000-0000-0000-000000000051'),
  1,
  'resident vehicle is stored on credential'
);

select * from finish();
rollback;
