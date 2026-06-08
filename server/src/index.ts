// @ts-nocheck
import { loadRootEnvFiles } from "./config/loadRootEnv.js";

// Ensure environment variables are loaded before any other imports that might depend on them
loadRootEnvFiles();

import { getSupabaseAuthInitInfo } from "./config/supabase.js";
import { installDeterministicWatchdogRuntime } from "./core/installDeterministicWatchdog.js";
import { ServerBootstrap } from "./core/ServerBootstrap.js";
import { installRuntimeChatRelay } from "./modules/chat/installRuntimeChatRelay.js";
import "./modules/loot/installLootBridge.js";
import { installARELootIntegration } from "./modules/loot/installARELootIntegration.js";

/**
 * Validates the supabase authentication configuration.
 */
function validateConfig() {
  const sbAuth = getSupabaseAuthInitInfo();
  
  console.log(
    `[boot] supabaseAuth verifyMode=${sbAuth.verifyMode} hasUrl=${sbAuth.hasUrl}`
  );

  if (!sbAuth.hasUrl) {
    // throw new Error("Missing critical environment variable: SUPABASE_URL");
  }

  return sbAuth;
}

process.on("unhandledRejection", (reason, promise) => {
  console.error("[boot] Unhandled Rejection at:", promise, "reason:", reason);
});

process.on("uncaughtException", (error) => {
  console.error("[boot] Uncaught Exception thrown:", error);
  process.exit(1);
});

try {
  validateConfig();
  installDeterministicWatchdogRuntime();
  installRuntimeChatRelay();
  const server = new ServerBootstrap();
  server.start();
} catch (error) {
  console.error("[boot] Failed to bootstrap server:", error);
  process.exit(1);
}
