import { ARELORIA_GENKIT_FLOW_CATALOG } from "./catalog.js";
import "./index.js";
import "./contentAuthoring.js";
import "./gameplayFlow.js";

// This process exists so the Genkit CLI/MCP reflection runtime can keep the
// registered flows discoverable. It remains separate from server/src/index.ts:
// gameplay execution is delegated back to the already-running authoritative
// Areloria server through the constrained gameplayOperator boundary.
console.error(
  `[genkit-runtime] registered ${ARELORIA_GENKIT_FLOW_CATALOG.length} proposal flows plus the authoritative gameplay operator flow`
);

const keepAlive = setInterval(() => {
  // Intentionally empty. The Genkit MCP/CLI controls the lifecycle of this
  // dedicated development/operator runtime.
}, 60_000);

function shutdown(signal: string): void {
  clearInterval(keepAlive);
  console.error(`[genkit-runtime] stopping on ${signal}`);
  process.exit(0);
}

process.once("SIGINT", () => shutdown("SIGINT"));
process.once("SIGTERM", () => shutdown("SIGTERM"));
