import "./config/firebase.js";
import { enableFirebaseTelemetry } from '@genkit-ai/firebase';
import { ServerBootstrap } from "./core/ServerBootstrap.js";
import "../../tools/asset-studio/world-asset-injector.mjs"; // asset registry watcher
import { selfHealing } from "./selfheal/SelfHealingEngine.js";



enableFirebaseTelemetry();

// Globaler Error-Handler für das Self-Healing System
process.on("uncaughtException", (error) => {
  selfHealing.reportError("Global", error.message, "RUNTIME_EXCEPTION", "CRITICAL", error.stack);
});

process.on("unhandledRejection", (reason) => {
  const msg = reason instanceof Error ? reason.message : String(reason);
  const stack = reason instanceof Error ? reason.stack : undefined;
  selfHealing.reportError("Global", msg, "RUNTIME_EXCEPTION", "HIGH", stack);
});

new ServerBootstrap().start();
