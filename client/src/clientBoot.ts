import { Engine } from "@babylonjs/core";
import { createBabylonApp } from "./engine/babylon/BabylonBoot";
import { BabylonAdapter } from "./engine/babylon/BabylonAdapter";
import { MMORPGClientCore } from "./core/MMORPGClientCore";
import { connectSocket, requestSceneChange, type ConnectionOptions } from "./networking/websocketClient";
import { IEngineBridge } from "./engine/bridge/IEngineBridge";
import { renderHUD, showDialogue } from "./ui/hud";
import { getJoystickState, initMobileControls, isMobile } from "./ui/mobileControls";
import {
  openEquipmentPanel,
  openInventory,
  openQuestLog,
  openSkillsPanel,
  preloadGamePanels,
} from "./ui/lazyPanels";
import { showBootStatus, showRendererFatalOverlay } from "./bootUi";

function bootEngineBridge(targetCanvas: HTMLCanvasElement): IEngineBridge {
  const app = createBabylonApp(targetCanvas);
  (window as unknown as { babylonScene?: unknown }).babylonScene = app.scene;
  app.engine.onContextLostObservable.add(() => {
    showRendererFatalOverlay({
      title: "Graphics context lost",
      detail:
        "The browser or GPU stopped the WebGL context. Try reloading the page, closing other heavy tabs, or updating graphics drivers. Areloria needs WebGL for Babylon.js.",
      docHref: "https://doc.babylonjs.com/setup/support/webGLSupport",
    });
  });
  console.log("Renderer: Babylon.js");
  return new BabylonAdapter(app.scene, app.camera);
}

export async function bootAreloriaClient(canvas: HTMLCanvasElement): Promise<void> {
  if (!Engine.IsSupported) {
    showRendererFatalOverlay({
      title: "WebGL not available",
      detail:
        "This game needs WebGL (or WebGL2). Try another browser, enable hardware acceleration, or disable extensions that block WebGL.",
      docHref: "https://doc.babylonjs.com/setup/support/webGLSupport",
    });
    return;
  }

  const adapter = bootEngineBridge(canvas);

  const core = new MMORPGClientCore(adapter);
  (window as unknown as { gameCore?: MMORPGClientCore }).gameCore = core;
  core.registerDefaultInput();

  const connectionOptions: ConnectionOptions = {};
  const persistedToken = localStorage.getItem("token");
  if (persistedToken && persistedToken.trim().length > 0) {
    connectionOptions.token = persistedToken;
  }
  connectSocket(core, connectionOptions);
  (window as unknown as { requestSceneChange?: typeof requestSceneChange }).requestSceneChange =
    requestSceneChange;
  renderHUD();
  void import("./ui/mobileSceneTeleportPanel").then((m) => m.renderMobileSceneTeleportPanel());
  preloadGamePanels();

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
      onMap: () => {
        console.log("Map toggled");
      },
      onChat: () => {
        console.log("Chat toggled");
      },
    },
    (_delta: number) => {},
    (_dx: number, _dy: number) => {}
  );

  void import("./utils/PerformanceMonitor").then((m) => m.performanceMonitor.start());

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

  core.events.on("dialogue", (payload: unknown) => {
    showDialogue(payload);
  });

  console.log("Areloria Client Initialized");
}
