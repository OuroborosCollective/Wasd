import { defineConfig } from 'vite';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));

// Resolve plugin-react compatible with Vite 6
let reactPlugin;
try {
  const pluginModule = await import('../../client/node_modules/@vitejs/plugin-react/dist/index.js');
  reactPlugin = pluginModule.default;
} catch {
  reactPlugin = () => [];
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
