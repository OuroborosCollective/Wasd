// import "./config/tracing.js";
import { loadRootEnvFiles } from "./config/loadRootEnv.js";

// Ensure environment variables are loaded before any other imports that might depend on them
loadRootEnvFiles();

import { getSupabaseAuthInitInfo } from "./config/supabase.js";
import { ServerBootstrap } from "./core/ServerBootstrap.js";
import "../../tools/asset-studio/world-asset-injector.mjs"; // asset registry watcher

/**
 * Validates the supabase authentication configuration.
 * Throws an error if critical configuration is missing to prevent runtime failures in tests or production.
 */
function validateConfig() {
  const sbAuth = getSupabaseAuthInitInfo();
  
  console.log(
    `[boot] supabaseAuth verifyMode=${sbAuth.verifyMode} jwtSecretSourceKey=${sbAuth.jwtSecretSourceKey ?? "none"} hasUrl=${sbAuth.hasUrl}`
  );

  if (!sbAuth.hasUrl) {
    throw new Error("Missing critical environment variable: SUPABASE_URL");
  }

  if (!sbAuth.verifyMode) {
    throw new Error("Missing critical environment variable: SUPABASE_VERIFY_MODE or fallback logic failed.");
  }

  // If JWT mode is selected, we usually require a secret key
  if (sbAuth.verifyMode === "JWT" && !sbAuth.jwtSecretSourceKey) {
    console.warn("[boot] Warning: verifyMode is set to JWT but SUPABASE_JWT_SECRET is missing.");
  }

  return sbAuth;
}

// Global error handlers to prevent silent crashes and provide better debug info
process.on("unhandledRejection", (reason, promise) => {
  console.error("[boot] Unhandled Rejection at:", promise, "reason:", reason);
});

process.on("uncaughtException", (error) => {
  console.error("[boot] Uncaught Exception thrown:", error);
  process.exit(1);
});

try {
  validateConfig();
  
  const server = new ServerBootstrap();
  const startResult = server.start();

  // If start returns a promise, handle potential async boot errors
  if (startResult instanceof Promise) {
    startResult.catch((err) => {
      console.error("[boot] Server failed during async start:", err);
      process.exit(1);
    });
  }
} catch (error) {
  console.error("[boot] Failed to bootstrap server:", error instanceof Error ? error.message : error);
  process.exit(1);
}
