/**
 * Playtester Utilities
 *
 * Helper functions for identifying and handling playtester entities.
 * Important: Playtester bots must not pollute real player metrics.
 */

/**
 * Check if an entity is a synthetic playtester NPC.
 * Playtesters have the "playtester" tag and should be excluded from:
 * - Leaderboards
 * - Economy statistics
 * - PvP rankings
 * - Achievement tracking
 * - Player activity metrics
 *
 * @param entity - Entity with optional tags array
 * @returns true if the entity is a synthetic playtester
 */
export function isSyntheticPlaytester(
  entity: { tags?: readonly string[] },
): boolean {
  return entity.tags?.includes("playtester") === true;
}

/**
 * Check if a player ID matches the playtester's synthetic ID.
 * Useful for filtering WebSocket events and player lists.
 *
 * @param playerId - The player ID to check
 * @param playtesterId - The configured playtester ID (from PlaytesterConfig.id)
 * @returns true if the player ID matches the playtester
 */
export function isPlaytesterPlayerId(
  playerId: string,
  playtesterId: string,
): boolean {
  return playerId === playtesterId || playerId.startsWith(`${playtesterId}:`);
}

/**
 * Filter out playtester entities from a list.
 * Useful for preparing data for metrics that shouldn't include bots.
 *
 * @param entities - Array of entities with optional tags
 * @returns Filtered array without playtesters
 */
export function filterPlaytesters<T extends { tags?: readonly string[] }>(
  entities: readonly T[],
): T[] {
  return entities.filter((e) => !isSyntheticPlaytester(e));
}

/**
 * Get display name for logs (anonymized for security)
 */
export function safePlaytesterIdForLogs(id: string): string {
  if (id.length <= 8) return "[playtester]";
  return `${id.slice(0, 4)}...`;
}