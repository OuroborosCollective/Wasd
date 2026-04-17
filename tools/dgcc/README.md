# DGCC

Run the repository-wide Design+Gameplay Consistency Contract gate.

## Usage

```bash
pnpm run dgcc
pnpm run dgcc:extreme
DGCC_FIX=1 pnpm run dgcc
```

Artifacts: `dgcc-artifacts/`

`extreme` runs client and server builds before end-to-end tests so CI and fresh clones do not start Playwright against missing `server/dist` or `client/dist`. `minimal` triggers the same builds automatically only when those artifacts are absent (for example first run after clone).

Optional self-heal entrypoint: `bash tools/dgcc/selfheal-wrapper.sh`
