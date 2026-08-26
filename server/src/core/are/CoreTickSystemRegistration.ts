import {
  ORACLE_TICK_SYSTEM_NAME,
  registerOracleTickSystem,
  type OracleTickSystemOptions,
} from './OracleTickSystem.js';
import {
  OUROBOROS_TICK_SYSTEM_NAME,
  registerOuroborosTickSystem,
  type OuroborosTickSystemOptions,
} from './OuroborosTickSystem.js';
import { tickSystemRegistry, type TickSystemRegistry } from './TickSystemRegistry.js';
import { sharedWorldEventBus } from '../../modules/ouroboros/sharedWorldEventBus.js';

export const CORE_TICK_SYSTEM_REGISTRATION_ORDER = Object.freeze([
  ORACLE_TICK_SYSTEM_NAME,
  OUROBOROS_TICK_SYSTEM_NAME,
] as const);

export type CoreTickSystemName = typeof CORE_TICK_SYSTEM_REGISTRATION_ORDER[number];

export interface CoreTickSystemRegistrationOptions {
  readonly oracle?: OracleTickSystemOptions;
  readonly ouroboros?: OuroborosTickSystemOptions;
}

export interface CoreTickSystemRegistrationResult {
  readonly registered: readonly CoreTickSystemName[];
  readonly alreadyRegistered: readonly CoreTickSystemName[];
  readonly order: readonly CoreTickSystemName[];
}

function registerIfMissing(
  registry: TickSystemRegistry,
  name: CoreTickSystemName,
  register: () => void,
  registered: CoreTickSystemName[],
  alreadyRegistered: CoreTickSystemName[],
): void {
  if (registry.has(name)) {
    alreadyRegistered.push(name);
    return;
  }

  register();
  registered.push(name);
}

/**
 * Registers the core ARE TickSystems exactly once.
 *
 * This is the runtime truth entrypoint used by WorldTickThinShell. It avoids
 * constructor-side duplicate registration while preserving deterministic order.
 */
export function registerCoreTickSystems(
  options: CoreTickSystemRegistrationOptions = {},
  registry: TickSystemRegistry = tickSystemRegistry,
): CoreTickSystemRegistrationResult {
  const registered: CoreTickSystemName[] = [];
  const alreadyRegistered: CoreTickSystemName[] = [];

  registerIfMissing(
    registry,
    ORACLE_TICK_SYSTEM_NAME,
    () => registerOracleTickSystem({
      tickInterval: 10,
      minRecordsForAnalysis: 6,
      maxStoredRecords: 240,
      eventBus: sharedWorldEventBus,
      ...options.oracle,
    }, registry),
    registered,
    alreadyRegistered,
  );

  registerIfMissing(
    registry,
    OUROBOROS_TICK_SYSTEM_NAME,
    () => registerOuroborosTickSystem({
      ...options.ouroboros,
      engineConfig: {
        tickInterval: 10,
        conflictCheckInterval: 100,
        enableNPCBrain: true,
        npcBrainInterval: 10,
        ...options.ouroboros?.engineConfig,
      },
    }, registry),
    registered,
    alreadyRegistered,
  );

  return Object.freeze({
    registered: Object.freeze([...registered]),
    alreadyRegistered: Object.freeze([...alreadyRegistered]),
    order: CORE_TICK_SYSTEM_REGISTRATION_ORDER,
  });
}
