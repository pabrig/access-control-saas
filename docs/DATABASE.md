# Data Model (PostgreSQL + Supabase)

Identity is split: `auth.users` (Supabase Auth) and `public.profiles` (`id` references `auth.users`). Application tables use snake_case.

## Hierarchy of Main Entities

1. **complexes:** Optional grouping of neighborhoods (master plan).
2. **neighborhoods:** Primary tenant. Can belong to a complex or be independent.
3. **gates:** Physical control point linked to a complex (`MAIN_COMPLEX`) or a neighborhood (`INTERNAL_NEIGHBORHOOD`).
4. **properties:** Linked to a neighborhood.
5. **user_roles:** Scoped RBAC assignment (`SUPERADMIN`, `COMPLEX_ADMIN`, `NEIGHBORHOOD_ADMIN`, `SECURITY`, `OWNER`).
6. **shifts:** Active gate assignment for `SECURITY`.
7. **invitations:** Guest pass. `share_token` is the WhatsApp/email link. `qr_token` is minted when the guest claims (`READY`) or when the owner creates a walk-up pass.
8. **invitation_vehicles:** Cars on a pass. Argentine plates only: `AR_OLD` (`ABC 123`) or `AR_MERCOSUR` (`AB 123 CD`).
9. **invitation_passengers:** People in each car (one driver per vehicle). Validated visually at the gate.
10. **access_logs:** Movement history written by the validation API. Optional `vehicle_id` when the guard typed a matching plate.

Source of truth: [`supabase/migrations`](../supabase/migrations).

## Critical Indexes

- Exact lookup by `invitations.qr_token`.
- Date range `valid_from`, `valid_to`.
- Foreign keys for tenancy: `neighborhood_id`, `complex_id`, `property_id`.
- Unique plate per invitation (`invitation_vehicles.plate_normalized`).
