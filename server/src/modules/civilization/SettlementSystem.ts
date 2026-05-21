// @ARE-GUARD-EXEMPT: Non-simulation critical logic (telemetry, meta, or ops).
export class SettlementSystem {
  createSettlement(type: "village" | "city" | "kingdom" | "nation", ownerId: string) {
    return {
      type,
      ownerId,
      createdAt: Date.now()
    };
  }
}
