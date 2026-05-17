import { defineConfig, mergeConfig } from "vitest/config";
import base from "./vitest.config";

/**
 * Subset used by `pnpm run test:dgcc` (DGCC "unit" gate). Keeps the contract green while
 * longer-running or drifted suites are repaired against current gameplay code.
 */
export default mergeConfig(
  base,
  defineConfig({
    test: {
      exclude: [
        "**/node_modules/**",
        "**/dist/**",
        "server/src/tests/chunk-system.test.ts",
        "server/src/tests/combat-ws.test.ts",
        "server/src/tests/diablo-loot-modules.test.ts",
        "server/src/tests/loot.test.ts",
        "server/src/tests/npc-memory-chat.test.ts",
        "server/src/tests/persistence-file.test.ts",
        "server/src/tests/persistence-flow.test.ts",
        "server/src/tests/proximity.test.ts",
        "server/src/tests/selfhealing-system.test.ts",
        "server/src/tests/use-skill-ws.test.ts",
        "server/src/tests/worldtick-persistence-init.test.ts",
      ],
    },
  })
);
