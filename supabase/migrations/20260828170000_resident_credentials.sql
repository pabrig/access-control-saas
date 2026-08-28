-- Permanent resident credentials, vehicles, and co-owner invites.

alter table public.profiles
  add column if not exists dni text;

create index if not exists profiles_dni_idx
  on public.profiles (dni)
  where dni is not null;

do $$ begin
  create type public.resident_invite_status as enum ('PENDING', 'ACCEPTED', 'REVOKED');
exception
  when duplicate_object then null;
end $$;

create table if not exists public.resident_credentials (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  property_id uuid not null references public.properties (id) on delete cascade,
  qr_token uuid not null default gen_random_uuid(),
  is_revoked boolean not null default false,
  created_at timestamptz not null default now(),
  unique (profile_id, property_id),
  unique (qr_token)
);

create index if not exists resident_credentials_property_id_idx
  on public.resident_credentials (property_id);

create index if not exists resident_credentials_profile_id_idx
  on public.resident_credentials (profile_id);

create table if not exists public.resident_vehicles (
  id uuid primary key default gen_random_uuid(),
  credential_id uuid not null references public.resident_credentials (id) on delete cascade,
  plate_normalized text not null,
  plate_display text not null,
  plate_format public.plate_format not null,
  color text,
  created_at timestamptz not null default now(),
  constraint resident_vehicles_plate_normalized_chk check (
    plate_normalized ~ '^[A-Z]{3}[0-9]{3}$'
    or plate_normalized ~ '^[A-Z]{2}[0-9]{3}[A-Z]{2}$'
  ),
  unique (credential_id, plate_normalized)
);

create index if not exists resident_vehicles_credential_id_idx
  on public.resident_vehicles (credential_id);

alter table public.access_logs
  add column if not exists resident_vehicle_id uuid
    references public.resident_vehicles (id) on delete set null;

create index if not exists access_logs_resident_vehicle_id_idx
  on public.access_logs (resident_vehicle_id);

create table if not exists public.resident_invites (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties (id) on delete cascade,
  invited_by_user_id uuid not null references public.profiles (id) on delete restrict,
  share_token uuid not null default gen_random_uuid(),
  invitee_dni text,
  invitee_email text,
  status public.resident_invite_status not null default 'PENDING',
  expires_at timestamptz not null default (now() + interval '14 days'),
  accepted_by_user_id uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  unique (share_token)
);

create index if not exists resident_invites_property_id_idx
  on public.resident_invites (property_id);

