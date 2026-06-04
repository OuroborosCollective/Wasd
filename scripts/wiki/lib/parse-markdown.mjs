/**
 * parse-markdown.mjs
 * Markdown parser and content analyzer for wiki generation
 */

import { extractFrontmatter, extractTitle, extractHeadings, extractLinks } from './scan-files.mjs';

/**
 * @typedef {Object} ParsedPage
 * @property {string} path
 * @property {string} name
 * @property {string} title
 * @property {Object} frontmatter
 * @property {string} body
 * @property {Array<{level: number, text: string}>} headings
 * @property {string[]} links
 * @property {string[]} images
 * @property {string[]} codeBlocks
 * @property {string[]} tables
 * @property {number} wordCount
 * @property {string} category
 */

/**
 * Parse a markdown file into structured data
 * @param {string} content
 * @param {string} filePath
 * @param {string} category
 * @returns {ParsedPage}
 */
export function parseMarkdown(content, filePath, category = 'other') {
  const { frontmatter, body } = extractFrontmatter(content);
  const title = frontmatter?.title || extractTitle(body) || filePath.split('/').pop();
  const headings = extractHeadings(body);
  const links = extractLinks(body);
  
  // Extract images
  const images = [];
  const imgRegex = /!\[([^\]]*)\]\(([^)]+)\)/g;
  let match;
  while ((match = imgRegex.exec(body)) !== null) {
    images.push(match[2]);
  }
  
  // Extract code blocks
  const codeBlocks = [];
  const codeRegex = /```[\w]*\n([\s\S]*?)```/g;
  while ((match = codeRegex.exec(body)) !== null) {
    codeBlocks.push(match[1].trim());
  }
  
  // Extract tables
  const tables = [];
  const tableRegex = /\|.+\|\n\|[-:\s|]+\|\n([|].+\n)+/g;
  while ((match = tableRegex.exec(body)) !== null) {
    tables.push(match[0]);
  }
  
  // Word count
  const wordCount = body.split(/\s+/).filter(w => w.length > 0).length;
  
  const name = filePath.split('/').pop()?.replace(/\.md$/, '') || 'Untitled';
  
  return {
    path: filePath,
    name,
    title,
    frontmatter: frontmatter || {},
    body,
    headings,
    links,
    images,
    codeBlocks,
    tables,
    wordCount,
    category
  };
}

/**
 * Analyze markdown content for quality issues
 * @param {ParsedPage} page
 * @returns {Object[]}
 */
export function analyzeMarkdown(page) {
  const issues = [];
  
  // Check for empty content
  if (page.wordCount < 10) {
    issues.push({
      type: 'empty',
      severity: 'warning',
      message: 'Page appears to have minimal content'
    });
  }
  
  // Check for missing title
  if (!page.title || page.title === 'Untitled') {
    issues.push({
      type: 'missing-title',
      severity: 'error',
      message: 'Page is missing a proper title'
    });
  }
  
  // Check for long lines
  const longLines = page.body.split('\n').filter(line => line.length > 120);
  if (longLines.length > 10) {
    issues.push({
      type: 'long-lines',
      severity: 'warning',
      message: `Found ${longLines.length} lines over 120 characters`
    });
  }
  
  // Check for TODO/FIXME
  const todoMatches = page.body.match(/TODO:|FIXME:|XXX:|HACK:/g);
  if (todoMatches) {
    issues.push({
      type: 'todo',
      severity: 'info',
      message: `Found ${todoMatches.length} TODO/FIXME markers`
    });
  }
  
  // Check for broken wiki links
  const brokenLinks = page.links.filter(link => 
    link.startsWith('[[') && !link.endsWith(']]')
  );
  if (brokenLinks.length > 0) {
    issues.push({
      type: 'broken-links',
      severity: 'error',
      message: `Found ${brokenLinks.length} potentially broken wiki links`
    });
  }
  
  // Check for Mermaid diagrams
  const hasMermaid = page.body.includes('```mermaid');
  if (hasMermaid) {
    issues.push({
      type: 'mermaid',
      severity: 'info',
      message: 'Page contains Mermaid diagrams'
    });
  }
  
  return issues;
}

/**
 * Extract a summary from markdown content
 * @param {string} content
 * @param {number} [maxLength=200]
 * @returns {string}
 */
export function extractSummary(content, maxLength = 200) {
  // Remove frontmatter
  const { body } = extractFrontmatter(content);
  
  // Remove markdown formatting
  let text = body
    .replace(/```[\s\S]*?```/g, '') // Remove code blocks
    .replace(/`[^`]+`/g, '') // Remove inline code
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Convert links to text
    .replace(/!\[[^\]]*\]\([^)]+\)/g, '') // Remove images
    .replace(/#{1,6}\s+/g, '') // Remove headings
    .replace(/[*_~]+/g, '') // Remove emphasis
    .replace(/^\s*[-*+]\s+/gm, '') // Remove list markers
    .replace(/^\s*\d+\.\s+/gm, '') // Remove numbered list markers
    .replace(/\n+/g, ' ') // Collapse newlines
    .replace(/\s+/g, ' ') // Collapse whitespace
    .trim();
  
  if (text.length > maxLength) {
    text = text.slice(0, maxLength - 3) + '...';
  }
  
  return text;
}

/**
 * Convert a JSON data file to a markdown table
 * @param {Object[]} items
 * @param {string[]} columns
 * @param {string} [title]
 * @returns {string}
 */
export function jsonToMarkdownTable(items, columns, title) {
  let output = '';
  
  if (title) {
    output += `### ${title}\n\n`;
  }
  
  // Header row
  output += '| ' + columns.join(' | ') + ' |\n';
  output += '| ' + columns.map(() => '---').join(' | ') + ' |\n';
  
  // Data rows
  for (const item of items) {
    const row = columns.map(col => {
      const value = item[col];
      return value !== undefined ? String(value) : '';
    });
    output += '| ' + row.join(' | ') + ' |\n';
  }
  
  return output;
}

/**
 * Generate a status badge
 * @param {string} status - 'implemented' | 'prototype' | 'research' | 'planned'
 * @returns {string}
 */
export function getStatusBadge(status) {
  const badges = {
    'implemented': '![Status](https://img.shields.io/badge/status-implemented-brightgreen)',
    'prototype': '![Status](https://img.shields.io/badge/status-prototype-yellow)',
    'research': '![Status](https://img.shields.io/badge/status-research-blue)',
    'planned': '![Status](https://img.shields.io/badge/status-planned-orange)'
  };
  return badges[status] || '';
}

/**
 * Group files by category
 * @param {Array<{category: string, [key: string]: any}>} files
 * @returns {Object}
 */
export function groupByCategory(files) {
  return files.reduce((acc, file) => {
    const cat = file.category || 'other';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(file);
    return acc;
  }, {});
}