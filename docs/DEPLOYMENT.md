# F&F deployment (Friends & Family)

Minimal production topology for a small pilot: **two Vercel projects** (panel + gate PWA), **one Node host** for the access API, and the **existing hosted Supabase** project.

## Architecture

```text
web.<domain>        → Vercel (apps/web)        → Supabase (RLS)
gate.<domain>       → Vercel (apps/gate-web)   → Supabase + /access/* rewrite → API
api.<domain>        → Render / Fly / Docker    → Supabase (service role)
*.supabase.co       → Hosted Postgres + Auth
```

**Why gate-web uses a rewrite:** phones on the LAN call same-origin `/access/validate`. Vercel proxies those requests to the API host — no CORS on the client, no public API URL in the browser.

## Prerequisites

- Hosted Supabase project with migrations + seed applied (`pnpm db:push`, `pnpm db:seed`)
- GitHub repo connected to Vercel and Render (or Fly)
- Custom domains optional for F&F (`.vercel.app` / `.onrender.com` URLs work)

## 1. Deploy the API (`apps/api`)

### Option A — Render (recommended for F&F)

1. [Render](https://render.com) → **New → Blueprint** → connect `access-control-saas` → use root `render.yaml`.
2. Or **New → Web Service** → Node, root directory `.`, commands from `render.yaml`.
3. Set environment variables:

| Variable                    | Example                                                  | Notes                         |
| --------------------------- | -------------------------------------------------------- | ----------------------------- |
| `SUPABASE_URL`              | `https://tbxsgzwlefygurwjnvdb.supabase.co`               | Dashboard → API               |
| `SUPABASE_ANON_KEY`         | `eyJ…`                                                   | Server-side only              |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJ…`                                                   | **Secret** — never in Next.js |
| `CORS_ORIGIN`               | `https://web-xxx.vercel.app,https://gate-xxx.vercel.app` | Comma-separated prod URLs     |
| `PORT`                      | _(auto on Render)_                                       | Default `4000` locally        |

4. Confirm health: `GET https://<api-host>/health` → `{ "ok": true }`.

**Free tier:** service sleeps after ~15 min idle; first request may be slow. Fine for F&F.

### Option B — Docker

```sh
docker build -f apps/api/Dockerfile -t nexo-api .
docker run --env-file apps/api/.env -p 4000:4000 nexo-api
```

### Local parity

```sh
cp apps/api/.env.example apps/api/.env   # fill Supabase keys
pnpm dev                                  # api :4000, web :3000, gate-web :3002
```

---

## 2. Deploy the panel (`apps/web`)

1. Vercel → **Add New Project** → import repo.
2. **Root Directory:** `apps/web`
3. Framework: **Next.js** (auto-detected; `vercel.json` runs install/build from monorepo root).
4. Environment variables (**Production** + **Preview**):

| Variable                        | Value                     |
| ------------------------------- | ------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`      | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Anon / publishable key    |

5. Deploy. Note the URL: `https://<web>.vercel.app`.

No API variables needed — `web` talks to Supabase only.

---

## 3. Deploy the gate PWA (`apps/gate-web`)

1. Vercel → **second project**, same repo.
2. **Root Directory:** `apps/gate-web`
3. Environment variables:

| Variable                        | Value                | Scope                          |
| ------------------------------- | -------------------- | ------------------------------ |
| `NEXT_PUBLIC_SUPABASE_URL`      | Same as web          | Build + runtime                |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Same as web          | Build + runtime                |
| `ACCESS_API_URL`                | `https://<api-host>` | **Server** (no `NEXT_PUBLIC_`) |

`ACCESS_API_URL` is required on Vercel. Without it the build fails early with a clear error.

**Do not set** `NEXT_PUBLIC_API_URL` in production unless you intentionally bypass the rewrite and handle CORS on the API.

4. Deploy. Note the URL: `https://<gate>.vercel.app`.

5. Update API `CORS_ORIGIN` to include this gate URL (and web URL if the API ever serves browser clients directly).

---

## 4. Supabase Auth redirects

Dashboard → **Authentication → URL Configuration**:

| Setting           | Values                                                                                                                |
| ----------------- | --------------------------------------------------------------------------------------------------------------------- |
| **Site URL**      | `https://<web>.vercel.app`                                                                                            |
| **Redirect URLs** | `https://<web>.vercel.app/**`, `https://<gate>.vercel.app/**`, `http://localhost:3000/**`, `http://localhost:3002/**` |

Without gate redirect URLs, guard login on the PWA will fail after OAuth/magic link.

---

## 5. Smoke test (post-deploy)

1. **API:** `curl https://<api>/health` → `{"ok":true}`
2. **Web:** open `/login`, sign in as `owner@example.com` / `password123` (if seeded)
3. **Web:** create a guest pass on `/pases`
4. **Gate:** open `/login` as `security@example.com`, start shift, scan QR
5. **Gate:** confirm validate returns `ok: true` (check movement in Supabase `access_logs` if needed)

---

## Environment matrix

| Variable                        | web | gate-web |   api    |
| ------------------------------- | :-: | :------: | :------: |
| `NEXT_PUBLIC_SUPABASE_URL`      |  ✓  |    ✓     |    —     |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` |  ✓  |    ✓     |    —     |
| `ACCESS_API_URL`                |  —  | ✓ server |    —     |
| `NEXT_PUBLIC_API_URL`           |  —  | dev only |    —     |
| `SUPABASE_URL`                  |  —  |    —     |    ✓     |
| `SUPABASE_ANON_KEY`             |  —  |    —     |    ✓     |
| `SUPABASE_SERVICE_ROLE_KEY`     |  —  |    —     |    ✓     |
| `CORS_ORIGIN`                   |  —  |    —     |    ✓     |
| `PORT`                          |  —  |    —     | ✓ (host) |

Templates: `apps/*/`.env.example`

---

## CI / build notes

- `gate-web` build on CI uses localhost API fallback (no `VERCEL` env) — compiles without a real API.
- On Vercel, `ACCESS_API_URL` must be set before the first gate-web deploy.
- `pnpm ci` from repo root is the local pre-merge gate.

---

## Optional next steps

- Merge `feat/observability-free` and add Sentry DSNs per app ([OBSERVABILITY.md](./OBSERVABILITY.md))
- Enable Vercel Analytics + Speed Insights on both Next projects
- [Better Stack](https://betterstack.com) uptime monitors for web, gate, API `/health`
- Custom domains + Supabase redirect URL updates

## Related

- [Architecture](./ARCHITECTURE.md)
- [Observability](./OBSERVABILITY.md)
- [Contributing](../.github/CONTRIBUTING.md) — branch → `develop` → release PR to `main`
