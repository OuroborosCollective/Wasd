# Supabase migration: ENV + GitHub Secrets mapping

This document lists which values belong on the VPS runtime `.env` and which are optional in GitHub repository secrets.

## Important security note

If credentials were shared in chat/messages, rotate them immediately:

- `POSTGRES_PASSWORD`
- `JWT_SECRET` / `SUPABASE_JWT_SECRET`
- `SERVICE_ROLE_KEY`
- `DASHBOARD_PASSWORD`
- any S3 protocol secrets

## 1) VPS runtime env (`/opt/areloria/.env`)

Required for Supabase auth + Postgres persistence:

- `VITE_AUTH_PROVIDER=supabase`
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLIC_URL` (same as URL if no separate public endpoint)
- `VITE_SUPABASE_ANON_KEY`
- `SUPABASE_URL` (server-side optional metadata; recommended)
- `SUPABASE_PUBLIC_URL` (server-side optional metadata; recommended)
- `SUPABASE_ANON_KEY` (server optional)
- `SUPABASE_SERVICE_ROLE_KEY` (server optional, keep secret)
- `SUPABASE_JWT_SECRET` (or fallback `JWT_SECRET`)
- `USE_SUPABASE_WS_LOGIN=1`
- `REQUIRE_SUPABASE_AUTH=1` (recommended in production)
- `DATABASE_URL` (recommended) or `PGHOST`/`PGPORT`/`PGDATABASE`/`PGUSER`/`PGPASSWORD`
- `PERSISTENCE_DRIVER=postgres` (or `auto`, which now prefers Postgres)

Still recommended:

- `ALLOW_GUEST_LOGIN=0` in production auth-only mode
- `ALLOW_DEV_LOGIN=0`
- `ADMIN_PANEL_TOKEN` (for content admin fallback auth)

## 2) GitHub repository secrets

Currently required by `.github/workflows/deploy.yml`:

- `VPS_IP`
- `VPS_USER`
- `VPS_SSH_PASSWORD`
- `DEPLOY_VERIFY_BASE_URL` (optional)

Optional to store as backup/reference for operators (not consumed directly by workflow yet):

- `SUPABASE_URL`
- `SUPABASE_PUBLIC_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_JWT_SECRET`
- `DATABASE_URL`
- `PGHOST`
- `PGPORT`
- `PGDATABASE`
- `PGUSER`
- `PGPASSWORD`

> If you want, add a follow-up workflow step that syncs those optional secrets into `/opt/areloria/.env` during deploy. This repo currently expects runtime env values to already exist on the VPS.

