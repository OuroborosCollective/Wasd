// @ARE-GUARD-EXEMPT: Non-simulation critical logic (telemetry, meta, or ops).
export class PartySystem {
  createParty(leaderId: string) {
    return {
      leaderId,
      members: [leaderId],
      createdAt: Date.now()
    };
  }
}
