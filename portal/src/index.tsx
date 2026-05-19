import React, { useState } from 'react';
import ReactDOM from 'react-dom/client';
import * as Apps from './apps';
import './app/globals.css';

const App = () => {
  const [activeApp, setActiveApp] = useState<string | null>(null);

  const appsList = [
    { id: 'robot-arm', name: 'Robot Arm', component: Apps.RobotArm, sigil: '⚙️', tone: 'Forge automation and precision motion' },
    { id: 'medical-console', name: 'Medical Console', component: Apps.MedicalConsole, sigil: '✚', tone: 'Vital signs, triage and recovery loops' },
    { id: 'logistics', name: 'Logistics Hub', component: Apps.LogisticsHub, sigil: '◇', tone: 'Route pressure and cargo resonance' },
    { id: 'school-portal', name: 'School Portal', component: Apps.SchoolPortal, sigil: '⌘', tone: 'Learning gates and curriculum flows' },
    { id: 'logic-grid', name: 'Logic Grid', component: Apps.LogicGrid, sigil: '▦', tone: 'Axiom lattice and deterministic checks' },
    { id: 'science-portal', name: 'Science Portal', component: Apps.SciencePortal, sigil: '∴', tone: 'Experiment telemetry and ARE probes' },
    { id: 'agri-sim', name: 'Agri-Sim', component: Apps.AgriSim, sigil: '🌿', tone: 'Biome yields and village supply' },
    { id: 'urban-flow', name: 'Urban Flow', component: Apps.UrbanFlow, sigil: '▣', tone: 'Town layout, roads and civic rhythm' },
    { id: 'fitness', name: 'Fitness', component: Apps.FitnessTracker, sigil: '⟁', tone: 'Body metrics and stamina economy' },
    { id: 'crypto-pulse', name: 'Crypto Pulse', component: Apps.CryptoPulse, sigil: '◈', tone: 'Market signal and treasury pulse' },
    { id: 'eco-trader', name: 'Eco-Trader', component: Apps.EcoTrader, sigil: '♻', tone: 'Trade pressure and circular goods' },
    { id: 'social', name: 'Social Hub', component: Apps.SocialHub, sigil: '☉', tone: 'Guild presence and messenger net' },
    { id: 'arena', name: 'Arena', component: Apps.Arena, sigil: '⚔', tone: 'Combat lobby and challenge board' },
    { id: 'edu-sim', name: 'Edu-Sim', component: Apps.EduSim, sigil: '✦', tone: 'Scenario trainer and playbook engine' },
  ];

  const renderActiveApp = () => {
    const active = appsList.find(a => a.id === activeApp);
    if (!active) return null;
    const Component = active.component;
    return <Component />;
  };

  return (
    <div className="cz-portal-shell">
      <div className="cz-portal-grid" />
      <header className="cz-portal-header">
        <div>
          <p className="cz-portal-eyebrow">CYBERZEN COMMAND BRIDGE · ARE-LOGIC</p>
          <h1>{activeApp ? appsList.find((a) => a.id === activeApp)?.name : 'Areloria Portal'}</h1>
        </div>
        {activeApp ? (
          <button onClick={() => setActiveApp(null)} className="cz-back-button">← Back to Bridge</button>
        ) : (
          <div className="cz-live-pill"><span /> 10Hz visual layer online</div>
        )}
      </header>

      {!activeApp ? (
        <main className="cz-portal-main">
          <section className="cz-hero-card">
            <p className="cz-portal-eyebrow">Visual Contract</p>
            <h2>No more flat slate grid.</h2>
            <p>Portal modules now sit in the same Cyberzen art direction as the 2D and 3D clients: glass panels, neon borders, fantasy-tech naming and operational module cards.</p>
          </section>
          <section className="cz-module-grid">
            {appsList.map(app => (
              <button key={app.id} onClick={() => setActiveApp(app.id)} className="cz-module-card">
                <span className="cz-module-sigil">{app.sigil}</span>
                <strong>{app.name}</strong>
                <small>{app.tone}</small>
              </button>
            ))}
          </section>
        </main>
      ) : (
        <main className="cz-app-stage">{renderActiveApp()}</main>
      )}
    </div>
  );
};

const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement);
root.render(<App />);
