import { defineConfig } from 'vite';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const root = path.dirname(fileURLToPath(import.meta.url));

// Resolve @vitejs/plugin-react (v4.x) from workspace to ensure compatibility with Vite 6
let reactPlugin;
try {
  const req = createRequire(path.resolve(root, '../../client/package.json'));
  const resolved = req.resolve('@vitejs/plugin-react');
  const reactMod = await import(resolved);
  reactPlugin = reactMod.default || reactMod;
} catch {
  const reactMod = await import('../../client/node_modules/@vitejs/plugin-react/dist/index.js');
  reactPlugin = reactMod.default || reactMod;
}

export default defineConfig({
  plugins: [reactPlugin()],
  resolve: {
    alias: [
      { find: '@wasd/core-network', replacement: path.resolve(root, './src/networkClient.ts') },
      { find: '@wasd/shared/world', replacement: path.resolve(root, '../../packages/shared/src/world/index.ts') },
      { find: '@wasd/shared', replacement: path.resolve(root, '../../packages/shared/src/index.ts') }
    ]
  },
  server: {
    port: 5173,
    host: true
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true
  },
  base: '/2d/'
});
