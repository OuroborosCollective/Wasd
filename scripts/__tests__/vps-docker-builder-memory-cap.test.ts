import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const dockerfile = readFileSync(resolve(__dirname, '..', '..', 'Dockerfile.vps'), 'utf8');

describe('VPS Docker builder memory contract', () => {
  it('caps the V8 heap below the VPS builder cgroup limit', () => {
    const builderStart = dockerfile.indexOf('ENV NODE_ENV=production');
    const clientArtifactBoundary = dockerfile.indexOf('RUN rm -rf /tmp/wasd-3d-dist');
    const builderSection = dockerfile.slice(builderStart, clientArtifactBoundary);

    expect(builderStart).toBeGreaterThanOrEqual(0);
    expect(clientArtifactBoundary).toBeGreaterThan(builderStart);
    expect(builderSection).toContain('ENV NODE_OPTIONS=--max-old-space-size=256');
    expect(builderSection).not.toContain('ENV NODE_OPTIONS=--max-old-space-size=512');
    expect(builderSection).not.toContain('ENV NODE_OPTIONS=--max-old-space-size=1024');
  });

  it('requires a verified runner-built 3D artifact instead of recompiling on the VPS', () => {
    expect(dockerfile).toContain('Client-3D is built on the GitHub runner and extracted on the VPS before docker build.');
    expect(dockerfile).toContain('test -f client/dist/build-stamp.json');
    expect(dockerfile).toContain('grep -q "$BUILD_COMMIT_SHA" client/dist/build-stamp.json');
    expect(dockerfile).toContain("! grep -q 'Areloria 3D unavailable' client/dist/index.html");
    expect(dockerfile).not.toContain('RUN pnpm --filter @wasd/client --if-present build &&');
  });
});
