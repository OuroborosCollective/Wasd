import { getContentDataRoot } from "../modules/content/contentDataRoot.js";
import { findRepoRootWithGameData } from "../modules/content/repoRoot.js";
import { auditContentModelPaths } from "../modules/content/auditContentModelPaths.js";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function main() {
  const contentRoot = getContentDataRoot();
  const repo =
    findRepoRootWithGameData() ??
    path.resolve(__dirname, "../../..");

  const result = auditContentModelPaths(contentRoot, repo);

  console.log(`Model path audit (content: ${contentRoot})`);
  console.log(`Repo root: ${result.repoRoot}`);
  console.log(`References checked: ${result.checked}, unique model URLs: ${result.uniqueModelUrls}`);

  if (result.missing.length === 0) {
    console.log("All referenced model paths exist on disk.");
    process.exit(0);
  }

  console.error(`Missing ${result.missing.length} path(s):`);
  for (const m of result.missing) {
    console.error(`  ${m.urlPath}`);
    console.error(`    → ${m.source}`);
  }
  process.exit(1);
}

main();
