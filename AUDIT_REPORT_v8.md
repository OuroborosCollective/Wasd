# Repository Audit Report v8 - Areloria Monorepo

**Datum:** 2026-05-18
**Auditor:** Jules (Senior DevOps & Fullstack Architect)

---

## Status Quo
Das Areloria-Repository ist ein komplexes pnpm-Monorepo. Während des Audits wurden kritische Fehler in der Paketverwaltung und CI/CD-Logik identifiziert, die bereits teilweise behoben wurden. Die Struktur weist Anzeichen von Fragmentierung auf, was die Stabilität der Builds beeinträchtigt.

---

## Behobene Kritische Fehler (Fixed Critical Errors)

1.  **Dependency Protocol Mismatch (Registry 404s):**
    Interne Abhängigkeiten in `client`, `apps/api` und `apps/web` (z.B. `@wasd/shared`, `@wasd/database`) wurden von `*` auf `workspace:*` umgestellt. Dies behebt die 404-Fehler bei `pnpm install`, da pnpm nun korrekt im lokalen Workspace nach diesen Paketen sucht.

2.  **pnpm Versions-Konflikt:**
    Die `deploy.yml` wurde von `pnpm@8` auf `pnpm@9.1.0` aktualisiert, um mit der Root-Konfiguration (`package.json`) konsistent zu sein.

3.  **Fehlende Abhängigkeiten in Shared Packages:**
    In `packages/shared`, `packages/core` und `packages/rendering-bridge` wurden fehlende `devDependencies` (wie `@babylonjs/core`, `@types/three`, `ioredis`) ergänzt, um den Build-Prozess zu stabilisieren.

4.  **Client Build-Fixes:**
    Fehlerhafte Import-Pfade im Client (z.B. falsche Referenzen auf `shared/protocol`) und Typ-Konflikte im `main.ts` wurden korrigiert.

---

## Verbleibende Kritische Fehler (Remaining Critical Errors)

1.  **Server TypeScript ESM-Konflikte:**
    Der `@wasd/server` nutzt `NodeNext` für die Modulauflösung, was explizite `.js` Dateiendungen bei relativen Importen erfordert. Aktuell fehlen diese in weiten Teilen des Server-Codes, was zu massiven Build-Fehlern führt.

2.  **Server Typ-Fehler:**
    Es bestehen signifikante API-Mismatches im Server-Code (z.B. `NPCRelationshipSystem`, `NPCMemoryCache`, `OuroborosLoop`), die auf eine unvollständige Refaktorierung oder veraltete Interfaces hindeuten.

3.  **Fehlende Build-Isolierung:**
    Obwohl einige Tools ergänzt wurden, verlassen sich Teile der Pipeline noch auf globale Tools.

---

## Optimierungspotenzial (Optimization Potential)

1.  **Automatisierte Import-Korrektur:**
    Ein Skript zur automatischen Ergänzung der `.js` Endungen im Server-Code würde die ESM-Migration erheblich beschleunigen.

2.  **CI/CD Pipeline-Härtung:**
    Die `main-pipeline.yml` sollte auf strikte Fehlerprüfung umgestellt werden (Entfernung von `continue-on-error`).

3.  **Modernisierung des Docker-Builds:**
    Umstellung auf `pnpm deploy` für effizientere und robustere Produktions-Images.

---

## Action Plan (Schritt-für-Schritt)

### Phase 1: Server ESM & API Fixes (Nächste Schritte)
1.  **ESM-Korrektur:** Massen-Update der relativen Importe im Server (`.js` Endungen ergänzen).
2.  **Interface-Abgleich:** Korrektur der Typ-Fehler in den NPC- und Ouroboros-Modulen des Servers.

### Phase 2: CI/CD & Deployment
1.  **Refactoring Dockerfile:** Umstellung auf `pnpm deploy --filter @wasd/server --prod /prod/server`.
2.  **Pipeline-Cleanup:** Entfernung redundanter Caching-Steps und Aktivierung strikter Fehlerprüfung.

---
*Audit abgeschlossen. Kritische Infrastruktur-Fixes wurden appliziert.*

---

## Update vom 2026-05-18 - CI & Build Remediation

Nach der ersten Analyse wurden folgende Sofortmaßnahmen umgesetzt, um die CI-Pipeline zu stabilisieren:

1.  **Workflow-Härtung:**
    - In `ci.yml` wurde `--if-present` entfernt, da es fälschlicherweise an die Build-Tools (tsc/vite) durchgereicht wurde.
    - `git-to-lore.yml` wurde so konfiguriert, dass der VPS-Trigger in Umgebungen ohne Secrets (z.B. PRs) sicher übersprungen wird.
2.  **Abhängigkeits-Korrektur:**
    - Alle internen Workspace-Pakete nutzen nun das `workspace:*` Protokoll.
    - Das neue Paket `@wasd/utils` wurde in `packages/utils` etabliert, um fehlende Logger-Abhängigkeiten in der API sauber zu ersetzen.
3.  **Linting & Hygiene:**
    - Eine zentrale `eslint.config.mjs` wurde erstellt, die alle Pakete abdeckt und die "Config not found" Fehler behebt.
    - `*.tsbuildinfo` wurde zur `.gitignore` hinzugefügt, um Rauschen im Repository zu vermeiden.
4.  **Build-Stabilität:**
    - Client, API, Shared, Rendering Bridge und Utils wurden erfolgreich für den Build validiert.
    - Der Server erfordert weiterhin eine umfangreiche ESM-Migration (Import-Endungen) und API-Abgleich, was als nächste Phase im Action Plan geführt wird.
