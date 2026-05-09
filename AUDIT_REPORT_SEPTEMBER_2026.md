# Audit Report: Areloria WASD Monorepo (September 2026)

## Status Quo
The repository is a large-scale TypeScript monorepo using `pnpm` workspace. It includes 37 packages ranging from core logic and database utilities to frontend portals and game engines. While the structure is robust, it suffered from "monorepo entropy"—divergent configurations, invalid dependency versions, and fragmented CI/CD workflows.

## Kritische Fehler (Behoben)
- **Defekter Build-Graph:** Die `tsconfig.json` im Root enthielt keine Referenzen auf die meisten `projects/*`, was ein vollständiges Type-Checking verhinderte.
- **Workflow-Wildwuchs:** Über 7 redundante oder experimentelle CI-Workflows verursachten Race Conditions und unnötige Build-Kosten.
- **Instabile Deployments:** Die Verwendung von `--no-frozen-lockfile` in `deploy.yml` gefährdete die Reproduzierbarkeit der Produktionsumgebung.
- **Ungültige Typ-Definitionen:** Weit verbreitete Referenzen auf `@types/node: ^25.6.2` (ungültig für Node 22) führten zu Build-Warnungen und Instabilität.
- **Ghost Dependencies:** `shamefully-hoist=true` maskierte fehlende Abhängigkeitsdeklarationen in Unterpaketen.

## Optimierungspotenzial
- **CI-Konsolidierung:** Die `main-pipeline.yml` dient nun als "Single Source of Truth" ohne restriktive Pfad-Filter.
- **Type-Safety:** Standardisierung auf React 19 Typen und `moduleResolution: bundler` sorgt für Kompatibilität mit dem modernen Ökosystem.
- **Infrastruktur-Härtung:** Korrigierte Docker-Pfade und strikte Lockfile-Einhaltung sichern den Deployment-Prozess ab.

## Action Plan (Umgesetzt)
1. **CI/CD Aufräumarbeiten:** Löschung von `ci.yml`, `Smart CI v5`, `Godmode Stack` etc. und Deaktivierung von Pfad-Filtern in der Haupt-Pipeline.
2. **Abhängigkeits-Standardisierung:** Anpassung aller `@types/node` auf `^22.19.18` und Aktualisierung der Root-Overrides für React 19 Typen.
3. **Build-Graph Reparatur:** Rekonstruktion der `tsconfig.json` mit allen 37 Workspace-Paketen und Behebung von Deprecation-Warnungen.
4. **Deployment-Absicherung:** Umstellung auf `--frozen-lockfile` in allen kritischen Skripten und Korrektur der `docker-compose.prod.yml`.