create or replace function public.ensure_resident_credential(
  p_profile_id uuid,
  p_property_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_token uuid;
begin
  insert into public.resident_credentials (profile_id, property_id)
  values (p_profile_id, p_property_id)
  on conflict (profile_id, property_id) do nothing;

  select qr_token into v_token
  from public.resident_credentials
  where profile_id = p_profile_id
    and property_id = p_property_id;

  return v_token;
end;
$$;

revoke all on function public.ensure_resident_credential(uuid, uuid) from public, anon;
grant execute on function public.ensure_resident_credential(uuid, uuid)
  to authenticated, service_role;

create or replace function public.sync_resident_credential_on_owner_role()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role = 'OWNER' and new.property_id is not null then
    perform public.ensure_resident_credential(new.user_id, new.property_id);
  end if;
  return new;
end;
$$;

drop trigger if exists user_roles_resident_credential on public.user_roles;
create trigger user_roles_resident_credential
  after insert on public.user_roles
  for each row execute function public.sync_resident_credential_on_owner_role();

insert into public.resident_credentials (profile_id, property_id)
select ur.user_id, ur.property_id
from public.user_roles ur
where ur.role = 'OWNER'
  and ur.property_id is not null
on conflict (profile_id, property_id) do nothing;

create or replace function public.create_resident_invite(
  p_property_id uuid,
  p_invitee_dni text default null,
  p_invitee_email text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_share uuid;
  v_dni text;
  v_email text;
begin
  if auth.uid() is null then
    raise exception 'Tenés que estar autenticado'
      using errcode = '42501';
  end if;

  if p_property_id is null or p_property_id not in (select public.owned_property_ids()) then
    raise exception 'No podés invitar co-propietarios en ese lote'
      using errcode = '42501';
  end if;

  v_dni := nullif(trim(coalesce(p_invitee_dni, '')), '');
  v_email := nullif(lower(trim(coalesce(p_invitee_email, ''))), '');

  insert into public.resident_invites (
    property_id,
    invited_by_user_id,
    invitee_dni,
    invitee_email
  )
  values (
    p_property_id,
    auth.uid(),
    v_dni,
    v_email
  )
  returning share_token into v_share;

  return v_share;
end;
$$;

revoke all on function public.create_resident_invite(uuid, text, text) from public, anon;
grant execute on function public.create_resident_invite(uuid, text, text) to authenticated;

create or replace function public.preview_resident_invite(p_share uuid)
returns table (
  status public.resident_invite_status,
  expires_at timestamptz,
  lot_number text,
  street_name text,
  neighborhood_name text,
  invitee_dni text,
  invitee_email text,
  inviter_name text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    ri.status,
    ri.expires_at,
    p.lot_number,
    p.street_name,
    n.name as neighborhood_name,
    ri.invitee_dni,
    ri.invitee_email,
    trim(pr.first_name || ' ' || pr.last_name) as inviter_name
  from public.resident_invites ri
  join public.properties p on p.id = ri.property_id
  join public.neighborhoods n on n.id = p.neighborhood_id
  join public.profiles pr on pr.id = ri.invited_by_user_id
  where ri.share_token = p_share;
$$;

revoke all on function public.preview_resident_invite(uuid) from public;
grant execute on function public.preview_resident_invite(uuid) to anon, authenticated;

create or replace function public.claim_resident_invite(
  p_share uuid,
  p_email text,
  p_password text,
  p_first_name text,
  p_last_name text,
  p_dni text
)
returns table (
  user_id uuid,
  qr_token uuid
)
language plpgsql
security definer
set search_path = public, auth, extensions
as $$
declare
  inv public.resident_invites%rowtype;
  v_email text;
  v_first text;
  v_last text;
  v_dni text;
  v_id uuid;
  v_token uuid;
begin
  select * into inv
  from public.resident_invites ri
  where ri.share_token = p_share
  for update;

  if not found then
    raise exception 'Invitación no encontrada'
      using errcode = '22023';
  end if;

  if inv.status <> 'PENDING' then
    raise exception 'Esta invitación ya no está disponible'
      using errcode = '22023';
  end if;

  if inv.expires_at <= now() then
    raise exception 'La invitación venció'
      using errcode = '22023';
  end if;

  v_email := lower(trim(coalesce(p_email, '')));
  v_first := trim(coalesce(p_first_name, ''));
  v_last := trim(coalesce(p_last_name, ''));
  v_dni := nullif(trim(coalesce(p_dni, '')), '');

  if v_email = '' or v_email !~ '^[^@]+@[^@]+\.[^@]+$' then
    raise exception 'El email no es válido'
      using errcode = '22023';
  end if;

  if v_first = '' or v_last = '' then
    raise exception 'Nombre y apellido son obligatorios'
      using errcode = '22023';
  end if;

  if v_dni is null then
    raise exception 'El DNI es obligatorio'
      using errcode = '22023';
  end if;

  if inv.invitee_dni is not null and inv.invitee_dni <> v_dni then
    raise exception 'El DNI no coincide con la invitación'
      using errcode = '22023';
  end if;

  if inv.invitee_email is not null and lower(inv.invitee_email) <> v_email then
    raise exception 'El email no coincide con la invitación'
      using errcode = '22023';
  end if;

  if auth.uid() is not null then
    v_id := auth.uid();

    update public.profiles
    set
      first_name = v_first,
      last_name = v_last,
      dni = v_dni,
      email = v_email
    where id = v_id;
  else
    if char_length(coalesce(p_password, '')) < 8 then
      raise exception 'La contraseña tiene que tener al menos 8 caracteres'
        using errcode = '22023';
    end if;

    if exists (select 1 from auth.users u where lower(u.email) = v_email) then
      raise exception 'Ya existe una cuenta con ese email. Iniciá sesión y volvé a abrir el link.'
        using errcode = '23505';
    end if;

    v_id := gen_random_uuid();

    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at, confirmation_token, email_change,
      email_change_token_new, recovery_token
    )
    values (
      '00000000-0000-0000-0000-000000000000',
      v_id,
      'authenticated',
      'authenticated',
      v_email,
      crypt(p_password, gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      jsonb_build_object('first_name', v_first, 'last_name', v_last),
      now(),
      now(),
      '', '', '', ''
    );

    insert into auth.identities (
      id, user_id, identity_data, provider, provider_id,
      last_sign_in_at, created_at, updated_at
    )
    values (
      gen_random_uuid(),
      v_id,
      jsonb_build_object('sub', v_id::text, 'email', v_email),
      'email',
      v_id::text,
      now(),
      now(),
      now()
    );

    update public.profiles
    set dni = v_dni, email = v_email
    where id = v_id;
  end if;

  if exists (
    select 1 from public.user_roles ur
    where ur.user_id = v_id
      and ur.role = 'OWNER'
      and ur.property_id = inv.property_id
  ) then
    raise exception 'Ya sos propietario de este lote'
      using errcode = '23505';
  end if;

  insert into public.user_roles (user_id, role, property_id, complex_id, neighborhood_id)
  values (v_id, 'OWNER', inv.property_id, null, null);

  v_token := public.ensure_resident_credential(v_id, inv.property_id);

  update public.resident_invites
  set status = 'ACCEPTED', accepted_by_user_id = v_id
  where id = inv.id;

  return query select v_id, v_token;
end;
$$;

revoke all on function public.claim_resident_invite(uuid, text, text, text, text, text) from public;
grant execute on function public.claim_resident_invite(uuid, text, text, text, text, text)
  to anon, authenticated;

alter table public.resident_credentials enable row level security;
alter table public.resident_vehicles enable row level security;
alter table public.resident_invites enable row level security;

create policy resident_credentials_select on public.resident_credentials
  for select to authenticated
  using (
    public.is_superadmin()
    or profile_id = auth.uid()
    or property_id in (select public.owned_property_ids())
    or property_id in (
      select p.id from public.properties p
      where p.neighborhood_id in (select public.managed_neighborhood_ids())
    )
  );

create policy resident_credentials_update on public.resident_credentials
  for update to authenticated
  using (profile_id = auth.uid())
  with check (profile_id = auth.uid());

create policy resident_vehicles_select on public.resident_vehicles
  for select to authenticated
  using (
    credential_id in (
      select rc.id from public.resident_credentials rc
      where rc.profile_id = auth.uid()
         or rc.property_id in (select public.owned_property_ids())
         or rc.property_id in (
           select p.id from public.properties p
           where p.neighborhood_id in (select public.managed_neighborhood_ids())
         )
    )
    or public.is_superadmin()
  );

create policy resident_vehicles_insert on public.resident_vehicles
  for insert to authenticated
  with check (
    credential_id in (
      select rc.id from public.resident_credentials rc
      where rc.profile_id = auth.uid()
    )
  );

create policy resident_vehicles_delete on public.resident_vehicles
  for delete to authenticated
  using (
    credential_id in (
      select rc.id from public.resident_credentials rc
      where rc.profile_id = auth.uid()
    )
  );

create policy resident_invites_select on public.resident_invites
  for select to authenticated
  using (
    public.is_superadmin()
    or invited_by_user_id = auth.uid()
    or property_id in (select public.owned_property_ids())
    or property_id in (
      select p.id from public.properties p
      where p.neighborhood_id in (select public.managed_neighborhood_ids())
    )
  );

create policy resident_invites_update on public.resident_invites
  for update to authenticated
  using (
    property_id in (select public.owned_property_ids())
    or public.is_superadmin()
  )
  with check (
    property_id in (select public.owned_property_ids())
    or public.is_superadmin()
  );

grant select, insert, update, delete on public.resident_credentials to authenticated, service_role;
grant select, insert, update, delete on public.resident_vehicles to authenticated, service_role;
grant select, insert, update, delete on public.resident_invites to authenticated, service_role;
