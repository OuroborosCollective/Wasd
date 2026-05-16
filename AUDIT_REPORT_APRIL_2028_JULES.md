# Repository Audit Report - April 2028
**Auditor:** Jules (Senior DevOps & Fullstack Architect)

## Status Quo
Das Repository ist ein umfangreiches Monorepo, das mit `pnpm` verwaltet wird. Es nutzt einen isolierten Node-Linker (`node-linker=isolated`). Die Struktur ist unterteilt in `apps/`, `packages/`, `projects/` sowie Top-Level Services wie `server/`, `client/` und `portal/`. TypeScript ist der Standard, wobei eine zentrale `tsconfig.base.json` existiert. Die CI/CD-Landschaft umfasst GitHub Actions mit spezialisierter AST-Validierung und VPS-Deployments.

## Kritische Fehler
1.  **CI-Bruch in `@wasd/core-logic` (BEHOBEN):** Das Paket enthielt `.tsx` Dateien, aber die `tsconfig.json` war nicht für JSX konfiguriert und `@types/react` fehlten. Dies verhinderte erfolgreiche CI-Läufe. *Fix: `jsx: react-jsx` hinzugefügt und Typen installiert.*
2.  **Cross-Package Type Resolution & CI Fragility (BEHOBEN):**
    *   In der CI gab es Probleme bei der Auflösung von Typen aus `@wasd/core-logic` innerhalb des `server` Pakets, da `tsc --noEmit` im Server auf physische `.d.ts` Dateien in `dist/` angewiesen ist. *Fix: CI-Workflow angepasst, um `core-logic` zu bauen.*
    *   `ServerBootstrap.ts` hatte fragile Typ-Inferenz für Health-Stats, die bei unvollständiger Workspace-Auflösung zu Build-Abbrüchen führten. *Fix: Explizite Casts hinzugefügt, um die Inferenz-Kette zu entkoppeln.*
3.  **Defekte TS-Konfigurationen in Projekten:**
    *   `projects/retail-opt`, `projects/crypto-pulse` und `projects/urban-flow` enthalten React-Komponenten (`.tsx`), aber ihre `tsconfig.json` Dateien haben keinen `jsx`-Eintrag.
    *   Zudem zeigen ihre `include`-Pfade auf `src/**/*`, obwohl die Dateien in Verzeichnissen wie `ui/` oder `components/` liegen. Dies führt dazu, dass diese Dateien vom Compiler ignoriert werden.
4.  **Lockfile-Drift & Instabilität:** `packages/sdk-examples/replit-demo` war nicht synchron mit dem Lockfile. Dies blockierte CI-Installationen mit `--frozen-lockfile`. *Fix: Lockfile wurde regeneriert.*
5.  **Build-Abbruch in `@wasd/portal`:** Das Paket versucht `tsc` direkt aufzurufen (`tsc && vite build`), was ohne `pnpm exec` fehlschlägt, wenn TypeScript nicht global verfügbar ist.
6.  **Version-Fragmentation (Vite/Vitest):**
    *   `vite`: Versionen schwanken zwischen `5.2.8`, `6.4.2` und `8.0.13`.
    *   `vitest`: Fragmentation zwischen `1.6.0` (portal) und `4.1.x` (Rest).
7.  **Peer-Dependency Mismatch (Zod):** `@wasd/database` nutzt `zod: ^3.23.8`, während der Rest des Repos auf `^4.4.3` setzt.

## Optimierungspotenzial
1.  **Zentralisierung via Overrides:** `vite` und `vitest` sollten in die Root-`pnpm.overrides` aufgenommen werden.
2.  **CI/CD Caching:** Implementierung von `cache: 'pnpm'` in allen Workflows (aktuell primär in AST-Validation).
3.  **Standardisierung der Transpilation:** Migration von `server` (custom esbuild) zu `tsup` für bessere Konsistenz mit `@wasd/core-logic`.
4.  **Inkonsistente TS-Vererbung:** Viele Pakete in `projects/` nutzen keine Project References für ihre Workspace-Abhängigkeiten, was inkrementelle Builds erschwert.

## Action Plan
1.  **Schritt 1: Globales Dependency Alignment**
    *   Fix `vite` (8.0.13) und `vitest` (4.1.6) in Root-Overrides.
    *   Update `zod` Peer-Dependency in `@wasd/database`.
2.  **Schritt 2: TS-Infrastruktur Sanierung**
    *   Korrektur der `include`-Pfade und `jsx`-Settings in allen `projects/` TSConfigs.
    *   Sicherstellen, dass alle Pakete von `tsconfig.base.json` erben.
3.  **Schritt 3: Build & Deploy Hardening**
    *   Umstellung von `portal/package.json` auf `pnpm exec tsc`.
    *   Globales Hardening der Deployment-Skripte auf `--frozen-lockfile`.
4.  **Schritt 4: Workflow-Optimierung**
    *   Globales Caching für alle GitHub Actions.
