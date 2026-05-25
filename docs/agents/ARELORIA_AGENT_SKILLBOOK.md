# Areloria Agent Skillbook

This file is the shared working contract for future coding agents in the WASD / Areloria repository.

## Core rule

Build emergence through deterministic world laws, not hard behavioral cages.

## PR chain protocol

1. Check the previous PR status.
2. If it is merged, branch from current main or the merge commit.
3. Keep one PR to one architecture layer.
4. Do not mix pure logic, mutation, WorldTick routing, rewards, resonance, and UI in one PR.
5. Always name the next follow-up layer in the PR body.

Preferred order:

```txt
pure module
adapter
NPCSystem commit point
WorldTick event surface
reward consequence
resonance echo
portal or client visualization
```

## Emergence over forced behavior

Wrong:

```txt
critical energy -> force one action
```

Right:

```txt
critical energy -> survivalBias + risk + consequence projection
```

NPCs should keep autonomy. The world should answer with measurable consequences.

## Pure logic before mutation

Use this shape whenever possible:

```txt
EmergentBrain
-> ThermalLogic
-> EmergentThermalAdapter
-> NPCSystem
-> WorldTick
-> Reward / Echo / Visual
```

Adapters return audit data. Commit points mutate state.

## Deterministic event language

World events should be explicit payloads. Include as many of these fields as apply:

```txt
eventType
sourceId or npcId
factionId
position or kappa coordinate
tick
reason
risk
sourceAction
state or energy delta
kappaHash
```

Do not add rewards, faction mood changes, or UI effects before the event payload exists.

## GitHub connector safety mode

If a tool call is blocked:

1. Keep the same technical intent.
2. Use calmer branch and PR names.
3. Avoid dramatic language in branch names, commit messages, and PR bodies.
4. Preserve existing constants if already in code.
5. Retry with neutral wording.

## WASD monorepo style

Before editing:

1. Fetch the actual file from main.
2. Respect import style, especially `.js` runtime suffixes.
3. Keep changes minimal.
4. Add tests for new logic.
5. Avoid new dependencies unless necessary.
6. Prefer stable ordering and deterministic hashes.

## Agent Learnings

### Documentation-only learning PRs

Context: When a task asks to persist reusable agent knowledge, keep it separate from runtime fixes.

Rule:

- Use a small docs-only branch and PR.
- Update `docs/agents/ARELORIA_AGENT_SKILLBOOK.md` first.
- Touch `.github/copilot-instructions.md` or `.cursor/rules/areloria-agent-skillbook.mdc` only for short routing reminders.
- Do not include source-code fixes in the same PR unless explicitly requested.

Anti-pattern:

```txt
fix runtime bug + rewrite agent rules + update cursor rules in one PR
```

Recommended PR layer: agent knowledge / documentation.

Test requirement: No runtime tests are required for docs-only changes. Verify Markdown structure and that the instructions remain agent-readable.

### Reusable error documentation format

Context: Concrete incidents should teach future agents without turning one-off logs into permanent doctrine.

Rule: Document repeatable failures with this shape:

```txt
Symptom: observable failure text or behavior.
Cause: general root cause, not only the one incident.
Safe diagnosis: command, file, log, or invariant that proves it.
Recommended fix: minimal repeatable repair.
Affected paths: likely files, workflows, scripts, or deployment surfaces.
```

Anti-pattern:

```txt
Today deployment failed because commit abc123 was broken.
```

Recommended PR layer: field note or agent learning.

Test requirement: Link the learning to the diagnostic command or affected path when possible.

### Architecture learning format

Context: Architecture notes must protect emergence and determinism without freezing NPC behavior.

Rule: Document reusable architecture guidance with this shape:

```txt
Context: where the rule applies.
Rule: what future agents must do.
Anti-pattern: what must not be introduced.
Recommended PR layer: the correct layer in the chain.
Test requirement: what proves deterministic behavior.
```

Anti-pattern:

```txt
NPCs must always pick action X when condition Y happens.
```

Recommended PR layer: pure module, adapter, commit point, WorldTick event surface, reward consequence, resonance echo, or portal/client visualization.

Test requirement: Prefer deterministic unit tests for pure logic and event-shape tests for WorldTick surfaces.

