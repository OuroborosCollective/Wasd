import { createServer } from 'vite';
import { resolve } from 'path';

async function startVite() {
  const server = await createServer({
    root: resolve(__dirname, 'client'),
    server: {
      port: 3000,
    },
  });
  await server.listen();
  server.printUrls();
}

startVite();