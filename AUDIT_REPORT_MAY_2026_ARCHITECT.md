# Repository Audit Bericht - Areloria WASD Monorepo

## Status Quo
Das Repository ist ein TypeScript-basiertes Monorepo, das **pnpm workspaces** nutzt. Es besteht aus verschiedenen Apps, Packages und Projekten.
- **Package Manager:** pnpm 9.12.2.
- **Runtime:** Node.js 22 (laut CI/CD), Dockerfile nutzte zuvor Node 20.
- **CI/CD:** GitHub Actions mit einer umfassenden `main-pipeline.yml`.
- **Infrastruktur:** Docker und Docker Compose für das Deployment.

## Kritische Fehler
1. **CI/CD Skript-Pfad Konflikt:** Die `main-pipeline.yml` erwartete `check_changes.py` in `engine/scripts/` oder `scripts/`, aber sie befindet sich im Root-Verzeichnis. Dies führte dazu, dass Validierungsschritte übersprungen wurden.
2. **Inkonsistente Node-Versionen:** Die Root `package.json` und CI-Workflows spezifizierten Node 22, während das `Dockerfile` Node 20 nutzte. Dies kann zu Abweichungen zwischen Entwicklungs- und Produktionsumgebungen führen.
3. **Lückenhafter TypeScript Projekt-Graph:** Die Root `tsconfig.json` fehlten Referenzen zu über 15 Projekten im `projects/` Verzeichnis, was einen vollständigen Monorepo-Build und Type-Checking via Project References verhinderte.

## Optimierungspotenzial
1. **Dependency Drift:** Versionen von `@types/node`, `@types/react`, `@types/react-dom` und `zod` variierten zwischen den Packages.
2. **Ghost Dependencies:** `shamefully-hoist=true` ist in der `.npmrc` aktiv. Dies erlaubt Packages den Import nicht deklarierter Abhängigkeiten.
3. **Docker Healthchecks:** Die Healthchecks im `Dockerfile` und in der `docker-compose.yml` können durch modernere Node.js Fetch-Muster robuster gestaltet werden.

## Action Plan (Bereits umgesetzt)
1. **Fix CI Pfade:** `main-pipeline.yml` wurde aktualisiert, um `check_changes.py` korrekt im Root zu finden.
2. **Standardisierung der Node.js Version:** `Dockerfile` wurde auf `node:22-alpine` aktualisiert.
3. **Synchronisierung der Abhängigkeiten:** Wichtige Dependency-Versionen wurden in den Root `pnpm.overrides` angeglichen.
4. **Vervollständigung der TypeScript Referenzen:** Alle fehlenden Projekte wurden in die Root `tsconfig.json` Referenzen aufgenommen.
