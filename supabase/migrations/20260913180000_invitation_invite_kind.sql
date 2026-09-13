-- Persist pass kind chosen in PassComposer (Invitado vs Servicio).

create type public.invite_kind as enum ('visit', 'provider');

alter table public.invitations
  add column if not exists invite_kind public.invite_kind not null default 'visit';

-- Best-effort backfill: historical single-use passes were typically Servicio.
update public.invitations
set invite_kind = 'provider'
where is_single_use = true
  and invite_kind = 'visit';
