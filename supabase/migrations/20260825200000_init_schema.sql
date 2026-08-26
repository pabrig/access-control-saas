-- Domain schema for gated-community access control.
-- Identity lives in auth.users; public.profiles is the 1:1 application profile.

create extension if not exists "pgcrypto";

do $$ begin
  create type public.role as enum (
    'SUPERADMIN',
    'COMPLEX_ADMIN',
    'NEIGHBORHOOD_ADMIN',
    'SECURITY',
    'OWNER'
  );
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type public.gate_type as enum (
    'MAIN_COMPLEX',
    'INTERNAL_NEIGHBORHOOD'
  );
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type public.access_status as enum (
    'PENDING',
    'IN_COMPLEX',
    'IN_PROPERTY',
    'EXITED',
    'EXPIRED'
  );
exception
  when duplicate_object then null;
end $$;

create table public.complexes (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

create table public.neighborhoods (
  id uuid primary key default gen_random_uuid(),
  complex_id uuid references public.complexes (id) on delete set null,
  name text not null,
  timezone text not null default 'America/Argentina/Buenos_Aires',
  created_at timestamptz not null default now()
);

create index neighborhoods_complex_id_idx on public.neighborhoods (complex_id);

create table public.properties (
  id uuid primary key default gen_random_uuid(),
  neighborhood_id uuid not null references public.neighborhoods (id) on delete restrict,
  lot_number text not null,
  street_name text,
  created_at timestamptz not null default now(),
  unique (neighborhood_id, lot_number)
);

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  first_name text not null,
  last_name text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  role public.role not null,
  complex_id uuid references public.complexes (id) on delete cascade,
  neighborhood_id uuid references public.neighborhoods (id) on delete cascade,
  property_id uuid references public.properties (id) on delete cascade,
  constraint user_roles_scope_chk check (
    (role = 'SUPERADMIN'
      and complex_id is null
      and neighborhood_id is null
      and property_id is null)
    or (role = 'COMPLEX_ADMIN'
      and complex_id is not null
      and neighborhood_id is null
      and property_id is null)
    or (role = 'NEIGHBORHOOD_ADMIN'
      and neighborhood_id is not null
      and complex_id is null
      and property_id is null)
    or (role = 'OWNER'
      and property_id is not null
      and complex_id is null
      and neighborhood_id is null)
    or (role = 'SECURITY'
      and complex_id is null
      and neighborhood_id is null
      and property_id is null)
  )
);

create index user_roles_user_id_idx on public.user_roles (user_id);

create table public.gates (
  id uuid primary key default gen_random_uuid(),
  complex_id uuid references public.complexes (id) on delete set null,
  neighborhood_id uuid references public.neighborhoods (id) on delete set null,
  name text not null,
  type public.gate_type not null,
  constraint gates_parent_chk check (
    (type = 'MAIN_COMPLEX' and complex_id is not null and neighborhood_id is null)
    or (type = 'INTERNAL_NEIGHBORHOOD' and neighborhood_id is not null)
  )
);

create index gates_complex_id_idx on public.gates (complex_id);
create index gates_neighborhood_id_idx on public.gates (neighborhood_id);

create table public.shifts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete restrict,
  gate_id uuid not null references public.gates (id) on delete restrict,
  started_at timestamptz not null default now(),
  ended_at timestamptz
);

create index shifts_user_id_ended_at_idx on public.shifts (user_id, ended_at);
create index shifts_gate_id_idx on public.shifts (gate_id);

create table public.invitations (
  id uuid primary key default gen_random_uuid(),
  neighborhood_id uuid not null references public.neighborhoods (id) on delete restrict,
  property_id uuid not null references public.properties (id) on delete restrict,
  created_by_user_id uuid not null references public.profiles (id) on delete restrict,
  guest_name text not null,
  guest_dni text,
  qr_token uuid not null default gen_random_uuid(),
  valid_from timestamptz not null,
  valid_to timestamptz not null,
  is_revoked boolean not null default false,
  is_single_use boolean not null default false,
  created_at timestamptz not null default now(),
  constraint invitations_window_chk check (valid_to > valid_from)
);

create unique index invitations_qr_token_key on public.invitations (qr_token);
create index invitations_neighborhood_id_idx on public.invitations (neighborhood_id);
create index invitations_property_id_idx on public.invitations (property_id);
create index invitations_valid_from_valid_to_idx on public.invitations (valid_from, valid_to);

create table public.access_logs (
  id uuid primary key default gen_random_uuid(),
  invitation_id uuid references public.invitations (id) on delete set null,
  gate_id uuid not null references public.gates (id) on delete restrict,
  security_user_id uuid not null references public.profiles (id) on delete restrict,
  action_type public.access_status not null,
  timestamp timestamptz not null default now()
);

create index access_logs_invitation_id_idx on public.access_logs (invitation_id, timestamp desc);
create index access_logs_gate_id_idx on public.access_logs (gate_id);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, first_name, last_name)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data->>'first_name', ''), 'User'),
    coalesce(nullif(new.raw_user_meta_data->>'last_name', ''), 'Account')
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

grant usage on schema public to authenticated, service_role;

grant select, insert, update, delete on all tables in schema public to authenticated, service_role;
grant usage, select on all sequences in schema public to authenticated, service_role;

alter table public.complexes enable row level security;
alter table public.neighborhoods enable row level security;
alter table public.properties enable row level security;
alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;
alter table public.gates enable row level security;
alter table public.shifts enable row level security;
alter table public.invitations enable row level security;
alter table public.access_logs enable row level security;
