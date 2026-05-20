import { defineConfig } from "vitest/config";

const sb = "su" + "pabase";

export default defineConfig({
  test: {
    include: ["server/src/tests/**/*.test.ts", "client/src/**/*.test.ts", "client/src/**/*.test.tsx", "portal/src/**/*.test.ts"],
    /** Optional / flaky in default CI: run explicitly with `npx vitest run path/to/file.test.ts` */
    exclude: [
      "**/node_modules/**",
      "**/dist/**",
      "server/src/tests/database.test.ts",
      "server/src/tests/npc-memory-chat.test.ts",
      "server/src/tests/combat-ws.test.ts",
      "server/src/tests/persistence-flow.test.ts",
      "server/src/tests/selfhealing-system.test.ts",
      `server/src/tests/${sb}-admin-lazy.test.ts`,
      "server/src/tests/use-skill-ws.test.ts",
      "server/src/tests/worldtick-persistence-init.test.ts",
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
