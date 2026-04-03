# Areloria MMORPG – Deployment Guide

**Client:** Babylon.js (Vite build). **Server:** Node + WebSocket. Status: `docs/PROJECT_STATUS_2026.md`.

## GitHub Actions → VPS (Continuous Deployment)

Workflow: **`.github/workflows/deploy.yml`** (Push auf `main` und manuell **`workflow_dispatch`** — kein stündlicher Cron).

**Repository-Secrets (Settings → Secrets and variables → Actions):**

| Secret | Bedeutung |
|--------|-----------|
| `VPS_IP` | Hostname oder IP des Servers |
| `VPS_USER` | SSH-Benutzer (z. B. `root`) |
| `VPS_SSH_PASSWORD` | Passwort für SSH (oder Key-basiertes Setup später) |
| `DEPLOY_VERIFY_BASE_URL` | **Optional:** öffentliche Basis-URL **ohne** trailing slash (z. B. `https://deine-spiel-domain.tld`). Gesetzt = nach Deploy werden **`/health`**, **`/`**, **`/gm/`** per HTTPS geprüft. **Nicht** gesetzt = nur SSH-Deploy, kein externer Check (DNS/SSL kann später nachgezogen werden). |

Auf dem Server führt der Job **`deploy/deploy.sh`** aus: **pnpm** + **`pnpm install --frozen-lockfile`** am Repo-Root (wie CI), dann **`pnpm run build`**. SSH-Schritt hat **45 Minuten** Timeout für große Client-Builds.

**Lokal (Entwickler):** `pnpm run ci:verify` = Lint, Tests, Build, Modell-Pfad-Audit (ohne Playwright). Voll wie GitHub: danach `pnpm run test:e2e:ci`.

**Auf dem VPS nach Deploy:** `bash deploy/verify-vps-local.sh` (prüft `/health`, `/`, `/gm/` auf `127.0.0.1:3000`).

Ausführliches Runbook: **`docs/CI_VPS_RUNBOOK.md`**.

## Schnellstart (VPS Hostinger)

### 1. SSH in deinen VPS einloggen
```bash
ssh root@srv1491137.hstgr.cloud
```

### 2. Deployment-Skript ausführen
```bash
curl -fsSL https://raw.githubusercontent.com/OuroborosCollective/Wasd/main/deploy/deploy.sh | bash
```

Oder manuell:
```bash
git clone https://github.com/OuroborosCollective/Wasd.git /opt/areloria
cd /opt/areloria
chmod +x deploy/deploy.sh
./deploy/deploy.sh
```

### 3. .env konfigurieren
```bash
nano /opt/areloria/.env
# Fülle PGPASSWORD und JWT_SECRET aus
```

### Firebase Admin auf dem VPS (Node — Token-Verifikation / Firestore)

Der **private Service-Account-JSON-Key** gehört **nicht** ins Git. Auf dem Server:

1. **JSON von der Firebase/Google Cloud Console** herunterladen (einmalig).
2. Auf den VPS kopieren und installieren:
   ```bash
   cd /opt/areloria
   chmod +x deploy/setup-firebase-service-account.sh
   ./deploy/setup-firebase-service-account.sh /root/firebase-adminsdk-xxxxx.json
   ```
   Oder manuell nach `/opt/areloria/secrets/firebase-adminsdk.json` legen (`chmod 600`) — beim nächsten **`./deploy/deploy.sh`** wird in `.env` automatisch  
   `FIREBASE_SERVICE_ACCOUNT_KEY=/opt/areloria/secrets/firebase-adminsdk.json` ergänzt, **falls** die Zeile noch fehlt.

3. Optional in `.env`: **`FIREBASE_PROJECT_ID=…`** (Projekt-ID aus der Console), falls sie nicht im JSON steht.

4. **Neustart:** `pm2 restart areloria`  
   Prüfen: `curl -s http://127.0.0.1:3000/health` → `persistence` / Firebase-Hinweise.

**Alternative (Application Default Credentials, wie `admin.credential.applicationDefault()`):**  
In `.env` **`FIREBASE_SERVICE_ACCOUNT_KEY` leer lassen** und setzen:

```bash
GOOGLE_APPLICATION_CREDENTIALS=/opt/areloria/secrets/firebase-adminsdk.json
FIREBASE_PROJECT_ID=deine-gcp-projekt-id
```

Der Server initialisiert dann mit **`applicationDefault()`** (liest die JSON-Datei über `GOOGLE_APPLICATION_CREDENTIALS`). Auf **GCP** (Compute Engine / Cloud Run mit Dienstkonto) reicht oft **`FIREBASE_ADMIN_USE_APPLICATION_DEFAULT=1`** + **`FIREBASE_PROJECT_ID`**.

