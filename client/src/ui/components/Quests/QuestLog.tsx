/**
 * QuestLog Component
 * Displays active, completed, and available quests with detailed tracking
 * 
 * Features:
 * - Quest list with categories
 * - Detailed quest information
 * - Objective tracking
 * - Reward preview
 * - Quest markers on map
 * - Auto-track functionality
 */

import React, { useState, useMemo } from 'react';
import './QuestLog.css';

export type QuestStatus = 'active' | 'completed' | 'available' | 'failed';
export type ObjectiveType = 'kill' | 'collect' | 'deliver' | 'explore' | 'talk' | 'use';

export interface Objective {
  id: string;
  type: ObjectiveType;
  description: string;
  target: number;
  current: number;
  location?: { x: number; y: number; z: number };
  npcId?: string;
  itemId?: string;
}

export interface QuestReward {
  experiencePoints: number;
  gold: number;
  items?: Array<{
    id: string;
    name: string;
    rarity: string;
    quantity: number;
  }>;
  reputation?: {
    faction: string;
    amount: number;
  };
}

export interface Quest {
  id: string;
  name: string;
  description: string;
  giver: string;
  level: number;
  status: QuestStatus;
  progress: number; // 0-100
  objectives: Objective[];
  rewards: QuestReward;
  startedAt?: number;
  completedAt?: number;
  deadline?: number;
  repeatable?: boolean;
  prerequisite?: string;
  category?: string;
}

interface QuestLogProps {
  quests: Quest[];
  selectedQuestId?: string;
  trackedQuestId?: string;
  onSelectQuest?: (quest: Quest) => void;
  onTrackQuest?: (quest: Quest) => void;
  onCompleteQuest?: (questId: string) => void;
  onAbandonQuest?: (questId: string) => void;
  className?: string;
}

/**
 * Quest List Item Component
 */
const QuestListItem: React.FC<{
  quest: Quest;
  isSelected: boolean;
  isTracked: boolean;
  onClick: () => void;
  onTrack: () => void;
}> = ({ quest, isSelected, isTracked, onClick, onTrack }) => {
  const getStatusColor = (status: QuestStatus): string => {
    const colors: Record<QuestStatus, string> = {
      active: '#ffd700',
      completed: '#88ff88',
      available: '#6b9fff',
      failed: '#ff6b6b'
    };
    return colors[status];
  };

  const getStatusIcon = (status: QuestStatus): string => {
    const icons: Record<QuestStatus, string> = {
      active: '⚔️',
      completed: '✓',
      available: '?',
      failed: '✗'
    };
    return icons[status];
  };

  return (
    <div
      className={`quest-list-item ${quest.status} ${isSelected ? 'selected' : ''} ${
        isTracked ? 'tracked' : ''
      }`}
      onClick={onClick}
    >
      <div className="quest-item-header">
        <div className="quest-status-icon" style={{ color: getStatusColor(quest.status) }}>
          {getStatusIcon(quest.status)}
        </div>
        <div className="quest-item-info">
          <div className="quest-name">{quest.name}</div>
          <div className="quest-giver">from {quest.giver}</div>
        </div>
        <div className="quest-level">Lvl {quest.level}</div>
      </div>

      <div className="quest-progress-bar">
        <div className="progress-fill" style={{ width: `${quest.progress}%` }} />
        <div className="progress-text">{quest.progress}%</div>
      </div>

      <div className="quest-item-actions">
        {quest.status === 'active' && (
          <button
            className="track-btn"
            onClick={(e) => {
              e.stopPropagation();
              onTrack();
            }}
            title={isTracked ? 'Untrack' : 'Track'}
          >
            {isTracked ? '📍' : '📌'}
          </button>
        )}
      </div>
    </div>
  );
};

/**
 * Objective Tracker Component
 */
const ObjectiveTracker: React.FC<{ objective: Objective }> = ({ objective }) => {
  const progress = (objective.current / objective.target) * 100;
  const isComplete = objective.current >= objective.target;

  const getObjectiveIcon = (type: ObjectiveType): string => {
    const icons: Record<ObjectiveType, string> = {
      kill: '⚔️',
      collect: '📦',
      deliver: '📬',
      explore: '🗺️',
      talk: '💬',
      use: '🔧'
    };
    return icons[type];
  };

  return (
    <div className={`objective-tracker ${isComplete ? 'complete' : ''}`}>
      <div className="objective-header">
        <span className="objective-icon">{getObjectiveIcon(objective.type)}</span>
        <span className="objective-description">{objective.description}</span>
        <span className="objective-count">
          {objective.current}/{objective.target}
        </span>
      </div>
      <div className="objective-progress-bar">
        <div className="progress-fill" style={{ width: `${Math.min(progress, 100)}%` }} />
      </div>
    </div>
  );
};

/**
 * Quest Reward Preview Component
 */
