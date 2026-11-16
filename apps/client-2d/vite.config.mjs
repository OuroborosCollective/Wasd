import { defineConfig } from 'vite';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));

let reactPlugin;
try {
  // Use @vitejs/plugin-react 4.x from client package to prevent Vite 6 ERR_PACKAGE_PATH_NOT_EXPORTED
  const reactPluginPath = path.resolve(root, '../../client/node_modules/@vitejs/plugin-react/dist/index.js');
  const mod = await import(pathToFileURL(reactPluginPath).href);
  reactPlugin = mod.default || mod;
} catch {
  const mod = await import('@vitejs/plugin-react');
  reactPlugin = mod.default || mod;
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
