# Build Sequence Master

Aktuelle Build-/Verify-Reihenfolge im Projekt:

1. Install dependencies: `pnpm install`
2. Sync world assets mirror: `node scripts/sync-world-assets.mjs`
3. Lint: `pnpm run lint`
4. Unit/Integration tests (Vitest): `pnpm run test`
5. Build client and server: `pnpm run build`
6. Audit model paths: `pnpm run audit:model-paths`
7. Optional E2E: `pnpm run test:e2e:ci`

Hinweise:

- `pnpm run dev` startet den Server (`server`) mit eingebettetem Vite-Dev-Middleware-Client.
- Der produktive Runtime-Start ist `pnpm run start` (Node lädt `server/dist/index.js`).
- Content-Pack-Publishing (`pnpm run content:publish`) ist ein optionaler separater Schritt.
