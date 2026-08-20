// Populate window.BABYLON global namespace for legacy IIFE extensions (DynamicTerrain, TreeGenerator)
import "@babylonjs/core/Legacy/legacy";
import {
  ArcRotateCamera,
  Color3,
  Color4,
  CubeTexture,
  Engine,
  HemisphericLight,
  ImageProcessingConfiguration,
  Mesh,
  MeshBuilder,
  Scene,
  StandardMaterial,
  Texture,
  Vector3,
} from "@babylonjs/core";
import {
  DEFAULT_GROUND_BUMP,
  DEFAULT_GROUND_DIFFUSE,
  getPlaygroundTexturesBaseUrl,
  playgroundTextureUrl,
} from "./playgroundTextures";
import { applyTiledGroundTextures, MAIN_GROUND_UV_SCALE } from "./groundTextureUtils";
import { isAndroid, prefersCompactTouchUi } from "../../ui/touchUi";
import type { StudioRender3DProfile } from "../presentation/StudioPresentationConfig";

export type BabylonApp = {
  engine: Engine;
  scene: Scene;
  camera: ArcRotateCamera;
  ground: Mesh;
};

const studioProfiles = new WeakMap<Engine, StudioRender3DProfile>();

export function applyBabylonRenderProfile(app: BabylonApp, profile: StudioRender3DProfile = {}): void {
  studioProfiles.set(app.engine, { ...profile });
  if (Number.isFinite(profile.hardwareScalingLevel) && Number(profile.hardwareScalingLevel) > 0) {
    app.engine.setHardwareScalingLevel(Math.max(0.4, Math.min(4, Number(profile.hardwareScalingLevel))));
  }
  if (Number.isFinite(profile.maxFps)) {
    app.engine.maxFPS = Math.max(0, Math.min(240, Number(profile.maxFps)));
  }
  if (profile.fog !== undefined) {
    app.scene.fogMode = profile.fog ? Scene.FOGMODE_EXP2 : Scene.FOGMODE_NONE;
  }
  if (profile.toneMapping !== undefined) {
    app.scene.imageProcessingConfiguration.toneMappingEnabled = profile.toneMapping;
  }
  if (profile.particles !== undefined) app.scene.particlesEnabled = profile.particles;
  if (profile.shadows !== undefined) app.scene.shadowsEnabled = profile.shadows;
  const renderDistance = profile.renderDistance;
  if (renderDistance === "near") app.camera.maxZ = 450;
  else if (renderDistance === "far") app.camera.maxZ = 2200;
  else if (renderDistance === "normal") app.camera.maxZ = 1100;
  app.scene.metadata = {
    ...(app.scene.metadata ?? {}),
    studioRenderProfile: { ...profile },
    studioPresentationOnly: true,
  };
}

