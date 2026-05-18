import React, { useState } from 'react';
import ReactDOM from 'react-dom/client';
import * as Apps from './apps';
import './app/globals.css';
import { RealityBadge } from './components/ui/RealityBadge';

const App = () => {
  const [activeApp, setActiveApp] = useState<string | null>(null);

  const appsList = [
    { id: 'robot-arm', name: 'Robot Arm', component: Apps.RobotArm },
    { id: 'medical-console', name: 'Medical Console', component: Apps.MedicalConsole },
    { id: 'logistics', name: 'Logistics Hub', component: Apps.LogisticsHub },
    { id: 'school-portal', name: 'School Portal', component: Apps.SchoolPortal },
    { id: 'logic-grid', name: 'Logic Grid', component: Apps.LogicGrid },
    { id: 'science-portal', name: 'Science Portal', component: Apps.SciencePortal },
    { id: 'agri-sim', name: 'Agri-Sim', component: Apps.AgriSim },
    { id: 'urban-flow', name: 'Urban Flow', component: Apps.UrbanFlow },
    { id: 'fitness', name: 'Fitness', component: Apps.FitnessTracker },
    { id: 'crypto-pulse', name: 'Crypto Pulse', component: Apps.CryptoPulse },
    { id: 'eco-trader', name: 'Eco-Trader', component: Apps.EcoTrader },
    { id: 'social', name: 'Social Hub', component: Apps.SocialHub },
    { id: 'arena', name: 'Arena', component: Apps.Arena },
    { id: 'edu-sim', name: 'Edu-Sim', component: Apps.EduSim },
  ];

  const renderActiveApp = () => {
    const active = appsList.find(a => a.id === activeApp);
    if (!active) return null;
    const Component = active.component;
    return <Component />;
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white p-8">
      <header className="mb-8 flex justify-between items-center">
        <div className="flex items-center gap-6">
          <h1 className="text-3xl font-bold text-cyan-400">ARE-Logic Portal</h1>
          <RealityBadge />
        </div>
        {activeApp && (
          <button
            onClick={() => setActiveApp(null)}
            className="px-4 py-2 bg-slate-800 rounded hover:bg-slate-700 transition-colors"
          >
            ← Back to Portal
          </button>
        )}
      </header>

      {!activeApp ? (
        <ul className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {appsList.map(app => (
            <li key={app.id}>
              <button
                onClick={() => setActiveApp(app.id)}
                aria-label={`Launch ${app.name} module`}
                className="w-full text-left bg-slate-800 p-6 rounded-xl cursor-pointer hover:bg-slate-700 hover:ring-2 hover:ring-cyan-500 focus-visible:ring-2 focus-visible:ring-cyan-500 outline-none transition-all"
              >
                <h2 className="text-xl font-bold">{app.name}</h2>
                <p className="text-sm text-slate-400 mt-2">Click to launch module</p>
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <div className="mt-8">
          {renderActiveApp()}
        </div>
      )}
    </div>
  );
};

const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement);
root.render(<App />);
