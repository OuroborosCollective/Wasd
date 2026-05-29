import { AREShadowGateAdapter, ShadowEcho } from '../../core/are/AREShadowGateAdapter';
import { NPCMemoryCache } from './NPCMemoryCache';

export class NPCShadowMemoryBridge {
  private static instance: NPCShadowMemoryBridge;

  constructor(private memoryCache: NPCMemoryCache) {
    AREShadowGateAdapter.subscribe((echo) => this.handleEcho(echo));
  }

  static initialize(memoryCache: NPCMemoryCache): NPCShadowMemoryBridge {
    if (!this.instance) {
      this.instance = new NPCShadowMemoryBridge(memoryCache);
    }
    return this.instance;
  }

  private handleEcho(echo: ShadowEcho): void {
    if (echo.entityId.startsWith('npc:')) {
      this.injectGhostMemory(echo.entityId, echo);
    }
  }

  private injectGhostMemory(npcId: string, echo: ShadowEcho): void {
    const intensity = echo.intensity > 0.8 ? 'violent' : 'subtle';
    const content = `[GHOST ECHO] Experienced a ${intensity} ripple in causality. A version of reality where I moved differently nearly manifested.`;

    this.memoryCache.addMemory(npcId, {
      content,
      importance: Math.ceil(echo.intensity * 10),
      timestamp: echo.tick,
      tags: ['shadow-echo', 'causality-glitch', 'are-leak']
    });
  }
}
