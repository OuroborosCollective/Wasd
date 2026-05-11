/**
 * Science Portal - Interactive Science Education
 * For German Minister of Education and Social Affairs
 */

import React, { useState, useEffect } from 'react';

interface Experiment {
  id: number;
  title: string;
  titleDE: string;
  description: string;
  descriptionDE: string;
  category: string;
  difficulty: number;
}

const experiments: Experiment[] = [
  { id: 1, title: 'Photosynthesis', titleDE: 'Photosynthese', description: 'How plants make food', descriptionDE: 'Wie Pflanzen Nahrung herstellen', category: 'biology', difficulty: 1 },
  { id: 2, title: 'Chemical Reactions', titleDE: 'Chemische Reaktionen', description: 'Mixing chemicals', descriptionDE: 'Chemikalien mischen', category: 'chemistry', difficulty: 2 },
  { id: 3, title: 'Newton Laws', titleDE: 'Newtons Gesetze', description: 'Motion and forces', descriptionDE: 'Bewegung und Kräfte', category: 'physics', difficulty: 2 },
  { id: 4, title: 'DNA Structure', titleDE: 'DNA-Struktur', description: 'Genetic code', descriptionDE: 'Genetischer Code', category: 'biology', difficulty: 3 },
  { id: 5, title: 'Electromagnetism', titleDE: 'Elektromagnetismus', description: 'Electric and magnetic fields', descriptionDE: 'Elektrische und magnetische Felder', category: 'physics', difficulty: 4 },
  { id: 6, title: 'Periodic Table', titleDE: 'Periodensystem', description: 'Elements and their properties', descriptionDE: 'Elemente und ihre Eigenschaften', category: 'chemistry', difficulty: 3 },
];

const simulations = [
  { id: 1, name: 'Solar System', icon: '🪐', active: true },
  { id: 2, name: 'Atom Model', icon: '⚛️', active: true },
  { id: 3, name: 'DNA Double Helix', icon: '🧬', active: true },
  { id: 4, name: 'Climate Model', icon: '🌍', active: false },
];

const scienceFacts = [
  { fact: 'Light travels at 299,792,458 m/s', category: 'physics' },
  { fact: 'Human body has 37.2 trillion cells', category: 'biology' },
  { fact: 'Gold is element 79 in periodic table', category: 'chemistry' },
  { fact: 'Earth is 4.54 billion years old', category: 'earth' },
];

