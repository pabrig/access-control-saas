# Access Control SaaS

Multi-tenant access control for gated communities: owners create QR invitations, security validates them at gates.

See [`docs/README.md`](docs/README.md) for stack, architecture, and seed users.

## Hosted Supabase (recommended)

No Docker and no `127.0.0.1:54323`. Studio lives in the dashboard: [supabase.com/dashboard](https://supabase.com/dashboard).

1. Create a project in the dashboard (region + DB password).
2. Link this repo and push schema + RLS:

```sh
pnpm install
pnpm db:login
pnpm db:link tbxsgzwlefygurwjnvdb
pnpm db:push
pnpm db:seed
```

3. Copy **Project URL**, **anon/publishable** and **service_role/secret** from _Project Settings → API_ into:

- `apps/web/.env.local`
- `apps/api/.env`

Templates: `apps/web/.env.example` and `apps/api/.env.example`.

4. Run only the apps:

```sh
pnpm dev
```

- Admin: http://localhost:3000
- API: http://127.0.0.1:4000
- Studio: `https://supabase.com/dashboard/project/YOUR_PROJECT_REF`

`pnpm db:start` is optional (local CLI stack). You do not need it if the apps point at the hosted project.

## Local CLI stack (optional)

```sh
cp apps/web/.env.example apps/web/.env.local
cp apps/api/.env.example apps/api/.env
# then replace the placeholders with the local demo keys from `pnpm db:start`
pnpm db:start
pnpm dev
```
