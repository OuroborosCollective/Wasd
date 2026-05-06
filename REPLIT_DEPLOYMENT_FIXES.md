# Deployment Fixes — Applied via Replit Portal

**Date:** 2026-05-06T13:26:45.034Z
**Repository:** OuroborosCollective/Wasd

## Issues Identified & Fixed

### 1. `tsx: not found` (server crash on start)
- **Root cause:** Server used `tsx watch src/index.ts` but `tsx` was not in devDependencies
- **Fix:** Install `tsx` as a devDependency

```bash
pnpm add -D tsx
```

### 2. `node_modules missing`
- **Root cause:** Dependencies were never installed before the start command ran
- **Fix:** Run `pnpm install` before `pnpm run dev` in the startup script

### 3. Hardcoded port 3000
- **Root cause:** `vite.config.ts` had `server: { port: 3000 }` hardcoded
- **Fix:** Read `PORT` from environment variable

```ts
const port = Number(process.env.PORT ?? 3000);
export default defineConfig({ server: { port, host: "0.0.0.0" } });
```

### 4. Missing `allowedHosts`
- **Root cause:** Vite blocked requests from the proxy host
- **Fix:** Add `allowedHosts: true` to the Vite server config

```ts
server: { port, host: "0.0.0.0", allowedHosts: true }
```

---
*Synced by Areloria WASD Portal — built on Replit*
