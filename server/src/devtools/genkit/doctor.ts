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

const report = {
  ok: Boolean(configuredKeyName) || !requireProvider,
  mode: "development-side-channel",
  productionGameplayImport: false,
  truthClass: "SIDE_CHANNEL_PROPOSAL",
  authoritativeMutationAllowed: false,
  model: process.env.GENKIT_MODEL?.trim() || "gemini-2.5-flash",
  providerCredential: {
    configured: Boolean(configuredKeyName),
    sourceVariable: configuredKeyName ?? null,
    valueExposed: false,
  },
  cli: {
    pinnedFallbackVersion: process.env.GENKIT_CLI_VERSION?.trim() || "1.40.1",
  },
  flows: ARELORIA_GENKIT_FLOW_CATALOG,
};

console.log(JSON.stringify(report, null, 2));

if (requireProvider && !configuredKeyName) {
  console.error(
    "[genkit-doctor] No Google GenAI credential is configured. Set one of: " +
      providerKeyNames.join(", ")
  );
  process.exitCode = 2;
}
