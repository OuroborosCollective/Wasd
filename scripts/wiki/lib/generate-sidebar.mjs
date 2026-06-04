/**
 * generate-sidebar.mjs
 * Generates the wiki _Sidebar.md with automatic structure
 */

import { readdirSync, statSync, existsSync, readFileSync } from 'node:fs';
import { join, basename, extname } from 'node:path';

/**
 * @typedef {Object} SidebarSection
 * @property {string} title
 * @property {string[]} items
 */

/**
 * Build sidebar sections from wiki files
 * @param {string} wikiDir
 * @returns {SidebarSection[]}
 */
export function buildSidebarSections(wikiDir) {
  const sections = [];
  
  // Vision and Theory
  sections.push({
    title: '🎯 Vision and Theory',
    items: [
      'Home',
      'Areloria-Vision',
      'ARE-Logic-Core',
      'ARE-Erdos-Attractor-Model',
      'Determinism',
      'Economy_and_Matrix'
    ]
  });
  
  // Core Systems
  sections.push({
    title: '⚙️ Core Systems',
    items: [
      'WorldTick-and-10Hz-Simulation',
      'Systems_Architecture',
      'NPC_Core',
      'Guard_and_Ops'
    ]
  });
  
  // Gameplay
  sections.push({
    title: '🎮 Gameplay',
    items: [
      'Implementation-Map',
      'Research-Publications'
    ]
  });
  
  // Assets and Client
  sections.push({
    title: '🎨 Assets and Client',
    items: [
      'Asset-Forge-and-2D-Pipeline'
    ]
  });
  
  // Meta
  sections.push({
    title: '📋 Meta',
    items: [
      'Agent-Index',
      'Glossary'
    ]
  });
  
  // Check which files actually exist
  const existingFiles = new Set();
  try {
    const files = readdirSync(wikiDir);
    for (const file of files) {
      if (file.endsWith('.md')) {
        existingFiles.add(file.replace('.md', ''));
      }
    }
  } catch {}
  
  // Filter to only existing pages
  for (const section of sections) {
    section.items = section.items.filter(item => existingFiles.has(item));
  }
  
  return sections.filter(s => s.items.length > 0);
}

/**
 * Generate _Sidebar.md content
 * @param {Object} options
 * @returns {string}
 */
export function generateSidebar(options = {}) {
  const {
    wikiDir = './docs/wiki',
    projectName = 'Areloria',
    customSections = []
  } = options;
  
  const sections = buildSidebarSections(wikiDir);
  
  // Add any custom sections
  const allSections = [...sections, ...customSections];
  
  let output = `## ${projectName} Codex

`;
  
  for (const section of allSections) {
    output += `### ${section.title}\n\n`;
    
    for (const item of section.items) {
      // Format: [[Display Text|Page-Name]] or [[Page-Name]] if no display text
      const parts = item.split('|');
      if (parts.length === 2) {
        output += `- [[${parts[0]}|${parts[1]}]]\n`;
      } else {
        output += `- [[${item}]]\n`;
      }
    }
    
    output += '\n';
  }
  
  output += `---\n\n`;
  output += `**Status:** Living Wiki | **Sync:** Autonomous Codex Engine\n`;
  
  return output;
}

/**
 * Generate auto-sidebar from file scan
 * @param {string} docsDir
 * @returns {SidebarSection[]}
 */
export function generateSidebarFromScan(docsDir) {
  const sections = /** @type {SidebarSection[]} */ ([]);
  
  // Category mapping to section names
  const categoryMap = {
    'lore': '📜 Lore',
    'npcs': '🤖 NPCs',
    'systems': '⚙️ Systems',
    'architecture': '🏗️ Architecture',
    'deployment': '☁️ Deployment',
    'gameplay': '🎮 Gameplay',
    'items': '⚔️ Items',
    'skills': '✨ Skills',
    'biomes': '🌍 Biomes',
    'other': '📄 Other'
  };
  
  // Scan docs directory
  const filesByCategory = {};
  
  function scanDir(dir, baseDir) {
    try {
      const entries = readdirSync(dir);
      
      for (const entry of entries) {
        if (entry.startsWith('.') || entry === 'node_modules') continue;
        
        const fullPath = join(dir, entry);
        const stat = statSync(fullPath);
        
        if (stat.isDirectory()) {
          scanDir(fullPath, baseDir);
        } else if (stat.isFile() && (entry.endsWith('.md') || entry.endsWith('.mdx'))) {
          // Determine category from path
          const relative = fullPath.replace(baseDir, '').replace(/^[/\\]/, '');
          const parts = relative.split('/');
          
          let category = 'other';
          if (parts.length >= 2) {
            const parentDir = parts[0].toLowerCase();
            if (categoryMap[parentDir]) {
              category = parentDir;
            }
          }
          
          if (!filesByCategory[category]) {
            filesByCategory[category] = [];
          }
          
          const name = entry.replace(/\.mdx?$/, '');
          filesByCategory[category].push(name);
        }
      }
    } catch {}
  }
  
  if (existsSync(docsDir)) {
    scanDir(docsDir, docsDir);
  }
  
  // Build sections
  for (const [category, items] of Object.entries(filesByCategory)) {
    if (items.length > 0) {
      sections.push({
        title: categoryMap[category] || category,
        items: items.sort()
      });
    }
  }
  
  return sections;
}