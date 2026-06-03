import { AxiomaticEventBus } from './axiomatic-event-bus';
import { WatchdogEmitter, type WatchdogSeverity } from './watchdog-emitter';
import { WATCHDOG_TICK_HZ, WATCHDOG_TICK_MS, normalizePositiveInteger } from './watchdog-determinism';

let currentTick = 0;
let localSequence = 0;

const sinkUrl = process.env.WATCHDOG_EMITTER_URL || 'ws://localhost:8080';

export const backendWatchdogBus = AxiomaticEventBus.getInstance();
export const backendWatchdogEmitter = new WatchdogEmitter(sinkUrl, {
  initialTick: currentTick,
  role: 'backend-core',
  localOnly: process.env.WATCHDOG_LOCAL_ONLY === '1',
});

export function setBackendWatchdogTick(tick: number): number {
  currentTick = normalizePositiveInteger(tick, currentTick);
  localSequence = 0;
  backendWatchdogBus.beginTick(currentTick);
  backendWatchdogEmitter.setWorldTick(currentTick);
  return currentTick;
}

export function advanceBackendWatchdogTick(): number {
  return setBackendWatchdogTick(currentTick + 1);
}

export function getBackendWatchdogTick(): number {
  return currentTick;
}

export function getBackendWatchdogTimestamp(): number {
  return currentTick * WATCHDOG_TICK_MS;
}

export function nextBackendWatchdogSequence(): number {
  localSequence += 1;
  return localSequence;
}

export function createBackendAuditStamp(): string {
  return `tick:${currentTick};seq:${nextBackendWatchdogSequence()};ms:${getBackendWatchdogTimestamp()}`;
}

export function emitBackendWatchdogEvent(
  type: string,
  payload: Record<string, unknown> = {},
  severity: WatchdogSeverity = 'LOW',
  source = 'BACKEND_WATCHDOG',
  tick = currentTick,
) {
  setBackendWatchdogTick(tick);
  return backendWatchdogEmitter.emit(type, payload, severity, source, currentTick);
}

export function publishBackendLedgerEvent(
  type: string,
  payload: Record<string, unknown> = {},
  source = 'backend-watchdog',
  tick = currentTick,
) {
  setBackendWatchdogTick(tick);
  return backendWatchdogBus.publish(type, payload, {
    tick: currentTick,
    source,
    metadata: {
      tickHz: WATCHDOG_TICK_HZ,
      tickMs: WATCHDOG_TICK_MS,
      backendRuntime: true,
    },
    violationPolicy: 'reject',
    silent: true,
  });
}

export function getBackendWatchdogStatus() {
  return {
    tick: currentTick,
    seq: localSequence,
    timestamp: getBackendWatchdogTimestamp(),
    tickHz: WATCHDOG_TICK_HZ,
    tickMs: WATCHDOG_TICK_MS,
    ledger: backendWatchdogBus.getLedgerStats(),
  };
}
