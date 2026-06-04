/**
 * generate-module-map.mjs
 * Generates architecture diagrams and module maps from source code
 */

import { readdirSync, statSync, existsSync, readFileSync } from 'node:fs';
import { join, basename, extname } from 'node:path';

/**
 * @typedef {Object} ModuleInfo
 * @property {string} name
 * @property {string} path
 * @property {string} type - 'module' | 'class' | 'interface' | 'function'
 * @property {string[]} imports
 * @property {string[]} exports
 * @property {string} description
 */

/**
 * Extract module name from file path
 * @param {string} filePath
 * @param {string} basePath
 * @returns {string}
 */
function getModuleName(filePath, basePath) {
  const relative = filePath.replace(basePath, '').replace(/^[/\\]/, '');
  const parts = relative.split('/');
  
  // Remove file extension and get name
  let name = parts.pop()?.replace(/\.(ts|tsx|js|jsx)$/, '') || '';
  
  // Convert to readable name
  name = name
    .replace(/([A-Z])/g, ' $1')  // Split camelCase
    .replace(/[-_]/g, ' ')
    .replace(/^\w/, c => c.toUpperCase())
    .trim();
  
  return name;
}

/**
 * Scan directory for TypeScript files
 * @param {string} dirPath
 * @param {string} basePath
 * @param {number} [depth=2]
 * @returns {string[]}
 */
function scanTsFiles(dirPath, basePath, depth = 2) {
  const files = [];
  
  function walk(currentPath, currentDepth) {
    if (currentDepth > depth) return;
    
    try {
      const entries = readdirSync(currentPath);
      
      for (const entry of entries) {
        if (entry.startsWith('.') || entry === 'node_modules' || entry === 'dist') continue;
        
        const fullPath = join(currentPath, entry);
        
        try {
          const stat = statSync(fullPath);
          
          if (stat.isDirectory()) {
            walk(fullPath, currentDepth + 1);
          } else if (stat.isFile() && /\.(ts|tsx)$/.test(entry) && !entry.endsWith('.d.ts')) {
            files.push(fullPath);
          }
        } catch {}
      }
    } catch {}
  }
  
  walk(dirPath, 0);
  return files;
}

/**
 * Extract imports from TypeScript file
 * @param {string} content
 * @returns {string[]}
 */
function extractImports(content) {
  const imports = [];
  
  // Named imports: import { X, Y } from 'module'
  const namedRegex = /import\s+\{[^}]+\}\s+from\s+['"]([^'"]+)['"]/g;
  let match;
  while ((match = namedRegex.exec(content)) !== null) {
    imports.push(match[1]);
  }
  
  // Default imports: import X from 'module'
  const defaultRegex = /import\s+(\w+)\s+from\s+['"]([^'"]+)['"]/g;
  while ((match = defaultRegex.exec(content)) !== null) {
    imports.push(match[2]);
  }
  
  return imports;
}

/**
 * Extract class/interface definitions
 * @param {string} content
 * @returns {string[]}
 */
function extractExports(content) {
  const exports = [];
  
  // Class definitions
  const classRegex = /export\s+(?:abstract\s+)?class\s+(\w+)/g;
  let match;
  while ((match = classRegex.exec(content)) !== null) {
    exports.push({ type: 'class', name: match[1] });
  }
  
  // Interface definitions
  const interfaceRegex = /export\s+interface\s+(\w+)/g;
  while ((match = interfaceRegex.exec(content)) !== null) {
    exports.push({ type: 'interface', name: match[1] });
  }
  
  // Function exports
  const funcRegex = /export\s+(?:async\s+)?function\s+(\w+)/g;
  while ((match = funcRegex.exec(content)) !== null) {
    exports.push({ type: 'function', name: match[1] });
  }
  
  // Type exports
  const typeRegex = /export\s+type\s+(\w+)/g;
  while ((match = typeRegex.exec(content)) !== null) {
    exports.push({ type: 'type', name: match[1] });
  }
  
  return exports;
}

/**
 * Build module map from source directories
 * @param {string} rootPath
 * @returns {Object}
 */
export function buildModuleMap(rootPath) {
  const modules = {
    server: [],
    client: [],
    shared: []
  };
  
  // Server modules
  const serverPath = join(rootPath, 'server/src');
  if (existsSync(serverPath)) {
    const files = scanTsFiles(serverPath, 'server/src', 3);
    
    for (const file of files) {
      try {
        const content = readFileSync(file, 'utf8');
        const relativePath = file.replace(rootPath, '');
        const name = getModuleName(file, serverPath);
        
        modules.server.push({
          name,
          path: relativePath,
          imports: extractImports(content),
          exports: extractExports(content),
          description: ''
        });
      } catch {}
    }
  }
  
  // Client modules (2D)
  const client2dPath = join(rootPath, 'apps/client-2d/src');
  if (existsSync(client2dPath)) {
    const files = scanTsFiles(client2dPath, 'apps/client-2d/src', 3);
    
    for (const file of files) {
      try {
        const content = readFileSync(file, 'utf8');
        const relativePath = file.replace(rootPath, '');
        const name = getModuleName(file, client2dPath);
        
        modules.client.push({
          name,
          path: relativePath,
          imports: extractImports(content),
          exports: extractExports(content),
          description: ''
        });
      } catch {}
    }
  }
  
  // Shared packages
  const sharedPath = join(rootPath, 'packages/shared/src');
  if (existsSync(sharedPath)) {
    const files = scanTsFiles(sharedPath, 'packages/shared/src', 2);
    
    for (const file of files) {
      try {
        const content = readFileSync(file, 'utf8');
        const relativePath = file.replace(rootPath, '');
        const name = getModuleName(file, sharedPath);
        
        modules.shared.push({
          name,
          path: relativePath,
          imports: extractImports(content),
          exports: extractExports(content),
          description: ''
        });
      } catch {}
    }
  }
  
  return modules;
}

