/**
 * WorldEventBus — lightweight pub/sub for cross-module signals (server).
 */
export class WorldEventBus {
  private readonly handlers = new Map<string, Set<(data: unknown) => void>>();

  publish(event: string, data: unknown) {
    console.log(`[WorldEventBus] ${event}`, data);
  }

  emit(event: string, data?: unknown) {
    this.publish(event, data);
    const set = this.handlers.get(event);
    if (!set) return;
    for (const h of set) {
      try {
        h(data);
      } catch (err) {
        console.error(`[WorldEventBus] handler error for ${event}`, err);
      }
    }
  }

  subscribe(event: string, handler: (data: unknown) => void): void {
    let set = this.handlers.get(event);
    if (!set) {
      set = new Set();
      this.handlers.set(event, set);
    }
    set.add(handler);
  }

  unsubscribe(event: string, handler: (data: unknown) => void): void {
    const set = this.handlers.get(event);
    if (!set) return;
    set.delete(handler);
    if (set.size === 0) {
      this.handlers.delete(event);
    }
  }
}