const QuestRewardPreview: React.FC<{ reward: QuestReward }> = ({ reward }) => {
  return (
    <div className="quest-reward-preview">
      <div className="reward-header">Rewards</div>

      <div className="reward-items">
        {reward.experiencePoints > 0 && (
          <div className="reward-item exp">
            <span className="reward-icon">⭐</span>
            <span className="reward-label">Experience</span>
            <span className="reward-value">{reward.experiencePoints.toLocaleString()} XP</span>
          </div>
        )}

        {reward.gold > 0 && (
          <div className="reward-item gold">
            <span className="reward-icon">💰</span>
            <span className="reward-label">Gold</span>
            <span className="reward-value">{reward.gold.toLocaleString()}</span>
          </div>
        )}

        {reward.reputation && (
          <div className="reward-item reputation">
            <span className="reward-icon">🏆</span>
            <span className="reward-label">{reward.reputation.faction}</span>
            <span className="reward-value">+{reward.reputation.amount}</span>
          </div>
        )}
      </div>

      {reward.items && reward.items.length > 0 && (
        <div className="reward-items-list">
          <div className="items-header">Items</div>
          {reward.items.map((item) => (
            <div key={item.id} className={`reward-item-entry rarity-${item.rarity}`}>
              <span className="item-name">{item.name}</span>
              {item.quantity > 1 && <span className="item-quantity">x{item.quantity}</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

/**
 * Quest Detail Component
 */
const QuestDetail: React.FC<{
  quest: Quest;
  onComplete?: () => void;
  onAbandon?: () => void;
}> = ({ quest, onComplete, onAbandon }) => {
  return (
    <div className="quest-detail">
      <div className="detail-header">
        <h2 className="detail-title">{quest.name}</h2>
        <div className="detail-meta">
          <span className="meta-level">Level {quest.level}</span>
          <span className={`meta-status ${quest.status}`}>{quest.status.toUpperCase()}</span>
        </div>
      </div>

      <div className="detail-giver">
        <span className="giver-label">Quest Giver:</span>
        <span className="giver-name">{quest.giver}</span>
      </div>

      <div className="detail-description">{quest.description}</div>

      {quest.objectives.length > 0 && (
        <div className="detail-objectives">
          <div className="objectives-header">Objectives</div>
          {quest.objectives.map((objective) => (
            <ObjectiveTracker key={objective.id} objective={objective} />
          ))}
        </div>
      )}

      <QuestRewardPreview reward={quest.rewards} />

      {quest.deadline && (
        <div className="detail-deadline">
          <span className="deadline-label">Deadline:</span>
          <span className="deadline-time">
            {new Date(quest.deadline).toLocaleString()}
          </span>
        </div>
      )}

      <div className="detail-actions">
        {quest.status === 'active' && (
          <>
            <button className="action-btn complete-btn" onClick={onComplete}>
              Complete Quest
            </button>
            <button className="action-btn abandon-btn" onClick={onAbandon}>
              Abandon Quest
            </button>
          </>
        )}
        {quest.status === 'available' && (
          <button className="action-btn accept-btn">Accept Quest</button>
        )}
        {quest.status === 'completed' && (
          <button className="action-btn completed-btn" disabled>
            ✓ Completed
          </button>
        )}
      </div>
    </div>
  );
};

/**
 * Main QuestLog Component
 */
export const QuestLog: React.FC<QuestLogProps> = ({
  quests,
  selectedQuestId,
  trackedQuestId,
  onSelectQuest,
  onTrackQuest,
  onCompleteQuest,
  onAbandonQuest,
  className = ''
}) => {
  const [activeTab, setActiveTab] = useState<QuestStatus>('active');

  /**
   * Group quests by status
   */
  const groupedQuests = useMemo(() => {
    const groups: Record<QuestStatus, Quest[]> = {
      active: [],
      completed: [],
      available: [],
      failed: []
    };

    quests.forEach((quest) => {
      groups[quest.status].push(quest);
    });

    return groups;
  }, [quests]);

  const selectedQuest = quests.find((q) => q.id === selectedQuestId);
  const currentQuests = groupedQuests[activeTab];

  const getTabCount = (status: QuestStatus): number => {
    return groupedQuests[status].length;
  };

  return (
    <div className={`quest-log-container ${className}`}>
      {/* Header */}
      <div className="quest-log-header">
        <h1 className="quest-log-title">Quest Log</h1>
      </div>

      {/* Tabs */}
      <div className="quest-tabs">
        {(['active', 'available', 'completed', 'failed'] as QuestStatus[]).map((tab) => (
          <button
            key={tab}
            className={`tab-btn ${tab} ${activeTab === tab ? 'active' : ''}`}
            onClick={() => setActiveTab(tab)}
          >
            <span className="tab-label">{tab.charAt(0).toUpperCase() + tab.slice(1)}</span>
            <span className="tab-count">{getTabCount(tab)}</span>
          </button>
        ))}
      </div>

      <div className="quest-log-content">
        {/* Quest List */}
        <div className="quest-list">
          {currentQuests.length === 0 ? (
            <div className="quest-list-empty">
              <div className="empty-icon">📜</div>
              <div className="empty-text">No {activeTab} quests</div>
            </div>
          ) : (
            currentQuests.map((quest) => (
              <QuestListItem
                key={quest.id}
                quest={quest}
                isSelected={selectedQuest?.id === quest.id}
                isTracked={trackedQuestId === quest.id}
                onClick={() => onSelectQuest?.(quest)}
                onTrack={() => onTrackQuest?.(quest)}
              />
            ))
          )}
        </div>

        {/* Quest Detail */}
        {selectedQuest && (
          <QuestDetail
            quest={selectedQuest}
            onComplete={() => onCompleteQuest?.(selectedQuest.id)}
            onAbandon={() => onAbandonQuest?.(selectedQuest.id)}
          />
        )}
      </div>
    </div>
  );
};

export default QuestLog;
