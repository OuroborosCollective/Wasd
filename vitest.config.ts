import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["server/src/tests/**/*.test.ts"],
    environment: "node",
  },
});
