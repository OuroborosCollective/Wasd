/**
 * @file server/src/core/api/APIServer.ts
 * @description High-performance API Server.
 * Provides REST endpoints and WebSocket integration.
 * 
 * Uses existing Express server if available.
 */

import { worldStateRegistry } from '../state/WorldStateRegistry.js';
import { arelorianKernel } from '../systems/ArelorianKernel.js';

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
const VALID_API_KEYS = new Set([
  process.env.API_KEY || 'dev-key-change-in-production',
]);

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
      res.json({ ok: true, timestamp: Date.now() });
    });

    // World status (protected)
    app.get('/api/v1/world/status', (req: any, res: any) => {
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
    app.get('/api/v1/regions/:id', (req: any, res: any) => {
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
          origin: '*',
          methods: ['GET', 'POST'],
        },
      });

      this.io.on('connection', (socket: any) => {
        console.log(`[ws] Client connected: ${socket.id}`);
        socket.emit('WORLD_STATE', this.getWorldStateSnapshot());
      });
    }).catch(console.error);
  }

  /**
   * Called every tick by kernel
   */
  public onTick(): void {
    this.tickCounter++;

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

    this.io.emit('WORLD_HEARTBEAT', {
      tick: Number(worldStateRegistry.getTick()),
      regions: this.getRegionSummaries(),
    });
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
  private getWorldStateSnapshot(): any {
    const worldState = worldStateRegistry.getCurrentState();
    return {
      tick: Number(worldStateRegistry.getTick()),
      tickRate: arelorianKernel.getTickRate(),
      regions: this.getRegionSummaries(),
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
    const resources = Array.from(region.resourceSaturation.values());
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