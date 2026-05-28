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

/**
 * Convert from Fixed-Point
 */
function fromFP(fp: number): number {
  return fp / FP_SCALE;
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

type SkillCooldownState = Record<string, number>;

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
        socket.emit('WORLD_STATE', this.getWorldStateSnapshot(socket.id));
        socket.emit('WORLD_HEARTBEAT', this.getHeartbeatPayload(socket.id));

        socket.on('intent:equip', (payload: any) => this.handleEquipIntent(socket, payload));
        socket.on('player_action', (payload: any) => this.handlePlayerAction(socket, payload));
        socket.on('disconnect', () => {
          this.equipmentBySocket.delete(socket.id);
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
    if (payload?.action !== 'USE_SKILL') return;
    const skillId = typeof payload?.payload?.skillId === 'string' ? payload.payload.skillId : null;
    if (!skillId) return;

    const cooldowns = this.ensureSkillCooldowns(socket.id);
    const currentCooldownTicks = Math.max(0, Math.trunc(cooldowns[skillId] ?? 0));
    if (currentCooldownTicks > 0) {
      socket.emit('SKILL_UPDATE', { tick: Number(worldStateRegistry.getTick()), skill: this.getSkillPayload(socket.id, skillId) });
      return;
    }

    cooldowns[skillId] = DEFAULT_SKILL_COOLDOWN_TICKS[skillId] ?? 10;
    socket.emit('SKILL_UPDATE', { tick: Number(worldStateRegistry.getTick()), skill: this.getSkillPayload(socket.id, skillId) });

    if (skillId !== 'atk') return;
    const tick = Number(worldStateRegistry.getTick());
    const damage = 7 + (tick % 11);
    const event = {
      kind: 'hit',
      attackerId: socket.id,
      defenderId: 'elder',
      damage,
      tick,
    };
    socket.emit('server:combat_event', event);
    socket.emit('warfront_combat', event);
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
    return {
      tick: Number(worldStateRegistry.getTick()),
      regions: this.getRegionSummaries(),
      players: this.getPlayerSummaries(socketId),
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
    return {
      id: socketId,
      name: 'Player',
      x: 0,
      z: 0,
      equippedWeaponId: equipment.weaponVisualId,
      weaponVisualId: equipment.weaponVisualId,
      inventory: this.getInventory(socketId),
      skills: this.getSkillPayloads(socketId),
    };
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
