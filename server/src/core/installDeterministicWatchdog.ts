import { eventBus } from './axiomatic-event-bus.js';
import { serverWatchdogEmitter } from './watchdog-emitter.js';
import { WATCHDOG_TICK_HZ, WATCHDOG_TICK_MS } from './watchdog-determinism.js';
import { installWorldTickWatchdogBridge } from './installWorldTickWatchdogBridge.js';

let installed = false;

export function installDeterministicWatchdogRuntime(): void {
  if (installed) return;
  installed = true;

  eventBus.beginTick(0);
  eventBus.subscribe('*', (event) => {
    if (event.type === 'server.watchdog.ready') return;
    if (event.metadata?.severity === 'HIGH' || event.metadata?.severity === 'CRITICAL') {
      console.warn(`[DeterministicWatchdog] ${event.type} tick=${event.tick}.${event.tickSequence} id=${event.id}`);
    }
  }, 1);

  installWorldTickWatchdogBridge();

  serverWatchdogEmitter.emit('server.watchdog.ready', {
    status: 'ready',
    tickHz: WATCHDOG_TICK_HZ,
    tickMs: WATCHDOG_TICK_MS,
    runtime: 'server-core',
    worldTickBridge: true,
  }, 'LOW', 'server-core', 0);

  console.log(`[DeterministicWatchdog] installed tick=${WATCHDOG_TICK_HZ}Hz step=${WATCHDOG_TICK_MS}ms ledger=${eventBus.getLedgerStats().size} worldTickBridge=true`);
}

export function getDeterministicWatchdogStatus() {
  const stats = eventBus.getLedgerStats();
  return {
    installed,
    tickHz: WATCHDOG_TICK_HZ,
    tickMs: WATCHDOG_TICK_MS,
    ledger: stats,
  };
}