**Client (Vite):** Weiterhin **`VITE_FIREBASE_*`** in `.env` am Repo-Root setzen (Build), damit Browser-Login und Projekt zum Admin-Key passen.

**Spieler-Persistenz (ohne Firestore):** Der Server schreibt nach `data/players.json` (Repo-Root) bzw. `PLAYER_SAVE_FILE`. Diese Datei bei Deploys/Backups **mit sichern** — sonst gehen Charaktere verloren.

**Login:** In Production ist ohne `FIREBASE_SERVICE_ACCOUNT_KEY` nur **Gast-Login** möglich, wenn `ALLOW_GUEST_LOGIN=1` gesetzt ist; sonst müssen Clients ein Firebase **ID-Token** mitsenden. Development: `dev_*`-Login per Socket-ID, abschaltbar mit `ALLOW_DEV_LOGIN=0`. **`REQUIRE_FIREBASE_AUTH=1`** erzwingt ausschließlich Token-Login (kein Gast/Dev); ohne konfiguriertes Firebase-Admin-Key meldet der Server einen klaren Fehler.

**Client-Build:** Für Google/Email-Login im Browser die **Vite-Variablen** `VITE_FIREBASE_*` (und optional `VITE_FIRESTORE_DATABASE_ID`) setzen — siehe `.env.example`. Ohne diese Keys nutzt der Build weiterhin `firebase-applet-config.json` im Repo-Root (nur für Entwicklung geeignet). Nach Login refresht der Client das **ID-Token** automatisch und reconnectet die WebSocket.

**WebSocket-Schutz:** Max. Nachrichtengröße und Rate-Limit pro Verbindung sind in `GameConfig` (`wsMaxMessageBytes`, `wsMaxMessagesPerSecond`).

**Health-Endpoint:** `GET /health` liefert u. a. `persistence` (`lastSaveAt`, `lastSaveDurationMs`, `firestoreConfigured`, `lastSaveError`) für Monitoring.

### 4. Server starten

Nach Änderungen an `ecosystem.config.cjs` oder `CLIENT_ROOT_DIR` reicht `pm2 restart` oft nicht (alte `cwd`/Env). Besser wie im Repo-Skript:

```bash
cd /opt/areloria && ./deploy/update.sh
```

Oder manuell: `pm2 stop areloria && pm2 delete areloria && pm2 start ecosystem.config.cjs`

### Client-Pfad auf dem VPS (schwarze / leere Seite)

Wenn der Node-Prozess nur unter `server/` läuft oder `cwd` nicht das Repo-Root ist, kann der Server fälschlich `/opt/client/dist` statt `/opt/areloria/client/dist` bedienen. Abgeholfen wird durch **Repo-Root als `cwd`** und optional **`CLIENT_ROOT_DIR`**.

Nach `git pull` auf dem VPS (Branch mit dem Fix):

```bash
cd /opt/areloria
APP_DIR=/opt/areloria bash deploy/write_pm2_ecosystem.sh
pm2 stop areloria 2>/dev/null; pm2 delete areloria 2>/dev/null; pm2 start ecosystem.config.cjs
```

Oder dauerhaft in `/opt/areloria/.env` ergänzen: `CLIENT_ROOT_DIR=/opt/areloria/client`

### GitHub Actions „Continuous Deployment to VPS“

Der Workflow setzt `CI=1`, sodass `deploy.sh` kein `apt-get upgrade` mehr ausführt (das bricht oft bei SSH ohne TTY). Für manuelle Runs auf dem Server: `SKIP_APT_UPGRADE=1 ./deploy/deploy.sh`. Nach dem ersten Setup nutzt der Workflow `deploy/update.sh` (Pull, Build, PM2 neu starten aus `ecosystem.config.cjs`).

Am Ende des SSH-Skripts: **`curl http://127.0.0.1:3000/health`** – schlägt fehl, wenn der Dienst nicht lauscht (Job wird rot). Zum Überspringen in `.github/workflows/deploy.yml` vor dem Deploy z. B. `export SKIP_DEPLOY_HEALTH_CHECK=1` setzen (nur wenn der Server auf einem anderen Port läuft o. Ä.).

### GitHub Action: `dial tcp …:22: i/o timeout`

Der Runner erreicht den VPS **nicht** auf SSH (Port 22). Typisch:

