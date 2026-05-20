// @ARE-GUARD-EXEMPT: core meta
/** Minimal tick bus for optional subsystems (extend with real scheduling). */
export class ServerTickEmitter {
  private readonly handlers = new Map<string, Array<(...args: unknown[]) => void>>();

  emit(_event: string, _data?: unknown): void {
    // no-op stub
  }

  on(event: string, handler: (...args: unknown[]) => void): void {
    const list = this.handlers.get(event) ?? [];
    list.push(handler);
    this.handlers.set(event, list);
  }
}

export const serverTickEmitter = new ServerTickEmitter();
