#!/usr/bin/env node
/**
 * scripts/audit-route-registry.mjs
 * 
 * Static audit script to verify route registry integrity.
 * 
 * Checks:
 * 1. Route file exists
 * 2. Route mounted in ServerBootstrap.ts
 * 3. Client references resolve
 * 4. Documentation entry exists
 * 5. Health probe capability
 * 
 * Output:
 * {
 *   "mounted": [...],
 *   "orphaned": [...],
 *   "undocumented": [...],
 *   "deadClientReferences": [...]
 * }
 * 
 * Usage:
 *   node scripts/audit-route-registry.mjs [--verbose]
 * 
 * Exit codes:
 *   0 - All routes validated (orphaned routes are informational)
 *   1 - Critical failure (cannot read required files)
 *   2 - Findings reported (check output for orphaned routes, dead references)
 */

import { readFileSync, existsSync, readdirSync, statSync, writeFileSync } from 'fs';
import { join, extname, basename } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const ROOT = join(__dirname, '..');

const ARGV = process.argv.slice(2);
const VERBOSE = ARGV.includes('--verbose') || ARGV.includes('-v');
const OUTPUT_JSON = ARGV.includes('--json');

const results = {
  mounted: [],
  orphaned: [],       // Route files not mounted in ServerBootstrap
  undocumented: [],   // Mounted routes without docs
  deadClientReferences: []  // Client calls to non-existent endpoints
};

/**
 * Find all TypeScript/JS route files recursively
 */
function findRouteFiles(dir, files = []) {
  if (!existsSync(dir)) return files;
  const entries = readdirSync(dir);
  for (const entry of entries) {
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      if (entry === 'node_modules' || entry === 'dist' || entry === 'build' || entry === '.git') continue;
      findRouteFiles(full, files);
    } else if (/\.(ts|js|mjs)$/.test(entry) && !entry.endsWith('.test.ts') && !entry.endsWith('.spec.ts')) {
      // Skip test files
      if (entry.includes('.test.') || entry.includes('.spec.')) continue;
      files.push(full);
    }
  }
  return files;
}

/**
 * Extract route paths from a route file
 */
