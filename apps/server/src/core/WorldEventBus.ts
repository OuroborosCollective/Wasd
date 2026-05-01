export type WorldEventMap = {
  [key: string]: any[];
};

export class WorldEventBus<T extends WorldEventMap> {
  private listeners: { [K in keyof T]?: ((...args: T[K]) => void)[] } = {};

  public on<K extends keyof T>(event: K, callback: (...args: T[K]) => void): void {
    if (!this.listeners[event]) {
      this.listeners[event] = [] as any;
    }
    (this.listeners[event] as any).push(callback);
  }

  public off<K extends keyof T>(event: K, callback: (...args: T[K]) => void): void {
    const callbacks = this.listeners[event];
    if (callbacks) {
      this.listeners[event] = callbacks.filter((cb) => cb !== callback) as any;
    }
  }

  public emit<K extends keyof T>(event: K, ...args: T[K]): void {
    const callbacks = this.listeners[event];
    if (callbacks) {
      callbacks.forEach((callback) => {
        try {
          callback(...args);
        } catch (error) {
          console.error(`Error in WorldEventBus for event ${String(event)}:`, error);
        }
      });
    }
  }

  public clear(event?: keyof T): void {
    if (event) {
      delete this.listeners[event];
    } else {
      this.listeners = {};
    }
  }
}

export default WorldEventBus;