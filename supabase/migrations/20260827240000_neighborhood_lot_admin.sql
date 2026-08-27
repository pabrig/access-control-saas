-- Neighborhood admin keeps a lot register: manzana, phone, notes.
-- They (and complex admin) may assign or remove OWNER on lots they manage.

alter table public.properties
  add column if not exists block_name text,
  add column if not exists phone text,
  add column if not exists notes text;

drop policy if exists user_roles_write_admin on public.user_roles;

create policy user_roles_write_superadmin on public.user_roles
  for all to authenticated
  using (public.is_superadmin())
  with check (public.is_superadmin());

create policy user_roles_insert_owner_admin on public.user_roles
  for insert to authenticated
  with check (
    role = 'OWNER'
    and property_id is not null
    and complex_id is null
    and neighborhood_id is null
    and property_id in (
      select p.id
      from public.properties p
      where p.neighborhood_id in (select public.managed_neighborhood_ids())
    )
  );

create policy user_roles_delete_owner_admin on public.user_roles
  for delete to authenticated
  using (
    role = 'OWNER'
    and property_id in (
      select p.id
      from public.properties p
      where p.neighborhood_id in (select public.managed_neighborhood_ids())
    )
  );
