# HARTE GAP-ANALYSE: 10-Punkte-Integration-Offensive

**Datum:** 2026-06-05  
**Repository:** OuroborosCollective/Wasd  
**Bewertungsgrundlage:** Harte Evidenz ohne Schönfärberei

---

## ZUSAMMENFASSUNG

Der vorherige Audit hat "vorhanden" mit "fertig integriert" verwechselt. Diese Analyse liefert harte Beweise.

---

## PUNKT 1: MODULE-AUDIT

| Status | **PARTIAL** |
|--------|-------------|
| **Beweis** | `server/src/modules/bootstrap/ModuleRegistry.ts` - existiert |
| **Code** | ```typescript
export class ModuleRegistry {
  private modules = new Map<string, any>();
  register(name: string, instance: any) { ... }
  get(name: string) { ... }
  list() { return [...this.modules.keys()]; }
}
``` |
| **Problem** | Kein `runtimeSurface`-Feld. Keine Markierung für `client-2d | client-3d | server | portal | tooling`. Die Registry ist nur ein simpler Map-Store ohne Surface-Typ-Klassifizierung. |
| **Fehlendes Artefakt** | `runtimeSurface: "client-2d" | "client-3d" | "server" | "portal" | "tooling"` Feld in jedem registrierten Modul |
| **Nächster Patch** | 1. `server/src/modules/bootstrap/ModuleRegistry.ts` - runtimeSurface enum und Type erweitern  
2. `apps/client-2d/src/` - Surface-Marker bei Module-Registrierung  
3. `packages/core-logic/src/` - Surface-Marker für Logik-Module |

---

## PUNKT 2: LIVE-CLIENT

| Status | **PARTIAL** |
|--------|-------------|
| **Beweis** | `apps/client-2d/src/main.tsx` - Entry existiert |
| **Integration** | ```tsx
<CyberZenLoginGate>
  <DeterministicWorldIsoApp />
  <LiveRealityBridge />
  <WorldHeartMonitor />
  <PixiModuleInspector />
  <MobileMovePad />
  <KenneyUiLiveSkinBadge />
  <InteractionOverlayRoot />
  <UIOverlayLayer />
</CyberZenLoginGate>
``` |
| **Problem** | Integration ist vorhanden, aber keine maschinelle Bestätigung dass alle Systeme funktionieren |
| **Fehlendes Artefakt** | Kein Integrationstest der prüft, ob alle Komponenten nach dem Mount erreichbar sind |
| **Nächster Patch** | 1. `apps/client-2d/src/main.tsx` - mount-verification Test  
2. `tests/integration/client-bootstrap.test.ts` - neuer Test  
3. `e2e/client-2d-mount.spec.ts` - E2E Test für Mount |

---

## PUNKT 3: MODULE REGISTRY

| Status | **MISSING** |
|--------|-------------|
| **Was existiert** | `apps/client-2d/src/client2dPixiModules.ts` - Pixi-Policy/Kit-Datei |
| **Code** | ```typescript
export const CLIENT_2D_PIXI_MODULE_DECISIONS: readonly Client2DPixiModuleDecision[] = [
  { id: "pixi.js", use: "core", purpose: "..." },
  { id: "@pixi/tilemap", use: "optional", ... },
  { id: "pixi-action / pixi-tween", use: "avoid", ... }
];
export const CLIENT_2D_VISUAL_POLICY = {
  gameplayAuthority: "server-10hz-worldtick"
};
``` |
| **Problem** | Das ist eine Pixi-Policy, KEINE globale Module Registry. PixiModuleInspector zeigt NUR core/optional/avoid für Pixi-Module. Es fehlt eine Registry für: Inventory, Equipment, Quest, ARE, SelfHeal, Watchdog, Server, Portal, 3D. |
| **Fehlendes Artefakt** | Globale `ModuleRegistry.ts` mit Surface-Typ-Markierung für alle Systeme |
| **Nächster Patch** | 1. `apps/client-2d/src/ModuleRegistry.ts` - neue globale Registry  
2. `apps/client-2d/src/PixiModuleInspector.tsx` - erweitern für alle Module  
3. `apps/client-2d/src/ArelorianStitchHud.tsx` - Registry-Debug-Panel |

