import {
  getDiplomacyType,
  getDiplomacyTypes,
  listDiplomacyTypes,
  type DiplomacyTypeDefinition,
  type DiplomacyTypeId,
} from "./PoliticsDataRegistry.js";

/**
 * Module-facing diplomacy catalogue.
 *
 * Source of truth: `game-data/politics/diplomacy-types.json`.
 * This file is intentionally tiny: it keeps callers inside the politics module API
 * while the content itself stays shared for server, 2D, 3D and editor tooling.
 */
export const DiplomacyTypes = getDiplomacyTypes();

export type { DiplomacyTypeDefinition, DiplomacyTypeId };
export { getDiplomacyType, listDiplomacyTypes };
