import "./config/firebase.js";
import { enableFirebaseTelemetry } from '@genkit-ai/firebase';
import { ServerBootstrap } from "./core/ServerBootstrap.js";
import "../../tools/asset-studio/world-asset-injector.mjs"; // asset registry watcher


enableFirebaseTelemetry();
new ServerBootstrap().start();
