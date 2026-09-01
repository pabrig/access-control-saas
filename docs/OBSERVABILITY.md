# Observability (free tier)

Stack for Friends & Family: errors, performance, uptime, and product events — $0/month at low volume.

## What is wired in code

| Layer                       | Tool                                                                   | When it runs                                            |
| --------------------------- | ---------------------------------------------------------------------- | ------------------------------------------------------- |
| **web / gate-web errors**   | [Sentry](https://sentry.io)                                            | Only if `NEXT_PUBLIC_SENTRY_DSN` or `SENTRY_DSN` is set |
| **API errors**              | Sentry Node                                                            | Only if `SENTRY_DSN` is set                             |
| **Web Vitals + page views** | [Vercel Analytics](https://vercel.com/docs/analytics) + Speed Insights | On Vercel deploys (harmless no-op locally)              |
| **Product events**          | Vercel Analytics `track()`                                             | `pass_created`, `scan_preview`, `scan_commit` (no PII)  |
| **API access logs**         | Structured JSON stdout                                                 | `/access/*` and `/health` — visible in host logs        |

Without env vars, the apps behave as before; observability is opt-in.

## 1. Sentry (errors + performance)

Free **Developer** plan: 5k errors/month, 10k transactions, 1 user.

1. Create a Sentry org and three projects (recommended): `nexo-web`, `nexo-gate`, `nexo-api`.
2. Copy each DSN into Vercel env (or `.env.local` / `apps/api/.env`):

```env
# web + gate-web
NEXT_PUBLIC_SENTRY_DSN=https://…@….ingest.sentry.io/…
SENTRY_DSN=https://…@….ingest.sentry.io/…

# api only
SENTRY_DSN=https://…@….ingest.sentry.io/…
```

3. Redeploy. Trigger a test error in staging to confirm events arrive.

Tags: server events include `app: web | gate-web`. Filter by tag in Sentry.

## 2. Vercel Analytics + Speed Insights

On each Next.js project in Vercel:

1. **Project → Analytics → Enable**
2. **Project → Speed Insights → Enable**

No extra env vars. Custom events (see `packages/observability/src/events.ts`):

| Event          | App      | Props                      |
| -------------- | -------- | -------------------------- |
| `pass_created` | web      | —                          |
| `scan_preview` | gate-web | `ok`, `code`, `ms`, `kind` |
| `scan_commit`  | gate-web | `ok`, `code`, `ms`, `kind` |

View under **Analytics → Events** after F&F traffic.

## 3. API structured logs

Every `/access/lookup`, `/access/validate`, and `/health` response logs one JSON line:

```json
{
  "level": "info",
  "ts": "…",
  "event": "http_request",
  "method": "POST",
  "path": "/access/validate",
  "status": 200,
  "ms": 42
}
```

On Render/Fly/Railway: open **Logs** and filter `http_request`. On local dev: terminal running `pnpm dev`.

## 4. Supabase (database + auth)

Dashboard: [Logs Explorer](https://supabase.com/dashboard/project/tbxsgzwlefygurwjnvdb/logs/explorer)

| Log table       | Use                                  |
| --------------- | ------------------------------------ |
| `auth_logs`     | Failed logins, token issues          |
| `edge_logs`     | REST/PostgREST 401/403 (RLS)         |
| `postgres_logs` | Slow queries (free: 1-day retention) |

**Reports** → watch DB size, MAU, egress (free tier limits).

**Anti-pause:** ping the project every 2–3 days (e.g. [cron-job.org](https://cron-job.org) → `GET https://tbxsgzwlefygurwjnvdb.supabase.co/rest/v1/` with `apikey: <anon>`).

## 5. Uptime (external)

[Better Stack](https://betterstack.com) free: 10 monitors, 30s interval.

Suggested monitors:

| URL                               | Purpose           |
| --------------------------------- | ----------------- |
| `https://<web>.vercel.app/login`  | Panel up          |
| `https://<gate>.vercel.app/login` | Gate PWA up       |
| `https://<api-host>/health`       | Access API up     |
| Supabase REST ping                | Avoid 7-day pause |

Alert via email or Slack.

## 6. Manual performance (F&F)

- Chrome DevTools → Lighthouse (mobile) on `/`, `/pases`, `/scan`
- Gate scan: compare `ms` in Vercel event `scan_preview` / `scan_commit` (p95 target &lt; 500 ms warm)

## Local development

Observability is optional locally. To test Sentry:

```sh
# apps/web/.env.local
NEXT_PUBLIC_SENTRY_DSN=…
SENTRY_DSN=…
```

Vercel Analytics events only appear in the Vercel dashboard after deploy.

## Privacy

Product events intentionally exclude names, DNI, emails, and QR tokens. Sentry: configure data scrubbing in project settings before F&F.

## Related

- Deploy checklist: see release PR template `.github/pull_request_template/production.md`
- CI: `pnpm run ci` (lint, types, test, build) before merge
