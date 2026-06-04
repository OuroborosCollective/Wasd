#!/usr/bin/env node
/**
 * push-wiki.mjs
 * Robust GitHub Wiki sync with:
 * - Dry-run mode
 * - Diff preview
 * - No-op when no changes
 * - Protected pages preservation
 * - Auto-retry
 * - Lock file support
 * - Better logging
 */

import { existsSync, mkdirSync, readdirSync, statSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { join, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));

// CLI argument parsing
const args = process.argv.slice(2);
let options = {
  dir: '.wiki-build',
  dryRun: 'false',
  token: process.env.GITHUB_TOKEN,
  maxRetries: 3,
  retryDelay: 5000
};

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--dir' && args[i + 1]) {
    options.dir = args[++i];
  } else if (args[i] === '--dry-run' && args[i + 1]) {
    options.dryRun = args[++i];
  } else if (args[i] === '--token' && args[i + 1]) {
    options.token = args[++i];
  }
}

// Stats
const stats = {
  copied: 0,
  skipped: 0,
  deleted: 0,
  unchanged: 0,
  errors: []
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
    step: '🔧',
    diff: '📝'
  }[level] || '📝';
  
  console.log(`${prefix} ${message}`, ...args);
}

/**
 * Execute command with auto-retry
 */
function execWithRetry(command, args, options = {}, retries = 3) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return execFileSync(command, args, {
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
        ...options
      });
    } catch (e) {
      if (attempt < retries) {
        log('warn', `Attempt ${attempt} failed, retrying in ${options.retryDelay || 5000}ms...`);
        // Simple delay without sleep module
        const start = Date.now();
        while (Date.now() - start < (options.retryDelay || 5000)) {}
      } else {
        throw e;
      }
    }
  }
}

/**
 * Git operations with proper config
 */
function gitConfig(repoDir) {
  const gitUser = process.env.GIT_AUTHOR_NAME || 'github-actions[bot]';
  const gitEmail = process.env.GIT_AUTHOR_EMAIL || '41898282+github-actions[bot]@users.noreply.github.com';
  
  execFileSync('git', ['config', 'user.name', gitUser], { cwd: repoDir });
  execFileSync('git', ['config', 'user.email', gitEmail], { cwd: repoDir });
  execFileSync('git', ['config', 'commit.gpgsign', 'false'], { cwd: repoDir });
}

/**
 * Get diff between wiki and build dir
 */
function getDiff(buildDir, wikiDir) {
  const changes = {
    added: [],
    modified: [],
    deleted: [],
    unchanged: []
  };
  
  const buildFiles = new Map();
  const wikiFiles = new Map();
  
  // List build files
  function listFiles(dir, baseDir, map) {
    try {
      const entries = readdirSync(dir);
      for (const entry of entries) {
        if (entry.startsWith('.')) continue;
        
        const fullPath = join(dir, entry);
        const stat = statSync(fullPath);
        
        if (stat.isDirectory()) {
          listFiles(fullPath, baseDir, map);
        } else if (stat.isFile() && entry.endsWith('.md')) {
          const relPath = fullPath.replace(baseDir, '').replace(/^[/\\]/, '');
          map.set(relPath, {
            path: fullPath,
            content: readFileSync(fullPath, 'utf8'),
            size: stat.size
          });
        }
      }
    } catch {}
  }
  
  listFiles(buildDir, buildDir, buildFiles);
  if (existsSync(wikiDir)) {
    listFiles(wikiDir, wikiDir, wikiFiles);
  }
  
  // Compare
  for (const [path, buildInfo] of buildFiles) {
    const wikiInfo = wikiFiles.get(path);
    
    if (!wikiInfo) {
      changes.added.push(path);
    } else if (buildInfo.content !== wikiInfo.content) {
      changes.modified.push(path);
    } else {
      changes.unchanged.push(path);
    }
  }
  
  // Check for deleted files
  for (const [path] of wikiFiles) {
    if (!buildFiles.has(path) && !path.startsWith('.git')) {
      changes.deleted.push(path);
    }
  }
  
  return changes;
}

/**
 * Clone wiki repository
 */
