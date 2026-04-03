# World Asset Pools (Starter Pack)

Dieses Setup ermoeglicht euch, Worldgen/GM-Objekte sofort mit austauschbaren Placeholder-GLBs zu rendern.

## Ziel

- Sofort spielbarer Stand mit einfachen Modellen
- Spaeter Austausch auf eigene GLBs ohne Server- oder Gameplay-Logik-Umbau
- Mapping zentral in einer JSON-Datei

## Datei

- `game-data/world/asset-pools.json`

## Aufbau

- `defaults`: Fallback pro Kategorie
- `pools.<category>.<key>`: Konkrete Zuordnung

Unterstuetzte Kategorien im aktuellen Resolver:

- `players`
- `npcs`
- `monsters`
- `loot`
- `resources`
- `world_objects`

Alias-Mapping im Resolver:

- `npc` -> `npcs`
- `monster` -> `monsters`
- `object`, `world`, `worldobject` -> `world_objects`
- `resource` -> `resources`

## Live-Verwendung im Server

Der Server sendet in `entity_sync` jetzt `glbPath` fuer:

- Players
- NPCs
- Loot
- World Objects (falls kein expliziter `obj.glbPath` gesetzt ist)

Vorrang-Regeln:

1. `GLBRegistry` (`gm_register_glb`, `admin_glb_link`) hat Prioritaet
2. Dann `asset-pools.json`
3. Dann `defaults`

## Schnelltest

1. Server starten
2. Mit GM Tool verbinden
3. `gm_place_object` mit `objectType = house` ausfuehren
4. In `entity_sync` sollte Objekt `glbPath` erhalten (aus `world_objects.house`)
5. Dann in `asset-pools.json` nur den URL-Wert tauschen und neu testen

## Schrittweiser Austausch auf eigene Assets

Beispiel:

- Vorher:
  - `"house": "/assets/models/objects/chest.glb"`
- Nachher:
  - `"house": "/assets/models/buildings/house_01.glb"`

Keine Codeaenderung erforderlich, nur JSON-Mapping.

## NoCode Ops: Snapshot & Rollback (GM Console)

Im GM-Panel (Bereich **Asset Pool Editor**) gibt es jetzt zusaetzlich:

- **Create Snapshot**: Speichert den aktuellen Stand der Asset-Pools als Datei.
- **List Snapshots**: Laedt vorhandene Snapshots in die Auswahl.
- **Restore Snapshot**: Rollback auf den gewaehlten Snapshot.
- **Refresh Ops Status**: Zeigt aktuelle Kennzahlen (Models, Links, Pool-Eintraege, Snapshots, ARE-Mode).

Snapshot-Dateien liegen unter:

- `game-data/world/asset-pool-snapshots/`

Empfohlener Ablauf:

1. Snapshot vor groesseren Mapping-Aenderungen erstellen.
2. Pool-Eintraege/Defaults im GM-Panel anpassen.
3. Ergebnis im Client pruefen.
4. Bei Bedarf Snapshot auswaehlen und per Restore zurueckrollen.
