#!/usr/bin/env node
/**
 * Areloria Release State Audit.
 * Source scan only: no fake snapshots, no runtime simulation, no invented green state.
 */
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { extname, join, relative } from 'node:path';
import { argv, cwd, exit } from 'node:process';

const ROOT = cwd();
const FAIL = argv.includes('--fail');
const JSON_OUT = argv.includes('--json');
const BLOCKING = new Set(['BLOCKER', 'GAP']);
const EXTS = new Set(['.ts', '.tsx', '.js', '.mjs', '.json']);

const p = (path) => join(ROOT, path);
const exists = (path) => existsSync(p(path));
const read = (path) => {
  try { return readFileSync(p(path), 'utf8'); } catch { return ''; }
};
const has = (path, token) => read(path).includes(token);
const line = (path, token) => {
  const lines = read(path).split('\n');
  const idx = lines.findIndex((item) => item.includes(token));
  return idx === -1 ? path : `${path}:${idx + 1}`;
};

function files(dir, terms = []) {
  const out = [];
  const needles = terms.map((term) => term.toLowerCase());
  const walk = (abs) => {
    let entries = [];
    try { entries = readdirSync(abs); } catch { return; }
    for (const entry of entries) {
      if (['.git', 'node_modules', 'dist', 'build'].includes(entry)) continue;
      const full = join(abs, entry);
      let stat;
      try { stat = statSync(full); } catch { continue; }
      if (stat.isDirectory()) { walk(full); continue; }
      if (!EXTS.has(extname(entry))) continue;
      const rel = relative(ROOT, full).replaceAll('\\', '/');
      const haystack = rel.toLowerCase();
      if (needles.length === 0 || needles.some((term) => haystack.includes(term))) out.push(rel);
    }
  };
  walk(p(dir));
  return out.sort();
}

function methodIsEmpty(path, methodName) {
  const src = read(path);
  const start = src.indexOf(`${methodName}(`);
  if (start === -1) return true;
  const open = src.indexOf('{', start);
  if (open === -1) return true;
  let depth = 0;
  for (let i = open; i < src.length; i += 1) {
    if (src[i] === '{') depth += 1;
    if (src[i] === '}') depth -= 1;
    if (depth === 0) {
      const body = src.slice(open + 1, i)
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/\/\/.*$/gm, '')
        .replace(/\s+/g, ' ')
        .trim();
      return body.length === 0;
    }
  }
  return true;
}

function check(id, title, status, summary, evidence = [], nextFixes = []) {
  return { id, title, status, releaseBlocking: BLOCKING.has(status), summary, evidence: evidence.filter(Boolean), nextFixes };
}

function auditClient2d() {
  const pkg = read('package.json');
  const ok = pkg.includes('"build:2d"') && pkg.includes('"dev:2d"') && exists('apps/client-2d/src/DeterministicWorldIsoApp.tsx') && exists('apps/client-2d/src/game/liveGameplaySnapshot.ts');
  return check('client_2d', '2D client', ok ? 'PASS' : 'GAP', ok ? '2D client shell and scripts exist.' : '2D client shell or root scripts are incomplete.', [line('package.json', 'build:2d'), line('package.json', 'dev:2d'), exists('apps/client-2d/src/DeterministicWorldIsoApp.tsx') && 'apps/client-2d/src/DeterministicWorldIsoApp.tsx', exists('apps/client-2d/src/game/liveGameplaySnapshot.ts') && 'apps/client-2d/src/game/liveGameplaySnapshot.ts'], ['Restore build/dev scripts, deterministic app entry, and live snapshot type contract.']);
}

