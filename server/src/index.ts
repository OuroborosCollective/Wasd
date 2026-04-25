import "./config/tracing.js";
import { loadRootEnvFiles } from "./config/loadRootEnv.js";
loadRootEnvFiles();

import { getSupabaseAuthInitInfo } from "./config/supabase.js";
import { ServerBootstrap } from "./core/ServerBootstrap.js";
import "../../tools/asset-studio/world-asset-injector.mjs"; // asset registry watcher

const sbAuth = getSupabaseAuthInitInfo();
console.log(
  `[boot] supabaseAuth verifyMode=${sbAuth.verifyMode} jwtSecretKey=${sbAuth.jwtSecretSourceKey ?? "none"} hasUrl=${sbAuth.hasUrl}`
);

new ServerBootstrap().start();
