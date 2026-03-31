import { createBabylonApp } from "./engine/babylon/BabylonBoot";
import { BabylonAdapter } from "./engine/babylon/BabylonAdapter";
import { createPlayCanvasApp } from "./engine/playcanvas/PlayCanvasBoot";
import { PlayCanvasAdapter } from "./engine/playcanvas/PlayCanvasAdapter";
import { MMORPGClientCore } from "./core/MMORPGClientCore";
import { connectSocket, requestSceneChange, type ConnectionOptions } from "./networking/websocketClient";
import { IEngineBridge } from "./engine/bridge/IEngineBridge";
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

function showBootStatus(message: string) {
  let status = document.getElementById("boot-status-banner") as HTMLDivElement | null;
  if (!status) {
    status = document.createElement("div");
    status.id = "boot-status-banner";
    status.style.position = "fixed";
    status.style.left = "12px";
    status.style.bottom = "12px";
    status.style.zIndex = "9999";
    status.style.padding = "8px 10px";
    status.style.background = "rgba(0,0,0,0.72)";
    status.style.borderLeft = "3px solid #f27d26";
    status.style.color = "#f7f7f7";
    status.style.fontFamily = "sans-serif";
    status.style.fontSize = "12px";
    status.style.maxWidth = "520px";
    document.body.appendChild(status);
  }
  status.textContent = message;
}

function bootEngineBridge(targetCanvas: HTMLCanvasElement): IEngineBridge {
  try {
    const app = createBabylonApp(targetCanvas);
    (window as any).babylonScene = app.scene;
    console.log("Renderer: Babylon");
    return new BabylonAdapter(app.scene, app.camera);
  } catch (error) {
    console.error("Babylon bootstrap failed. Falling back to PlayCanvas.", error);
    showBootStatus("Babylon failed to initialize. Fallback renderer: PlayCanvas.");
    const app = createPlayCanvasApp(targetCanvas);
    console.log("Renderer: PlayCanvas (fallback)");
    return new PlayCanvasAdapter(app);
  }
}

try {
  // 1. Boot Engine + Adapter
  const adapter = bootEngineBridge(canvas);

  // 2. Create Core
  const core = new MMORPGClientCore(adapter);
  (window as any).gameCore = core;
  core.registerDefaultInput();

  // 3. Connect Systems
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

  core.events.on("dialogue", (text: string) => {
    showDialogue(text);
  });

  console.log("Areloria Client Initialized");
} catch (error: any) {
  console.error("Fatal client bootstrap error:", error);
  showBootStatus(`Fatal bootstrap error: ${error?.message || "Unknown error"}`);
}