function auditRender() {
  const chunk = exists('apps/client-2d/src/ouroboros/ChunkRenderer.ts');
  const snap = exists('apps/client-2d/src/game/liveGameplaySnapshot.ts');
  const budget = files('apps/client-2d/src', ['renderbudget', 'render-budget', 'framebudget', 'liveworldoptimizer']);
  if (!chunk || !snap) return check('render_liveworld', 'Render/liveworld optimization', 'GAP', 'Chunk renderer or live snapshot contract is missing.', [chunk && 'apps/client-2d/src/ouroboros/ChunkRenderer.ts', snap && 'apps/client-2d/src/game/liveGameplaySnapshot.ts'], ['Restore render source files before optimization claims.']);
  return check('render_liveworld', 'Render/liveworld optimization', budget.length ? 'PASS' : 'PARTIAL', budget.length ? 'Chunk renderer and render budget helper exist.' : 'Chunk renderer exists, but no explicit render/frame-budget gate was found.', ['apps/client-2d/src/ouroboros/ChunkRenderer.ts', ...budget.slice(0, 5)], ['Add a visible-chunk driven render budget gate that never feeds gameplay truth.']);
}

function auditCombat() {
  const path = 'server/src/core/are/CombatTickSystem.ts';
  const okFiles = exists('server/src/modules/combat/CombatSystem.ts') && exists('server/src/modules/combat/CombatService.ts') && exists(path);
  if (!okFiles) return check('combat_system', 'Combat system', 'GAP', 'Combat module/service/tick system files are incomplete.', [exists('server/src/modules/combat/CombatSystem.ts') && 'server/src/modules/combat/CombatSystem.ts', exists('server/src/modules/combat/CombatService.ts') && 'server/src/modules/combat/CombatService.ts', exists(path) && path], ['Restore combat module, service, and TickSystem registration.']);
  const empty = methodIsEmpty(path, 'processCombatTimers') || methodIsEmpty(path, 'cleanupCombatStates');
  return check('combat_system', 'Combat system', empty ? 'BLOCKER' : 'PASS', empty ? 'Combat TickSystem is registered, but combat timers/cleanup are comment-only placeholders.' : 'Combat TickSystem has operational tick-time methods.', [path, methodIsEmpty(path, 'processCombatTimers') && `${path}#processCombatTimers`, methodIsEmpty(path, 'cleanupCombatStates') && `${path}#cleanupCombatStates`], ['Move cooldown expiry, damage-over-time, state TTL cleanup, and replay hash contribution into deterministic tick inputs.']);
}

function auditSkills() {
  const base = exists('server/src/skills/SkillTypes.ts') && exists('server/src/skills/SkillProgressionStore.ts') && exists('server/src/skills/SkillProgressionService.ts') && exists('apps/client-2d/src/ui/windows/SkillProgressionPanel.tsx');
  if (!base) return check('skills_progression', 'RuneScape-style leveling/UI', 'GAP', 'Skill server/UI pieces are incomplete.', [exists('server/src/skills/SkillTypes.ts') && 'server/src/skills/SkillTypes.ts', exists('server/src/skills/SkillProgressionStore.ts') && 'server/src/skills/SkillProgressionStore.ts', exists('server/src/skills/SkillProgressionService.ts') && 'server/src/skills/SkillProgressionService.ts', exists('apps/client-2d/src/ui/windows/SkillProgressionPanel.tsx') && 'apps/client-2d/src/ui/windows/SkillProgressionPanel.tsx'], ['Wire server skill progression and live 2D display.']);
  const ids = Array.from(read('server/src/skills/SkillTypes.ts').matchAll(/\| "([a-z_]+)"/g)).map((m) => m[1]);
  return check('skills_progression', 'RuneScape-style leveling/UI', ids.length >= 8 ? 'PASS' : 'PARTIAL', `Skill progression is live, but exposes ${ids.length} base skills; RuneScape breadth is still missing.`, ['server/src/skills/SkillTypes.ts', 'server/src/skills/SkillProgressionStore.ts', 'server/src/skills/SkillProgressionService.ts', 'apps/client-2d/src/ui/windows/SkillProgressionPanel.tsx'], ['Extend skill registry, grouping, XP sources, persistence migration, and UI breadth.']);
}

