# Austauschbare World-Assets (ohne Code ändern)

Mit dieser Struktur kannst du deine GLB-Assets jederzeit austauschen, ohne Server-/Client-Code anzupassen.

## Datei

- `game-data/world/asset-pools.json`

## Idee

- Die Weltlogik arbeitet mit stabilen **Asset-Keys** (z. B. `house_small`, `tree_oak`, `prop_lantern`).
- Die Keys werden in `asset-pools.json` auf echte GLB-Pfade gemappt.
- Du tauscht später nur den Pfad im JSON aus.

## Aufbau

```json
{
  "meta": {
    "version": 1
  },
  "pools": {
    "building": [
      "/assets/models/world/buildings/house_small_a.glb",
      "/assets/models/world/buildings/house_medium_a.glb"
    ],
    "vegetation": [
      "/assets/models/world/vegetation/tree_oak_a.glb"
    ],
    "prop": [
      "/assets/models/world/props/lamp_a.glb"
    ]
  },
  "aliases": {
    "house_small": "building",
    "tree": "vegetation",
    "lamp": "prop"
  }
}
```

## Was darfst du ändern?

- Du kannst alle GLB-Pfade in den Arrays ersetzen oder erweitern.
- Mehrere Einträge in einem Array = zufällige Variation für denselben Typ/Key.
- Wichtig: Pfade müssen unter `client/public` erreichbar sein (z. B. `/assets/models/...`).

## Mapping-Reihenfolge

Für World-Objekte wird in dieser Reihenfolge aufgelöst:

1. `obj.glbPath` (wenn explizit gesetzt)
2. `pools[assetKey]` (wenn assetKey selbst ein Poolname ist)
3. `aliases[assetKey] -> pools[...]`
4. `pools[type]` (wenn `type` ein Poolname ist)
5. `aliases[type] -> pools[...]`
6. `pools.object` (Fallback)

## Beispiel: Asset austauschen

Wenn du `house_small_a.glb` durch ein neues Modell ersetzen willst:

1. neue Datei hochladen, z. B. `/assets/models/world/buildings/house_small_zd.glb`
2. in `asset-pools.json` den Pfad im Pool `building` tauschen
3. deployen/restarten

Fertig – Logik/Spawner bleiben unverändert.
