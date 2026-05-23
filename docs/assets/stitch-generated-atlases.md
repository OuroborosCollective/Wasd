# Stitch generated atlas import

This flow imports project-owned generated Stitch atlas ZIP files into the client-2d public asset tree.

## Priority

Phase 1 prioritizes gameplay environment assets:

- buildings
- props
- vegetation
- ground tiles
- combat and magic fx

Character atlases are preserved carefully. Draft character atlases are not allowed to pollute random NPC selection unless explicitly promoted later.

## Source issue

The workflow defaults to issue #1071. Upload Stitch atlas ZIP files to that issue, then run:

```bash
Import Stitch 2D Atlases
```

The importer downloads the ZIP attachments from the issue, normalizes folder-derived names, fixes atlas JSON `meta.image`, and updates `/2d-assets/manifest.json`.

## Output

Generated files are placed under:

```txt
apps/client-2d/public/2d-assets/stitch/
```

The importer also writes:

```txt
apps/client-2d/public/2d-assets/stitch/stitch-atlas-manifest.json
apps/client-2d/public/2d-assets/credits/stitch-generated-atlas-provenance.md
```

## Validation

The workflow runs:

```bash
pnpm --filter @wasd/client-2d validate:assets
NODE_OPTIONS=--max-old-space-size=4096 pnpm --filter @wasd/client-2d build
```

It then verifies that the built dist contains both the normal root manifest and the Stitch atlas manifest.
