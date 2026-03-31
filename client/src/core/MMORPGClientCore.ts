import { IEngineBridge } from "../engine/bridge/IEngineBridge";
import { EntityViewModel } from "../engine/bridge/EntityViewModel";
import { CoreEventBus } from "./CoreEventBus";
import { EntityViewManager } from "./EntityViewManager";

export class MMORPGClientCore {
  private entities: Map<string, EntityViewModel> = new Map();
  private viewManager: EntityViewManager;
  public events: CoreEventBus = new CoreEventBus();
  private localPlayerId: string | null = null;

  constructor(private engine: IEngineBridge) {
    this.viewManager = new EntityViewManager(engine);
    console.log("MMORPG Client Core Initialized with ViewManager");
  }

  private lastDt: number = 0.016;
  private footstepTimer: number = 0;
  private lastPlayerPos: { x: number, y: number, z: number } | null = null;

  public syncEntities(serverEntities: EntityViewModel[]) {
    const currentIds = new Set(this.entities.keys());

    serverEntities.forEach(entity => {
      this.entities.set(entity.id, entity);
      this.viewManager.upsert(entity, this.lastDt);
      currentIds.delete(entity.id);

      // If this is our player, make sure camera follows
      if (entity.id === this.localPlayerId) {
        this.engine.setCameraTarget(entity.id);
      }
    });

    // Remove old
    currentIds.forEach(id => {
      this.entities.delete(id);
      this.viewManager.remove(id);
    });
  }

  public syncChunks(serverChunks: ChunkViewModel[]) {
    const currentIds = new Set(this.chunks.keys());

    serverChunks.forEach(chunk => {
      if (!this.chunks.has(chunk.id)) {
        this.chunks.set(chunk.id, chunk);
        this.engine.createChunk(chunk);
      }
      currentIds.delete(chunk.id);
    });

    // Remove old
    currentIds.forEach(id => {
      this.chunks.delete(id);
      this.engine.destroyChunk(id);
    });
  }

  private chunks: Map<string, ChunkViewModel> = new Map();

  public setLocalPlayer(id: string) {
    this.localPlayerId = id;
    this.engine.setCameraTarget(id);
  }

  public getLocalPlayerId() {
    return this.localPlayerId;
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

    // Play sounds for actions
    if (action === 'attack') {
      const entity = this.entities.get(entityId);
      this.engine.playSound('attack', {
        volume: 0.5,
        position: entity?.position
      });
    } else if (action === 'hit') {
      const entity = this.entities.get(entityId);
      this.engine.playSound('hit', {
        volume: 0.7,
        position: entity?.position
      });
    }
  }

  public handleDialogue(text: string) {
    this.events.emit('dialogue', text);
  }

  public attack() {
    this.events.emit('attack');
  }

  public interact() {
    this.events.emit('interact');
  }

  public registerDefaultInput() {
    this.engine.onInput((input) => {
      this.events.emit('input', input);
    });
  }

  public update(dt: number) {
    this.lastDt = dt;
    this.engine.update(dt);

    // Update navigation to nearest monster
    this.updateNavigation();

    // Update footsteps
    this.updateFootsteps(dt);
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

    // If moving significantly
    if (distMoved > 0.01) {
      this.footstepTimer += dt;
      // Play footstep every 0.4 seconds when moving
      if (this.footstepTimer >= 0.4) {
        this.engine.playSound('footstep', {
          volume: 0.3,
          position: player.position
        });
        this.footstepTimer = 0;
      }
    } else {
      this.footstepTimer = 0.4; // Reset so it plays immediately when starting to move again
    }

    this.lastPlayerPos = { ...player.position };
  }

  private updateNavigation() {
    if (!this.localPlayerId) return;
    const player = this.entities.get(this.localPlayerId);
    if (!player) return;

    let nearestMonster: EntityViewModel | null = null;
    let minDist = Infinity;

    this.entities.forEach(entity => {
      if (entity.type === 'monster') {
        const dx = entity.position.x - player.position.x;
        const dz = entity.position.z - player.position.z;
        const dist = Math.sqrt(dx * dx + dz * dz);
        if (dist < minDist) {
          minDist = dist;
          nearestMonster = entity;
        }
      }
    });

    if (nearestMonster) {
      this.engine.setNavigationTarget(nearestMonster.position);
    } else {
      this.engine.setNavigationTarget(null);
    }
  }
}