export function SciencePortalApp() {
  const [activeTab, setActiveTab] = useState<'experiments' | 'simulations' | 'facts'>('experiments');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const categories = ['all', 'biology', 'physics', 'chemistry', 'earth'];

  return (
    <div className="min-h-screen bg-gradient-to-br from-cyan-900 via-blue-900 to-slate-900 text-white p-8">
      <div className="max-w-6xl mx-auto">
        <header className="mb-8 text-center">
          <div className="text-6xl mb-4">🔬</div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
            Science Portal
          </h1>
          <p className="text-cyan-300 mt-2">Interactive Science Education • ARE-Logic Powered</p>
        </header>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          <div className="bg-cyan-800/50 border border-cyan-500/30 p-4 rounded-xl text-center">
            <div className="text-3xl font-bold">6</div>
            <div className="text-sm text-cyan-300">Experiments</div>
          </div>
          <div className="bg-cyan-800/50 border border-cyan-500/30 p-4 rounded-xl text-center">
            <div className="text-3xl font-bold">4</div>
            <div className="text-sm text-cyan-300">Simulations</div>
          </div>
          <div className="bg-cyan-800/50 border border-cyan-500/30 p-4 rounded-xl text-center">
            <div className="text-3xl font-bold">4</div>
            <div className="text-sm text-cyan-300">Categories</div>
          </div>
          <div className="bg-cyan-800/50 border border-cyan-500/30 p-4 rounded-xl text-center">
            <div className="text-3xl font-bold text-green-400">12</div>
            <div className="text-sm text-cyan-300">Facts</div>
          </div>
        </div>

        {/* Category Filter */}
        <div className="flex flex-wrap justify-center gap-2 mb-6">
          {categories.map(cat => (
            <button key={cat} onClick={() => setSelectedCategory(cat)} className={`px-4 py-2 rounded-full capitalize ${selectedCategory === cat ? 'bg-cyan-600' : 'bg-slate-800 hover:bg-slate-700'}`}>
              {cat === 'all' ? 'All' : cat}
            </button>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          {(['experiments', 'simulations', 'facts'] as const).map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)} className={`flex-1 py-3 rounded-lg font-bold capitalize ${activeTab === tab ? 'bg-cyan-600' : 'bg-slate-800 hover:bg-slate-700'}`}>
              {tab}
            </button>
          ))}
        </div>

        {/* Experiments Tab */}
        {activeTab === 'experiments' && (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {experiments.filter(e => selectedCategory === 'all' || e.category === selectedCategory).map(exp => (
              <div key={exp.id} className="bg-slate-800 p-6 rounded-xl hover:bg-slate-700 transition-colors">
                <div className="text-3xl mb-3">
                  {exp.category === 'biology' ? '🧬' : exp.category === 'physics' ? '⚛️' : '🧪'}
                </div>
                <h3 className="font-bold text-lg">{exp.title}</h3>
                <p className="text-sm text-slate-400">{exp.titleDE}</p>
                <p className="text-sm text-cyan-300 mt-2">{exp.description}</p>
                <div className="mt-3 flex items-center justify-between">
                  <span className="text-xs capitalize px-2 py-1 bg-slate-700 rounded">{exp.category}</span>
                  <span className={`text-xs px-2 py-1 rounded ${exp.difficulty <= 2 ? 'bg-green-500/30 text-green-400' : exp.difficulty <= 3 ? 'bg-yellow-500/30 text-yellow-400' : 'bg-red-500/30 text-red-400'}`}>
                    Level {exp.difficulty}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Simulations Tab */}
        {activeTab === 'simulations' && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {simulations.map(sim => (
              <div key={sim.id} className={`bg-slate-800 p-6 rounded-xl text-center ${sim.active ? 'hover:bg-slate-700 cursor-pointer' : 'opacity-50'}`}>
                <div className="text-5xl mb-3">{sim.icon}</div>
                <h3 className="font-bold">{sim.name}</h3>
                <span className={`text-xs px-2 py-1 rounded mt-2 inline-block ${sim.active ? 'bg-green-500/30 text-green-400' : 'bg-red-500/30 text-red-400'}`}>
                  {sim.active ? '✓ Active' : 'Coming Soon'}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Interactive Simulation: Solar System */}
        {activeTab === 'simulations' && simulations[0]?.active && (
          <div className="mt-8 bg-slate-800 rounded-xl p-6">
            <h3 className="text-xl font-bold mb-4">🪐 Solar System Simulation</h3>
            <div className="relative h-64 bg-black rounded-lg overflow-hidden">
              {/* Sun */}
              <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 bg-yellow-500 rounded-full shadow-[0_0_40px_rgba(234,179,8,0.8)]" />
              {/* Orbits */}
              {[40, 70, 100, 140, 180].map((orbit, i) => (
                <div key={orbit} className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 border border-slate-700 rounded-full" style={{ width: orbit * 2, height: orbit * 2 }} />
              ))}
              {/* Planets */}
              <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 bg-orange-500 rounded-full animate-pulse" style={{ marginLeft: 40 }} />
              <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 bg-blue-400 rounded-full" style={{ marginLeft: 70 }} />
              <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 bg-red-500 rounded-full" style={{ marginLeft: 100 }} />
            </div>
          </div>
        )}

        {/* Facts Tab */}
        {activeTab === 'facts' && (
          <div className="grid grid-cols-2 gap-4">
            {scienceFacts.map((fact, i) => (
              <div key={i} className="bg-slate-800 p-6 rounded-xl flex items-center gap-4">
                <div className="text-4xl">
                  {fact.category === 'physics' ? '⚛️' : fact.category === 'biology' ? '🧬' : fact.category === 'chemistry' ? '🧪' : '🌍'}
                </div>
                <div>
                  <p className="text-lg font-bold">{fact.fact}</p>
                  <p className="text-sm text-cyan-400 capitalize">{fact.category}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-8 text-center text-sm text-slate-400">
          🟦 Powered by ARE-Logic • Interactive Science Education for German Schools
        </div>
      </div>
    </div>
  );
}

export default SciencePortalApp;