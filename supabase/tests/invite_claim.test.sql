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
  'aaaaaaaa-0000-0000-0000-000000000021',
  'authenticated', 'authenticated', 'rls.claim.owner@example.com',
  crypt('password123', gen_salt('bf')), now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"first_name":"Claim","last_name":"Owner"}'::jsonb,
  now(), now(), '', '', '', ''
);

insert into public.neighborhoods (id, name)
values ('bbbbbbbb-0000-0000-0000-000000000211', 'Claim Hood');

insert into public.properties (id, neighborhood_id, lot_number)
values (
  'bbbbbbbb-0000-0000-0000-000000000221',
  'bbbbbbbb-0000-0000-0000-000000000211',
  'C1'
);

insert into public.user_roles (user_id, role, property_id)
values (
  'aaaaaaaa-0000-0000-0000-000000000021',
  'OWNER',
  'bbbbbbbb-0000-0000-0000-000000000221'
);

insert into public.invitations (
  id, neighborhood_id, property_id, created_by_user_id,
  share_token, status, qr_token, guest_name, valid_from, valid_to
)
values (
  'cccccccc-0000-0000-0000-000000000201',
  'bbbbbbbb-0000-0000-0000-000000000211',
  'bbbbbbbb-0000-0000-0000-000000000221',
  'aaaaaaaa-0000-0000-0000-000000000021',
  'dddddddd-0000-0000-0000-000000000201',
  'DRAFT',
  null,
  null,
  now() - interval '1 hour',
  now() + interval '1 day'
);

set local role anon;

select is(
  (select status::text from public.preview_invite('dddddddd-0000-0000-0000-000000000201')),
  'DRAFT',
  'anon can preview a share link as DRAFT'
);

select is(
  (select qr_token from public.preview_invite('dddddddd-0000-0000-0000-000000000201')),
  null,
  'DRAFT preview does not expose a barrier QR'
);

select lives_ok(
  $$ select * from public.claim_invite(
       'dddddddd-0000-0000-0000-000000000201',
       'Visitante Claim',
       '30111000',
       '[{"plate_normalized":"ABC123","plate_display":"ABC 123","color":"Rojo","passengers":[{"full_name":"Visitante Claim","dni":"30111000","is_driver":true}]}]'::jsonb
     ) $$,
  'guest can claim a draft invite'
);

select is(
  (select status::text from public.preview_invite('dddddddd-0000-0000-0000-000000000201')),
  'READY',
  'claimed invite is READY and shows a QR token'
);

select * from finish();
rollback;
