# Multi-Tenant Access Control System (SaaS)

## Project Description

A SaaS platform for managing entries and exits in gated communities and real estate complexes. Property owners manage guest invitations via QR codes. Security personnel log physical movements through a dedicated API and the gate PWA.

## Core Tech Stack

- **Language:** Strict TypeScript.
- **Admin frontend:** Next.js (`apps/web`) with `@supabase/ssr`.
- **Gate frontend:** Next.js PWA (`apps/gate-web`) for SECURITY scans.
- **Trusted API:** Node.js + Express (`apps/api`) for QR validation only.
- **Database:** PostgreSQL via Supabase (Auth, Studio, native RLS).
- **Types:** `@repo/db` generated/hand-maintained `Database` types.
- **Infrastructure:** Turborepo monorepo. Database: hosted Supabase (optional local `supabase start`).

## Monorepo Structure

```text
/
├── apps/
│   ├── api/          # Express: POST /access/validate (service role)
│   ├── web/          # Next.js admin/owners panel
│   ├── gate-web/     # Next.js PWA for SECURITY scans
│   └── docs/         # Starter docs app (unused by the product)
├── packages/
│   ├── db/           # Database TypeScript types
│   └── ui/           # Shared UI leftovers from the starter
├── supabase/
│   ├── migrations/   # Schema + RLS
│   ├── seed.sql      # Demo Auth users and sample data
│   └── tests/        # pgTAP RLS tests
└── docs/
```

## Hosted Supabase

Create a project in the dashboard, then `pnpm db:login`, `pnpm db:link`, `pnpm db:push`, `pnpm db:seed`. Point `apps/web/.env.local` and `apps/api/.env` at that project. `pnpm dev` does not need Docker.

## Local CLI stack (optional)

```sh
pnpm db:start          # Postgres, Auth, Studio (http://127.0.0.1:54323)
pnpm dev               # web :3000, gate-web :3002, api :4000
```

Seed logins (password `password123`):

- `owner@example.com` — only lote 1 invitations
- `owner2@example.com` — only lote 2 invitations
- `complex.admin@example.com` — both lots in Los Robles
- `superadmin@example.com` — everything
- `security@example.com` — active shift on the main gate

## F&F production deploy

See [DEPLOYMENT.md](./DEPLOYMENT.md) for Vercel (web + gate-web), Render/Docker (API), Supabase auth URLs, and smoke tests.
