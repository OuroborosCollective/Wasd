import { configDefaults, defineConfig, mergeConfig } from "vitest/config";
import base from "./vitest.config";

/**
 * Subset gate for DGCC: excludes tests that require optional native modules,
 * external services, or flaky WS harnesses. Full suite: `pnpm run test`.
 */
const dgccExcludedTests = [
  "portal/src/ai/scienceMascotStress.test.ts",
  "server/src/tests/database.test.ts",
  "server/src/tests/npc-memory-chat.test.ts",
  "server/src/tests/chunk-system.test.ts",
  "server/src/tests/client-config-route.test.ts",
  "server/src/tests/combat-ws.test.ts",
  "server/src/tests/diablo-loot-modules.test.ts",
  "server/src/tests/loot.test.ts",
  "server/src/tests/persistence-file.test.ts",
  "server/src/tests/persistence-flow.test.ts",
  "server/src/tests/proximity.test.ts",
  "server/src/tests/selfhealing-system.test.ts",
  "server/src/tests/supabase-admin-lazy.test.ts", // pragma: allowlist secret
  "server/src/tests/supabase-auth-proxy-resolution.test.ts", // pragma: allowlist secret
  "server/src/tests/use-skill-ws.test.ts",
  "server/src/tests/worldtick-persistence-init.test.ts",
];

export default mergeConfig(
  base,
  defineConfig({
    test: {
      exclude: [...configDefaults.exclude, ...dgccExcludedTests],
    },
  })
);
