// @ARE-GUARD-EXEMPT: Migration start timestamps; not world-state input.
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