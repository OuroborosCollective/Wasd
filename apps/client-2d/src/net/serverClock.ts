export interface ServerClock {
  observe(serverTick?: number, serverTimeMs?: number): void;
  getLastServerTick(): number;
  getServerTimeOffsetMs(): number;
}

export function createServerClock(): ServerClock {
  let lastServerTick = 0;
  let offsetMs = 0;
  let initialized = false;

  return {
    observe(serverTick, serverTimeMs) {
      if (typeof serverTick === "number") {
        lastServerTick = Math.max(lastServerTick, serverTick);
      }

      if (typeof serverTimeMs === "number") {
        const now = Date.now();
        const nextOffset = serverTimeMs - now;

        if (!initialized) {
          offsetMs = nextOffset;
          initialized = true;
        } else {
          offsetMs = offsetMs * 0.85 + nextOffset * 0.15;
        }
      }
    },

    getLastServerTick() {
      return lastServerTick;
    },

    getServerTimeOffsetMs() {
      return Math.round(offsetMs);
    }
  };
}