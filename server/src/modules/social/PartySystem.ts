// @ARE-GUARD-EXEMPT: Party creation timestamps; not world-state input.
export class PartySystem {
  createParty(leaderId: string) {
    return {
      leaderId,
      members: [leaderId],
      createdAt: Date.now()
    };
  }
}