### Public route and ingress failures

Symptom: Browser shows `Cannot GET /portal`, `Cannot GET /are-console.html`, or the domain opens but a specific client shell route fails while container health checks pass.

Cause: The server process, static client build, Docker port mapping, nginx public route, and SPA fallback are separate layers. A green container health check only proves the upstream responds; it does not prove that the public domain maps every client route to the intended static asset or fallback.

Safe diagnosis:

```txt
curl -I http://127.0.0.1:<upstream-port>/
curl -I https://<domain>/
curl -I https://<domain>/<failing-route>
docker ps
nginx -T | grep -E "server_name|proxy_pass|root|try_files"
```

Recommended fix:

- Verify the built client artifact contains the requested file or that the route is intentionally SPA-handled.
- Route the public domain to the correct upstream port used by the deployed container.
- Add or repair nginx `try_files` / proxy fallback so browser routes do not become raw Express 404s.
- Keep container health, host port mapping, ingress HTTP, and named client routes as separate deploy checks.

Affected paths:

```txt
.github/workflows/*deploy*.yml
Dockerfile.prod
docker-compose*.yml
scripts/*nginx*
server/src/*
client/dist or portal/dist
```

Recommended PR layer: deployment route / infrastructure docs or deploy script. Do not mix with gameplay logic.

Test requirement: A deploy PR must prove root URL, at least one named client route, container-local HTTP, host-local HTTP, and public ingress HTTP separately.

### Monorepo build and ESM drift

Symptom: CI or deployment fails with stale lockfile errors, broken pnpm workspace links, missing package builds, TypeScript module-resolution errors, or runtime import failures after code appears to compile locally.

Cause: WASD is a multi-package pnpm monorepo. Stubs, workspace packages, generated client bundles, and Node ESM runtime imports can drift independently. TypeScript may accept an import shape that Node later rejects when `.js` runtime suffixes, package exports, or build order are wrong.

Safe diagnosis:

```txt
pnpm install --frozen-lockfile
pnpm -r build
pnpm -r typecheck
pnpm -r test
pnpm list -r --depth 0
find . -name package.json -not -path "*/node_modules/*"
```

Recommended fix:

- Repair `package.json` workspace dependencies before changing source imports.
- Keep `pnpm-lock.yaml` synchronized with every package manifest change.
- Preserve existing ESM import style, including `.js` runtime suffixes where the repo already uses them.
- Build packages in dependency order and avoid hiding missing package links with local-only path hacks.
- Prefer one PR for workspace/build graph repair and a separate PR for gameplay or engine logic.

Affected paths:

```txt
pnpm-workspace.yaml
pnpm-lock.yaml
package.json
apps/*/package.json
packages/*/package.json
projects/*/package.json
server/src/**/*.ts
client/src/**/*.ts
engine/**/*.ts
```

Recommended PR layer: monorepo build graph / dependency hygiene. Do not mix with WorldTick, NPC, reward, or visual changes.

Test requirement: Run deterministic install, recursive build, recursive typecheck, and focused tests for touched packages.

### Active deploy path split

Context: Areloria can be served by Docker images, PM2 host deploys, nginx static webroots, or a proxy chain. Do not assume a green workflow means the public domain uses the code path you edited.

Rule: Before fixing a public route or landing page, identify the active runtime layer and prove it with commands against container-local, host-local, and public HTTPS URLs.

Anti-pattern:

```txt
patch Dockerfile.prod while production is currently served by PM2 + nginx static webroot
```

Safe diagnosis:

```txt
pm2 status
pm2 env <id> | grep -E "CLIENT_ROOT_DIR|PORT|NODE_OPTIONS"
docker ps --format 'table {{.Names}}\t{{.Ports}}\t{{.Status}}'
ss -ltnp | grep -E ':80|:443|:3001'
nginx -T | grep -E "server_name|listen 443|root|proxy_pass|try_files"
curl -s http://127.0.0.1:3001/ | head
curl -s https://www.arelorian.de/ | head
```

Recommended fix:

- Patch the deploy path that is actually serving traffic.
- Keep Docker image fixes, PM2 host-deploy fixes, and nginx vHost fixes in separate PRs.
- When both PM2 and Docker exist, document which workflow invokes which script.
- Verify the commit deployed on `/opt/areloria` before changing unrelated runtime code.

