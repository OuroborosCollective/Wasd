import { createBabylonApp } from "./engine/babylon/BabylonBoot";
import { BabylonAdapter } from "./engine/babylon/BabylonAdapter";
import { MMORPGClientCore } from "./core/MMORPGClientCore";
import { connectSocket, requestSceneChange, type ConnectionOptions } from "./networking/websocketClient";
import { IEngineBridge } from "./engine/bridge/IEngineBridge";
import { renderHUD, showDialogue } from "./ui/hud";
import { renderImprovedVirtualJoystick } from "./ui/ImprovedVirtualJoystick";
import { renderMobileSceneTeleportPanel } from "./ui/mobileSceneTeleportPanel";
import { performanceMonitor } from "./utils/PerformanceMonitor";
import { isFirebaseGameAuthDisabled } from "./config/gameAuth";

type AREPolicyConfig = {
  cooldownMs?: number;
  lowFpsThreshold?: number;
  stableFpsThreshold?: number;
  lowSampleTrigger?: number;
  stableSampleTrigger?: number;
};

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

function showBootStatus(message: string, tone: "info" | "warn" | "error" | "ok" = "warn") {
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
  status.style.borderLeft =
    tone === "error"
      ? "3px solid #ef4444"
      : tone === "ok"
        ? "3px solid #22c55e"
        : tone === "info"
          ? "3px solid #3b82f6"
          : "3px solid #f27d26";
  status.textContent = message;
}

function bootEngineBridge(targetCanvas: HTMLCanvasElement): IEngineBridge {
  const app = createBabylonApp(targetCanvas);
  (window as any).babylonScene = app.scene;
  console.log("Renderer: Babylon");
  return new BabylonAdapter(app.scene, app.camera);
}

async function loadAREPolicyConfig(): Promise<AREPolicyConfig | undefined> {
  try {
    const response = await fetch("/world/are-performance-policy.json", { cache: "no-store" });
    if (!response.ok) {
      return undefined;
    }
    const parsed = await response.json();
    if (!parsed || typeof parsed !== "object") {
      return undefined;
    }
    return parsed as AREPolicyConfig;
  } catch {
    return undefined;
  }
}

try {
  showBootStatus("Booting renderer...", "info");
  // 1. Boot Engine + Adapter
  const adapter = bootEngineBridge(canvas);
  showBootStatus("Renderer ready. Connecting to world...", "info");

  if (typeof window !== "undefined") {
    window.addEventListener("areloria:net-status", (event: Event) => {
      const custom = event as CustomEvent<{ kind?: string; message?: string }>;
      const kind = String(custom.detail?.kind || "info");
      const message = String(custom.detail?.message || "");
      if (!message) return;
      const tone: "info" | "warn" | "error" | "ok" =
        kind === "error" || kind === "closed" ? "error" :
        kind === "welcome" || kind === "sync" ? "ok" :
        kind === "warning" ? "warn" : "info";
      showBootStatus(`[NET:${kind}] ${message}`, tone);
    });
  }

  // 2. Create Core
  const core = new MMORPGClientCore(adapter);
  (window as any).gameCore = core;
  core.registerDefaultInput();

  // 3. Connect Systems
  const connectionOptions: ConnectionOptions = {};
  if (!isFirebaseGameAuthDisabled()) {
    let persistedToken: string | null = null;
    try {
      persistedToken = localStorage.getItem("token");
    } catch {
      showBootStatus("Storage access blocked. Continuing without saved login token.", "warn");
    }
    if (persistedToken && persistedToken.trim().length > 0) {
      connectionOptions.token = persistedToken;
    }
  } else {
    try {
      localStorage.removeItem("token");
    } catch {
      /* ignore */
    }
  }
  const policyPromise = loadAREPolicyConfig().then((policyConfig) => {
    if (policyConfig) {
      connectionOptions.arePolicyConfig = policyConfig;
    }
  });
  policyPromise
    .catch(() => undefined)
    .finally(() => {
      connectSocket(core, connectionOptions);
    });
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
