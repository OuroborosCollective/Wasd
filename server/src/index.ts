import "./config/firebase.js";
import { enableFirebaseTelemetry } from '@genkit-ai/firebase';
import { ServerBootstrap } from "./core/ServerBootstrap.js";
import { bootstrapSelfHealing } from "./selfhealing/SelfHealingSystem.js";
import "../../tools/asset-studio/world-asset-injector.mjs"; // asset registry watcher


enableFirebaseTelemetry();
const selfHealingRuntime = bootstrapSelfHealing();
void new ServerBootstrap({ selfHealing: selfHealingRuntime.system }).start();
