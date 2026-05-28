/**
 * @file server/src/core/api/APIServer.ts
 * @description High-performance API Server.
 * Provides REST endpoints and WebSocket integration.
 *
 * Uses existing Express server if available.
 */

import { worldStateRegistry } from '../state/WorldStateRegistry.js';
import { arelorianKernel } from '../systems/ArelorianKernel.js';
import { deterministicNow } from '../determinism/AREDeterminism.js';

/**
 * Fixed-Point constant (kappa=1000)
 */
const FP_SCALE = 1000;
const WORLD_COORD_LIMIT = 7;
const FREE_STARTER_NPC_COUNT = 13;

/**
 * Convert from Fixed-Point
 */
function fromFP(fp: number): number {
  return fp / FP_SCALE;
}

function clampWorldCoord(value: number): number {
  return Math.max(-WORLD_COORD_LIMIT, Math.min(WORLD_COORD_LIMIT, Math.trunc(value)));
}

function clampMoveDelta(value: unknown): number {
  const numeric = Number(value ?? 0);
  if (!Number.isFinite(numeric)) return 0;
  return Math.max(-1, Math.min(1, Math.trunc(numeric)));
}

function deterministicHash(parts: Array<string | number | null | undefined>): number {
  let hash = 2166136261;
  for (const part of parts) {
    const text = String(part ?? '');
    for (let i = 0; i < text.length; i++) {
      hash ^= text.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    hash ^= 1249;
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

/**
 * API Key configuration
 */
const API_KEY_HEADER = 'x-api-key';

const DEFAULT_SKILL_COOLDOWN_TICKS: Record<string, number> = {
  atk: 10,
  def: 50,
  mag: 30,
  int: 0,
};

type EquipmentState = {
  itemId: string | null;
  weaponVisualId: string | null;
};

type PlayerPositionState = {
  x: number;
  z: number;
};

type StarterNpcRole = 'merchant' | 'blacksmith' | 'forager' | 'scout' | 'builder' | 'guard' | 'herbalist' | 'wanderer' | 'miner' | 'cook' | 'scribe';

type StarterNpcTemplate = {
  id: string;
  name: string;
  role: StarterNpcRole;
  x: number;
  z: number;
  fixed: boolean;
  functionTag?: string;
  services?: string[];
  fateGoal?: string;
};

type SkillCooldownState = Record<string, number>;

const FIXED_STARTER_NPCS: StarterNpcTemplate[] = [
  {
    id: 'starter-merchant-mara',
    name: 'Mara the Provisioner',
    role: 'merchant',
    x: -1,
    z: 2,
    fixed: true,
    functionTag: 'starter_trade',
    services: ['sell_rations', 'buy_basic_loot', 'starter_supplies'],
    fateGoal: 'keep new players supplied',
  },
  {
    id: 'starter-smith-brann',
    name: 'Brann the Smith',
    role: 'blacksmith',
    x: 1,
    z: 2,
    fixed: true,
    functionTag: 'starter_smithing',
    services: ['crafting_tutorial', 'weapon_salvage', 'basic_repairs', 'anvil_access'],
    fateGoal: 'teach crafting and salvage weapons',
  },
];

const FREE_NPC_NAMES = ['Talia Reed', 'Old Fen', 'Korrin Vale', 'Mika Thorne', 'Sera Moss', 'Jonn Ash', 'Pip Barley', 'Nara Flint', 'Edda Brook', 'Rowan Pike', 'Lio Fern', 'Veyra Stone', 'Tomm Brindle'];
const FREE_NPC_ROLES: StarterNpcRole[] = ['forager', 'scout', 'builder', 'guard', 'herbalist', 'wanderer', 'miner', 'cook', 'scribe'];
const FREE_NPC_GOALS = ['map the meadow edge', 'gather food', 'seek a guild', 'protect the road', 'study the ruins', 'find better work', 'trade rumors', 'repair a hut', 'search for herbs', 'avoid danger'];
const FREE_NPC_ACTIONS = ['wandering', 'foraging', 'resting', 'talking', 'watching road', 'learning', 'seeking work', 'inspecting village'];

const FREE_STARTER_NPCS: StarterNpcTemplate[] = Array.from({ length: FREE_STARTER_NPC_COUNT }, (_, index) => {
  const role = FREE_NPC_ROLES[deterministicHash(['starter-free-npc-role', index]) % FREE_NPC_ROLES.length];
  return {
    id: `starter-free-${index + 1}`,
    name: FREE_NPC_NAMES[index] ?? `Settler ${index + 1}`,
    role,
    x: -4 + (index % 5) * 2,
    z: -3 + Math.floor(index / 5) * 2,
    fixed: false,
    fateGoal: FREE_NPC_GOALS[deterministicHash(['starter-free-npc-goal', index]) % FREE_NPC_GOALS.length],
  };
});

function parseCsvEnv(value: string | undefined): string[] {
  return (value ?? '')
    .split(',')
    .map(entry => entry.trim())
    .filter(Boolean);
}

function getValidApiKeys(): Set<string> {
  const keys = parseCsvEnv(process.env.API_KEYS ?? process.env.API_KEY);

  if (process.env.NODE_ENV === 'production' && keys.length === 0) {
    throw new Error('API_KEY or API_KEYS must be configured in production.');
  }

  return new Set(keys);
}

function isAuthorizedRequest(req: any): boolean {
  const validApiKeys = getValidApiKeys();
  if (validApiKeys.size === 0) {
    return process.env.NODE_ENV !== 'production';
  }

  const headerValue = req.headers?.[API_KEY_HEADER];
  const candidate = Array.isArray(headerValue) ? headerValue[0] : headerValue;
  return typeof candidate === 'string' && validApiKeys.has(candidate);
}

function requireApiKey(req: any, res: any, next: any): void {
  if (isAuthorizedRequest(req)) {
    next();
    return;
  }

  res.status(401).json({ error: 'Unauthorized' });
}

function getAllowedOrigins(): string[] | boolean {
  const configured = parseCsvEnv(process.env.ALLOWED_ORIGINS ?? process.env.CORS_ORIGINS);
  if (configured.length > 0) return configured;

  if (process.env.NODE_ENV === 'production') {
    throw new Error('ALLOWED_ORIGINS or CORS_ORIGINS must be configured in production.');
  }

  return [
    'http://localhost:3000',
    'http://localhost:3001',
    'http://localhost:5173',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:3001',
    'http://127.0.0.1:5173',
  ];
}

/**
 * World heartbeat broadcast interval (10 ticks = 1 second)
 */
const HEARTBEAT_INTERVAL = 10;

/**
 * APIServer - Express + Socket.io server
 */
export class APIServer {
  private tickCounter = 0;
  private lastPhaseStates: Map<string, string> = new Map();
  private io: any = null;
  private equipmentBySocket: Map<string, EquipmentState> = new Map();
  private playerPositionsBySocket: Map<string, PlayerPositionState> = new Map();
  private skillCooldownsBySocket: Map<string, SkillCooldownState> = new Map();

  /**
   * Initialize with existing Express app
   */
  public initialize(expressApp: any, httpServer: any): void {
    this.setupRoutes(expressApp);
    this.setupSocketIO(httpServer);
  }

  /**
   * Setup REST routes
   */
  private setupRoutes(app: any): void {
    if (!app) return;

    // Health endpoint (public)
    app.get('/health', (req: any, res: any) => {
      res.json({ ok: true, timestamp: deterministicNow(worldStateRegistry.getTick()) });
    });

    // World status (protected)
    app.get('/api/v1/world/status', requireApiKey, (req: any, res: any) => {
      const worldState = worldStateRegistry.getCurrentState();

      // Calculate global energy
      let totalEnergy = 0;
      let totalCorruption = 0;
      let regionCount = 0;

      for (const [, region] of worldState.regions) {
        totalEnergy += region.matrixEnergyBalance;
        totalCorruption += region.visualCorruptionState;
        regionCount++;
      }

      const avgCorruption = regionCount > 0 ? totalCorruption / regionCount : 0;

      res.json({
        tick: Number(worldStateRegistry.getTick()),
        tickRate: arelorianKernel.getTickRate(),
        totalEnergy: fromFP(totalEnergy),
        totalRegions: regionCount,
        avgCorruption: fromFP(avgCorruption),
      });
    });

    // Region details (protected)
    app.get('/api/v1/regions/:id', requireApiKey, (req: any, res: any) => {
      const regionId = req.params.id;
      const worldState = worldStateRegistry.getCurrentState();
      const region = worldState.regions.get(regionId);

      if (!region) {
        return res.status(404).json({ error: 'Region not found' });
      }

      res.json({
        id: regionId,
        stability: region.stabilityLevel,
        energy: fromFP(region.matrixEnergyBalance),
        infrastructure: fromFP(region.infrastructureLevel),
        threat: fromFP(region.threatLevel),
        visualCorruption: fromFP(region.visualCorruptionState),
        tradeFlow: fromFP(region.tradeFlowIntensity),
        oraclePressures: region.oraclePressureTags,
        plexity: this.calculatePlexity(region),
      });
    });
  }

  /**
   * Setup Socket.io
   */
  private setupSocketIO(server: any): void {
    if (!server) return;

    // Dynamic import Socket.io
    import('socket.io').then(({ Server }) => {
      this.io = new Server(server, {
        cors: {
          origin: getAllowedOrigins(),
          methods: ['GET', 'POST'],
          credentials: false,
        },
      });

      this.io.on('connection', (socket: any) => {
        console.log(`[ws] Client connected: ${socket.id}`);
        this.ensureSkillCooldowns(socket.id);
        this.ensurePlayerPosition(socket.id);
        socket.emit('WORLD_STATE', this.getWorldStateSnapshot(socket.id));
        socket.emit('WORLD_HEARTBEAT', this.getHeartbeatPayload(socket.id));

        socket.on('intent:equip', (payload: any) => this.handleEquipIntent(socket, payload));
        socket.on('player_action', (payload: any) => this.handlePlayerAction(socket, payload));
        socket.on('disconnect', () => {
          this.equipmentBySocket.delete(socket.id);
          this.playerPositionsBySocket.delete(socket.id);
          this.skillCooldownsBySocket.delete(socket.id);
        });
      });
    }).catch(console.error);
  }

  private handleEquipIntent(socket: any, payload: any): void {
    const itemId = typeof payload?.itemId === 'string' ? payload.itemId.slice(0, 96) : null;
    const weaponVisualId = typeof payload?.weaponVisualId === 'string' ? payload.weaponVisualId.slice(0, 128) : null;
    if (!itemId && !weaponVisualId) return;

    const nextState = { itemId, weaponVisualId };
    this.equipmentBySocket.set(socket.id, nextState);

    socket.emit('EQUIP_ACCEPTED', {
      playerId: socket.id,
      itemId,
      weaponVisualId,
      tick: Number(worldStateRegistry.getTick()),
    });
    socket.emit('WORLD_HEARTBEAT', this.getHeartbeatPayload(socket.id));
  }

  private handlePlayerAction(socket: any, payload: any): void {
    const action = typeof payload?.action === 'string' ? payload.action : '';
    if (action === 'MOVE') {
      this.handleMoveAction(socket, payload?.payload ?? {});
      return;
    }

    if (action === 'USE_SKILL') {
      this.handleSkillAction(socket, payload?.payload ?? {});
      return;
    }

    if (action === 'interact' || action === 'INTERACT') {
      this.handleInteractAction(socket, payload?.payload ?? {});
    }
  }

  private handleMoveAction(socket: any, payload: any): void {
    const dx = clampMoveDelta(payload?.dx);
    const dz = clampMoveDelta(payload?.dz);
    if (!dx && !dz) return;

    const current = this.ensurePlayerPosition(socket.id);
    const next = {
      x: clampWorldCoord(current.x + dx),
      z: clampWorldCoord(current.z + dz),
    };
    this.playerPositionsBySocket.set(socket.id, next);

    const tick = Number(worldStateRegistry.getTick());
    socket.emit('PLAYER_MOVED', {
      playerId: socket.id,
      x: next.x,
      z: next.z,
      dx,
      dz,
      tick,
    });
    socket.emit('WORLD_HEARTBEAT', this.getHeartbeatPayload(socket.id));
  }

  private handleSkillAction(socket: any, payload: any): void {
    const skillId = typeof payload?.skillId === 'string' ? payload.skillId : null;
    if (!skillId) return;

    const cooldowns = this.ensureSkillCooldowns(socket.id);
    const currentCooldownTicks = Math.max(0, Math.trunc(cooldowns[skillId] ?? 0));
    if (currentCooldownTicks > 0) {
      socket.emit('SKILL_UPDATE', { tick: Number(worldStateRegistry.getTick()), skill: this.getSkillPayload(socket.id, skillId) });
      return;
    }

    cooldowns[skillId] = DEFAULT_SKILL_COOLDOWN_TICKS[skillId] ?? 10;
    const tick = Number(worldStateRegistry.getTick());
    socket.emit('SKILL_UPDATE', { tick, skill: this.getSkillPayload(socket.id, skillId) });

    const event = this.getSkillEvent(socket.id, skillId, tick);
    if (!event) return;
    socket.emit('server:combat_event', event);
    socket.emit('warfront_combat', event);
  }

  private handleInteractAction(socket: any, payload: any): void {
    const targetId = typeof payload?.targetId === 'string' ? payload.targetId : 'starter-merchant-mara';
    const npc = this.getStarterNpcSummaries().find(entry => entry.id === targetId) ?? this.getStarterNpcSummaries()[0];
    socket.emit('NPC_INTERACTION', {
      tick: Number(worldStateRegistry.getTick()),
      targetId: npc?.id ?? targetId,
      name: npc?.name ?? 'Unknown NPC',
      role: npc?.role ?? 'unknown',
      services: npc?.services ?? [],
      text: npc?.role === 'merchant'
        ? 'Trade is open. Bring loot, take rations.'
        : npc?.role === 'blacksmith'
          ? 'Use the anvil: learn crafting, salvage weapons, repair gear.'
          : `${npc?.name ?? 'The settler'} is deciding their path through Millbrook.`,
    });
  }

  private getSkillEvent(socketId: string, skillId: string, tick: number): any | null {
    if (skillId === 'atk') {
      return {
        kind: 'hit',
        attackerId: socketId,
        defenderId: 'elder',
        damage: 7 + (tick % 11),
        tick,
      };
    }

    if (skillId === 'def') {
      return {
        kind: 'guard',
        actorId: socketId,
        guardTicks: DEFAULT_SKILL_COOLDOWN_TICKS.def,
        tick,
      };
    }

    if (skillId === 'mag') {
      return {
        kind: 'aether',
        attackerId: socketId,
        defenderId: 'elder',
        damage: 4 + (tick % 7),
        tick,
      };
    }

    return null;
  }

  /**
   * Called every tick by kernel
   */
  public onTick(): void {
    this.tickCounter++;
    this.decrementSkillCooldowns();

    if (this.tickCounter % HEARTBEAT_INTERVAL === 0) {
      this.broadcastHeartbeat();
    }

    this.checkEvolutionEvents();
  }

  /**
   * Broadcast world heartbeat
   */
  private broadcastHeartbeat(): void {
    if (!this.io) return;

    const sockets = this.io.sockets?.sockets;
    if (sockets?.forEach) {
      sockets.forEach((socket: any) => socket.emit('WORLD_HEARTBEAT', this.getHeartbeatPayload(socket.id)));
      return;
    }

    this.io.emit('WORLD_HEARTBEAT', this.getHeartbeatPayload());
  }

  /**
   * Check for evolution events
   */
  private checkEvolutionEvents(): void {
    const worldState = worldStateRegistry.getCurrentState();

    for (const [regionId, region] of worldState.regions) {
      const lastPhase = this.lastPhaseStates.get(regionId);
      const currentPhase = region.stabilityLevel;

      if (lastPhase && lastPhase !== currentPhase) {
        this.io?.emit('EVOLUTION_EVENT', {
          regionId,
          previousPhase: lastPhase,
          newPhase: currentPhase,
          tick: Number(worldStateRegistry.getTick()),
        });
      }

      this.lastPhaseStates.set(regionId, currentPhase);
    }
  }

  /**
   * Get world state snapshot
   */
  private getWorldStateSnapshot(socketId?: string): any {
    return {
      ...this.getHeartbeatPayload(socketId),
      tickRate: arelorianKernel.getTickRate(),
    };
  }

  private getHeartbeatPayload(socketId?: string): any {
    const npcs = this.getStarterNpcSummaries();
    return {
      tick: Number(worldStateRegistry.getTick()),
      regions: this.getRegionSummaries(),
      players: this.getPlayerSummaries(socketId),
      agents: npcs,
      npcs,
      self: socketId ? this.getPlayerSummary(socketId) : null,
      inventory: socketId ? this.getInventory(socketId) : [],
      skills: socketId ? this.getSkillPayloads(socketId) : [],
    };
  }

  private getPlayerSummaries(socketId?: string): Record<string, any> {
    const players: Record<string, any> = {};
    const sockets = this.io?.sockets?.sockets;
    if (sockets?.forEach) {
      sockets.forEach((socket: any) => {
        players[socket.id] = this.getPlayerSummary(socket.id);
      });
    }
    if (socketId && !players[socketId]) players[socketId] = this.getPlayerSummary(socketId);
    return players;
  }

  private getPlayerSummary(socketId: string): any {
    const equipment = this.equipmentBySocket.get(socketId) ?? { itemId: null, weaponVisualId: null };
    const position = this.ensurePlayerPosition(socketId);
    return {
      id: socketId,
      name: 'Player',
      x: position.x,
      z: position.z,
      equippedWeaponId: equipment.weaponVisualId,
      weaponVisualId: equipment.weaponVisualId,
      inventory: this.getInventory(socketId),
      skills: this.getSkillPayloads(socketId),
    };
  }

  private ensurePlayerPosition(socketId: string): PlayerPositionState {
    let position = this.playerPositionsBySocket.get(socketId);
    if (!position) {
      position = { x: 0, z: 0 };
      this.playerPositionsBySocket.set(socketId, position);
    }
    return position;
  }

  private getStarterNpcSummaries(): any[] {
    const tick = Number(worldStateRegistry.getTick());
    const phase = Math.floor(tick / 20);
    const fixed = FIXED_STARTER_NPCS.map(template => ({
      ...template,
      displayName: template.name,
      x: template.x,
      z: template.z,
      currentAction: template.role === 'merchant' ? 'trading starter supplies' : 'working the anvil',
      permanent: true,
      canMigrate: false,
    }));

    const free = FREE_STARTER_NPCS.map((template, index) => {
      const wanderHash = deterministicHash(['starter-npc-wander-v1', template.id, phase]);
      const actionHash = deterministicHash(['starter-npc-action-v1', template.id, phase]);
      const dx = (wanderHash % 3) - 1;
      const dz = (Math.floor(wanderHash / 3) % 3) - 1;
      return {
        ...template,
        displayName: template.name,
        x: clampWorldCoord(template.x + dx),
        z: clampWorldCoord(template.z + dz),
        currentAction: FREE_NPC_ACTIONS[actionHash % FREE_NPC_ACTIONS.length],
        autonomyIndex: deterministicHash(['starter-npc-autonomy-v1', template.id, tick]) % 100,
        canMigrate: true,
        permanent: false,
        packIndex: index,
      };
    });

    return [...fixed, ...free];
  }

  private getInventory(socketId: string): any[] {
    const equipment = this.equipmentBySocket.get(socketId);
    if (!equipment?.weaponVisualId && !equipment?.itemId) return [];
    return [{
      itemId: equipment.itemId ?? equipment.weaponVisualId,
      name: equipment.weaponVisualId ?? equipment.itemId,
      type: 'weapon',
      weaponVisualId: equipment.weaponVisualId,
    }];
  }

  private ensureSkillCooldowns(socketId: string): SkillCooldownState {
    let cooldowns = this.skillCooldownsBySocket.get(socketId);
    if (!cooldowns) {
      cooldowns = Object.fromEntries(Object.keys(DEFAULT_SKILL_COOLDOWN_TICKS).map((skillId) => [skillId, 0]));
      this.skillCooldownsBySocket.set(socketId, cooldowns);
    }
    return cooldowns;
  }

  private decrementSkillCooldowns(): void {
    for (const cooldowns of this.skillCooldownsBySocket.values()) {
      for (const skillId of Object.keys(cooldowns)) {
        cooldowns[skillId] = Math.max(0, Math.trunc(cooldowns[skillId] ?? 0) - 1);
      }
    }
  }

  private getSkillPayloads(socketId: string): any[] {
    return Object.keys(DEFAULT_SKILL_COOLDOWN_TICKS).map((skillId) => this.getSkillPayload(socketId, skillId));
  }

  private getSkillPayload(socketId: string, skillId: string): any {
    const cooldowns = this.ensureSkillCooldowns(socketId);
    const cooldownTicksRemaining = Math.max(0, Math.trunc(cooldowns[skillId] ?? 0));
    return {
      id: skillId,
      ready: cooldownTicksRemaining <= 0,
      cooldownTicksRemaining,
    };
  }

  /**
   * Get region summaries
   */
  private getRegionSummaries(): any[] {
    const worldState = worldStateRegistry.getCurrentState();
    const summaries = [];

    for (const [regionId, region] of worldState.regions) {
      summaries.push({
        id: regionId,
        energy: fromFP(region.matrixEnergyBalance),
        stability: region.stabilityLevel,
        corruption: fromFP(region.visualCorruptionState),
      });
    }

    return summaries;
  }

  /**
   * Calculate region plexity
   */
  private calculatePlexity(region: any): number {
    const resources = Array.from(region.resourceSaturation.values()) as number[];
    if (resources.length === 0) return 0;

    const avg = resources.reduce((a, b) => a + b, 0) / resources.length;
    const variance = resources.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) / resources.length;

    return fromFP(Math.max(0, FP_SCALE - Math.floor(Math.sqrt(variance) * 10)));
  }
}

/**
 * Singleton instance
 */
export const apiServer = new APIServer();
