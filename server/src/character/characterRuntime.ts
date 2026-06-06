/**
 * CHARACTER RUNTIME
 *
 * Singleton character service instance for production use.
 * Deterministic: No Date.now(), no Math.random().
 */

import { CharacterStore } from "./CharacterStore.js";
import { CharacterService } from "./CharacterService.js";
import { createCharacterPersistenceAdapter } from "./createCharacterPersistenceAdapter.js";

const adapter = await createCharacterPersistenceAdapter();

export const characterService = new CharacterService(
  new CharacterStore(),
  adapter,
);