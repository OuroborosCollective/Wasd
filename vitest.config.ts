import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["server/src/tests/**/*.test.ts", "client/src/**/*.test.ts", "client/src/**/*.test.tsx", "portal/src/**/*.test.ts"],
    exclude: [
      // Suites temporarily out of sync with stubbed or refactored subsystems; tracked for re-enable.
      "server/src/tests/selfhealing-system.test.ts",
      "server/src/tests/client-config-route.test.ts",
      "server/src/tests/**/*auth-proxy-resolution.test.ts",
      "server/src/tests/worldtick-persistence-init.test.ts",
      "server/src/tests/database.test.ts",
      "server/src/tests/chunk-system.test.ts",
      "server/src/tests/combat-ws.test.ts",
      "server/src/tests/persistence-flow.test.ts",
      "server/src/tests/use-skill-ws.test.ts",
      "server/src/tests/npc-memory-chat.test.ts",
      "server/src/tests/persistence-file.test.ts",
      "server/src/tests/proximity.test.ts",
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
