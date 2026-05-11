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
  { id: 'logi-link', name: 'Logi-Link', nameDE: 'Logi-Link', description: 'Routing', icon: '🚚', category: 'industry', status: 'ready' },
  { id: 'retail-opt', name: 'Retail', nameDE: 'Retail', description: 'Retail optimization', icon: '🏪', category: 'industry', status: 'ready' },
  { id: 'factory-sim', name: 'Factory', nameDE: 'Fabrik', description: 'Factory planning', icon: '🏭', category: 'industry', status: 'beta' },
  { id: 'agri-sim', name: 'Agri-Sim', nameDE: 'Agrar-Sim', description: 'Agriculture', icon: '🌾', category: 'agriculture', status: 'ready' },
  { id: 'eco-trader', name: 'Eco-Trader', nameDE: 'Öko-Händler', description: 'Carbon trading', icon: '🌱', category: 'environment', status: 'ready' },
  { id: 'urban-flow', name: 'Urban Flow', nameDE: 'Stadtfluss', description: 'Traffic', icon: '🌆', category: 'urban', status: 'ready' },
  { id: 'urban', name: 'Urban Planner', nameDE: 'Stadtplaner', description: 'City planning', icon: '🏙️', category: 'urban', status: 'ready' },
  { id: 'city-design', name: 'City Designer', nameDE: 'Stadt-Designer', description: '3D design', icon: '🏗️', category: 'urban', status: 'beta' },
  { id: 'medical-console', name: 'Medical Console', nameDE: 'Medizin-Konsole', description: 'Medical monitoring', icon: '🏥', category: 'medical', status: 'ready' },
  { id: 'health-monitor', name: 'Health Monitor', nameDE: 'Gesundheits-Monitor', description: 'Health tracking', icon: '💓', category: 'medical', status: 'ready' },
  { id: 'fitness', name: 'Fitness', nameDE: 'Fitness', description: 'Workout', icon: '💪', category: 'health', status: 'ready' },
  { id: 'tamagotchi', name: 'Virtual Pet', nameDE: 'Haustier', description: 'Pet care', icon: '🐾', category: 'health', status: 'ready' },
  { id: 'edu-sim', name: 'Edu-Sim', nameDE: 'Bildungs-Sim', description: 'Education', icon: '📚', category: 'education', status: 'ready' },
  { id: 'school-portal', name: 'School Portal', nameDE: 'Schul-Portal', description: 'School management', icon: '🏫', category: 'education', status: 'ready' },
  { id: 'logic-grid', name: 'Logic Grid', nameDE: 'Logik-Gitter', description: 'Programming', icon: '🧮', category: 'education', status: 'ready' },
  { id: 'science-portal', name: 'Science Portal', nameDE: 'Wissens-Portal', description: 'Science', icon: '🔬', category: 'education', status: 'ready' },
  { id: 'crypto-pulse', name: 'Crypto Pulse', nameDE: 'Krypto-Puls', description: 'Cryptocurrency', icon: '💰', category: 'finance', status: 'ready' },
  { id: 'ads', name: 'Ad Manager', nameDE: 'Anzeigen', description: 'Advertising', icon: '📢', category: 'business', status: 'ready' },
  { id: 'trading', name: 'Trading', nameDE: 'Handel', description: 'Trading', icon: '📊', category: 'finance', status: 'ready' },
  { id: 'market-sim', name: 'Market Sim', nameDE: 'Markt-Sim', description: 'Market', icon: '📈', category: 'finance', status: 'ready' },
  { id: 'social-sim', name: 'Social Sim', nameDE: 'Sozial-Sim', description: 'Social', icon: '👥', category: 'social', status: 'ready' },
  { id: 'social', name: 'Social Hub', nameDE: 'Sozial-Hub', description: 'Community', icon: '🌐', category: 'social', status: 'ready' },
  { id: 'arena', name: 'Arena', nameDE: 'Arena', description: 'Gaming', icon: '⚔️', category: 'gaming', status: 'ready' },
  { id: 'story', name: 'Story', nameDE: 'Geschichte', description: 'Storytelling', icon: '📖', category: 'gaming', status: 'ready' },
  { id: 'card-logic', name: 'Card Logic', nameDE: 'Karten', description: 'Cards', icon: '🃏', category: 'gaming', status: 'ready' },
  { id: 'energy-grid', name: 'Energy Grid', nameDE: 'Energie', description: 'Energy', icon: '⚡', category: 'infrastructure', status: 'ready' },
  { id: 'water-sys', name: 'Water Systems', nameDE: 'Wasser', description: 'Water', icon: '💧', category: 'infrastructure', status: 'ready' },
  { id: 'transport', name: 'Transport', nameDE: 'Transport', description: 'Transport', icon: '🚇', category: 'infrastructure', status: 'beta' },
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
};

const categories = [...new Set(apps.map(a => a.category))];

export function Portal() {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
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
        <p className="text-sm text-slate-500">German Government Contract • Powered by Stateless Determinism</p>
      </header>

      <div className="flex flex-wrap justify-center gap-3 mb-12">
        <button onClick={() => setSelectedCategory('all')} className={`px-6 py-2 rounded-full ${selectedCategory === 'all' ? 'bg-cyan-500 text-slate-900' : 'bg-slate-800'}`}>
          All ({apps.length})
        </button>
        {categories.map(cat => (
          <button key={cat} onClick={() => setSelectedCategory(cat)} className={`px-6 py-2 rounded-full capitalize ${selectedCategory === cat ? 'bg-cyan-500 text-slate-900' : 'bg-slate-800'}`}>
            {cat} ({apps.filter(a => a.category === cat).length})
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 max-w-7xl mx-auto">
        {apps.filter(a => selectedCategory === 'all' || a.category === selectedCategory).map(app => (
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
        <p className="mt-2">ARE-Logic: Stateless Determinism | O(1) | 10-Hz Tick System</p>
      </footer>
    </div>
  );
}

export default Portal;