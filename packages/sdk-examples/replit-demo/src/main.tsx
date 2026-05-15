import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { OuroborosPulseView, type OuroborosPulseFrame } from "@wasd/core-logic/react/OuroborosPulseView";
import { BattleSim } from "../../BattleSim";
import "./style.css";

function App() {
  const [frames, setFrames] = useState<OuroborosPulseFrame[]>([]);
  const [selected, setSelected] = useState<OuroborosPulseFrame | null>(null);

  useEffect(() => {
    console.info("Emily: Willkommen, Replit-Architekt. Engine Online. Kausalität stabil. Drücke Run und beobachte, wie der WorldHash atmet.");
    const sim = new BattleSim("ARE|replit|hype-sdk|alpha");
    sim.run(42).then((battleFrames) => {
      const pulseFrames = battleFrames.map((frame) => ({
        tick: frame.tick,
        worldHash: frame.worldHash,
        label: frame.winner ? `winner ${frame.winner}` : `${frame.events.length} deterministic combat events`,
      }));
      setFrames(pulseFrames);
      setSelected(pulseFrames[pulseFrames.length - 1] ?? null);
    }).catch((error) => {
      console.warn(`Emily Oracle Warning: Demo stopped by the AREInvariantGuard. ${error instanceof Error ? error.message : String(error)}`);
    });
  }, []);

  return (
    <main className="shell">
      <section className="hero">
        <p className="eyebrow">Ouroboros ARE · Hype SDK</p>
        <h1>Build Immortal Worlds with Ouroboros ARE.</h1>
        <p>
          Cheat-proof physics, time-travel debugging and 10-Hz Cyber-Zen feedback for developers who want their game logic to feel alive on the first run.
        </p>
      </section>
      <OuroborosPulseView frames={frames} onFrameSelect={setSelected} />
      <section className="console">
        <h2>Autobattler Replay Inspector</h2>
        <pre>{JSON.stringify(selected ?? frames.at(-1) ?? { status: "booting" }, null, 2)}</pre>
      </section>
    </main>
  );
}

createRoot(document.getElementById("root")!).render(<App />);
