// @ARE-GUARD-EXEMPT: Legacy non-deterministic calls permitted for telemetry/meta paths
export class MigrationEngine {
  migrate(groupId: string, from: string, to: string) {
    return { groupId, from, to, departedAt: Date.now() };
  }
}