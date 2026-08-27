-- OWNER may update their own lot data (not delete or reparent)
-- and has full CRUD on invitations for that lot.

drop policy if exists invitations_delete on public.invitations;

create policy invitations_delete on public.invitations
  for delete to authenticated
  using (
    public.is_superadmin()
    or neighborhood_id in (select public.managed_neighborhood_ids())
    or property_id in (select public.owned_property_ids())
  );

create policy properties_update_owner on public.properties
  for update to authenticated
  using (id in (select public.owned_property_ids()))
  with check (id in (select public.owned_property_ids()));

create or replace function public.prevent_owner_property_reparent()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if new.neighborhood_id is not distinct from old.neighborhood_id then
    return new;
  end if;

  if public.is_superadmin()
     or old.neighborhood_id in (select public.managed_neighborhood_ids())
     or new.neighborhood_id in (select public.managed_neighborhood_ids()) then
    return new;
  end if;

  raise exception 'Property owners cannot move a lot or house to another neighborhood'
    using errcode = '42501';
end;
$$;

drop trigger if exists properties_prevent_owner_reparent on public.properties;

create trigger properties_prevent_owner_reparent
  before update on public.properties
  for each row
  execute function public.prevent_owner_property_reparent();

revoke all on function public.prevent_owner_property_reparent() from public, anon;
