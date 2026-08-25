# Access Control SaaS

Multi-tenant access control for gated communities: owners create QR invitations, security validates them at gates.

See [`docs/README.md`](docs/README.md) for stack, architecture, and seed users.

## Local development

```sh
pnpm install
cp apps/web/.env.example apps/web/.env.local
cp apps/api/.env.example apps/api/.env
pnpm db:start
pnpm dev
```

- Admin panel: http://localhost:3000
- Validation API: http://127.0.0.1:4000
- Supabase Studio: http://127.0.0.1:54323

Useful commands: `pnpm db:stop`, `pnpm db:reset`, `pnpm db:test`, `pnpm db:types`.
