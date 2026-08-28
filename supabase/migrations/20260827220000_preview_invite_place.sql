-- Guest credential needs the neighborhood name for maps and the pass header.
-- CREATE OR REPLACE cannot change OUT columns; drop first.

drop function if exists public.preview_invite(uuid);

create function public.preview_invite(p_share uuid)
returns table (
  status public.invitation_lifecycle,
  is_revoked boolean,
  valid_from timestamptz,
  valid_to timestamptz,
  lot_number text,
  street_name text,
  neighborhood_name text,
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
    n.name,
    i.guest_name,
    case when i.status = 'READY' then i.qr_token else null end
  from public.invitations i
  join public.properties p on p.id = i.property_id
  join public.neighborhoods n on n.id = i.neighborhood_id
  where i.share_token = p_share;
$$;

revoke all on function public.preview_invite(uuid) from public;
grant execute on function public.preview_invite(uuid) to anon, authenticated, service_role;
