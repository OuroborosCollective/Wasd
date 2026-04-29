import { execSync } from 'node:child_process';

/**
 * Executes a shell command and returns the output as a string.
 * @param {string} command 
 * @returns {string}
 */
function execute(command) {
  try {
    return execSync(command, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] }).trim();
  } catch (error) {
    return '';
  }
}

/**
 * Checks if a specific file has uncommitted changes.
 * @param {string} filePath 
 * @returns {boolean}
 */
function hasChanges(filePath) {
  const status = execute(`git status --porcelain ${filePath}`);
  return status.length > 0;
}

/**
 * Orchestrates the git automation logic.
 */
function run() {
  const lockfile = 'pnpm-lock.yaml';

  if (!hasChanges(lockfile)) {
    process.exit(0);
  }

  const timestamp = Math.floor(Date.now() / 1000);
  const branchName = `fix/lockfile-drift-${timestamp}`;
  const commitMessage = 'chore: sync pnpm-lock.yaml drift';

  try {
    execute(`git checkout -b ${branchName}`);
    execute(`git add ${lockfile}`);
    execute(`git commit -m "${commitMessage}"`);
    execute(`git push origin ${branchName}`);

    const existingPr = execute(`gh pr list --head ${branchName} --json number --jq ".[0].number"`);

    if (existingPr && existingPr !== '') {
      execute(`gh pr edit ${existingPr} --title "${commitMessage}" --body "Automated lockfile update detected drift."`);
    } else {
      execute('gh pr create --fill');
    }
  } catch (error) {
    process.exit(1);
  }
}

run();