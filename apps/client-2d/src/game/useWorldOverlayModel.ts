/**
 * useWorldOverlayModel
 *
 * React hook that derives a read-only WorldOverlayModel from the
 * server-authoritative LiveGameplaySnapshot. The model is recomputed only
 * when the snapshot identity changes.
 */

import { useMemo } from "react";
import { useLiveGameplaySnapshot } from "./useLiveGameplaySnapshot";
import { deriveWorldOverlayModel, type WorldOverlayModel } from "./WorldOverlayModel";

export function useWorldOverlayModel(): WorldOverlayModel {
  const snapshot = useLiveGameplaySnapshot();
  return useMemo(() => deriveWorldOverlayModel(snapshot), [snapshot]);
}
