/**
 * In-memory party system — create, invite, join, leave, disband.
 * Max 4 members per party.
 */

export const MAX_PARTY_SIZE = 4;

export interface Party {
  id: string;
  leaderId: string;
  members: Set<string>;
  createdAt: number;
}

let nextPartyId = 1;

const parties = new Map<string, Party>();
const playerToParty = new Map<string, string>();

export function createParty(leaderId: string): Party {
  leaveParty(leaderId);
  const id = `party_${nextPartyId++}`;
  const party: Party = {
    id,
    leaderId,
    members: new Set([leaderId]),
    createdAt: 0 /* ARE-DETERMINISM-ALLOW: determinism placeholder */,
  };
  parties.set(id, party);
  playerToParty.set(leaderId, id);
  return party;
}

export function inviteToParty(inviterId: string, targetId: string): { ok: boolean; reason?: string } {
  const partyId = playerToParty.get(inviterId);
  if (!partyId) return { ok: false, reason: "not_in_party" };

  const party = parties.get(partyId);
  if (!party) return { ok: false, reason: "party_not_found" };
  if (party.leaderId !== inviterId) return { ok: false, reason: "not_leader" };
  if (party.members.size >= MAX_PARTY_SIZE) return { ok: false, reason: "party_full" };

  if (playerToParty.has(targetId)) {
    return { ok: false, reason: "target_in_party" };
  }

  party.members.add(targetId);
  playerToParty.set(targetId, partyId);
  return { ok: true };
}

export function leaveParty(playerId: string): boolean {
  const partyId = playerToParty.get(playerId);
  if (!partyId) return false;

  const party = parties.get(partyId);
  if (!party) {
    playerToParty.delete(playerId);
    return false;
  }

  party.members.delete(playerId);
  playerToParty.delete(playerId);

  if (party.members.size === 0) {
    parties.delete(partyId);
    return true;
  }

  if (party.leaderId === playerId) {
    party.leaderId = [...party.members][0];
  }

  return true;
}

export function getPartyForPlayer(playerId: string): Party | undefined {
  const partyId = playerToParty.get(playerId);
  return partyId ? parties.get(partyId) : undefined;
}

export function getPartyMembers(playerId: string): string[] {
  const party = getPartyForPlayer(playerId);
  return party ? [...party.members] : [];
}

export function isInSameParty(playerA: string, playerB: string): boolean {
  const a = playerToParty.get(playerA);
  const b = playerToParty.get(playerB);
  return !!a && a === b;
}

export function disbandParty(leaderId: string): boolean {
  const partyId = playerToParty.get(leaderId);
  if (!partyId) return false;

  const party = parties.get(partyId);
  if (!party || party.leaderId !== leaderId) return false;

  for (const memberId of party.members) {
    playerToParty.delete(memberId);
  }
  parties.delete(partyId);
  return true;
}

export function getPartyById(partyId: string): Party | undefined {
  return parties.get(partyId);
}

export function isPartyLeader(playerId: string): boolean {
  const party = getPartyForPlayer(playerId);
  return party?.leaderId === playerId;
}

/** Reset all state (for tests). */
export function _resetPartyState(): void {
  parties.clear();
  playerToParty.clear();
  nextPartyId = 1;
}
