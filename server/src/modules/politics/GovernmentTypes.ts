import {
  getGovernmentType,
  getGovernmentTypes,
  listGovernmentTypes,
  scoreGovernmentDiplomacyFit,
  type GovernmentTypeDefinition,
  type GovernmentTypeId,
} from "./PoliticsDataRegistry.js";

/**
 * Backwards-compatible export for older module callers.
 *
 * The source of truth is now `game-data/politics/government-types.json`, loaded and
 * normalized by `PoliticsDataRegistry`. Keep module logic here; keep balancing/content
 * in game-data so server, 2D, 3D and tooling can agree on the same definitions.
 */
export const GovernmentTypes = getGovernmentTypes();

export type { GovernmentTypeDefinition, GovernmentTypeId };
export { getGovernmentType, listGovernmentTypes, scoreGovernmentDiplomacyFit };
