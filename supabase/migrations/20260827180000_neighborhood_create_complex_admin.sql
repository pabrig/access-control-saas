-- Only SUPERADMIN and COMPLEX_ADMIN may create neighborhoods.
-- COMPLEX_ADMIN may create several neighborhoods inside their complex.
-- NEIGHBORHOOD_ADMIN cannot create or delete barrios.

drop policy if exists neighborhoods_write on public.neighborhoods;

create policy neighborhoods_insert on public.neighborhoods
  for insert to authenticated
  with check (
    public.is_superadmin()
    or complex_id in (select public.managed_complex_ids())
  );

create policy neighborhoods_update on public.neighborhoods
  for update to authenticated
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

create policy neighborhoods_delete on public.neighborhoods
  for delete to authenticated
  using (
    public.is_superadmin()
    or complex_id in (select public.managed_complex_ids())
  );
