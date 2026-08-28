-- Barrios sin complejo (complex_id is null): su NEIGHBORHOOD_ADMIN gestiona
-- seguridad y barreras como una comunidad autónoma.

create or replace function public.is_independent_neighborhood_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_roles ur
    join public.neighborhoods n on n.id = ur.neighborhood_id
    where ur.user_id = auth.uid()
      and ur.role = 'NEIGHBORHOOD_ADMIN'
      and ur.neighborhood_id is not null
      and n.complex_id is null
  );
$$;

revoke all on function public.is_independent_neighborhood_admin() from public, anon;
grant execute on function public.is_independent_neighborhood_admin() to authenticated, service_role;

create or replace function public.admin_may_assign_role(
  p_role public.role,
  p_complex_id uuid,
  p_neighborhood_id uuid,
  p_property_id uuid
)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if p_role = 'SUPERADMIN' or p_role = 'SECURITY' then
    if p_complex_id is not null or p_neighborhood_id is not null or p_property_id is not null then
      return false;
    end if;
  elsif p_role = 'COMPLEX_ADMIN' then
    if p_complex_id is null or p_neighborhood_id is not null or p_property_id is not null then
      return false;
    end if;
  elsif p_role = 'NEIGHBORHOOD_ADMIN' then
    if p_neighborhood_id is null or p_complex_id is not null or p_property_id is not null then
      return false;
    end if;
  elsif p_role = 'OWNER' then
    if p_property_id is null or p_complex_id is not null or p_neighborhood_id is not null then
      return false;
    end if;
  else
    return false;
  end if;

  if public.is_superadmin() then
    return true;
  end if;

  if public.is_complex_admin() then
    if p_role in ('SUPERADMIN', 'COMPLEX_ADMIN') then
      return false;
    end if;
    if p_role = 'SECURITY' then
      return true;
    end if;
    if p_role = 'NEIGHBORHOOD_ADMIN' then
      return p_neighborhood_id in (select public.managed_neighborhood_ids());
    end if;
    if p_role = 'OWNER' then
      return exists (
        select 1
        from public.properties p
        where p.id = p_property_id
          and p.neighborhood_id in (select public.managed_neighborhood_ids())
      );
    end if;
  end if;

  if public.is_neighborhood_admin() then
    if p_role = 'OWNER' then
      return exists (
        select 1
        from public.properties p
        where p.id = p_property_id
          and p.neighborhood_id in (select public.managed_neighborhood_ids())
      );
    end if;
    if p_role = 'SECURITY' and public.is_independent_neighborhood_admin() then
      return true;
    end if;
    return false;
  end if;

  return false;
end;
$$;

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
    or (
      public.is_complex_admin()
      and id in (
        select ur.user_id from public.user_roles ur where ur.role = 'SECURITY'
      )
    )
    or (
      public.is_independent_neighborhood_admin()
      and id in (
        select ur.user_id from public.user_roles ur where ur.role = 'SECURITY'
      )
    )
  );

drop policy if exists profiles_update_admin on public.profiles;
create policy profiles_update_admin on public.profiles
  for update to authenticated
  using (
    public.is_tenant_admin()
    and (
      id in (
        select ur.user_id
        from public.user_roles ur
        where ur.neighborhood_id in (select public.managed_neighborhood_ids())
           or ur.complex_id in (select public.managed_complex_ids())
           or ur.property_id in (
             select p.id from public.properties p
             where p.neighborhood_id in (select public.managed_neighborhood_ids())
           )
      )
      or (
        public.is_complex_admin()
        and id in (
          select ur.user_id from public.user_roles ur where ur.role = 'SECURITY'
        )
      )
      or (
        public.is_independent_neighborhood_admin()
        and id in (
          select ur.user_id from public.user_roles ur where ur.role = 'SECURITY'
        )
      )
    )
  )
  with check (
    public.is_tenant_admin()
    and (
      id in (
        select ur.user_id
        from public.user_roles ur
        where ur.neighborhood_id in (select public.managed_neighborhood_ids())
           or ur.complex_id in (select public.managed_complex_ids())
           or ur.property_id in (
             select p.id from public.properties p
             where p.neighborhood_id in (select public.managed_neighborhood_ids())
           )
      )
      or (
        public.is_complex_admin()
        and id in (
          select ur.user_id from public.user_roles ur where ur.role = 'SECURITY'
        )
      )
      or (
        public.is_independent_neighborhood_admin()
        and id in (
          select ur.user_id from public.user_roles ur where ur.role = 'SECURITY'
        )
      )
    )
  );

drop policy if exists user_roles_select on public.user_roles;
create policy user_roles_select on public.user_roles
  for select to authenticated
  using (
    public.is_superadmin()
    or user_id = auth.uid()
    or complex_id in (select public.managed_complex_ids())
    or neighborhood_id in (select public.managed_neighborhood_ids())
    or property_id in (
      select p.id from public.properties p
      where p.neighborhood_id in (select public.managed_neighborhood_ids())
    )
    or (
      role = 'SECURITY'
      and (public.is_complex_admin() or public.is_independent_neighborhood_admin())
    )
  );

drop policy if exists user_roles_insert_security_admin on public.user_roles;
create policy user_roles_insert_security_admin on public.user_roles
  for insert to authenticated
  with check (
    role = 'SECURITY'
    and complex_id is null
    and neighborhood_id is null
    and property_id is null
    and (
      public.is_superadmin()
      or public.is_complex_admin()
      or public.is_independent_neighborhood_admin()
    )
  );

drop policy if exists user_roles_delete_security_admin on public.user_roles;
create policy user_roles_delete_security_admin on public.user_roles
  for delete to authenticated
  using (
    role = 'SECURITY'
    and (
      public.is_superadmin()
      or public.is_complex_admin()
      or public.is_independent_neighborhood_admin()
    )
  );
