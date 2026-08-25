-- Scoped RBAC as Postgres RLS. Helpers are SECURITY DEFINER so they can
-- read user_roles without recursing through RLS.

create or replace function public.is_superadmin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_roles ur
    where ur.user_id = auth.uid()
      and ur.role = 'SUPERADMIN'
  );
$$;

create or replace function public.managed_complex_ids()
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select ur.complex_id
  from public.user_roles ur
  where ur.user_id = auth.uid()
    and ur.role = 'COMPLEX_ADMIN'
    and ur.complex_id is not null;
$$;

create or replace function public.managed_neighborhood_ids()
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select ur.neighborhood_id
  from public.user_roles ur
  where ur.user_id = auth.uid()
    and ur.role = 'NEIGHBORHOOD_ADMIN'
    and ur.neighborhood_id is not null
  union
  select n.id
  from public.neighborhoods n
  where n.complex_id in (select public.managed_complex_ids());
$$;

create or replace function public.owned_property_ids()
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select ur.property_id
  from public.user_roles ur
  where ur.user_id = auth.uid()
    and ur.role = 'OWNER'
    and ur.property_id is not null;
$$;

create or replace function public.active_shift_gate_ids()
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select s.gate_id
  from public.shifts s
  where s.user_id = auth.uid()
    and s.ended_at is null;
$$;

create or replace function public.security_visible_neighborhood_ids()
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select g.neighborhood_id
  from public.shifts s
  join public.gates g on g.id = s.gate_id
  where s.user_id = auth.uid()
    and s.ended_at is null
    and g.neighborhood_id is not null
  union
  select n.id
  from public.shifts s
  join public.gates g on g.id = s.gate_id
  join public.neighborhoods n on n.complex_id = g.complex_id
  where s.user_id = auth.uid()
    and s.ended_at is null
    and g.type = 'MAIN_COMPLEX';
$$;

create or replace function public.security_visible_complex_ids()
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select g.complex_id
  from public.shifts s
  join public.gates g on g.id = s.gate_id
  where s.user_id = auth.uid()
    and s.ended_at is null
    and g.complex_id is not null
  union
  select n.complex_id
  from public.shifts s
  join public.gates g on g.id = s.gate_id
  join public.neighborhoods n on n.id = g.neighborhood_id
  where s.user_id = auth.uid()
    and s.ended_at is null
    and n.complex_id is not null;
$$;

revoke all on function public.is_superadmin() from public, anon;
revoke all on function public.managed_complex_ids() from public, anon;
revoke all on function public.managed_neighborhood_ids() from public, anon;
revoke all on function public.owned_property_ids() from public, anon;
revoke all on function public.active_shift_gate_ids() from public, anon;
revoke all on function public.security_visible_neighborhood_ids() from public, anon;
revoke all on function public.security_visible_complex_ids() from public, anon;

grant execute on function public.is_superadmin() to authenticated, service_role;
grant execute on function public.managed_complex_ids() to authenticated, service_role;
grant execute on function public.managed_neighborhood_ids() to authenticated, service_role;
grant execute on function public.owned_property_ids() to authenticated, service_role;
grant execute on function public.active_shift_gate_ids() to authenticated, service_role;
grant execute on function public.security_visible_neighborhood_ids() to authenticated, service_role;
grant execute on function public.security_visible_complex_ids() to authenticated, service_role;

-- profiles
create policy profiles_select on public.profiles
  for select to authenticated
  using (
    public.is_superadmin()
    or id = auth.uid()
    or id in (select user_id from public.user_roles where property_id in (select public.owned_property_ids()))
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
  );

create policy profiles_update_self on public.profiles
  for update to authenticated
  using (id = auth.uid() or public.is_superadmin())
  with check (id = auth.uid() or public.is_superadmin());

-- user_roles: users see their own assignments; admins see roles in scope
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
  );

create policy user_roles_write_admin on public.user_roles
  for all to authenticated
  using (public.is_superadmin())
  with check (public.is_superadmin());

-- complexes
create policy complexes_select on public.complexes
  for select to authenticated
  using (
    public.is_superadmin()
    or id in (select public.managed_complex_ids())
    or id in (
      select n.complex_id from public.neighborhoods n
      where n.id in (select public.managed_neighborhood_ids())
        and n.complex_id is not null
    )
    or id in (
      select n.complex_id from public.properties p
      join public.neighborhoods n on n.id = p.neighborhood_id
      where p.id in (select public.owned_property_ids())
        and n.complex_id is not null
    )
    or id in (select public.security_visible_complex_ids())
  );

create policy complexes_write on public.complexes
  for all to authenticated
  using (
    public.is_superadmin()
    or id in (select public.managed_complex_ids())
  )
  with check (
    public.is_superadmin()
    or id in (select public.managed_complex_ids())
  );