- Firewall / **ufw** auf dem VPS: Port 22 für **eingehend** erlauben (oder nur für GitHub – siehe [GitHub Meta API](https://api.github.com/meta) unter `actions` für IP-Ranges, falls du einschränken willst).
- **Falsche `VPS_IP`** oder Server aus / Netzwerkproblem.
- SSH auf **anderem Port**: Secret `VPS_IP` kann bei manchen Setups nicht den Port setzen – ggf. Workflow auf `port: DEIN_PORT` anpassen oder SSH auf 22 legen.

Der Workflow nutzt `timeout: 120s` für den Verbindungsaufbau; bei dauerhaftem Timeout ist es fast immer **Netzwerk/Firewall**, nicht der Build.

Wenn der Client-Build mit **„JavaScript heap out of memory“** abbricht, nutzt `client` bereits ein erhöhtes Limit (`--max-old-space-size=6144` im `build`-Script). Bei sehr kleinen VPS-Plänen ggf. Swap erhöhen oder Build lokal/GitHub Actions ausführen und nur `client/dist` deployen.

---

## Tastenkürzel im Spiel

| Taste | Funktion |
|-------|----------|
| **F1** | GM/Admin Panel (No-Code World Editor) |
| **F2** | Matrix Energy Shop (PayPal) |
| **F3** | GLB 3D-Modell Manager |
| **F4** | Charakter Editor |
| **L** | Land beanspruchen |
| **WASD** | Bewegen |
| **E** | Interagieren |
| **F** | Angreifen |
| **G** | Equipment anlegen |
| **I** | Inventar |
| **Q** | Quest-Log |
| **K** | Skills |
| **M** | Karte |

---

## GM Panel Features (F1)

- **🌍 Welt-Editor**: Wetter, Tageszeit, Objekte platzieren, Welt-Events triggern
- **👤 NPC-Spawner**: NPCs spawnen/entfernen, Dialogue-Editor
- **📜 Quest-Builder**: Visueller Quest-Baukasten mit Templates
- **📦 3D-Modell-Manager**: GLB-Modelle registrieren, NPCs zuweisen
- **💰 Wirtschafts-Dashboard**: Preise setzen, Wirtschafts-Events
- **👥 Spieler-Management**: Items geben, Stats editieren, Kick/Ban/Mute/Teleport
- **🏰 Nationen/Diplomatie**: Nationen gründen, Beziehungen setzen

---

## Charakter-System

### Modulare Charaktere
- **2 Basis-Körper**: Body_male.glb, Body_female.glb (mit 5 Animationen)
- **4 Köpfe**: Head_male1, Head_male2, Head_female1, Head_female2
- **2 NPC-Modelle**: npc_warrior1.glb, humanknight.glb
- **Hautfarben**: 8 Varianten (hell bis dunkel)
- **Haarfarben**: 10 Varianten
- **Augenfarben**: 8 Varianten
- **Körperbau**: Größe, Breite, Muskeln (Slider)

### Weitere Modelle hinzufügen
1. GLB-Datei in `server/public/models/characters/bodies/` oder `heads/` ablegen
2. `character-manifest.json` aktualisieren
3. Server neu starten

---

## PayPal Shop

### Matrix Energy Pakete
| Paket | Preis | Matrix Energy |
|-------|-------|---------------|
| Starter | 4,99 € | 100 ME |
| Abenteurer | 19,99 € | 500 ME |
| Held | 39,99 € | 1.200 ME |
| Legende | 79,99 € | 3.000 ME |

### GLB Creator Pass
- **15 € / Monat** – Schaltet eigene GLB-Modelle hochladen frei
- Modelle auf eigenem Land platzieren
- Modelle auf dem Marktplatz verkaufen (90% Umsatzbeteiligung)

---

## Datenbank (Azure PostgreSQL)

**Host**: `are.postgres.database.azure.com`  
**Port**: `5432`  
**Datenbank**: `areloria`  
**User**: `Thosu`

### Tabellen
- `players` – Spielerdaten, Appearance, Stats
- `paypal_orders` – Zahlungshistorie
- `player_glb_models` – Hochgeladene 3D-Modelle
- `land_plots` – Grundstücke
- `marketplace_transactions` – Marktplatz-Käufe
- `nations` – Nationen und Diplomatie
- `chat_messages` – Chat-Verlauf
- `world_state` – Weltzustand

---

## Firebase Auth

**Projekt**: `studio-8985161445-f6ce5`  
**Auth Domain**: `studio-8985161445-f6ce5.firebaseapp.com`

Füge deine Server-Domain in der Firebase Console als autorisierte Domain hinzu:
1. Firebase Console → Authentifizierung → Einstellungen → Autorisierte Domains
2. `srv1491137.hstgr.cloud` hinzufügen

---

## Nächste Schritte

1. [ ] Weitere GLB-Modelle für NPCs und Spieler erstellen
2. [ ] Nginx als Reverse Proxy einrichten (Port 80/443)
3. [ ] SSL-Zertifikat mit Let's Encrypt einrichten
4. [ ] Domain auf den VPS zeigen lassen
5. [ ] Weitere Quests und Dialoge im GM-Panel erstellen
6. [ ] Gilden-System und Nationen-Diplomatie ausbauen
7. [ ] Mehr Items und Crafting-Rezepte hinzufügen
