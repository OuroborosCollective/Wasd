# Asset Brain Architect - Integration Guide

## Übersicht

Das **Asset Brain Architect System** ist ein LLM-gestütztes System zur Generierung vollständiger 3D-Asset-Spezifikationen aus minimalen Texteingaben. Es ist jetzt vollständig in das Wasd-MMORPG integriert.

## Architektur

### Komponenten

```
server/src/modules/asset-brain/
├── assetBrainEngine.ts          # LLM-Integration und Heuristik-Engine
├── AssetBrainSchema.ts          # TypeScript-Typen und Interfaces
├── AssetBrainDatabase.ts        # Datenbank-Operationen (CRUD)
└── (CLI-Interface - in Arbeit)

server/src/api/
└── assetBrainRoute.ts           # REST API Endpoints
```

### Datenbank-Tabellen

```sql
-- Asset Specifications (generierte Spezifikationen)
asset_specifications
  - id, user_id, asset_name, asset_class, style
  - specification (JSONB), auto_decisions (JSONB)
  - version, is_public, created_at, updated_at

-- Asset Variants (optimierte Varianten)
asset_variants
  - id, specification_id, variant_type (hero/gameplay/mobileweb)
  - triangle_count, bone_count, texture_resolution
  - variant_data (JSONB)

-- Asset Library (öffentliche Bibliothek)
asset_library
  - id, specification_id, asset_name, asset_class, style
  - tags, thumbnail, is_public, downloads, rating

-- Batch Jobs (Batch-Verarbeitung)
asset_batch_jobs
  - id, user_id, job_type, status
  - input_file, output_file, assets_generated, errors
```

## API Endpoints

### Asset-Generierung

**POST** `/api/asset-brain/generate`

Generiert eine vollständige Asset-Spezifikation aus Texteingabe.

```bash
curl -X POST http://localhost:3000/api/asset-brain/generate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "assetInput": "knight with sword and shield",
    "name": "Medieval Knight",
    "style": "realistic",
    "tags": ["character", "medieval", "warrior"],
    "description": "A fully armored medieval knight",
    "isPublic": false
  }'
```

**Response:**
```json
{
  "success": true,
  "specification": {
    "id": "spec_...",
    "assetName": "Medieval Knight",
    "assetClass": "character",
    "style": "realistic",
    "platformProfiles": {
      "browser-mmo": { "targetTriangles": 15000, "maxBones": 60, ... },
      "android": { "targetTriangles": 8000, "maxBones": 40, ... },
      "pc-high-end": { "targetTriangles": 50000, "maxBones": 150, ... }
    },
    "topology": { "triangleCount": 15000, "vertexCount": 7500, ... },
    "materials": { "materialCount": 3, "pbr": true, ... },
    "rig": { "required": true, "boneCount": 60, ... },
    "animations": { "animationCount": 5, "animationTypes": ["idle", "walk", "run", "attack", "death"], ... },
    "lods": { "lodCount": 3, "lod0Triangles": 15000, "lod1Triangles": 8000, "lod2Triangles": 3000, ... },
    "qa": { "checklist": [...], "validationRules": [...], ... },
    "autoDecisions": [
      "Classified as character based on input keywords",
      "Assigned style: realistic",
      "Generated platform budgets based on asset class heuristics",
      ...
    ]
  },
  "variants": [
    {
      "id": "var_...",
      "variantType": "hero",
      "triangleCount": 15000,
      "description": "hero optimized variant"
    },
    {
      "id": "var_...",
      "variantType": "gameplay",
      "triangleCount": 8000,
      "description": "gameplay optimized variant"
    },
    {
      "id": "var_...",
      "variantType": "mobileweb",
      "triangleCount": 3000,
      "description": "mobileweb optimized variant"
    }
  ]
}
```

### Spezifikationen abrufen

**GET** `/api/asset-brain/my-specs`

Listet alle Assets des aktuellen Benutzers auf.

```bash
curl -X GET http://localhost:3000/api/asset-brain/my-specs \
  -H "Authorization: Bearer <token>"
```

**GET** `/api/asset-brain/specs/:id`

Ruft eine spezifische Asset-Spezifikation ab.

```bash
curl -X GET http://localhost:3000/api/asset-brain/specs/spec_... \
  -H "Authorization: Bearer <token>"
```

### Varianten abrufen

**GET** `/api/asset-brain/variants/:id`

Listet alle Varianten einer Spezifikation auf.

```bash
curl -X GET http://localhost:3000/api/asset-brain/variants/spec_...
```

### Suche und Bibliothek

**GET** `/api/asset-brain/search?assetClass=character&style=realistic`

