import * as pc from 'playcanvas';
import { createDefaultCamera, createDefaultLight } from './PlayCanvasCameraController';

export function createPlayCanvasApp(canvas: HTMLCanvasElement): pc.Application {
  const app = new pc.Application(canvas, {
    mouse: new pc.Mouse(canvas),
    keyboard: new pc.Keyboard(window),
    touch: new pc.TouchDevice(canvas)
  });

  app.start();
  app.scene.gammaCorrection = pc.GAMMA_SRGB;
  app.scene.toneMapping = pc.TONEMAP_LINEAR;
  app.setCanvasFillMode(pc.FILLMODE_FILL_WINDOW);
  app.setCanvasResolution(pc.RESOLUTION_AUTO);

  // Initial Scene Setup
  createDefaultCamera(app);
  createDefaultLight(app);

  window.addEventListener('resize', () => app.resizeCanvas());

  return app;
}
