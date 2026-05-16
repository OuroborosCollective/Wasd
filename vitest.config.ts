import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    /** Stable defaults for CI/agents: repo `.env` may set `PERSISTENCE_DRIVER=auto` with Docker `db` host. */
    env: {
      PERSISTENCE_DRIVER: "file",
    },
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
