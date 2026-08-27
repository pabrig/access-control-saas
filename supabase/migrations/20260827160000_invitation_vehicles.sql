-- Vehicles and passengers on invitations (Argentine plates).
-- Owners load them on the pass; SECURITY reads them at the gate.

do $$ begin
  create type public.plate_format as enum ('AR_OLD', 'AR_MERCOSUR');
exception
  when duplicate_object then null;
end $$;

create table public.invitation_vehicles (
  id uuid primary key default gen_random_uuid(),
  invitation_id uuid not null references public.invitations (id) on delete cascade,
  plate_normalized text not null,
  plate_display text not null,
  plate_format public.plate_format not null,
  color text,
  created_at timestamptz not null default now(),
  constraint invitation_vehicles_plate_normalized_chk check (
    plate_normalized ~ '^[A-Z]{3}[0-9]{3}$'
    or plate_normalized ~ '^[A-Z]{2}[0-9]{3}[A-Z]{2}$'
  ),
  unique (invitation_id, plate_normalized)
);

create index invitation_vehicles_invitation_id_idx
  on public.invitation_vehicles (invitation_id);

create table public.invitation_passengers (
  id uuid primary key default gen_random_uuid(),
  invitation_id uuid not null references public.invitations (id) on delete cascade,
  vehicle_id uuid not null references public.invitation_vehicles (id) on delete cascade,
  full_name text not null,
  dni text,
  is_driver boolean not null default false,
  created_at timestamptz not null default now(),
  constraint invitation_passengers_name_chk check (char_length(trim(full_name)) > 0)
);

create index invitation_passengers_vehicle_id_idx
  on public.invitation_passengers (vehicle_id);

create unique index invitation_passengers_one_driver_idx
  on public.invitation_passengers (vehicle_id)
  where is_driver;

create or replace function public.passenger_matches_vehicle_invitation()
returns trigger
language plpgsql
as $$
begin
  if not exists (
    select 1
    from public.invitation_vehicles v
    where v.id = new.vehicle_id
      and v.invitation_id = new.invitation_id
  ) then
    raise exception 'passenger vehicle must belong to the same invitation';
  end if;
  return new;
end;
$$;

drop trigger if exists invitation_passengers_vehicle_invitation on public.invitation_passengers;
create trigger invitation_passengers_vehicle_invitation
  before insert or update on public.invitation_passengers
  for each row execute function public.passenger_matches_vehicle_invitation();

alter table public.access_logs
  add column if not exists vehicle_id uuid references public.invitation_vehicles (id) on delete set null;

create index if not exists access_logs_vehicle_id_idx on public.access_logs (vehicle_id);

grant select, insert, update, delete on public.invitation_vehicles to authenticated, service_role;
grant select, insert, update, delete on public.invitation_passengers to authenticated, service_role;

alter table public.invitation_vehicles enable row level security;
alter table public.invitation_passengers enable row level security;

create policy invitation_vehicles_select on public.invitation_vehicles
  for select to authenticated
  using (invitation_id in (select id from public.invitations));

create policy invitation_vehicles_insert on public.invitation_vehicles
  for insert to authenticated
  with check (
    public.is_superadmin()
    or invitation_id in (
      select i.id from public.invitations i
      where i.property_id in (select public.owned_property_ids())
         or i.neighborhood_id in (select public.managed_neighborhood_ids())
    )
  );

create policy invitation_vehicles_update on public.invitation_vehicles
  for update to authenticated
  using (
    public.is_superadmin()
    or invitation_id in (
      select i.id from public.invitations i
      where i.property_id in (select public.owned_property_ids())
         or i.neighborhood_id in (select public.managed_neighborhood_ids())
    )
  )
  with check (
    public.is_superadmin()
    or invitation_id in (
      select i.id from public.invitations i
      where i.property_id in (select public.owned_property_ids())
         or i.neighborhood_id in (select public.managed_neighborhood_ids())
    )
  );

create policy invitation_vehicles_delete on public.invitation_vehicles
  for delete to authenticated
  using (
    public.is_superadmin()
    or invitation_id in (
      select i.id from public.invitations i
      where i.property_id in (select public.owned_property_ids())
         or i.neighborhood_id in (select public.managed_neighborhood_ids())
    )
  );

create policy invitation_passengers_select on public.invitation_passengers
  for select to authenticated
  using (invitation_id in (select id from public.invitations));

create policy invitation_passengers_insert on public.invitation_passengers
  for insert to authenticated
  with check (
    public.is_superadmin()
    or invitation_id in (
      select i.id from public.invitations i
      where i.property_id in (select public.owned_property_ids())
         or i.neighborhood_id in (select public.managed_neighborhood_ids())
    )
  );

create policy invitation_passengers_update on public.invitation_passengers
  for update to authenticated
  using (
    public.is_superadmin()
    or invitation_id in (
      select i.id from public.invitations i
      where i.property_id in (select public.owned_property_ids())
         or i.neighborhood_id in (select public.managed_neighborhood_ids())
    )
  )
  with check (
    public.is_superadmin()
    or invitation_id in (
      select i.id from public.invitations i
      where i.property_id in (select public.owned_property_ids())
         or i.neighborhood_id in (select public.managed_neighborhood_ids())
    )
  );

create policy invitation_passengers_delete on public.invitation_passengers
  for delete to authenticated
  using (
    public.is_superadmin()
    or invitation_id in (
      select i.id from public.invitations i
      where i.property_id in (select public.owned_property_ids())
         or i.neighborhood_id in (select public.managed_neighborhood_ids())
    )
  );
