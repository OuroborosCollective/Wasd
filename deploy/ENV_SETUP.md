# .env einrichten — ohne SSH-Kommandos-Chaos

Secrets gehören **nicht** ins Git. Diese Anleitung nutzt **Kopieren per Datei** (SCP, SFTP, Panel „Dateimanager“, WinSCP, FileZilla).

## Einmalig: Vorlage auf den Server legen

**Option A — mit SCP vom eigenen PC** (Terminal auf **deinem** Rechner, nicht „irgendwo“):

```bash
scp /pfad/zum/repo/deploy/.env.production.template root@DEINE_SERVER_IP:/opt/areloria/.env
```

**Option B — ohne Terminal:** Datei `deploy/.env.production.template` aus dem Repo herunterladen, auf dem Server im Panel **umbenennen** nach `.env` und nach `/opt/areloria/` legen (oder per SFTP hochladen).

## Auf dem Server ausfüllen

Öffne `/opt/areloria/.env` im Editor (nano, vim, oder Hostinger-Dateieditor) und setze mindestens:

| Variable | Was |
|----------|-----|
| `FIREBASE_PROJECT_ID` | Aus Firebase Console |
| `FIREBASE_SERVICE_ACCOUNT_KEY` | Pfad zur JSON, z. B. `/opt/areloria/secrets/firebase-adminsdk.json` |
| `JWT_SECRET` | Lange zufällige Zeichenkette |
| `ADMIN_PANEL_TOKEN` | Langes Geheimnis für `/admin-content.html` |
| `PUBLIC_WEBSOCKET_URL` | z. B. `wss://deine-domain.tld/ws` |
| `USE_FIREBASE_WS_LOGIN` | `1` wenn Google-Login im Spiel soll |

Firebase-JSON auf den Server kopieren (wieder per SCP/SFTP), z. B. nach:

`/opt/areloria/secrets/firebase-adminsdk.json` — Rechte `600`.

Oder das Skript ausführen (nur **eine** Zeile, wenn du Shell-Zugang hast):

```bash
bash /opt/areloria/deploy/setup-firebase-service-account.sh /tmp/dein-key.json
```

## Client (Vite) — Firebase im Browser

Die **`VITE_*`** Variablen müssen **beim Build** gesetzt sein. Auf dem VPS vor `deploy/deploy.sh` dieselben Werte in der `.env` im **Repo-Root** haben, die der Build liest, **oder** in CI/CD setzen.

## Neustart

Wenn du **kein** SSH willst: im Hostinger-Panel **PM2** / **Node** neu starten, falls angeboten.

Mit Shell:

```bash
pm2 restart areloria
```

## Prüfen

Im Browser oder vom PC:

`https://deine-domain/health`  
oder `http://SERVER-IP:3000/health`

Dort siehst du `firebase.configured`, `firebase.initMode`, `auth.useFirebaseWsLogin`.

## Vollständige Liste aller Variablen

Siehe Repo-Root **`.env.example`** (Referenz) und **`deploy/.env.production.template`** (VPS-Mindestset).
