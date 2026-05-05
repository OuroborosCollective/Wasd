# Umfassender Architektur-Audit Bericht - Mai 2026

## Status Quo
Das Areloria Monorepo ist eine komplexe Struktur basierend auf **pnpm Workspaces** (v9.1.0). Es umfasst ca. 37 Projekte, die in `apps/`, `packages/`, `projects/` sowie Root-Level-Ordnern (`client/`, `server/`) organisiert sind.
- **Frontend:** Vite + Babylon.js / React.
- **Backend:** Node.js (Express/WS) mit Supabase/Postgres/Redis Integration.
- **CI/CD:** GitHub Actions mit Fokus auf automatisiertes Linting, Typechecking und Deployment auf VPS/Docker.
- **TypeScript:** Zentralisierte Konfiguration via `tsconfig.base.json`, jedoch mit Inkonsistenzen in der Umsetzung der Project References.

---

## Kritische Fehler (Blocking)
1. **Interne Dependency-Auflösung (404 Fehler):**
   - Pakete wie `@wasd/api` referenzieren `@wasd/database` und `@wasd/redis` mit `*` statt `workspace:*`.
   - Da diese Pakete nicht in der öffentlichen npm-Registry existieren, schlägt `pnpm install` fehl. Dies stoppt den gesamten Build-Prozess in einer sauberen Umgebung.
2. **Inkonsistente TypeScript-Konfiguration (Composite Mode):**
   - Mehrere Kern-Pakete (`core-logic`, `core-ecs`, `spatial-hub`) haben `composite: false`.
   - Da die Root-`tsconfig.json` diese via `references` einbindet, bricht der TypeScript-Compiler (`tsc -b`) ab, da Project References den `composite`-Modus zwingend erfordern.
3. **Gefährliche Deployment-Praktiken:**
   - Das Skript `scripts/bypass-ts-errors.mjs` injiziert massenhaft `// @ts-nocheck` in den Source-Code, um Builds zu erzwingen. Dies korrumpiert die Typ-Sicherheit und maskiert echte Laufzeitrisiken.
   - `deploy.yml` nutzt `pnpm@8`, was zu Inkompatibilitäten mit dem `pnpm-lock.yaml` (v9) führt.
4. **Zirkuläre/Redundante Workspace-Definitionen:**
   - `pnpm-workspace.yaml` definiert Pfade, die sich überschneiden (z.B. Root `client/` vs. `apps/client/`). Dies führt zu `EDUPLICATEWORKSPACE` Fehlern und instabilem Caching.

---

## Optimierungspotenzial
1. **Harmonisierung der Tooling-Versionen:**
   - `vitest` ist in den Versionen 1.2, 1.3, 1.6 und 4.1 vertreten. Eine Vereinheitlichung spart Disk-Space und verhindert Verhaltensunterschiede in Tests.
   - `@types/node` sollte monorepo-weit auf eine Version (passend zur Node 20 LTS) fixiert werden.
2. **Docker Image Effizienz:**
   - Das aktuelle Dockerfile kopiert das gesamte `node_modules` Verzeichnis. Durch den Einsatz von `pnpm deploy --filter=@wasd/server` könnte die Image-Größe um ca. 60-70% reduziert werden.
3. **CI/CD Pipeline Speed:**
   - Die `paths`-Filter in `main-pipeline.yml` sind veraltet (verweisen noch auf `shared/**` statt `packages/shared/**`). Dadurch triggert die Pipeline bei Änderungen in Kern-Paketen ggf. nicht.
4. **Ghost Dependencies:**
   - Obwohl kein `.npmrc` gefunden wurde, deuten Audit-Logs auf den Wunsch nach `shamefully-hoist=true` hin. Dies sollte vermieden werden, um die strikte Kapselung von pnpm zu nutzen.

---

## Action Plan

### Schritt 1: Fix Dependency Graph
- [ ] Alle internen Referenzen in `package.json` Dateien von `*` auf `workspace:*` umstellen.
- [ ] Namensschema vereinheitlichen: `@app/core-logic` zu `@wasd/core-logic` umbenennen.
- [ ] Veraltete Verzeichnisse (`packages/types` vs `packages/shared`) konsolidieren.

### Schritt 2: TypeScript Infrastruktur reparieren
- [ ] `composite: true` und `declaration: true` in allen Sub-Workspaces aktivieren.
- [ ] Root `tsconfig.json` Referenzen bereinigen (nur existierende Pfade).
- [ ] `tsconfig.base.json` als Pflicht-Extend in allen Paketen etablieren.

### Schritt 3: CI/CD & Deployment Hardening
- [ ] `pnpm/action-setup` in allen Workflows auf Version 4 (für pnpm 9) aktualisieren.
- [ ] `bypass-ts-errors.mjs` aus dem Deployment-Flow entfernen.
- [ ] Dockerfile auf `pnpm deploy` umstellen.

### Schritt 4: Cleanup & Standardisierung
- [ ] `pnpm-workspace.yaml` aufräumen (Redundanzen entfernen).
- [ ] Root-Level `package.json` um `pnpm.overrides` ergänzen, um Tool-Versionen (Vitest, TS) zu erzwingen.
