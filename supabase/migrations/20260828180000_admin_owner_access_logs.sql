-- Admins must see resident (owner) access logs scoped by property/neighborhood,
-- not only invitation-linked scans.

drop policy if exists access_logs_select on public.access_logs;
create policy access_logs_select on public.access_logs
  for select to authenticated
  using (
    public.is_superadmin()
    or security_user_id = auth.uid()
    or gate_id in (select public.active_shift_gate_ids())
    or profile_id = auth.uid()
    or property_id in (select public.owned_property_ids())
    or property_id in (
      select p.id from public.properties p
      where p.neighborhood_id in (select public.managed_neighborhood_ids())
    )
    or invitation_id in (
      select i.id from public.invitations i
      where i.property_id in (select public.owned_property_ids())
         or i.neighborhood_id in (select public.managed_neighborhood_ids())
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
      where al.invitation_id in (
        select i.id from public.invitations i
        where i.property_id in (select public.owned_property_ids())
           or i.neighborhood_id in (select public.managed_neighborhood_ids())
      )
         or al.property_id in (select public.owned_property_ids())
         or al.property_id in (
           select p.id from public.properties p
           where p.neighborhood_id in (select public.managed_neighborhood_ids())
         )
         or al.profile_id = auth.uid()
    )
    or id in (
      select al.profile_id
      from public.access_logs al
      where al.profile_id is not null
        and (
          al.gate_id in (select public.active_shift_gate_ids())
          or al.property_id in (select public.owned_property_ids())
          or al.property_id in (
            select p.id from public.properties p
            where p.neighborhood_id in (select public.managed_neighborhood_ids())
          )
        )
    )
    or (
      (public.is_complex_admin() or public.is_neighborhood_admin())
      and id in (
        select ur.user_id from public.user_roles ur where ur.role = 'SECURITY'
      )
    )
  );
