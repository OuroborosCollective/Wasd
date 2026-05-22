#!/usr/bin/env node
import { readdir, readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const scanRoots = ['server/src/core', 'server/src/modules', 'server/src/services', 'packages/shared/src'];

// Paths that MUST be deterministic (Level-A Simulation)
const strictRoots = [
  'server/src/core/systems',
  'server/src/core/state',
  'server/src/core/determinism',
  'server/src/modules/combat',
  'server/src/modules/npc',
  'server/src/modules/world',
  'server/src/modules/dungeon',
  'server/src/modules/economy',
  'server/src/modules/loot',
  'server/src/modules/oracle',
  'server/src/modules/warfront',
  'server/src/modules/ouroboros/OuroborosLoop.ts',
  'server/src/modules/ouroboros/OuroborosEngine.ts',
  'server/src/modules/brain',
];

// Explicitly allowed filenames in strict paths (infrastructure/telemetry/non-simulation)
const strictExemptions = [
  'NPCChatBridge.ts',
  'NPCMemoryBridge.ts',
  'NPCMemoryPersistence.ts',
  'NPCThinkingLogService.ts',
  'WarfrontCombatTelemetry.ts',
  'AREModeAuditTrail.ts',
  'AssetPoolResolver.ts',
  'ShadowRegisterPortal.ts',
  'WorldState.ts',
  'AREDeterminism.ts',
  'NPCChatAgent.ts',
  'NPCDialogueSystem.ts',
  'NPCGenealogyEngine.ts',
  'NPCHeuristics.ts',
  'NPCMemoryCache.ts',
  'NPCMemoryEngine.ts',
  'NPCPersonalityEngine.ts',
  'SharedMemoryNetwork.ts',
  'DynamicFactions.ts',
  'EmergentMarket.ts',
  'LegendDistiller.ts',
  'NPCRelationshipSystem.ts',
  'WorldEventBus.ts',
  'WorldHistory.ts',
  'WorldHistoryProcessor.ts',
  'HazardResonance.ts',
  'RegionState.ts',
  'WorldStateRegistry.ts',
  'CombatService.ts',
  'ComboValidator.ts',
  'deathRespawnSystem.ts',
  'BuyOrders.ts',
  'CaravanLogic.ts',
  'MarketLedger.ts',
  'MarketMonitor.ts',
  'MarketOrders.ts',
  'PlayerMarket.ts',
  'ScarcityPredictor.ts',
  'SellOrders.ts',
  'TaxLedger.ts',
  'OuroborosLoop.ts',
  'OuroborosEngine.ts',
];

// Paths that are primarily metadata, observability, or infrastructure
const advisoryHints = [
  '/admin/', '/api/', '/analytics/', '/asset', '/audit', '/chat', '/dashboard', '/debug',
  '/health', '/integrity/', '/liveheal/', '/logger/', '/mail', '/metrics', '/monitor',
  '/notification', '/observability', '/playtester', '/posthog', '/selfhealing/', '/telemetry/',
  '/auth/', '/payment/', '/social/', '/gm/', '/release/', '/persistence/', '/infrastructure/',
  '/benchmark/', '/scripts/', '/tools/', '/marketing/', '/trading/', '/genealogy/',
  '/history/', '/housing/', '/inventory/', '/items/', '/legend/', '/migration/',
  '/party/', '/politics/', '/quest/', '/relationships/', '/siege/', '/structure/',
  '/swarm/', '/vote/', '/world-editor/', '/AIOrchestrator.ts', '/GameStateManager.ts',
  '/growth/', '/land/', '/monster/', '/questline/', '/farming/', '/faction/', '/events/',
  '/diplomacy/', '/civilization/', '/bootstrap/', '/aging/', '/achievements/',
  '/resolvers/', '/resonance/', '/security/', '/skill/', '/weather/', '/territory/',
  '/audio/', '/asset-registry/', '/reputation/', '/religion/', '/prediction/',
  '/prophecy/', '/magic/', '/localization/', '/llm/', '/mounts/', '/network/',
  '/observer/', '/player/', '/streaming/', '/systems/', '/types/', '/crafting/',
  '/dialogue/', '/engine/', '/equipment/', '/gameplay/', '/guild/', '/lore/',
  '/utils/', '/orchestrator/', '/ouroboros/',
];

const deny = [
  { pattern: /\bMath\.random\s*\(/, label: 'Math.random()' },
  { pattern: /\bDate\.now\s*\(/, label: 'Date.now()' },
  { pattern: /\bnew\s+Date\s*\(/, label: 'new Date()' },
  { pattern: /\bcrypto\.randomUUID\s*\(/, label: 'crypto.randomUUID()' },
  { pattern: /\brandomUUID\s*\(/, label: 'randomUUID()' },
];

const ignoredDirs = new Set(['node_modules', 'dist', 'build', '.turbo', '.cache', 'coverage', 'tests', '__tests__']);
const extensions = new Set(['.ts', '.tsx', '.js', '.mjs', '.cjs', '.mts', '.cts']);
const lineAllow = /ARE-DETERMINISM-ALLOW/i;
const fileExempt = /@ARE-GUARD-EXEMPT:\s*(.{8,})/i;

const hard = [];
const advisory = [];
let scanned = 0;

function norm(p) { return p.split('\\').join('/'); }
function rel(file) { return norm(path.relative(root, file)); }
function under(relFile, roots) { return roots.some((r) => relFile === r || relFile.startsWith(`${r}/`)); }

function advisoryPath(relFile) {
  const wrapped = `/${relFile.toLowerCase()}`;
  if (strictExemptions.some(e => relFile.endsWith(e))) return true;
  return advisoryHints.some((hint) => wrapped.includes(hint.toLowerCase()));
}

function exemptionReason(content) {
  const head = content.split(/\r?\n/).slice(0, 30).join('\n');
  const match = head.match(fileExempt);
  return match ? match[1].trim() : null;
}

function lineAllowed(lines, index) {
  const current = lines[index] || '';
  const previous = lines[index - 1] || '';
  return lineAllow.test(current) || lineAllow.test(previous);
}

async function walk(dir) {
  if (!existsSync(dir)) return;
  const entries = await readdir(dir, { withFileTypes: true });
  entries.sort((a, b) => a.name.localeCompare(b.name));
  for (const entry of entries) {
    if (ignoredDirs.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      await walk(full);
      continue;
    }
    if (entry.isFile() && extensions.has(path.extname(entry.name))) {
      await scanFile(full);
    }
  }
}

async function scanFile(file) {
  scanned += 1;
  const fileRel = rel(file);
  const content = await readFile(file, 'utf8');
  const lines = content.split(/\r?\n/);
  const reason = exemptionReason(content);
  const strict = under(fileRel, strictRoots);
  const meta = advisoryPath(fileRel) || Boolean(reason);

  lines.forEach((line, index) => {
    if (lineAllowed(lines, index)) return;
    for (const rule of deny) {
      if (!rule.pattern.test(line)) continue;
      const finding = {
        file: fileRel,
        line: index + 1,
        label: rule.label,
        text: line.trim().slice(0, 180),
        reason
      };

      if (strict && !meta && !reason) {
        hard.push(finding);
      } else {
        advisory.push(finding);
      }
    }
  });
}

for (const scanRoot of scanRoots) {
  await walk(path.join(root, scanRoot));
}

if (advisory.length) {
  console.log(`ARE Guard advisory findings in observer/meta paths (${advisory.length}):`);
  const grouped = {};
  for (const f of advisory) {
    if (!grouped[f.file]) grouped[f.file] = [];
    grouped[f.file].push(f);
  }
  const sortedFiles = Object.keys(grouped).sort();
  for (const file of sortedFiles) {
    console.log(`- ${file}: ${grouped[file].length} finding(s)`);
  }
  console.log('Meta files should declare: // @ARE-GUARD-EXEMPT: reason not world-state input.');
}

if (hard.length) {
  console.error(`ARE Determinism Gate failed. Strict world-state paths contain nondeterministic calls (${hard.length}):`);
  for (const f of hard) {
    console.error(`- ${f.file}:${f.line} ${f.label} :: ${f.text}`);
  }
  console.error('\nUse SeededARERng/AREClock. Use ARE-DETERMINISM-ALLOW only for one audited non-world-hash line.');
  process.exit(1);
}

console.log(`ARE Determinism Gate passed. Scanned ${scanned} file(s); ${advisory.length} advisory finding(s).`);
