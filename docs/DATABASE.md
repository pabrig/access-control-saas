# Data Model (PostgreSQL + Supabase)

Identity is split: `auth.users` (Supabase Auth) and `public.profiles` (`id` references `auth.users`). Application tables use snake_case.

## Hierarchy of Main Entities

1. **complexes:** Optional grouping of neighborhoods (master plan).
2. **neighborhoods:** Primary tenant. Can belong to a complex or be independent.
3. **gates:** Physical control point linked to a complex (`MAIN_COMPLEX`) or a neighborhood (`INTERNAL_NEIGHBORHOOD`).
4. **properties:** Linked to a neighborhood.
5. **user_roles:** Scoped RBAC assignment (`SUPERADMIN`, `COMPLEX_ADMIN`, `NEIGHBORHOOD_ADMIN`, `SECURITY`, `OWNER`).
6. **shifts:** Active gate assignment for `SECURITY`.
7. **invitations:** Guest QR (`qr_token` unique).
8. **access_logs:** Movement history written by the validation API.

Source of truth: [`supabase/migrations`](../supabase/migrations).

## Critical Indexes

- Exact lookup by `invitations.qr_token`.
- Date range `valid_from`, `valid_to`.
- Foreign keys for tenancy: `neighborhood_id`, `complex_id`, `property_id`.
