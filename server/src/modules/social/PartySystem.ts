// @ARE-GUARD-EXEMPT: non-sim module
export class PartySystem {
  createParty(leaderId: string) {
    return {
      leaderId,
      members: [leaderId],
      createdAt: Date.now()
    };
  }
}