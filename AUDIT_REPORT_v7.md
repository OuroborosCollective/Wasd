# Repository Audit Report v7 - Areloria / Ouroboros Monorepo

**Datum:** 2026-05-15
**Auditor:** Jules (Senior DevOps & Fullstack Architect)

---

## Status Quo
Das Repository ist ein pnpm-basiertes Monorepo mit einer komplexen Struktur, die `apps`, `packages`, `projects`, sowie dedizierte Verzeichnisse für `client`, `server` und `engine` umfasst. Es wird TypeScript über das gesamte Projekt hinweg eingesetzt. Die CI/CD-Pipeline läuft über GitHub Actions. Es bestehen jedoch signifikante Redundanzen und Konfigurationsmängel, die die Stabilität und Wartbarkeit beeinträchtigen.

---

## Kritische Fehler (Critical Errors)

1.  **CI/CD Pipeline-Verfälschung:** Die `main-pipeline.yml` nutzt konsequent `continue-on-error: true` für Build-, Lint- und Test-Schritte. Dies führt dazu, dass fehlerhafte Code-Stände als erfolgreich markiert werden, was die Integrität des `main`-Branches gefährdet.
2.  **Architektonische Redundanz (Shared Packages):** Es existieren zwei konkurrierende Shared-Verzeichnisse: `shared/` (@wasd/shared) und `packages/shared/` (@wasd/shared-lib). Dies führt zu inkonsistenten Implementierungen von Kern-Logik (z.B. `FixedPoint`).
3.  **Inkonsistente Workspace-Definition:** Die `root package.json` enthält ein `workspaces` Feld, das im Widerspruch zur `pnpm-workspace.yaml` steht. pnpm ignoriert dieses Feld zwar meist zugunsten der Workspace-Datei, es sorgt jedoch für Verwirrung und Fehlkonfigurationen bei Tooling.
4.  **Sicherheitsrisiko "Ghost Dependencies":** Durch `shamefully-hoist=true` in der `.npmrc` wird die strikte Isolation von pnpm aufgehoben, was unentdeckte Abhängigkeiten begünstigt und zu instabilen Builds führen kann.

---

## Optimierungspotenzial (Optimization Potential)

1.  **TypeScript Harmonisierung:** Die TypeScript-Versionen variieren zwischen 5.0.0 und 5.7.3. Eine Vereinheitlichung auf die aktuellste Version (`^5.7.3`) verbessert die Type-Safety und Build-Performance.
2.  **CI/CD Effizienz:** Das Caching in GitHub Actions ist redundant (doppeltes Caching für den pnpm store). Eine Bereinigung reduziert die Pipeline-Laufzeit und Komplexität.
3.  **Docker Build Robustheit:** Das aktuelle `Dockerfile` nutzt hartkodierte `COPY` Befehle für jedes `package.json`, was bei Erweiterungen des Monorepos zu Fehlern führt. Ein dynamischerer Ansatz oder die Nutzung von `pnpm deploy` ist zu bevorzugen.

---

## Action Plan (Schritt-für-Schritt)

### Phase 1: CI/CD & Root Fixes
1.  Entfernen von `continue-on-error: true` in `.github/workflows/main-pipeline.yml`.
2.  Bereinigung des redundanten Cachings in der CI-Pipeline.
3.  Entfernen des `workspaces` Feldes aus der Root `package.json`.

### Phase 2: Workspace Konsolidierung
1.  Migration der Logik von `shared/` nach `packages/shared/`.
2.  Umbenennung von `@wasd/shared-lib` zu `@wasd/shared`.
3.  Löschen des legacy `shared/` Verzeichnisses und Aktualisierung der Workspace-Konfiguration.

### Phase 3: Dependency & TS Management
1.  Upgrade von TypeScript auf `^5.7.3` im gesamten Monorepo.
2.  Validierung und Korrektur der `tsconfig.json` Vererbung und References.
3.  Entfernen von `shamefully-hoist=true` (optional/begleitend, falls Zeit für Fixes von Missing Deps vorhanden).

### Phase 4: Docker & Deployment
1.  Refactoring des `Dockerfile` für dynamische Paket-Erkennung.

---
*Audit abgeschlossen.*
