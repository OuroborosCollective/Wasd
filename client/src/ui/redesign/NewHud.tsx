import React, { useMemo, useState, useEffect } from "react";
import type { EntityNet, QuestStateNet, LootNet } from "../../../shared/protocol";
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

type NewHudProps = {
  connected: boolean;
  youId?: string;
  entities: EntityNet[];
  loot: LootNet[];
  inv: any;
  quests: QuestStateNet[];
  targetId?: string;
  onTarget: (id: string | undefined) => void;
  onAttack: () => void;
  onLootTake: (lootId: string) => void;
  onCraftOpen: () => void;
  onHousingOpen: () => void;
  fxFeed: any[];
  questlineProgress?: string | null;
  onMenuOpen?: (panel: string) => void;
  warfront?: WarfrontHudState | null;
};

export const NewHud: React.FC<NewHudProps> = (p) => {
  const tier = getDeviceTier();
  const target = useMemo(() => p.entities.find((e) => e.id === p.targetId), [p.entities, p.targetId]);
  
  const [chatInput, setChatInput] = useState("");
  const [stats, setStats] = useState({
    hp: getPlayerHealth(),
    hpMax: getPlayerMaxHealth(),
    mp: getPlayerMana(),
    mpMax: getPlayerMaxMana(),
    xp: getPlayerXp(),
    level: getPlayerLevel()
  });

  useEffect(() => {
    const sync = () => {
      setStats({
        hp: getPlayerHealth(),
        hpMax: getPlayerMaxHealth(),
        mp: getPlayerMana(),
        mpMax: getPlayerMaxMana(),
        xp: getPlayerXp(),
        level: getPlayerLevel()
      });
    };
    sync();
    return subscribePlayerState(sync);
  }, []);

  const hpPerc = Math.min(100, Math.max(0, (stats.hp / (stats.hpMax || 100)) * 100));
  const mpPerc = Math.min(100, Math.max(0, (stats.mp / (stats.mpMax || 25)) * 100));
  
  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    sendCommand("chat_message", { text: chatInput });
    setChatInput("");
  };

  const renderTopLeft = () => (
    <div className="hud-section top-left" onTouchStart={(e) => e.stopPropagation()} onPointerDown={(e) => e.stopPropagation()}>
      <div className="game-brand">
        <h1 className="gold-text">Areloria</h1>
        <p>Online</p>
      </div>
      <div className="quest-tracker gold-frame">
        <h3 className="gold-text">Quest Tracker</h3>
        {p.quests && p.quests.length > 0 ? (
          p.quests.filter(q => !q.done).map(q => (
            <div key={q.id} className="quest-item">
              <span className="quest-title">{q.title}</span>
            </div>
          ))
        ) : (
          <p className="no-quests">Explore the world...</p>
        )}
      </div>
      <WarfrontPanel warfront={p.warfront ?? null} />
    </div>
  );

  const renderTopRight = () => (
    <div className="hud-section top-right" onTouchStart={(e) => e.stopPropagation()} onPointerDown={(e) => e.stopPropagation()}>
      <div className="minimap-orb gold-frame">
        <div className="minimap-placeholder">
           <img src="/assets/ui-redesign/master_hud.png" alt="Map" style={{width: "100%", height: "100%", borderRadius: "50%", opacity: 0.5, objectFit: "cover"}} />
        </div>
        <div className="location-label gold-text">Areloria Hub</div>
      </div>
    </div>
  );

  const handleKeyDown = (e: React.KeyboardEvent, action: () => void) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      action();
    }
  };

  const renderBottomCenter = () => (
    <div className="hud-section bottom-center" onTouchStart={(e) => e.stopPropagation()} onPointerDown={(e) => e.stopPropagation()}>
      <div className="action-orb-layout">
        <div className="skill-row left">
          <div className="skill-slot" onClick={() => sendUseSkill("frost_shard")} onKeyDown={(e) => handleKeyDown(e, () => sendUseSkill("frost_shard"))} role="button" tabIndex={0} aria-label="Use Frost Shard" title="Frost Shard">❄️</div>
          <div className="skill-slot" onClick={() => sendUseSkill("arc_spark")} onKeyDown={(e) => handleKeyDown(e, () => sendUseSkill("arc_spark"))} role="button" tabIndex={0} aria-label="Use Arc Spark" title="Arc Spark">⚡</div>
          <div className="skill-slot" onClick={() => sendUseSkill("vitality_tap")} onKeyDown={(e) => handleKeyDown(e, () => sendUseSkill("vitality_tap"))} role="button" tabIndex={0} aria-label="Use Vitality Tap" title="Vitality Tap">✨</div>
        </div>
        
        <div className="orb-container">
          <div className="central-orb" onClick={p.onAttack} onKeyDown={(e) => handleKeyDown(e, p.onAttack)} role="button" tabIndex={0} aria-label="Attack">
            <div className="orb-inner-glow"></div>
            <span className="gold-text" style={{fontSize: "10px", fontWeight: "bold"}}>ATTACK</span>
          </div>
          <div className="hp-ring-container">
             <svg width="120" height="120">
               {/* Background tracks */}
               <circle cx="60" cy="60" r="54" fill="none" stroke="rgba(0,0,0,0.5)" strokeWidth="8" />
               <circle cx="60" cy="60" r="44" fill="none" stroke="rgba(0,0,0,0.5)" strokeWidth="6" />
               
               {/* HP Ring (Outer) */}
               <circle cx="60" cy="60" r="54" fill="none" stroke="#ff4444" strokeWidth="8" 
                 strokeDasharray="339.29" strokeDashoffset={339.29 - (339.29 * hpPerc / 100)} 
                 transform="rotate(-90 60 60)" strokeLinecap="round" />
                 
               {/* MP Ring (Inner) */}
               <circle cx="60" cy="60" r="44" fill="none" stroke="#4488ff" strokeWidth="6" 
                 strokeDasharray="276.46" strokeDashoffset={276.46 - (276.46 * mpPerc / 100)} 
                 transform="rotate(-90 60 60)" strokeLinecap="round" />
             </svg>
          </div>
        </div>

        <div className="skill-row right">
          <div className="skill-slot" onClick={() => sendUseSkill("ember_bolt")} onKeyDown={(e) => handleKeyDown(e, () => sendUseSkill("ember_bolt"))} role="button" tabIndex={0} aria-label="Use Ember Bolt" title="Ember Bolt">🔥</div>
          <div className="skill-slot" onClick={() => sendUseSkill("shadow_tag")} onKeyDown={(e) => handleKeyDown(e, () => sendUseSkill("shadow_tag"))} role="button" tabIndex={0} aria-label="Use Shadow Tag" title="Shadow Tag">💀</div>
          <div className="skill-slot" onClick={() => sendUseSkill("aether_pulse")} onKeyDown={(e) => handleKeyDown(e, () => sendUseSkill("aether_pulse"))} role="button" tabIndex={0} aria-label="Use Aether Pulse" title="Aether Pulse">💫</div>
        </div>
      </div>
      
      <div className="xp-container">
        <div className="xp-bar-container">
          <div className="xp-bar-fill" style={{width: `${(stats.xp % 1000) / 10}%`}}></div>
        </div>
        <span className="xp-text gold-text">Level {stats.level}</span>
      </div>
    </div>
  );

  const renderBottomLeft = () => (
    <div className="hud-section bottom-left gold-frame" onTouchStart={(e) => e.stopPropagation()} onPointerDown={(e) => e.stopPropagation()}>
      <div className="chat-tabs">
        <span className="active">Global</span>
        <span>Trade</span>
      </div>
      <div className="chat-area">
        <div className="chat-preview" role="log" aria-live="polite">
          <p><span className="user gold-text">[System]:</span> Welcome to Areloria!</p>
          {p.fxFeed && p.fxFeed.slice(-5).map((f: any, i: number) => (
              <p key={i}><span className="user gold-text">[Event]:</span> {f.kind} triggered</p>
          ))}
        </div>
        <form onSubmit={handleSendChat} className="chat-form">
          <input 
            type="text" 
            value={chatInput} 
            onChange={e => setChatInput(e.target.value)} 
            placeholder="Type message..." 
            aria-label="Chat message"
          />
        </form>
      </div>
    </div>
  );

  const renderSideMenu = () => (
    <div className="hud-section side-menu" onTouchStart={(e) => e.stopPropagation()} onPointerDown={(e) => e.stopPropagation()}>
       <button className="menu-btn" onClick={() => p.onMenuOpen?.("inventory")} title="Inventory" aria-label="Open Inventory">🎒</button>
       <button className="menu-btn" onClick={() => p.onMenuOpen?.("skills")} title="Skills" aria-label="Open Skills">📜</button>
       <button className="menu-btn" onClick={() => p.onMenuOpen?.("equipment")} title="Equipment" aria-label="Open Equipment">🛡️</button>
       <button className="menu-btn" onClick={() => p.onMenuOpen?.("stats")} title="Mastery" aria-label="Open Mastery">📊</button>
    </div>
  );

  return (
    <div className={`new-hud-container ${tier}`}>
      {renderTopLeft()}
      {renderTopRight()}
      {renderBottomCenter()}
      {renderBottomLeft()}
      {renderSideMenu()}
      
      {target && (
        <div className="target-frame gold-frame" onTouchStart={(e) => e.stopPropagation()} onPointerDown={(e) => e.stopPropagation()}>
          <div className="target-hp-bar">
             <div className="fill" style={{width: `${(target.hp / (target.hpMax || 100)) * 100}%`}}></div>
          </div>
          <span className="target-name gold-text">{target.name || "Enemy"}</span>
        </div>
      )}
    </div>
  );
};
