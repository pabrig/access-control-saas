-- Owner authorizes a visit (share link). Guest completes data; QR is minted then.
-- Walk-up visits can be created READY with an immediate QR.

do $$ begin
  create type public.invitation_lifecycle as enum ('DRAFT', 'READY');
exception
  when duplicate_object then null;
end $$;

alter table public.invitations
  add column if not exists share_token uuid not null default gen_random_uuid(),
  add column if not exists status public.invitation_lifecycle not null default 'READY';

alter table public.invitations
  alter column guest_name drop not null,
  alter column qr_token drop not null;

alter table public.invitations
  alter column qr_token set default gen_random_uuid();

create unique index if not exists invitations_share_token_key
  on public.invitations (share_token);

alter table public.invitations
  drop constraint if exists invitations_lifecycle_chk;

alter table public.invitations
  add constraint invitations_lifecycle_chk check (
    (
      status = 'DRAFT'
      and qr_token is null
    )
    or (
      status = 'READY'
      and qr_token is not null
      and guest_name is not null
      and char_length(trim(guest_name)) > 0
    )
  );

create or replace function public.preview_invite(p_share uuid)
returns table (
  status public.invitation_lifecycle,
  is_revoked boolean,
  valid_from timestamptz,
  valid_to timestamptz,
  lot_number text,
  street_name text,
  guest_name text,
  qr_token uuid
)
language sql
stable
security definer
set search_path = public
as $$
  select
    i.status,
    i.is_revoked,
    i.valid_from,
    i.valid_to,
    p.lot_number,
    p.street_name,
    i.guest_name,
    case when i.status = 'READY' then i.qr_token else null end
  from public.invitations i
  join public.properties p on p.id = i.property_id
  where i.share_token = p_share;
$$;

create or replace function public.claim_invite(
  p_share uuid,
  p_guest_name text,
  p_guest_dni text,
  p_vehicles jsonb
)
returns table (
  qr_token uuid,
  guest_name text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  inv public.invitations%rowtype;
  vehicle jsonb;
  passenger jsonb;
  vehicle_id uuid;
  minted uuid;
  plate_normalized text;
  plate_display text;
  plate_format public.plate_format;
  guest text;
begin
  guest := trim(coalesce(p_guest_name, ''));
  if guest = '' then
    raise exception 'El invitado tiene que poner su nombre'
      using errcode = '22023';
  end if;

  select * into inv
  from public.invitations
  where share_token = p_share
  for update;

  if not found then
    raise exception 'La invitación no existe'
      using errcode = 'P0002';
  end if;

  if inv.is_revoked then
    raise exception 'Esta invitación fue revocada'
      using errcode = 'P0001';
  end if;

  if inv.valid_to <= now() then
    raise exception 'Esta invitación ya venció'
      using errcode = 'P0001';
  end if;

  if inv.status = 'READY' then
    raise exception 'Esta invitación ya tiene un pase'
      using errcode = 'P0001';
  end if;

  minted := gen_random_uuid();

  update public.invitations
  set
    guest_name = guest,
    guest_dni = nullif(trim(coalesce(p_guest_dni, '')), ''),
    qr_token = minted,
    status = 'READY'
  where id = inv.id;

  delete from public.invitation_vehicles where invitation_id = inv.id;

  for vehicle in
    select value from jsonb_array_elements(coalesce(p_vehicles, '[]'::jsonb))
  loop
    plate_normalized := upper(trim(coalesce(vehicle->>'plate_normalized', '')));
    plate_display := trim(coalesce(vehicle->>'plate_display', plate_normalized));

    if plate_normalized ~ '^[A-Z]{3}[0-9]{3}$' then
      plate_format := 'AR_OLD';
    elsif plate_normalized ~ '^[A-Z]{2}[0-9]{3}[A-Z]{2}$' then
      plate_format := 'AR_MERCOSUR';
    else
      raise exception 'La patente no es AAA 000 ni AA000AA'
        using errcode = '22023';
    end if;

    insert into public.invitation_vehicles (
      invitation_id,
      plate_normalized,
      plate_display,
      plate_format,
      color
    )
    values (
      inv.id,
      plate_normalized,
      plate_display,
      plate_format,
      nullif(trim(coalesce(vehicle->>'color', '')), '')
    )
    returning id into vehicle_id;

    if coalesce(jsonb_array_length(vehicle->'passengers'), 0) = 0 then
      raise exception 'Cada auto necesita al menos un pasajero'
        using errcode = '22023';
    end if;

    for passenger in
      select value from jsonb_array_elements(coalesce(vehicle->'passengers', '[]'::jsonb))
    loop
      if trim(coalesce(passenger->>'full_name', '')) = '' then
        continue;
      end if;

      insert into public.invitation_passengers (
        invitation_id,
        vehicle_id,
        full_name,
        dni,
        is_driver
      )
      values (
        inv.id,
        vehicle_id,
        trim(coalesce(passenger->>'full_name', '')),
        nullif(trim(coalesce(passenger->>'dni', '')), ''),
        coalesce((passenger->>'is_driver')::boolean, false)
      );
    end loop;
  end loop;

  return query select minted, guest;
end;
$$;

revoke all on function public.preview_invite(uuid) from public;
revoke all on function public.claim_invite(uuid, text, text, jsonb) from public;

grant usage on schema public to anon;
grant execute on function public.preview_invite(uuid) to anon, authenticated, service_role;
grant execute on function public.claim_invite(uuid, text, text, jsonb) to anon, authenticated, service_role;