function auditLoot() {
  const path = 'server/src/loot/ProceduralLootMachine.ts';
  if (!exists(path) || !exists('server/src/loot/LootAxioms.ts')) return check('diablo_loot', 'Deterministic Diablo-like loot', 'GAP', 'Loot machine or axioms are missing.', [exists(path) && path, exists('server/src/loot/LootAxioms.ts') && 'server/src/loot/LootAxioms.ts'], ['Restore deterministic seed, rarity, affix, and transaction path.']);
  const src = read(path);
  const fallback = src.includes('fallback-${baseType}') || src.includes('Wanderer Gear') || src.includes('icons/items/fallback.png');
  return check('diablo_loot', 'Deterministic Diablo-like loot', fallback ? 'BLOCKER' : 'PASS', fallback ? 'Loot is tick-seeded, but can manufacture fallback base items when content is absent.' : 'No fallback base item manufacture detected in loot release path.', [path, 'server/src/loot/LootAxioms.ts', line(path, 'LootAxioms.makeSeed'), fallback && line(path, 'fallback-${baseType}')], ['Replace runtime fallback items with deterministic no-drop/quarantine result and release-gate required ItemBase coverage.']);
}

function auditMonsters() {
  const director = exists('server/src/modules/ai/MonsterDirector.ts');
  const worldTick = read('server/src/core/WorldTick.ts') + read('server/src/core/are/WorldTick.ts');
  if (!director) return check('monster_logic', 'Monster logic', 'GAP', 'No MonsterDirector runtime file found.', [], ['Add deterministic monster spawn/AI/combat intent director driven by tick, chunk, and observer inputs.']);
  return check('monster_logic', 'Monster logic', worldTick.includes('MonsterDirector') || worldTick.includes('monsterDirector') ? 'PASS' : 'PARTIAL', 'MonsterDirector exists; WorldTick/TickSystem integration must be verified.', ['server/src/modules/ai/MonsterDirector.ts'], ['Bridge monster logic through TickSystemRegistry or ARE event bus.']);
}

function auditEquipment() {
  const ok = exists('server/src/equipment/EquipmentService.ts') && exists('server/src/character/PaperdollTypes.ts') && exists('apps/client-2d/src/ui/windows/EquipmentPanel.tsx') && exists('apps/client-2d/src/ui/windows/CharacterPaperdollRoot.tsx') && has('server/src/routes/gameplaySnapshot.ts', 'createPaperdollSnapshot');
  return check('equipment_paperdoll', 'Character equipment paperdoll', ok ? 'PASS' : 'GAP', ok ? 'Server equipment, paperdoll snapshot, and 2D panels are wired.' : 'Equipment/paperdoll path is incomplete.', [exists('server/src/equipment/EquipmentService.ts') && 'server/src/equipment/EquipmentService.ts', exists('server/src/character/PaperdollTypes.ts') && 'server/src/character/PaperdollTypes.ts', exists('apps/client-2d/src/ui/windows/EquipmentPanel.tsx') && 'apps/client-2d/src/ui/windows/EquipmentPanel.tsx', exists('apps/client-2d/src/ui/windows/CharacterPaperdollRoot.tsx') && 'apps/client-2d/src/ui/windows/CharacterPaperdollRoot.tsx', has('server/src/routes/gameplaySnapshot.ts', 'createPaperdollSnapshot') && line('server/src/routes/gameplaySnapshot.ts', 'createPaperdollSnapshot')], ['Complete server authoritative equipment and paperdoll snapshot flow.']);
}

function auditGathering() {
  const ok = exists('server/src/resources/GatheringService.ts') && exists('server/src/routes/resourceGatherRoute.ts') && has('server/src/routes/gameplaySnapshot.ts', 'gatheringService.listResourceSnapshots') && exists('apps/client-2d/src/ui/windows/ResourceNodePanel.tsx');
  return check('resource_gathering', 'Resource gathering', ok ? 'PASS' : 'GAP', ok ? 'Gathering service, gather route, live snapshot source, and 2D resource UI exist.' : 'Gathering loop is missing a runtime part.', [exists('server/src/resources/GatheringService.ts') && 'server/src/resources/GatheringService.ts', exists('server/src/routes/resourceGatherRoute.ts') && 'server/src/routes/resourceGatherRoute.ts', has('server/src/routes/gameplaySnapshot.ts', 'gatheringService.listResourceSnapshots') && line('server/src/routes/gameplaySnapshot.ts', 'gatheringService.listResourceSnapshots'), exists('apps/client-2d/src/ui/windows/ResourceNodePanel.tsx') && 'apps/client-2d/src/ui/windows/ResourceNodePanel.tsx'], ['Wire gathering XP, inventory reward, depletion, and live UI from server truth only.']);
}

