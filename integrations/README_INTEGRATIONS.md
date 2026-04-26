# Integrations

Produktive Integrationen im aktuellen Stack:

- Supabase (Auth + optional Postgres stack)
- PostgreSQL (Persistence driver `postgres` / `auto`)
- Redis / Valkey (`ioredis`, optional cache/chat relay)
- Playtester WebRTC signaling/streaming
- MCP admin routes
- External LLM providers (module-scoped usage)

Historische Firebase-/AWS-Notizen sind als Legacy in einzelnen Alt-Dokumenten markiert und nicht mehr die primäre Betriebsanleitung.

Wichtig: Keine Secrets im Repo speichern; nur `.env`/Secret-Store.
