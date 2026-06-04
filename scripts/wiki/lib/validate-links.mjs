/**
 * validate-links.mjs
 * Link and content validator for wiki pages
 */

import { existsSync, readFileSync, statSync, readdirSync } from 'node:fs';
import { join, extname, basename } from 'node:path';

/**
 * @typedef {Object} ValidationIssue
 * @property {string} type
 * @property {string} severity - 'error' | 'warning' | 'info'
 * @property {string} file
 * @property {number} [line]
 * @property {string} message
 * @property {string} [context]
 */

/**
 * Build page index for link validation
 * @param {string} wikiDir
 * @returns {Set<string>}
 */
export function buildPageIndex(wikiDir) {
  const pages = new Set();
  
  function scanDir(dir) {
    try {
      const entries = readdirSync(dir);
      
      for (const entry of entries) {
        if (entry.startsWith('.')) continue;
        
        const fullPath = join(dir, entry);
        const stat = statSync(fullPath);
        
        if (stat.isDirectory()) {
          scanDir(fullPath);
        } else if (stat.isFile() && entry.endsWith('.md')) {
          // Add page name (without extension)
          const pageName = entry.replace(/\.md$/, '');
          pages.add(pageName);
          
          // Also add with spaces (for wiki link format)
          pages.add(pageName.replace(/-/g, ' '));
        }
      }
    } catch {}
  }
  
  if (existsSync(wikiDir)) {
    scanDir(wikiDir);
  }
  
  return pages;
}

/**
 * Validate links in a markdown file
 * @param {string} content
 * @param {string} filePath
 * @param {Set<string>} pageIndex
 * @returns {ValidationIssue[]}
 */
export function validateLinks(content, filePath, pageIndex) {
  const issues = [];
  
  // Wiki links [[Page]] or [[Label|Page]]
  const wikiLinkRegex = /\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g;
  let match;
  
  while ((match = wikiLinkRegex.exec(content)) !== null) {
    const linkTarget = match[1].trim();
    
    // Normalize the link target
    const normalizedTarget = linkTarget.replace(/\s+/g, '-');
    
    if (!pageIndex.has(linkTarget) && !pageIndex.has(normalizedTarget)) {
      issues.push({
        type: 'broken-link',
        severity: 'warning',
        file: filePath,
        message: `Wiki link to non-existent page: [[${linkTarget}]]`,
        context: match[0]
      });
    }
  }
  
  // Standard markdown links
  const mdLinkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
  
  while ((match = mdLinkRegex.exec(content)) !== null) {
    const linkUrl = match[2];
    
    // Skip external links and anchors
    if (linkUrl.startsWith('http') || linkUrl.startsWith('#') || linkUrl.startsWith('mailto:')) {
      continue;
    }
    
    // Check relative file links
    if (linkUrl.endsWith('.md')) {
      const linkedFile = join(dirname(filePath), linkUrl);
      if (!existsSync(linkedFile)) {
        issues.push({
          type: 'broken-link',
          severity: 'warning',
          file: filePath,
          message: `Link to non-existent file: ${linkUrl}`,
          context: match[0]
        });
      }
    }
  }
  
  return issues;
}

/**
 * Validate markdown content for quality issues
 * @param {string} content
 * @param {string} filePath
 * @returns {ValidationIssue[]}
 */
