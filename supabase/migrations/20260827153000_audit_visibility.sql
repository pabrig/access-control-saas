-- Owners must resolve MAIN_COMPLEX gates and the guard who scanned their guests.
-- Without this, access_logs are visible but joins to gates/profiles come back empty.

drop policy if exists gates_select on public.gates;
create policy gates_select on public.gates
  for select to authenticated
  using (
    public.is_superadmin()
    or complex_id in (select public.managed_complex_ids())
    or neighborhood_id in (select public.managed_neighborhood_ids())
    or id in (select public.active_shift_gate_ids())
    or neighborhood_id in (
      select p.neighborhood_id from public.properties p
      where p.id in (select public.owned_property_ids())
    )
    or (
      type = 'MAIN_COMPLEX'
      and complex_id in (
        select n.complex_id
        from public.neighborhoods n
        join public.properties p on p.neighborhood_id = n.id
        where p.id in (select public.owned_property_ids())
          and n.complex_id is not null
      )
    )
  );

drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles
  for select to authenticated
  using (
    public.is_superadmin()
    or id = auth.uid()
    or id in (
      select ur.user_id from public.user_roles ur
      where ur.property_id in (select public.owned_property_ids())
    )
    or id in (
      select ur.user_id
      from public.user_roles ur
      where ur.neighborhood_id in (select public.managed_neighborhood_ids())
         or ur.complex_id in (select public.managed_complex_ids())
         or ur.property_id in (
           select p.id from public.properties p
           where p.neighborhood_id in (select public.managed_neighborhood_ids())
         )
    )
    or id in (
      select al.security_user_id
      from public.access_logs al
      join public.invitations i on i.id = al.invitation_id
      where i.property_id in (select public.owned_property_ids())
         or i.neighborhood_id in (select public.managed_neighborhood_ids())
    )
  );
