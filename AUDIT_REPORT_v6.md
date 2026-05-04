# Repository Audit Report v6 - Areloria / Ouroboros Monorepo

**Datum:** 2026-05-04
**Auditor:** Jules (Senior DevOps & Fullstack Architect)

---

## Status Quo
Das Repository ist ein komplexes pnpm Monorepo, bestehend aus einem Game-Server (`server`), einem Web-Client (`client`), einer Engine (`engine`) sowie diversen Hilfs-Packages (`packages/*`), Apps (`apps/*`) und Projekten (`projects/*`). Es wird TypeScript über alle Ebenen hinweg eingesetzt. Die CI/CD-Pipeline basiert auf GitHub Actions.

---

## Kritische Fehler (Critical Errors)

1.  **CI/CD Blindheit:** In `main-pipeline.yml` ist für fast alle kritischen Schritte (`Lint`, `Typecheck`, `Build`, `Test`) `continue-on-error: true` gesetzt. Das bedeutet, die Pipeline signalisiert Erfolg ("Grün"), selbst wenn der Build fehlschlägt oder Tests versagen.
2.  **Workspace-Redundanz & Konflikte:** Es existieren zwei konkurrierende Shared-Verzeichnisse: `shared/` (@wasd/shared) und `packages/shared/` (@wasd/shared-lib). Der Server referenziert `@wasd/shared` (Workspace), während der Client Pfad-Aliase direkt in das legacy `shared/` Verzeichnis nutzt. Dies führt zu Inkonsistenzen in der Logik (z.B. unterschiedliche `FixedPoint` Implementierungen).
3.  **Ghost Dependencies:** In `.npmrc` ist `shamefully-hoist=true` aktiv. Dies hebelt die strikte Kapselung von pnpm aus und erlaubt Paketen den Zugriff auf Abhängigkeiten, die sie nicht explizit deklariert haben. Dies ist besonders gefährlich in Verbindung mit PnP-Ambitionen.
4.  **Unsichere CI-Installation:** Die Pipeline nutzt `pnpm install --no-frozen-lockfile`. In einer CI-Umgebung sollte *immer* `--frozen-lockfile` genutzt werden, um sicherzustellen, dass exakt der getestete Stand des Lockfiles installiert wird.

---

## Optimierungspotenzial (Optimization Potential)

1.  **TypeScript Standardisierung:**
    *   Inkonsistente TypeScript-Versionen (von 5.0.0 bis 5.7.3).
    *   Mischbetrieb von `moduleResolution: bundler`, `NodeNext` und `Node`.
    *   Unvollständige Nutzung von Project References, was inkrementelle Builds behindert.
2.  **CI/CD Effizienz:**
    *   Doppeltes Caching in GitHub Actions (pnpm cache via `setup-node` UND `actions/cache`).
    *   Fehlende Parallelisierung der Test-Suites über den Monorepo-Kontext.
3.  **Docker Build-Prozess:**
    *   Das Root-`Dockerfile` kopiert Verzeichnisse manuell (`COPY client/package.json ./client/` etc.), was bei neuen Packages im Workspace zu Build-Fehlern führt.
    *   Keine Nutzung von `pnpm deploy` im Haupt-Dockerfile zur Erstellung von schlanken Production-Images.
4.  **Skript-Wildwuchs:** Inkonsistente Benennung von Standard-Skripten (z.B. `typecheck` vs `check-types`).

---

## Action Plan (Schritt-für-Schritt)

### Phase 1: Stabilisierung & Sicherheit (Sofort)
1.  **CI Hardening:** In `.github/workflows/main-pipeline.yml` alle `continue-on-error: true` entfernen und `--no-frozen-lockfile` durch `--frozen-lockfile` ersetzen.
2.  **Fix Caching:** Redundantes `actions/cache` in der Pipeline entfernen; das integrierte Caching von `setup-node` (mit `cache: 'pnpm'`) ist ausreichend und stabiler.
3.  **Root Clean-up:** Das redundante `workspaces` Feld in der root `package.json` entfernen (Single Source of Truth: `pnpm-workspace.yaml`).

### Phase 2: Dependency & Workspace Konsolidierung
1.  **Shared Merger:** Inhalt von `shared/` kontrolliert nach `packages/shared/` migrieren. Alle Referenzen im Projekt auf `@wasd/shared` (das konsolidierte Package) umstellen. Das Verzeichnis `shared/` anschließend löschen.
2.  **Version Alignment:** TypeScript auf eine einheitliche Version (Empfehlung: `^5.7.3`) über alle `package.json` Dateien hinweg anheben. Gleiches für Kern-Abhängigkeiten wie `zod`, `react` und `@types/node`.
3.  **Strikte Dependencies:** `shamefully-hoist=true` aus `.npmrc` entfernen und auftretende "Missing Dependency" Fehler durch explizite Deklaration beheben.

### Phase 3: Build & DX Optimierung
1.  **TSConfig Refactor:** Eine zentrale `tsconfig.base.json` mit strikten Defaults nutzen. Alle Sub-Packages müssen diese erweitern und korrekte `references` auf ihre Abhängigkeiten setzen.
2.  **Script Standardization:** In allen Paketen einheitliche Skripte für `build`, `test`, `lint` und `typecheck` implementieren.
3.  **Docker Refinement:** Das `Dockerfile` auf einen dynamischen Ansatz umstellen (z.B. `COPY . .` nach einer gefilterten Installation) oder konsequent `pnpm deploy` nutzen.

---
*Audit abgeschlossen.*