function auditTradingRoutes() {
  const routeFiles = files('.', ['tradingroute', 'trade-route', 'caravan', 'supplyroute']);
  const support = [exists('server/src/economy/WorkOrderService.ts') && 'server/src/economy/WorkOrderService.ts', has('apps/client-2d/src/game/liveGameplaySnapshot.ts', 'VendorEconomySnapshot') && 'apps/client-2d/src/game/liveGameplaySnapshot.ts#VendorEconomySnapshot'];
  return check('trading_routes', 'Trading routes', routeFiles.length ? 'PASS' : 'GAP', routeFiles.length ? 'Trading-route/caravan runtime files found.' : 'Vendor/work-order economy exists, but no trading-route/caravan runtime was found.', [...support, ...routeFiles.slice(0, 6)], ['Create deterministic TradingRouteDirector with endpoints, stock deltas, travel ticks, risk bands, and replay hash.']);
}

function auditNpcActivity() {
  const generator = exists('server/src/gameplay/NPCActivitySnapshotGenerator.ts');
  const empty = has('server/src/routes/gameplaySnapshot.ts', 'generateNPCActivitySnapshot({ tick: serverTick, entities: [] })');
  if (!generator) return check('npc_activities_wandering', 'NPC activities/wandering', 'GAP', 'No NPC activity snapshot generator found.', [], ['Add NPC activity projection from real runtime entities.']);
  return check('npc_activities_wandering', 'NPC activities/wandering', empty ? 'BLOCKER' : 'PASS', empty ? 'NPC activity snapshot is called with an empty entity list.' : 'NPC activity snapshot does not use the known empty entity placeholder.', ['server/src/gameplay/NPCActivitySnapshotGenerator.ts', empty && line('server/src/routes/gameplaySnapshot.ts', 'entities: []'), exists('server/src/modules/ai/TaskSystem.ts') && 'server/src/modules/ai/TaskSystem.ts', exists('server/src/modules/ai/BehaviorTree.ts') && 'server/src/modules/ai/BehaviorTree.ts'], ['Feed observed NPC entities from NPCSystem/WorldTick/chunk observer into the activity snapshot.']);
}

function auditHousing() {
  const runtime = files('.', ['housing', 'buildable', 'buildingplacement', 'settlementbuilding']).filter((path) => !path.endsWith('.md'));
  return check('housing_buildables', 'Housing/buildable homes', runtime.length ? 'PASS' : 'GAP', runtime.length ? 'Housing/buildable runtime files found.' : 'No housing/buildable-home runtime module found.', runtime.slice(0, 8), ['Add deterministic BuildingPlacementService with chunk occupancy, road/wall/gate rules, ownership, material cost, and replay hash.']);
}

function auditHelp() {
  const runtime = files('.', ['help', 'tutorial', 'coach', 'onboarding']).filter((path) => !path.endsWith('.md'));
  return check('help_systems', 'Help/tutorial systems', runtime.length ? 'PARTIAL' : 'GAP', runtime.length ? 'Help/tutorial-like runtime files exist; release linkage needs verification.' : 'No runtime help/tutorial/onboarding system found.', runtime.slice(0, 8), ['Add side-channel help director that observes player state and never mutates gameplay truth.']);
}

function auditKingdom() {
  const territory = exists('server/src/governance/TerritoryModel.ts');
  const founding = files('.', ['kingdomfound', 'foundkingdom', 'settlementfound', 'villagefound', 'territoryservice']);
  return check('kingdom_founding', 'Kingdom founding/creation', territory && founding.length ? 'PARTIAL' : 'GAP', territory ? 'Territory model exists, but no complete kingdom/village founding flow was proven.' : 'No TerritoryModel found.', [territory && 'server/src/governance/TerritoryModel.ts', ...founding.slice(0, 6)], ['Implement deterministic guild→village→city→kingdom intents with member/material/territory/tick proofs.']);
}