export function createBabylonApp(
  canvas: HTMLCanvasElement,
  options?: { skipGround?: boolean; renderProfile?: StudioRender3DProfile }
): BabylonApp {
  const touchFirst = prefersCompactTouchUi();
  const android = isAndroid();
  const query =
    typeof window !== "undefined" ? new URLSearchParams(window.location.search) : new URLSearchParams();
  const qualityHigh = query.get("quality") === "high";
  const studioProfile = options?.renderProfile ?? {};
  /** Treat large tablets as desktop for resolution when they report fine pointer. */
  const touchButDesktopClass =
    touchFirst && !android && typeof window !== "undefined" && window.innerWidth >= 1024;
  const useMobileRenderBudget = touchFirst && !qualityHigh && !touchButDesktopClass;
  /** `preserveDrawingBuffer` doubles memory bandwidth on many GPUs — avoid on phones (crashes / thermal throttle). */
  const wantScreenshots =
    typeof window !== "undefined" && new URLSearchParams(window.location.search).get("screenshot") === "1";
  const engine = new Engine(canvas, studioProfile.antialias !== false, {
    preserveDrawingBuffer: wantScreenshots,
    /** Stencil + skybox cube map are easy OOM / driver crash targets on Android WebGL. */
    stencil: !(useMobileRenderBudget || android),
    /** Full retina + GLB is too heavy on many phones; scale down internal buffer instead. */
    adaptToDeviceRatio: !useMobileRenderBudget,
  });

  // Handle WebGL context lost (common on Android under memory pressure)
  canvas.addEventListener("webglcontextlost", (event) => {
    event.preventDefault();
    console.warn("[BabylonBoot] WebGL context lost — pausing render loop.");
  });
  canvas.addEventListener("webglcontextrestored", () => {
    console.warn("[BabylonBoot] WebGL context restored — engine will reinitialize.");
    engine.resize();
  });
  if (useMobileRenderBudget) {
    const dpr = typeof window !== "undefined" ? Math.min(2, window.devicePixelRatio || 1) : 1;
    /** Android: extra internal resolution drop — fewer fragment shader invocations. */
    let level = Math.max(1.25, dpr);
    if (android) level = Math.max(2.25, level);
    engine.setHardwareScalingLevel(level);
    /** Cap frame rate harder on Android to reduce thermal throttling and WebGL instability. */
    engine.maxFPS = android ? 24 : 45;
  } else if (!android) {
    const desktopDpr = typeof window !== "undefined" ? Math.max(1, window.devicePixelRatio || 1) : 1;
    // Keep desktop/HiDPI output crisp instead of forcing a 1x internal render buffer.
    engine.setHardwareScalingLevel(1 / desktopDpr);
    engine.maxFPS = 0;
  }

  const scene = new Scene(engine);
  scene.clearColor = new Color4(0.12, 0.18, 0.34, 1);
  scene.ambientColor = new Color3(0.24, 0.28, 0.36);
  scene.fogMode = useMobileRenderBudget ? Scene.FOGMODE_NONE : Scene.FOGMODE_EXP2;
  scene.fogDensity = android ? 0 : 0.006;
  scene.fogColor = new Color3(0.45, 0.58, 0.82);

  if (!android) {
    const ipc = scene.imageProcessingConfiguration;
    ipc.exposure = 1.05;
    ipc.contrast = 1.08;
    ipc.toneMappingEnabled = true;
    ipc.toneMappingType = ImageProcessingConfiguration.TONEMAPPING_KHR_PBR_NEUTRAL;
    ipc.vignetteEnabled = true;
    ipc.vignetteWeight = 0.28;
    ipc.vignetteColor = new Color4(0, 0, 0, 0);
    ipc.vignetteBlendMode = ImageProcessingConfiguration.VIGNETTEMODE_MULTIPLY;
    ipc.ditheringEnabled = true;
    ipc.isEnabled = true;
  }

  const camera = new ArcRotateCamera(
    "MainCamera",
    Math.PI / 2,
    Math.PI / 3,
    18,
    new Vector3(0, 1.5, 0),
    scene
  );
  camera.attachControl(canvas, true);
  camera.lowerRadiusLimit = 5;
  camera.upperRadiusLimit = 40;
  camera.wheelDeltaPercentage = 0.01;

  const light = new HemisphericLight("sun", new Vector3(0.25, 1, 0.15), scene);
  light.intensity = android ? 1.12 : 1.18;
  light.groundColor = new Color3(0.22, 0.24, 0.3);

  // Sky: cube map for all platforms (Bug #5 Fix)
  try {
    const skyBase = `${getPlaygroundTexturesBaseUrl().replace(/\/+$/, "")}/TropicalSunnyDay`;
    const skyTex = new CubeTexture(skyBase, scene);
    const skybox = MeshBuilder.CreateBox("world-skybox", { size: 800 }, scene);
    const skyMat = new StandardMaterial("world-skybox-mat", scene);
    skyMat.backFaceCulling = false;
    skyMat.reflectionTexture = skyTex;
    skyMat.diffuseColor = new Color3(0, 0, 0);
    skyMat.specularColor = new Color3(0, 0, 0);
    skybox.material = skyMat;
    skybox.infiniteDistance = true;
    skybox.isPickable = false;
  } catch (e) {
    console.warn("Skybox load failed, using clear color only", e);
  }

  const ground = options?.skipGround
    ? MeshBuilder.CreateBox("world-ground-placeholder", { size: 0.01 }, scene)
    : MeshBuilder.CreateGround(
        "world-ground",
        { width: 128, height: 128, subdivisions: 2 },
        scene
      );
  if (!options?.skipGround) {
    const groundMat = new StandardMaterial("world-ground-mat", scene);
    groundMat.diffuseTexture = new Texture(playgroundTextureUrl(DEFAULT_GROUND_DIFFUSE), scene, false, false);
    groundMat.bumpTexture = new Texture(playgroundTextureUrl(DEFAULT_GROUND_BUMP), scene, false, false);
    groundMat.diffuseTexture.level = 1;
    applyTiledGroundTextures(groundMat, MAIN_GROUND_UV_SCALE);
    groundMat.diffuseColor = new Color3(0.75, 0.78, 0.72);
    groundMat.specularColor = new Color3(0.02, 0.02, 0.02);
    ground.material = groundMat;
    ground.position.y = -0.02;
  }
  /** Huge pickable ground makes every scene.pick() traverse the terrain; combat/hover use entities only. */
  ground.isPickable = false;

  // Keep a visible orientation anchor even before networked entities arrive.
  const bootAnchor = MeshBuilder.CreateBox("boot-anchor", { size: 1.2 }, scene);
  const anchorMat = new StandardMaterial("boot-anchor-mat", scene);
  anchorMat.diffuseColor = new Color3(0.94, 0.52, 0.18);
  anchorMat.emissiveColor = new Color3(0.14, 0.07, 0.02);
  anchorMat.specularColor = new Color3(0, 0, 0);
  bootAnchor.material = anchorMat;
  bootAnchor.position = new Vector3(0, 0.62, 0);

  const app = { engine, scene, camera, ground };
  applyBabylonRenderProfile(app, studioProfile);

  engine.runRenderLoop(() => {
    scene.render();
  });

  window.addEventListener("resize", () => {
    const activeProfile = studioProfiles.get(engine);
    if (Number.isFinite(activeProfile?.hardwareScalingLevel) && Number(activeProfile?.hardwareScalingLevel) > 0) {
      engine.setHardwareScalingLevel(Number(activeProfile?.hardwareScalingLevel));
    } else if (!useMobileRenderBudget && !android) {
      const desktopDpr = typeof window !== "undefined" ? Math.max(1, window.devicePixelRatio || 1) : 1;
      engine.setHardwareScalingLevel(1 / desktopDpr);
    }
    engine.resize();
  });

  return app;
}
