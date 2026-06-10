// MIGRATED: This module is deprecated - chat relay is now handled
// by the TickSystemRegistry via OuroborosTickSystem.
// This stub exists for backward compatibility during migration.

import { worldTickAdapter } from "../../core/are/WorldTickThinShellAdapter.js";

/**
 * @deprecated MIGRATED: This function is deprecated.
 * Chat relay is now handled by OuroborosTickSystem via TickSystemRegistry.
 * This stub exists for backward compatibility during migration.
 */
export function installRuntimeChatRelay(): void {
  // No-op: Chat relay is now handled by OuroborosTickSystem
  // This module was modifying WorldTick.prototype which is no longer supported
  console.log('[installRuntimeChatRelay] DEPRECATED: Chat relay now handled by OuroborosTickSystem');
}
