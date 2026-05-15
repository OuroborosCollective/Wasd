import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    env: {
      PERSISTENCE_DRIVER: "file",
      SUPABASE_PROXY_URL: "", // pragma: allowlist secret
      SUPABASE_URL: "", // pragma: allowlist secret
      SUPABASE_PUBLIC_URL: "", // pragma: allowlist secret
    },
    exclude: [
      "**/node_modules/**",
      "**/dist/**",
      "portal/src/ai/scienceMascotStress.test.ts",
      "server/src/tests/database.test.ts",
      "server/src/tests/chunk-system.test.ts",
      "server/src/tests/combat-ws.test.ts",
      "server/src/tests/npc-memory-chat.test.ts",
      "server/src/tests/persistence-flow.test.ts",
      "server/src/tests/proximity.test.ts",
      "server/src/tests/use-skill-ws.test.ts",
    ],
    include: ["server/src/tests/**/*.test.ts", "client/src/**/*.test.ts", "client/src/**/*.test.tsx", "portal/src/**/*.test.ts"],
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
