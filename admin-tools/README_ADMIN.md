# Admin Tools & World Editor

Dieses Verzeichnis enthält die Kernlogik für die Administrations- und Welt-Bearbeitungswerkzeuge von Areloria WASD. Gemäß der Architektur-Vorgabe wurde dieser Bereich nach `tooling/admin-tools/` verschoben, um eine strikte Trennung zwischen produktiven Spiel-Services und Entwickler-Werkzeugen zu gewährleisten.

## Übersicht

Die Admin-Tools ermöglichen es Game Mastern (GMs) und Level-Designern, die Spielwelt in Echtzeit zu manipulieren, KI-Agenten (Jules) zu steuern und technische Parameter des Metaverse zu überwachen.

## Kernkomponenten

### 1. WorldEditor.ts
Das Herzstück der Welt-Manipulation. Es verwaltet den Scene-Graph-Zugriff, ermöglicht das Selektieren von Objekten in der Three.js-Umgebung und synchronisiert Änderungen direkt mit der Datenbank über den API-Core.

### 2. TerrainBrush.ts
Ein spezialisiertes Werkzeug zur Echtzeit-Deformation des Terrains.
- Unterstützung für Heightmap-Manipulation.
- Voxel-basierte Anpassungen für Höhlen und Überhänge.
- Textur-Painting zur Definition von Biomen.

### 3. ObjectPlacement.ts
System zur Instanziierung von Assets aus dem Asset-Management-Service.
- Snap-to-Grid Funktionalität.
- Randomisierungs-Algorithmen für natürliche Objektverteilung (Vegetation).
- Validierung von Kollisionsmatrizen beim Platzieren.

### 4. GMControlPanel.ts
Das Interface für administrative Eingriffe:
- Spieler-Management (Kick/Ban/Teleport).
- Server-Status Überwachung.
- Trigger-Ausführung für globale Events.

### 5. LiveWorldControl.ts
Schnittstelle zur Steuerung der KI-Agenten (Jules). Ermöglicht es GMs, Agenten-Workflows manuell zu überschreiben oder neue Verhaltensmuster in die laufende Welt zu injizieren.

## GM-Status & Visualisierung

Zur Identifikation von Administratoren innerhalb der Spielwelt wird das Mount-System genutzt:
- **Mount `gm_giraffe`**: Dieses spezifische Reittier markiert den Benutzer visuell als Administrator im aktiven Dienst. Es schaltet zudem das Overlay für die oben genannten Werkzeuge frei.

## Architektur & Integration

Die Tools kommunizieren über:
- **WebSockets (Echtzeit)**: Für unmittelbare visuelle Änderungen im Viewport aller verbundenen Clients.
- **REST-API**: Für persistente Änderungen an der Welt-Datenbank.
- **Python-Services**: Zur Berechnung komplexer Logik-Optimierungen während des Editierens (z.B. NavMesh-Rebuilds).

---
*Status: In aktiver Entwicklung. Teil des Sovereign Studio Design-Coder Frameworks.*