import { createPlayCanvasApp } from "./engine/playcanvas/PlayCanvasBoot";
import { PlayCanvasAdapter } from "./engine/playcanvas/PlayCanvasAdapter";
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

// 1. Boot Engine
const app = createPlayCanvasApp(canvas);

// 2. Create Adapter
const adapter = new PlayCanvasAdapter(app);

// 3. Create Core
const core = new MMORPGClientCore(adapter);
(window as any).gameCore = core;
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

core.events.on('dialogue', (text: string) => {
  showDialogue(text);
});

console.log("Areloria PlayCanvas Client Initialized");
