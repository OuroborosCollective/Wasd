import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    setupFiles: ["./vitest.setup.mjs"],
    testTimeout: 60_000,
    include: ["server/src/tests/**/*.test.ts", "client/src/**/*.test.ts", "client/src/**/*.test.tsx", "portal/src/**/*.test.ts"],
    exclude: [
      "server/src/tests/npc-memory-chat.test.ts",
      "server/src/tests/combat-ws.test.ts",
      "server/src/tests/persistence-flow.test.ts",
      "server/src/tests/use-skill-ws.test.ts",
    ],
    environment: "node",
    server: {
      deps: {
        external: [
          "multer",
        ],
      },
    },
  },
});
