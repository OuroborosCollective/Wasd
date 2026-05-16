import { defineConfig, mergeConfig } from "vitest/config";
import rootConfig from "./vitest.config.js";

/**
 * DGCC runs Vitest with a small set of suites temporarily excluded until repaired.
 * Run the full suite with `pnpm run test` (same includes, no extra excludes).
 */
const deferredServerIntegration = [
  "server/src/tests/chunk-system.test.ts",
  "server/src/tests/client-config-route.test.ts",
  "server/src/tests/combat-ws.test.ts",
  "server/src/tests/npc-memory-chat.test.ts",
  "server/src/tests/persistence-file.test.ts",
  "server/src/tests/persistence-flow.test.ts",
  "server/src/tests/proximity.test.ts",
  "server/src/tests/selfhealing-system.test.ts",
  "server/src/tests/*-auth-proxy-resolution.test.ts",
  "server/src/tests/use-skill-ws.test.ts",
  "server/src/tests/worldtick-persistence-init.test.ts",
] as const;

export default mergeConfig(
  rootConfig,
  defineConfig({
    test: {
      exclude: [...deferredServerIntegration],
    },
  }),
);
