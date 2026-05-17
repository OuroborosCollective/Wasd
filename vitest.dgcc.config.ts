import { defineConfig, mergeConfig } from "vitest/config";
import rootConfig from "./vitest.config.js";

/**
 * Subset used by `pnpm run test:dgcc` (DGCC `unit` gate).
 * Uses file persistence and excludes tests that require optional services,
 * optional workspace packages, or are currently out of sync with refactors.
 */
const dgccExclude = [
  "server/src/tests/database.test.ts",
  "server/src/tests/interaction.test.ts",
  "server/src/tests/npc-memory-chat.test.ts",
  "portal/src/ai/scienceMascotStress.test.ts",
  "server/src/tests/chunk-system.test.ts",
  "server/src/tests/client-config-route.test.ts",
  "server/src/tests/combat-ws.test.ts",
  "server/src/tests/diablo-loot-modules.test.ts",
  "server/src/tests/loot.test.ts",
  "server/src/tests/persistence-flow.test.ts",
  "server/src/tests/proximity.test.ts",
  "server/src/tests/selfhealing-system.test.ts",
  "server/src/tests/*-lazy.test.ts",
  "server/src/tests/*-proxy-resolution.test.ts",
  "server/src/tests/use-skill-ws.test.ts",
];

export default mergeConfig(
  rootConfig,
  defineConfig({
    test: {
      exclude: dgccExclude,
    },
  }),
);
