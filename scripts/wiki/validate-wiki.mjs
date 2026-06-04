#!/usr/bin/env node
/**
 * validate-wiki.mjs
 * Wiki content validator
 * 
 * Checks:
 * - Broken links
 * - Missing titles
 * - Empty content
 * - Long lines
 * - TODO/FIXME markers
 * - Mermaid syntax
 * - Duplicate headings
 */

import { existsSync, readdirSync, statSync, readFileSync } from 'node:fs';
import { join, extname, basename, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { validateWiki, formatValidationReport, buildPageIndex } from './lib/validate-links.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));

// CLI argument parsing
const args = process.argv.slice(2);
let options = {
  dir: '.wiki-build',
  failOnError: true,
  verbose: false
};

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--dir' && args[i + 1]) {
    options.dir = args[++i];
  } else if (args[i] === '--no-fail') {
    options.failOnError = false;
  } else if (args[i] === '--verbose' || args[i] === '-v') {
    options.verbose = true;
  }
}

// Stats
const stats = {
  files: 0,
  checked: 0,
  errors: 0,
  warnings: 0,
  info: 0,
  issues: []
};

/**
 * Logger
 */
function log(level, message, ...args) {
  const prefix = {
    info: 'ℹ️',
    warn: '⚠️',
    error: '🔴',
    success: '✅',
    step: '🔧'
  }[level] || '📝';
  
  if (level === 'info' && !options.verbose) return;
  
  console.log(`${prefix} ${message}`, ...args);
}

/**
 * Validate a single markdown file
 */
function validateFile(filePath, pageIndex) {
  try {
    const content = readFileSync(filePath, 'utf8');
    const relativePath = filePath.replace(process.cwd() + '/', '');
    
    log('info', `Checking: ${relativePath}`);
    stats.checked++;
    
    const issues = [];
    
    // 1. Check for H1 title
    if (!content.match(/^#\s+.+$/m)) {
      issues.push({
        type: 'missing-title',
        severity: 'error',
        file: relativePath,
        message: 'Page missing H1 title'
      });
    }
    
    // 2. Check for empty content
    const body = content.replace(/^---\s*\n[\s\S]*?\n---\s*\n/, '');
    const wordCount = body.split(/\s+/).filter(w => w.length > 0).length;
    
    if (wordCount < 20) {
      issues.push({
        type: 'empty-content',
        severity: 'warning',
        file: relativePath,
        message: `Very short content (${wordCount} words)`
      });
    }
    
    // 3. Check for long lines
    const lines = content.split('\n');
    let longLineCount = 0;
    
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].length > 200) {
        longLineCount++;
      }
    }
    
    if (longLineCount > 5) {
      issues.push({
        type: 'long-lines',
        severity: 'info',
        file: relativePath,
        message: `${longLineCount} lines over 200 characters`
      });
    }
    
    // 4. Check for wiki links
    const wikiLinkRegex = /\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g;
    let match;
    
    while ((match = wikiLinkRegex.exec(content)) !== null) {
      const linkTarget = match[1].trim();
      const normalizedTarget = linkTarget.replace(/\s+/g, '-');
      
      if (!pageIndex.has(linkTarget) && !pageIndex.has(normalizedTarget)) {
        issues.push({
          type: 'broken-link',
          severity: 'warning',
          file: relativePath,
          message: `Wiki link to non-existent page: [[${linkTarget}]]`
        });
      }
    }
    
    // 5. Check for TODO/FIXME
    const todoMatches = content.match(/\b(TODO|FIXME|XXX|HACK)\b/gi);
    if (todoMatches) {
      issues.push({
        type: 'todo-marker',
        severity: 'info',
        file: relativePath,
        message: `${todoMatches.length} TODO/FIXME marker(s) found`
      });
    }
    
    // 6. Check for Mermaid blocks
    const mermaidMatch = content.match(/```mermaid\n[\s\S]*?```/);
    if (mermaidMatch) {
      const inner = mermaidMatch[0].replace(/```mermaid\n/, '').replace(/```$/, '');
      
      // Basic syntax validation
      if (!inner.match(/\w+\s*[\[{]/)) {
        issues.push({
          type: 'mermaid-error',
          severity: 'warning',
          file: relativePath,
          message: 'Mermaid block may have invalid syntax'
        });
      }
    }
    
    // 7. Check for duplicate headings
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
          file: relativePath,
          line: lineNum,
          message: `Duplicate heading: "${headingMatch[2]}"`
        });
      } else {
        headings[key] = lineNum;
      }
    }
    
    // Count issues by severity
    for (const issue of issues) {
      if (issue.severity === 'error') stats.errors++;
      else if (issue.severity === 'warning') stats.warnings++;
      else stats.info++;
      
      stats.issues.push(issue);
    }
    
  } catch (e) {
    stats.errors++;
    stats.issues.push({
      type: 'read-error',
      severity: 'error',
      file: filePath,
      message: `Failed to read file: ${e.message}`
    });
  }
}

/**
 * Scan directory for markdown files
 */
function scanDirectory(dir) {
  const files = [];
  
  try {
    const entries = readdirSync(dir);
    
    for (const entry of entries) {
      if (entry.startsWith('.')) continue;
      
      const fullPath = join(dir, entry);
      const stat = statSync(fullPath);
      
      if (stat.isDirectory()) {
        files.push(...scanDirectory(fullPath));
      } else if (stat.isFile() && entry.endsWith('.md')) {
        files.push(fullPath);
      }
    }
  } catch {}
  
  return files;
}

/**
 * Main validation process
 */
function main() {
  console.log('\n🔍 Areloria Wiki Validator');
  console.log('==========================\n');
  console.log(`Directory: ${options.dir}`);
  console.log(`Fail on error: ${options.failOnError}`);
  console.log('');
  
  // Resolve path
  const dirPath = join(process.cwd(), options.dir);
  
  if (!existsSync(dirPath)) {
    console.error(`🔴 Directory not found: ${dirPath}`);
    process.exit(1);
  }
  
  // Build page index
  log('step', 'Building page index...');
  const pageIndex = buildPageIndex(dirPath);
  log('success', `Indexed ${pageIndex.size} pages`);
  console.log('');
  
  // Scan for files
  log('step', 'Scanning for markdown files...');
  const files = scanDirectory(dirPath);
  stats.files = files.length;
  log('info', `Found ${files.length} markdown files`);
  console.log('');
  
  // Validate each file
  log('step', 'Validating content...\n');
  
  for (const file of files) {
    validateFile(file, pageIndex);
  }
  
  // Summary
  console.log('\n==========================');
  console.log('📊 Validation Summary');
  console.log('==========================');
  console.log(`Files checked: ${stats.checked}`);
  console.log(`🔴 Errors: ${stats.errors}`);
  console.log(`⚠️ Warnings: ${stats.warnings}`);
  console.log(`ℹ️ Info: ${stats.info}`);
  
  // Print detailed report if there are issues
  if (stats.issues.length > 0) {
    console.log('\n');
    console.log(formatValidationReport(stats.issues));
  }
  
  // Exit code
  if (stats.errors > 0 && options.failOnError) {
    console.log('\n🔴 Validation failed with errors');
    process.exit(1);
  }
  
  if (stats.warnings > 0) {
    console.log('\n⚠️ Validation passed with warnings');
  } else {
    console.log('\n✅ Validation passed');
  }
  
  process.exit(0);
}

main();