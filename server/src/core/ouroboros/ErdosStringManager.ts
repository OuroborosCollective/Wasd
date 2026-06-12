/**
 * ErdosStringManager - Deterministic Erdős-String Generation and Parsing
 * 
 * Phase 11: Ouroboros Grand Unification with ARE-Logic
 * 
 * Axiom 2 (Nomock-Theorem): NO external time sources
 * Axiom 3 (Zeitstempel-Integrität): Tick-based, not wall-clock
 * 
 * All randomness uses FNV-1a hash with deterministic seeds.
 */

import { KAPPA, type KappaInt } from '../are/Kappa.js';
import { kappa1000Hash, type KappaLayerKey } from '../are/KappaLayers.js';
import type { ChunkKey, TickId } from '../are/types.js';
import {
  type ErdősString,
  type ErdősRecord,
  type ParsedErdősEvent,
  OuroborosEventType,
  OuroborosPhase,
  type OuroborosLayerVector
} from './OuroborosTypes.js';

/**
 * Append an event to an Erdős-String.
 * Returns NEW string (immutable, no mutation during iteration).
 * 
 * @param erdos - Current Erdős-String
 * @param event - Event type to append
 * @param tick - Current tick (deterministic, NOT wall-clock)
 * @param data - Optional event data
 * @returns New ErdősString with event appended
 */
export function appendEvent(
  erdos: ErdősString,
  event: OuroborosEventType,
  tick: TickId,
  data?: string
): ErdősString {
  const eventStr = data ? `${event}:${data}` : String(event);
  const newEvents = erdos.events.length > 0
    ? `${erdos.events}|${tick}:${eventStr}`
    : `${tick}:${eventStr}`;
  
  return Object.freeze({
    chunkKey: erdos.chunkKey,
    events: newEvents,
    lastTick: tick > erdos.lastTick ? tick : erdos.lastTick
  });
}

/**
 * Create a new Erdős-String with initial settlement event.
 */
export function createGenesisErdos(
  chunkKey: ChunkKey,
  tick: TickId
): ErdősString {
  return Object.freeze({
    chunkKey,
    events: `${tick}:${OuroborosEventType.SETTLE}`,
    lastTick: tick
  });
}

/**
 * Parse an Erdős-String into individual events.
 * 
 * @param eventsStr - Pipe-separated event string
 * @returns Array of parsed events in chronological order
 */
export function parseErdosString(eventsStr: string): ParsedErdősEvent[] {
  if (!eventsStr || eventsStr.length === 0) {
    return [];
  }
  
  const events: ParsedErdősEvent[] = [];
  const parts = eventsStr.split('|');
  
  for (const part of parts) {
    const colonIdx = part.indexOf(':');
    if (colonIdx === -1) continue;
    
    const tickStr = part.slice(0, colonIdx);
    const eventStr = part.slice(colonIdx + 1);
    const tick = Number(tickStr) as TickId;
    
    if (Number.isNaN(tick)) continue;
    
    // Determine event type
    const eventType = parseEventType(eventStr);
    if (eventType) {
      // Extract data if present (after first colon in eventStr)
      const dataColonIdx = eventStr.indexOf(':');
      const data = dataColonIdx !== -1 ? eventStr.slice(dataColonIdx + 1) : undefined;
      
      events.push(Object.freeze({
        tick,
        type: eventType,
        data
      }));
    }
  }
  
  return Object.freeze(events);
}

/**
 * Parse event type from string.
 */
function parseEventType(eventStr: string): OuroborosEventType | null {
  // Check if it starts with a known event type
  for (const type of Object.values(OuroborosEventType)) {
    if (eventStr.startsWith(type)) {
      return type;
    }
  }
  
  // Check for numeric tick prefix (malformed)
  if (/^\d+:/.test(eventStr)) {
    return null;
  }
  
  return null;
}

