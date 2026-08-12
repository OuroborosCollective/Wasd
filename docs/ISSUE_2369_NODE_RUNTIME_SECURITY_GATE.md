# Issue #2369: Node.js-Sicherheitsupdate mit Runtime-Digest-Evidence

## Auditstand

Der Auditstand ist `dad57978d07cd2745db8cc7624dd9baea73dc2af` auf Basis von `origin/main`. Der lokale Runner meldet Node `v22.13.0`; dies ist **keine** Production-Evidence. In dieser Arbeitsumgebung stehen weder Docker noch Podman, Crane oder Skopeo zur Verfügung. Damit kann hier weder der laufende Container noch dessen unveränderlicher Image-Digest überprüft werden.

Die offizielle Node.js-Sicherheitsmitteilung vom 29. Juli 2026 benennt Node `v22.23.2` als gepatchte 22.x-Version. Sie umfasst unter anderem die High-Severity-CVEs CVE-2026-56846, CVE-2026-56848 und CVE-2026-58043 sowie weitere HTTP-, mTLS-, Permission- und Parser-Fixes.[1]

## Versionierte Build-Pfade

| Pfad | Beobachteter Node-Tag | Bewertung |
|---|---|---|
| `Dockerfile` | `node:22.23.2-alpine` | Konkrete gepatchte Version, jedoch ohne Digest-Pin |
| `docker/Dockerfile.alpine` | `node:22.23.2-alpine` | Konkrete gepatchte Version, jedoch ohne Digest-Pin |
| `docker/Dockerfile.production` | `node:22.23.2-slim` | Konkrete gepatchte Version, jedoch ohne Digest-Pin |
| `Dockerfile.prod` | `node:22-alpine` | Floating-Major-Tag; keine reproduzierbare Patchversion |
| `Dockerfile.vps` | `node:22-alpine` | Floating-Major-Tag; keine reproduzierbare Patchversion |

Die bereits vorhandene interne Sicherheitsdokumentation nennt `22.23.2` als Zielversion. Sie erbringt jedoch keine Evidence für die tatsächlich laufende VPS-Revision oder einen Deployment-Digest.

## Entscheidung

> **Keine Integration.** Ein Node-Image-Update wird nicht auf Basis eines lokalen Runners oder eines Floating-Tags vorgenommen.

Vor einem reviewbaren Production-Patch müssen ein realer Deployment-Commit, die laufende Node-Version und der unveränderliche Digest des Server-Images aus der Produktionsruntime erfasst werden. Anschließend sind die relevanten Security-, Health-, WebSocket- und Auth-Gates sowie Tick-, Hash- und Replay-Vergleiche gegen diese Runtime auszuführen. Ohne diese Evidence würde ein `FROM node:*`-Patch lediglich eine Konfiguration ändern, nicht aber den vom Issue geforderten Sicherheits- und Determinismusnachweis liefern.

## Referenz

[1]: https://nodejs.org/en/blog/vulnerability/july-2026-security-releases "Node.js Security Releases, 29 July 2026"
