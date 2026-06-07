#!/usr/bin/env node
/**
 * autonomous-fix-executor.mjs
 * Executes autonomous fixes based on MiniMax AI recommendations.
 * Creates branches and PRs for identified issues.
 * 
 * Usage: node autonomous-fix-executor.mjs <minimax_response.json>
 */

import { execSync } from 'child_process';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const REPO_ROOT = join(__dirname, '..', '..');

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_REPO = process.env.GITHUB_REPOSITORY || 'OuroborosCollective/Wasd';

if (!GITHUB_TOKEN) {
  console.error('GITHUB_TOKEN environment variable is required');
  process.exit(1);
}

interface MiniMaxCommand {
  action: string;
  target: string;
  payload?: Record<string, unknown>;
  priority?: string;
  reason?: string;
}

interface MiniMaxResponse {
  ok: boolean;
  action: string;
  result: string;
  commands: MiniMaxCommand[];
  analysis?: {
    rootCause: string;
    affectedFiles: string[];
    effort: string;
    risk: string;
    confidence: number;
    similarIssues: string[];
  };
  createdAt?: number;
}

/**
 * Execute a git command in the repo
 */
function gitCommand(args: string[], cwd = REPO_ROOT): string {
  try {
    return execSync(`git ${args.join(' ')}`, { cwd, encoding: 'utf-8', maxBuffer: 10 * 1024 * 1024 });
  } catch (error: unknown) {
    const err = error as { message?: string; stderr?: string };
    throw new Error(`Git command failed: ${err.message || err.stderr || 'Unknown error'}`);
  }
}

/**
 * Create a GitHub API request
 */
async function githubApi(method: string, endpoint: string, data?: unknown): Promise<unknown> {
  const url = `https://api.github.com${endpoint}`;
  const response = await fetch(url, {
    method,
    headers: {
      'Authorization': `Bearer ${GITHUB_TOKEN}`,
      'Accept': 'application/vnd.github.v3+json',
      'Content-Type': 'application/json',
      'X-GitHub-Api-Version': '2022-11-28'
    },
    body: data ? JSON.stringify(data) : undefined
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`GitHub API error: ${response.status} - ${errorText}`);
  }

  return response.json();
}

/**
 * Create a branch name from issue description
 */
function createBranchName(subsystem: string, issue: string): string {
  const sanitized = issue
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .slice(0, 50);
  
  const timestamp = Date.now().toString(36).slice(-8);
  return `autonomous/${subsystem}/${sanitized}-${timestamp}`;
}

/**
 * Create a fix file with the provided content
 */
function createFixFile(targetPath: string, content: string): void {
  const fullPath = join(REPO_ROOT, targetPath);
  const dir = dirname(fullPath);
  
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  
  writeFileSync(fullPath, content, 'utf-8');
  console.log(`Created/Updated: ${targetPath}`);
}

/**
 * Execute autonomous fix based on MiniMax response
 */
