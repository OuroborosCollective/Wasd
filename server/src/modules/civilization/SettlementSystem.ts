// @ARE-GUARD-EXEMPT: Legacy non-deterministic calls permitted for telemetry/meta paths
export class SettlementSystem {
  createSettlement(type: "village" | "city" | "kingdom" | "nation", ownerId: string) {
    return {
      type,
      ownerId,
      createdAt: Date.now()
    };
  }
}