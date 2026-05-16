# DGCC

Run the repository-wide Design+Gameplay Consistency Contract gate.

## Usage

```bash
pnpm run dgcc
pnpm run dgcc:extreme
DGCC_FIX=1 pnpm run dgcc
```

Artifacts: `dgcc-artifacts/`

`extreme` mode adds a production `server` build. A full client Vite production build is not part of this gate yet (known `@wasd/shared` dist resolution issue with the client bundler).

Self-heal wrapper (fixes on, extreme mode default): `bash tools/dgcc/selfheal-wrapper.sh`
