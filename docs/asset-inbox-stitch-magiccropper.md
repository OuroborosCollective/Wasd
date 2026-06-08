# Stitch Loot UI Inbox

Raw Stitch bundles belong in:

```txt
.asset-inbox/stitch/
```

The current uploaded bundle is:

```txt
.asset-inbox/stitch/arelorian_stitch_magiccropper_integration.zip
```

Run locally or in CI:

```bash
node scripts/scan-stitch-asset-inbox.mjs
node scripts/import-stitch-loot-ui.mjs
```

Generated output:

```txt
client/public/assets/stitch-loot-ui/manifest.json
client/public/assets/stitch-loot-ui/crop-manifest.json
client/src/loot/ui/LootVisualRegistry.generated.ts
```

The import is deterministic: sorted file walking, slugified ids, stable JSON manifests, and SHA-256 hashes for promoted files.

Gameplay stays server-authoritative. The client uses the generated registry only to render loot visuals.
