import * as pc from 'playcanvas';
import { createDefaultCamera, createDefaultLight } from './PlayCanvasCameraController';

export function createPlayCanvasApp(canvas: HTMLCanvasElement): pc.Application {
  const app = new pc.Application(canvas, {
    mouse: new pc.Mouse(canvas),
    keyboard: new pc.Keyboard(window),
    touch: new pc.TouchDevice(canvas),
    graphicsDeviceOptions: {
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance'
    }
  });

  app.start();

  // Clustered Lighting (Optimized for many lights)
  app.scene.layers.getLayerByName("World")!.id; // Ensure World layer exists
  app.scene.lighting.cells = new pc.Vec3(10, 3, 10);
  app.scene.lighting.maxLightsPerCell = 8;
  app.scene.lighting.shadowsEnabled = true;

  // Visual Setup
  app.scene.gammaCorrection = pc.GAMMA_SRGB;
  app.scene.toneMapping = pc.TONEMAP_ACES; // ACES for more cinematic look
  app.scene.exposure = 1.0;
  app.scene.skyboxIntensity = 0.5;

  app.setCanvasFillMode(pc.FILLMODE_FILL_WINDOW);
  app.setCanvasResolution(pc.RESOLUTION_AUTO);

  // Initial Scene Setup
  createDefaultCamera(app);
  createDefaultLight(app);

  // Create a procedural skybox (gradient)
  createProceduralSkybox(app);

  window.addEventListener('resize', () => app.resizeCanvas());

  return app;
}

function createProceduralSkybox(app: pc.Application) {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    if (ctx) {
        const gradient = ctx.createLinearGradient(0, 0, 0, 128);
        gradient.addColorStop(0, '#020205'); // Zenith
        gradient.addColorStop(0.5, '#081020'); // Horizon
        gradient.addColorStop(1, '#102040'); // Nadir
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 128, 128);
    }

    const texture = new pc.Texture(app.graphicsDevice, {
        width: 128,
        height: 128,
        format: pc.PIXELFORMAT_R8_G8_B8_A8,
        addressU: pc.ADDRESS_CLAMP_TO_EDGE,
        addressV: pc.ADDRESS_CLAMP_TO_EDGE
    });
    texture.setSource(canvas);

    // Simple cubemap from single texture (hack for procedural sky)
    const cubemap = new pc.Texture(app.graphicsDevice, {
        width: 128,
        height: 128,
        cubemap: true,
        format: pc.PIXELFORMAT_R8_G8_B8_A8,
        fixCubemapSeams: true
    });

    for (let i = 0; i < 6; i++) {
        cubemap.setSource(canvas, i);
    }

    app.scene.skybox = cubemap;
}
