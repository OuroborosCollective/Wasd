import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const repositoryRoot = resolve(__dirname, '..', '..');
const workflowPaths = [
  '.github/workflows/vps-docker-deploy.yml',
  '.github/workflows/vps-docker-deploy-on-merge.yml',
] as const;

function readWorkflow(relativePath: string): string {
  return readFileSync(resolve(repositoryRoot, relativePath), 'utf8');
}

describe('canonical VPS deployment path workflows', () => {
  it.each(workflowPaths)('%s prefers the provisioner-owned path secret', (workflowPath) => {
    const workflow = readWorkflow(workflowPath);

    expect(workflow).toContain("DEPLOY_PATH: ${{ secrets.VPS_DEPLOY_PATH || secrets.DEPLOY_PATH || '/opt/areloria' }}");
    expect(workflow).toContain('The provisioner-owned secret is canonical.');
  });

  it.each(workflowPaths)('%s rejects unsafe paths before a remote deploy', (workflowPath) => {
    const workflow = readWorkflow(workflowPath);

    expect(workflow).toContain('Validate canonical deployment path');
    expect(workflow).toContain('VPS_DEPLOY_PATH/DEPLOY_PATH must be an absolute path.');
    expect(workflow).toContain('Refusing to deploy into the filesystem root.');
  });

  it.each(workflowPaths)('%s adopts a populated installer path without clone-in-place', (workflowPath) => {
    const workflow = readWorkflow(workflowPath);

    expect(workflow).toContain('Initialise Git in place instead of failing with `git clone ... .`.');
    expect(workflow).toContain('git init');
    expect(workflow).toContain('git remote add origin "$REPO_URL"');
    expect(workflow).toContain('git fetch --no-tags origin "$BRANCH"');
    expect(workflow).toContain('git reset --hard "origin/$BRANCH"');
    expect(workflow).not.toContain('git clone --branch "$BRANCH" "$REPO_URL" .');
  });

  it.each(workflowPaths)('%s applies protected runtime inputs after Git synchronization', (workflowPath) => {
    const workflow = readWorkflow(workflowPath);

    for (const key of ['DATABASE_URL', 'API_KEY', 'API_KEYS', 'ALLOWED_ORIGINS', 'CORS_ORIGINS']) {
      expect(workflow).toContain(`${key}: \${{ secrets.${key} }}`);
    }
    expect(workflow).toContain('RUNTIME_ENV_PATCH: ${{ runner.temp }}/wasd-runtime-env-${{ github.run_id }}.env');
    expect(workflow).toContain('RUNTIME_ENV_PATCH_NAME=".wasd-runtime-env-${GITHUB_RUN_ID}.env"');
    expect(workflow).toContain('chmod 600 "$RUNTIME_ENV_PATCH"');
    expect(workflow).toContain('-e "$RUNTIME_ENV_PATCH"');
    expect(workflow).toContain('test -f "$RUNTIME_ENV_PATCH"');
    expect(workflow).toContain("trap 'rm -f -- \"$RUNTIME_ENV_PATCH\"' EXIT");
    expect(workflow).toContain('touch .env.docker');
    expect(workflow).toContain('chmod 600 .env.docker');
    expect(workflow).toContain('Runtime environment patched from protected workflow inputs.');
    expect(workflow).toContain('rm -f "$RUNTIME_ENV_PATCH"');
  });
});
