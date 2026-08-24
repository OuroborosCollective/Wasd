import "./styles/tailwind.css";
import { applyBabylonRenderProfile, createBabylonApp, type BabylonApp } from "./engine/babylon/BabylonBoot";
import { BabylonAdapter } from "./engine/babylon/BabylonAdapter";
import { MMORPGClientCore } from "./core/MMORPGClientCore";
import { connectSocket, requestSceneChange, sendCommand, type ConnectionOptions } from "./networking/websocketClient";
import { IEngineBridge } from "./engine/bridge/IEngineBridge";
import { showDialogue } from "./ui/hud";
import { mountNewHud } from "./ui/redesign/MountNewHud";
import { initSupabaseClient, getSupabaseClientSync } from "./auth/supabase";
import { getJoystickState, initMobileControls, isMobile } from "./ui/mobileControls";
import { StudioPresentationEngineBridge } from "./engine/presentation/StudioPresentationEngineBridge";
import {
  getActiveStudio3DRenderProfile,
  loadStudioPresentationFeed,
  startStudioPresentationPolling,
  subscribeStudioPresentation,
} from "./engine/presentation/StudioPresentationConfig";

import { getQuickCastSkillId } from "./game/combatSkills";
import { triggerImpactBusterClientGuard } from "./game/impactBuster";
import { performanceMonitor } from "./utils/PerformanceMonitor";
import { resolveGameAuthProvider } from "./config/gameAuth";
import { initChat, focusChatInput } from "./ui/chat";
import { initMinimap, toggleMinimapVisibility } from "./ui/minimap";
import { worldService } from "./game/world/services";
import { installWorldSurfaceBabylonRenderer } from "./game/WorldSurfaceBabylonRenderer";

type AREPolicyConfig = {
  cooldownMs?: number;
  lowFpsThreshold?: number;
  stableFpsThreshold?: number;
  lowSampleTrigger?: number;
  stableSampleTrigger?: number;
};

let canvas = document.getElementById("application-canvas") as unknown as HTMLCanvasElement;
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

function bootEngineBridge(targetCanvas: HTMLCanvasElement): {
  bridge: IEngineBridge;
  app: BabylonApp;
  studioBridge: StudioPresentationEngineBridge;
} {
  const { profile } = getActiveStudio3DRenderProfile();
  const app = createBabylonApp(targetCanvas, { skipGround: true, renderProfile: profile });
  (window as any).babylonScene = app.scene;
  console.log("Renderer: Babylon (DynamicTerrain enabled; Areloria Studio presentation active)");
  const raw = new BabylonAdapter(app.scene, app.camera);
  const studioBridge = new StudioPresentationEngineBridge(raw);
  return { bridge: studioBridge, app, studioBridge };
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
  showBootStatus("Loading Studio presentation profile...", "info");
  await loadStudioPresentationFeed();
  showBootStatus("Booting renderer...", "info");
  // 1. Boot Engine + presentation-only adapter decorator
  const { bridge: adapter, app: babylonApp, studioBridge } = bootEngineBridge(canvas);
  const stopPresentationPolling = startStudioPresentationPolling(3000);
  const unsubscribeRenderProfile = subscribeStudioPresentation(() => {
    const { name, profile } = getActiveStudio3DRenderProfile();
    applyBabylonRenderProfile(babylonApp, profile);
    showBootStatus(`Studio render profile applied: ${name ?? "default"}`, "ok");
  });
  installWorldSurfaceBabylonRenderer((window as any).babylonScene);
  showBootStatus("Renderer ready. Connecting to world...", "info");

  // Initialize world services (terrain, trees, physics, atmosphere, etc.)
  try {
    const scene = (window as any).babylonScene;
    if (scene) {
      // Find the camera in the scene
      const camera = scene.activeCamera;
      if (camera) {
        await worldService.init(scene, camera);
        console.log("[main] World services initialized.");

        // Wire terrain height to adapter so entities snap to ground (not y=0 underground)
        const terrainAdapter = worldService.worldGen.getTerrainAdapter();
        if (terrainAdapter && adapter.setTerrainHeightFn) {
          adapter.setTerrainHeightFn((x, z) => terrainAdapter.getHeightAt(x, z));
          console.log("[main] Terrain height snapping enabled for entities.");
        }
      }
    }
  } catch (e) {
    console.warn("[main] World service init failed (non-fatal):", e);
  }

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
  mountNewHud(core);
  core.registerDefaultInput();

  await initSupabaseClient();
  const { mountAuthFlow } = await import("./ui/redesign/MountAuth");
  mountAuthFlow((token, charName) => {
    // Identify player in PostHog
    if ((window as any).posthog) {
      (window as any).posthog.identify(charName, { name: charName });
      (window as any).posthog.capture("player_login", { charName });
    }
    const connectionOptions: ConnectionOptions = {
      token,
      charName,
    };
    loadAREPolicyConfig().then((policyConfig) => {
      if (policyConfig) connectionOptions.arePolicyConfig = policyConfig;
      connectSocket(core, connectionOptions);
    });
  });

  (window as any).requestSceneChange = requestSceneChange;

  // Legacy quick-teleport panel removed from gameplay HUD.
  initMobileControls(
    core,
    {
      onAttack: () => core.attack(),
      onInteract: () => core.interact(),
      onEquip: () => {},
      onInventory: () => {},
      onQuests: () => {},
      onSkills: () => {},
      onQuickSkill: () => {
        const quick = getQuickCastSkillId();
        if (quick === "impact_buster") {
          triggerImpactBusterClientGuard();
          return;
        }
        core.useSkill(quick);
      },
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

  window.addEventListener("keydown", (event) => {
    const target = event.target as HTMLElement | null;
    if (
      target &&
      (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)
    ) {
      return;
    }
    if (event.key.toLowerCase() === "f") {
      triggerImpactBusterClientGuard();
    }
  });

  let lastFrameTime = performance.now();
  const tick = (now: number) => {
    const dt = Math.min((now - lastFrameTime) / 1000, 0.1);
    lastFrameTime = now;
    core.update(dt);
    worldService.update();
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

  // Cleanup on page unload
  window.addEventListener("beforeunload", () => {
    stopPresentationPolling();
    unsubscribeRenderProfile();
    studioBridge.dispose();
    worldService.dispose();
  });
} catch (error: any) {
  console.error("Fatal client bootstrap error:", error);
  showBootStatus(`Fatal bootstrap error: ${error?.message || "Unknown error"}`);
}
})();