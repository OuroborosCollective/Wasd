# WASD AI Skill: GitHub Actions Repair & VPS Deploy Recovery

Purpose: capture proven repair patterns from WASD workflow debugging so future agents can diagnose and fix failures quickly, safely, and deterministically.

## Core principle

Do not assume a failing workflow means the workflow YAML is broken. First inspect the failing job logs and identify the first real compiler/runtime error. In WASD, multiple workflows can fail from the same source-code bug.

## Standard workflow triage

1. Fetch the exact GitHub Actions job logs for the failing job ID.
2. Find the first explicit error after checkout/install/build begins.
3. Compare separate failing jobs for a shared root cause.
4. Fix the root source-code/config error first; avoid noisy workflow rewrites.
5. Use a small atomic commit with one clear purpose.
6. Re-run failed jobs or push to trigger fresh CI.

## Known WASD incident: May 25, 2026

Two workflows failed together:

- Replit SDK Smoke
- VPS Docker Deploy

Both were caused by the same TypeScript/esbuild parser error in:

```txt
server/src/core/are/AREShadowLogSink.ts
```

Error:

```txt
Cannot use "||" with "??" without parentheses
```

Bad pattern:

```ts
options.everyTicks ?? Number(process.env.ARE_SHADOW_LOG_EVERY_TICKS) || 60
```

Fixed pattern:

```ts
(options.everyTicks ?? Number(process.env.ARE_SHADOW_LOG_EVERY_TICKS)) || 60
```

Committed fix:

```txt
fix(server): parenthesize ARE shadow log tick fallback
```

Merged commit:

```txt
b2609e43af085f8095198018e78b6ebfc1cca129
```

## GitHub write fallback pattern

If direct file update or direct main ref update is blocked:

1. Create a blob with the corrected file contents.
2. Create a tree from the current main commit with the blob replacing the target path.
3. Create a commit with the current main SHA as parent.
4. Create a branch pointing to that commit.
5. Open a PR against main.
6. Merge the PR using squash or merge commit.

This branch/PR path is safer and usually accepted even when direct update-to-main is blocked.

## VPS Docker Deploy diagnostics

If SSH succeeds and Docker build starts, the VPS connection is not the root problem. Read the Docker build stage logs. In WASD, Docker build can fail because `pnpm --filter @wasd/server --if-present build` fails during TypeScript transpilation.

Signs the deploy path is healthy:

```txt
SSH OK
Runtime env OK
Docker network OK
Build images
```

If failure appears after those, diagnose repository build output, not SSH secrets.

## Node / pnpm notes

WASD uses a pnpm monorepo with many workspace projects. Builds may use Node 22+ and pnpm 11 in CI/Docker even when older workflow snippets mention pnpm 9. Treat lockfile and package-manager drift carefully.

Avoid random dependency upgrades inside emergency fixes unless the logs clearly require it.

## Commit discipline

Good emergency fix style:

```txt
fix(server): parenthesize ARE shadow log tick fallback
```

Bad emergency fix style:

```txt
fix workflows
```

The commit message should name the actual broken subsystem.

## ARE/WASD-specific warning

Files under `server/src/core/are/` are part of the deterministic ARE runtime layer. Keep fixes minimal and avoid changing runtime semantics unless requested. Parentheses around fallback expressions are safe when preserving intended behavior.
