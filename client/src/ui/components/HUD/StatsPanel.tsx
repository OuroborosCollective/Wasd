/**
 * StatsPanel Component
 * Displays player statistics with improved visual feedback
 * 
 * Features:
 * - Animated health/mana bars
 * - Buff/debuff display
 * - Experience progress
 * - Level display
 * - Responsive design
 */

import React, { useState, useMemo } from 'react';
import Image from 'next/image';
import './StatsPanel.css';

export interface PlayerStats {
  health: number;
  maxHealth: number;
  mana: number;
  maxMana: number;
  level: number;
  experience: number;
  experienceToNextLevel: number;
  buffs: Buff[];
  debuffs: Debuff[];
}

export interface Buff {
  id: string;
  name: string;
  icon: string;
  duration: number;
  type: 'buff' | 'debuff';
}

export interface Debuff {
  id: string;
  name: string;
  icon: string;
  duration: number;
  type: 'debuff';
}

interface StatsPanelProps {
  stats: PlayerStats;
  onStatClick?: (stat: string) => void;
  className?: string;
}

/**
 * Animated Health Bar Component
 */
const HealthBar: React.FC<{
  current: number;
  max: number;
  animated?: boolean;
}> = ({ current, max, animated }) => {
  const percentage = (current / max) * 100;
  const isLow = percentage < 30;
  const isCritical = percentage < 10;

  return (
    <div className={`health-bar-container ${isLow ? 'low' : ''} ${isCritical ? 'critical' : ''}`}>
      <div className="health-bar-label">
        <span className="label">HP</span>
        <span className="value">{Math.ceil(current)} / {Math.ceil(max)}</span>
      </div>
      <div className="health-bar-background">
        <div
          className={`health-bar-fill ${animated ? 'animated' : ''}`}
          style={{ width: `${percentage}%` }}
        >
          <div className="health-bar-shine" />
        </div>
      </div>
      <div className="health-bar-damage-indicator" />
    </div>
  );
};

/**
 * Mana Bar Component
 */
const ManaBar: React.FC<{
  current: number;
  max: number;
}> = ({ current, max }) => {
  const percentage = (current / max) * 100;

  return (
    <div className="mana-bar-container">
      <div className="mana-bar-label">
        <span className="label">Mana</span>
        <span className="value">{Math.ceil(current)} / {Math.ceil(max)}</span>
      </div>
      <div className="mana-bar-background">
        <div
          className="mana-bar-fill"
          style={{ width: `${percentage}%` }}
        >
          <div className="mana-bar-shine" />
        </div>
      </div>
    </div>
  );
};

/**
 * Experience Bar Component
 */
const ExperienceBar: React.FC<{
  current: number;
  nextLevel: number;
  level: number;
}> = ({ current, nextLevel, level }) => {
  const percentage = (current / nextLevel) * 100;

  return (
    <div className="experience-bar-container">
      <div className="experience-bar-label">
        <span className="label">Level {level}</span>
        <span className="value">{Math.ceil(current)} / {Math.ceil(nextLevel)} XP</span>
      </div>
      <div className="experience-bar-background">
        <div
          className="experience-bar-fill"
          style={{ width: `${percentage}%` }}
        >
          <div className="experience-bar-shine" />
        </div>
      </div>
    </div>
  );
};

/**
 * Buff/Debuff Display Component
 */
const BuffDisplay: React.FC<{
  buffs: Buff[];
  debuffs: Debuff[];
}> = ({ buffs, debuffs }) => {
  const allEffects = [...buffs, ...debuffs];

  if (allEffects.length === 0) {
    return null;
  }

  return (
    <div className="buff-display">
      <div className="buff-container">
        {allEffects.map((effect) => (
          <BuffIcon
            key={effect.id}
            effect={effect}
            isBuff={effect.type === 'buff'}
          />
        ))}
      </div>
    </div>
  );
};

/**
 * Individual Buff Icon Component
 */
const BuffIcon: React.FC<{
  effect: Buff | Debuff;
  isBuff: boolean;
}> = ({ effect, isBuff }) => {
  const [showTooltip, setShowTooltip] = useState(false);

  return (
    <div
      className={`buff-icon ${isBuff ? 'buff' : 'debuff'}`}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <Image src={effect.icon} alt={effect.name} width={24} height={24} referrerPolicy="no-referrer" />
      <div className="buff-duration">{Math.ceil(effect.duration)}s</div>
      {showTooltip && (
        <div className="buff-tooltip">
          <div className="tooltip-name">{effect.name}</div>
          <div className="tooltip-duration">{Math.ceil(effect.duration)}s remaining</div>
        </div>
      )}
    </div>
  );
};

/**
 * Main StatsPanel Component
 */
export const StatsPanel: React.FC<StatsPanelProps> = ({
  stats,
  onStatClick,
  className = ''
}) => {
  const isLowHealth = stats.health < stats.maxHealth * 0.3;

  return (
    <div className={`stats-panel ${className} ${isLowHealth ? 'low-health-warning' : ''}`}>
      <div className="stats-panel-content">
        {/* Primary Stats */}
        <div className="primary-stats">
          <div className="stat-section" onClick={() => onStatClick?.('health')}>
            <HealthBar
              current={stats.health}
              max={stats.maxHealth}
              animated={isLowHealth}
            />
          </div>

          <div className="stat-section" onClick={() => onStatClick?.('mana')}>
            <ManaBar current={stats.mana} max={stats.maxMana} />
          </div>

          <div className="stat-section" onClick={() => onStatClick?.('experience')}>
            <ExperienceBar
              current={stats.experience}
              nextLevel={stats.experienceToNextLevel}
              level={stats.level}
            />
          </div>
        </div>

        {/* Buffs/Debuffs */}
        <div className="effects-section">
          <BuffDisplay buffs={stats.buffs} debuffs={stats.debuffs} />
        </div>
      </div>
    </div>
  );
};

export default StatsPanel;
