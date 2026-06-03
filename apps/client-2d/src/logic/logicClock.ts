export interface LogicTick {
  tickId: number;
  fixedDtMs: number;
  fixedDtSec: number;
  nowMs: number;
}

export interface LogicClockOptions {
  hz: number;
  onTick: (tick: LogicTick) => void;
}

export interface LogicClock {
  start(): void;
  stop(): void;
  getTickId(): number;
  getRunning(): boolean;
}

export function createLogicClock(options: LogicClockOptions): LogicClock {
  const fixedDtMs = Math.round(1000 / options.hz);
  const fixedDtSec = fixedDtMs / 1000;

  let running = false;
  let tickId = 0;
  let timer: ReturnType<typeof setTimeout> | undefined;

  function step(): void {
    if (!running) return;

    tickId += 1;

    options.onTick({
      tickId,
      fixedDtMs,
      fixedDtSec,
      nowMs: performance.now()
    });

    timer = setTimeout(step, fixedDtMs);
  }

  return {
    start() {
      if (running) return;
      running = true;
      timer = setTimeout(step, fixedDtMs);
    },

    stop() {
      running = false;
      if (timer !== undefined) {
        clearTimeout(timer);
        timer = undefined;
      }
    },

    getTickId() {
      return tickId;
    },

    getRunning() {
      return running;
    }
  };
}