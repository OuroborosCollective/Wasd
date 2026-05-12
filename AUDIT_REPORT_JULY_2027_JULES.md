# Audit-Bericht: Monorepo Infrastruktur & Architektur (Juli 2027)

## Status Quo
Das Repository ist ein umfangreiches TypeScript-Monorepo, das mit **pnpm** und dem **isolated node-linker** verwaltet wird. Es umfasst verschiedene Domänen: `apps`, `packages`, `projects` sowie spezialisierte Komponenten wie `server`, `client`, `engine` und `backend`. Die Build-Orchestrierung erfolgt über pnpm-Filter und GitHub Actions. Die Codebase nutzt moderne Standards wie React 19 und TypeScript 6 (Stand Juli 2027).

## Kritische Fehler
1.  **Dockerfile Syntaxfehler:** In `Dockerfile.prod` war ein verketteter Befehl fehlerhaft (`RUN apk add ... RUN pnpm install`), was den Build-Prozess sofort abbrach.
2.  **Deployment Port-Mismatch:** Der Healthcheck im `vps-deploy.yml` prüfte Port 3000, während das `docker-compose.prod.yml` den Container-Port 3000 auf den externen Port 80 mappt. Dies führte zu fehlerhaften Healthchecks nach dem Deployment.
3.  **Inkonsistente Workspace-Definition:** In `pnpm-workspace.yaml` wurde für `projects/` kein Glob-Pattern verwendet, was die automatische Erkennung von Unterpaketen in diesem Verzeichnis unzuverlässig machte.
4.  **Nicht-deterministische Builds:** Das Production-Dockerfile verwendete `--no-frozen-lockfile`, was zu Abweichungen zwischen Entwicklungs- und Produktionsumgebungen führen konnte.

## Optimierungspotenzial
1.  **TypeScript-Konfiguration:** Mehrere Pakete (`core-network`, `eco-trader`) erweiterten nicht die zentrale `tsconfig.base.json`, was zu inkonsistenten Compiler-Regeln und fehlender Unterstützung für inkrementelle Builds (`composite: true`) führte.
2.  **Abhängigkeits-Drift:** Versionen von Kern-Bibliotheken (React, TypeScript) variierten leicht zwischen den Paketen. Eine Zentralisierung über `pnpm.overrides` in der Root-`package.json` war notwendig.
3.  **CI-Effizienz:** Die Redundanz im Root-Install-Script (`pnpm install -r`) wurde entfernt, da pnpm dies in Workspaces standardmäßig übernimmt.

## Action Plan
1.  **Struktur-Fixes:** Glob-Pattern in `pnpm-workspace.yaml` korrigiert und redundante Scripte entfernt.
2.  **Typisierungs-Standardisierung:** `tsconfig.json`-Vererbung für alle Bibliotheken und Projekte vereinheitlicht, um Build-Graph-Integrität sicherzustellen.
3.  **Deployment-Absicherung:** `Dockerfile.prod` repariert, `--frozen-lockfile` erzwungen und Healthcheck-Ports synchronisiert.
4.  **Dependency-Alignment:** Core-Versionen (TS 6.0.3, React 19.2.6) monorepo-weit über Overrides festgeschrieben.

---
*Erstellt von Jules (Senior DevOps & Fullstack Architect)*
