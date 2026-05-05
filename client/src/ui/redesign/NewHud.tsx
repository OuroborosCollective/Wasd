import React, { useMemo, useState, useEffect } from "react";
import type { EntityNet, QuestStateNet, LootNet } from "@shared/types/protocol";
import { getDeviceTier } from "../touchUi";
import { sendCommand, sendUseSkill } from "../../networking/websocketClient";
import { 
  subscribePlayerState, 
  getPlayerHealth, getPlayerMaxHealth, 
  getPlayerMana, getPlayerMaxMana,
  getPlayerXp, getPlayerLevel
} from "../../state/playerState";
import type { WarfrontHudState } from "../useGameHudState";
import { WarfrontPanel } from "./WarfrontPanel";
import "./RedesignTheme.css";
import "./NewHud.css";

export const NewHud: React.FC = () => {
  return <div>New Hud</div>;
};
