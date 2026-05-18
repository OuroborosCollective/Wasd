# Audit-Bericht: Areloria Monorepo (Juni 2028)

## Status Quo
Das Repository ist ein komplexes Monorepo, das mit **pnpm (v11.1.1)** und **TypeScript (v6.0.3)** verwaltet wird. Entgegen dem Standard-Plug'n'Play (PnP) Ansatz wird eine **isolierte node-linker** Strategie verwendet (konfiguriert in `.npmrc`). Die Struktur umfasst zahlreiche `apps`, `packages` und `projects`, wobei eine zentrale `tsconfig.base.json` zur Vererbung genutzt wird. Das Deployment erfolgt über mehrere Pfade: ein Legacy-SSH-Pfad mit PM2 und ein moderner Docker-basierter VPS-Pfad.

---

## Kritische Fehler

1.  **Verletzung der TypeScript 'composite' Konfiguration:**
    - Die zentrale `tsconfig.json` nutzt `references`, um Pakete zu verknüpfen. Mehrere Kernpakete (z.B. `@wasd/shared`, `@wasd/core-logic`, `@wasd/server`) haben jedoch `composite: false` oder die Einstellung fehlt gänzlich. Dies verhindert, dass `tsc --build` den Abhängigkeitsgraphen korrekt verarbeitet, was zu inkonsistenten Builds führt.
2.  **Lockfile-Drift im Deployment:**
    - Das Skript `deploy/update.sh` führt `pnpm install --no-frozen-lockfile` direkt auf dem VPS aus. Dies ist in Produktionsumgebungen riskant, da es zu nicht-deterministischen Builds führt und auf VPS-Instanzen häufig Out-of-Memory (OOM) Kills verursacht, wenn pnpm versucht, den gesamten Abhängigkeitsbaum neu zu berechnen.
3.  **Lückenhafte Projekt-Referenzen:**
    - Während die Root-`tsconfig.json` viele Referenzen enthält, fehlen in lokalen `tsconfig.json` Dateien einiger Pakete (z.B. `@wasd/web`) die entsprechenden Einträge für interne Abhängigkeiten (wie `@wasd/shared`), obwohl diese in der `package.json` deklariert sind. Dies führt zu Problemen bei der Typsicherheit und in der IDE-Unterstützung.

---

## Optimierungspotenzial

1.  **Harmonisierung der Dependency-Versionen:**
    - Es gibt signifikante Versionsunterschiede bei Kernwerkzeugen:
        - `vitest`: Reicht von `^1.6.0` (portal) bis `^4.1.6` (root).
        - `vite`: Reicht von `^5.2.8` (portal) bis `^8.0.13` (server).
        - `pg` und `zod`: Inkonsistenzen zwischen `peerDependencies` und `dependencies` in `@wasd/database` und `@wasd/server`.
2.  **Bereinigung veralteter Workflows:**
    - Es existieren mehrere überlappende GitHub Workflows (`main-pipeline.yml`, `vps-docker-deploy.yml`, `deploy.yml`). Eine Konsolidierung in eine einzige robuste Pipeline mit Environment-Gates würde den Wartungsaufwand reduzieren.
3.  **Docker-Build Effizienz:**
    - Die Verwendung von `sync-pnpm-lockfile-for-docker.py` zeigt, dass das Root-Lockfile oft nicht mit den Manifesten synchron ist. Ein sauber gepflegtes Lockfile würde diesen Workaround überflüssig machen.
4.  **Peer-Dependency Mismatches:**
    - `pnpm install` zeigt Warnungen für `@vitejs/plugin-react` (erwartet Vite 8, findet 6.4.2 in einigen Apps). Diese sollten aufgelöst werden, um Laufzeitfehler zu vermeiden.

---

## Action Plan

### Schritt 1: TypeScript Projekt-Referenzen korrigieren
- Alle in der Root-`tsconfig.json` referenzierten Pakete müssen `"composite": true` und `"declaration": true` in ihrer lokalen `tsconfig.json` gesetzt haben.
- Sicherstellen, dass jede interne Abhängigkeit (workspace:*) auch als `reference` in der jeweiligen `tsconfig.json` auftaucht.

### Schritt 2: Standardisierung der Versionen
- Alle `vitest`, `vite` und `@types/node` Versionen auf den Stand der Root-`package.json` bringen.
- `pnpm dedupe` ausführen, um das Lockfile nach der Bereinigung zu optimieren.

### Schritt 3: Absicherung der Deployment-Skripte
- In `deploy/update.sh` den Befehl `pnpm install --no-frozen-lockfile` durch `pnpm install --frozen-lockfile` ersetzen.
- Bei OOM-Problemen auf dem VPS den Swap-Speicher erhöhen oder ausschließlich auf das Docker-basierte Deployment setzen, das bereits Speicher-Optimierungen enthält.

### Schritt 4: CI/CD Konsolidierung
- `main-pipeline.yml` als veraltet markieren und vollständig auf `vps-docker-deploy.yml` für die Produktion umsteigen.
- Einen zentralen CI-Schritt für `typecheck` implementieren, der `tsc --build` nutzt, um 'composite' Fehler frühzeitig abzufangen.

### Schritt 5: Auflösung von Peer-Dependency Konflikten
- Die `peerDependencies` in `@wasd/database` für `pg` und `zod` an die tatsächlich genutzten Versionen anpassen.
- `@vitejs/plugin-react` in allen Apps auf eine Version aktualisieren, die mit der genutzten Vite-Version kompatibel ist.
