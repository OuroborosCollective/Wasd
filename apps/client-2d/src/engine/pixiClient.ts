import { Application, Container, Graphics, Text } from "pixi.js";

export interface PixiClientOptions {
  mount: HTMLElement;
  maxFps: number;
  theme: string;
}

export interface PixiClient {
  logicTick(tick: { tickId: number; fixedDtSec: number }): void;
  destroy(): void;
  getApp(): Application | null;
}

export async function createPixiClient(
  options: PixiClientOptions
): Promise<PixiClient> {
  const app = new Application();

  await app.init({
    resizeTo: options.mount,
    antialias: true,
    autoDensity: true,
    resolution: Math.min(window.devicePixelRatio || 1, 2),
    backgroundColor: 0x070711
  });

  options.mount.appendChild(app.canvas as HTMLCanvasElement);

  app.ticker.maxFPS = options.maxFps;

  const world = new Container();
  app.stage.addChild(world);

  // Draw grid
  const grid = new Graphics();
  world.addChild(grid);

  // Center marker
  const centerMarker = new Graphics();
  centerMarker.circle(0, 0, 14);
  centerMarker.fill(0x00e5ff);
  centerMarker.x = app.screen.width / 2;
  centerMarker.y = app.screen.height / 2;
  world.addChild(centerMarker);

  // Debug label
  const label = new Text({
    text: "Areloria · REAL_PIXI_CLIENT",
    style: {
      fill: 0xf5f7ff,
      fontSize: 14
    }
  });

  label.x = 16;
  label.y = 16;
  app.stage.addChild(label);

  function drawGrid(): void {
    grid.clear();

    const size = 64;
    const width = app.screen.width;
    const height = app.screen.height;

    grid.setStrokeStyle({
      width: 1,
      color: 0x00e5ff,
      alpha: 0.12
    });

    for (let x = 0; x <= width; x += size) {
      grid.moveTo(x, 0);
      grid.lineTo(x, height);
    }

    for (let y = 0; y <= height; y += size) {
      grid.moveTo(0, y);
      grid.lineTo(width, y);
    }

    grid.stroke();
  }

  drawGrid();

  app.renderer.on("resize", drawGrid);

  let phase = 0;

  app.ticker.add((ticker) => {
    phase += ticker.deltaTime * 0.04;
    centerMarker.scale.set(1 + Math.sin(phase) * 0.035);
  });

  return {
    logicTick(tick) {
      label.text = `Areloria · tick ${tick.tickId} · 10Hz`;
    },

    destroy() {
      app.destroy(true, { children: true, texture: true });
    },

    getApp() {
      return app;
    }
  };
}