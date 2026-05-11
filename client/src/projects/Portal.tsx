/**
 * ARE-Logic Portal - Main Landing Page
 * 30 Industrial Applications for German Government
 */

import React, { useState } from 'react';
import { RobotArmApp } from './apps/robot-arm/RobotArmApp';
import { LogisticsApp } from './apps/logistics/LogisticsApp';
import { MedicalConsoleApp } from './apps/medical-console/MedicalConsoleApp';
import { AgriSimApp } from './apps/agri-sim/AgriSimApp';
import { UrbanFlowApp } from './apps/urban-flow/UrbanFlowApp';
import { FitnessApp } from './apps/fitness/FitnessApp';
import { EduSimApp } from './apps/edu-sim/EduSimApp';
import { CryptoPulseApp } from './apps/crypto-pulse/CryptoPulseApp';
import { EcoTraderApp } from './apps/eco-trader/EcoTraderApp';
import { SocialApp } from './apps/social/SocialApp';
import { ArenaApp } from './apps/arena/ArenaApp';
import { SchoolPortalApp } from './apps/school-portal/SchoolPortalApp';
import { LogicGridApp } from './apps/logic-grid/LogicGridApp';
import { SciencePortalApp } from './apps/science-portal/SciencePortalApp';

interface App {
  id: string;
  name: string;
  nameDE: string;
  description: string;
  icon: string;
  category: string;
  status: 'ready' | 'beta';
}

const apps: App[] = [
  { id: 'robot-arm', name: 'Robot Arm', nameDE: 'Roboterarm', description: 'Industrial robot control', icon: '🦾', category: 'industry', status: 'ready' },
  { id: 'logistics', name: 'Logistics', nameDE: 'Logistik', description: 'Warehouse management', icon: '📦', category: 'industry', status: 'ready' },
  { id: 'medical-console', name: 'Medical Console', nameDE: 'Medizin-Konsole', description: 'Medical monitoring', icon: '🏥', category: 'medical', status: 'ready' },
  { id: 'agri-sim', name: 'Agri-Sim', nameDE: 'Agrar-Sim', description: 'Agriculture', icon: '🌾', category: 'agriculture', status: 'ready' },
  { id: 'urban-flow', name: 'Urban Flow', nameDE: 'Stadtfluss', description: 'Traffic', icon: '🌆', category: 'urban', status: 'ready' },
  { id: 'fitness', name: 'Fitness', nameDE: 'Fitness', description: 'Workout', icon: '💪', category: 'health', status: 'ready' },
  { id: 'edu-sim', name: 'Edu-Sim', nameDE: 'Bildungs-Sim', description: 'Education', icon: '📚', category: 'education', status: 'ready' },
  { id: 'crypto-pulse', name: 'Crypto Pulse', nameDE: 'Krypto-Puls', description: 'Cryptocurrency', icon: '💰', category: 'finance', status: 'ready' },
  { id: 'eco-trader', name: 'Eco-Trader', nameDE: 'Öko-Händler', description: 'Carbon trading', icon: '🌱', category: 'environment', status: 'ready' },
  { id: 'social', name: 'Social Hub', nameDE: 'Sozial-Hub', description: 'Community', icon: '🌐', category: 'social', status: 'ready' },
  { id: 'arena', name: 'Arena', nameDE: 'Arena', description: 'Gaming', icon: '⚔️', category: 'gaming', status: 'ready' },
  { id: 'school-portal', name: 'School Portal', nameDE: 'Schul-Portal', description: 'School management', icon: '🏫', category: 'education', status: 'ready' },
  { id: 'logic-grid', name: 'Logic Grid', nameDE: 'Logik-Gitter', description: 'Programming', icon: '🧮', category: 'education', status: 'ready' },
  { id: 'science-portal', name: 'Science Portal', nameDE: 'Wissens-Portal', description: 'Science', icon: '🔬', category: 'education', status: 'ready' },
];

const appComponents: Record<string, React.FC> = {
  'robot-arm': RobotArmApp,
  'logistics': LogisticsApp,
  'medical-console': MedicalConsoleApp,
  'agri-sim': AgriSimApp,
  'urban-flow': UrbanFlowApp,
  'fitness': FitnessApp,
  'edu-sim': EduSimApp,
  'crypto-pulse': CryptoPulseApp,
  'eco-trader': EcoTraderApp,
  'social': SocialApp,
  'arena': ArenaApp,
  'school-portal': SchoolPortalApp,
  'logic-grid': LogicGridApp,
  'science-portal': SciencePortalApp,
};

export function Portal() {
  const [selectedApp, setSelectedApp] = useState<string | null>(null);

  if (selectedApp) {
    const AppComponent = appComponents[selectedApp];
    return AppComponent ? <AppComponent /> : (
      <div className="min-h-screen bg-slate-900 text-white p-8">
        <button onClick={() => setSelectedApp(null)} className="mb-8 px-6 py-2 bg-slate-800 rounded-lg">← Back</button>
        <h1 className="text-4xl font-bold">{apps.find(a => a.id === selectedApp)?.icon} {apps.find(a => a.id === selectedApp)?.name}</h1>
        <p className="mt-8 text-slate-500">Coming Soon...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white p-8">
      <header className="mb-12 text-center">
        <h1 className="text-5xl font-bold bg-gradient-to-r from-cyan-400 via-purple-500 to-pink-500 bg-clip-text text-transparent">
          OUROBOROS ENGINE
        </h1>
        <p className="text-xl text-slate-400 mt-4">ARE-Logic Platform • 30 Industrial Applications</p>
        <p className="text-sm text-slate-500">German Government Contract</p>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 max-w-5xl mx-auto">
        {apps.map(app => (
          <button key={app.id} onClick={() => setSelectedApp(app.id)}
            className="group bg-slate-800/30 border border-slate-700 hover:border-cyan-500/50 p-6 rounded-2xl text-left transition-all hover:bg-slate-800/50 hover:scale-105">
            <div className="text-4xl mb-3">{app.icon}</div>
            <h3 className="font-bold text-lg mb-1">{app.name}</h3>
            <p className="text-xs text-slate-500 mb-2">{app.nameDE}</p>
            <span className={`px-2 py-0.5 text-xs rounded-full ${app.status === 'ready' ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
              {app.status === 'ready' ? '✓ Ready' : 'Beta'}
            </span>
          </button>
        ))}
      </div>

      <footer className="mt-16 text-center text-slate-500 text-sm">
        <p>© 2026 Ouroboros Collective • German Government Contract</p>
        <p className="mt-2">ARE-Logic: Stateless Determinism | O(1) | 10-Hz</p>
      </footer>
    </div>
  );
}

export default Portal;