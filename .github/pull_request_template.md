## Summary

-

## Gate

- Target: `develop` (integration) unless this is a `release:` into `main`
- Type: `feat` / `fix` / `chore` / `docs` / `ci` / `refactor` / `test` / `release`

## Test plan

- [ ] `pnpm ci` locally (lint, types, build)
- [ ] Exercise the changed flow in the browser or via the API
- [ ] No secrets committed (`.env`, service_role)