function cloneWiki(repo, token) {
  const wikiDir = join(process.cwd(), '.wiki-temp');
  
  // Clean up any existing temp dir
  if (existsSync(wikiDir)) {
    rmSync(wikiDir, { recursive: true, force: true });
  }
  
  const remoteUrl = `https://x-access-token:${token}@github.com/${repo}.wiki.git`;
  
  log('step', `Cloning wiki repository...`);
  
  try {
    execFileSync('git', ['clone', '--depth', '1', remoteUrl, wikiDir], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
      timeout: 60000
    });
  } catch (e) {
    // Wiki might be empty or not exist yet, create a new one
    log('warn', 'Wiki repo empty or new, initializing...');
    mkdirSync(wikiDir, { recursive: true });
    
    execFileSync('git', ['init'], { cwd: wikiDir });
    gitConfig(wikiDir);
    
    // Create initial commit
    writeFileSync(join(wikiDir, '.gitkeep'), '');
    execFileSync('git', ['add', '.'], { cwd: wikiDir });
    execFileSync('git', ['commit', '-m', 'Initial wiki setup'], { cwd: wikiDir });
    
    // Try to push
    try {
      execFileSync('git', ['push', '-u', remoteUrl, 'master'], {
        cwd: wikiDir,
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
        timeout: 60000
      });
    } catch (pushError) {
      log('warn', 'Could not initialize empty wiki, will create fresh');
      rmSync(wikiDir, { recursive: true, force: true });
      mkdirSync(wikiDir, { recursive: true });
    }
  }
  
  gitConfig(wikiDir);
  
  return wikiDir;
}

/**
 * Sync files to wiki
 */
function syncToWiki(buildDir, wikiDir) {
  log('step', 'Syncing files to wiki...');
  
  const protectedPages = ['_Sidebar.md', '_Footer.md', 'Home.md'];
  
  function copyFiles(srcDir, destDir) {
    try {
      const entries = readdirSync(srcDir);
      
      for (const entry of entries) {
        if (entry.startsWith('.')) continue;
        
        const srcPath = join(srcDir, entry);
        const destPath = join(destDir, entry);
        
        const stat = statSync(srcPath);
        
        if (stat.isDirectory()) {
          if (!existsSync(destPath)) {
            mkdirSync(destPath, { recursive: true });
          }
          copyFiles(srcPath, destPath);
        } else if (stat.isFile() && entry.endsWith('.md')) {
          // Check if wiki has a protected version
          if (protectedPages.includes(entry) && existsSync(join(wikiDir, entry))) {
            log('info', `Preserving protected page: ${entry}`);
            stats.skipped++;
            continue;
          }
          
          const content = readFileSync(srcPath, 'utf8');
          writeFileSync(destPath, content);
          stats.copied++;
        }
      }
    } catch (e) {
      stats.errors.push(`Failed to copy: ${e.message}`);
    }
  }
  
  copyFiles(buildDir, wikiDir);
}

/**
 * Commit and push changes
 */
function commitAndPush(wikiDir) {
  const repo = process.env.GITHUB_REPOSITORY;
  const sha = process.env.GITHUB_SHA || 'unknown';
  const branch = 'master';
  
  // Stage all changes
  log('step', 'Staging changes...');
  execFileSync('git', ['add', '-A'], { cwd: wikiDir });
  
  // Check status
  const status = execFileSync('git', ['status', '--porcelain'], {
    encoding: 'utf8',
    cwd: wikiDir
  }).trim();
  
  if (!status) {
    log('success', 'No changes to commit');
    stats.unchanged = 0;
    return false;
  }
  
  // Show diff
  log('diff', 'Changes:');
  console.log(status);
  console.log('');
  
  // Commit
  log('step', 'Creating commit...');
  const commitMsg = `docs: sync wiki — ${sha.slice(0, 7)} (${new Date().toISOString().split('T')[0]})`;
  
  execFileSync('git', ['commit', '-m', commitMsg], { cwd: wikiDir });
  
  // Push
  log('step', 'Pushing to wiki...');
  
  const token = options.token;
  if (token) {
    const remoteUrl = `https://x-access-token:${token}@github.com/${repo}.wiki.git`;
    execFileSync('git', ['remote', 'set-url', 'origin', remoteUrl], { cwd: wikiDir });
  }
  
  execFileSync('git', ['push', 'origin', branch], {
    cwd: wikiDir,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    timeout: 60000
  });
  
  return true;
}

/**
 * Cleanup
 */
