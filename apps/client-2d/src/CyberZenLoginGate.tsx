import React, { useMemo, useState } from "react";

interface Props { children: React.ReactNode }

function makePublicKey(seed: string): string {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return `are-${h.toString(16).padStart(8, "0")}`;
}

export function CyberZenLoginGate({ children }: Props): React.ReactElement {
  const [name, setName] = useState(() => localStorage.getItem("wasd:2d:name") ?? "Thomas");
  const [entered, setEntered] = useState(() => localStorage.getItem("wasd:2d:entered") === "1");
  const publicKey = useMemo(() => makePublicKey(name.trim() || "architect"), [name]);

  if (entered) return <>{children}</>;

  function enter(): void {
    localStorage.setItem("wasd:2d:name", name.trim() || "Architect");
    localStorage.setItem("wasd:2d:publicKey", publicKey);
    localStorage.setItem("wasd:2d:entered", "1");
    setEntered(true);
  }

  return (
    <main className="cz-login-root">
      <section className="cz-login-card">
        <div className="cz-eyebrow">ARELORIA WASD · 2D PIXI CLIENT</div>
        <h1>Cyber-Zen Gateway</h1>
        <p>Deterministischer Einstieg fuer den Browser-Client. Public-Key, Rolle und UI-Aura werden lokal stabil erzeugt.</p>
        <label className="cz-field">
          <span>Architect Handle</span>
          <input value={name} onChange={(event) => setName(event.target.value)} autoComplete="nickname" />
        </label>
        <div className="cz-keybox"><span>Public-Key</span><strong>{publicKey}</strong></div>
        <button className="cz-enter" type="button" onClick={enter}>Collective betreten</button>
        <div className="cz-hints"><span>Mobile Joystick</span><span>Chat Panel</span><span>10-Hz UI Pulse</span></div>
      </section>
    </main>
  );
}