---

## PUNKT 4: VERTICAL SLICE

| Status | **PARTIAL** |
|--------|-------------|
| **Beweis** | `apps/client-2d/src/ArelorianStitchHud.tsx` Zeilen 449-417 |
| **Problem** | Einige Panels sind PREVIEW/PREVIEW, nicht vollständig spielmechanisch integriert |
| **Code** | ```tsx
function QuestPreview() {
  return <div className="stitch-grid-panel">
    <Info label="First Steps" value="available" />
    <Info label="Oracle Echo" value="hidden" />
    <Info label="Warfront Aid" value="locked" />
    <Info label="Crafting" value="pending" />
  </div>;
}
function GuildPreview() {
  return <div className="stitch-grid-panel">
    <Info label="Guild" value="unclaimed" />
    <Info label="Village Rights" value="50 members" />
    <Info label="Treasury" value="offline" />
    <Info label="Rank" value="observer" />
  </div>;
}
function MapPreview() {
  return <div className="stitch-map-preview">
    <span /><span /><span /><span />
    <b>Millbrook</b>
  </div>;
}
``` |
| **Was funktioniert** | Inventory, Character, Combat (teilweise) |
| **Was PREVIEW ist** | Quest (statische Texte), Guild (keine Daten), Factions (keine Daten), Map (nur Placeholder-Icons) |
| **Fehlendes Artefakt** | Vollständig spielmechanisch integrierte Panels mit Server-Daten |
| **Nächster Patch** | 1. `apps/client-2d/src/ui/QuestJournal.tsx` - echte Quest-Daten vom Server  
2. `apps/client-2d/src/ui/GuildPanel.tsx` - Guild-Daten integrieren  
3. `apps/client-2d/src/ui/FactionPanel.tsx` - Faction-Reputation vom Server |

---

## PUNKT 5: ARE PANEL

| Status | **MISSING** |
|--------|-------------|
| **Was existiert** | `apps/client-2d/src/WorldHeartMonitor.tsx` - zeigt Entropy, Stability, NPC Critical/Decomposition |
| **Was fehlt** | ARE-spezifische Werte im Debug-Panel: **kappa**, **tickId**, **observerCount**, **replayHash** |
| **ArelorianStitchHud Debug-Panel (Zeilen ~230-260):** | ```tsx
<div className="stitch-debug-row">
  <span>Server Tick:</span>
  <span>{debugServerTick != null ? debugServerTick : "waiting"}</span>
</div>
``` |
| **Problem** | Es gibt Server Tick, ABER es fehlen: ARE-Kappa, Replay-Hash, Observer-Count |
| **Fehlendes Artefakt** | ARE-spezifisches Debug-Panel mit kappa, tickId, observerCount, replayHash |
| **Nächster Patch** | 1. `apps/client-2d/src/AREHeartbeatPanel.tsx` - neues ARE-Panel  
2. `apps/client-2d/src/ArelorianStitchHud.tsx` - ARE-Panel im Debug-Bereich  
3. `apps/client-2d/src/net/protocol.ts` - ARE-Payload vom Server |

---

## PUNKT 6: SELFHEAL WORKSHOP

| Status | **PARTIAL** |
|--------|-------------|
| **Beweis** | `server/src/selfhealing/SelfHealingDashboard.ts` - Endpoints existieren |
| **Code** | ```typescript
app.get(`${routePrefix}/status`, ...);
app.get(`${routePrefix}/logs`, ...);
app.get(`${routePrefix}/features`, ...);
app.get(`${routePrefix}/patterns`, ...);
app.get(`${routePrefix}/rules`, ...);
``` |
| **Problem** | Das ist Debug/Status, kein Workshop mit Proposals. Es fehlen: **Dry-Run**, **Risk-Level**, **PatchProposal**, **RollbackPlan** |
| **Was funktioniert** | Status, Logs, Features, Patterns, Rules (lesen) |
| **Was fehlt** | Workshop mit Vorschlägen, Risikobewertung, Patch-Dry-Run, Rollback-Plan |
| **Fehlendes Artefakt** | Workshop-UI mit Dry-Run, Risk-Level, PatchProposal, RollbackPlan |
| **Nächster Patch** | 1. `server/src/selfhealing/SelfHealingWorkshop.ts` - Workshop-Endpunkte  
2. `apps/client-2d/src/ui/SelfHealWorkshop.tsx` - Workshop-UI  
3. `apps/client-2d/src/ArelorianStitchHud.tsx` - Workshop-Button |

