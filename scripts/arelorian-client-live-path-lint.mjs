#!/usr/bin/env node
/**
 * Client-2D Live Path Lint
 * 
 * Verifies that the client-2d module structure matches the documented live render path.
 * Ensures legacy components are marked and not imported in production.
 * 
 * Checks:
 * 1. main.tsx imports DeterministicWorldIsoApp (not GameBoot)
 * 2. GameBoot.tsx has LEGACY comment (not imported)
 * 3. DebugHud.tsx has LEGACY comment (not imported)
 * 4. MobileHud.tsx has LEGACY comment (not imported)
 * 5. ChatMiniPanel.tsx has LEGACY comment (not imported)
 * 6. No duplicate component files exist
 * 7. ArelorianStitchHud.tsx has debug panel
 * 
 * Run: node scripts/arelorian-client-live-path-lint.mjs
 */

import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const errors = [];
const warnings = [];

function rel(file) {
  return path.relative(root, file).split(path.sep).join('/');
}

function read(file) {
  return readFileSync(path.join(root, file), 'utf8');
}

function fail(rule, message, hint) {
  errors.push({ rule, message, hint });
}

function warn(rule, message, hint) {
  warnings.push({ rule, message, hint });
}

// ─────────────────────────────────────────────────────────────────
// CHECK 1: main.tsx imports DeterministicWorldIsoApp, NOT GameBoot
// ─────────────────────────────────────────────────────────────────
function checkMainImports() {
  const mainPath = 'apps/client-2d/src/main.tsx';
  if (!existsSync(path.join(root, mainPath))) {
    fail('main-exists', 'main.tsx not found', 'Ensure the entry point exists');
    return;
  }

  const mainContent = read(mainPath);

  if (!mainContent.includes('DeterministicWorldIsoApp')) {
    fail('main-imports', 'main.tsx does not import DeterministicWorldIsoApp', 'Import DeterministicWorldIsoApp as the live root component');
  }

  if (mainContent.includes('GameBoot')) {
    fail('main-imports', 'main.tsx imports GameBoot - this should not be in live path', 'Remove GameBoot import from main.tsx');
  }
}

// ─────────────────────────────────────────────────────────────────
// CHECK 2: GameBoot.tsx has LEGACY comment
// ─────────────────────────────────────────────────────────────────
function checkGameBootLegacy() {
  const gameBootPath = 'apps/client-2d/src/ui/GameBoot.tsx';
  if (!existsSync(path.join(root, gameBootPath))) {
    warn('gameboot-exists', 'GameBoot.tsx not found (may have been removed)', 'No action needed');
    return;
  }

  const content = read(gameBootPath);
  
  if (!content.includes('LEGACY') && !content.includes('NOT used') && !content.includes('NOT IMPORTED')) {
    fail('gameboot-legacy', 'GameBoot.tsx exists but lacks LEGACY documentation comment', 'Add a LEGACY header comment explaining this is not used in production');
  }

  // GameBoot.tsx is legacy - skip import check since it imports unused legacy files intentionally
}

// ─────────────────────────────────────────────────────────────────
// CHECK 3: DebugHud.tsx has LEGACY comment
// ─────────────────────────────────────────────────────────────────
function checkDebugHudLegacy() {
  const debugHudPath = 'apps/client-2d/src/ui/DebugHud.tsx';
  if (!existsSync(path.join(root, debugHudPath))) {
    warn('debughud-exists', 'DebugHud.tsx not found (may have been removed)', 'No action needed');
    return;
  }

  const content = read(debugHudPath);
  
  if (!content.includes('LEGACY') && !content.includes('NOT used') && !content.includes('NOT IMPORTED')) {
    fail('debughud-legacy', 'DebugHud.tsx exists but lacks LEGACY documentation comment', 'Add a LEGACY header comment explaining this is not used in production');
  }

  // DebugHud is legacy - only check if imported in LIVE path files (not GameBoot)
  const mainContent = read('apps/client-2d/src/main.tsx');
  if (mainContent.includes("DebugHud")) {
    fail("debughud-imported", "main.tsx imports DebugHud", "Remove DebugHud import - StitchHud has its own debug panel");
  }
}

