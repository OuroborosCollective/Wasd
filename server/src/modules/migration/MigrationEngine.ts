// @ARE-GUARD-EXEMPT: Migration metadata; not world-state input.
export class MigrationEngine {
  migrate(groupId: string, from: string, to: string) {
    return { groupId, from, to, departedAt: Date.now() };
  }
}