---

## PUNKT 7: ASSET IMPORTER V2

| Status | **PARTIAL** |
|--------|-------------|
| **Beweis** | Target-Pfade existieren |
| **Verifiziert** | - `apps/client-2d/public/2d-assets/` ✓  
- `apps/client-2d/public/assets/` ✓  
- `apps/client-2d/src/manifest/` ✓  
- Cozy Spring Manifest: version=3 ✓ |
| **Problem** | Keine maschinelle Bestätigung dass Import-Pipeline funktioniert |
| **Fehlendes Artefakt** | Import-Tests und Validierung |
| **Nächster Patch** | 1. `scripts/stitch-game-assets-importer.mjs` - Test mit dry-run  
2. `tests/asset-import.test.ts` - Unit-Tests  
3. `e2e/asset-import.spec.ts` - E2E-Test |

---

## PUNKT 8: WIKI MACHINE MAP

| Status | **PARTIAL** |
|--------|-------------|
| **Beweis** | `docs/ai-skills/` und `scripts/wiki/` existieren |
| **Verifiziert** | - `docs/ai-skills/wasd-*.md` Skills ✓  
- `scripts/wiki/build-autonomous-wiki.mjs` ✓  
- `scripts/wiki/push-wiki.mjs` ✓ |
| **Problem** | Kein automatisierter Test der Wiki-Sync-Pipeline |
| **Fehlendes Artefakt** | Wiki-Sync-Tests |
| **Nächster Patch** | 1. `scripts/wiki/validate-wiki.mjs` - Test-Modus  
2. `.github/workflows/wiki-engine.yml` - Test-Job  
3. `tests/wiki-sync.test.ts` - Integrationstest |

---

## PUNKT 9: ARCHITECTURE GATE

| Status | **PARTIAL** |
|--------|-------------|
| **Beweis** | `Dockerfile.vps` prüft REAL_PIXI_CLIENT |
| **Was geprüft wird** | - REAL_PIXI_CLIENT in index.html  
- build-stamp.json  
- Cozy manifest  
- PWA assets (manifest.webmanifest, service-worker.js) |
| **Problem** | Keine E2E-Tests im Container nach dem Build für /2d/, /2d/build-stamp.json, /portal/ |
| **Fehlendes Artefakt** | Container-Tests nach dem Build |
| **Nächster Patch** | 1. `scripts/deploy-vps-docker.sh` - erweitern mit /2d/ Tests  
2. `e2e/container-smoke.spec.ts` - E2E-Tests im Container  
3. `Dockerfile.vps` - RUN Tests am Ende |

---

## PUNKT 10: DEPLOYMENT

| Status | **PARTIAL** |
|--------|-------------|
| **Beweis** | `docker-compose.yml` → `Dockerfile.vps` |
| **Was funktioniert** | - Service: arelorian-engine ✓  
- Container-Port: 3001 ✓  
- Host-Port Mapping über ARELORIAN_PORT ✓ |
| **Problem** | `e2e/smoke.spec.ts` testet NUR /health. Es gibt KEINE E2E-Tests für: `/2d/`, `/2d/build-stamp.json`, `/portal/` |
| **Code** | ```typescript
test("health endpoint responds with ok=true", async ({ request }) => {
  const res = await request.get("/health", { timeout: 30_000 });
  expect(res.ok()).toBeTruthy();
});
``` |
| **Fehlendes Artefakt** | E2E-Tests für /2d/, /2d/build-stamp.json, /portal/ |
| **Nächster Patch** | 1. `e2e/client-2d.spec.ts` - /2d/ Tests  
2. `e2e/build-stamp.spec.ts` - /2d/build-stamp.json Tests  
3. `e2e/portal.spec.ts` - /portal/ Tests |

---

