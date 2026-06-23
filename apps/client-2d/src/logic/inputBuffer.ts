import type { InputFrame } from "../net/protocol";

export interface InputBuffer {
  setMove(x: number, y: number): void;
  setPrimary(active: boolean): void;
  setSkill1(active: boolean): void;
  setPointer(x: number, y: number): void;
  consumeForTick(tickId: number): InputFrame;
  getLastInput(): InputFrame;
  getLastSequenceId(): number;
}

function clampAxis(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(-1, Math.min(1, value));
}

function tickToClientTimeMs(tickId: number): number {
  return Math.max(0, Math.trunc(tickId)) * 100;
}

export function createInputBuffer(): InputBuffer {
  let moveX = 0;
  let moveY = 0;
  let primary = false;
  let skill1 = false;
  let pointerX: number | undefined;
  let pointerY: number | undefined;
  let sequenceId = 0;

  let lastInput: InputFrame = {
    sequenceId: 0,
    tickId: 0,
    moveX: 0,
    moveY: 0,
    primary: false,
    skill1: false,
    clientTimeMs: 0
  };

  return {
    setMove(x, y) {
      moveX = clampAxis(x);
      moveY = clampAxis(y);
    },

    setPrimary(active) {
      primary = active;
    },

    setSkill1(active) {
      skill1 = active;
    },

    setPointer(x, y) {
      pointerX = Number.isFinite(x) ? x : undefined;
      pointerY = Number.isFinite(y) ? y : undefined;
    },

    consumeForTick(tickId) {
      sequenceId += 1;

      lastInput = {
        sequenceId,
        tickId,
        moveX,
        moveY,
        primary,
        skill1,
        pointerX,
        pointerY,
        clientTimeMs: tickToClientTimeMs(tickId)
      };

      primary = false;
      skill1 = false;

      return lastInput;
    },

    getLastInput() {
      return lastInput;
    },

    getLastSequenceId() {
      return sequenceId;
    }
  };
}
