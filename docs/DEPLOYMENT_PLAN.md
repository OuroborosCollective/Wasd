# Deployment Plan (current)

## Zielumgebung (produktiv)
- VPS / Bare metal
- PM2 Prozessverwaltung
- Reverse Proxy (z. B. Nginx/Caddy) vor Port `3000`
- Optional PostgreSQL und Redis/Valkey als externe Services

## Grundprinzipien
- Keine Secrets im Repo
- Server bleibt autoritativ
- Client ist Darstellung + Input + UI
- `/health` ist zentrale Betriebsprüfung

## Reihenfolge für Rollout
1. `.env` aus `deploy/.env.production.template` bereitstellen
2. `pnpm install` + `pnpm run build`
3. PM2 mit `ecosystem.config.cjs` starten/restarten
4. Lokale Checks: `http://127.0.0.1:3000/health`, `/`, `/gm/`
5. Externe Checks über Domain (HTTPS + WSS)
6. Optional Content-Pack publizieren (`pnpm run content:publish`)

## Optionaler Zielpfad (Dokumentation / Legacy)
- Cloud-Deploy-Optionen (Cloud Run, andere Hosts) sind möglich, aber aktuell nicht die primäre Betriebsdoku.
