/**
 * generate-changelog.mjs
 * Generates automatic changelog from git commits and PRs
 */

import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';

/**
 * @typedef {Object} Commit
 * @property {string} hash
 * @property {string} message
 * @property {string} author
 * @property {string} date
 * @property {string} type - 'feat' | 'fix' | 'docs' | 'refactor' | 'test' | 'chore' | 'other'
 */

/**
 * @typedef {Object} ChangelogSection
 * @property {string} title
 * @property {Commit[]} commits
 */

/**
 * Classify commit type from message
 * @param {string} message
 * @returns {string}
 */
function classifyCommit(message) {
  const lower = message.toLowerCase();
  
  if (lower.startsWith('feat') || lower.startsWith('add')) return 'feat';
  if (lower.startsWith('fix')) return 'fix';
  if (lower.startsWith('docs') || lower.startsWith('doc')) return 'docs';
  if (lower.startsWith('refactor')) return 'refactor';
  if (lower.startsWith('test')) return 'test';
  if (lower.startsWith('chore') || lower.startsWith('ci') || lower.startsWith('build')) return 'chore';
  if (lower.startsWith('merge')) return 'merge';
  if (lower.startsWith('sync')) return 'sync';
  
  return 'other';
}

/**
 * Get conventional commit type for display
 * @param {string} type
 * @returns {string}
 */
function getTypeTitle(type) {
  const titles = {
    'feat': 'Added',
    'fix': 'Fixed',
    'docs': 'Documentation',
    'refactor': 'Changed',
    'test': 'Testing',
    'chore': 'Maintenance',
    'merge': 'Merged',
    'sync': 'Synchronized',
    'other': 'Other'
  };
  return titles[type] || 'Other';
}

/**
 * Execute git command safely
 * @param {string} command
 * @param {string[]} args
 * @returns {string}
 */
function execGit(command, args) {
  try {
    return execFileSync(command, args, {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe']
    }).trim();
  } catch {
    return '';
  }
}

/**
 * Get git commits since a reference
 * @param {string} [since='1 week ago']
 * @param {number} [limit=50]
 * @returns {Commit[]}
 */
export function getCommits(since = '1 week ago', limit = 50) {
  const output = execGit('git', [
    'log',
    `--since=${since}`,
    `--max-count=${limit}`,
    '--pretty=format:%H|%s|%an|%ad',
    '--date=short'
  ]);
  
  if (!output) return [];
  
  return output.split('\n')
    .filter(line => line.trim())
    .map(line => {
      const [hash, message, author, date] = line.split('|');
      return {
        hash: hash.trim(),
        message: message.trim(),
        author: author.trim(),
        date: date.trim(),
        type: classifyCommit(message)
      };
    });
}

/**
 * Get commits from a specific file or path
 * @param {string} path
 * @param {number} [limit=30]
 * @returns {Commit[]}
 */
export function getCommitsForPath(path, limit = 30) {
  if (!existsSync(path)) return [];
  
  const output = execGit('git', [
    'log',
    path,
    `--max-count=${limit}`,
    '--pretty=format:%H|%s|%an|%ad',
    '--date=short'
  ]);
  
  if (!output) return [];
  
  return output.split('\n')
    .filter(line => line.trim())
    .map(line => {
      const [hash, message, author, date] = line.split('|');
      return {
        hash: hash.trim(),
        message: message.trim(),
        author: author.trim(),
        date: date.trim(),
        type: classifyCommit(message)
      };
    });
}

/**
 * Group commits by type
 * @param {Commit[]} commits
 * @returns {Object}
 */
export function groupCommitsByType(commits) {
  const groups = {};
  
  for (const commit of commits) {
    const type = commit.type;
    if (!groups[type]) groups[type] = [];
    groups[type].push(commit);
  }
  
  return groups;
}

/**
 * Generate changelog content
 * @param {Object} options
 * @returns {string}
 */
export function generateChangelog(options = {}) {
  const {
    since = '1 week ago',
    limit = 50,
    projectName = 'Areloria',
    includeUnreleased = true,
    version = 'Unreleased'
  } = options;
  
  const commits = getCommits(since, limit);
  
  if (commits.length === 0) {
    return `# ${projectName} Changelog\n\nNo recent changes found.\n`;
  }
  
  // Group by date
  const byDate = {};
  for (const commit of commits) {
    if (!byDate[commit.date]) byDate[commit.date] = [];
    byDate[commit.date].push(commit);
  }
  
  const dates = Object.keys(byDate).sort().reverse();
  
  let output = `# ${projectName} Changelog\n\n`;
  output += `> Auto-generated from git history\n\n`;
  
  // Type order for display
  const typeOrder = ['feat', 'fix', 'docs', 'refactor', 'chore', 'other'];
  
  for (const date of dates) {
    output += `## ${date}\n\n`;
    
    const dayCommits = byDate[date];
    const groups = groupCommitsByType(dayCommits);
    
    for (const type of typeOrder) {
      const typeCommits = groups[type];
      if (!typeCommits || typeCommits.length === 0) continue;
      
      output += `### ${getTypeTitle(type)}\n\n`;
      
      for (const commit of typeCommits) {
        // Clean up commit message for changelog
        let msg = commit.message
          .replace(/^feat(?:\([^)]+\))?:\s*/i, '')
          .replace(/^fix(?:\([^)]+\))?:\s*/i, '')
          .replace(/^docs(?:\([^)]+\))?:\s*/i, '')
          .replace(/^refactor(?:\([^)]+\))?:\s*/i, '')
          .replace(/^chore(?:\([^)]+\))?:\s*/i, '');
        
        // Format as list item
        const shortHash = commit.hash.slice(0, 7);
        output += `- ${msg} (\`${shortHash}\`)\n`;
      }
      
      output += '\n';
    }
  }
  
  output += `---\n\n`;
  output += `**Generated:** ${new Date().toISOString()}\n`;
  output += `**Commits analyzed:** ${commits.length}\n`;
  
  return output;
}

/**
 * Generate compact changelog for wiki
 * @param {Object} options
 * @returns {string}
 */
export function generateCompactChangelog(options = {}) {
  const {
    since = '2 weeks ago',
    limit = 30,
    projectName = 'Areloria'
  } = options;
  
  const commits = getCommits(since, limit);
  
  if (commits.length === 0) {
    return `## Recent Changes\n\nNo recent changes.\n`;
  }
  
  // Take only recent unique messages
  const uniqueMessages = [];
  const seen = new Set();
  
  for (const commit of commits) {
    const key = commit.message.toLowerCase().slice(0, 50);
    if (!seen.has(key)) {
      seen.add(key);
      uniqueMessages.push(commit);
    }
  }
  
  let output = `## Recent Changes\n\n`;
  output += `*Last ${uniqueMessages.length} changes*\n\n`;
  
  for (const commit of uniqueMessages.slice(0, 15)) {
    // Clean and shorten message
    let msg = commit.message
      .replace(/^[^:]+:\s*/, '')  // Remove conventional commit prefix
      .replace(/^\[[^\]]+\]\s*/, '');  // Remove issue refs
    
    const shortHash = commit.hash.slice(0, 6);
    output += `- **${msg}** — \`${commit.date}\`\n`;
  }
  
  output += `\n---\n`;
  output += `*Full changelog auto-generated from git history*\n`;
  
  return output;
}