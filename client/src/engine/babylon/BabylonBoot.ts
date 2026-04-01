import {
  ArcRotateCamera,
  Color3,
  Color4,
  CubeTexture,
  Engine,
  HemisphericLight,
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

export type BabylonApp = {
  engine: Engine;
  scene: Scene;
  camera: ArcRotateCamera;
};

export function createBabylonApp(canvas: HTMLCanvasElement): BabylonApp {
  const engine = new Engine(canvas, true, {
    preserveDrawingBuffer: true,
    stencil: true,
    adaptToDeviceRatio: true,
  });

  const scene = new Scene(engine);
  scene.clearColor = new Color4(0.15, 0.22, 0.38, 1);
  scene.ambientColor = new Color3(0.22, 0.26, 0.34);

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

  const light = new HemisphericLight("sun", new Vector3(0.2, 1, 0.1), scene);
  light.intensity = 1.05;
  light.groundColor = new Color3(0.2, 0.22, 0.28);

  // Simple skybox from Babylon playground assets (Apache-2.0, same repo as textures)
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

  const ground = MeshBuilder.CreateGround(
    "world-ground",
    { width: 128, height: 128, subdivisions: 2 },
    scene
  );
  const groundMat = new StandardMaterial("world-ground-mat", scene);
  groundMat.diffuseTexture = new Texture(playgroundTextureUrl(DEFAULT_GROUND_DIFFUSE), scene, false, false);
  groundMat.bumpTexture = new Texture(playgroundTextureUrl(DEFAULT_GROUND_BUMP), scene, false, false);
  groundMat.diffuseTexture.level = 1;
  applyTiledGroundTextures(groundMat, MAIN_GROUND_UV_SCALE);
  groundMat.diffuseColor = new Color3(0.75, 0.78, 0.72);
  groundMat.specularColor = new Color3(0.02, 0.02, 0.02);
  ground.material = groundMat;
  ground.position.y = -0.02;

  engine.runRenderLoop(() => {
    scene.render();
  });

  window.addEventListener("resize", () => {
    engine.resize();
  });

  return { engine, scene, camera };
}
