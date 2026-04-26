import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["server/src/tests/**/*.test.ts", "client/src/**/*.test.ts", "client/src/**/*.test.tsx"],
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
