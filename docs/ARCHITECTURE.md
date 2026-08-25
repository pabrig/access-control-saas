# System Architecture

## Multi-Tenant Pattern

Shared PostgreSQL with **native Row Level Security (RLS)**. Isolation is enforced in the database, not in application filters. Every browser request uses the user JWT from Supabase Auth; policies scope rows by `complex_id`, `neighborhood_id`, `property_id`, or the guard's active shift.

The QR validation path is the exception: `apps/api` uses the service role inside a trusted process and still checks shift, gate, and invitation state in code.

## Authentication and Authorization

- **Authentication:** Supabase Auth (GoTrue). `auth.users` holds credentials. `public.profiles` is the 1:1 application profile (`id = auth.uid()`).
- **Authorization:** Scoped RBAC implemented as Postgres RLS helpers (`is_superadmin()`, `managed_neighborhood_ids()`, `owned_property_ids()`, ...). Users keep roles on `user_roles` restricted to a hierarchy node.

## Frontend - Backend Communication

- **admin-web (`apps/web`):** Next.js talks to Supabase directly (`@supabase/ssr`). RLS is the authorization layer.
- **API (`apps/api`):** `POST /access/validate` with the guard JWT. Service role writes `access_logs`. Intended for `gate-web` with &lt;200ms local scans; the QR reader simulates keyboard input plus Enter.
- **Studio:** local Supabase Studio for inspecting tables and policies.
