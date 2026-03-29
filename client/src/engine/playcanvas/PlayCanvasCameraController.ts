import * as pc from 'playcanvas';

export class PlayCanvasCameraController {
  private target: pc.Entity | null = null;
  private offset: pc.Vec3 = new pc.Vec3(0, 15, 15);
  private smoothing = 0.1;

  constructor(private camera: pc.Entity) {}

  setTarget(target: pc.Entity) {
    this.target = target;
    console.log("Camera target set to:", target.name);
  }

  update(dt: number) {
    if (!this.target) return;

    const targetPos = this.target.getPosition();
    const desiredPos = new pc.Vec3().add2(targetPos, this.offset);
    const currentPos = this.camera.getPosition();

    // Smooth lerp
    const newPos = new pc.Vec3().lerp(currentPos, desiredPos, this.smoothing);
    this.camera.setPosition(newPos);
    this.camera.lookAt(targetPos);
  }
}

export function createDefaultCamera(app: pc.Application): pc.Entity {
  const camera = new pc.Entity('MainCamera');
  camera.addComponent('camera', {
    clearColor: new pc.Color(0.08, 0.08, 0.1),
    farClip: 1000,
    nearClip: 0.1,
    fov: 45
  });

  // Shadows quality improvement
  const graphicsDevice = app.graphicsDevice;
  app.scene.shadowDistance = 50; // Focused shadow distance for quality

  camera.setPosition(0, 18, 18);
  camera.lookAt(0, 0, 0);
  app.root.addChild(camera);
  return camera;
}

export function createDefaultLight(app: pc.Application): pc.Entity {
  const light = new pc.Entity('DirectionalLight');
  light.addComponent('light', {
    type: 'directional',
    color: new pc.Color(1, 0.9, 0.8), // Slightly warm sun
    intensity: 1.5,
    castShadows: true,
    shadowDistance: 60,
    shadowResolution: 2048, // High res shadows
    shadowBias: 0.1,
    shadowUpdateMode: pc.SHADOWUPDATE_REALTIME,
    vsmBlurSize: 11 // Soft VSM shadows
  });

  light.setEulerAngles(45, 135, 0);
  app.root.addChild(light);

  // Ambient light
  app.scene.ambientLight = new pc.Color(0.2, 0.2, 0.3);

  return light;
}
