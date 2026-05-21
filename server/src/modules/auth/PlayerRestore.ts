// @ARE-GUARD-EXEMPT: Player restore timing; not world-state input.
export class PlayerRestore {
  restore(saved: any) {
    return {
      ...saved,
      restoredAt: Date.now()
    };
  }
}