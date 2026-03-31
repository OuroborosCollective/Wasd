import { createBabylonApp } from "./engine/babylon/BabylonBoot";
import { BabylonAdapter } from "./engine/babylon/BabylonAdapter";
import { MMORPGClientCore } from "./core/MMORPGClientCore";
import { connectSocket, requestSceneChange, type ConnectionOptions } from "./networking/websocketClient";
import { renderHUD, showDialogue } from "./ui/hud";
import { renderImprovedVirtualJoystick } from "./ui/ImprovedVirtualJoystick";
import { renderMobileSceneTeleportPanel } from "./ui/mobileSceneTeleportPanel";
import { performanceMonitor } from "./utils/PerformanceMonitor";

let canvas = document.getElementById("application-canvas") as HTMLCanvasElement;
if (!canvas) {
  canvas = document.createElement("canvas");
  canvas.id = "application-canvas";
  document.body.appendChild(canvas);
}
document.body.style.margin = "0";
document.body.style.overflow = "hidden";
canvas.style.width = "100vw";
canvas.style.height = "100vh";
canvas.style.display = "block";

// 1. Boot Engine
const app = createBabylonApp(canvas);

// 2. Create Adapter
const adapter = new BabylonAdapter(app.scene, app.camera);

// 3. Create Core
const core = new MMORPGClientCore(adapter);
(window as any).gameCore = core;
(window as any).babylonScene = app.scene;
core.registerDefaultInput();

// 4. Connect Systems
const connectionOptions: ConnectionOptions = {};
const persistedToken = localStorage.getItem("token");
if (persistedToken && persistedToken.trim().length > 0) {
  connectionOptions.token = persistedToken;
}
connectSocket(core, connectionOptions);
(window as any).requestSceneChange = requestSceneChange;
renderHUD();
renderMobileSceneTeleportPanel();
renderImprovedVirtualJoystick(core);
performanceMonitor.start();

let lastFrameTime = performance.now();
const tick = (now: number) => {
  const dt = Math.min((now - lastFrameTime) / 1000, 0.1);
  lastFrameTime = now;
  core.update(dt);
  requestAnimationFrame(tick);
};
requestAnimationFrame(tick);

core.events.on('dialogue', (text: string) => {
  showDialogue(text);
});

console.log("Areloria Babylon Client Initialized");