Affected paths:

```txt
Dockerfile.prod
Dockerfile.vps
docker-compose*.yml
scripts/deploy-vps-docker.sh
deploy/update.sh
deploy/repair-nginx.sh
.github/workflows/*deploy*.yml
```

Recommended PR layer: deployment surface selection. Do not mix with client design or server routing unless the active path proves it is required.

Test requirement: The deploy log must show active commit, active process manager, active webroot, upstream port, and public HTTPS route result.

### Static landing and route-marker verification

Symptom: Deploy passes but `https://www.arelorian.de/` still shows the old app shell instead of the landing page with 3D / 2D / Portal choices, or `/portal/` shows an old bundle after a manual repair.

Cause: Frontend builds can overwrite `client/dist/index.html`, route bundles can be copied into the wrong webroot, and nginx HTTPS can keep serving an older `root` even after host-local PM2 checks pass.

Safe diagnosis:

```txt
grep -q 'LIVE_ENTRYPOINTS' /opt/areloria/client/dist/index.html
grep -q 'PORTAL ONLINE' /opt/areloria/client/dist/portal/index.html
curl -s http://127.0.0.1:3001/ | grep -E 'LIVE_ENTRYPOINTS|application-canvas'
curl -s https://www.arelorian.de/ | grep -E 'LIVE_ENTRYPOINTS|application-canvas'
nginx -T | grep -E 'listen 443|server_name|root|try_files'
```

Recommended fix:

- Build the browser clients first, then run the runtime entrypoint writer last if it owns the root landing page.
- Assemble `2d`, `3d`, and `portal` folders under the same `CLIENT_ROOT_DIR/dist` that `ServerBootstrap` or nginx serves.
- Repair both HTTP and HTTPS nginx vHosts when the public URL is HTTPS.
- Add marker checks to deploy scripts so a green deploy proves content identity, not only status 200.

Affected paths:

```txt
scripts/write-runtime-entrypoints.mjs
deploy/update.sh
deploy/repair-nginx.sh
server/src/core/ServerBootstrap.ts
client/dist
portal/dist
apps/client-2d/dist
apps/web/dist
```

Recommended PR layer: deployment content assembly / static ingress. Do not mix with gameplay, NPC logic, or ARE kernel changes.

Test requirement: Verify status and body markers for `/`, `/2d/`, `/portal/`, host-local HTTP, and public HTTPS. Status 200 alone is not enough.

### Public shell invariant

Context: Areloria public shells are deterministic route bundles, not incidental Vite outputs.

Rule: Treat `/`, `/2d/`, `/3d/`, and `/portal/` as explicit release artifacts. A deploy that serves one shell must prove the others are assembled under the same active webroot.

Anti-pattern:

```txt
copy portal/dist manually, restart PM2, and call the deploy fixed without updating the route assembly script
```

Recommended PR layer: deploy assembly / static ingress documentation. Keep this separate from visual redesign and runtime code fixes.

Test requirement: Public shell deploys must check both HTTP status and body identity markers. Use marker strings such as `LIVE_ENTRYPOINTS` and `PORTAL ONLINE` when those pages are generated by `scripts/write-runtime-entrypoints.mjs`.

## Current ladder

```txt
#1198 EmergentBrainKernel
#1199 ThermalLogic
#1200 EmergentThermalAdapter
#1201 Autonomous Thermal Risk Model
#1202 World Event Payload
#1203 NPCSystem Integration
#1204 WorldTick Event Surface
#1205 Deterministic Event Rewards
#1206 Resonance Echo
#1207 Portal / Client Visualization
```

## Fast command semantics

```txt
los / weiter / ok weiter / zuegig
-> verify status, branch, patch, PR, short report

ist gemerged
-> verify PR, continue next layer

mach das ins repo
-> make a branch and PR, do not only write a prompt
```

## Design contract

- No random decisions where deterministic scoring works.
- Preserve NPC autonomy unless the world state is final.
- Make consequences auditable.
- Surface events in WorldTick before rewards, mood, or visuals.
- Keep the world stateless where possible.
- Commit only explicit state transitions.