Sucht öffentliche Spezifikationen.

**GET** `/api/asset-brain/library?assetClass=character&style=realistic`

Durchsucht die öffentliche Asset-Bibliothek.

### Batch-Verarbeitung

**POST** `/api/asset-brain/batch`

Startet einen Batch-Job für CSV/JSON-Import.

```bash
curl -X POST http://localhost:3000/api/asset-brain/batch \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "jobType": "csv-import",
    "inputFile": "/uploads/assets.csv"
  }'
```

**GET** `/api/asset-brain/batch/:id`

Ruft den Status eines Batch-Jobs ab.

## Konfiguration

### Umgebungsvariablen

```bash
# .env
BUILT_IN_FORGE_API_URL=https://api.manus.im
BUILT_IN_FORGE_API_KEY=<your-api-key>

# Asset Brain Konfiguration
ASSET_BRAIN_MODEL=gpt-4-turbo
ASSET_BRAIN_MAX_TOKENS=4000
ASSET_BRAIN_TEMPERATURE=0.7
```

### LLM-Integration

Das System verwendet die Manus Built-in LLM API. Die Konfiguration erfolgt automatisch über die Umgebungsvariablen.

## Verwendungsbeispiele

### Beispiel 1: Einfache Asset-Generierung

```typescript
// Client-seitig
const response = await fetch('/api/asset-brain/generate', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    assetInput: 'dragon',
    isPublic: true
  })
});

const { specification, variants } = await response.json();
console.log(`Generated: ${specification.assetName}`);
console.log(`Variants: ${variants.map(v => v.variantType).join(', ')}`);
```

### Beispiel 2: Asset-Suche

```typescript
const response = await fetch('/api/asset-brain/search?assetClass=creature&style=stylized');
const { specifications } = await response.json();

specifications.forEach(spec => {
  console.log(`${spec.assetName} (${spec.assetClass}) - ${spec.style}`);
});
```

### Beispiel 3: Batch-Import

```typescript
const formData = new FormData();
formData.append('file', csvFile);

const response = await fetch('/api/asset-brain/batch', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`
  },
  body: formData
});

const { jobId } = await response.json();

// Poll for status
const statusResponse = await fetch(`/api/asset-brain/batch/${jobId}`, {
  headers: { 'Authorization': `Bearer ${token}` }
});
const { status, assetsGenerated } = await statusResponse.json();
```

## Asset-Klassen

Das System unterstützt folgende Asset-Klassen:

- **character** - Spieler-Charaktere, NPCs
- **creature** - Gegner, Monster, Tiere
- **prop** - Gegenstände, Möbel, Dekorationen
- **weapon** - Waffen, Werkzeuge
- **environment** - Terrain, Gebäude, Landschaften

## Plattform-Profile

Für jedes Asset werden automatisch Varianten für folgende Plattformen generiert:

| Plattform | Ziel-Triangles | Max Bones | Use Case |
|-----------|----------------|-----------|----------|
| browser-mmo | 15.000 | 60 | Web-Browser MMO |
| android | 8.000 | 40 | Mobile Geräte |
| pc-high-end | 50.000 | 150 | PC mit hoher Grafik |

## Nächste Schritte

- [ ] CLI-Interface für lokale Asset-Generierung
- [ ] Web-UI für Asset-Generator im GM-Panel
- [ ] Automatische GLB-Generierung aus Spezifikationen
- [ ] Asset-Marketplace Integration
- [ ] Batch-Processing Completion Handler
- [ ] Asset-Versionierung und Rollback
- [ ] Performance-Monitoring für LLM-Calls

## Troubleshooting

### LLM API Fehler

Wenn die Asset-Generierung fehlschlägt:

1. Prüfen Sie die `BUILT_IN_FORGE_API_KEY` Konfiguration
2. Überprüfen Sie die LLM-API Verfügbarkeit
3. Prüfen Sie die Logs: `tail -f server/logs/asset-brain.log`

### Datenbank-Fehler

Wenn die Tabellen nicht erstellt werden:

```bash
# Manuell initialisieren
npm run db:init-asset-brain
```

### Performance

Für große Batch-Jobs:

1. Erhöhen Sie `ASSET_BRAIN_MAX_TOKENS` für komplexere Assets
2. Verwenden Sie Batch-Processing statt einzelner Requests
3. Implementieren Sie Caching für häufig generierte Asset-Klassen

## Support

Für Fragen oder Probleme:
- GitHub Issues: https://github.com/thosu87-svg/Wasd/issues
- Dokumentation: `/docs/asset-brain/`
