# Repository Audit Report - April 2028
**Auditor:** Jules (Senior DevOps & Fullstack Architect)

## Status Quo
Das Repository ist ein umfangreiches Monorepo, das mit `pnpm` verwaltet wird. Es nutzt einen isolierten Node-Linker (`node-linker=isolated`), was für Stabilität sorgt, aber PnP-Vorteile (wie Ghost-Dependency-Schutz auf Linker-Ebene) nicht voll ausschöpft. Die Struktur ist unterteilt in `apps/`, `packages/`, `projects/` sowie Top-Level Services wie `server/`, `client/` und `portal/`. TypeScript ist der Standard, wobei eine zentrale `tsconfig.base.json` existiert. Die CI/CD-Landschaft ist mit GitHub Actions abgedeckt, inklusive spezialisierter AST-Validierung und VPS-Deployments via Docker oder PM2.

## Kritische Fehler
1.  **Build-Abbruch in `@wasd/portal`:** Das Paket `@wasd/portal` versucht `tsc` direkt aufzurufen (`tsc && vite build`), was in Umgebungen ohne global installiertes TypeScript fehlschlägt, da es nicht über `pnpm exec` oder das lokale `.bin` Verzeichnis abgesichert ist.
2.  **Version-Fragmentation (Vite/Vitest):**
    *   `vite`: Nutzt Versionen `5.2.8` (portal), `6.4.2` (web/client) und `8.0.13` (server). Dies führt zu inkonsistentem Build-Verhalten und unnötigem Overhead im `node_modules`.
    *   `vitest`: Fragmentation zwischen `1.6.0` (portal), `4.1.5` (server/client) und `4.1.6` (root).
3.  **Peer-Dependency Mismatch (Zod):** `@wasd/database` fordert `zod: ^3.23.8` als Peer-Dependency, während der Rest des Repos (inkl. root overrides) auf `zod: ^4.4.3` setzt. Dies provoziert Installations-Warnungen und potenzielle Runtime-Fehler bei Type-Guard-Validierungen.
4.  **Inkonsistente TS-Vererbung:** Viele Pakete in `projects/` und `packages/ui` extendieren **nicht** die `tsconfig.base.json`. Dies führt dazu, dass globale Compiler-Flags (wie `strict`, `target`, `moduleResolution`) nicht einheitlich durchgesetzt werden.
5.  **Unvollständige Project References:** Die Top-Level `tsconfig.json` listet viele Referenzen, aber die individuellen Pakete (z.B. `packages/core`) haben keine Gegen-Referenzen auf ihre Abhängigkeiten in ihren eigenen `tsconfig.json` Dateien. Dies bricht inkrementelle Builds (`tsc -b`).
6.  **Deployment Drift:** `deploy/update.sh` nutzt `pnpm install --no-frozen-lockfile`. Dies gefährdet die Reproduzierbarkeit von Production-Builds, da sich der Lockfile-Zustand auf dem Server unkontrolliert ändern kann.

## Optimierungspotenzial
1.  **Zentralisierung via Overrides:** Die bereits vorhandenen `pnpm.overrides` im Root sollten auf `vite` und `vitest` ausgeweitet werden, um eine "Single Source of Truth" für Build-Tools zu schaffen.
2.  **CI/CD Caching:** Nur der `ast-self-healing.yml` Workflow nutzt korrektes `pnpm` Caching. `vps-docker-deploy.yml` und andere sollten dies ebenfalls implementieren, um Build-Zeiten zu halbieren.
3.  **Standardisierung der Transpilation:** Der `server` nutzt ein komplexes `transpile-build.mjs` Skript mit `esbuild`. Während dies schnell ist, birgt es Risiken bei komplexen TS-Features (Decorators, etc.). Ein Wechsel auf `tsup` (wie in `@wasd/core-logic`) wäre konsistenter.
4.  **Docker Layer Optimierung:** `Dockerfile.prod` ist bereits gut optimiert (Manifest copying), könnte aber durch den Einsatz von `pnpm fetch` für Offline-Installs noch robuster gegen Registry-Ausfälle während des Builds gemacht werden.

## Action Plan
1.  **Schritt 1: Dependency Alignment (Sofort)**
    *   Ergänze `vite: "6.4.2"` und `vitest: "4.1.6"` in den Root-`pnpm.overrides`.
    *   Aktualisiere `zod` Peer-Dependency in `@wasd/database` auf `^4.4.3`.
2.  **Schritt 2: TS-Infrastruktur Fix (Kurzfristig)**
    *   Refaktoriere alle `tsconfig.json` in `projects/` und `packages/`, sodass sie von `tsconfig.base.json` erben.
    *   Setze `composite: true` und korrekte `references` in allen Sub-Paketen.
3.  **Schritt 3: Build & Deploy Hardening**
    *   Ändere `portal/package.json` Build-Skript auf `pnpm exec tsc && vite build`.
    *   Zwinge `deploy/update.sh` zur Nutzung von `--frozen-lockfile`.
4.  **Schritt 4: CI/CD Speedup**
    *   Implementiere `actions/setup-node` mit `cache: 'pnpm'` in alle aktiven Workflows.
5.  **Schritt 5: Audit Validierung**
    *   Führe `pnpm -r build` und `pnpm -r test` lokal aus, um die Konsistenz nach den Änderungen zu bestätigen.
