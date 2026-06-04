#!/usr/bin/env node
/**
 * build-autonomous-wiki.mjs
 * Autonomous Wiki / Codex Engine for Areloria
 * 
 * Builds wiki pages from:
 * - docs/wiki/*.md (existing wiki content)
 * - docs/*.md (documentation)
 * - README.md (project overview)
 * - package.json (project metadata)
 * - Server/Client source code (module maps)
 * 
 * Outputs to .wiki-build/ directory
 */

import { cpSync, existsSync, mkdirSync, readFileSync, writeFileSync, rmSync, readdirSync, statSync } from 'node:fs';
import { join, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

// Wiki lib modules
import { scanDirectory, scanSourceTree, extractFrontmatter, extractTitle } from './lib/scan-files.mjs';
import { parseMarkdown as parseMd, analyzeMarkdown, extractSummary, jsonToMarkdownTable, groupByCategory } from './lib/parse-markdown.mjs';
import { generateHomePage } from './lib/generate-home.mjs';
import { generateSidebar, buildSidebarSections, generateSidebarFromScan } from './lib/generate-sidebar.mjs';
import { generateCompactChangelog } from './lib/generate-changelog.mjs';
import { generateArchitecturePage, buildModuleMap, generateMermaidGraph } from './lib/generate-module-map.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));

// CLI argument parsing
const args = process.argv.slice(2);
let options = {
  source: 'docs/wiki',
  out: '.wiki-build',
  rebuild: 'true',
  dryRun: false
};

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--source' && args[i + 1]) {
    options.source = args[++i];
  } else if (args[i] === '--out' && args[i + 1]) {
    options.out = args[++i];
  } else if (args[i] === '--rebuild' && args[i + 1]) {
    options.rebuild = args[++i];
  } else if (args[i] === '--dry-run') {
    options.dryRun = args[++i] === 'true';
  }
}

// Resolve paths
const rootPath = process.cwd();
const sourceDir = join(rootPath, options.source);
const outputDir = join(rootPath, options.out);
const docsDir = join(rootPath, 'docs');

// Stats
const stats = {
  copied: 0,
  generated: 0,
  skipped: 0,
  errors: []
};

/**
 * Logger with timestamps
 */
function log(level, message, ...args) {
  const timestamp = new Date().toISOString().split('T')[1].slice(0, 8);
  const prefix = {
    info: 'ℹ️',
    warn: '⚠️',
    error: '🔴',
    success: '✅',
    step: '🔧'
  }[level] || '📝';
  
  console.log(`${timestamp} ${prefix} ${message}`, ...args);
}

/**
 * Load project metadata
 */