// ─────────────────────────────────────────────────────────────────
// CHECK 4: MobileHud.tsx has LEGACY comment
// ─────────────────────────────────────────────────────────────────
function checkMobileHudLegacy() {
  const mobileHudPath = 'apps/client-2d/src/ui/MobileHud.tsx';
  if (!existsSync(path.join(root, mobileHudPath))) {
    warn('mobilehud-exists', 'MobileHud.tsx not found (may have been removed)', 'No action needed');
    return;
  }

  const content = read(mobileHudPath);
  
  if (!content.includes('LEGACY') && !content.includes('NOT used') && !content.includes('NOT IMPORTED')) {
    fail('mobilehud-legacy', 'MobileHud.tsx exists but lacks LEGACY documentation comment', 'Add a LEGACY header comment explaining this is not used in production');
  }

  // MobileHud is legacy - only check if imported in LIVE path files (not GameBoot)
  const mainContent = read('apps/client-2d/src/main.tsx');
  if (mainContent.includes("MobileHud")) {
    fail("mobilehud-imported", "main.tsx imports MobileHud", "Remove MobileHud import - MobileMovePad is the live mobile control");
  }
}

// ─────────────────────────────────────────────────────────────────
// CHECK 5: ChatMiniPanel.tsx has LEGACY comment
// ─────────────────────────────────────────────────────────────────
function checkChatMiniPanelLegacy() {
  const chatPanelPath = 'apps/client-2d/src/ui/ChatMiniPanel.tsx';
  if (!existsSync(path.join(root, chatPanelPath))) {
    warn('chatpanel-exists', 'ChatMiniPanel.tsx not found (may have been removed)', 'No action needed');
    return;
  }

  const content = read(chatPanelPath);
  
  if (!content.includes('LEGACY') && !content.includes('NOT used') && !content.includes('NOT IMPORTED')) {
    fail('chatpanel-legacy', 'ChatMiniPanel.tsx exists but lacks LEGACY documentation comment', 'Add a LEGACY header comment explaining this is not used in production');
  }

  // Check if it's imported anywhere
  const allFiles = getAllTsxFiles();
  for (const file of allFiles) {
    if (file === chatPanelPath) continue;
    const content = read(file);
    if (content.includes("from './ChatMiniPanel'") || content.includes('from "./ChatMiniPanel"') || content.includes('from "../ui/ChatMiniPanel"') || content.includes('from "../ChatMiniPanel"')) {
      fail("chatpanel-imported", file + " imports ChatMiniPanel", "Remove ChatMiniPanel import - StitchHud has inline chat");
    }
  }
}

// ─────────────────────────────────────────────────────────────────
// CHECK 6: No duplicate component files exist
// ─────────────────────────────────────────────────────────────────
function checkNoDuplicates() {
  const duplicates = [
    {
      keep: 'apps/client-2d/src/ui/windows/EquipmentPanel.tsx',
      remove: 'apps/client-2d/src/ui/EquipmentPanel.tsx',
      reason: 'EquipmentPanel exists in both ui/ and ui/windows/'
    },
    {
      keep: 'apps/client-2d/src/ui/InventoryGrid.tsx',
      remove: 'apps/client-2d/src/ui/InventoryOverlay.tsx',
      reason: 'InventoryOverlay is a duplicate of InventoryGrid'
    },
    {
      keep: 'apps/client-2d/src/ui/windows/CharacterWindow.tsx',
      remove: 'apps/client-2d/src/ui/CharacterOverlay.tsx',
      reason: 'CharacterOverlay is a duplicate of CharacterWindow'
    },
  ];

  for (const dup of duplicates) {
    const removePath = path.join(root, dup.remove);
    if (existsSync(removePath)) {
      fail("duplicate-files", dup.remove + " still exists - duplicate of " + dup.keep, "Delete " + dup.remove + ": " + dup.reason);
    }
  }
}

