import type { InputFrame } from "../net/protocol";

export interface PendingInputQueue {
  push(frame: InputFrame): void;
  acknowledge(sequenceId: number): void;
  getPending(): InputFrame[];
  getPendingCount(): number;
  getLastSequenceId(): number;
  clear(): void;
}

export function createPendingInputQueue(maxPending = 96): PendingInputQueue {
  const pending: InputFrame[] = [];
  let lastSequenceId = 0;

  return {
    push(frame) {
      lastSequenceId = Math.max(lastSequenceId, frame.sequenceId);
      pending.push(frame);

      while (pending.length > maxPending) {
        pending.shift();
      }
    },

    acknowledge(sequenceId) {
      for (let i = pending.length - 1; i >= 0; i -= 1) {
        if (pending[i].sequenceId <= sequenceId) {
          pending.splice(i, 1);
        }
      }
    },

    getPending() {
      return pending.slice();
    },

    getPendingCount() {
      return pending.length;
    },

    getLastSequenceId() {
      return lastSequenceId;
    },

    clear() {
      pending.length = 0;
    }
  };
}