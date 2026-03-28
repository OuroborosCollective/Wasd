export class CoreEventBus {
  private listeners: Map<string, Function[]> = new Map();

  on(event: string, callback: Function) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)?.push(callback);
  }

  emit(event: string, ...args: any[]) {
    this.listeners.get(event)?.forEach(callback => callback(...args));
  }

  off(event: string, callback: Function) {
    const list = this.listeners.get(event);
    if (list) {
      this.listeners.set(event, list.filter(cb => cb !== callback));
    }
  }
}
