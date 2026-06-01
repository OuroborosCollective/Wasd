export class PlayerRestore {
  restore(saved: any) {
    return {
      ...saved,
      restoredAt: 0 /* ARE-DETERMINISM-ALLOW: determinism placeholder */
    };
  }
}