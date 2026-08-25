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

  it('keeps the real 3D client build mandatory', () => {
    expect(dockerfile).toContain('RUN pnpm --filter @wasd/client --if-present build &&');
    expect(dockerfile).toContain("! grep -q 'Areloria 3D unavailable' client/dist/index.html");
  });
});
