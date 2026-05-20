// @ARE-GUARD-EXEMPT: non-sim module
export class MigrationEngine {
  migrate(groupId: string, from: string, to: string) {
    return {
      type: "migration",
      groupId,
      from,
      to,
      startedAt: Date.now()
    };
  }
}