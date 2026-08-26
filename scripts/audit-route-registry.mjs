#!/usr/bin/env node
/**
 * scripts/audit-route-registry.mjs
 * 
 * Static audit script to verify route registry integrity.
 * 
 * IMPORTANT: This is a STATIC HEURISTIC audit. It does not validate runtime behavior.
 * Routes are verified by analyzing source code patterns, not by executing the server.
 * 
 * Runtime route authority: ServerBootstrap.ts
 * This script validates that route files have corresponding mount points.
 * 
 * Modes:
 *   --baseline  Report findings without failing (for CI baseline)
 *   --strict    Fail on any findings (default behavior when not in baseline)
 *   --verbose   Show detailed output
 *   --json      Output machine-readable JSON
 * 
 * Checks:
 * 1. Route file exists
 * 2. Route imported in ServerBootstrap.ts
 * 3. Route actually mounted via app.use/app.get/etc
 * 4. Client references resolve
 * 5. Documentation entry exists
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
 *   node scripts/audit-route-registry.mjs --baseline
 *   node scripts/audit-route-registry.mjs --strict
 * 
 * Exit codes:
 *   0 - Success (in baseline mode: findings reported, no failure)
 *   1 - Critical failure (cannot read required files)
 *   2 - Findings reported (strict mode only)
 */

import { readFileSync, existsSync, readdirSync, statSync } from 'fs';
import { join, extname, basename, relative } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const ROOT = join(__dirname, '..');

const ARGV = process.argv.slice(2);
const VERBOSE = ARGV.includes('--verbose') || ARGV.includes('-v');
const OUTPUT_JSON = ARGV.includes('--json');
const BASELINE_MODE = ARGV.includes('--baseline');
const STRICT_MODE = ARGV.includes('--strict');

