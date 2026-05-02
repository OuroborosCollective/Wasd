import { IEngineBridge } from "../engine/bridge/IEngineBridge";
import { EntityViewModel } from "../engine/bridge/EntityViewModel";
import { ChunkViewModel } from "./ChunkStreamManager";
import { CoreEventBus } from "./CoreEventBus";
import { EntityViewManager } from "./EntityViewManager";
import { prefersCompactTouchUi } from "../ui/touchUi";
import { getClosestInteractable } from "../utils/interaction";

export interface InteractWorldSnapshot {
  player: { id: string; type: string; position: { x: number; y: number } } | null;
  npcs: Array<{ id: string; type: string; position: { x: number; y: number } }>;
  loot: Array<{ id: string; type: string; position: { x: number; y: number } }>;
}

export class MMORPGClientCore {
  private entities: Map<string, EntityViewModel> = new Map();
  private viewManager: EntityViewManager;
  public events: CoreEventBus = new CoreEventBus();
  private localPlayerId: string | null = null;
  private chunks: Map<string, ChunkViewModel> = new Map();
  private lastDt: number = 0.016;
  private footstepTimer: number = 0;
  private lastPlayerPos: { x: number; y: number; z: number } | null = null;
  private lastNavigationUpdateMs = 0;

  constructor(private engine: IEngineBridge) {
    this.viewManager = new EntityViewManager(engine);
  }

  public syncEntities(serverEntities: EntityViewModel[]) {
    const currentIds = new Set(this.entities.keys());

    serverEntities.forEach((entity) => {
      this.entities.set(entity.id, entity);
      this.viewManager.upsert(entity, this.lastDt);
      currentIds.delete(entity.id);

      if (entity.id === this.localPlayerId) {
        this.engine.setCameraTarget(entity.id);
      }
    });

    currentIds.forEach((id) => {
      this.entities.delete(id);
      this.viewManager.remove(id);
    });
  }

  public syncChunks(serverChunks: ChunkViewModel[]) {
    const currentIds = new Set(this.chunks.keys());

    serverChunks.forEach((chunk) => {
      if (!this.chunks.has(chunk.id)) {
        this.chunks.set(chunk.id, chunk);
        this.engine.createChunk(chunk);
      }
      currentIds.delete(chunk.id);
    });

    currentIds.forEach((id) => {
      this.chunks.delete(id);
      this.engine.destroyChunk(id);
    });
  }

  public setLocalPlayer(id: string) {
    this.localPlayerId = id;
    this.engine.setCameraTarget(id);
  }

  public getLocalPlayerId() {
    return this.localPlayerId;
  }

  public setAREMode(mode: string) {
    if (typeof this.engine.setAREMode === "function") {
      this.engine.setAREMode(mode);
    }
  }

  public setAREPolicyConfig(config: {
    cooldownMs?: number;
    lowFpsThreshold?: number;
    stableFpsThreshold?: number;
    lowSampleTrigger?: number;
    stableSampleTrigger?: number;
  }) {
    if (typeof this.engine.setAREPolicyConfig === "function") {
      this.engine.setAREPolicyConfig(config);
    }
  }

  public teleportLocalPlayerTo(position: { x: number; y: number; z: number }) {
    if (!this.localPlayerId) return;
    const player = this.entities.get(this.localPlayerId);
    if (!player) return;

    player.position = { ...position };
    this.entities.set(this.localPlayerId, player);
    this.viewManager.upsert(player, this.lastDt);
    this.engine.setCameraTarget(this.localPlayerId);
  }

  public handleEntityAction(entityId: string, action: string) {
    this.engine.triggerEntityAction(entityId, action);

    if (action === "attack") {
      const entity = this.entities.get(entityId);
      this.engine.playSound("attack", {
        volume: 0.5,
        position: entity?.position,
      });
    } else if (action === "hit") {
      const entity = this.entities.get(entityId);
      this.engine.playSound("hit", {
        volume: 0.72,
        position: entity?.position,
      });
    }
  }

  public handleDialogue(payload: string | Record<string, unknown>) {
    this.events.emit("dialogue", payload);
  }

  public attack() {
    this.events.emit("attack");
  }

