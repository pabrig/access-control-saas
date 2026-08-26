## Summary

Promote `develop` → `main`.

-

## Gate

- Target: `main` (production)
- Title must be `release: …` (or `hotfix:` / `fix:` for emergency)

## Test plan

- [ ] Integration CI on `develop` is green
- [ ] Production CI on this PR is green
- [ ] Smoke: admin login + one QR validation against the hosted project
- [ ] Migrations already applied to the hosted DB (or listed below)

## Rollback

- Revert this merge on `main` and redeploy the previous SHA.