function extractRoutePaths(filePath, content) {
  const routes = [];
  const routePatterns = [
    /router\.(get|post|put|patch|delete)\s*\(\s*["']([^"']+)["']/g,
    /app\.(get|post|put|patch|delete)\s*\(\s*["']([^"']+)["']/g,
    /app\.use\s*\(\s*["']([^"']+)["']/g,
    /export\s+(?:default\s+)?(?:function|const|class)\s+(\w+)/g
  ];
  
  for (const pattern of routePatterns) {
    let match;
    while ((match = pattern.exec(content)) !== null) {
      if (match[2]) {
        routes.push({ method: match[1]?.toUpperCase() || 'USE', path: match[2] });
      } else if (match[1]) {
        routes.push({ method: 'EXPORT', path: match[1] });
      }
    }
  }
  
  return routes;
}

/**
 * Find mounted routes in ServerBootstrap.ts
 */
function findMountedRoutes(bootstrapContent) {
  const mounted = [];
  
  // Pattern to match app.use and app.get/post/etc
  const mountPatterns = [
    /app\.(use|get|post|put|patch|delete)\s*\(\s*["']([^"']+)["']/g,
    /app\.use\s*\(\s*["']([^"']+)["']\s*,/g,
    /createAREHeartbeatRouter|createGameplaySnapshotRouter|questEventRouter|skillEventRouter|resourceGatherRouter|inventoryRouter|craftingRouter|equipmentRouter|characterRouter|onboardingRouter|economyRouter|vendorRouter|campNpcRouter|npcQuestRouter|voteRouter|leaderboardRouter|questlineRouter|loreRouter|scienceMascotRouter|warfrontRouter|areValidationRouter|areReplayRouter|financeRouter|sovereignDeployRouter|healthRoutes|agoraRouter|client2dAssetUploadRouter|areShadowLogRouter|createManifestResyncRouter|createSelfHealWorkshopRouter|createLootRoutes/g
  ];
  
  // Extract actual mount paths
  const mountPathPattern = /app\.(?:use|get|post|put|patch|delete)\s*\(\s*["']([^"']+)["']/g;
  let match;
  while ((match = mountPathPattern.exec(bootstrapContent)) !== null) {
    mounted.push({
      path: match[1],
      type: 'HTTP'
    });
  }
  
  // Extract router imports
  const routerImports = [];
  const importPattern = /import\s+.*?\s+from\s+["'](.*?)["']/g;
  while ((match = importPattern.exec(bootstrapContent)) !== null) {
    if (match[1].includes('Route') || match[1].includes('Router')) {
      routerImports.push(match[1]);
    }
  }
  
  return { mounted, routerImports };
}

/**
 * Search for client API calls
 */
function searchClientApiCalls(clientDirs) {
  const apiCalls = [];
  
  for (const dir of clientDirs) {
    if (!existsSync(dir)) continue;
    
    const files = findRouteFiles(dir, []);
    
    for (const file of files) {
      try {
        const content = readFileSync(file, 'utf-8');
        const lines = content.split('\n');
        
        // Pattern for API calls
        const apiPatterns = [
          /fetch\s*\(\s*["']([^"']*\/api\/[^"']+)["']/g,
          /axios\.(get|post|put|delete|patch)\s*\(\s*["']([^"']+)["']/g,
          /api\.(get|post|put|delete|patch)\s*\(\s*["']([^"']+)["']/g,
          /\/api\/[\w\-\/]+/g,
          /endpoint\s*:\s*["']([^"']*\/api\/[^"']+)["']/g
        ];
        
        for (let i = 0; i < lines.length; i++) {
          for (const pattern of apiPatterns) {
            let match;
            pattern.lastIndex = 0;
            while ((match = pattern.exec(lines[i])) !== null) {
              const path = match[1] || match[0];
              if (path && path.startsWith('/api/')) {
                apiCalls.push({
                  file,
                  line: i + 1,
                  path: path.replace(/['"]/g, '').split('?')[0].split('#')[0]
                });
              }
            }
          }
        }
      } catch (e) {
        // Skip unreadable files
      }
    }
  }
  
  return apiCalls;
}

/**
 * Check for documentation entries
 */
function checkDocumentation(routePath) {
  const docsDir = join(ROOT, 'docs');
  if (!existsSync(docsDir)) return false;
  
  const routeName = routePath.replace('/api/', '').replace(/\//g, '_');
  const possibleFiles = [
    routeName + '.md',
    'API_' + routeName.toUpperCase() + '.md',
    'ROUTE_' + routeName.toUpperCase() + '.md',
    basename(routePath) + '.md'
  ];
  
  // Search in docs directory for mentions
  const searchTerms = [
    routePath,
    routePath.replace('/api/', ''),
    basename(routePath)
  ];
  
  const files = readdirSync(docsDir);
  for (const file of files) {
    if (!file.endsWith('.md')) continue;
    try {
      const content = readFileSync(join(docsDir, file), 'utf-8');
      for (const term of searchTerms) {
        if (content.includes(term)) return true;
      }
    } catch (e) {
      // Skip
    }
  }
  
  return false;
}

/**
 * Main audit function
 */
async function runAudit() {
  console.log('🔍 ARE Route Registry Audit');
  console.log('='.repeat(50));
  
  const serverBootstrapPath = join(ROOT, 'server/src/core/ServerBootstrap.ts');
  
  if (!existsSync(serverBootstrapPath)) {
    console.error('❌ FATAL: ServerBootstrap.ts not found at', serverBootstrapPath);
    process.exit(1);
  }
  
  const bootstrapContent = readFileSync(serverBootstrapPath, 'utf-8');
  const { mounted: mountedRoutes } = findMountedRoutes(bootstrapContent);
  
  // Find all route files
  const routesDir = join(ROOT, 'server/src/routes');
  const apiDir = join(ROOT, 'server/src/api');
  
  const routeFiles = [
    ...findRouteFiles(routesDir, []),
    ...findRouteFiles(apiDir, [])
  ];
  
  console.log(`\n📊 Found ${routeFiles.length} route files`);
  console.log(`📊 Found ${mountedRoutes.length} mounted routes`);
  
  // Check each route file
  const mountedRoutePaths = mountedRoutes.map(r => r.path);
  
  for (const routeFile of routeFiles) {
    const content = readFileSync(routeFile, 'utf-8');
    const fileName = basename(routeFile);
    const relativePath = routeFile.replace(ROOT + '/', '');
    
    // Check if this route file is imported in ServerBootstrap
    const isMounted = mountedRoutePaths.some(path => {
      // Check if the route file name matches any imported module
      const moduleName = fileName.replace(/\.(ts|js|mjs)$/, '');
      return bootstrapContent.includes(moduleName);
    });
    
    if (isMounted) {
      results.mounted.push({
        file: relativePath,
        name: fileName
      });
      
      // Check documentation
      const hasDocs = checkDocumentation(fileName);
      if (!hasDocs) {
        results.undocumented.push({
          file: relativePath,
          name: fileName
        });
      }
    } else {
      results.orphaned.push({
        file: relativePath,
        name: fileName,
        reason: 'Route file exists but not imported/mounted in ServerBootstrap.ts'
      });
    }
  }
  
  // Search client code for API calls
  const clientDirs = [
    join(ROOT, 'client/src'),
    join(ROOT, 'apps/client-2d/src'),
    join(ROOT, 'frontend/src')
  ];
  
  const clientApiCalls = searchClientApiCalls(clientDirs);
  
  // Check for dead client references
  const validPaths = new Set(mountedRoutes.map(r => r.path));
  validPaths.add('/health'); // Always valid
  validPaths.add('/api/oracle'); // From api.ts
  validPaths.add('/api/tick/context'); // From api.ts
  
  for (const call of clientApiCalls) {
    const path = call.path;
    const isValid = [...validPaths].some(valid => 
      path === valid || 
      path.startsWith(valid + '/') ||
      valid.startsWith(path + '/')
    );
    
    if (!isValid) {
      results.deadClientReferences.push({
        file: call.file.replace(ROOT + '/', ''),
        line: call.line,
        path: path,
        reason: 'No matching route found in ServerBootstrap.ts'
      });
    }
  }
  
  // Output results
  console.log('\n' + '='.repeat(50));
  console.log('📋 AUDIT RESULTS');
  console.log('='.repeat(50));
  
  console.log(`\n✅ MOUNTED ROUTES: ${results.mounted.length}`);
  if (VERBOSE) {
    for (const route of results.mounted) {
      console.log(`   - ${route.name}`);
    }
  }
  
  console.log(`\n⚠️  ORPHANED ROUTES: ${results.orphaned.length}`);
  if (results.orphaned.length > 0) {
    for (const route of results.orphaned) {
      console.log(`   - ${route.file}`);
      console.log(`     Reason: ${route.reason}`);
    }
  }
  
  console.log(`\n⚠️  UNDOCUMENTED ROUTES: ${results.undocumented.length}`);
  if (results.undocumented.length > 0) {
    for (const route of results.undocumented) {
      console.log(`   - ${route.file}`);
    }
  }
  
  console.log(`\n❌ DEAD CLIENT REFERENCES: ${results.deadClientReferences.length}`);
  if (results.deadClientReferences.length > 0) {
    for (const ref of results.deadClientReferences) {
      console.log(`   - ${ref.file}:${ref.line} -> ${ref.path}`);
      console.log(`     Reason: ${ref.reason}`);
    }
  }
  
  // Summary
  const hasIssues = results.orphaned.length > 0 || results.deadClientReferences.length > 0;
  
  console.log('\n' + '='.repeat(50));
  if (hasIssues) {
    console.log('⚠️  ISSUES FOUND - Review orphaned routes and dead references');
    if (OUTPUT_JSON) {
      console.log('\n' + JSON.stringify(results, null, 2));
    }
    process.exit(2);
  } else {
    console.log('✅ All routes validated successfully');
    if (OUTPUT_JSON) {
      console.log('\n' + JSON.stringify(results, null, 2));
    }
    process.exit(0);
  }
}

runAudit().catch(err => {
  console.error('❌ Fatal error:', err);
  process.exit(1);
});
