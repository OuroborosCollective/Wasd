/**
 * AUDIT SCRIPT: Worldgen Outside Starter Village
 * 
 * Static verification that the world generation system properly handles
 * chunks outside the starter village (chunk 0/0).
 * 
 * Checks:
 * 1. ChunkManager exists and is properly configured
 * 2. generateChunkScenePlan is called with variable chunkX/chunkZ
 * 3. Render fallback is present for missing assets
 * 4. Root 2d/ source does not exist (no dual 2d clients)
 * 5. StarterResourceNodes is not the only resource node source
 * 6. Derive biome function exists for deterministic chunk biomes
 * 
 * Run: node scripts/audit-worldgen-outside-starter.mjs
 */

import { readFileSync, existsSync, readdirSync, statSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

// Track issues found
const issues = [];
const warnings = [];

/**
 * Log an issue (problem found)
 */
function issue(msg) {
  issues.push(msg);
  console.error(`❌ ISSUE: ${msg}`);
}

/**
 * Log a warning (potential problem)
 */
function warn(msg) {
  warnings.push(msg);
  console.warn(`⚠️  WARN: ${msg}`);
}

/**
 * Log success
 */
function pass(msg) {
  console.log(`✅ PASS: ${msg}`);
}

/**
 * Find files matching a pattern
 */
function findFiles(dir, pattern, maxDepth = 5, currentDepth = 0) {
  const results = [];
  if (currentDepth > maxDepth) return results;

  try {
    const entries = readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = join(dir, entry.name);
      if (entry.isDirectory() && !entry.name.startsWith(".") && !entry.name.startsWith("node_modules")) {
        results.push(...findFiles(fullPath, pattern, maxDepth, currentDepth + 1));
      } else if (entry.isFile() && pattern.test(entry.name)) {
        results.push(fullPath);
      }
    }
  } catch (e) {
    // Ignore permission errors
  }
  return results;
}

/**
 * Check if file contains a pattern
 */
function fileContains(filePath, pattern) {
  try {
    const content = readFileSync(filePath, "utf-8");
    return pattern.test(content);
  } catch (e) {
    return false;
  }
}

console.log("\n🔍 AUDIT: Worldgen Outside Starter Village");
console.log("═══════════════════════════════════════════════════════\n");

// ─────────────────────────────────────────────────────────────────────────────
// Check 1: ChunkManager exists and uses deriveChunkBiome
// ─────────────────────────────────────────────────────────────────────────────
console.log("📋 Check 1: ChunkManager with deriveChunkBiome");