function auditReproduction() {
  const bridge = exists('server/src/modules/npc/LineageBirthSnapshotBridge.ts');
  const provider = exists('server/src/modules/npc/LineageRuntimeStateProviderRegistry.ts');
  const route = has('server/src/routes/gameplaySnapshot.ts', 'runLineageBirthForSnapshot');
  return check('npc_reproduction', 'NPC reproduction/lineage', bridge && provider && route ? 'PARTIAL' : 'GAP', bridge && provider && route ? 'Lineage bridge is wired into snapshot route; runtime provider proof is still needed.' : 'NPC lineage/birth path is incomplete.', [bridge && 'server/src/modules/npc/LineageBirthSnapshotBridge.ts', provider && 'server/src/modules/npc/LineageRuntimeStateProviderRegistry.ts', route && line('server/src/routes/gameplaySnapshot.ts', 'runLineageBirthForSnapshot')], ['Move lineage birth from snapshot-triggered side effects into an ARE TickSystem phase fed by real NPC/world/home/resource state.']);
}

function auditSnapshotTruth() {
  const offenders = [];
  if (has('server/src/routes/gameplaySnapshot.ts', 'guild: null')) offenders.push(line('server/src/routes/gameplaySnapshot.ts', 'guild: null'));
  if (has('server/src/routes/gameplaySnapshot.ts', 'factions: []')) offenders.push(line('server/src/routes/gameplaySnapshot.ts', 'factions: []'));
  if (has('server/src/routes/gameplaySnapshot.ts', 'entities: []')) offenders.push(line('server/src/routes/gameplaySnapshot.ts', 'entities: []'));
  return check('snapshot_truth', 'Live gameplay snapshot truth path', offenders.length ? 'BLOCKER' : 'PASS', offenders.length ? 'Live gameplay snapshot still contains empty/null placeholders for release-critical domains.' : 'No known placeholder truth-path markers detected.', offenders, ['Replace placeholders with real runtime providers or explicit unavailable status plus release gate failure.']);
}

const checks = [auditClient2d(), auditRender(), auditCombat(), auditSkills(), auditLoot(), auditMonsters(), auditEquipment(), auditGathering(), auditTradingRoutes(), auditNpcActivity(), auditHousing(), auditHelp(), auditKingdom(), auditReproduction(), auditSnapshotTruth()]
  .sort((a, b) => ({ BLOCKER: 4, GAP: 3, PARTIAL: 2, PASS: 1 }[b.status] - { BLOCKER: 4, GAP: 3, PARTIAL: 2, PASS: 1 }[a.status]) || a.id.localeCompare(b.id));
const summary = checks.reduce((acc, item) => ({ ...acc, [item.status]: (acc[item.status] ?? 0) + 1 }), {});
const releaseBlockingCount = checks.filter((item) => item.releaseBlocking).length;
const report = { schemaVersion: 1, audit: 'arelorian-release-state', generatedAt: new Date().toISOString(), mode: 'source-scan-no-runtime-simulation', overall: releaseBlockingCount ? 'RELEASE_BLOCKED' : 'RELEASE_CANDIDATE', releaseBlockingCount, summary, checks };

if (JSON_OUT) console.log(JSON.stringify(report, null, 2));
else {
  console.log('\nARELORIA RELEASE STATE AUDIT');
  console.log(`Overall: ${report.overall}`);
  console.log(`Release blocking checks: ${releaseBlockingCount}`);
  console.log(`Summary: ${Object.entries(summary).map(([k, v]) => `${k}=${v}`).join(', ')}`);
  for (const item of checks) {
    console.log(`\n[${item.status}] ${item.id} - ${item.title}`);
    console.log(item.summary);
    if (item.evidence.length) console.log(`Evidence: ${item.evidence.join(', ')}`);
    if (item.nextFixes.length) console.log(`Next: ${item.nextFixes.join(' | ')}`);
  }
  console.log('\nUse --json for machine output and --fail for release CI gating.\n');
}

if (FAIL && releaseBlockingCount) exit(1);
exit(0);
