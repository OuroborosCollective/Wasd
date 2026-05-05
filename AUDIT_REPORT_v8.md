# Repository Audit Report v8 - Areloria Monorepo

**Datum:** 2026-05-18
**Auditor:** Jules (Senior DevOps & Fullstack Architect)

---

## Status Quo
Das Areloria-Repository ist ein komplexes pnpm-Monorepo, das Spiel-Client, Server, Engine und diverse Hilfsdienste umfasst. Die Struktur ist historisch gewachsen und weist Anzeichen von Fragmentierung auf. Zwar wurde in vorangegangenen Audits versucht, die Struktur zu konsolidieren, jedoch bestehen weiterhin kritische Konfigurationsfehler in der Paketverwaltung und CI/CD-Logik.

---

## Kritische Fehler (Critical Errors)

1.  **Dependency Protocol Mismatch (Registry 404s):**
    Mehrere Pakete (z.B. `client`, `apps/api`) referenzieren interne Abhängigkeiten (wie `@wasd/shared`) mit `*` anstatt des `workspace:*` Protokolls. Dies führt dazu, dass `pnpm install` versucht, diese privaten Pakete aus der öffentlichen npm-Registry zu laden, was mit 404-Fehlern fehlschlägt und den gesamten Build-Prozess blockiert.

2.  **pnpm Versions-Konflikt:**
    In der `root package.json` wird `pnpm@9.1.0` gefordert. Die `deploy.yml` nutzt jedoch explizit `pnpm@8`. Diese Inkonsistenz führt zu nicht-deterministischen Lockfile-Updates und potenziellen Fehlern bei der Dependency-Resolution in der Deployment-Pipeline.

3.  **Strukturelle Redundanz & "Dirty Workarounds":**
    Es existieren redundante Paketverzeichnisse (z.B. `client/` vs. `packages/client/`). Das Deployment-Skript `deploy.yml` enthält einen manuellen `rm -rf packages/client packages/server` Befehl, um Konflikte zu umgehen, anstatt die Workspace-Struktur sauber zu bereinigen.

4.  **Fehlende Build-Isolierung:**
    Sub-Pakete verlassen sich auf global installierte Build-Tools (z.B. `tsc`), anstatt diese explizit in den `devDependencies` zu führen oder über das Monorepo-Root konsistent bereitzustellen. Dies führt zu `sh: 1: tsc: not found` Fehlern in isolierten CI-Umgebungen.

---

## Optimierungspotenzial (Optimization Potential)

1.  **TypeScript Project References:**
    Die `tsconfig.json` im Root ist unvollständig. Viele Projekte haben `composite: false`, was die inkrementelle Kompilierung über das gesamte Monorepo hinweg verhindert und die Build-Zeiten unnötig verlängert.

2.  **CI/CD Pipeline-Härtung:**
    Die `main-pipeline.yml` enthält redundante Caching-Strategien. Eine Umstellung auf das native Caching von `actions/setup-node` für pnpm würde die Komplexität reduzieren. Zudem sollte `continue-on-error` global deaktiviert werden, um "Silent Failures" zu verhindern.

3.  **Modernisierung des Docker-Builds:**
    Das aktuelle `Dockerfile` nutzt manuelle `COPY`-Befehle für Artefakte. Die Nutzung von `pnpm deploy` (verfügbar seit pnpm v7+) wäre ein deutlich robusterer und effizienterer Weg, um produktionsbereite Standalone-Images für den Server zu erstellen.

---

## Action Plan (Schritt-für-Schritt)

### Phase 1: Fix Core Infrastructure (Sofort)
1.  **Protokoll-Update:** Umstellung aller internen Abhängigkeiten auf `workspace:*` in allen `package.json` Dateien.
2.  **Versions-Abgleich:** Update der `deploy.yml` auf `pnpm@9.1.0` und Synchronisation mit der Root-Konfiguration.
3.  **Workspace-Bereinigung:** Löschen der redundanten `packages/client` und `packages/server` Verzeichnisse, falls diese leer oder veraltet sind (Validierung erforderlich).

### Phase 2: Build & Type-Safety
1.  **Build-Tools:** Sicherstellen, dass `typescript` in jedem Paket als `devDependency` vorhanden ist oder über `pnpm -w exec tsc` aufgerufen wird.
2.  **TS-Architektur:** Aktivierung von `composite: true` in allen Sub-Paketen und Vervollständigung der `references` in der Root `tsconfig.json`.

### Phase 3: CI/CD & Deployment
1.  **Refactoring Dockerfile:** Umstellung auf `pnpm deploy --filter @wasd/server --prod /prod/server`.
2.  **Pipeline-Cleanup:** Entfernung redundanter Caching-Steps und Aktivierung strikter Fehlerprüfung in allen Workflows.

---
*Audit abgeschlossen.*
