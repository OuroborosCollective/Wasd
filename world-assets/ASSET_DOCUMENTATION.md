# Asset-Dokumentation: GLB-Modelle (Google Drive Import)

Diese Dokumentation beschreibt die aus der Google Drive Umgebung importierten und in das Repository `OuroborosCollective/Wasd` einsortierten GLB-Assets. Der Import wurde am 25. März 2026 durchgeführt.

## Übersicht der Asset-Struktur

Die Assets wurden im Verzeichnis `world-assets/` nach Kategorien sortiert, um eine effiziente Nutzung in der Spielwelt zu ermöglichen.

| Kategorie | Beschreibung | Anzahl Assets |
| :--- | :--- | :--- |
| `characters/` | Spielercharaktere, NPCs und Körperteile | 11 |
| `monsters/` | Kreaturen und Reittiere | 5 |
| `buildings/` | Architektur und Gebäude | 1 |
| `props/` | Waffen, Rüstungen und Dekorationsobjekte | 22 |
| `admin/` | System-Assets und temporäre Modelle | 3 |
| **Gesamt** | | **42** |

## Detaillierte Asset-Liste

### Charaktere (`characters/`)
- `Body_female.glb` / `Body_male.glb`: Basis-Körpermodelle
- `Head_female2.glb` / `Head_male1.glb` / `head_femalea1.glb`: Kopf-Varianten
- `Npc001.glb` / `blacksmith_npc.glb` / `npc_warrior1.glb`: Spezifische NPCs
- `Warrior_gltf_fall_slash_run_walk_idle.glb`: Animiertes Krieger-Modell
- `humanknight.glb`: Ritter-Modell
- `mageenemy01.glb`: Magier-Gegner

### Monster (`monsters/`)
- `bigbear01.glb`: Bären-Modell
- `boar01.glb`: Wildschwein-Modell
- `horse.glb` / `horsebrown.glb`: Pferde-Modelle
- `wolfredeye.glb`: Wolf-Modell mit roten Augen

### Gebäude (`buildings/`)
- `woodcillagehouse1.glb`: Holzhütte/Dorfhaus

### Ausrüstung & Props (`props/`)
- **Waffen**: `1h_sword_01-03`, `2h_sword01-02`, `2h_Axe_01-02`, `magicstaff01`, `Teslarifle`, `MG16Assault`
- **Rüstung**: `armor_legs01-02`, `bodyarmor01-02`, `helmet01`, `metalhelmet01`, `metalhelmet2`, `epicfrostfire_helmet`
- **Sonstiges**: `Shield01`, `deko_outdoor1-02`

## Import-Prozess

Der Import erfolgte automatisiert über den **Google Drive Connector** (`gws` CLI). Dabei wurden folgende Schritte durchgeführt:

1. **Discovery**: Suche nach allen Dateien mit der Endung `.glb` in der Drive-Umgebung.
2. **Kategorisierung**: Automatische Zuordnung zu den Zielordnern basierend auf Namenskonventionen.
3. **Validierung**: Überprüfung der Dateigrößen und erfolgreicher Download als Binärdaten (`alt=media`).
4. **Integration**: Einpflegen in die Git-Versionsverwaltung des Repositories.

## Hinweise zur Nutzung

- Alle Modelle liegen im **GLB-Format** (GL Transmission Format Binary) vor.
- Die Assets in `admin/` (z.B. `ec8e948a...glb`) sollten vor der produktiven Nutzung überprüft oder umbenannt werden.
- Neue Assets sollten gemäß der Struktur in `README_ASSETS.md` hinzugefügt werden.
