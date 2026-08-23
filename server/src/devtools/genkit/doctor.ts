import { loadRootEnvFiles } from "../../config/loadRootEnv.js";
import { ARELORIA_GENKIT_FLOW_CATALOG } from "./catalog.js";

loadRootEnvFiles();

const providerKeyNames = [
  "GOOGLE_GENAI_API_KEY",
  "GOOGLE_GENERATIVE_AI_API_KEY",
  "GOOGLE_API_KEY",
] as const;

const configuredKeyName = providerKeyNames.find((name) => Boolean(process.env[name]?.trim()));
const requireProvider = process.argv.includes("--require-provider");
const requireOperator = process.argv.includes("--require-operator");
const operatorConfigured = Boolean(process.env.MCP_ADMIN_TOKEN?.trim());
const providerReady = Boolean(configuredKeyName);

const report = {
  ok: (!requireProvider || providerReady) && (!requireOperator || operatorConfigured),
  mode: "genkit-control-plane",
  proposalTruthClass: "SIDE_CHANNEL_PROPOSAL",
  proposalAuthoritativeMutationAllowed: false,
  gameplayOperator: {
    flowName: "areloriaGameplayOperatorFlow",
    configured: operatorConfigured,
    credentialSourceVariable: operatorConfigured ? "MCP_ADMIN_TOKEN" : null,
    credentialValueExposed: false,
    authority: "existing Areloria server routes + WorldTick RuntimePlayerSystem",
    transport: "fixed localhost loopback only",
    requiresRunningAuthoritativeServer: true,
    executionRequiresReadback: true,
    sequencePolicy: "strictly increasing per operator session/player",
  },
  model: process.env.GENKIT_MODEL?.trim() || "gemini-2.5-flash",
  providerCredential: {
    configured: providerReady,
    sourceVariable: configuredKeyName ?? null,
    valueExposed: false,
  },
  cli: {
    pinnedFallbackVersion: process.env.GENKIT_CLI_VERSION?.trim() || "1.40.1",
  },
  proposalFlows: ARELORIA_GENKIT_FLOW_CATALOG,
};

console.log(JSON.stringify(report, null, 2));

if (requireProvider && !providerReady) {
  console.error(
    "[genkit-doctor] No Google GenAI credential is configured. Set one of: " +
      providerKeyNames.join(", ")
  );
  process.exitCode = 2;
}

if (requireOperator && !operatorConfigured) {
  console.error("[genkit-doctor] MCP_ADMIN_TOKEN is required for the loopback gameplay operator.");
  process.exitCode = 3;
}
