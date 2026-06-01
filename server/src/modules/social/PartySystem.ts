export class PartySystem {
  createParty(leaderId: string) {
    return {
      leaderId,
      members: [leaderId],
      createdAt: 0 /* ARE-DETERMINISM-ALLOW: determinism placeholder */
    };
  }
}