# Sovereign-Studio-ato → WASD: revisionsgebundene Gate-Portierung

## Ziel und Grenze

Die Portierung übernimmt die **Vertragsmechanik** aus Sovereign-Studio-ato, nicht dessen Domänenlogik, MCP-Komponenten oder Signaturschlüssel. Beide Repositories teilen den produktiven VPS und verlangen einen serverautoritativen Nachweis derselben Git-Revision in Quelle, Image und Runtime. Die WASD-Variante bleibt deshalb fail-closed und veröffentlicht weder Seeds, Zugangsdaten noch sonstige Secret-Werte.

## Vertragsvergleich

| Sovereign-Vertrag | WASD-Entsprechung | Status |
|---|---|---|
| Guardian prüft eine volle SHA gegen den tatsächlich ausgecheckten Head sowie aktuellen Main. | `scripts/revision-guardian.mjs` verlangt 40-stellige Revisionen, prüft Head-Gleichheit und verweigert PR-Heads ohne aktuellen Main als Vorfahr. | Implementiert. |
| Guardian veröffentlicht einen maschinenlesbaren Evidence-Hash. | `wasd.revision-guardian-evidence.v1` verwendet einen rekursiv kanonischen SHA-256-Hash und verbietet Secret-Ausgaben. | Implementiert. |
| Koordinierter Release bindet Image-Digest und `org.opencontainers.image.revision` an denselben Main-Commit. | Der finale WASD-Runner trägt `org.opencontainers.image.revision=$BUILD_COMMIT_SHA`; der Runtime-Readback prüft Label, Repo-Head und `client-config.json`. | Implementiert, erst nach neuem VPS-Deploy messbar. |
| Unabhängiger Target-System-Readback vergleicht Manifest, Runtime und Endpoint-Evidence gegen eine exakte Revision. | `scripts/vps-runtime-readback.mjs` erfasst ohne Secrets Containerstatus, Image-ID, OCI-Revision, `/client-config.json`, 2D-Build-Stamp und 3D-Artefakt. `verify-wasd-vps-runtime-receipt.mjs` validiert die kanonische Receipt. | Implementiert, benötigt echte Revisionsauslieferung. |
| Readback-SSH ist hostgebunden und vermeidet Host-Key-Bypass. | Der Workflow akzeptiert ausschließlich `46.202.154.25` mit dem im Repository gepinnten ED25519-Fingerprint `SHA256:pskBohJoTx/V3iCPaD9m1sW1vchvhvGc89lKnX0RocQ`. | Implementiert. |
| Erst ein verifizierter Receipt erzeugt den Production-Deployment-Status. | `wasd-vps-revision-readback.yml` erzeugt einen GitHub-Deployment-Status erst nach Receipt-Validierung für die gleiche Revision. | Implementiert. |

## Bewusst nicht übernommene Teile

Sovereign verifiziert den Target-Receipt zusätzlich mit einem kurzlebigen GitHub-App-Token und einer SSH-Signatur. Für WASD ist kein äquivalentes App-/Signer-Setup im Repository konfiguriert. Ein bloßes Nachahmen dieser Felder ohne echten Schlüssel wäre eine Ersatzwahrheit. WASD nutzt deshalb die bereits bestehende GitHub-Secret- und SSH-Verbindung, pinnt den VPS-Hostkey und lässt jede fehlende oder widersprüchliche Runtime-Evidence fehlschlagen.

## Reale Abnahmefolge

Nach Merge muss der Main-Deploy den neuen Docker-Runner erzeugen. Erst dann kann der Workflow `WASD Revision-Bound VPS Readback` die gleiche Commit-SHA im VPS-Repo, im OCI-Image-Label, in `client-config.json` und im 2D-Build-Stamp lesen. Der 3D-Readback verweigert weiterhin die bekannte Platzhalterseite. Ohne diese vier übereinstimmenden Nachweise wird kein Production-Deployment-Status veröffentlicht.

## Referenzen

[1] [Sovereign Revision Guardian](https://github.com/OuroborosCollective/Sovereign-Studio-ato/blob/main/.github/workflows/revision-guardian.yml)

[2] [Sovereign Coordinated Release und unabhängiger Runtime-Readback](https://github.com/OuroborosCollective/Sovereign-Studio-ato/blob/main/.github/workflows/sovereign-coordinated-release.yml)

[3] [Sovereign Runtime-Receipt-Validator](https://github.com/OuroborosCollective/Sovereign-Studio-ato/blob/main/scripts/verify_sovereign_runtime_receipt.py)