// ─────────────────────────────────────────────────────────────────
// CHECK 7: ArelorianStitchHud.tsx has debug panel
// ─────────────────────────────────────────────────────────────────
function checkStitchHudDebug() {
  const stitchHudPath = 'apps/client-2d/src/ArelorianStitchHud.tsx';
  if (!existsSync(path.join(root, stitchHudPath))) {
    fail('stitchhud-exists', 'ArelorianStitchHud.tsx not found', 'Ensure the HUD exists');
    return;
  }

  const content = read(stitchHudPath);

  if (!content.includes('stitch-debug') && !content.includes('debug-panel')) {
    fail('stitchhud-debug', 'ArelorianStitchHud.tsx does not have a debug panel section', 'Add a debug panel showing real network/game state values');
  }

  // Check that debug props exist
  if (!content.includes('debugNetworkStatus') && !content.includes('debugPlayerPos')) {
    warn('stitchhud-props', 'ArelorianStitchHud.tsx may be missing debug props', 'Ensure debug props are passed from DeterministicWorldIsoApp');
  }
}

// ─────────────────────────────────────────────────────────────────
// CHECK 8: Live components are actually imported in main.tsx
// ─────────────────────────────────────────────────────────────────
function checkLiveComponentsImported() {
  const mainPath = 'apps/client-2d/src/main.tsx';
  if (!existsSync(path.join(root, mainPath))) return;

  const mainContent = read(mainPath);
  const deterministicContent = existsSync(path.join(root, 'apps/client-2d/src/DeterministicWorldIsoApp.tsx'))
    ? read('apps/client-2d/src/DeterministicWorldIsoApp.tsx')
    : '';

  const liveComponents = [
    { name: 'ArelorianStitchHud', path: 'ArelorianStitchHud', viaMain: false },
    { name: 'MobileMovePad', path: 'MobileMovePad', viaMain: true },
    { name: 'InteractionOverlayRoot', path: 'InteractionOverlayRoot', viaMain: true },
    { name: 'LiveRealityBridge', path: 'LiveRealityBridge', viaMain: true },
    { name: 'WorldHeartMonitor', path: 'WorldHeartMonitor', viaMain: true },
  ];

  for (const comp of liveComponents) {
    const isImported = comp.viaMain
      ? mainContent.includes(comp.path)
      : mainContent.includes(comp.path) || deterministicContent.includes(comp.path);
    
    if (!isImported) {
      warn('live-component', comp.name + ' not imported', 'Ensure ' + comp.name + ' is in the live render path');
    }
  }
}

// ─────────────────────────────────────────────────────────────────
// Helper: Get all tsx files in client-2d
// ─────────────────────────────────────────────────────────────────
function getAllTsxFiles() {
  const files = [];
  const clientSrcDir = path.join(root, 'apps/client-2d/src');
  
  function walk(dir) {
    if (!existsSync(dir)) return;
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (entry.name === 'node_modules' || entry.name === '.git') continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
      } else if (entry.isFile() && (entry.name.endsWith('.tsx') || entry.name.endsWith('.ts'))) {
        files.push(rel(full));
      }
    }
  }
  
  walk(clientSrcDir);
  return files;
}

// ─────────────────────────────────────────────────────────────────
// Run all checks
// ─────────────────────────────────────────────────────────────────
console.log('Running Client-2D Live Path Lint...\n');

checkMainImports();
checkGameBootLegacy();
checkDebugHudLegacy();
checkMobileHudLegacy();
checkChatMiniPanelLegacy();
checkNoDuplicates();
checkStitchHudDebug();
checkLiveComponentsImported();

// Report
for (const finding of warnings) {
  console.warn(`WARNING [${finding.rule}] ${finding.message}`);
  console.warn(`  Hint: ${finding.hint}\n`);
}

if (errors.length > 0) {
  console.error('\n❌ CLIENT-2D LIVE PATH LINT FAILED');
  for (const finding of errors) {
    console.error(`\n[${finding.rule}] ${finding.message}`);
    console.error(`  Fix: ${finding.hint}`);
  }
  process.exit(1);
}

console.log('✅ CLIENT-2D LIVE PATH LINT OK: All checks passed.');
console.log('  - main.tsx imports DeterministicWorldIsoApp (not GameBoot)');
console.log('  - Legacy files have LEGACY comments');
console.log('  - No duplicate component files');
console.log('  - StitchHud has debug panel');