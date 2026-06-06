/**
 * CHARACTER TYPES
 *
 * Deterministic character profile types for server-authoritative identity.
 * No Date.now(), no Math.random(), stable archetypes and ordering.
 */

export type CharacterArchetype =
  | "wanderer"
  | "forager"
  | "miner"
  | "angler"
  | "artisan";

export interface CharacterProfile {
  playerId: string;
  schemaVersion: 1;
  characterId: string;
  displayName: string;
  archetype: CharacterArchetype;
  createdAtTick: number;
  selected: boolean;
}

export interface CharacterProfileSnapshot {
  playerId: string;
  characterId: string;
  displayName: string;
  archetype: CharacterArchetype;
  selected: boolean;
}

export interface CharacterCreateInput {
  playerId: string;
  displayName: string;
  archetype: CharacterArchetype;
  currentTick: number;
}

export interface CharacterCreateResult {
  ok: boolean;
  playerId: string;
  reason?:
    | "created"
    | "invalid_player"
    | "invalid_name"
    | "invalid_archetype"
    | "already_exists";
  profile?: CharacterProfile;
}

export const CHARACTER_ARCHETYPES: readonly CharacterArchetype[] = [
  "wanderer",
  "forager",
  "miner",
  "angler",
  "artisan",
] as const;

export function isCharacterArchetype(value: unknown): value is CharacterArchetype {
  return typeof value === "string" && CHARACTER_ARCHETYPES.includes(value as CharacterArchetype);
}

export function normalizeDisplayName(value: unknown): string | null {
  if (typeof value !== "string") return null;

  const trimmed = value.trim().replace(/\s+/g, " ");

  if (trimmed.length < 3) return null;
  if (trimmed.length > 32) return null;
  if (!/^[a-zA-Z0-9 _.-]+$/.test(trimmed)) return null;

  return trimmed;
}

export function createCharacterId(playerId: string): string {
  const safe = playerId.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 64);
  return `char_${safe}`;
}

export function createDefaultCharacterProfile(input: CharacterCreateInput): CharacterProfile {
  return {
    playerId: input.playerId,
    schemaVersion: 1,
    characterId: createCharacterId(input.playerId),
    displayName: input.displayName,
    archetype: input.archetype,
    createdAtTick: Math.max(0, Math.floor(input.currentTick)),
    selected: true,
  };
}

export function normalizeCharacterProfile(
  input: Partial<CharacterProfile> | null | undefined,
  playerId: string,
): CharacterProfile | null {
  if (!input) return null;

  const displayName = normalizeDisplayName(input.displayName);
  const archetype = isCharacterArchetype(input.archetype)
    ? input.archetype
    : "wanderer";

  if (!displayName) return null;

  return {
    playerId,
    schemaVersion: 1,
    characterId: String(input.characterId || createCharacterId(playerId)),
    displayName,
    archetype,
    createdAtTick: Math.max(0, Math.floor(Number(input.createdAtTick ?? 0))),
    selected: Boolean(input.selected ?? true),
  };
}

export function toCharacterProfileSnapshot(
  profile: CharacterProfile | null,
): CharacterProfileSnapshot | null {
  if (!profile) return null;

  return {
    playerId: profile.playerId,
    characterId: profile.characterId,
    displayName: profile.displayName,
    archetype: profile.archetype,
    selected: profile.selected,
  };
}