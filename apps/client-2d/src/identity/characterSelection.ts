/**
 * Phase 7: Character Selection State
 * 
 * Persists the selected character ID client-side.
 * Server is authoritative for character list and ownership.
 */

const STORAGE_KEY = "areloria.selectedCharacterId.v1";

export interface ClientCharacterSummary {
  id: string;
  name: string;
  sceneId: string;
  level?: number;
  updatedAtMs?: number;
}

export function getSelectedCharacterId(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

export function setSelectedCharacterId(characterId: string): void {
  try {
    localStorage.setItem(STORAGE_KEY, characterId);
  } catch {
    // ignore
  }
}

export function clearSelectedCharacterId(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}