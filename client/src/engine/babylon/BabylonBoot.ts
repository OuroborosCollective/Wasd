import {
  ArcRotateCamera,
  Color3,
  Color4,
  Engine,
  HemisphericLight,
  MeshBuilder,
  Scene,
  StandardMaterial,
  Vector3,
} from "@babylonjs/core";

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
  scene.clearColor = new Color4(0.05, 0.06, 0.09, 1);

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
  light.intensity = 0.9;

  const ground = MeshBuilder.CreateGround(
    "world-ground",
    { width: 128, height: 128, subdivisions: 2 },
    scene
  );
  const groundMat = new StandardMaterial("world-ground-mat", scene);
  groundMat.diffuseColor = new Color3(0.16, 0.18, 0.2);
  groundMat.specularColor = new Color3(0, 0, 0);
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