  public getWorldSnapshotForInteract(): InteractWorldSnapshot {
    const playerId = this.localPlayerId;
    const p = playerId ? this.entities.get(playerId) : undefined;
    const npcs: Array<{ id: string; type: string; position: { x: number; y: number } }> = [];
    const loot: Array<{ id: string; type: string; position: { x: number; y: number } }> = [];
    
    this.entities.forEach((e) => {
      if (e.type === "npc") {
        npcs.push({ id: e.id, type: e.type, position: { x: e.position.x, y: e.position.z } });
      } else if (e.type === "loot") {
        loot.push({ id: e.id, type: e.type, position: { x: e.position.x, y: e.position.z } });
      }
    });

    return {
      player: p ? { id: p.id, type: p.type, position: { x: p.position.x, y: p.position.z } } : null,
      npcs,
      loot,
    };
  }

  public interact(entityId?: string | null) {
    const trimmed = typeof entityId === "string" ? entityId.trim() : "";
    const snap = this.getWorldSnapshotForInteract();

    if (trimmed && snap.player) {
      const inLoot = snap.loot.some((l) => l.id === trimmed);
      const inNpc = snap.npcs.some((n) => n.id === trimmed);
      if (inLoot) {
        this.events.emit("interact", {
          kind: "loot" as const,
          lootId: trimmed,
        });
        return;
      }
      if (inNpc) {
        this.events.emit("interact", { kind: "npc" as const, npcId: trimmed });
        return;
      }
      this.events.emit("interact", { kind: "npc" as const, npcId: trimmed });
      return;
    }

    if (snap.player) {
      // TS2345 FIX: Cast snap to any if the interaction helper's internal type expectations for InteractWorldSnapshot differ slightly
      const hit = getClosestInteractable(snap.player as any, snap as any) as any;
      if (hit?.interactionType === "npc" && typeof hit.id === "string") {
        this.events.emit("interact", { kind: "npc" as const, npcId: hit.id });
        return;
      }
      if (hit?.interactionType === "loot" && typeof hit.id === "string") {
        this.events.emit("interact", { kind: "loot" as const, lootId: hit.id });
        return;
      }
    }
    this.events.emit("interact", undefined);
  }

  public useSkill(skillId: string) {
    if (!skillId || !skillId.trim()) return;
    this.events.emit("use_skill", { skillId: skillId.trim() });
  }

  public registerDefaultInput() {
    this.engine.onInput((input) => {
      this.events.emit("input", input);
    });
  }

  public update(dt: number) {
    this.lastDt = dt;
    this.engine.update(dt);
    this.updateNavigation();
    this.updateFootsteps(dt);
  }

  public pulseScreenShakeAndFlash() {
    const anyEngine = this.engine as unknown as {
      pulseScreenShakeAndFlash?: () => void;
    };
    if (typeof anyEngine.pulseScreenShakeAndFlash === "function") {
      anyEngine.pulseScreenShakeAndFlash();
    }
  }

  private updateFootsteps(dt: number) {
    if (!this.localPlayerId) return;
    const player = this.entities.get(this.localPlayerId);
    if (!player) return;

    if (!this.lastPlayerPos) {
      this.lastPlayerPos = { ...player.position };
      return;
    }

    const dx = player.position.x - this.lastPlayerPos.x;
    const dz = player.position.z - this.lastPlayerPos.z;
    const distMoved = Math.sqrt(dx * dx + dz * dz);

    if (distMoved > 0.01) {
      this.footstepTimer += dt;
      if (this.footstepTimer >= 0.4) {
        this.engine.playSound("footstep", {
          volume: 0.3,
          position: player.position,
        });
        this.footstepTimer = 0;
      }
    } else {
      this.footstepTimer = 0.4;
    }

    this.lastPlayerPos = { ...player.position };
  }

  private updateNavigation() {
    if (!this.localPlayerId) return;
    const now = typeof performance !== "undefined" ? performance.now() : Date.now();
    const minIntervalMs = prefersCompactTouchUi() ? 280 : 90;
    if (now - this.lastNavigationUpdateMs < minIntervalMs) return;
    this.lastNavigationUpdateMs = now;

    const player = this.entities.get(this.localPlayerId);
    if (!player) return;

    let nearestMonster: EntityViewModel | null = null;
    let minDist = Infinity;

    for (const entity of this.entities.values()) {
      if (entity.type !== "npc") continue;
      const threat = entity.combatThreat === true;
      const dummy = entity.id === "npc_dummy";
      if (!threat && !dummy) continue;
      
      const dx = entity.position.x - player.position.x;
      const dz = entity.position.z - player.position.z;
      const dist = Math.sqrt(dx * dx + dz * dz);
      if (dist < minDist) {
        minDist = dist;
        nearestMonster = entity;
      }
    }

    if (nearestMonster) {
      this.engine.setNavigationTarget(nearestMonster.position);
    } else {
      this.engine.setNavigationTarget(null);
    }
  }
}