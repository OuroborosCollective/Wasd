import { defineConfig } from "eslint/config";
import next from "eslint-config-next";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig([{
    ignores: [
      "dist/**",
      "node_modules/**",
      "client/dist/**",
      "server/dist/**",
      "e2e/**",
      "playwright.config.ts",
      "**/*.js",
    ],
    extends: [...next],
}]);
