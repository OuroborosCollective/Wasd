import React, { useMemo, useState, useEffect, useRef } from "react";
// Relative path import to bypass @wasd/shared alias resolution issues in CI
import type { EntityNet, QuestStateNet, LootNet } from "../../../../shared/src/index";
import { getDeviceTier } from "../touchUi";
import { sendCommand, sendUseSkill } from "../../networking/websocketClient";
import { 
  subscribePlayerState, 
  getPlayerHealth, getPlayerMaxHealth, 
  getPlayerMana, getPlayerMaxMana,
  getPlayerXp, getPlayerLevel
} from "../../state/playerState";
import { useGameHudState } from "../useGameHudState";
import { WarfrontPanel } from "./WarfrontPanel";
import "./RedesignTheme.css";
import "./NewHud.css";

/**
 * NewHud Component
 * Refactored to use relative pathing for shared types to ensure 
 * deterministic type checking in environments where path aliases are not resolved.
 */
export const NewHud: React.FC<any> = (props) => {
  const hudState = useGameHudState();

  // Use props if provided (useful for tests), otherwise use state from hook
  const warfront = props.warfront !== undefined ? props.warfront : hudState.warfront;
  const quests = props.quests || (hudState.quests as QuestStateNet[]);
  const loot = props.loot || (hudState.loot as LootNet[]);
  const entities = props.entities || (hudState.entities as EntityNet[]);
  const targetNpcId = props.targetNpcId || props.targetId || hudState.targetNpcId;
  const inventoryOpen = props.inventoryOpen !== undefined ? props.inventoryOpen : hudState.inventoryOpen;
  const toggleInventory = props.toggleInventory || hudState.toggleInventory;
  const toggleInventoryRef = useRef(toggleInventory);
  useEffect(() => { toggleInventoryRef.current = toggleInventory; }, [toggleInventory]);

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

  const lootRef = useRef(loot);
  useEffect(() => { lootRef.current = loot; }, [loot]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;

      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return;

      const key = e.key.toLowerCase();
      if (key === 'f') {
        if (lootRef.current && lootRef.current.length > 0) sendCommand("loot_all");
      } else if (key === 'i') {
        if (toggleInventoryRef.current) toggleInventoryRef.current();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const healthPercentage = Math.max(0, Math.min(100, (health / (maxHealth || 1)) * 100));
  const isLowHealth = healthPercentage < 25;
  const manaPercentage = Math.max(0, Math.min(100, (mana / (maxMana || 1)) * 100));
  const xpPercentage = Math.max(0, Math.min(100, ((xp % 1000) / 1000) * 100));

  const handleSkillClick = (skillId: string) => {
    sendUseSkill(skillId);
  };

  const entitiesNearby = entities || [];
  const targetEntity = targetNpcId ? entitiesNearby.find((e: any) => e.id === targetNpcId) : null;
  const targetHpPercentage = targetEntity ? Math.max(0, Math.min(100, ((targetEntity as any).hp / ((targetEntity as any).hpMax || 1)) * 100)) : 0;

  return (
    <div className="new-hud-container">
      <div className="hud-player-stats">
        {targetEntity && (
          <div className="hud-target-frame">
            <div className="target-info">
              <span className="target-name">{ (targetEntity as any).name }</span>
              <span className="target-level">Lvl { (targetEntity as any).level }</span>
            </div>
            <div
              className="hud-bar-wrapper target-health"
              role="progressbar"
              aria-label={`Target Health: ${(targetEntity as any).name}`}
              aria-valuenow={(targetEntity as any).hp}
              aria-valuemax={(targetEntity as any).hpMax}
              title={`Target Health: ${(targetEntity as any).hp} / ${(targetEntity as any).hpMax}`}
            >
              <div className="hud-bar-fill" style={{ width: `${targetHpPercentage}%` }} />
            </div>
          </div>
        )}
        <div className="hud-avatar" role="img" aria-label={`Player Level ${level}`}>
          <span className="hud-level-badge">{level}</span>
        </div>
        <div className="hud-bars-container">
          <div
            className={`hud-bar-wrapper health ${isLowHealth ? "low-health" : ""}`}
            role="progressbar"
            aria-label="Health"
            aria-valuenow={Math.round(health)}
            aria-valuemax={maxHealth}
            aria-valuetext={`${Math.round(health)} of ${maxHealth} health remaining`}
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
            aria-valuetext={`${Math.round(mana)} of ${maxMana} mana remaining`}
            title={`Mana: ${Math.round(mana)} / ${maxMana}`}
          >
            <div className="hud-bar-fill" style={{ width: `${manaPercentage}%` }} />
            <span className="hud-bar-text">{Math.round(mana)} / {maxMana}</span>
          </div>
        </div>
      </div>

      <div className="hud-top-right">
        {quests && quests.length > 0 && (
          <div className="hud-quest-tracker">
            <h4 className="quest-title">Active Missions</h4>
            {quests.map((quest: any) => (
              <div key={quest.id} className="quest-item">
                <span className="quest-name">{quest.title}</span>
                <span className="quest-progress">{quest.progress}/{quest.goal}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {warfront && warfront.isActive && (
        <div className="hud-center-overlay">
          <WarfrontPanel state={warfront} />
        </div>
      )}

      <div className="hud-bottom-center">
        <div
          className="hud-xp-bar"
          role="progressbar"
          aria-label="Experience"
          aria-valuenow={xp % 1000}
          aria-valuemax={1000}
          aria-valuetext={`${xp % 1000} out of 1000 experience points to next level`}
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
              <kbd className="skill-key">{slot}</kbd>
            </button>
          ))}
          <button 
            className={`hud-skill-slot inventory-btn ${inventoryOpen ? 'active' : ''}`}
            onClick={toggleInventory}
            aria-label="Open Inventory"
            aria-keyshortcuts="i"
            title="Toggle Inventory (I)"
          >
            <kbd className="skill-key">I</kbd>
            <i className="icon-bag" />
          </button>
        </div>
      </div>

      {loot && loot.length > 0 && (
        <div className="hud-loot-prompt">
          <button
            className="loot-button"
            onClick={() => sendCommand("loot_all")}
            aria-label={`Take all ${loot.length} items`}
          >
            <kbd className="loot-key">F</kbd>
            <span>Take All Loot ({loot.length})</span>
          </button>
        </div>
      )}

      {deviceTier === ("mobile" as any) && (
        <div className="hud-mobile-controls">
          {/* Mobile specific controls would go here */}
        </div>
      )}
    </div>
  );
};