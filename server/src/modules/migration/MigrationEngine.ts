export class MigrationEngine {
  migrate(groupId: string, from: string, to: string) {
    return { groupId, from, to, departedAt: 0 /* ARE-DETERMINISM-ALLOW: determinism placeholder */ };
  }
}