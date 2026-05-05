import { useCallback, useEffect, useRef, useState } from "react";
import type { EntityNet, FxKind, LootNet, QuestStateNet, ServerMsg } from "@shared/types/protocol";
import {
  getCombatTargetNpcId,
  getPlayerGold,
  getPlayerInventory,
  getPlayerInventoryWeight,
  getPlayerMaxCarryWeight,
  getPlayerQuests,
  subscribePlayerState,
  type ClientQuestEntry,
} from "../state/playerState";

export const useGameHudState = () => {
  return {};
};