function loadProjectMetadata() {
  const metadata = {
    name: 'Areloria',
    version: '1.0.0',
    description: 'Deterministic Browser MMORPG Engine',
    lastCommit: 'unknown',
    lastCommitDate: 'unknown'
  };
  
  // Try package.json
  try {
    const pkgPath = join(rootPath, 'package.json');
    if (existsSync(pkgPath)) {
      const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
      metadata.name = pkg.name || metadata.name;
      metadata.version = pkg.version || metadata.version;
      metadata.description = pkg.description || metadata.description;
    }
  } catch {}
  
  // Try README.md
  try {
    const readmePath = join(rootPath, 'README.md');
    if (existsSync(readmePath)) {
      const readme = readFileSync(readmePath, 'utf8');
      const titleMatch = readme.match(/^#\s+(.+)$/m);
      if (titleMatch) {
        metadata.name = titleMatch[1].replace(/[^\w\s]/g, '').trim();
      }
    }
  } catch {}
  
  // Get last commit info
  try {
    const result = execFileSync('git', ['log', '-1', '--pretty=format:%h|%ad', '--date=short'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe']
    });
    const [hash, date] = result.trim().split('|');
    metadata.lastCommit = hash;
    metadata.lastCommitDate = date;
  } catch {}
  
  return metadata;
}

/**
 * Copy existing wiki files
 */
function copyWikiFiles() {
  log('step', 'Copying wiki source files...');
  
  if (!existsSync(sourceDir)) {
    log('warn', `Source directory not found: ${sourceDir}, creating...`);
    mkdirSync(sourceDir, { recursive: true });
    return;
  }
  
  const files = scanDirectory(sourceDir, sourceDir, ['.md']);
  log('info', `Found ${files.length} wiki source files`);
  
  // Protected pages that shouldn't be overwritten
  const protectedPages = ['_Sidebar.md', '_Footer.md', 'Home.md'];
  
  for (const file of files) {
    try {
      const content = readFileSync(file.path, 'utf8');
      const destPath = join(outputDir, basename(file.path));
      
      // Skip protected pages if they already exist and we're not rebuilding
      if (protectedPages.includes(basename(file.path)) && existsSync(destPath) && options.rebuild !== 'true') {
        log('info', `Skipping protected page: ${basename(file.path)}`);
        stats.skipped++;
        continue;
      }
      
      writeFileSync(destPath, content);
      stats.copied++;
    } catch (e) {
      stats.errors.push(`Failed to copy ${file.path}: ${e.message}`);
    }
  }
  
  log('success', `Copied ${stats.copied} files, skipped ${stats.skipped}`);
}

/**
 * Generate Home.md
 */
function generateHome() {
  log('step', 'Generating Home page...');
  
  const metadata = loadProjectMetadata();
  const repoUrl = `https://github.com/${process.env.GITHUB_REPOSITORY || 'example/areloria'}`;
  
  // Check if we should preserve existing Home
  const existingHomePath = join(sourceDir, 'Home.md');
  if (existsSync(existingHomePath) && options.rebuild !== 'true') {
    try {
      const existingHome = readFileSync(existingHomePath, 'utf8');
      // If existing home has substantial content, keep it
      if (existingHome.length > 1000) {
        const destPath = join(outputDir, 'Home.md');
        writeFileSync(destPath, existingHome);
        log('info', 'Preserving existing Home.md');
        return;
      }
    } catch {}
  }
  
  const homeContent = generateHomePage({
    projectName: metadata.name,
    projectTagline: metadata.description,
    wikiSourceDir: sourceDir,
    docsDir: docsDir,
    repoUrl,
    version: metadata.version
  });
  
  const destPath = join(outputDir, 'Home.md');
  writeFileSync(destPath, homeContent);
  stats.generated++;
  log('success', 'Generated Home.md');
}

/**
 * Generate _Sidebar.md
 */
function generateSidebarPage() {
  log('step', 'Generating Sidebar...');
  
  // Check if we should preserve existing sidebar
  const existingSidebarPath = join(sourceDir, '_Sidebar.md');
  if (existsSync(existingSidebarPath) && options.rebuild !== 'true') {
    try {
      const existingSidebar = readFileSync(existingSidebarPath, 'utf8');
      if (existingSidebar.length > 200) {
        const destPath = join(outputDir, '_Sidebar.md');
        writeFileSync(destPath, existingSidebar);
        log('info', 'Preserving existing _Sidebar.md');
        return;
      }
    } catch {}
  }
  
  const sidebarContent = generateSidebar({
    wikiDir: sourceDir,
    projectName: loadProjectMetadata().name
  });
  
  const destPath = join(outputDir, '_Sidebar.md');
  writeFileSync(destPath, sidebarContent);
  stats.generated++;
  log('success', 'Generated _Sidebar.md');
}

/**
 * Generate Architecture page
 */
function generateArchitecture() {
  log('step', 'Generating Architecture page...');
  
  try {
    const architectureContent = generateArchitecturePage({
      projectName: loadProjectMetadata().name,
      rootPath: rootPath
    });
    
    // Check if existing architecture page should be preserved
    const existingPath = join(sourceDir, 'Systems_Architecture.md');
    if (existsSync(existingPath) && options.rebuild !== 'true') {
      const existing = readFileSync(existingPath, 'utf8');
      if (existing.length > architectureContent.length * 0.8) {
        const destPath = join(outputDir, 'Systems_Architecture.md');
        writeFileSync(destPath, existing);
        log('info', 'Preserving existing Systems_Architecture.md');
        return;
      }
    }
    
    const destPath = join(outputDir, 'Systems_Architecture.md');
    writeFileSync(destPath, architectureContent);
    stats.generated++;
    log('success', 'Generated Systems_Architecture.md');
  } catch (e) {
    log('warn', `Failed to generate Architecture page: ${e.message}`);
  }
}

/**
 * Generate Changelog
 */
function generateChangelog() {
  log('step', 'Generating Changelog...');
  
  try {
    const changelogContent = generateCompactChangelog({
      since: '2 weeks ago',
      limit: 30,
      projectName: loadProjectMetadata().name
    });
    
    const destPath = join(outputDir, 'Changelog.md');
    writeFileSync(destPath, changelogContent);
    stats.generated++;
    log('success', 'Generated Changelog.md');
  } catch (e) {
    log('warn', `Failed to generate Changelog: ${e.message}`);
  }
}

/**
 * Generate Module Map page
 */
function generateModuleMap() {
  log('step', 'Generating Module Map...');
  
  try {
    const moduleMap = buildModuleMap(rootPath);
    
    let content = `# ${loadProjectMetadata().name} Module Map\n\n`;
    content += '> Auto-generated module overview\n\n';
    
    // Summary table
    content += '## Module Summary\n\n';
    content += `| Layer | Module Count |\n`;
    content += `|-------|-------------|\n`;
    content += `| Server | ${moduleMap.server.length} |\n`;
    content += `| Client 2D | ${moduleMap.client.length} |\n`;
    content += `| Shared | ${moduleMap.shared.length} |\n\n`;
    
    // Mermaid graph
    content += '## System Graph\n\n';
    content += generateMermaidGraph(moduleMap);
    content += '\n';
    
    // Group server modules by top-level directory
    const serverByDir = {};
    for (const mod of moduleMap.server) {
      const dir = mod.path.split('/').slice(1, 3).join('/') || 'root';
      if (!serverByDir[dir]) serverByDir[dir] = [];
      serverByDir[dir].push(mod);
    }
    
    content += '## Server Modules\n\n';
    for (const [dir, mods] of Object.entries(serverByDir)) {
      content += `### ${dir}\n\n`;
      content += '| Module | Path |\n';
      content += '|--------|------|\n';
      
      for (const mod of mods.slice(0, 15)) {
        content += `| ${mod.name} | \`${mod.path}\` |\n`;
      }
      
      if (mods.length > 15) {
        content += `\n*... and ${mods.length - 15} more modules*\n`;
      }
      
      content += '\n';
    }
    
    content += `---\n\n`;
    content += `**Generated:** ${new Date().toISOString()}\n`;
    
    const destPath = join(outputDir, 'Implementation-Map.md');
    writeFileSync(destPath, content);
    stats.generated++;
    log('success', 'Generated Implementation-Map.md');
  } catch (e) {
    log('warn', `Failed to generate Module Map: ${e.message}`);
  }
}

/**
 * Generate Roadmap from docs
 */
function generateRoadmap() {
  log('step', 'Generating Roadmap...');
  
  try {
    const roadmapPath = join(docsDir, 'ROADMAP_TO_RELEASE.md');
    const statusPath = join(docsDir, 'PROJECT_STATUS_2026.md');
    
    let content = `# Project Roadmap\n\n`;
    content += '> Auto-generated from project documentation\n\n';
    
    // Include current status if available
    if (existsSync(statusPath)) {
      const status = readFileSync(statusPath, 'utf8');
      const titleMatch = status.match(/^#\s+(.+)$/m);
      if (titleMatch) {
        content += `**Status Document:** ${titleMatch[1]}\n\n`;
      }
    }
    
    // Include roadmap if available
    if (existsSync(roadmapPath)) {
      const roadmap = readFileSync(roadmapPath, 'utf8');
      // Extract relevant sections
      const tierAMatch = roadmap.match(/## Tier A[^#]*(?=##|$)/s);
      const tierBMatch = roadmap.match(/## Tier B[^#]*(?=##|$)/s);
      
      if (tierAMatch) {
        content += '## Release Blockers\n\n';
        content += tierAMatch[0].replace(/^## /, '').trim() + '\n\n';
      }
      
      if (tierBMatch) {
        content += '## Major Systems\n\n';
        content += tierBMatch[0].replace(/^## /, '').trim() + '\n\n';
      }
    }
    
    content += `---\n\n`;
    content += `**Source:** docs/ROADMAP_TO_RELEASE.md, docs/PROJECT_STATUS_2026.md\n`;
    content += `**Generated:** ${new Date().toISOString()}\n`;
    
    const destPath = join(outputDir, 'Roadmap.md');
    writeFileSync(destPath, content);
    stats.generated++;
    log('success', 'Generated Roadmap.md');
  } catch (e) {
    log('warn', `Failed to generate Roadmap: ${e.message}`);
  }
}

/**
 * Generate status dashboard
 */
function generateStatusPage() {
  log('step', 'Generating Status page...');
  
  try {
    const statusPath = join(docsDir, 'PROJECT_STATUS_2026.md');
    
    let content = `# System Status\n\n`;
    content += '> Live status from PROJECT_STATUS_2026.md\n\n';
    
    if (existsSync(statusPath)) {
      const status = readFileSync(statusPath, 'utf8');
      
      // Extract tables and key status info
      const tables = status.match(/\|[^\n]+\|\n\|[-:\s|]+\|\n([|][^\n]+\n)+/g) || [];
      
      if (tables.length > 0) {
        for (const table of tables.slice(0, 5)) {
          content += table + '\n';
        }
      }
    }
    
    content += `---\n\n`;
    content += `**Last Updated:** ${loadProjectMetadata().lastCommitDate}\n`;
    content += `**Commit:** \`${loadProjectMetadata().lastCommit}\`\n`;
    
    const destPath = join(outputDir, 'Status.md');
    writeFileSync(destPath, content);
    stats.generated++;
    log('success', 'Generated Status.md');
  } catch (e) {
    log('warn', `Failed to generate Status page: ${e.message}`);
  }
}

/**
 * Generate _Footer.md
 */
function generateFooter() {
  log('step', 'Generating Footer...');
  
  const metadata = loadProjectMetadata();
  
  const footerContent = `---

**${metadata.name}** — ${metadata.description}

- [View on GitHub](https://github.com/${process.env.GITHUB_REPOSITORY || 'example/areloria'})
- [Report an Issue](https://github.com/${process.env.GITHUB_REPOSITORY || 'example/areloria'}/issues)
- [Project Docs](https://github.com/${process.env.GITHUB_REPOSITORY || 'example/areloria'}/tree/main/docs)

---

*Auto-generated by Areloria Codex Engine* | ${new Date().toISOString().split('T')[0]}
`;
  
  const destPath = join(outputDir, '_Footer.md');
  writeFileSync(destPath, footerContent);
  stats.generated++;
  log('success', 'Generated _Footer.md');
}

/**
 * Main build process
 */
function main() {
  console.log('\n🧠 Areloria Codex Engine');
  console.log('========================\n');
  console.log(`Source: ${sourceDir}`);
  console.log(`Output: ${outputDir}`);
  console.log(`Rebuild: ${options.rebuild}`);
  console.log('');
  
  // Clean and prepare output directory
  if (existsSync(outputDir)) {
    rmSync(outputDir, { recursive: true, force: true });
  }
  mkdirSync(outputDir, { recursive: true });
  
  // Build steps
  try {
    // Step 1: Copy existing wiki files
    copyWikiFiles();
    
    // Step 2: Generate auto content
    generateHome();
    generateSidebarPage();
    generateFooter();
    generateArchitecture();
    generateChangelog();
    generateModuleMap();
    generateRoadmap();
    generateStatusPage();
    
    // Summary
    console.log('\n========================');
    console.log('📊 Build Summary');
    console.log('========================');
    console.log(`Copied: ${stats.copied} files`);
    console.log(`Generated: ${stats.generated} pages`);
    console.log(`Skipped: ${stats.skipped} protected pages`);
    
    if (stats.errors.length > 0) {
      console.log(`\n⚠️ Errors: ${stats.errors.length}`);
      for (const err of stats.errors) {
        console.log(`  - ${err}`);
      }
    }
    
    console.log(`\n✅ Output: ${outputDir}`);
    console.log('');
    
    process.exit(stats.errors.length > 0 ? 1 : 0);
  } catch (e) {
    console.error('\n🔴 Build failed:', e.message);
    process.exit(1);
  }
}

main();