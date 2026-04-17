import "./styles/tailwind.css";
import { createBabylonApp } from "./engine/babylon/BabylonBoot";
import { BabylonAdapter } from "./engine/babylon/BabylonAdapter";
import { MMORPGClientCore } from "./core/MMORPGClientCore";
import { connectSocket, requestSceneChange, sendCommand, type ConnectionOptions } from "./networking/websocketClient";
import { IEngineBridge } from "./engine/bridge/IEngineBridge";
import { renderHUD, showDialogue } from "./ui/hud";
import { mountGameHudOverlay } from "./ui/mountGameHudOverlay";
import { initSupabaseClient, getSupabaseClientSync } from "./auth/supabase";
import { getJoystickState, initMobileControls, isMobile } from "./ui/mobileControls";
import { openEquipmentPanel, openInventory, openQuestLog, openSkillsPanel } from "./ui/lazyPanels";
import { getQuickCastSkillId } from "./game/combatSkills";
import { performanceMonitor } from "./utils/PerformanceMonitor";
import { resolveGameAuthProvider } from "./config/gameAuth";
import { installFirebaseAiWatchdog } from "./ai/firebaseAiWatchdog";
import { initChat, focusChatInput } from "./ui/chat";
import { initMinimap, toggleMinimapVisibility } from "./ui/minimap";

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

void (async () => {
try {
  installFirebaseAiWatchdog();
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
  mountGameHudOverlay(core);
  core.registerDefaultInput();

  await initSupabaseClient();
  // Legacy DOM HUD: Supabase/Firebase sign-in + guest controls (React HUD has no auth forms).
  renderHUD();

  // 3. Connect Systems
  const connectionOptions: ConnectionOptions = {};
  let authProvider = resolveGameAuthProvider();
  if (authProvider === "none" && getSupabaseClientSync()) {
    authProvider = "supabase";
  }
  if (authProvider !== "none") {
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
  initChat((type, payload) => sendCommand(type, payload));
  initMinimap();
  // Legacy quick-teleport panel removed from gameplay HUD.
  initMobileControls(
    core,
    {
      onAttack: () => core.attack(),
      onInteract: () => core.interact(),
      onEquip: () => {
        void openEquipmentPanel();
      },
      onInventory: () => {
        void openInventory();
      },
      onQuests: () => {
        void openQuestLog();
      },
      onSkills: () => {
        void openSkillsPanel();
      },
      onQuickSkill: () => core.useSkill(getQuickCastSkillId()),
      onMap: () => {
        toggleMinimapVisibility();
      },
      onChat: () => {
        focusChatInput();
      },
    },
    (_delta: number) => {},
    (_dx: number, _dy: number) => {}
  );
  performanceMonitor.start();

  let lastFrameTime = performance.now();
  const tick = (now: number) => {
    const dt = Math.min((now - lastFrameTime) / 1000, 0.1);
    lastFrameTime = now;
    core.update(dt);
    if (isMobile()) {
      const j = getJoystickState();
      if (j.active && (Math.abs(j.dx) > 0.04 || Math.abs(j.dy) > 0.04)) {
        core.events.emit("move_intent", { dx: j.dx, dy: j.dy });
      }
    }
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
})();
