import "./config/firebase.js";
import { enableFirebaseTelemetry } from '@genkit-ai/firebase';
import { ServerBootstrap } from "./core/ServerBootstrap.js";

enableFirebaseTelemetry();
new ServerBootstrap().start();
