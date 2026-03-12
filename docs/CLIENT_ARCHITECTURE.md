# Client Architecture

Der Client rendert die Welt, hält lokale UI-Zustände und synchronisiert sich über WebSocket mit dem Server.

## Schichten
- engine/
- gameplay/
- networking/
- ui/
- editor/
- assets/

## Regeln
- Keine autoritative Logik im Client
- Keine Persistenzentscheidungen im Client
- Asset- und Renderlogik bleiben getrennt von Simulation und Politik