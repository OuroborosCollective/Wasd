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
    const resolution = 128;
    const device = app.graphicsDevice;

    const cubemap = new pc.Texture(device, {
        width: resolution,
        height: resolution,
        format: pc.PIXELFORMAT_R8_G8_B8_A8,
        cubemap: true,
        fixCubemapSeams: true,
        mipmaps: true
    });

    const canvas = document.createElement('canvas');
    canvas.width = resolution;
    canvas.height = resolution;
    const ctx = canvas.getContext('2d')!;

    // Face mapping: +X, -X, +Y, -Y, +Z, -Z
    // For each face, we define the forward, right, and up vectors
    const faces = [
        { forward: [ 1,  0,  0], right: [ 0,  0, -1], up: [ 0, -1,  0] }, // +X
        { forward: [-1,  0,  0], right: [ 0,  0,  1], up: [ 0, -1,  0] }, // -X
        { forward: [ 0,  1,  0], right: [ 1,  0,  0], up: [ 0,  0,  1] }, // +Y
        { forward: [ 0, -1,  0], right: [ 1,  0,  0], up: [ 0,  0, -1] }, // -Y
        { forward: [ 0,  0,  1], right: [ 1,  0,  0], up: [ 0, -1,  0] }, // +Z
        { forward: [ 0,  0, -1], right: [-1,  0,  0], up: [ 0, -1,  0] }  // -Z
    ];

    // Colors
    const zenithColor = [0x02, 0x02, 0x05];
    const horizonColor = [0x08, 0x10, 0x20];
    const nadirColor = [0x10, 0x20, 0x40];

    const lerpColor = (c1: number[], c2: number[], t: number) => {
        return [
            Math.round(c1[0] + (c2[0] - c1[0]) * t),
            Math.round(c1[1] + (c2[1] - c1[1]) * t),
            Math.round(c1[2] + (c2[2] - c1[2]) * t)
        ];
    };

    for (let faceIdx = 0; faceIdx < 6; faceIdx++) {
        const face = faces[faceIdx];
        const imageData = ctx.createImageData(resolution, resolution);
        const data = imageData.data;

        for (let y = 0; y < resolution; y++) {
            // v goes from 1 to -1
            const v = 1.0 - (y / (resolution - 1)) * 2.0;

            for (let x = 0; x < resolution; x++) {
                // u goes from -1 to 1
                const u = (x / (resolution - 1)) * 2.0 - 1.0;

                // Calculate direction vector for this pixel
                let dirX = face.forward[0] + face.right[0] * u + face.up[0] * v;
                let dirY = face.forward[1] + face.right[1] * u + face.up[1] * v;
                let dirZ = face.forward[2] + face.right[2] * u + face.up[2] * v;

                // Normalize
                const len = Math.sqrt(dirX * dirX + dirY * dirY + dirZ * dirZ);
                dirY /= len;

                // Map Y from [-1, 1] to a gradient
                // zenith is dirY = 1, horizon is dirY = 0, nadir is dirY = -1
                let color;
                if (dirY > 0) {
                    // Horizon to Zenith (0 to 1) -> 0 to 1 for t
                    color = lerpColor(horizonColor, zenithColor, dirY);
                } else {
                    // Nadir to Horizon (-1 to 0) -> 0 to 1 for t
                    color = lerpColor(nadirColor, horizonColor, dirY + 1);
                }

                const pixelIdx = (y * resolution + x) * 4;
                data[pixelIdx] = color[0];     // R
                data[pixelIdx + 1] = color[1]; // G
                data[pixelIdx + 2] = color[2]; // B
                data[pixelIdx + 3] = 255;      // A
            }
        }

        ctx.putImageData(imageData, 0, 0);
        cubemap.setSource(canvas, faceIdx);
    }

    app.scene.skybox = cubemap;
}
