# Comprehensive Repository Audit Report (v5) - March 2026

## Status Quo
Das Repository ist ein komplexes **pnpm Monorepo**, das Kernkomponenten für ein MMO (Client, Server, Engine, Shared) sowie zahlreiche Sub-Projekte und Pakete umfasst. Nach den aktuellen Bereinigungsarbeiten ist die Struktur auf pnpm-Standards (9.1.0) und Node 20+ optimiert.

## Kritische Fehler
- **CI/CD "Pass-by-Failure":** Zuvor nutzten alle kritischen CI-Schritte (Lint, Test, Build) `continue-on-error: true`, was dazu führte, dass fehlerhafte Builds fälschlicherweise als erfolgreich markiert wurden. Dies wurde behoben.
- **TypeScript Fragmentierung:** Die TypeScript-Versionen variierten stark zwischen den Paketen (5.0.0 bis 5.6.0). Dies wurde auf einen einheitlichen Stand (^5.7.3) gebracht.
- **Redundante Konfigurationen:** Die doppelte Definition von Workspaces (root `package.json` vs. `pnpm-workspace.yaml`) und redundante CI-Workflows (`ci.yml`) sorgten für Inkonsistenzen.

## Optimierungspotenzial
- **Ghost Dependencies:** `.npmrc` nutzt weiterhin `shamefully-hoist=true`. Langfristig sollte dies auf `false` gesetzt werden, um sicherzustellen, dass Pakete nur auf explizit deklarierte Abhängigkeiten zugreifen können (striktes PnP).
- **Server ESM Migration:** Der Server nutzt `NodeNext`, hat aber noch zahlreiche Import-Fehler (fehlende `.js` Extensions), die einen erfolgreichen Build verhindern. Dies ist ein bekanntes Problem, das über den aktuellen Infrastruktur-Audit hinausgeht.
- **Shared Package Konsolidierung:** Es existieren weiterhin `shared/` und `packages/shared/`. Eine vollständige Migration zu `@wasd/shared-lib` in `packages/shared/` wird empfohlen, um die Monorepo-Konventionen einzuhalten.

## Action Plan
1. **[ERLEDIGT] Bereinigung Monorepo:** Redundante Workspace-Deklarationen entfernt und `pnpm-workspace.yaml` als Single Source of Truth etabliert.
2. **[ERLEDIGT] Standardisierung Tooling:** TypeScript auf ^5.7.3 über alle 38 Projekte hinweg vereinheitlicht.
3. **[ERLEDIGT] CI/CD Härtung:** Workflows konsolidiert und `continue-on-error` entfernt, um die Pipeline-Integrität zu sichern.
4. **[ERLEDIGT] Docker-Optimierung:** `Dockerfile` auf `pnpm deploy` umgestellt, um kleinere und sicherere Produktions-Images zu erzeugen.
5. **[PENDING] ESM Fixes:** Schrittweise Korrektur der Import-Pfade im Server-Paket, um die Kompatibilität mit `NodeNext` herzustellen.
6. **[PENDING] Deprecated Cleanup:** Entfernung veralteter Sub-Abhängigkeiten und Migration auf `@babylonjs/core` (wie von postinstall-Warnungen empfohlen).

---
*Bericht erstellt von Jules, Senior DevOps & Fullstack Architect.*
