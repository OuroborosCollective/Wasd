# Umfassender Repository-Audit-Bericht - August 2026

**Status Quo:**
Das Repository ist ein umfangreiches TypeScript-Monorepo, das auf pnpm-Workspaces basiert. Es umfasst ca. 38 Projekte, darunter Kern-Anwendungen, geteilte Bibliotheken und spezialisierte Simulationsmodule. Die CI/CD-Infrastruktur nutzt GitHub Actions und Docker. Vor dem Audit war die Struktur durch fragmentierte Node-Versionen, redundante Workflows und Ghost-Dependencies (verursacht durch `shamefully-hoist=true`) gekennzeichnet, was zu instabilen Builds und Deployment-Lücken führte.

**Kritische Fehler:**
1. **ELOOP (Symbolic Link Loop):** Redundante symbolische Links im `server`-Paket blockierten den CI-Lauf vollständig.
2. **Build-Abbrüche:** Fehlende Abhängigkeiten (`lucide-react`, `eventemitter3`) in den Paketen `portal` und `social` verhinderten die Kompilation.
3. **Typ-Inkonsistenzen:** Massive Versionsunterschiede bei `@types/node` (v22 bis v25) und React-Typen führten zu inkompatiblen Build-Artefakten.
4. **Deployment-Chain:** Ein fehlendes `vps_deploy.py`-Skript und unsichere SSH-Konfigurationen unterbrachen die automatisierte Release-Kette.
5. **TS-Deprecations:** Nicht unterdrückte `baseUrl`-Warnungen hätten bei einem Upgrade auf TypeScript 7.0 den Build gestoppt.

**Optimierungspotenzial:**
1. **Pipeline-Performance:** Konsolidierung aller CI-Logiken in eine einzige `main-pipeline.yml` auf Basis von Node 22 und pnpm 9.12.2 zur Reduzierung von Redundanz und Laufzeit.
2. **Dependency-Isolation:** Umstellung auf den standardmäßigen isolierten Node-Linker zur Eliminierung von Ghost-Dependencies und zur Durchsetzung sauberer Schnittstellen.
3. **Build-Graph Effizienz:** Vollständige Implementierung von TypeScript Project References im gesamten Monorepo für schnellere inkrementelle Kompilation.

**Action Plan:**
1. **Paket-Management:** `.npmrc` bereinigt und `shamefully-hoist` entfernt; pnpm-Versionen synchronisiert.
2. **Abhängigkeits-Harmonisierung:** Zentralisierung der Kern-Bibliotheken (React, Three.js, Node-Typen) via `pnpm.overrides` im Root-Verzeichnis.
3. **TypeScript-Standardisierung:** Alle `tsconfig.json` auf Node-Typen aktualisiert und moderne Standards (`moduleResolution: "bundler"`, `ignoreDeprecations`) implementiert.
4. **Workflow-Konsolidierung:** Löschung veralteter Workflows (`MMORPG Smart CI v5`, `ci.yml`) und Härtung der Haupt-Pipeline.
5. **Deployment-Härtung:** Dockerfile modernisiert, `vps_deploy.py` mit Fokus auf Sicherheit (CodeQL-konform) erstellt und `scripts/deploy-vps.sh` stabilisiert.

---
*Audit durchgeführt von Senior DevOps & Fullstack Architect Jules.*
