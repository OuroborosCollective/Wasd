import { createSovereignIdentity, type SovereignPeerIdentity } from "./SovereignIdentity.js";

export interface CollectiveIngressPeer {
  id: string;
  socketId: string;
  name: string;
  role: string;
  publicKeyHash: string;
  deterministicSeed: string;
  position: { x: number; y: number; z: number };
  chunk: { x: number; y: number; size: 64 };
  lastSeq: number;
}

function chunkOf(position: { x: number; y: number; z?: number }) {
  return { x: Math.floor(position.x / 64), y: Math.floor(position.y / 64), size: 64 as const };
}

export class CollectiveIngressRuntime {
  private peers = new Map<string, CollectiveIngressPeer>();
  private socketToPeer = new Map<string, string>();
  private welcomes: Array<{ tick: number; playerId: string; role: string; chunk: { x: number; y: number; size: 64 }; welcome: string }> = [];
  private seq = 0;
  private tick = 0;

  register(socketId: string, msg: any): { identity: SovereignPeerIdentity; peer: CollectiveIngressPeer; welcome: string } {
    const identity = createSovereignIdentity(msg.publicKey ?? msg.wallet ?? msg.hash ?? msg.kappaPosHash, msg.alias ?? msg.name);
    const peer: CollectiveIngressPeer = {
      id: identity.id,
      socketId,
      name: `${identity.role}-${identity.publicKeyHash.slice(0, 6)}`,
      role: identity.role,
      publicKeyHash: identity.publicKeyHash,
      deterministicSeed: identity.deterministicSeed,
      position: { ...identity.position },
      chunk: { ...identity.chunk },
      lastSeq: ++this.seq,
    };
    this.peers.set(peer.id, peer);
    this.socketToPeer.set(socketId, peer.id);
    const welcome = { tick: this.tick, playerId: peer.id, role: peer.role, chunk: peer.chunk, welcome: identity.welcome };
    this.welcomes.push(welcome);
    if (this.welcomes.length > 32) this.welcomes.splice(0, this.welcomes.length - 32);
    return { identity, peer, welcome: identity.welcome };
  }

  disconnect(socketId: string): void {
    const peerId = this.socketToPeer.get(socketId);
    if (!peerId) return;
    this.socketToPeer.delete(socketId);
    this.peers.delete(peerId);
  }

  updateFromInput(socketId: string, msg: any): void {
    const peerId = this.socketToPeer.get(socketId);
    if (!peerId) return;
    const peer = this.peers.get(peerId);
    if (!peer) return;
    const type = String(msg?.type ?? "");
    if (type !== "move_intent" && type !== "MOVE") return;
    let dx = Number(msg.dx) || 0;
    let dy = Number(msg.dy ?? msg.dz) || 0;
    const magSq = dx * dx + dy * dy;
    if (magSq > 1) {
      const mag = Math.sqrt(magSq);
      dx /= mag;
      dy /= mag;
    }
    peer.position.x = Math.floor((peer.position.x + dx * 5) * 1000) / 1000;
    peer.position.y = Math.floor((peer.position.y + dy * 5) * 1000) / 1000;
    peer.chunk = chunkOf(peer.position);
    peer.lastSeq = ++this.seq;
  }

  advanceTick(): void {
    this.tick += 1;
  }

  getStatus() {
    const peers = [...this.peers.values()].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
    const chunks = new Map<string, any>();
    for (const peer of peers) {
      const key = `${peer.chunk.x}:${peer.chunk.y}`;
      const current = chunks.get(key) ?? { ...peer.chunk, key, peers: [] };
      current.peers.push(peer.id);
      chunks.set(key, current);
    }
    return {
      ok: true,
      tick: this.tick,
      peerCount: peers.length,
      queuedInputs: 0,
      peers,
      chunks: [...chunks.values()].sort((a, b) => (a.key < b.key ? -1 : a.key > b.key ? 1 : 0)),
      recentWelcomes: this.welcomes.slice(-12),
    };
  }
}

export const collectiveIngressRuntime = new CollectiveIngressRuntime();
