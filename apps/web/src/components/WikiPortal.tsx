import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, ChevronRight, Book, Activity, Cpu, Zap, X } from 'lucide-react';

interface WikiPage {
  id: string;
  title: string;
  icon: React.ElementType;
  content: string;
  stats?: { label: string; value: string }[];
}

interface WikiPortalProps {
  onClose?: () => void;
}

const PAGES: Record<string, WikiPage> = {
  Home: {
    id: 'Home',
    title: 'LOGIKA_AXIOMATA',
    icon: Book,
    content: `# Arelorian Wiki: Logika Axiomata

Welcome to the **Obsidian Archive**, the authoritative deep information repository for the Arelorian project. This wiki serves as a bridge between high-fantasy narrative and deterministic scientific evolution.

## 1. Project Vision
Arelorian is not merely a browser MMORPG. It is an **Authentic Reality Emergence (ARE)** machine. Our mission is to create a stateless, deterministic world where every action is replayable, every outcome is verifiable, and every story emerges from the collision of axiomatic laws.

## 2. The Five Axioms (Logika Axiomata)

### I. Information Field
The universe is a high-density logic string. Every entity, from the smallest blade of grass to the grandest kingdom, is a node within this field. State is not "stored"; it is a projection of the field at a specific tick.

### II. Emergence
Complexity is not hard-coded. It arises from the interaction of simple, deterministic rules. Conflict, economy, and culture are emergent properties of the simulation.

### III. Persistence
Truth is sovereign. Once an event occurs within the 10Hz tick, it is etched into the world hash. Persistence is achieved not through bloat, but through seeds and replayability.

### IV. Ouroboros Cycle
The loop is closed. Input feeds simulation, simulation feeds memory, memory feeds future decision. The project is self-referential and self-correcting.

### V. Observer
Reality exists because it is witnessed. The observer (player or agent) collapses the probability of the field into a concrete state, allowing the world to exist in a state of "observed truth."`,
    stats: [
      { label: 'PSI STABILITY', value: '0.9984' },
      { label: 'AXIOM COUPLING', value: '1000' }
    ]
  },
  Determinism: {
    id: 'Determinism',
    title: 'DETERMINISM',
    icon: Activity,
    content: `# Determinism: The Math of Areloria

In Areloria, "random" is a forbidden word in the core simulation. We operate on **Absolute Causality**.

## 1. Kappa Invariant (Fixed-Point Math)
To avoid floating-point drift across different browsers and hardware, we use the **Kappa Standard**:
- **Kappa = 1000**
- All simulation values are scaled by Kappa and treated as 64-bit integers.

## 2. Psi Evolution Formula
The state transition of the world is governed by the Trinitarian Psi Evolution:
\`\`\`txt
Psi[n + 1] = kappa * (Psi[n] odot A_ARE)^3 + 3 * P(Psi[n])
\`\`\`
- **Psi[n]**: Current state vector at tick n.
- **A_ARE**: Axiomatic coupling operator.
- **P(Psi[n])**: Plexity function (the weight of simulation entities).`,
    stats: [
      { label: 'DETERMINISTIC VARIANCE', value: '0.0000' },
      { label: 'TICK RATE', value: '10HZ' }
    ]
  },
  NPC_Core: {
    id: 'NPC_Core',
    title: 'NPC_CORE',
    icon: Cpu,
    content: `# NPC Core: The Emergent Sovereign

NPCs in Areloria are not static quest-givers. They are "Small Brain" agents with personality, memory, and agency.

## 1. DNA and Traits
Every NPC is born with a unique DNA string that determines their Physical and Psychological traits.

## 2. Memory Layers
NPCs perceive and remember the world through five distinct layers:
1. **Local Memory**
2. **Social Memory**
3. **Faction Memory**
4. **Historical Memory**
5. **Oracle Memory**`,
    stats: [
      { label: 'ACTIVE AGENTS', value: '2048' },
      { label: 'MEMORY LOAD', value: 'HIGH' }
    ]
  }
};

