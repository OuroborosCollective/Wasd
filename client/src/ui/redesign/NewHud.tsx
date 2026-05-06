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
import { useGameHudState } from "../useGameHudState";
import type { WarfrontHudState } from "../useGameHudState";
import { WarfrontPanel } from "./WarfrontPanel";
import "./RedesignTheme.css";
import "./NewHud.css";

/**
 * NewHud Component
 * Implements the core UI overlay for Areloria WASD.
 * Synchronized with useGameHudState for Warfront, Quests, and Loot.
 */
export const NewHud: React.FC = () => {
  const { 
    warfront, 
    activeQuests, 
    nearbyLoot, 
    inventoryOpen, 
    toggleInventory 
  } = useGameHudState();

  const [health, setHealth] = useState(getPlayerHealth());
  const [maxHealth, setMaxHealth] = useState(getPlayerMaxHealth());
  const [mana, setMana] = useState(getPlayerMana());
  const [maxMana, setMaxMana] = useState(getPlayerMaxMana());
  const [xp, setXp] = useState(getPlayerXp());
  const [level, setLevel] = useState(getPlayerLevel());

  const deviceTier = useMemo(() => getDeviceTier(), []);

  useEffect(() => {
    const unsubscribe = subscribePlayerState(() => {
      setHealth(getPlayerHealth());
      setMaxHealth(getPlayerMaxHealth());
      setMana(getPlayerMana());
      setMaxMana(getPlayerMaxMana());
      setXp(getPlayerXp());
      setLevel(getPlayerLevel());
    });
    return () => unsubscribe();
  }, []);

  const healthPercentage = Math.max(0, Math.min(100, (health / (maxHealth || 1)) * 100));
  const manaPercentage = Math.max(0, Math.min(100, (mana / (maxMana || 1)) * 100));
  const xpPercentage = Math.max(0, Math.min(100, (xp / 1000) * 100)); // Level-basierte Logik hier ggf. anpassen

  const handleSkillClick = (skillId: string) => {
    sendUseSkill(skillId);
  };

  return (
    <div className="new-hud-container">
      {/* Top Left: Player Status */}
      <div className="hud-player-stats">
        <div className="hud-avatar">
          <span className="hud-level-badge">{level}</span>
        </div>
        <div className="hud-bars-container">
          <div className="hud-bar-wrapper health">
            <div className="hud-bar-fill" style={{ width: `${healthPercentage}%` }} />
            <span className="hud-bar-text">{Math.round(health)} / {maxHealth}</span>
          </div>
          <div className="hud-bar-wrapper mana">
            <div className="hud-bar-fill" style={{ width: `${manaPercentage}%` }} />
            <span className="hud-bar-text">{Math.round(mana)} / {maxMana}</span>
          </div>
        </div>
      </div>

      {/* Top Right: Quests & Minimap Area */}
      <div className="hud-top-right">
        {activeQuests.length > 0 && (
          <div className="hud-quest-tracker">
            <h4 className="quest-title">Active Missions</h4>
            {activeQuests.map((quest: QuestStateNet) => (
              <div key={quest.id} className="quest-item">
                <span className="quest-name">{quest.name}</span>
                <span className="quest-progress">{quest.progress}/{quest.target}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Center: Warfront Panel */}
      {warfront && warfront.active && (
        <div className="hud-center-overlay">
          <WarfrontPanel state={warfront} />
        </div>
      )}

      {/* Bottom Center: Action Bar & XP */}
      <div className="hud-bottom-center">
        <div className="hud-xp-bar">
          <div className="hud-xp-fill" style={{ width: `${xpPercentage}%` }} />
        </div>
        <div className="hud-action-bar">
          {[1, 2, 3, 4, 5].map((slot) => (
            <button 
              key={slot} 
              className="hud-skill-slot"
              onClick={() => handleSkillClick(slot.toString())}
            >
              <span className="skill-key">{slot}</span>
            </button>
          ))}
          <button 
            className={`hud-skill-slot inventory-btn ${inventoryOpen ? 'active' : ''}`}
            onClick={toggleInventory}
          >
            <i className="icon-bag" />
          </button>
        </div>
      </div>

      {/* Nearby Loot Interaction */}
      {nearbyLoot.length > 0 && (
        <div className="hud-loot-prompt">
          <button className="loot-button" onClick={() => sendCommand("loot_all")}>
            Take All Loot ({nearbyLoot.length})
          </button>
        </div>
      )}

      {/* Mobile Optimization Layer */}
      {deviceTier === "mobile" && (
        <div className="hud-mobile-controls">
          {/* Virtueller Joystick wird durch GameCanvas gerendert, hier nur Overlays */}
        </div>
      )}
    </div>
  );
};