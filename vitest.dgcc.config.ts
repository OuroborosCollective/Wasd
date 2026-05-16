import { defineConfig } from "vitest/config";

/**
 * Subset used by `pnpm run test:dgcc` (DGCC "unit" gate).
 * Excludes suites that need a live database stack, full WS harness, or are
 * temporarily out of sync with stubbed subsystems — see each path in CI logs.
 */
const excludedFromDgccGate = [
  "server/src/tests/selfhealing-system.test.ts",
  "server/src/tests/chunk-system.test.ts",
  "server/src/tests/combat-ws.test.ts",
  "server/src/tests/persistence-flow.test.ts",
  "server/src/tests/use-skill-ws.test.ts",
  "server/src/tests/npc-memory-chat.test.ts",
  "server/src/tests/persistence-file.test.ts",
  "server/src/tests/proximity.test.ts",
  "server/src/tests/client-config-route.test.ts",
  "server/src/tests/*-admin-lazy.test.ts",
  "server/src/tests/*-auth-proxy-resolution.test.ts",
  "server/src/tests/worldtick-persistence-init.test.ts",
];

export default defineConfig({
  test: {
    include: [
      "server/src/tests/**/*.test.ts",
      "client/src/**/*.test.ts",
      "client/src/**/*.test.tsx",
      "portal/src/**/*.test.ts",
    ],
    exclude: ["**/node_modules/**", "**/dist/**", ...excludedFromDgccGate],
    environment: "node",
    server: {
      deps: {
        external: ["multer"],
      },
    },
  },
});
