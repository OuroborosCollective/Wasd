import { createHash } from "node:crypto";

export type CollectiveRole = "Scavenger" | "Trader" | "Guardian";

export interface SovereignPeerIdentity {
  id: string;
  publicKey: string;
  publicKeyHash: string;
  deterministicSeed: string;
  role: CollectiveRole;
  chunk: { x: number; y: number; size: 64 };
  position: { x: number; y: number; z: number };
  starterLoot: Array<{ id: string; name: string; type: string; qty: number }>;
  welcome: string;
}

const ROLES: CollectiveRole[] = ["Scavenger", "Trader", "Guardian"];

function byteAt(hash: string, index: number): number {
  const offset = (index * 2) % Math.max(2, hash.length - 1);
  return Number.parseInt(hash.slice(offset, offset + 2), 16) || 0;
}

export function normalizePublicKey(input: unknown): string {
  const raw = String(input ?? "").trim();
  if (!raw || raw.length < 8) throw new Error("public_key_required");
  return raw.replace(/\s+/g, "").slice(0, 256);
}

export function createSovereignIdentity(publicKeyInput: unknown, aliasInput?: unknown): SovereignPeerIdentity {
  const publicKey = normalizePublicKey(publicKeyInput);
  const publicKeyHash = createHash("sha256").update(publicKey).digest("hex");
  const role = ROLES[byteAt(publicKeyHash, 0) % ROLES.length];
  const chunkX = (byteAt(publicKeyHash, 1) % 33) - 16;
  const chunkY = (byteAt(publicKeyHash, 2) % 33) - 16;
  const localX = byteAt(publicKeyHash, 3) % 64;
  const localY = byteAt(publicKeyHash, 4) % 64;
  const deterministicSeed = `ARE|COLLECTIVE|k1000|${publicKeyHash.slice(0, 32)}`;
  const id = `peer_${publicKeyHash.slice(0, 16)}`;
  const roleLoot: Record<CollectiveRole, SovereignPeerIdentity["starterLoot"]> = {
    Scavenger: [
      { id: `scrap_${publicKeyHash.slice(16, 22)}`, name: "Deterministic Scrap", type: "material", qty: 3 },
      { id: `torch_${publicKeyHash.slice(22, 28)}`, name: "Marina Torch", type: "tool", qty: 1 },
    ],
    Trader: [
      { id: `coin_${publicKeyHash.slice(16, 22)}`, name: "Matrix Coin", type: "currency", qty: 17 },
      { id: `ledger_${publicKeyHash.slice(22, 28)}`, name: "Ledger Shard", type: "tool", qty: 1 },
    ],
    Guardian: [
      { id: `ward_${publicKeyHash.slice(16, 22)}`, name: "Kappa Ward", type: "armor", qty: 1 },
      { id: `rune_${publicKeyHash.slice(22, 28)}`, name: "Guardian Rune", type: "rune", qty: 1 },
    ],
  };
  const alias = String(aliasInput ?? "").trim().slice(0, 32);
  const display = alias || `${role}-${publicKeyHash.slice(0, 6)}`;
  return {
    id,
    publicKey,
    publicKeyHash,
    deterministicSeed,
    role,
    chunk: { x: chunkX, y: chunkY, size: 64 },
    position: { x: chunkX * 64 + localX, y: chunkY * 64 + localY, z: 0 },
    starterLoot: roleLoot[role],
    welcome: `Emily welcomes ${display} as ${role} of the Collective.`,
  };
}

export function applySovereignStartState(player: any, identity: SovereignPeerIdentity): void {
  player.id = identity.id;
  player.name = player.name || `${identity.role}-${identity.publicKeyHash.slice(0, 6)}`;
  player.class = identity.role;
  player.collectiveRole = identity.role;
  player.publicKeyHash = identity.publicKeyHash;
  player.deterministicSeed = identity.deterministicSeed;
  player.position = { ...identity.position };
  player.inventory = Array.isArray(player.inventory) && player.inventory.length > 0 ? player.inventory : identity.starterLoot.map((item) => ({ ...item }));
  player.flags = { ...(player.flags ?? {}), sovereignIdentity: true, collectiveIngress: true };
}
