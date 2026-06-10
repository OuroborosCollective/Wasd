/**
 * ManifestTickSystem - Manifest chain maintenance TickSystem
 * 
 * Phase 3 of Core Reality Alignment initiative.
 * 
 * This system handles manifest chain maintenance at the infrastructure level.
 * It runs before other systems (priority 0) to ensure the manifest is valid
 * before any game logic executes.
 * 
 * Note: WorldTickManifestManager may not exist in all environments.
 * This system gracefully handles that case.
 */

import { TickSystem, TickSystemPriority, type TickSystemContext } from './TickSystem.js';
import { tickSystemRegistry } from './TickSystemRegistry.js';

// Type alias for when WorldTickManifestManager is available
type ManifestManager = {
  tick?(context: TickSystemContext): void;
  isHealthy?(): boolean;
};

/**
 * ManifestTickSystem implements TickSystem for manifest maintenance.
 */
export class ManifestTickSystem implements TickSystem {
  readonly name = 'manifest';
  readonly priority = TickSystemPriority.INFRASTRUCTURE;
  enabled = true;
  
  private manifestManager: ManifestManager | null = null;
  private isActive = false;
  
  constructor(manifestManager?: ManifestManager) {
    this.manifestManager = manifestManager ?? null;
  }
  
  tick(context: TickSystemContext): void {
    // Manifest is built incrementally as state changes occur.
    // This tick just ensures the manifest chain is consistent.
    // The actual manifest building happens in other systems.
    if (this.manifestManager?.tick) {
      this.manifestManager.tick(context);
    }
    this.isActive = true;
  }
  
  onStart(): void {
    console.log('[ManifestTickSystem] Started - manifest chain maintenance active');
  }
  
  onShutdown(): void {
    this.isActive = false;
    console.log('[ManifestTickSystem] Shutdown - manifest chain finalized');
  }
  
  /**
   * Check if manifest system is healthy.
   */
  isHealthy(): boolean {
    return this.isActive && (this.manifestManager?.isHealthy?.() ?? true);
  }
}

/**
 * Register ManifestTickSystem with the global registry.
 * @param manifestManager Optional manifest manager instance
 */
export function registerManifestSystem(manifestManager?: ManifestManager): ManifestTickSystem {
  const system = new ManifestTickSystem(manifestManager);
  
  tickSystemRegistry.register({
    system,
    dependencies: [], // Infrastructure - no dependencies
    tags: ['manifest', 'infrastructure'],
  });
  
  return system;
}