export function validateMarkdownQuality(content, filePath) {
  const issues = [];
  const lines = content.split('\n');
  
  // Check for missing title (H1 at top)
  if (!content.match(/^#\s+.+$/m)) {
    issues.push({
      type: 'missing-title',
      severity: 'error',
      file: filePath,
      message: 'Page missing H1 title'
    });
  }
  
  // Check for empty content
  const body = content.replace(/^---\s*\n[\s\S]*?\n---\s*\n/, ''); // Remove frontmatter
  const wordCount = body.split(/\s+/).filter(w => w.length > 0).length;
  
  if (wordCount < 20) {
    issues.push({
      type: 'empty-content',
      severity: 'warning',
      file: filePath,
      message: `Page has very little content (${wordCount} words)`
    });
  }
  
  // Check for long lines
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.length > 200) {
      issues.push({
        type: 'long-line',
        severity: 'info',
        file: filePath,
        line: i + 1,
        message: `Line exceeds 200 characters (${line.length})`,
        context: line.slice(0, 80) + '...'
      });
    }
  }
  
  // Check for TODO/FIXME
  const todoRegex = /\b(TODO|FIXME|XXX|HACK)\b/gi;
  let todoMatch;
  
  while ((todoMatch = todoRegex.exec(content)) !== null) {
    const lineNum = content.slice(0, todoMatch.index).split('\n').length;
    
    issues.push({
      type: 'todo-marker',
      severity: 'info',
      file: filePath,
      line: lineNum,
      message: `Found ${todoMatch[0]} marker`,
      context: lines[lineNum - 1]?.slice(0, 80)
    });
  }
  
  // Check for broken Mermaid syntax
  const mermaidBlocks = content.match(/```mermaid\n[\s\S]*?```/g) || [];
  
  for (const block of mermaidBlocks) {
    const inner = block.replace(/```mermaid\n/, '').replace(/```$/, '');
    
    // Basic syntax checks
    if (!inner.match(/\w+\s*\{/)) {
      issues.push({
        type: 'mermaid-error',
        severity: 'warning',
        file: filePath,
        message: 'Mermaid block may have invalid syntax'
      });
    }
  }
  
  // Check for duplicate headings
  const headings = {};
  const headingRegex = /^(#{1,6})\s+(.+)$/gm;
  let headingMatch;
  
  while ((headingMatch = headingRegex.exec(content)) !== null) {
    const level = headingMatch[1].length;
    const text = headingMatch[2].trim().toLowerCase();
    const lineNum = content.slice(0, headingMatch.index).split('\n').length;
    
    const key = `${level}:${text}`;
    if (headings[key]) {
      issues.push({
        type: 'duplicate-heading',
        severity: 'warning',
        file: filePath,
        line: lineNum,
        message: `Duplicate heading (level ${level}): "${headingMatch[2]}"`,
        context: `First occurrence at line ${headings[key]}`
      });
    } else {
      headings[key] = lineNum;
    }
  }
  
  return issues;
}

/**
 * Validate entire wiki directory
 * @param {string} wikiDir
 * @returns {ValidationIssue[]}
 */
export function validateWiki(wikiDir) {
  const issues = [];
  const pageIndex = buildPageIndex(wikiDir);
  
  function scanDir(dir) {
    try {
      const entries = readdirSync(dir);
      
      for (const entry of entries) {
        if (entry.startsWith('.')) continue;
        
        const fullPath = join(dir, entry);
        const stat = statSync(fullPath);
        
        if (stat.isDirectory()) {
          scanDir(fullPath);
        } else if (stat.isFile() && entry.endsWith('.md')) {
          try {
            const content = readFileSync(fullPath, 'utf8');
            
            // Validate links
            issues.push(...validateLinks(content, fullPath, pageIndex));
            
            // Validate quality
            issues.push(...validateMarkdownQuality(content, fullPath));
          } catch {}
        }
      }
    } catch {}
  }
  
  if (existsSync(wikiDir)) {
    scanDir(wikiDir);
  }
  
  return issues;
}

/**
 * Print validation report
 * @param {ValidationIssue[]} issues
 * @returns {string}
 */
export function formatValidationReport(issues) {
  if (issues.length === 0) {
    return '✅ No validation issues found';
  }
  
  const bySeverity = {
    error: issues.filter(i => i.severity === 'error'),
    warning: issues.filter(i => i.severity === 'warning'),
    info: issues.filter(i => i.severity === 'info')
  };
  
  let report = '## Validation Report\n\n';
  report += `| Severity | Count |\n`;
  report += `|----------|-------|\n`;
  report += `| 🔴 Error | ${bySeverity.error.length} |\n`;
  report += `| 🟡 Warning | ${bySeverity.warning.length} |\n`;
  report += `| 🔵 Info | ${bySeverity.info.length} |\n\n`;
  
  if (bySeverity.error.length > 0) {
    report += '### Errors\n\n';
    for (const issue of bySeverity.error) {
      report += `- **${issue.file}**${issue.line ? `:${issue.line}` : ''}: ${issue.message}\n`;
      if (issue.context) {
        report += `  \`\`\`\n  ${issue.context}\n  \`\`\`\n`;
      }
    }
    report += '\n';
  }
  
  if (bySeverity.warning.length > 0) {
    report += '### Warnings\n\n';
    for (const issue of bySeverity.warning) {
      report += `- **${basename(issue.file)}**${issue.line ? `:${issue.line}` : ''}: ${issue.message}\n`;
    }
    report += '\n';
  }
  
  if (bySeverity.info.length > 0) {
    report += '### Info\n\n';
    for (const issue of bySeverity.info) {
      report += `- ${issue.file}: ${issue.message}\n`;
    }
  }
  
  return report;
}