/**
 * Generate Mermaid diagram from module map
 * @param {Object} modules
 * @returns {string}
 */
export function generateMermaidGraph(modules) {
  let diagram = '```mermaid\n';
  diagram += 'graph TD\n';
  diagram += '    subgraph "Server (@wasd/server)"\n';
  
  for (const mod of modules.server.slice(0, 20)) {
    const id = mod.name.replace(/[^a-zA-Z0-9]/g, '');
    diagram += `        S_${id}["${mod.name}"]\n`;
  }
  
  diagram += '    end\n\n';
  diagram += '    subgraph "Client 2D (@wasd/client-2d)"\n';
  
  for (const mod of modules.client.slice(0, 15)) {
    const id = mod.name.replace(/[^a-zA-Z0-9]/g, '');
    diagram += `        C_${id}["${mod.name}"]\n`;
  }
  
  diagram += '    end\n\n';
  diagram += '    subgraph "Shared (@wasd/shared)"\n';
  
  for (const mod of modules.shared.slice(0, 10)) {
    const id = mod.name.replace(/[^a-zA-Z0-9]/g, '');
    diagram += `        P_${id}["${mod.name}"]\n`;
  }
  
  diagram += '    end\n';
  diagram += '```\n';
  
  return diagram;
}

/**
 * Generate module overview markdown
 * @param {Object} modules
 * @returns {string}
 */
export function generateModuleOverview(modules) {
  let output = '## Module Overview\n\n';
  
  output += `| Layer | Modules |
|-------|--------|
| Server | ${modules.server.length} |
| Client 2D | ${modules.client.length} |
| Shared | ${modules.shared.length} |\n\n`;
  
  // Server modules by directory
  const serverByDir = {};
  for (const mod of modules.server) {
    const dir = mod.path.split('/').slice(0, 2).join('/');
    if (!serverByDir[dir]) serverByDir[dir] = [];
    serverByDir[dir].push(mod);
  }
  
  output += '### Server Architecture\n\n';
  for (const [dir, mods] of Object.entries(serverByDir)) {
    output += `#### ${dir}\n\n`;
    output += '| Module | Exports |\n';
    output += '|--------|---------|\n';
    
    for (const mod of mods.slice(0, 10)) {
      const exportCount = mod.exports.length;
      output += `| ${mod.name} | ${exportCount} |\n`;
    }
    
    if (mods.length > 10) {
      output += `\n*... and ${mods.length - 10} more*\n`;
    }
    
    output += '\n';
  }
  
  return output;
}

/**
 * Generate Architecture.md content
 * @param {Object} options
 * @returns {string}
 */
export function generateArchitecturePage(options = {}) {
  const {
    projectName = 'Areloria',
    rootPath = '.',
    modules = null
  } = options;
  
  const moduleMap = modules || buildModuleMap(rootPath);
  const mermaidGraph = generateMermaidGraph(moduleMap);
  const moduleOverview = generateModuleOverview(moduleMap);
  
  let output = `# ${projectName} Systems Architecture\n\n`;
  output += '> Auto-generated architecture overview\n\n';
  
  output += '## System Diagram\n\n';
  output += mermaidGraph;
  output += '\n';
  
  output += '## Runtime Architecture\n\n';
  output += '```\n';
  output += 'Browser Client (3D/2D)\n';
  output += '         │\n';
  output += '         ▼\n';
  output += '    Nginx Gateway\n';
  output += '         │\n';
  output += '         ▼\n';
  output += '   WebSocket Server (10Hz)\n';
  output += '         │\n';
  output += '    ┌────┴────┐\n';
  output += '    ▼         ▼\n';
  output += ' Game Loop  Persistence\n';
  output += ' (WorldTick) (Supabase/Redis)\n';
  output += '```\n\n';
  
  output += '## Key Systems\n\n';
  
  // WorldTick
  output += '### WorldTick (10Hz Simulation)\n\n';
  output += '- **File**: `server/src/core/WorldTick.ts`\n';
  output += '- **Cadence**: 100ms per tick\n';
  output += '- **Responsibility**: Advances simulation, processes events, broadcasts state\n\n';
  
  // ARE Determinism
  output += '### ARE Determinism Gate\n\n';
  output += '- **Files**: `server/src/core/determinism/*.ts`\n';
  output += '- **Responsibility**: Enforce deterministic simulation (no Math.random, Date.now in sim paths)\n\n';
  
  // Manifest System
  output += '### Manifest System\n\n';
  output += '- **Files**: `server/src/core/manifest/*.ts`\n';
  output += '- **Responsibility**: Deterministic state hash chain for client sync\n\n';
  
  // WebSocket Networking
  output += '### WebSocket Networking\n\n';
  output += '- **File**: `server/src/networking/WebSocketServer.ts`\n';
  output += '- **Responsibility**: Real-time player communication\n\n';
  
  output += moduleOverview;
  
  output += `---\n\n`;
  output += `**Generated**: ${new Date().toISOString()}\n`;
  
  return output;
}