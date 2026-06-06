import React, { useMemo, useState } from "react";

interface Props { children: React.ReactNode }

type Role = "Scavenger" | "Trader" | "Guardian" | "Oracle" | "Builder" | "Warden";

interface GateIdentity {
  handle: string;
  publicKey: string;
  role: Role;
  tick: number;
  phase: number;
  spawn: { chunkX: number; chunkY: number; x: number; y: number };
  loadout: string[];
  identityHash: string;
}

interface PostLoginChildBoundaryProps {
  label: string;
  children: React.ReactNode;
}

interface PostLoginChildBoundaryState {
  error: string | null;
}

class PostLoginChildBoundary extends React.Component<PostLoginChildBoundaryProps, PostLoginChildBoundaryState> {
  public state: PostLoginChildBoundaryState = { error: null };

  public static getDerivedStateFromError(error: unknown): PostLoginChildBoundaryState {
    return {
      error: error instanceof Error ? `${error.name}: ${error.message}` : String(error ?? "Unknown child render error"),
    };
  }

  public componentDidCatch(error: unknown, info: React.ErrorInfo): void {
    const message = error instanceof Error ? `${error.name}: ${error.message}` : String(error ?? "Unknown child render error");
    document.body.dataset.postLoginChildError = this.props.label;
    console.error(`[Areloria PostLogin Child Error] ${this.props.label}`, error, info.componentStack);
    window.dispatchEvent(new CustomEvent("wasd:post-login-child-error", {
      detail: {
        label: this.props.label,
        message,
        componentStack: info.componentStack,
      },
    }));
  }

  public render(): React.ReactNode {
    if (!this.state.error) return this.props.children;

    return (
      <section
        className="post-login-child-error"
        data-testid="post-login-child-error"
        data-child-label={this.props.label}
        role="alert"
      >
        <strong>Post-login module failed: {this.props.label}</strong>
        <code>{this.state.error}</code>
      </section>
    );
  }
}

const ROLES: Role[] = ["Scavenger", "Trader", "Guardian", "Oracle", "Builder", "Warden"];
const LOADOUTS: Record<Role, string[]> = {
  Scavenger: ["rusted_blade", "scrap_satchel", "echo_ration"],
  Trader: ["ledger_tablet", "trade_token", "travel_cloak"],
  Guardian: ["training_spear", "ward_shield", "iron_ration"],
  Oracle: ["signal_lens", "echo_charm", "night_ink"],
  Builder: ["layout_compass", "stone_marker", "road_string"],
  Warden: ["sentinel_key", "ward_torch", "civic_badge"],
};

function stableHash(parts: Array<string | number>): string {
  let h1 = 0x811c9dc5;
  let h2 = 0x9e3779b9;
  const payload = parts.join("|");
  for (let i = 0; i < payload.length; i += 1) {
    const code = payload.charCodeAt(i);
    h1 ^= code;
    h1 = Math.imul(h1, 0x01000193) >>> 0;
    h2 ^= code + i;
    h2 = Math.imul(h2, 0x85ebca6b) >>> 0;
  }
  const a = h1.toString(16).padStart(8, "0");
  const b = h2.toString(16).padStart(8, "0");
  return `${a}${b}${b}${a}${a}${b}${b}${a}`.slice(0, 64);
}

function hashInt(hash: string, offset: number, modulo: number): number {
  return Number.parseInt(hash.slice(offset, offset + 8).padEnd(8, "0"), 16) % modulo;
}

function deriveIdentity(handleRaw: string): GateIdentity {
  const handle = (handleRaw || "architect").trim().replace(/\s+/g, "-").toLowerCase().slice(0, 48) || "architect";
  const tick = Math.floor(performance.now() / 100);
  const phase = tick % 10;
  const kappa = 1000;
  const worldSeed = "ARELORIA|COLLECTIVE|ALPHA";
  const identityHash = stableHash(["ARE_COLLECTIVE_GATE", worldSeed, handle, tick, phase, kappa]);
  const role = ROLES[hashInt(identityHash, 0, ROLES.length)];
  return {
    handle,
    publicKey: `are-${identityHash.slice(0, 8)}-${identityHash.slice(8, 16)}-${phase}`,
    role,
    tick,
    phase,
    spawn: {
      chunkX: hashInt(identityHash, 8, 32) - 16,
      chunkY: hashInt(identityHash, 16, 32) - 16,
      x: hashInt(identityHash, 24, 64),
      y: hashInt(identityHash, 32, 64),
    },
    loadout: LOADOUTS[role],
    identityHash,
  };
}

function wrapPostLoginChildren(children: React.ReactNode): React.ReactNode {
  return React.Children.map(children, (child, index) => (
    <PostLoginChildBoundary label={`post-login-child-${index}`}>
      {child}
    </PostLoginChildBoundary>
  ));
}

export function CyberZenLoginGate({ children }: Props): React.ReactElement {
  const [name, setName] = useState(() => localStorage.getItem("wasd:2d:name") ?? "Thomas");
  const [entered, setEntered] = useState(() => localStorage.getItem("wasd:2d:entered") === "1");
  const identity = useMemo(() => deriveIdentity(name), [name]);

  if (entered) {
    document.body.dataset.postLoginShell = "entered-rendering-children";
    return (
      <div data-testid="post-login-children-root" className="post-login-children-root">
        {wrapPostLoginChildren(children)}
      </div>
    );
  }

  function enter(): void {
    localStorage.setItem("wasd:2d:name", identity.handle);
    localStorage.setItem("wasd:2d:publicKey", identity.publicKey);
    localStorage.setItem("wasd:2d:role", identity.role);
    localStorage.setItem("wasd:2d:identityHash", identity.identityHash);
    localStorage.setItem("wasd:2d:spawn", JSON.stringify(identity.spawn));
    localStorage.setItem("wasd:2d:loadout", JSON.stringify(identity.loadout));
    localStorage.setItem("wasd:2d:entered", "1");

    document.body.dataset.postLoginShell = "enter-clicked";

    setEntered(true);
  }

  return (
    <main className="cz-login-root" data-testid="cyber-zen-login-gate">
      <section className="cz-login-card">
        <div className="cz-eyebrow">ARELORIA WASD · SOVEREIGN 10HZ GATE</div>
        <h1>Cyber-Zen Gateway</h1>
        <p>
          Deterministischer Einstieg ohne klassische Nutzerdaten. Dein Public-Key, deine Rolle, Spawn-Position und
          Startausrüstung entstehen aus Handle, Kappa=1000 und der aktuellen 10-Hz-Tickphase.
        </p>
        <label className="cz-field">
          <span>Architect Handle</span>
          <input value={name} onChange={(event) => setName(event.target.value)} autoComplete="nickname" />
        </label>
        <div className="cz-keybox"><span>Public-Key</span><strong>{identity.publicKey}</strong></div>
        <div className="cz-keybox"><span>Role</span><strong>{identity.role}</strong></div>
        <div className="cz-keybox"><span>10-Hz Tick</span><strong>{identity.tick} · phase {identity.phase}/9</strong></div>
        <div className="cz-keybox"><span>Spawn</span><strong>{identity.spawn.chunkX}:{identity.spawn.chunkY} · {identity.spawn.x},{identity.spawn.y}</strong></div>
        <button className="cz-enter" type="button" onClick={enter}>Collective betreten</button>
        <div className="cz-hints"><span>Kappa 1000</span><span>Hash Identity</span><span>10-Hz Seed</span></div>
      </section>
    </main>
  );
}