/**
 * Compute a deterministic layer seed from Erdős-String.
 * Used for reproducible random generation.
 * 
 * @param erdos - Erdős-String
 * @param layerKey - Layer to compute seed for
 * @returns Deterministic seed value
 */
export function computeLayerSeed(
  erdos: ErdősString,
  layerKey: KappaLayerKey
): number {
  const input = `${erdos.chunkKey}_${erdos.events}_${layerKey}_${KAPPA}`;
  return kappa1000Hash(input);
}

/**
 * Compute seed for a specific tick and entity combination.
 */
export function computeTickSeed(
  erdos: ErdősString,
  tick: TickId,
  entityId?: string
): number {
  const entityPart = entityId ? `_${entityId}` : '';
  const input = `${erdos.chunkKey}_${erdos.events}_${tick}${entityPart}_${KAPPA}`;
  return kappa1000Hash(input);
}

/**
 * Get current Ouroboros phase from Erdős-String.
 */
export function getOuroborosPhase(erdos: ErdősString): OuroborosPhase {
  const events = parseErdosString(erdos.events);
  if (events.length === 0) return OuroborosPhase.WILD;
  
  let phase = OuroborosPhase.WILD;
  
  for (const event of events) {
    switch (event.type) {
      case OuroborosEventType.SETTLE:
        phase = OuroborosPhase.SETTLED;
        break;
      case OuroborosEventType.KINGDOM:
        phase = OuroborosPhase.KINGDOM;
        break;
      case OuroborosEventType.WAR:
        phase = OuroborosPhase.WAR;
        break;
      case OuroborosEventType.FALLEN:
        phase = OuroborosPhase.FALLEN;
        break;
      case OuroborosEventType.RESURRECT:
        phase = OuroborosPhase.RESURRECT;
        break;
    }
  }
  
  return phase;
}

/**
 * Extract layer influence from Erdős-String events.
 * Used for deterministic layer reconstruction.
 */
export function extractLayerInfluence(
  erdos: ErdősString
): Readonly<{
  conflictBonus: KappaInt;
  economyBonus: KappaInt;
  memoryBonus: KappaInt;
  cyclesBonus: KappaInt;
  dungeonSeed: number;
}> {
  const events = parseErdosString(erdos.events);
  
  let conflictBonus = 0 as KappaInt;
  let economyBonus = 0 as KappaInt;
  let memoryBonus = 0 as KappaInt;
  let cyclesBonus = 0 as KappaInt;
  let dungeonSeed = 0;
  
  for (const event of events) {
    switch (event.type) {
      case OuroborosEventType.WAR:
        conflictBonus = (conflictBonus + 50000) as KappaInt;
        break;
      case OuroborosEventType.KINGDOM:
        economyBonus = (economyBonus + 80000) as KappaInt;
        memoryBonus = (memoryBonus + 50000) as KappaInt;
        break;
      case OuroborosEventType.FALLEN:
        cyclesBonus = (cyclesBonus + 100000) as KappaInt;
        // Generate dungeon seed from kingdom ID and tick
        if (event.data) {
          dungeonSeed = kappa1000Hash(`${erdos.chunkKey}_${event.data}_${event.tick}`);
        }
        break;
      case OuroborosEventType.RESURRECT:
        cyclesBonus = (cyclesBonus + 20000) as KappaInt;
        break;
      case OuroborosEventType.LEGEND:
        memoryBonus = (memoryBonus + 30000) as KappaInt;
        break;
    }
  }
  
  return Object.freeze({
    conflictBonus,
    economyBonus,
    memoryBonus,
    cyclesBonus,
    dungeonSeed
  });
}

/**
 * Reconstruct layers deterministically from Erdős-String.
 * State-Bloat = 0: We store only strings, not layer values.
 */
