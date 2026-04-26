import React, { useState, useEffect } from "react";
import { 
  getPlayerLevel, getPlayerXp,
  subscribePlayerState,
  getPlayerStateRaw
} from "../../state/playerState";
import { ACTIVE_COMBAT_SKILLS, setQuickCastSkillId, getQuickCastSkillId } from "../../game/combatSkills";
import { sendUseSkill, sendCommand } from "../../networking/websocketClient";
import "./MasteryDashboard.css";

interface StatItemProps {
  label: string;
  value: number;
  onIncrease: () => void;
  onDecrease: () => void;
  disabled?: boolean;
}

const StatItem: React.FC<StatItemProps> = ({ label, value, onIncrease, onDecrease, disabled }) => (
  <div className="attribute-row">
    <span className="attr-label">{label}</span>
    <div className="attr-controls">
      <button onClick={onDecrease} disabled={disabled}>-</button>
      <div className="attr-bar">
        <div className="attr-fill" style={{ width: `${Math.min(100, (value / 50) * 100)}%` }}></div>
      </div>
      <span className="attr-value">{value}</span>
      <button onClick={onIncrease} disabled={disabled}>+</button>
    </div>
  </div>
);

export const MasteryDashboard: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [attributes, setAttributes] = useState({
    str: 10,
    dex: 10,
    int: 10,
    sta: 10,
    wis: 10,
    available: 5
  });

  const [quickCastId, setQuickCastId] = useState(getQuickCastSkillId());
  const [playerStats, setPlayerStats] = useState({
    level: getPlayerLevel(),
    xp: getPlayerXp(),
  });

  useEffect(() => {
    const sync = () => {
      setPlayerStats({
        level: getPlayerLevel(),
        xp: getPlayerXp(),
      });
      const raw = getPlayerStateRaw() as any;
      if (raw && raw.attributes) {
          setAttributes({
              str: raw.attributes.str || 10,
              dex: raw.attributes.dex || 10,
              int: raw.attributes.int || 10,
              sta: raw.attributes.sta || 10,
              wis: raw.attributes.wis || 10,
              available: raw.attributes.availablePoints || 0
          });
      }
    };
    sync();
    return subscribePlayerState(sync);
  }, []);

  useEffect(() => {
    const handleQuickChange = () => setQuickCastId(getQuickCastSkillId());
    window.addEventListener("areloria-quick-cast-changed", handleQuickChange);
    return () => window.removeEventListener("areloria-quick-cast-changed", handleQuickChange);
  }, []);

  const updateAttrLocal = (key: keyof typeof attributes, delta: number) => {
    setAttributes(prev => {
      if (key === 'available') return prev;
      const newVal = (prev[key] as number) + delta;
      if (newVal < 1 || (delta > 0 && prev.available <= 0)) return prev;
      return {
        ...prev,
        [key]: newVal,
        available: prev.available - delta
      };
    });
  };

  const handleConfirm = () => {
    sendCommand("update_attributes", attributes);
  };

  return (
    <div className="mastery-dashboard-overlay" onClick={onClose} onTouchStart={(e) => e.stopPropagation()} onPointerDown={(e) => e.stopPropagation()}>
      <div className="mastery-dashboard-card gold-frame" onClick={e => e.stopPropagation()} onTouchStart={(e) => e.stopPropagation()} onPointerDown={(e) => e.stopPropagation()}>
        <header className="dashboard-header">
          <div className="total-level">
            <span className="gold-text" style={{fontSize: "20px"}}>Mastery & Stats</span>
          </div>
          <div className="player-meta gold-text">Level {playerStats.level} · XP {playerStats.xp.toLocaleString()}</div>
          <button className="close-dashboard" onClick={onClose}>×</button>
        </header>

        <main className="dashboard-content">
          <section className="skills-grid-container">
            <h3 className="gold-text">COMBAT SKILLS</h3>
            <div className="skills-scroll-area">
              {ACTIVE_COMBAT_SKILLS.map(skill => (
                <div key={skill.id} className={`skill-dashboard-item ${quickCastId === skill.id ? 'quick-active' : ''}`}>
                  <div className="skill-icon-circle" onClick={() => sendUseSkill(skill.id)}>
                    {skill.id.includes("bolt") ? "🔥" : skill.id.includes("frost") ? "❄️" : skill.id.includes("arc") ? "⚡" : "✨"}
                  </div>
                  <div className="skill-dashboard-info">
                    <div style={{display: "flex", justifyContent: "space-between", alignItems: "center"}}>
                       <span className="skill-name">{skill.name}</span>
                       <button className={`set-quick-small ${quickCastId === skill.id ? 'active' : ''}`} onClick={() => setQuickCastSkillId(skill.id)}>
                          {quickCastId === skill.id ? "ACTIVE" : "SET QUICK"}
                       </button>
                    </div>
                    <span className="skill-xp-val">{skill.detail}</span>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="attributes-container gold-frame">
            <h3 className="gold-text">ATTRIBUTES</h3>
            <div className="attributes-list">
              <StatItem label="STR (Strength)" value={attributes.str} onIncrease={() => updateAttrLocal("str", 1)} onDecrease={() => updateAttrLocal("str", -1)} />
              <StatItem label="DEX (Dexterity)" value={attributes.dex} onIncrease={() => updateAttrLocal("dex", 1)} onDecrease={() => updateAttrLocal("dex", -1)} />
              <StatItem label="INT (Intelligence)" value={attributes.int} onIncrease={() => updateAttrLocal("int", 1)} onDecrease={() => updateAttrLocal("int", -1)} />
              <StatItem label="STA (Stamina)" value={attributes.sta} onIncrease={() => updateAttrLocal("sta", 1)} onDecrease={() => updateAttrLocal("sta", -1)} />
              <StatItem label="WIS (Wisdom)" value={attributes.wis} onIncrease={() => updateAttrLocal("wis", 1)} onDecrease={() => updateAttrLocal("wis", -1)} />
            </div>
            <div className="available-points">
              Points Available: <span className="gold-text" style={{fontSize: "20px"}}>{attributes.available}</span>
            </div>
            <button className="save-stats-btn" onClick={handleConfirm}>CONFIRM CHANGES</button>
          </section>
        </main>
      </div>
    </div>
  );
};
