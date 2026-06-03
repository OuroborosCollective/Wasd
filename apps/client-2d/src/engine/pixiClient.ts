import { Application, Container, Graphics, Text } from "pixi.js";
import type { EntityState, WorldViewState } from "../world/entities";
import type { CombatFxInstance } from "../fx/combatFx";
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
    viewState: WorldViewState,
    combatFx?: CombatFxInstance[]
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
  const entityLabels = new Map<string, Text>();
  const entityHpBars = new Map<string, Graphics>();
  const combatFxTexts = new Map<string, Text>();
  const prevPositions = new Map<string, { x: number; y: number; time: number }>();

  function getEntityColor(kind: EntityState["kind"], isLocal: boolean): number {
    if (isLocal) return 0x00e5ff; // cyan for local player
    switch (kind) {
      case "player":
        return 0x39ff14; // green for remote players
      case "npc":
        return 0xff6b35; // fire orange for NPCs
      case "loot":
        return 0xffd700; // yellow for loot
      case "marker":
        return 0xff416c; // pink/red for markers
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

      // Check if this is the local player
      const isLocal = entity.id === viewState.localPlayerId;

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

      const color = getEntityColor(entity.kind, isLocal);
      const radius = getEntityRadius(entity.kind);

      sprite.circle(0, 0, radius);
      sprite.fill({ color, alpha: 0.9 });

      // Draw ring for local player
      if (isLocal) {
        sprite.circle(0, 0, radius + 4);
        sprite.stroke({ color: 0x00e5ff, width: 2, alpha: 0.5 });
      }

      // Draw direction indicator for players
      if (entity.kind === "player" && (entity.vx !== 0 || entity.vy !== 0)) {
        const angle = Math.atan2(entity.vy, entity.vx);
        sprite.moveTo(0, 0);
        sprite.lineTo(Math.cos(angle) * radius * 1.4, Math.sin(angle) * radius * 1.4);
        sprite.stroke({ color, width: 3, alpha: 1 });
      }

      sprite.x = screenX;
      sprite.y = screenY;

      // Draw name label for all entities with names
      if (entity.name) {
        let label = entityLabels.get(entity.id);
        if (!label) {
          label = new Text({
            text: entity.name,
            style: {
              fill: 0xf5f7ff,
              fontSize: 10,
              fontWeight: "bold"
            }
          });
          label.anchor.set(0.5, 1);
          entityLayer.addChild(label);
          entityLabels.set(entity.id, label);
        }
        label.text = entity.name;
        label.x = screenX;
        label.y = screenY - radius - 2;
        label.visible = true;
      } else {
        const label = entityLabels.get(entity.id);
        if (label) {
          label.visible = false;
        }
      }

      // Draw HP bar if entity has health
      if (entity.hp !== undefined && entity.maxHp !== undefined) {
        let hpBar = entityHpBars.get(entity.id);
        if (!hpBar) {
          hpBar = new Graphics();
          entityLayer.addChild(hpBar);
          entityHpBars.set(entity.id, hpBar);
        }

        const barW = 28;
        const barH = 4;
        const hpRatio = Math.max(0, entity.hp / entity.maxHp);

        hpBar.clear();

        // Background
        hpBar.rect(-barW / 2, -radius - 14, barW, barH);
        hpBar.fill({ color: 0x1a1a2e, alpha: 0.8 });

        // HP fill
        const hpColor = hpRatio > 0.5 ? 0x39ff14 : hpRatio > 0.25 ? 0xff7a00 : 0xff416c;
        hpBar.rect(-barW / 2, -radius - 14, barW * hpRatio, barH);
        hpBar.fill({ color: hpColor });

        hpBar.x = screenX;
        hpBar.y = screenY;
        hpBar.visible = true;
      } else {
        const hpBar = entityHpBars.get(entity.id);
        if (hpBar) {
          hpBar.visible = false;
        }
      }
    }

    // Remove sprites for entities that no longer exist
    for (const [id, sprite] of entitySprites) {
      if (!renderedIds.has(id)) {
        entityLayer.removeChild(sprite);
        entitySprites.delete(id);
        prevPositions.delete(id);

        const label = entityLabels.get(id);
        if (label) {
          entityLayer.removeChild(label);
          entityLabels.delete(id);
        }

        const hpBar = entityHpBars.get(id);
        if (hpBar) {
          entityLayer.removeChild(hpBar);
          entityHpBars.delete(id);
        }
      }
    }
  }

  function renderCombatFx(effects: CombatFxInstance[], viewState: WorldViewState): void {
    const screenW = app.screen.width;
    const screenH = app.screen.height;

    // Get local player position for camera
    const localPlayer = viewState.entities.find((e) => e.id === viewState.localPlayerId);
    const cameraX = localPlayer?.x ?? 0;
    const cameraY = localPlayer?.y ?? 0;

    const offsetX = screenW / 2;
    const offsetY = screenH / 2;

    const renderedFxIds = new Set<string>();

    for (const fx of effects) {
      renderedFxIds.add(fx.id);

      const screenX = offsetX + (fx.x - cameraX);
      const screenY = offsetY + (fx.y - cameraY);

      const alpha = 1 - fx.ageTicks / fx.maxAgeTicks;

      let text = combatFxTexts.get(fx.id);
      if (!text) {
        text = new Text({
          text: fx.text,
          style: {
            fontSize: 16,
            fontWeight: "bold",
            fill: fx.kind === "damage" ? 0xff416c : fx.kind === "heal" ? 0x39ff14 : 0xf5f7ff,
            stroke: { color: 0x000000, width: 3 }
          }
        });
        text.anchor.set(0.5, 0.5);
        entityLayer.addChild(text);
        combatFxTexts.set(fx.id, text);
      }

      text.text = fx.text;
      text.x = screenX;
      text.y = screenY;
      text.alpha = alpha;
      text.visible = true;
    }

    // Remove old combat FX
    for (const [id, text] of combatFxTexts) {
      if (!renderedFxIds.has(id)) {
        entityLayer.removeChild(text);
        combatFxTexts.delete(id);
      }
    }
  }

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

    for (const label of entityLabels.values()) {
      entityLayer.removeChild(label);
    }
    entityLabels.clear();

    for (const hpBar of entityHpBars.values()) {
      entityLayer.removeChild(hpBar);
    }
    entityHpBars.clear();

    for (const text of combatFxTexts.values()) {
      entityLayer.removeChild(text);
    }
    combatFxTexts.clear();
  }

  app.renderer.on("resize", () => {
    // Grid will be redrawn on next logicTick
  });

  return {
    logicTick(tick, viewState, combatFx = []) {
      const nowMs = performance.now();
      label.text = `Areloria · tick ${tick.tickId} · 10Hz · ${viewState.entities.length} entities`;
      renderEntities(viewState, nowMs);
      renderCombatFx(combatFx, viewState);
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