-- neighborhoods
create policy neighborhoods_select on public.neighborhoods
  for select to authenticated
  using (
    public.is_superadmin()
    or id in (select public.managed_neighborhood_ids())
    or complex_id in (select public.managed_complex_ids())
    or id in (
      select p.neighborhood_id from public.properties p
      where p.id in (select public.owned_property_ids())
    )
    or id in (select public.security_visible_neighborhood_ids())
  );

create policy neighborhoods_write on public.neighborhoods
  for all to authenticated
  using (
    public.is_superadmin()
    or id in (select public.managed_neighborhood_ids())
    or complex_id in (select public.managed_complex_ids())
  )
  with check (
    public.is_superadmin()
    or id in (select public.managed_neighborhood_ids())
    or complex_id in (select public.managed_complex_ids())
  );

-- properties
create policy properties_select on public.properties
  for select to authenticated
  using (
    public.is_superadmin()
    or id in (select public.owned_property_ids())
    or neighborhood_id in (select public.managed_neighborhood_ids())
    or neighborhood_id in (select public.security_visible_neighborhood_ids())
  );

create policy properties_write on public.properties
  for all to authenticated
  using (
    public.is_superadmin()
    or neighborhood_id in (select public.managed_neighborhood_ids())
  )
  with check (
    public.is_superadmin()
    or neighborhood_id in (select public.managed_neighborhood_ids())
  );

-- gates
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
  );

create policy gates_write on public.gates
  for all to authenticated
  using (
    public.is_superadmin()
    or complex_id in (select public.managed_complex_ids())
    or neighborhood_id in (select public.managed_neighborhood_ids())
  )
  with check (
    public.is_superadmin()
    or complex_id in (select public.managed_complex_ids())
    or neighborhood_id in (select public.managed_neighborhood_ids())
  );

-- shifts
create policy shifts_select on public.shifts
  for select to authenticated
  using (
    public.is_superadmin()
    or user_id = auth.uid()
    or gate_id in (
      select g.id from public.gates g
      where g.complex_id in (select public.managed_complex_ids())
         or g.neighborhood_id in (select public.managed_neighborhood_ids())
    )
  );

create policy shifts_insert on public.shifts
  for insert to authenticated
  with check (
    public.is_superadmin()
    or (
      user_id = auth.uid()
      and exists (
        select 1 from public.user_roles ur
        where ur.user_id = auth.uid() and ur.role = 'SECURITY'
      )
    )
    or gate_id in (
      select g.id from public.gates g
      where g.complex_id in (select public.managed_complex_ids())
         or g.neighborhood_id in (select public.managed_neighborhood_ids())
    )
  );

create policy shifts_update on public.shifts
  for update to authenticated
  using (
    public.is_superadmin()
    or user_id = auth.uid()
    or gate_id in (
      select g.id from public.gates g
      where g.complex_id in (select public.managed_complex_ids())
         or g.neighborhood_id in (select public.managed_neighborhood_ids())
    )
  )
  with check (
    public.is_superadmin()
    or user_id = auth.uid()
    or gate_id in (
      select g.id from public.gates g
      where g.complex_id in (select public.managed_complex_ids())
         or g.neighborhood_id in (select public.managed_neighborhood_ids())
    )
  );

-- invitations (core tenant isolation)
create policy invitations_select on public.invitations
  for select to authenticated
  using (
    public.is_superadmin()
    or property_id in (select public.owned_property_ids())
    or neighborhood_id in (select public.managed_neighborhood_ids())
    or neighborhood_id in (select public.security_visible_neighborhood_ids())
  );

create policy invitations_insert on public.invitations
  for insert to authenticated
  with check (
    created_by_user_id = auth.uid()
    and (
      public.is_superadmin()
      or (
        property_id in (select public.owned_property_ids())
        and neighborhood_id = (
          select p.neighborhood_id from public.properties p where p.id = property_id
        )
      )
      or neighborhood_id in (select public.managed_neighborhood_ids())
    )
  );

create policy invitations_update on public.invitations
  for update to authenticated
  using (
    public.is_superadmin()
    or property_id in (select public.owned_property_ids())
    or neighborhood_id in (select public.managed_neighborhood_ids())
  )
  with check (
    public.is_superadmin()
    or property_id in (select public.owned_property_ids())
    or neighborhood_id in (select public.managed_neighborhood_ids())
  );

create policy invitations_delete on public.invitations
  for delete to authenticated
  using (
    public.is_superadmin()
    or neighborhood_id in (select public.managed_neighborhood_ids())
  );

-- access_logs: authenticated can read in scope; writes go through the API (service_role)
create policy access_logs_select on public.access_logs
  for select to authenticated
  using (
    public.is_superadmin()
    or security_user_id = auth.uid()
    or gate_id in (select public.active_shift_gate_ids())
    or invitation_id in (
      select i.id from public.invitations i
      where i.property_id in (select public.owned_property_ids())
         or i.neighborhood_id in (select public.managed_neighborhood_ids())
    )
  );
