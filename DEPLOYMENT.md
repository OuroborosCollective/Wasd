# Areloria MMORPG – Deployment Guide

## Schnellstart (VPS Hostinger)

### 1. SSH in deinen VPS einloggen
```bash
ssh root@srv1491137.hstgr.cloud
```

### 2. Deployment-Skript ausführen
```bash
curl -fsSL https://raw.githubusercontent.com/thosu87-svg/Wasd/main/deploy/deploy.sh | bash
```

Oder manuell:
```bash
git clone https://github.com/thosu87-svg/Wasd.git /opt/areloria
cd /opt/areloria
chmod +x deploy/deploy.sh
./deploy/deploy.sh
```

### 3. .env konfigurieren
```bash
nano /opt/areloria/.env
# Fülle PGPASSWORD und JWT_SECRET aus
```

### 4. Server starten
```bash
pm2 restart areloria
```

### Client-Pfad auf dem VPS (schwarze / leere Seite)

Wenn der Node-Prozess nur unter `server/` läuft oder `cwd` nicht das Repo-Root ist, kann der Server fälschlich `/opt/client/dist` statt `/opt/areloria/client/dist` bedienen. Abgeholfen wird durch **Repo-Root als `cwd`** und optional **`CLIENT_ROOT_DIR`**.

Nach `git pull` auf dem VPS (Branch mit dem Fix):

```bash
cd /opt/areloria
APP_DIR=/opt/areloria bash deploy/write_pm2_ecosystem.sh
pm2 restart areloria
```

Oder dauerhaft in `/opt/areloria/.env` ergänzen: `CLIENT_ROOT_DIR=/opt/areloria/client`

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