const results = {
  mode: BASELINE_MODE ? 'baseline' : (STRICT_MODE ? 'strict' : 'standard'),
  mounted: [],
  orphaned: [],       // Route files not mounted in ServerBootstrap
  undocumented: [],   // Mounted routes without docs
  deadClientReferences: [],  // Client calls to non-existent endpoints
  warnings: []        // Other potential issues
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
 * Parse ServerBootstrap.ts to extract actual route mounts
 * This is the RUNTIME AUTHORITY for routes
 */
function parseBootstrapRoutes(bootstrapContent) {
  const mounted = [];
  const importToMountMap = new Map(); // Track which imports are mounted
  
  // Track import statements to find router functions
  const importStatements = [];
  const importPattern = /import\s+(?:\{([^}]+)\}|(\w+))\s+from\s+["']([^"']+)["']/g;
  let match;
  while ((match = importPattern.exec(bootstrapContent)) !== null) {
    const namedImports = match[1] || '';
    const defaultImport = match[2] || '';
    const modulePath = match[3];
    
    if (modulePath.includes('Route') || modulePath.includes('route')) {
      const names = namedImports ? namedImports.split(',').map(n => n.trim()) : [defaultImport];
      for (const name of names) {
        if (name) {
          importStatements.push({ name, modulePath });
        }
      }
    }
  }
  
  // Now find actual app.use/app.get calls and map them to imports
  // Pattern: app.use(X(...)) or app.use(X) or app.use("/path", X(...
  const mountCallPattern = /app\.(?:use|get|post|put|patch|delete)\s*\(\s*/g;
  let mountMatch;
  
  // Extract mount paths with their associated router function
  const mountPathPattern = /app\.(use|get|post|put|patch|delete)\s*\(\s*(?:["']([^"']+)["']\s*,\s*)?([A-Za-z_$][A-Za-z0-9_$]*(?:\([^)]*\))?)/g;
  
  while ((match = mountPathPattern.exec(bootstrapContent)) !== null) {
    const method = match[1].toUpperCase();
    const path = match[2] || null;
    const routerFunc = match[3];
    
    mounted.push({
      method,
      path,
      routerFunc,
      raw: match[0]
    });
    
    // Track which import is being used
    const importInfo = importStatements.find(i => 
      routerFunc.includes(i.name) || i.name.includes(routerFunc.split('(')[0])
    );
    if (importInfo) {
      importToMountMap.set(importInfo.name, {
        method,
        path,
        routerFunc
      });
    }
  }
  
  // Also find inline router definitions (app.use("/path", router()))
  const inlineMountPattern = /app\.(use|get|post|put|patch|delete)\s*\(\s*["']([^"']+)["']\s*,\s*([A-Z][A-Za-z0-9_$]*)\s*\(/g;
  while ((match = inlineMountPattern.exec(bootstrapContent)) !== null) {
    const method = match[1].toUpperCase();
    const path = match[2];
    const routerFunc = match[3];
    
    mounted.push({
      method,
      path,
      routerFunc,
      raw: match[0],
      isInline: true
    });
  }
  
  return { mounted, importStatements, importToMountMap };
}

/**
 * Check if a route file is properly mounted
 * A route is mounted if:
 * 1. It's imported in ServerBootstrap.ts
 * 2. The import is used in an app.use/app.get/etc call
 */
function isRouteMounted(routeFile, parseResult) {
  const fileName = basename(routeFile, extname(routeFile));
  const relativePath = relative(ROOT, routeFile);
  
  // Check 1: Is the file imported?
  const isImported = parseResult.importStatements.some(i => 
    i.modulePath.includes(fileName) || 
    i.modulePath.includes(relativePath) ||
    relativePath.includes(i.modulePath.replace(/^\.\//, '').replace(/\.js$/, ''))
  );
  
  if (!isImported) {
    return { mounted: false, reason: 'Not imported in ServerBootstrap.ts' };
  }
  
  // Check 2: Is the import actually used in a mount call?
  // Find the import name
  const importInfo = parseResult.importStatements.find(i =>
    i.modulePath.includes(fileName) || 
    relativePath.includes(i.modulePath.replace(/^\.\//, '').replace(/\.js$/, ''))
  );
  
  if (!importInfo) {
    return { mounted: false, reason: 'Import not found' };
  }
  
  // Check if the import name appears in any mount call
  const isMounted = parseResult.mounted.some(m => 
    m.routerFunc && m.routerFunc.includes(importInfo.name)
  );
  
  if (!isMounted) {
    return { mounted: false, reason: `Imported but not mounted (${importInfo.name})` };
  }
  
  // Get the mount info
  const mountInfo = parseResult.mounted.find(m => 
    m.routerFunc && m.routerFunc.includes(importInfo.name)
  );
  
  return { 
    mounted: true, 
    mountInfo,
    importName: importInfo.name
  };
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
  console.log(`Mode: ${results.mode.toUpperCase()}`);
  console.log('⚠️  This is a STATIC HEURISTIC - does not validate runtime behavior\n');
  
  const serverBootstrapPath = join(ROOT, 'server/src/core/ServerBootstrap.ts');
  
  if (!existsSync(serverBootstrapPath)) {
    console.error('❌ FATAL: ServerBootstrap.ts not found at', serverBootstrapPath);
    results.fatal = 'ServerBootstrap.ts not found';
    console.log(JSON.stringify(results, null, 2));
    process.exit(1);
  }
  
  const bootstrapContent = readFileSync(serverBootstrapPath, 'utf-8');
  const parseResult = parseBootstrapRoutes(bootstrapContent);
  
  // Find all route files
  const routesDir = join(ROOT, 'server/src/routes');
  const apiDir = join(ROOT, 'server/src/api');
  
  const routeFiles = [
    ...findRouteFiles(routesDir, []),
    ...findRouteFiles(apiDir, [])
  ];
  
  console.log(`📊 Found ${routeFiles.length} route files`);
  console.log(`📊 Found ${parseResult.mounted.length} mount points in ServerBootstrap.ts`);
  console.log(`📊 Found ${parseResult.importStatements.length} route imports`);
  
  // Check each route file
  for (const routeFile of routeFiles) {
    const fileName = basename(routeFile);
    const relativePath = relative(ROOT, routeFile);
    
    // Use proper mount detection
    const mountStatus = isRouteMounted(routeFile, parseResult);
    
    if (mountStatus.mounted) {
      results.mounted.push({
        file: relativePath,
        name: fileName,
        mountInfo: mountStatus.mountInfo ? {
          method: mountStatus.mountInfo.method,
          path: mountStatus.mountInfo.path
        } : null
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
        reason: mountStatus.reason
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
  const validPaths = new Set();
  
  // Add all mount paths
  for (const mount of parseResult.mounted) {
    if (mount.path) {
      validPaths.add(mount.path);
    }
  }
  
  // Add known inline routes (not from ServerBootstrap but expected)
  // These are documented routes that may be handled elsewhere
  const documentedRoutes = [
    '/api/oracle',      // From routes/api.ts
    '/api/tick/context' // From routes/api.ts
  ];
  for (const r of documentedRoutes) {
    validPaths.add(r);
  }
  
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
        reason: 'No matching route found in ServerBootstrap.ts mount points'
      });
    }
  }
  
  // Add warning about static analysis limitations
  results.warnings.push({
    type: 'STATIC_HEURISTIC',
    message: 'This audit only analyzes source code patterns. Runtime behavior may differ.'
  });
  
  // Output results
  console.log('\n' + '='.repeat(50));
  console.log('📋 AUDIT RESULTS');
  console.log('='.repeat(50));
  
  console.log(`\n✅ MOUNTED ROUTES: ${results.mounted.length}`);
  if (VERBOSE) {
    for (const route of results.mounted.slice(0, 30)) {
      const info = route.mountInfo ? ` (${route.mountInfo.method} ${route.mountInfo.path || 'inline'})` : '';
      console.log(`   - ${route.name}${info}`);
    }
    if (results.mounted.length > 30) {
      console.log(`   ... and ${results.mounted.length - 30} more`);
    }
  }
  
  console.log(`\n⚠️  ORPHANED ROUTES: ${results.orphaned.length}`);
  if (results.orphaned.length > 0) {
    for (const route of results.orphaned.slice(0, 20)) {
      console.log(`   - ${route.file}`);
      console.log(`     Reason: ${route.reason}`);
    }
    if (results.orphaned.length > 20) {
      console.log(`   ... and ${results.orphaned.length - 20} more`);
    }
  }
  
  console.log(`\n⚠️  UNDOCUMENTED ROUTES: ${results.undocumented.length}`);
  if (results.undocumented.length > 0 && VERBOSE) {
    for (const route of results.undocumented.slice(0, 10)) {
      console.log(`   - ${route.file}`);
    }
  }
  
  console.log(`\n❌ DEAD CLIENT REFERENCES: ${results.deadClientReferences.length}`);
  if (results.deadClientReferences.length > 0) {
    for (const ref of results.deadClientReferences.slice(0, 10)) {
      console.log(`   - ${ref.file}:${ref.line} -> ${ref.path}`);
      console.log(`     Reason: ${ref.reason}`);
    }
    if (results.deadClientReferences.length > 10) {
      console.log(`   ... and ${results.deadClientReferences.length - 10} more`);
    }
  }
  
  // Summary
  const hasIssues = results.orphaned.length > 0 || results.deadClientReferences.length > 0;
  
  console.log('\n' + '='.repeat(50));
  if (hasIssues) {
    if (BASELINE_MODE) {
      console.log('✅ BASELINE MODE: Findings reported (no failure)');
      console.log(`   - ${results.orphaned.length} orphaned routes`);
      console.log(`   - ${results.deadClientReferences.length} dead client references`);
      if (OUTPUT_JSON) {
        console.log('\n' + JSON.stringify(results, null, 2));
      }
      process.exit(0);
    } else {
      console.log('⚠️  ISSUES FOUND - Review orphaned routes and dead references');
      console.log('   Use --baseline to report without failing');
      if (OUTPUT_JSON) {
        console.log('\n' + JSON.stringify(results, null, 2));
      }
      process.exit(2);
    }
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
