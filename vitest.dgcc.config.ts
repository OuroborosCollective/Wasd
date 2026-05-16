import { defineConfig, mergeConfig } from "vitest/config";
import base from "./vitest.config.js";

/**
 * Narrower unit gate for DGCC: skips suites that need a live SQL database, full WebSocket stacks,
 * or optional secrets so `pnpm run dgcc` stays reliable in CI/agent sandboxes.
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
        "server/src/tests/database.test.ts",
        "server/src/tests/interaction.test.ts",
        "server/src/tests/npc-memory-chat.test.ts",
        "server/src/tests/persistence-flow.test.ts",
        "server/src/tests/proximity.test.ts",
        "server/src/tests/selfhealing-system.test.ts",
        "server/src/tests/supabase-admin-lazy.test.ts", // pragma: allowlist secret
        "server/src/tests/use-skill-ws.test.ts",
        "server/src/tests/worldtick-persistence-init.test.ts",
      ],
    },
  })
);
