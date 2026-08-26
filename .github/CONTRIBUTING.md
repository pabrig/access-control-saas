# Git and CI

Solo workflow, parameterized so a second person (or future you) can follow the same gates.

## Branches

| Branch      | Role             | GitHub Actions gate   |
| ----------- | ---------------- | --------------------- |
| `feature/*` | Work in progress | none until a PR opens |
| `develop`   | Integration      | `integration`         |
| `main`      | Production       | `production`          |

```
feature/*  --squash PR-->  develop  --release PR-->  main
                 hotfix/*  --------------------fix PR-->  main
```

Never commit straight to `develop` or `main`. Open a PR so CI and the title check run.

## Commits

Use [Conventional Commits](https://www.conventionalcommits.org/) in English:

```
feat(web): list invitations under RLS
fix(api): reject expired QR tokens
chore: ignore local supabase temp files
```

Types: `feat`, `fix`, `hotfix`, `docs`, `refactor`, `test`, `chore`, `ci`, `revert`, `release`.

Optional scopes: `web`, `api`, `db`, `docs`, `ci`.

On feature branches, messy WIP commits are fine. **Squash-merge** into `develop` so the PR title becomes the only commit on `develop`.

## Pull requests

| Into      | Template   | Title                              | Merge style  |
| --------- | ---------- | ---------------------------------- | ------------ |
| `develop` | Feature    | `feat:` / `fix:` / `chore:` / …    | Squash       |
| `main`    | Production | `release:` (or `hotfix:` / `fix:`) | Merge commit |

GitHub checks:

1. **PR conventions** — title matches the table above.
2. **Quality (integration)** — lint, types, build, format on PRs to `develop`.
3. **Quality (production)** — the same jobs, `gate=production`, on PRs to `main`.

Local equivalent: `pnpm ci`.

## Variables

Repo Actions variables (optional, with CI placeholders if unset):

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

Do not put `SERVICE_ROLE` in Actions variables that a Next build can leak. When deploys exist, store it as an environment secret on `production` only.
