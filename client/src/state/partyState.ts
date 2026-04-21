/** Client-side party state, updated by server `party_sync` messages. */

export interface PartyMember {
  id: string;
  name: string;
  health: number;
  maxHealth: number;
  level: number;
  isLeader: boolean;
}

let partyId: string | null = null;
let members: PartyMember[] = [];

const listeners = new Set<() => void>();

export function subscribePartyState(cb: () => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

function emit() {
  listeners.forEach((cb) => cb());
}

export function applyPartySync(data: {
  partyId?: string | null;
  members?: PartyMember[];
}) {
  partyId = data.partyId ?? null;
  members = Array.isArray(data.members) ? data.members : [];
  emit();
}

export function getPartyId(): string | null {
  return partyId;
}

export function getPartyMembers(): PartyMember[] {
  return members;
}

export function isInParty(): boolean {
  return partyId !== null && members.length > 0;
}

export function clearPartyState(): void {
  partyId = null;
  members = [];
  emit();
}
