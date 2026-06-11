/**
 * Oracle Module - Living World System with WorldEventBus Integration
 * 
 * Provides deterministic prophecy generation for the Areloria game world.
 * 
 * Components:
 * - OracleModule: Core prophecy generation engine
 * - OracleChatBridge: Chat system integration for broadcasting prophecies
 * 
 * Usage:
 * ```typescript
 * import { OracleModule, getOracleModule } from './modules/oracle/index.js';
 * import { OracleTickSystem } from './core/are/OracleTickSystem.js';
 * 
 * // In your game server initialization:
 * const eventBus = new WorldEventBus();
 * const oracleModule = getOracleModule(eventBus);
 * 
 * // Subscribe to prophecies in other systems:
 * eventBus.on('oracle_critical', (event) => {
 *   console.log('Critical prophecy:', event.data.message);
 * });
 * ```
 */

export {
  OracleModule,
  getOracleModule,
  setOracleModuleEventBus,
  resetOracleModule,
  type OracleModuleConfig,
  type OracleProphecyEventData,
  type OracleCriticalEventData,
  type OracleRecommendationEventData,
} from './OracleModule.js';

export {
  OracleChatBridge,
  createOracleChatBridge,
  type OracleChatBridgeConfig,
} from './OracleChatBridge.js';

/**
 * Install Oracle Chat Bridge into the server tick loop.
 * This should be called during server bootstrap.
 */
export function installOracleChatBridge(tick: any): void {
  const eventBus = tick.ouroborosEngine?.eventBus ?? tick.eventBus;
  const chatRouter = tick.chatSystem?.chatRouter ?? tick.chatRouter;
  
  if (!eventBus || !chatRouter) {
    console.log('[OracleChatBridge] Cannot install - eventBus or chatRouter not available');
    return;
  }
  
  const recipients = tick.players ?? [];
  const sendToPlayer = tick.sendToPlayer ?? ((socketId: string, payload: unknown) => {
    tick.ws?.sendTo?.(socketId, payload);
  });
  const broadcast = tick.broadcast ?? ((payload: unknown) => {
    tick.ws?.broadcast?.(payload);
  });
  const resolveSocketId = tick.resolveSocketId ?? ((playerId: string) => {
    return tick.playerToSocket?.get(playerId);
  });
  
  const bridge = createOracleChatBridge(
    eventBus,
    chatRouter,
    recipients,
    sendToPlayer,
    broadcast,
    resolveSocketId,
    { broadcastCritical: true, broadcastCooldownMs: 30000 }
  );
  
  console.log('[OracleChatBridge] Installed successfully');
  
  // Return bridge for cleanup later
  return bridge;
}