async function executeFix(response: MiniMaxResponse): Promise<void> {
  console.log('\n=== Autonomous Fix Executor ===');
  console.log(`OK: ${response.ok}`);
  console.log(`Action: ${response.action}`);
  console.log(`Result: ${response.result.slice(0, 200)}...`);
  
  if (response.analysis) {
    console.log('\n--- Analysis ---');
    console.log(`Root Cause: ${response.analysis.rootCause}`);
    console.log(`Affected Files: ${response.analysis.affectedFiles.join(', ')}`);
    console.log(`Effort: ${response.analysis.effort}, Risk: ${response.analysis.risk}`);
    console.log(`Confidence: ${(response.analysis.confidence * 100).toFixed(0)}%`);
  }
  
  if (!response.ok || !response.commands || response.commands.length === 0) {
    console.log('\nNo actionable commands found. Skipping fix.');
    return;
  }
  
  console.log(`\nFound ${response.commands.length} command(s) to execute.`);
  
  // First, ensure we're on main and have latest
  console.log('\nPreparing repository...');
  gitCommand(['checkout', 'main']);
  gitCommand(['pull', 'origin', 'main']);
  
  const createdBranches = [];
  
  for (const cmd of response.commands) {
    console.log(`\nExecuting: ${cmd.action} on ${cmd.target}`);
    
    if (cmd.action === 'create_pr' || cmd.action === 'fix_bug') {
      const branchName = createBranchName(cmd.target, response.result);
      
      try {
        // Create new branch
        gitCommand(['checkout', '-b', branchName]);
        createdBranches.push(branchName);
        
        // Apply fixes from payload
        if (cmd.payload && cmd.payload.fixes) {
          const fixes = cmd.payload.fixes as Array<{ path: string; content: string }>;
          
          for (const fix of fixes) {
            if (fix.path && fix.content) {
              createFixFile(fix.path, fix.content);
            }
          }
          
          // Stage and commit
          gitCommand(['add', '.']);
          const commitMessage = `fix(${cmd.target}): autonomous fix\n\nReason: ${cmd.reason || 'MiniMax autonomous fix'}\n\nRoot cause: ${response.analysis?.rootCause || 'N/A'}\nAffected files: ${response.analysis?.affectedFiles?.join(', ') || 'N/A'}`;
          
          try {
            gitCommand(['commit', '-m', commitMessage]);
          } catch {
            console.log('Nothing to commit (no changes)');
            gitCommand(['checkout', 'main']);
            continue;
          }
          
          // Push branch
          gitCommand(['push', '-u', 'origin', branchName]);
          
          // Create PR
          const prTitle = `fix(${cmd.target}): ${response.result.slice(0, 80)}`;
          const prBody = `## Autonomous Fix by MiniMax-M2.7

**Priority:** ${cmd.priority || 'medium'}

**Reason:** ${cmd.reason || 'Automatic fix from MiniMax AI analysis'}

### Root Cause
${response.analysis?.rootCause || 'Analyzed by MiniMax AI'}

### Changes Made
${cmd.payload?.fixes?.map((f: { path: string }) => `- ${f.path}`).join('\n') || 'Code fixes applied'}

### Risk Assessment
- Effort: ${response.analysis?.effort || 'unknown'}
- Risk: ${response.analysis?.risk || 'unknown'}
- Confidence: ${((response.analysis?.confidence || 0.7) * 100).toFixed(0)}%

---

*This PR was created autonomously by MiniMax-M2.7 AI agent.*`;

          await githubApi('POST', `/repos/${GITHUB_REPO}/pulls`, {
            title: prTitle,
            body: prBody,
            head: branchName,
            base: 'main'
          });
          
          console.log(`✓ PR created: https://github.com/${GITHUB_REPO}/pull/new/${branchName}`);
        }
        
        // Return to main
        gitCommand(['checkout', 'main']);
        
      } catch (error: unknown) {
        const err = error as Error;
        console.error(`Error executing command: ${err.message}`);
        // Try to return to clean state
        try {
          gitCommand(['checkout', 'main']);
        } catch {
          // Ignore checkout errors
        }
      }
    } else if (cmd.action === 'create_issue') {
      // Create GitHub issue
      const issueTitle = `[${cmd.priority || 'medium'}] ${cmd.target}: ${response.result.slice(0, 100)}`;
      const issueBody = `## Issue Reported by MiniMax-M2.7

**Subsystem:** ${cmd.target}
**Priority:** ${cmd.priority || 'medium'}

### Root Cause
${response.analysis?.rootCause || 'Under investigation'}

### Suggested Fix
${cmd.reason || 'No suggestion provided'}

### Affected Files
${response.analysis?.affectedFiles?.map(f => `- ${f}`).join('\n') || 'Unknown'}

### Similar Issues
${response.analysis?.similarIssues?.map(s => `- ${s}`).join('\n') || 'None reported'}

---

*Issue created by MiniMax-M2.7 Autonomous Agent*`;

      await githubApi('POST', `/repos/${GITHUB_REPO}/issues`, {
        title: issueTitle,
        body: issueBody,
        labels: ['autonomous', 'ai-generated']
      });
      
      console.log(`✓ Issue created for: ${cmd.target}`);
    } else {
      console.log(`Unknown action: ${cmd.action}`);
    }
  }
  
  console.log('\n=== Fix Execution Complete ===');
}

// Main execution
async function main() {
  const args = process.argv.slice(2);
  
  let response: MiniMaxResponse;
  
  if (args.length > 0 && existsSync(args[0])) {
    // Read from file
    const content = readFileSync(args[0], 'utf-8');
    response = JSON.parse(content);
  } else {
    // Read from stdin
    let input = '';
    process.stdin.on('data', chunk => input += chunk);
    await new Promise(resolve => process.stdin.on('end', resolve));
    response = JSON.parse(input);
  }
  
  await executeFix(response);
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});