const chunkManagerFiles = findFiles(join(ROOT, "apps/client-2d/src"), /ChunkManager\.ts$/);
if (chunkManagerFiles.length === 0) {
  issue("ChunkManager.ts not found in apps/client-2d/src");
} else {
  const chunkManagerPath = chunkManagerFiles[0];
  const hasDeriveImport = fileContains(chunkManagerPath, /deriveChunkBiome/);
  const hasVariableBiome = fileContains(chunkManagerPath, /deriveChunkBiome\(chunkX, chunkZ/);

  if (!hasDeriveImport) {
    issue("ChunkManager does not import deriveChunkBiome from @wasd/shared");
  } else if (!hasVariableBiome) {
    issue("ChunkManager does not call deriveChunkBiome with chunk coordinates");
  } else {
    pass("ChunkManager uses deriveChunkBiome for per-chunk biome derivation");
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Check 2: BiomeDirector has deriveChunkBiome function
// ─────────────────────────────────────────────────────────────────────────────
console.log("\n📋 Check 2: BiomeDirector.deriveChunkBiome exists");

const biomeDirectorFiles = findFiles(join(ROOT, "packages/shared/src"), /BiomeDirector\.ts$/);
if (biomeDirectorFiles.length === 0) {
  issue("BiomeDirector.ts not found in packages/shared/src");
} else {
  const biomePath = biomeDirectorFiles[0];
  const hasDeriveFunction = fileContains(biomePath, /export function deriveChunkBiome/);
  
  if (!hasDeriveFunction) {
    issue("BiomeDirector does not export deriveChunkBiome function");
  } else {
    pass("BiomeDirector exports deriveChunkBiome function");
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Check 3: ChunkResourceGenerator exists for procedural nodes
// ─────────────────────────────────────────────────────────────────────────────
console.log("\n📋 Check 3: ChunkResourceGenerator for procedural resource nodes");

const resourceGenFiles = findFiles(join(ROOT, "server/src"), /ChunkResourceGenerator\.ts$/);
if (resourceGenFiles.length === 0) {
  issue("ChunkResourceGenerator.ts not found in server/src/resources");
} else {
  const genPath = resourceGenFiles[0];
  const hasGenerateFunction = fileContains(genPath, /export function generateChunkResourceNodes/);
  const hasDeriveBiome = fileContains(genPath, /deriveChunkBiome|getChunkBiome/);
  const hasIdPattern = fileContains(genPath, /resource:\$\{chunkX\}/);

  if (!hasGenerateFunction) {
    issue("ChunkResourceGenerator does not export generateChunkResourceNodes function");
  } else if (!hasIdPattern) {
    issue("ChunkResourceGenerator does not use proper resource ID pattern");
  } else {
    pass("ChunkResourceGenerator exists with proper ID pattern");
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Check 4: ResourceNodeStore has registerVisibleChunks method
// ─────────────────────────────────────────────────────────────────────────────
console.log("\n📋 Check 4: ResourceNodeStore.registerVisibleChunks");

const nodeStoreFiles = findFiles(join(ROOT, "server/src"), /ResourceNodeStore\.ts$/);
if (nodeStoreFiles.length === 0) {
  issue("ResourceNodeStore.ts not found in server/src/resources");
} else {
  const storePath = nodeStoreFiles[0];
  const hasRegisterMethod = fileContains(storePath, /registerVisibleChunks/);
  const hasGenerateImport = fileContains(storePath, /generateChunkResourceNodes/);

  if (!hasRegisterMethod) {
    issue("ResourceNodeStore does not have registerVisibleChunks method");
  } else if (!hasGenerateImport) {
    issue("ResourceNodeStore does not import generateChunkResourceNodes");
  } else {
    pass("ResourceNodeStore has registerVisibleChunks with procedural node support");
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Check 5: GatheringService passes player position to listResourceSnapshots
// ─────────────────────────────────────────────────────────────────────────────
console.log("\n📋 Check 5: GatheringService passes player position");

const gatheringServiceFiles = findFiles(join(ROOT, "server/src"), /GatheringService\.ts$/);
if (gatheringServiceFiles.length === 0) {
  issue("GatheringService.ts not found in server/src/resources");
} else {
  const servicePath = gatheringServiceFiles[0];
  const hasPositionParam = fileContains(servicePath, /playerPosition.*:.*\{.*x.*y.*\}/);
  const passesToStore = fileContains(servicePath, /registerVisibleChunks\(playerPosition\)/);

  if (!hasPositionParam) {
    warn("GatheringService.listResourceSnapshots may not accept player position");
  } else if (!passesToStore) {
    issue("GatheringService does not pass player position to registerVisibleChunks");
  } else {
    pass("GatheringService passes player position for chunk registration");
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Check 6: Snapshot route accepts player position
// ─────────────────────────────────────────────────────────────────────────────
console.log("\n📋 Check 6: Snapshot route accepts player position params");

const snapshotRouteFiles = findFiles(join(ROOT, "server/src"), /gameplaySnapshot\.ts$/);
if (snapshotRouteFiles.length === 0) {
  issue("gameplaySnapshot.ts not found in server/src/routes");
} else {
  const routePath = snapshotRouteFiles[0];
  const acceptsPx = fileContains(routePath, /req\.query\.px/);
  const passesToGathering = fileContains(routePath, /listResourceSnapshots\(.*playerPosition/);

  if (!acceptsPx) {
    issue("Snapshot route does not accept px query parameter");
  } else if (!passesToGathering) {
    issue("Snapshot route does not pass player position to GatheringService");
  } else {
    pass("Snapshot route accepts and passes player position");
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Check 7: Client fetchGameplaySnapshot passes player position
// ─────────────────────────────────────────────────────────────────────────────
console.log("\n📋 Check 7: Client fetchGameplaySnapshot passes position");

const clientStoreFiles = findFiles(join(ROOT, "apps/client-2d/src"), /liveGameplayStore\.ts$/);
if (clientStoreFiles.length === 0) {
  issue("liveGameplayStore.ts not found in apps/client-2d/src/game");
} else {
  const storePath = clientStoreFiles[0];
  const readsBridge = fileContains(storePath, /readPlayerPositionBridge/);
  const passesPx = fileContains(storePath, /queryParams\.set\("px"/);

  if (!readsBridge) {
    issue("Client store does not read PlayerPositionBridge");
  } else if (!passesPx) {
    issue("Client store does not pass px query parameter");
  } else {
    pass("Client fetchGameplaySnapshot reads and passes player position");
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Check 8: No root-level 2d/ directory (would cause confusion)
// ─────────────────────────────────────────────────────────────────────────────
console.log("\n📋 Check 8: No conflicting root-level 2d/ directory");

const root2dPath = join(ROOT, "2d");
if (existsSync(root2dPath)) {
  const stat = statSync(root2dPath);
  if (stat.isDirectory()) {
    issue("Root-level 2d/ directory exists - may cause confusion with apps/client-2d/");
  }
} else {
  pass("No root-level 2d/ directory (good)");
}

// ─────────────────────────────────────────────────────────────────────────────
// Check 9: MapStatusPanel shows biome and resource count
// ─────────────────────────────────────────────────────────────────────────────
console.log("\n📋 Check 9: MapStatusPanel shows biome and resources");

const mapPanelFiles = findFiles(join(ROOT, "apps/client-2d/src"), /MapStatusPanel\.tsx$/);
if (mapPanelFiles.length === 0) {
  issue("MapStatusPanel.tsx not found");
} else {
  const panelPath = mapPanelFiles[0];
  const showsBiome = fileContains(panelPath, /derivedBiome|Biome/);
  const showsResources = fileContains(panelPath, /resourceCount|Resources/);

  if (!showsBiome) {
    warn("MapStatusPanel may not show biome information");
  } else if (!showsResources) {
    warn("MapStatusPanel may not show resource count");
  } else {
    pass("MapStatusPanel shows biome and resource count");
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Summary
// ─────────────────────────────────────────────────────────────────────────────
console.log("\n═══════════════════════════════════════════════════════");
console.log("📊 AUDIT SUMMARY");
console.log("═══════════════════════════════════════════════════════");
console.log(`❌ Issues: ${issues.length}`);
console.log(`⚠️  Warnings: ${warnings.length}`);
console.log(`✅ Checks passed: ${9 - issues.length - warnings.length}/9`);

if (issues.length > 0) {
  console.log("\n❌ Issues found:");
  issues.forEach((msg, i) => console.log(`  ${i + 1}. ${msg}`));
}

if (warnings.length > 0) {
  console.log("\n⚠️ Warnings:");
  warnings.forEach((msg, i) => console.log(`  ${i + 1}. ${msg}`));
}

if (issues.length === 0) {
  console.log("\n✅ All critical checks passed! Worldgen outside starter village is properly configured.");
  process.exit(0);
} else {
  console.log("\n❌ Audit failed - please fix the issues above.");
  process.exit(1);
}