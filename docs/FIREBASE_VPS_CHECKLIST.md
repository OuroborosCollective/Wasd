# Firebase auf dem VPS — Checkliste (alle Schritte)

## 1. Server aktualisieren

```bash
cd /opt/areloria
git pull origin main
bash deploy/pull-and-deploy.sh
# oder: pm2 restart areloria
```

## 2. Admin SDK (eine Variante wählen)

**A — Pfad zur JSON-Datei (empfohlen)**

```bash
./deploy/setup-firebase-service-account.sh /pfad/zum/firebase-adminsdk.json
```

Setzt u. a. `FIREBASE_SERVICE_ACCOUNT_KEY` und `GOOGLE_APPLICATION_CREDENTIALS`.

**B — Nur Application Default (wie `applicationDefault()` im Node-Snippet)**

In `.env`:

```bash
FIREBASE_SERVICE_ACCOUNT_KEY=
GOOGLE_APPLICATION_CREDENTIALS=/opt/areloria/secrets/firebase-adminsdk.json
FIREBASE_PROJECT_ID=deine-projekt-id
```

**C — GCP mit Metadaten-Dienstkonto**

```bash
FIREBASE_ADMIN_USE_APPLICATION_DEFAULT=1
FIREBASE_PROJECT_ID=deine-projekt-id
```

## 3. WebSocket-Login mit Firebase-JWT

In `.env`:

```bash
USE_FIREBASE_WS_LOGIN=1
```

(Optional streng: `REQUIRE_FIREBASE_AUTH=1`, `ALLOW_GUEST_LOGIN=0` — nur wenn gewollt.)

## 4. Client-Build (Google-Login im Browser)

`.env` am Repo-Root / Build-Env:

```bash
VITE_DISABLE_FIREBASE_AUTH=0
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
# … siehe .env.example
```

Dann Client neu bauen und deployen.

## 5. Prüfen

```bash
curl -s http://127.0.0.1:3000/health | jq .
```

Erwartung unter `firebase`:

- `configured: true`
- `initMode`: `"cert"` oder `"application_default"`
- `projectId`: euer Projekt

Unter `auth`: `useFirebaseWsLogin` entsprechend `.env`.

**Admin-API (Firebase-JWT):** Ohne `ADMIN_PANEL_TOKEN` kannst du mit `Authorization: Bearer <Firebase-ID-Token>` `GET /api/admin/content/meta` aufrufen (UID ggf. in `ADMIN_UID_ALLOWLIST`).

## 6. Typische Fehler

| Symptom | Prüfen |
|---------|--------|
| `invalid_token` | Gleiches Projekt wie Client? `FIREBASE_PROJECT_ID`? Key nicht abgelaufen? |
| Admin 503 | `firebase.configured` in `/health` false → Credentials / Pfad |
| Nur Gast im Spiel | `USE_FIREBASE_WS_LOGIN=0` oder Client sendet kein Token |

Siehe auch `DEPLOYMENT.md` und `AGENTS.md`.
