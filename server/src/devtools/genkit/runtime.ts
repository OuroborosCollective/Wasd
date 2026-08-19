import { ARELORIA_GENKIT_FLOW_CATALOG } from "./catalog.js";
import "./index.js";

// This process exists only so the Genkit CLI/MCP reflection runtime can keep
// the registered development flows discoverable. It is intentionally separate
// from server/src/index.ts and therefore cannot become the gameplay server by
// merely enabling Genkit.
console.error(
  `[genkit-runtime] registered ${ARELORIA_GENKIT_FLOW_CATALOG.length} Areloria side-channel flows`
);

const keepAlive = setInterval(() => {
  // Intentionally empty. The Genkit MCP/CLI controls the lifecycle of this
  // dedicated development runtime.
}, 60_000);

function shutdown(signal: string): void {
  clearInterval(keepAlive);
  console.error(`[genkit-runtime] stopping on ${signal}`);
  process.exit(0);
}

process.once("SIGINT", () => shutdown("SIGINT"));
process.once("SIGTERM", () => shutdown("SIGTERM"));
