import React, { useMemo, useState } from "react";

interface Props { children: React.ReactNode }

type Role = "Scavenger" | "Trader" | "Guardian" | "Oracle" | "Builder" | "Warden";

interface GateIdentity {
  handle: string;
  displayName: string;
  publicKey: string;
  role: Role;
  tick: number;
  phase: number;
  spawn: { chunkX: number; chunkY: number; x: number; y: number };
  loadout: string[];
  identityHash: string;
}

interface PersistedCharacterV1 {
  readonly schema: "areloria.character.v1";
  readonly name: string;
  readonly handle: string;
  readonly publicKey: string;
  readonly role: Role;
  readonly identityHash: string;
  readonly spawn: GateIdentity["spawn"];
  readonly loadout: readonly string[];
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
        className="post-login-child-sync"
        data-testid="post-login-child-sync"
        data-child-label={this.props.label}
        role="status"
        aria-live="polite"
      >
        <small>WORLD SYNC</small>
        <strong>Module wird neu synchronisiert…</strong>
        <span>{this.props.label}</span>
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

const CHARACTER_STORAGE_KEY = "wasd:2d:character.v1";
const GAMEPLAY_PLAYER_ID_KEY = "wasd:2d:playerId";
const LEGACY_NAME_KEY = "wasd:2d:name";
const LEGACY_ENTERED_KEY = "wasd:2d:entered";
const WORLD_SEED_STORAGE_KEY = "wasd:2d:worldSeed";
const DEFAULT_CHARACTER_NAME = "Wanderer";
const KAPPA_INVARIANT = 1000;

function resolveRuntimeWorldSeed(): string {
  const params = new URLSearchParams(globalThis.location?.search ?? "");
  const fromUrl = params.get("worldSeed")?.trim();
  if (fromUrl) return fromUrl;
  const fromDataset = document.documentElement.dataset.worldSeed?.trim() || document.body.dataset.worldSeed?.trim();
  if (fromDataset) return fromDataset;
  const fromStorage = localStorage.getItem(WORLD_SEED_STORAGE_KEY)?.trim();
  if (fromStorage) return fromStorage;
  return ["ARELORIA", "COLLECTIVE", "ALPHA"].join("|");
}

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

function normalizeDisplayName(raw: string): string {
  const trimmed = raw.trim().replace(/\s+/g, " ").slice(0, 48);
  return trimmed || DEFAULT_CHARACTER_NAME;
}

function normalizeHandle(raw: string): string {
  return normalizeDisplayName(raw).replace(/\s+/g, "-").toLowerCase();
}

function readPersistedCharacter(): PersistedCharacterV1 | null {
  try {
    const raw = localStorage.getItem(CHARACTER_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<PersistedCharacterV1>;
    if (parsed.schema !== "areloria.character.v1") return null;
    if (typeof parsed.name !== "string" || parsed.name.trim().length === 0) return null;
    if (typeof parsed.handle !== "string" || parsed.handle.trim().length === 0) return null;
    if (typeof parsed.publicKey !== "string" || parsed.publicKey.trim().length === 0) return null;
    if (!ROLES.includes(parsed.role as Role)) return null;
    if (typeof parsed.identityHash !== "string" || parsed.identityHash.length !== 64) return null;
    if (!parsed.spawn || typeof parsed.spawn !== "object") return null;
    if (!Array.isArray(parsed.loadout)) return null;
    return parsed as PersistedCharacterV1;
  } catch {
    return null;
  }
}

function persistIdentity(identity: GateIdentity): PersistedCharacterV1 {
  const character: PersistedCharacterV1 = Object.freeze({
    schema: "areloria.character.v1",
    name: identity.displayName,
    handle: identity.handle,
    publicKey: identity.publicKey,
    role: identity.role,
    identityHash: identity.identityHash,
    spawn: identity.spawn,
    loadout: identity.loadout,
  });

  localStorage.setItem(CHARACTER_STORAGE_KEY, JSON.stringify(character));
  localStorage.setItem(LEGACY_NAME_KEY, character.name);
  localStorage.setItem("wasd:2d:handle", character.handle);
  localStorage.setItem(GAMEPLAY_PLAYER_ID_KEY, character.publicKey);
  localStorage.setItem("wasd:2d:publicKey", character.publicKey);
  localStorage.setItem("wasd:2d:role", character.role);
  localStorage.setItem("wasd:2d:identityHash", character.identityHash);
  localStorage.setItem("wasd:2d:spawn", JSON.stringify(character.spawn));
  localStorage.setItem("wasd:2d:loadout", JSON.stringify(character.loadout));
  localStorage.setItem(LEGACY_ENTERED_KEY, "1");

  return character;
}

function deriveIdentity(handleRaw: string): GateIdentity {
  const displayName = normalizeDisplayName(handleRaw);
  const handle = normalizeHandle(displayName);
  const identityHash = stableHash(["ARE_COLLECTIVE_GATE", resolveRuntimeWorldSeed(), handle, KAPPA_INVARIANT]);
  const phase = hashInt(identityHash, 0, 10);
  const tick = hashInt(identityHash, 8, 1_000_000);
  const role = ROLES[hashInt(identityHash, 16, ROLES.length)];
  return {
    handle,
    displayName,
    publicKey: `are-${identityHash.slice(0, 8)}-${identityHash.slice(8, 16)}-${phase}`,
    role,
    tick,
    phase,
    spawn: {
      chunkX: hashInt(identityHash, 24, 32) - 16,
      chunkY: hashInt(identityHash, 32, 32) - 16,
      x: hashInt(identityHash, 40, 64),
      y: hashInt(identityHash, 48, 64),
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
  const persistedCharacter = readPersistedCharacter();
  const [name, setName] = useState(() => persistedCharacter?.name ?? localStorage.getItem(LEGACY_NAME_KEY) ?? "");
  const [entered, setEntered] = useState(() => Boolean(persistedCharacter) || localStorage.getItem(LEGACY_ENTERED_KEY) === "1");
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
    persistIdentity(identity);

    document.body.dataset.postLoginShell = "enter-clicked";

    setName(identity.displayName);
    setEntered(true);
  }

  return (
    <main className="cz-login-root" data-testid="cyber-zen-login-gate">
      <section className="cz-login-card">
        <div className="cz-eyebrow">ARELORIA WASD · SOVEREIGN 10HZ GATE</div>
        <h1>Cyber-Zen Gateway</h1>
        <p>
          Deterministischer Einstieg ohne klassische Nutzerdaten. Dein Public-Key, deine Rolle, Spawn-Position und
          Startausrüstung entstehen stabil aus Handle, Kappa=1000 und runtime-resolved World-Seed.
        </p>
        <label className="cz-field">
          <span>Architect Handle</span>
          <input value={name} onChange={(event) => setName(event.target.value)} autoComplete="nickname" placeholder={DEFAULT_CHARACTER_NAME} />
        </label>
        <div className="cz-keybox"><span>Public-Key</span><strong>{identity.publicKey}</strong></div>
        <div className="cz-keybox"><span>Name</span><strong>{identity.displayName}</strong></div>
        <div className="cz-keybox"><span>Role</span><strong>{identity.role}</strong></div>
        <div className="cz-keybox"><span>Stable 10-Hz Identity</span><strong>{identity.tick} · phase {identity.phase}/9</strong></div>
        <div className="cz-keybox"><span>Spawn</span><strong>{identity.spawn.chunkX}:{identity.spawn.chunkY} · {identity.spawn.x},{identity.spawn.y}</strong></div>
        <button className="cz-enter" type="button" onClick={enter}>Collective betreten</button>
        <div className="cz-hints"><span>Kappa 1000</span><span>Hash Identity</span><span>Stable Seed</span></div>
      </section>
    </main>
  );
}
