import { Application, Container, Graphics, Text } from "pixi.js";
import type { EntityState, WorldViewState } from "../world/entities";
import { worldToChunk } from "../world/chunks";

export interface PixiClientOptions {
  mount: HTMLElement;
  maxFps: number;
  theme: string;
  chunkSize: number;
  interpolationMs: number;
}

export interface PixiClient {
  logicTick(
    tick: { tickId: number; fixedDtSec: number; driftMs?: number },
    viewState: WorldViewState
  ): void;
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

  // Chunk grid layer
  const chunkGrid = new Graphics();
  world.addChild(chunkGrid);

  // Entity layer
  const entityLayer = new Container();
  world.addChild(entityLayer);

  // UI layer (screen space)
  const uiLayer = new Container();
  app.stage.addChild(uiLayer);

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
  uiLayer.addChild(label);

  // Track entity sprites by id
  const entitySprites = new Map<string, Graphics>();
  const prevPositions = new Map<string, { x: number; y: number; time: number }>();

  function drawChunkGrid(cameraX: number, cameraY: number): void {
    chunkGrid.clear();

    const screenW = app.screen.width;
    const screenH = app.screen.height;

    // Draw chunk grid (larger grid)
    chunkGrid.setStrokeStyle({
      width: 2,
      color: 0x00e5ff,
      alpha: 0.15
    });

    const startX = Math.floor((cameraX - screenW / 2) / options.chunkSize) * options.chunkSize;
    const startY = Math.floor((cameraY - screenH / 2) / options.chunkSize) * options.chunkSize;
    const endX = startX + screenW + options.chunkSize * 2;
    const endY = startY + screenH + options.chunkSize * 2;

    for (let x = startX; x <= endX; x += options.chunkSize) {
      chunkGrid.moveTo(x, startY);
      chunkGrid.lineTo(x, endY);
    }

    for (let y = startY; y <= endY; y += options.chunkSize) {
      chunkGrid.moveTo(startX, y);
      chunkGrid.lineTo(endX, y);
    }

    chunkGrid.stroke();
  }

  function getInterpolatedPos(
    entity: EntityState,
    nowMs: number
  ): { x: number; y: number } {
    const prev = prevPositions.get(entity.id);
    const lerpFactor = 0.5; // Simple interpolation toward current position

    if (prev) {
      const timeSinceUpdate = nowMs - prev.time;
      const interpolationFactor = Math.min(timeSinceUpdate / options.interpolationMs, 1);
      const lerp = interpolationFactor * lerpFactor;

      return {
        x: prev.x + (entity.x - prev.x) * lerp,
        y: prev.y + (entity.y - prev.y) * lerp
      };
    }

    return { x: entity.x, y: entity.y };
  }

  function getEntityColor(kind: EntityState["kind"]): number {
    switch (kind) {
      case "player":
        return 0x00e5ff; // cyan
      case "npc":
        return 0x39ff14; // green
      case "loot":
        return 0xff7a00; // orange
      case "marker":
        return 0xff416c; // pink/red
      default:
        return 0xffffff;
    }
  }

  function getEntityRadius(kind: EntityState["kind"]): number {
    switch (kind) {
      case "player":
        return 16;
      case "npc":
        return 12;
      case "loot":
        return 8;
      case "marker":
        return 6;
      default:
        return 10;
    }
  }

  function renderEntities(viewState: WorldViewState, nowMs: number): void {
    const screenW = app.screen.width;
    const screenH = app.screen.height;

    // Get local player position for camera
    const localPlayer = viewState.entities.find((e) => e.id === viewState.localPlayerId);
    const cameraX = localPlayer?.x ?? 0;
    const cameraY = localPlayer?.y ?? 0;

    // Update chunk grid based on camera
    drawChunkGrid(cameraX, cameraY);

    // Calculate center offset
    const offsetX = screenW / 2;
    const offsetY = screenH / 2;

    // Track which entities we've rendered
    const renderedIds = new Set<string>();

    for (const entity of viewState.entities) {
      renderedIds.add(entity.id);

      // Interpolate position
      const interp = getInterpolatedPos(entity, nowMs);

      // Store previous position for interpolation
      prevPositions.set(entity.id, { x: entity.x, y: entity.y, time: nowMs });

      // Calculate screen position relative to camera
      const screenX = offsetX + (interp.x - cameraX);
      const screenY = offsetY + (interp.y - cameraY);

      // Get or create sprite
      let sprite = entitySprites.get(entity.id);
      if (!sprite) {
        sprite = new Graphics();
        entityLayer.addChild(sprite);
        entitySprites.set(entity.id, sprite);
      }

      // Draw entity
      sprite.clear();

      const color = getEntityColor(entity.kind);
      const radius = getEntityRadius(entity.kind);

      sprite.circle(0, 0, radius);
      sprite.fill({ color, alpha: 0.9 });

      // Draw direction indicator for players
      if (entity.kind === "player" && (entity.vx !== 0 || entity.vy !== 0)) {
        const angle = Math.atan2(entity.vy, entity.vx);
        sprite.moveTo(0, 0);
        sprite.lineTo(Math.cos(angle) * radius * 1.4, Math.sin(angle) * radius * 1.4);
        sprite.stroke({ color, width: 3, alpha: 1 });
      }

      sprite.x = screenX;
      sprite.y = screenY;

      // Draw name tag if present
      if (entity.name && entity.kind === "player") {
        const nameText = new Text({
          text: entity.name,
          style: {
            fill: 0xf5f7ff,
            fontSize: 10
          }
        });
        nameText.anchor.set(0.5, 1);
        nameText.x = 0;
        nameText.y = -radius - 2;
        sprite.addChild(nameText);
      }

      // Draw HP bar for NPCs with health
      if (entity.hp !== undefined && entity.maxHp !== undefined && entity.kind === "npc") {
        const barW = 24;
        const barH = 3;
        const hpRatio = entity.hp / entity.maxHp;

        // Background
        sprite.rect(-barW / 2, -radius - 10, barW, barH);
        sprite.fill({ color: 0x333333, alpha: 0.8 });

        // HP fill
        sprite.rect(-barW / 2, -radius - 10, barW * hpRatio, barH);
        sprite.fill({ color: hpRatio > 0.5 ? 0x39ff14 : hpRatio > 0.25 ? 0xff7a00 : 0xff416c });
      }
    }

    // Remove sprites for entities that no longer exist
    for (const [id, sprite] of entitySprites) {
      if (!renderedIds.has(id)) {
        entityLayer.removeChild(sprite);
        entitySprites.delete(id);
        prevPositions.delete(id);
      }
    }
  }

  function destroyEntitySprites(): void {
    for (const sprite of entitySprites.values()) {
      entityLayer.removeChild(sprite);
    }
    entitySprites.clear();
    prevPositions.clear();
  }

  app.renderer.on("resize", () => {
    // Grid will be redrawn on next logicTick
  });

  return {
    logicTick(tick, viewState) {
      const nowMs = performance.now();
      label.text = `Areloria · tick ${tick.tickId} · 10Hz · ${viewState.entities.length} entities`;
      renderEntities(viewState, nowMs);
    },

    destroy() {
      destroyEntitySprites();
      app.destroy(true, { children: true, texture: true });
    },

    getApp() {
      return app;
    }
  };
}