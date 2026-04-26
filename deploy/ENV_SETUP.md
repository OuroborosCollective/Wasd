# Production `.env` Setup (VPS)

This guide keeps secrets out of Git and sets up a stable live runtime at `/opt/areloria/.env`.

## 1) Copy template to VPS

From your local machine:

```bash
scp deploy/.env.production.template root@YOUR_SERVER:/opt/areloria/.env
```

Or upload with SFTP / provider file manager.

## 2) Fill required values

Edit `/opt/areloria/.env` and set at minimum:

- `NODE_ENV=production`
- `PORT=3000`
- `PUBLIC_WEBSOCKET_URL=wss://your-domain/ws`
- `JWT_SECRET=<long-random-secret>`
- `ADMIN_PANEL_TOKEN=<long-random-secret>`
- `PLAYTESTER_MONITOR_TOKEN=<long-random-secret>`
- `SUPABASE_URL` (or `SUPABASE_PUBLIC_URL`)
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_JWT_SECRET`
- `USE_SUPABASE_WS_LOGIN=1`
- `REQUIRE_SUPABASE_AUTH=1` (recommended for strict production auth)
- `DATABASE_URL=<postgres-url>` (if Postgres persistence is desired)
- `PERSISTENCE_DRIVER=auto` (or `postgres` / `file`)

Optional:

- `ALLOW_GUEST_LOGIN=0` in production for stricter login policy
- `STATE_BROADCAST_INTERVAL_MOBILE_MS=...`
- `PLAYTESTER_*` stream tuning values
- `CACHE_URL` and/or `REDIS_URL`
- `CONTENT_ADMIN_READONLY=1` to freeze content writes

## 3) Restart service

```bash
cd /opt/areloria
pm2 restart areloria
```

## 4) Verify runtime

```bash
curl -s http://127.0.0.1:3000/health
```

Expect at least:

- `ok: true`
- `auth.useSupabaseWsLogin`
- `auth.requireSupabaseAuth`
- `persistence.persistenceDriver`
- `content.mode` and `content.root`
- `playtester` block (if enabled)

## 5) Notes

- The client reads Supabase public values from build-time `VITE_SUPABASE_*` and runtime `/client-config.json`.
- Never commit real `.env` values.
- Keep deployment + health behavior aligned with `DEPLOYMENT.md` and `.env.example`.
