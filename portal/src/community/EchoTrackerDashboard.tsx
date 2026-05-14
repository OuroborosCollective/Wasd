import React, { useState } from 'react';

interface Quest {
  id: string;
  title: string;
  type: 'COMBAT' | 'EXPLORATION' | 'SOCIAL' | 'CRAFTING';
  status: 'ACTIVE' | 'PENDING';
}

class QuestBeaconPulse {
  private frequency: number;
  private questType: string;

  constructor(type: Quest['type']) {
    this.questType = type;
    switch (type) {
      case 'COMBAT':
        this.frequency = 0.95;
        break;
      case 'EXPLORATION':
        this.frequency = 0.60;
        break;
      case 'SOCIAL':
        this.frequency = 0.40;
        break;
      case 'CRAFTING':
        this.frequency = 0.25;
        break;
      default:
        this.frequency = 0.50;
    }
  }

  public renderSignalWave(): React.CSSProperties {
    const duration = 1 / this.frequency;
    return {
      animationDuration: `${duration.toFixed(3)}s`,
      opacity: Math.max(0.4, this.frequency),
      boxShadow: `0 0 ${10 * this.frequency}px var(--glow-color)`
    };
  }

  public getFrequency(): number {
    return this.frequency;
  }
}

const EchoTrackerDashboard: React.FC = () => {
  const [activeQuests] = useState<Quest[]>([
    { id: 'Q-001', title: 'Sektor-Delta Reinigung', type: 'COMBAT', status: 'ACTIVE' },
    { id: 'Q-002', title: 'Datenkern Bergung', type: 'EXPLORATION', status: 'ACTIVE' },
    { id: 'Q-003', title: 'Diplomatischer Austausch', type: 'SOCIAL', status: 'ACTIVE' },
    { id: 'Q-004', title: 'Reaktor Reparatur', type: 'CRAFTING', status: 'ACTIVE' },
    { id: 'Q-005', title: 'Abfangmanöver', type: 'COMBAT', status: 'ACTIVE' }
  ]);

  return (
    <div style={{
      backgroundColor: '#05070a',
      color: '#00f2ff',
      padding: '2rem',
      fontFamily: 'monospace',
      minHeight: '100vh'
    }}>
      <style>
        {`
          @keyframes beacon-pulse {
            0% { transform: scale(0.9); filter: brightness(0.8); }
            50% { transform: scale(1.2); filter: brightness(1.5); }
            100% { transform: scale(0.9); filter: brightness(0.8); }
          }
          .dashboard-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
            gap: 1.5rem;
            margin-top: 2rem;
          }
          .quest-card {
            background: rgba(0, 242, 255, 0.05);
            border: 1px solid rgba(0, 242, 255, 0.2);
            padding: 1.5rem;
            border-radius: 4px;
            position: relative;
            overflow: hidden;
            transition: border-color 0.3s;
          }
          .quest-card:hover {
            border-color: #00f2ff;
          }
          .beacon {
            width: 12px;
            height: 12px;
            border-radius: 50%;
            margin-bottom: 1rem;
            animation-name: beacon-pulse;
            animation-iteration-count: infinite;
            animation-timing-function: ease-in-out;
          }
          .meta-info {
            font-size: 0.75rem;
            color: #557;
            margin-bottom: 0.5rem;
          }
          .title-text {
            font-size: 1.1rem;
            font-weight: bold;
            letter-spacing: 1px;
          }
          .combat-style { --glow-color: #ff3e3e; background-color: #ff3e3e; }
          .default-style { --glow-color: #00f2ff; background-color: #00f2ff; }
        `}
      </style>

      <header style={{ borderBottom: '2px solid #00f2ff', paddingBottom: '1rem' }}>
        <h1 style={{ margin: 0 }}>QUEST_ACTIVITY_MONITOR [ECHO_v4.2]</h1>
        <div style={{ fontSize: '0.8rem', opacity: 0.6 }}>ACTIVE_SIGNALS: {activeQuests.length} | SYNC_STABLE</div>
      </header>

      <div className="dashboard-grid">
        {activeQuests.map((quest) => {
          const tracker = new QuestBeaconPulse(quest.type);
          const isCombat = quest.type === 'COMBAT';

          return (
            <div key={quest.id} className="quest-card">
              <div 
                className={`beacon ${isCombat ? 'combat-style' : 'default-style'}`}
                style={tracker.renderSignalWave()}
              />
              <div className="meta-info">ID: {quest.id} // FREQ: {tracker.getFrequency().toFixed(2)}</div>
              <div className="title-text" style={{ color: isCombat ? '#ff3e3e' : '#00f2ff' }}>
                {quest.title}
              </div>
              <div style={{ marginTop: '1rem', fontSize: '0.7rem', display: 'flex', justifyContent: 'space-between' }}>
                <span>TYPE: {quest.type}</span>
                <span>STATUS: {quest.status}</span>
              </div>
            </div>
          );
        })}
      </div>

      <footer style={{ marginTop: '3rem', fontSize: '0.7rem', opacity: 0.4, textAlign: 'center' }}>
        SYSTEM_EXECUTION_LEVEL: MAXIMUM // ECHO_TRACKER_DASHBOARD_RENDERED
      </footer>
    </div>
  );
};

export default EchoTrackerDashboard;