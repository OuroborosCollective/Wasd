import React from 'react';

const NeuralFlowCanvas = () => (
  <div className="w-full h-[600px] bg-slate-900/40 rounded-lg border border-slate-800 relative overflow-hidden group">
    <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,_rgba(30,58,138,0.2),transparent)]"></div>
    <div className="absolute inset-0 opacity-20 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] brightness-100 contrast-150"></div>
    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full flex items-center justify-center">
      <div className="relative">
        <div className="w-64 h-64 rounded-full border border-blue-500/20 animate-[spin_10s_linear_infinite]"></div>
        <div className="absolute inset-0 w-64 h-64 rounded-full border-t-2 border-blue-500/50 animate-[spin_3s_linear_infinite]"></div>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-[10px] tracking-[0.5em] text-blue-400 font-bold animate-pulse">NEURAL_FLOW_ACTIVE</span>
        </div>
      </div>
    </div>
    <div className="absolute bottom-4 left-4 font-mono text-[9px] text-slate-500">
      CORE_ID: 0x8821_FBX <br />
      STATUS: FLOWING
    </div>
  </div>
);

interface ModuleProps {
  name: string;
  status: string;
  load: number;
}

const ModuleCard = ({ name, status, load }: ModuleProps) => (
  <div className="p-4 bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-sm hover:border-blue-900/50 transition-all duration-300 group">
    <div className="flex justify-between items-start mb-4">
      <div>
        <h3 className="text-xs font-bold text-slate-400 tracking-tighter group-hover:text-blue-400 transition-colors">{name}</h3>
        <p className="text-[9px] text-slate-600 font-mono uppercase">{status}</p>
      </div>
      <div className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]"></div>
    </div>
    <div className="space-y-1">
      <div className="flex justify-between text-[8px] text-slate-500 font-mono">
        <span>LOAD_CAPACITY</span>
        <span>{load}%</span>
      </div>
      <div className="h-[2px] w-full bg-slate-800">
        <div 
          className="h-full bg-blue-600 transition-all duration-1000" 
          style={{ width: `${load}%` }}
        ></div>
      </div>
    </div>
  </div>
);

const OuroborosInterface: React.FC = () => {
  const modules = [
    { name: 'Neural_Link', status: 'Synchronized', load: 42 },
    { name: 'Quantum_State', status: 'Superposed', load: 88 },
    { name: 'Entropy_Buffer', status: 'Stabilizing', load: 15 }
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-300 font-mono selection:bg-blue-500/30 overflow-hidden">
      {/* Top Header Navigation */}
      <header className="h-16 border-b border-slate-900 bg-slate-950/50 backdrop-blur-2xl flex items-center justify-between px-8 sticky top-0 z-50">
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 border-2 border-blue-500 rotate-45 flex items-center justify-center overflow-hidden">
              <div className="w-full h-full bg-blue-500 animate-[bounce_2s_infinite]"></div>
            </div>
            <h1 className="text-xl font-black tracking-widest text-white italic">
              OUROBOROS<span className="text-blue-500">_OS</span>
            </h1>
          </div>
          <nav className="hidden md:flex gap-6 text-[10px] tracking-[0.2em] text-slate-500">
            <span className="text-blue-400 cursor-pointer hover:text-white transition-colors">DASHBOARD</span>
            <span className="cursor-pointer hover:text-white transition-colors">ARCHIVE</span>
            <span className="cursor-pointer hover:text-white transition-colors">PROTOCOLS</span>
          </nav>
        </div>
        <div className="flex items-center gap-6">
          <div className="text-right hidden sm:block">
            <p className="text-[9px] text-slate-500 leading-none">SYSTEM_UPTIME</p>
            <p className="text-[10px] font-bold text-blue-500">12:44:02:11</p>
          </div>
          <div className="w-10 h-10 rounded-full border border-slate-800 bg-slate-900 flex items-center justify-center">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
          </div>
        </div>
      </header>

      {/* Main Grid Content */}
      <main className="max-w-[1600px] mx-auto p-6 grid grid-cols-12 gap-6 h-[calc(100vh-64px)]">
        
        {/* Left Interaction Sidebar (col-span-4) */}
        <aside className="col-span-12 lg:col-span-4 flex flex-col gap-6 overflow-y-auto pr-2 custom-scrollbar">
          <div className="flex flex-col gap-2 px-2">
            <h2 className="text-[10px] font-bold text-slate-600 tracking-[0.3em] uppercase">Core_Execution_Units</h2>
            <div className="h-px w-full bg-gradient-to-r from-slate-800 to-transparent"></div>
          </div>
          
          <div className="grid gap-4">
            {modules.map((mod, idx) => (
              <ModuleCard key={idx} {...mod} />
            ))}
          </div>

          <div className="mt-auto p-6 border border-dashed border-slate-800 rounded-sm bg-slate-900/10">
            <h4 className="text-[10px] text-blue-500/70 font-bold mb-3 tracking-widest uppercase">Console_Output</h4>
            <div className="text-[9px] font-mono text-slate-500 space-y-1">
              <p className="flex gap-2">
                <span className="text-blue-900 font-bold">[0.002]</span>
                <span>Initializing synaptic weights...</span>
              </p>
              <p className="flex gap-2 text-slate-400">
                <span className="text-blue-900 font-bold">[0.142]</span>
                <span>Handshake with Ouroboros_Kernel successful.</span>
              </p>
              <p className="flex gap-2">
                <span className="text-blue-900 font-bold">[0.259]</span>
                <span className="animate-pulse">Monitoring data streams...</span>
              </p>
            </div>
          </div>
        </aside>

        {/* Central Visualization Area (col-span-8) */}
        <section className="col-span-12 lg:col-span-8 flex flex-col gap-4">
          <div className="flex items-center justify-between px-2">
            <div className="flex items-center gap-4">
              <div className="flex gap-1">
                <div className="w-3 h-1 bg-blue-500"></div>
                <div className="w-1 h-1 bg-slate-800"></div>
                <div className="w-1 h-1 bg-slate-800"></div>
              </div>
              <span className="text-[10px] font-bold tracking-[0.2em] text-slate-400">NEURAL_FLOW_CANVAS</span>
            </div>
            <div className="text-[10px] text-slate-600">
              COORD: 40.7128° N, 74.0060° W
            </div>
          </div>
          
          <div className="relative flex-1">
            <NeuralFlowCanvas />
            
            {/* HUD Overlays */}
            <div className="absolute top-4 right-4 flex flex-col gap-2">
              <div className="px-3 py-1 bg-slate-950/80 border border-slate-800 text-[9px] text-blue-400 font-bold backdrop-blur-md">
                FPS: 60.0
              </div>
              <div className="px-3 py-1 bg-slate-950/80 border border-slate-800 text-[9px] text-blue-400 font-bold backdrop-blur-md">
                LATENCY: 12ms
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 h-24">
            {[1, 2, 3].map(i => (
              <div key={i} className="border border-slate-900 bg-slate-900/20 rounded-sm flex items-center justify-center group cursor-crosshair">
                <div className="w-full h-[1px] bg-slate-800 group-hover:bg-blue-900 transition-colors"></div>
                <div className="absolute text-[8px] text-slate-700 font-bold group-hover:text-blue-600 transition-colors uppercase">Data_Stream_0{i}</div>
              </div>
            ))}
          </div>
        </section>

      </main>

      {/* Global CSS for scrollbar and animations */}
      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 2px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #1e293b;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #3b82f6;
        }
      `}</style>
    </div>
  );
};

export default OuroborosInterface;