const WikiPortal: React.FC<WikiPortalProps> = ({ onClose }) => {
  const [activePage, setActivePage] = useState<string>('Home');
  const [searchQuery, setSearchQuery] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);

  const filteredPages = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return Object.values(PAGES);

    return Object.values(PAGES).filter(p =>
      p.title.toLowerCase().includes(query) ||
      p.content.toLowerCase().includes(query)
    );
  }, [searchQuery]);

  const page = PAGES[activePage] || PAGES['Home'];

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === '/' && document.activeElement !== searchInputRef.current) {
      e.preventDefault();
      searchInputRef.current?.focus();
    } else if (e.key === 'Escape') {
      if (document.activeElement === searchInputRef.current) {
        searchInputRef.current?.blur();
      } else if (searchQuery) {
        setSearchQuery('');
      } else if (onClose) {
        onClose();
      }
    }
  }, [onClose, searchQuery]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return (
    <div className="flex h-screen w-screen bg-black text-[#e5e2e1] font-['Space_Grotesk'] overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 border-r border-[#3a4a49] bg-[#131313] flex flex-col z-20">
        <div className="p-6 border-b border-[#3a4a49] flex items-center gap-3">
          <div className="w-8 h-8 border border-[#00FFFF] flex items-center justify-center">
            <Zap size={16} className="text-[#00FFFF]" aria-hidden="true" />
          </div>
          <span className="font-bold tracking-tighter text-[#FFD700]">OBSIDIAN_ARCHIVE</span>
        </div>

        <nav className="flex-1 p-4 space-y-2 overflow-y-auto" aria-label="Wiki navigation">
          {filteredPages.map((p) => (
            <button
              key={p.id}
              onClick={() => setActivePage(p.id)}
              aria-current={activePage === p.id ? 'page' : undefined}
              className={`w-full text-left p-3 flex items-center gap-3 transition-colors ${
                activePage === p.id
                  ? 'bg-[#00FFFF] text-black font-bold'
                  : 'hover:bg-[#1c1b1b] text-[#b9cac9]'
              }`}
            >
              <p.icon size={18} aria-hidden="true" />
              <span className="text-xs tracking-widest uppercase">{p.title}</span>
            </button>
          ))}
          {filteredPages.length === 0 && (
            <div className="p-4 text-center">
              <span className="text-[10px] text-[#b9cac9] opacity-50 uppercase tracking-widest">
                NO_MATCHES_FOUND
              </span>
            </div>
          )}
        </nav>

        <div className="p-4 border-t border-[#3a4a49] text-[10px] font-mono text-[#b9cac9] opacity-50 uppercase">
          Arelorian OS v4.0.1
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col bg-[#080808] relative">
        {/* Hex Pattern Background */}
        <div className="absolute inset-0 opacity-5 pointer-events-none" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M30 0l25.98 15v30L30 60 4.02 45V15z' fill-rule='evenodd' stroke='%2300FFFF' fill='none'/%3E%3C/svg%3E")`,
          backgroundSize: '60px 60px'
        }} />

        {/* Top Bar */}
        <header className="h-16 border-b border-[#3a4a49] bg-[#131313]/80 backdrop-blur-md flex items-center justify-between px-8 z-10">
          <div className="flex items-center gap-2 text-[10px] tracking-widest text-[#b9cac9] uppercase" aria-label="Breadcrumb">
            <span>Home</span>
            <ChevronRight size={12} aria-hidden="true" />
            <span>Wiki</span>
            <ChevronRight size={12} aria-hidden="true" />
            <span className="text-[#FFD700]">{page.title}</span>
          </div>

          <div className="flex items-center gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#b9cac9]" size={14} aria-hidden="true" />
              <input
                ref={searchInputRef}
                type="text"
                placeholder="SEARCH_ARCHIVE... [/]"
                aria-label="Search archive"
                className="bg-[#1c1b1b] border border-[#3a4a49] pl-10 pr-10 py-2 text-xs focus:outline-none focus:border-[#00FFFF] w-64 text-[#e5e2e1]"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#b9cac9] hover:text-[#00FFFF] transition-colors"
                  aria-label="Clear search"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {onClose && (
              <button
                onClick={onClose}
                className="p-2 border border-[#3a4a49] hover:bg-[#1c1b1b] hover:border-[#00FFFF] transition-all group"
                aria-label="Close archive"
              >
                <X size={18} className="text-[#b9cac9] group-hover:text-[#00FFFF]" />
              </button>
            )}
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-12 scrollbar-hide">
          <div className="max-w-4xl mx-auto">
            <AnimatePresence mode="wait">
              <motion.div
                key={activePage}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
              >
                {/* Page Header */}
                <div className="mb-12 border-l-4 border-[#FFD700] pl-6 py-2">
                  <h1 className="text-5xl font-black tracking-tighter text-[#FFD700] uppercase mb-4">
                    {page.title}
                  </h1>
                  <div className="flex gap-8">
                    {page.stats?.map((s) => (
                      <div key={s.label}>
                        <div className="text-[10px] text-[#b9cac9] tracking-widest uppercase">{s.label}</div>
                        <div className="font-mono text-[#00FFFF] text-lg font-bold">{s.value}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Markdown Content (Mocked) */}
                <div className="prose prose-invert max-w-none prose-headings:text-[#FFD700] prose-headings:uppercase prose-p:text-[#b9cac9] prose-p:leading-relaxed prose-strong:text-[#00FFFF] prose-code:text-[#00FFFF] prose-code:bg-[#1c1b1b] prose-code:px-1">
                  {page.content.split('\n').map((line, i) => {
                    if (line.startsWith('# ')) return <h1 key={i} className="text-3xl font-bold mt-8 mb-4 border-b border-[#3a4a49] pb-2">{line.replace('# ', '')}</h1>;
                    if (line.startsWith('## ')) return <h2 key={i} className="text-xl font-bold mt-6 mb-3 text-[#FFD700]">{line.replace('## ', '')}</h2>;
                    if (line.startsWith('### ')) return <h3 key={i} className="text-lg font-bold mt-4 mb-2 text-[#b9cac9]">{line.replace('### ', '')}</h3>;
                    if (line.startsWith('- ')) return <li key={i} className="ml-4 list-disc text-[#b9cac9]">{line.replace('- ', '')}</li>;
                    if (line.startsWith('```')) return null; // Simple mock ignore code blocks
                    return <p key={i} className="mb-4 text-[#b9cac9]">{line}</p>;
                  })}
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        {/* Floating Observer Frame */}
        <div className="absolute bottom-8 right-8 w-48 p-4 bg-[#131313]/60 backdrop-blur-xl border border-[#00FFFF]/20 flex flex-col gap-2">
          <div className="text-[8px] tracking-[0.2em] text-[#00FFFF] uppercase font-bold">OBSERVER_STATUS</div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-[#00FFFF] animate-pulse" aria-hidden="true" />
            <div className="text-[10px] font-mono">LINK_STABLE: 99%</div>
          </div>
          <div className="w-full h-1 bg-[#1c1b1b]" role="progressbar" aria-label="Observer Link Stability" aria-valuenow={99} aria-valuemin={0} aria-valuemax={100}>
            <div className="w-3/4 h-full bg-[#00FFFF]" />
          </div>
        </div>
      </main>
    </div>
  );
};

export default WikiPortal;
