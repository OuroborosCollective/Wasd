'use strict';

import { EventEmitter } from 'node:events';

class GameEventBus extends EventEmitter {
  emitSafe(type: string, payload: any): void {
    this.emit(type, Object.freeze({
      type,
      payload: Object.freeze(payload || {}),
      emittedAt: Date.now()
    }));
  }

  onSafe(type: string, handler: (payload: any, event?: any) => Promise<void>): void {
    this.on(type, async (event: any) => {
      try {
        await handler(event.payload, event);
      } catch (error: any) {
        this.emit('system.error', {
          source: `event:${type}`,
          message: error.message,
          stack: error.stack
        });
      }
    });
  }
}

export { GameEventBus };