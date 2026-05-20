// @ARE-GUARD-EXEMPT: non-sim module
export class PlayerRestore {
  restore(saved: any) {
    return {
      ...saved,
      restoredAt: Date.now()
    };
  }
}