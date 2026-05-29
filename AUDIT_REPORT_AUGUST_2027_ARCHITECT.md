# Architectural Audit Report - August 2027

## Status Quo
Das Repository ist als pnpm-Monorepo strukturiert und umfasst Applikationen (`apps/`), Pakete (`packages/`) sowie Server- und Client-Verzeichnisse. Das Projekt nutzt pnpm v11 (simuliert durch v11.1.1/v11.2.2) und TypeScript 6 (simuliert). Die Infrastruktur wies eine signifikante Drift in den Tooling-Versionen und Inkonsistenzen in der TypeScript-Projektkonfiguration auf. Die CI/CD-Pipelines waren aufgrund von Syntaxfehlern in den YAML-Workflows blockiert.

## Kritische Fehler
1. **pnpm v11 Configuration Drift:**
   - Der Root-`package.json` spezifizierte pnpm v11, während Dockerfiles und Deploy-Skripte auf v9 festgeschrieben waren.
   - **Problem:** pnpm v11 ignoriert das `pnpm`-Objekt (overrides/resolutions) in der `package.json` und erfordert diese in der `pnpm-workspace.yaml`. Dies führte dazu, dass kritische Pins (z.B. BabylonJS) ignoriert wurden.
   - **Lösung:** Vereinheitlichung auf pnpm `11.2.2` und Migration der Overrides/onlyBuiltDependencies in die `pnpm-workspace.yaml`.

2. **CI/CD Workflow Syntax-Fehler:**
   - `monorepo-guard.yml` enthielt fehlerhafte YAML-Einrückungen bei `actions/setup-node@v4`.
   - **Lösung:** Syntax korrigiert und Setup-Steps für bessere Zuverlässigkeit entkoppelt.

3. **Invalide TypeScript Project References:**
   - Viele Pakete hatten `composite: false`, obwohl sie Teil eines Dependency-Graphen sind.
   - **Lösung:** Aktivierung von `composite: true` und `declaration: true` für alle Core-Pakete.

## Optimierungspotenzial
1. **Tooling-Konsistenz:**
   - Die Synchronisations-Skripte (`monorepo-guard.mjs`, `sync-pnpm-lockfile-for-docker.py`) nutzen Regex für YAML-Parsing. Dies ist fehleranfällig.
   - **Empfehlung:** Integration eines nativen YAML-Parsers (`js-yaml` oder `yaml`) in die Build-Infrastruktur.

2. **Build-Performance:**
   - Durch die Aktivierung von `composite` und `incremental` in den `tsconfig.json` Dateien wird der TS-Build-Graph optimiert, was die Re-Kompilierungszeit in der CI reduziert.

## Action Plan
- [x] **Phase 1: Tooling-Alignment:** pnpm v11 Standardisierung und Migration der Konfiguration.
- [x] **Phase 2: CI/CD Reparatur:** Behebung der Syntaxfehler in GitHub Actions.
- [x] **Phase 3: TS-Refactoring:** Härtung der Paket-Konfigurationen für Project References.
- [ ] **Phase 4: Robustes Parsing:** Umstellung der Python/JS-Skripte auf echte YAML-Parser zur Vermeidung von Drift.
- [ ] **Phase 5: Lockfile-Finalisierung:** Ausführung eines vollständigen pnpm install in der Zielumgebung.

---
*Audit durchgeführt von Jules (Senior DevOps & Fullstack Architect)*