export function reconstructLayersFromErdos(
  erdos: ErdősString,
  baseLayers?: Partial<OuroborosLayerVector>
): OuroborosLayerVector {
  const influence = extractLayerInfluence(erdos);
  const baseHash = computeLayerSeed(erdos, 'ecology');
  
  // Extract values from hash deterministically
  const ecology = (baseHash % KAPPA) as KappaInt;
  const market = ((baseHash >> 2) % KAPPA) as KappaInt;
  const physiology = ((baseHash >> 4) % KAPPA) as KappaInt;
  const trade = ((baseHash >> 6) % KAPPA) as KappaInt;
  const politics = ((baseHash >> 8) % KAPPA) as KappaInt;
  const faith = ((baseHash >> 10) % KAPPA) as KappaInt;
  const fear = ((baseHash >> 12) % KAPPA) as KappaInt;
  
  // Apply event bonuses
  const memory = ((baseHash >> 14) % KAPPA + influence.memoryBonus) as KappaInt;
  const conflict = ((baseHash >> 16) % KAPPA + influence.conflictBonus) as KappaInt;
  const economy = ((baseHash >> 18) % KAPPA + influence.economyBonus) as KappaInt;
  const kingdoms = erdos.events.includes(OuroborosEventType.KINGDOM)
    ? ((baseHash >> 20) % 500000) as KappaInt
    : (0 as KappaInt);
  const dungeon = influence.dungeonSeed > 0
    ? (influence.dungeonSeed % KAPPA) as KappaInt
    : ((baseHash >> 22) % KAPPA) as KappaInt;
  const cycles = influence.cyclesBonus;
  
  return Object.freeze({
    ecology: baseLayers?.ecology ?? ecology,
    market: baseLayers?.market ?? market,
    physiology: baseLayers?.physiology ?? physiology,
    trade: baseLayers?.trade ?? trade,
    memory: baseLayers?.memory ?? memory,
    politics: baseLayers?.politics ?? politics,
    conflict: baseLayers?.conflict ?? conflict,
    economy: baseLayers?.economy ?? economy,
    kingdoms: baseLayers?.kingdoms ?? kingdoms,
    faith: baseLayers?.faith ?? faith,
    dungeon: baseLayers?.dungeon ?? dungeon,
    fear: baseLayers?.fear ?? fear,
    cycles: baseLayers?.cycles ?? cycles
  });
}

/**
 * Convert ErdősString to ErdősRecord for persistence.
 */
export function toErdosRecord(erdos: ErdősString): ErdősRecord {
  return Object.freeze({
    chunkKey: erdos.chunkKey,
    erdosString: erdos.events,
    lastTick: erdos.lastTick
  });
}

/**
 * Reconstruct ErdősString from ErdősRecord.
 */
export function fromErdosRecord(record: ErdősRecord): ErdősString {
  return Object.freeze({
    chunkKey: record.chunkKey,
    events: record.erdosString,
    lastTick: record.lastTick
  });
}

/**
 * Check if an event type exists in the Erdős-String.
 */
export function hasEvent(erdos: ErdősString, eventType: OuroborosEventType): boolean {
  return erdos.events.includes(eventType);
}

/**
 * Get the tick of the last event of a specific type.
 */
export function getLastEventTick(
  erdos: ErdősString,
  eventType: OuroborosEventType
): TickId | null {
  const events = parseErdosString(erdos.events);
  for (let i = events.length - 1; i >= 0; i--) {
    if (events[i].type === eventType) {
      return events[i].tick;
    }
  }
  return null;
}

/**
 * Count occurrences of an event type.
 */
export function countEvents(erdos: ErdősString, eventType: OuroborosEventType): number {
  const events = parseErdosString(erdos.events);
  let count = 0;
  for (const event of events) {
    if (event.type === eventType) count++;
  }
  return count;
}

/**
 * Get time since last event of type (in ticks).
 */
export function ticksSinceEvent(
  erdos: ErdősString,
  eventType: OuroborosEventType,
  currentTick: TickId
): number {
  const lastTick = getLastEventTick(erdos, eventType);
  if (lastTick === null) return Infinity;
  return Number(currentTick) - Number(lastTick);
}