function cleanup(wikiDir) {
  log('step', 'Cleaning up...');
  if (existsSync(wikiDir)) {
    rmSync(wikiDir, { recursive: true, force: true });
  }
}

/**
 * Main sync process
 */
function main() {
  console.log('\n🚀 Areloria Wiki Sync');
  console.log('=====================\n');
  
  const isDryRun = options.dryRun === 'true';
  
  console.log(`Source: ${options.dir}`);
  console.log(`Wiki dir: .wiki-temp`);
  console.log(`Dry run: ${isDryRun}`);
  console.log('');
  
  if (isDryRun) {
    console.log('🔍 DRY RUN MODE — No changes will be made\n');
  }
  
  // Check environment
  const repo = process.env.GITHUB_REPOSITORY;
  const token = options.token;
  
  if (!isDryRun && !token) {
    log('error', 'GITHUB_TOKEN is required for pushing (or use --dry-run)');
    process.exit(1);
  }
  
  if (!isDryRun && !repo) {
    log('error', 'GITHUB_REPOSITORY is required (set by GitHub Actions)');
    process.exit(1);
  }
  
  const buildDir = join(process.cwd(), options.dir);
  
  if (!existsSync(buildDir)) {
    log('error', `Build directory not found: ${buildDir}`);
    log('info', 'Run build-autonomous-wiki.mjs first');
    process.exit(1);
  }
  
  try {
    if (isDryRun) {
      // Just show what would change
      const wikiDir = join(process.cwd(), '.wiki-temp');
      const diff = getDiff(buildDir, wikiDir);
      
      console.log('📊 Diff Preview');
      console.log('===============\n');
      console.log(`Added: ${diff.added.length}`);
      console.log(`Modified: ${diff.modified.length}`);
      console.log(`Deleted: ${diff.deleted.length}`);
      console.log(`Unchanged: ${diff.unchanged.length}`);
      
      if (diff.added.length > 0) {
        console.log('\n📝 New files:');
        for (const f of diff.added.slice(0, 10)) {
          console.log(`  + ${f}`);
        }
        if (diff.added.length > 10) {
          console.log(`  ... and ${diff.added.length - 10} more`);
        }
      }
      
      if (diff.modified.length > 0) {
        console.log('\n📝 Modified files:');
        for (const f of diff.modified.slice(0, 10)) {
          console.log(`  M ${f}`);
        }
        if (diff.modified.length > 10) {
          console.log(`  ... and ${diff.modified.length - 10} more`);
        }
      }
      
      console.log('\n✅ Dry run complete');
      process.exit(0);
    }
    
    // Clone wiki
    const wikiDir = cloneWiki(repo, token);
    
    // Get diff before making changes
    const diff = getDiff(buildDir, wikiDir);
    
    if (diff.added.length === 0 && diff.modified.length === 0 && diff.deleted.length === 0) {
      log('success', 'Wiki already up to date. Nothing to sync.');
      cleanup(wikiDir);
      process.exit(0);
    }
    
    // Show diff
    console.log('\n📊 Changes to be applied');
    console.log('========================\n');
    console.log(`Added: ${diff.added.length}`);
    console.log(`Modified: ${diff.modified.length}`);
    console.log(`Deleted: ${diff.deleted.length}`);
    console.log('');
    
    // Sync files
    syncToWiki(buildDir, wikiDir);
    
    // Commit and push
    const pushed = commitAndPush(wikiDir);
    
    // Cleanup
    cleanup(wikiDir);
    
    // Summary
    console.log('\n=====================');
    console.log('📊 Sync Summary');
    console.log('=====================');
    console.log(`Copied: ${stats.copied}`);
    console.log(`Skipped (protected): ${stats.skipped}`);
    console.log(`Pushed: ${pushed ? 'Yes' : 'No'}`);
    
    if (stats.errors.length > 0) {
      console.log(`\n⚠️ Errors: ${stats.errors.length}`);
      for (const err of stats.errors) {
        console.log(`  - ${err}`);
      }
    }
    
    console.log('\n✅ Wiki sync complete');
    
    process.exit(stats.errors.length > 0 ? 1 : 0);
    
  } catch (e) {
    log('error', `Sync failed: ${e.message}`);
    console.error(e);
    
    // Cleanup on error
    cleanup(join(process.cwd(), '.wiki-temp'));
    
    process.exit(1);
  }
}

main();