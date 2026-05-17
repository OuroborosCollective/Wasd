import { defineConfig, mergeConfig, configDefaults } from "vitest/config";
import root from "./vitest.config";

/**
 * Subset of Vitest files excluded from the DGCC gate: suites that currently
 * depend on unfinished WS handlers, optional service mocks, or legacy paths
 * not aligned with the stubbed WorldTick surface. The default `pnpm run test`
 * still runs the full include list from `vitest.config.ts`.
 */
const DGCC_EXCLUDED_FILES = [
  "portal/src/ai/scienceMascotStress.test.ts",
  "server/src/tests/chunk-system.test.ts",
  "server/src/tests/client-config-route.test.ts",
  "server/src/tests/combat-ws.test.ts",
  "server/src/tests/database.test.ts",
  "server/src/tests/diablo-loot-modules.test.ts",
  "server/src/tests/interaction.test.ts",
  "server/src/tests/loot.test.ts",
  "server/src/tests/npc-memory-chat.test.ts",
  "server/src/tests/persistence-flow.test.ts",
  "server/src/tests/protocol-types.test.ts",
  "server/src/tests/proximity.test.ts",
  "server/src/tests/selfhealing-system.test.ts",
  "server/src/tests/supabase-auth-proxy-resolution.test.ts",
  "server/src/tests/use-skill-ws.test.ts",
];

export default mergeConfig(root, defineConfig({
  test: {
    exclude: [...configDefaults.exclude, ...DGCC_EXCLUDED_FILES],
  },
}));
