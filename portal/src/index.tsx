import React from 'react';
import ReactDOM from 'react-dom/client';
import './app/globals.css';

const cards = [
  { href: '/are-console.html', sigil: '⌬', name: 'ARE Console', tone: 'Replay / Oracle / AutoRepair / Billing / Governance / Warfront', cls: 'cyan' },
  { href: '/sovereign-truth.html', sigil: '◈', name: 'Sovereign Truth', tone: 'Commit / Branch / Runtime / Supabase / ARE hash', cls: 'fire' },
  { href: '/api/v1/warfront/cycle', sigil: '⚔', name: 'Warfront Cycle', tone: 'Live deterministic cycle and front boss truth payload', cls: 'green' },
  { href: '/api/are/replay/governance/status', sigil: '⚖', name: 'Governance', tone: 'Read-only sovereign council state and directives', cls: 'violet' },
  { href: '/api/are/replay/oracle/prophecy', sigil: '◎', name: 'Oracle', tone: 'Prophecy engine state generated from replay records', cls: 'cyan' },
  { href: '/api/are/replay/repair/status', sigil: '✚', name: 'AutoRepair', tone: 'ARE repair and self-healing runtime status', cls: 'fire' },
];

function App() {
  return (
    <div className="cz-portal-shell cz-runtime-portal-hub">
      <div className="cz-portal-grid" />
      <aside className="cz-runtime-rail">
        <div>
          <div className="cz-runtime-brand">PORTAL<br />HUB</div>
          <div className="cz-runtime-sub">ARE CONTROL ROOM</div>
        </div>
        <nav className="cz-runtime-nodes">
          <span>Oracle_Core</span>
          <span>Replay_Ring</span>
          <span>AutoRepair</span>
          <span>Warfront_Cycle</span>
          <span>Truth_Node</span>
        </nav>
        <a className="cz-runtime-return" href="/">RETURN_ROOT</a>
      </aside>
      <main className="cz-runtime-main">
        <header className="cz-runtime-top">
          <b>OUROBOROS // PORTAL</b>
          <span>TRUTH · ORACLE · GOVERNANCE · WARFRONT</span>
        </header>
        <section className="cz-runtime-hero">
          <div className="cz-runtime-sigil"><div className="cz-runtime-ouro" /></div>
          <h1>SCIENCE <span>PORTAL.</span><br />TRUTH <em>ONLINE.</em></h1>
          <p>Central entry for deterministic runtime visibility. Choose a control surface without leaving the Cyber-Zen flow.</p>
        </section>
        <section className="cz-runtime-card-grid">
          {cards.map(card => (
            <a key={card.href} href={card.href} className={`cz-runtime-card ${card.cls}`}>
              <i>{card.sigil}</i>
              <h2>{card.name}</h2>
              <p>{card.tone}</p>
            </a>
          ))}
        </section>
        <div className="cz-runtime-status"><span />PORTAL ONLINE [READ_ONLY_SAFE] 10-Hz DETERMINISTIC MESH</div>
      </main>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(<App />);
