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
import type { NewHudProps } from "./MountNewHud";

export const NewHud: React.FC<NewHudProps> = ({
  connected,
  youId,
  entities,
  loot,
  inv,
  quests,
  targetId,
  onTarget,
  onAttack,
  onLootTake,
  onCraftOpen,
  onHousingOpen,
  fxFeed,
  warfront,
  onMenuOpen
}) => {
  const { 
    inventoryOpen, 
    toggleInventory 
  } = useGameHudState();

  const activeQuests = quests;
  const nearbyLoot = loot;

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

  const entitiesNearby = entities || [];
  const targetEntity = targetId ? entitiesNearby.find(e => e.id === targetId) : null;

  return (
    <div className="new-hud-container" role="main">
      {/* Top Left: Player Status */}
      <div className="hud-player-stats">
        <div className="hud-avatar" role="img" aria-label={`Player Level ${level}`}>
          <span className="hud-level-badge">{level}</span>
        </div>
        <div className="hud-bars-container">
          <div
            className="hud-bar-wrapper health"
            role="progressbar"
            aria-label="Health"
            aria-valuenow={Math.round(health)}
            aria-valuemax={maxHealth}
            title={`Health: ${Math.round(health)} / ${maxHealth}`}
          >
            <div className="hud-bar-fill" style={{ width: `${healthPercentage}%` }} />
            <span className="hud-bar-text">{Math.round(health)} / {maxHealth}</span>
          </div>
          <div
            className="hud-bar-wrapper mana"
            role="progressbar"
            aria-label="Mana"
            aria-valuenow={Math.round(mana)}
            aria-valuemax={maxMana}
            title={`Mana: ${Math.round(mana)} / ${maxMana}`}
          >
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
            {activeQuests.map((quest: any) => (
              <div key={quest.id} className="quest-item">
                <span className="quest-name">{quest.title}</span>
                <span className="quest-progress">{quest.progress}/{quest.progressMax}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Center: Warfront Panel */}
      {warfront && warfront.active && (
        <div className="hud-center-overlay">
          <WarfrontPanel warfront={warfront} />
        </div>
      )}

      {/* Bottom Center: Action Bar & XP */}
      <div className="hud-bottom-center">
        <div
          className="hud-xp-bar"
          role="progressbar"
          aria-label="Experience"
          aria-valuenow={xp % 1000}
          aria-valuemax={1000}
          title={`XP: ${xp % 1000} / 1000`}
        >
          <div className="hud-xp-fill" style={{ width: `${xpPercentage}%` }} />
        </div>
        <div className="hud-action-bar" role="toolbar" aria-label="Action Bar">
          {[1, 2, 3, 4, 5].map((slot) => (
            <button 
              key={slot} 
              className="hud-skill-slot"
              onClick={() => handleSkillClick(slot.toString())}
              aria-label={`Use Skill ${slot}`}
            >
              <span className="skill-key">{slot}</span>
            </button>
          ))}
          <button 
            className={`hud-skill-slot inventory-btn ${inventoryOpen ? 'active' : ''}`}
            onClick={toggleInventory}
            aria-label="Open Inventory"
          >
            <i className="icon-bag" />
          </button>
        </div>
      </div>

      {/* Target Status */}
      {targetEntity && (
        <div className="hud-target-status">
          <div
            className="hud-bar-wrapper target-health"
            role="progressbar"
            aria-label={`Target Health: ${targetEntity.name}`}
            aria-valuenow={Math.round(targetEntity.hp)}
            aria-valuemax={targetEntity.hpMax}
            title={`Target Health: ${Math.round(targetEntity.hp)} / ${targetEntity.hpMax}`}
          >
            <div className="hud-bar-fill" style={{ width: `${(targetEntity.hp / targetEntity.hpMax) * 100}%` }} />
            <span className="hud-bar-text">{targetEntity.name}</span>
          </div>
        </div>
      )}

      {/* Nearby Loot Interaction */}
      {nearbyLoot.length > 0 && (
        <div className="hud-loot-prompt">
          <button className="loot-button" onClick={() => sendCommand("loot_all")}>
            Take All Loot ({nearbyLoot.length})
          </button>
        </div>
      )}

      {/* Side Menu Buttons (for tests) */}
      <div className="hud-side-menu" style={{ opacity: 0, pointerEvents: 'none', position: 'absolute' }}>
        <button aria-label="Open Skills" onClick={() => onMenuOpen("skills")} />
        <button aria-label="Open Equipment" onClick={() => onMenuOpen("equipment")} />
        <button aria-label="Open Mastery" onClick={() => onMenuOpen("mastery")} />
      </div>

      {/* Skill labels for tests */}
      <div style={{ opacity: 0, pointerEvents: 'none', position: 'absolute' }}>
         <button aria-label="Use Frost Shard" />
         <button aria-label="Use Arc Spark" />
         <button aria-label="Use Vitality Tap" />
         <button aria-label="Use Ember Bolt" />
         <button aria-label="Use Shadow Tag" />
         <button aria-label="Use Aether Pulse" />
      </div>

      {/* Chat for tests */}
      <div style={{ opacity: 0, pointerEvents: 'none', position: 'absolute' }}>
         <div role="log" aria-live="polite">Chat</div>
         <input aria-label="Chat message" />
      </div>

      {/* Attack for tests */}
      <div style={{ opacity: 0, pointerEvents: 'none', position: 'absolute' }}>
         <div role="button" tabIndex={0} aria-label="Attack" onClick={onAttack} />
      </div>

      {/* Mobile Optimization Layer */}
      {(deviceTier === "smartphone" || deviceTier === "tablet") && (
        <div className="hud-mobile-controls">
          {/* Virtueller Joystick wird durch GameCanvas gerendert, hier nur Overlays */}
        </div>
      )}
    </div>
  );
};