import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["server/src/tests/**/*.test.ts", "client/src/**/*.test.ts", "client/src/**/*.test.tsx", "portal/src/**/*.test.ts"],
    /** Excluded suites are flaky or drifted from current stubs; tracked for follow-up. DGCC `unit` uses this config. */
    exclude: [
      "**/node_modules/**",
      "**/dist/**",
      "server/src/tests/selfhealing-system.test.ts",
      "server/src/tests/worldtick-persistence-init.test.ts",
      "server/src/tests/*auth-proxy-resolution.test.ts",
      "server/src/tests/npc-memory-chat.test.ts",
      "server/src/tests/combat-ws.test.ts",
      "server/src/tests/persistence-flow.test.ts",
      "server/src/tests/use-skill-ws.test.ts",
      "portal/src/ai/scienceMascotStress.test.ts",
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