## TABELLE: PUNKT | STATUS | BEWEIS | LÜCKE | NÄCHSTER PATCH

| # | Status | Beweis | Lücke | Nächster Patch |
|---|--------|--------|-------|----------------|
| 1 | PARTIAL | ModuleRegistry.ts | Kein runtimeSurface-Feld | ModuleRegistry.ts + Surface-Typ |
| 2 | PARTIAL | main.tsx | Kein Integrationstest | tests/integration/client-bootstrap.test.ts |
| 3 | **MISSING** | client2dPixiModules.ts (Pixi nur!) | Keine globale Registry für alle Module | apps/client-2d/src/ModuleRegistry.ts |
| 4 | PARTIAL | ArelorianStitchHud.tsx:449-417 | Preview-Panels statt echte Daten | QuestJournal.tsx, GuildPanel.tsx |
| 5 | **MISSING** | WorldHeartMonitor.tsx | Kein kappa, tickId, observerCount, replayHash | AREHeartbeatPanel.tsx |
| 6 | PARTIAL | SelfHealingDashboard.ts | Kein Dry-Run, Risk-Level, PatchProposal | SelfHealingWorkshop.ts + Workshop-UI |
| 7 | PARTIAL | Target-Pfade existieren | Keine maschinelle Import-Tests | tests/asset-import.test.ts |
| 8 | PARTIAL | docs/ai-skills/ + scripts/wiki/ | Kein Wiki-Sync-Test | tests/wiki-sync.test.ts |
| 9 | PARTIAL | Dockerfile.vps prüft Marker | Keine Container-E2E-Tests | e2e/container-smoke.spec.ts |
| 10 | PARTIAL | docker-compose.yml → Dockerfile.vps | E2E testet NUR /health | e2e/client-2d.spec.ts + build-stamp.spec.ts |

---

## TO-DO LISTE: NÄCHSTE 5 COMMITS

### Commit 1: Globale Module Registry (Punkt 3 - MISSING)
```
Dateien:
- apps/client-2d/src/ModuleRegistry.ts (NEU)
- apps/client-2d/src/PixiModuleInspector.tsx (ERWEITERN)
- apps/client-2d/src/ArelorianStitchHud.tsx (DEBUG-PANEL)
```

### Commit 2: ARE Heartbeat Panel (Punkt 5 - MISSING)
```
Dateien:
- apps/client-2d/src/AREHeartbeatPanel.tsx (NEU)
- apps/client-2d/src/ArelorianStitchHud.tsx (INTEGRATION)
- apps/client-2d/src/net/protocol.ts (PAYLOAD-ERWEITERUNG)
```

### Commit 3: E2E Tests für /2d/ (Punkt 10 - PARTIAL)
```
Dateien:
- e2e/client-2d.spec.ts (NEU)
- e2e/build-stamp.spec.ts (NEU)
- e2e/portal.spec.ts (NEU)
```

### Commit 4: Quest/Guild/Faction Integration (Punkt 4 - PARTIAL)
```
Dateien:
- apps/client-2d/src/ui/QuestJournal.tsx (ERWEITERN)
- apps/client-2d/src/ui/GuildPanel.tsx (NEU oder ERWEITERN)
- apps/client-2d/src/ui/FactionPanel.tsx (NEU)
```

### Commit 5: SelfHeal Workshop (Punkt 6 - PARTIAL)
```
Dateien:
- server/src/selfhealing/SelfHealingWorkshop.ts (NEU)
- apps/client-2d/src/ui/SelfHealWorkshop.tsx (NEU)
- apps/client-2d/src/ArelorianStitchHud.tsx (WORKSHOP-BUTTON)
```

---

## FAZIT

Das Repository enthält viele Bausteine, aber:

1. **Punkt 3 (Globale Module Registry)** ist MISSING - client2dPixiModules.ts ist nur Pixi-Policy, keine globale Registry
2. **Punkt 5 (ARE Panel)** ist MISSING - es fehlen kappa, tickId, observerCount, replayHash
3. **Punkt 10 (Deployment)** hat nur /health E2E-Test, fehlt /2d/, /build-stamp.json, /portal/

**NICHT "produktionsreif"** ohne diese Tests und Integrationen.