import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["server/src/tests/**/*.test.ts"],
    environment: "node",
    deps: {
      external: [
        "multer",
        "firebase/auth",
        "firebase/firestore",
      ],
    },
  },
});
