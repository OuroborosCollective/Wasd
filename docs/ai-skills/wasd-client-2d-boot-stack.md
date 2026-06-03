# Areloria Client-2D Boot Stack

## Overview

Der Areloria 2D MMORPG Client verwendet einen modularen Boot-Stack für deterministisches Laden, PWA-Installierbarkeit und Offline-Support.

## Boot Flow

```
Browser / Android / WebView
        ↓
index.html (Ultimate App-Shell)
        ↓
main.tsx (Error Handler + SW Registration)
        ↓
GameBoot.tsx (Boot State Machine)
        ↓
clientHealth.ts + BootOverlay.tsx
        ↓
PIXI Client + Logic Clock (10Hz)
        ↓
WebSocket Gateway (networkClient.ts)
        ↓
ARE / Ouroboros / Plexity Layer
```

## Boot Phases

| Phase | Beschreibung |
|-------|--------------|
| `BOOTING` | Initiale Client-Mount |
| `CHECKING_DEVICE` | WebGL + Browser-Check |
| `CHECKING_SERVER` | Server-Connection-Test |
| `LOADING_ASSETS` | Asset-Preload |
| `CONNECTING_WORLD` | WebSocket-Verbindung |
| `SYNCING_TICK` | Tick-Synchronisation |
| `READY` | Spiel bereit |
| `DEGRADED` | Reduzierter Modus |
| `OFFLINE` | Offline ohne Server |
| `FATAL` | Kritischer Fehler |

## Key Components

### 1. boot.config.ts

Zentrale Konfiguration für alle Client-Einstellungen:

```typescript
export const ARELORIA_BOOT_CONFIG: AreloriaBootConfig = {
  appName: "Areloria",
  clientId: "REAL_PIXI_CLIENT",
  engine: "PIXI_2D",
  logicHz: 10,
  renderMaxFps: 60,
  mode: "production",
  network: { wsUrl, healthUrl, reconnectMinMs, heartbeatMs },
  world: { chunkSize, observerRadiusChunks, interpolationMs },
  design: { theme: "cyber_zen", showDebugHud: true },
  are: { enabled: true, kappaInvariant: 1000, plexityGate: true }
};
```

### 2. logicClock.ts

Deterministische 10Hz-Logik-Loop:

```typescript
const clock = createLogicClock({
  hz: 10,
  onTick: (tick) => {
    // tick.tickId, tick.fixedDtMs, tick.fixedDtSec
  }
});
clock.start();
```

### 3. clientHealth.ts

Device-Diagnose für "Endlos-Lade-Screen"-Vermeidung:

- WebGL availability check
- Online/Offline detection
- Viewport minimum (320x240)
- WebGL renderer info

### 4. service-worker.js

Offline/Cache-Strategie:

- Cache-first für static assets
- Network-fallback bei API calls
- Automatische Cache-Cleanup

## PWA Setup

### manifest.webmanifest

```json
{
  "name": "Areloria",
  "short_name": "Areloria",
  "display": "fullscreen",
  "orientation": "landscape",
  "background_color": "#070711",
  "theme_color": "#0f0f1a",
  "icons": [...]
}
```

### index.html Meta Tags

- `mobile-web-app-capable: yes`
- `apple-mobile-web-app-*` für iOS
- `theme-color: #0f0f1a`

## Environment Variables

```bash
VITE_ARELORIA_MODE=production
VITE_WS_URL=wss://domain.com/ws
VITE_HEALTH_URL=/health
```

## Docker Build

Der `Dockerfile.vps` buildet automatisch:

1. `pnpm --filter @wasd/client-2d build`
2. Kopiert `public/assets/` → `dist/assets/`
3. Kopiert `public/manifest.webmanifest` → `dist/`
4. Kopiert `public/service-worker.js` → `dist/`
5. Erstellt `build-stamp.json` mit commit-SHA

Validierung im Docker:
```bash
test -f /app/client/dist/2d/manifest.webmanifest
test -f /app/client/dist/2d/service-worker.js
```

## Deployment Workflow

1. **GitHub Actions** (`vps-docker-deploy.yml`):
   - Build client-2d
   - Verify PWA files
   - Create `build-stamp.json`
   - Upload to VPS

2. **VPS Deploy Script** (`deploy-vps-docker.sh`):
   - Validate Dockerfile includes PWA
   - Build Docker image
   - Health check `/2d/build-stamp.json`

## Best Practices

1. **Never show black screen**: Boot-Phasen immer sichtbar
2. **Error boundaries**: Global Error Handler in `main.tsx`
3. **Deterministic timing**: 10Hz fixed timestep für Logik
4. **Offline-first**: Service Worker für Cache
5. **Version pinning**: `build-stamp.json` mit commit-SHA

## Related Files

- `apps/client-2d/index.html` - Ultimate App-Shell
- `apps/client-2d/src/main.tsx` - Entry mit Error Handling
- `apps/client-2d/src/ui/GameBoot.tsx` - Boot State Machine
- `apps/client-2d/src/boot/boot.config.ts` - Zentral Config
- `apps/client-2d/src/logic/logicClock.ts` - 10Hz Loop
- `apps/client-2d/src/system/clientHealth.ts` - Device Check
- `apps/client-2d/src/engine/pixiClient.ts` - PIXI Renderer
- `apps/client-2d/public/manifest.webmanifest` - PWA Manifest
- `apps/client-2d/public/service-worker.js` - Offline Cache