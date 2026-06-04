/**
 * scan-files.mjs
 * File scanner for wiki sources - extracts content from various source types
 */

import { readdirSync, statSync, readFileSync, existsSync } from 'node:fs';
import { join, extname, basename } from 'node:path';

/**
 * @typedef {Object} FileEntry
 * @property {string} path
 * @property {string} name
 * @property {string} relativePath
 * @property {string} type - 'markdown' | 'json' | 'typescript' | 'other'
 * @property {string} category - 'lore' | 'systems' | 'architecture' | 'deployment' | 'other'
 * @property {string} [content]
 */

/**
 * Determine category from path
 * @param {string} filePath
 * @returns {string}
 */
export function getCategoryFromPath(filePath) {
  const normalized = filePath.toLowerCase();
  
  if (normalized.includes('/lore/') || normalized.includes('lore\\')) return 'lore';
  if (normalized.includes('/systems/') || normalized.includes('systems\\')) return 'systems';
  if (normalized.includes('/architecture/') || normalized.includes('architecture\\')) return 'architecture';
  if (normalized.includes('/npcs/') || normalized.includes('npcs\\')) return 'npcs';
  if (normalized.includes('/items/') || normalized.includes('items\\')) return 'items';
  if (normalized.includes('/skills/') || normalized.includes('skills\\')) return 'skills';
  if (normalized.includes('/biomes/') || normalized.includes('biomes\\')) return 'biomes';
  if (normalized.includes('/deployment/') || normalized.includes('deployment\\')) return 'deployment';
  if (normalized.includes('/wiki/') || normalized.includes('wiki\\')) return 'wiki';
  if (normalized.includes('/docs/')) return 'docs';
  if (normalized.includes('/server/src/')) return 'server';
  if (normalized.includes('/client/src/') || normalized.includes('/apps/client')) return 'client';
  
  return 'other';
}

/**
 * Get file type from extension
 * @param {string} filePath
 * @returns {string}
 */
export function getFileType(filePath) {
  const ext = extname(filePath).toLowerCase();
  switch (ext) {
    case '.md':
    case '.mdx':
      return 'markdown';
    case '.json':
      return 'json';
    case '.ts':
    case '.tsx':
      return 'typescript';
    case '.js':
    case '.jsx':
    case '.mjs':
      return 'javascript';
    default:
      return 'other';
  }
}

/**
 * Read file with encoding detection
 * @param {string} filePath
 * @returns {string|null}
 */
export function readFileSafe(filePath) {
  try {
    if (!existsSync(filePath)) return null;
    const content = readFileSync(filePath);
    // Try UTF-8 first
    return content.toString('utf8');
  } catch {
    try {
      // Fallback to Latin-1 for files with special chars
      return content.toString('latin1');
    } catch {
      return null;
    }
  }
}

/**
 * Scan a directory recursively
 * @param {string} dirPath
 * @param {string} basePath
 * @param {string[]} [extensions=['.md']]
 * @returns {FileEntry[]}
 */
export function scanDirectory(dirPath, basePath, extensions = ['.md']) {
  const results = /** @type {FileEntry[]} */ ([]);
  
  function walk(currentPath) {
    try {
      const entries = readdirSync(currentPath);
      
      for (const entry of entries) {
        const fullPath = join(currentPath, entry);
        const relativePath = fullPath.replace(basePath, '').replace(/^[/\\]/, '');
        
        try {
          const stat = statSync(fullPath);
          
          if (stat.isDirectory()) {
            // Skip hidden directories and common non-source dirs
            if (!entry.startsWith('.') && 
                entry !== 'node_modules' && 
                entry !== 'dist' && 
                entry !== 'build' &&
                entry !== '__pycache__') {
              walk(fullPath);
            }
          } else if (stat.isFile()) {
            const ext = extname(entry);
            if (extensions.includes(ext.toLowerCase())) {
              results.push({
                path: fullPath,
                name: basename(entry, ext),
                relativePath,
                type: getFileType(entry),
                category: getCategoryFromPath(relativePath),
                content: null // Content loaded separately
              });
            }
          }
        } catch (e) {
          // Skip inaccessible files
        }
      }
    } catch (e) {
      // Skip inaccessible directories
    }
  }
  
  walk(dirPath);
  return results;
}

/**
 * Scan source tree for all relevant files
 * @param {string} rootPath
 * @returns {Object}
 */
export function scanSourceTree(rootPath) {
  const wikiFiles = scanDirectory(join(rootPath, 'docs/wiki'), rootPath, ['.md']);
  const docsFiles = scanDirectory(join(rootPath, 'docs'), rootPath, ['.md']);
  const serverFiles = scanDirectory(join(rootPath, 'server/src'), rootPath, ['.ts']);
  const clientFiles = scanDirectory(join(rootPath, 'apps/client-2d/src'), rootPath, ['.ts', '.tsx']);
  
  return {
    wiki: wikiFiles,
    docs: docsFiles,
    server: serverFiles,
    client: clientFiles,
    total: wikiFiles.length + docsFiles.length + serverFiles.length + clientFiles.length
  };
}

/**
 * Extract frontmatter from markdown
 * @param {string} content
 * @returns {{frontmatter: Object|null, body: string}}
 */
export function extractFrontmatter(content) {
  const match = content.match(/^---\s*\n([\s\S]*?)\n---\s*\n/);
  if (match) {
    try {
      const frontmatter = {};
      const lines = match[1].split('\n');
      for (const line of lines) {
        const colonIdx = line.indexOf(':');
        if (colonIdx > 0) {
          const key = line.slice(0, colonIdx).trim();
          const value = line.slice(colonIdx + 1).trim();
          frontmatter[key] = value;
        }
      }
      return {
        frontmatter,
        body: content.slice(match[0].length)
      };
    } catch {
      return { frontmatter: null, body: content };
    }
  }
  return { frontmatter: null, body: content };
}

/**
 * Extract title from markdown content
 * @param {string} content
 * @returns {string|null}
 */
export function extractTitle(content) {
  const match = content.match(/^#\s+(.+)$/m);
  return match ? match[1].trim() : null;
}

/**
 * Extract all headings from markdown
 * @param {string} content
 * @returns {Array<{level: number, text: string}>}
 */
export function extractHeadings(content) {
  const headings = [];
  const regex = /^(#{1,6})\s+(.+)$/gm;
  let match;
  
  while ((match = regex.exec(content)) !== null) {
    headings.push({
      level: match[1].length,
      text: match[2].trim()
    });
  }
  
  return headings;
}

/**
 * Extract all links from markdown
 * @param {string} content
 * @returns {string[]}
 */
export function extractLinks(content) {
  const links = [];
  
  // Wiki links [[Page]] or [[Label|Page]]
  const wikiRegex = /\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g;
  let match;
  while ((match = wikiRegex.exec(content)) !== null) {
    links.push(match[1]);
  }
  
  // Standard markdown links [text](url)
  const mdLinkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
  while ((match = mdLinkRegex.exec(content)) !== null) {
    links.push(match[2]);
  }
  
  return [...new Set(links)];
}