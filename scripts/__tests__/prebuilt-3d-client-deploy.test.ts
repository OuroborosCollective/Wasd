import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = resolve(__dirname, '..', '..');
const read = (relativePath: string) => readFileSync(resolve(root, relativePath), 'utf8');

const dockerfile = read('Dockerfile.vps');
const dockerignore = read('.dockerignore');
const deployScript = read('scripts/deploy-vps-docker.sh');
const sourceGate = read('scripts/verify-vps-build-logic.mjs');

describe('prebuilt 3D client deployment contract', () => {
  it('includes the verified 3D dist in the Docker context without transferring archives', () => {
    expect(dockerignore).toContain('!client/dist');
    expect(dockerignore).toContain('!client/dist/**');
    expect(dockerignore).toContain('wasd-client-2d-dist-*.tgz');
    expect(dockerfile).toContain('test -f client/dist/build-stamp.json');
    expect(dockerfile).toContain('grep -q "$BUILD_COMMIT_SHA" client/dist/build-stamp.json');
    expect(dockerfile).not.toContain('RUN pnpm --filter @wasd/client --if-present build &&');
  });

  it('restores and commit-validates both client artifacts after the deploy script reset', () => {
    expect(deployScript).toContain('restore_prebuilt_client_artifacts()');
    expect(deployScript).toContain('git clean -fd -e .env -e .env.local -e .env.docker -e data/ -e logs/ -e .asset-inbox/ -e "$CLIENT_2D_ARCHIVE" -e "$CLIENT_3D_ARCHIVE"');
    expect(deployScript).toContain('tar -xzf "$CLIENT_3D_ARCHIVE" -C client');
    expect(deployScript).toContain('grep -q "$CLIENT_3D_BUILD_SHA" client/dist/build-stamp.json');
    expect(deployScript).toContain('restore_prebuilt_client_artifacts\nexport BUILD_COMMIT_SHA');
  });

  it('keeps the source gate aligned with the runner-built 3D artifact path', () => {
    expect(sourceGate).toContain('Client-3D is built on the GitHub runner and extracted on the VPS before docker build.');
    expect(sourceGate).toContain('restore_prebuilt_client_artifacts');
    expect(sourceGate).toContain('must consume the verified runner-built 3D artifact');
  });
});
