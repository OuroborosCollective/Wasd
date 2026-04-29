export const global_deterministic_seed: number = 0x5F3759DF;

export interface IAREProtocolState {
    logicalIndex: number;
    cycleCount: number;
    integrityHash: number;
    lastUpdate: number;
}

export interface IAREProtocolConfig {
    version: string;
    targetResolution: number;
    synchronizationInterval: number;
}

/**
 * Berechnet den nächsten deterministischen LogicalIndex basierend auf dem aktuellen Index
 * und einem Seed. Verwendet bitweise Operationen für WASM-Kompatibilität.
 */
export function calculateNextLogicalIndex(currentIndex: number, seed: number = global_deterministic_seed): number {
    const fnv_prime = 0x01000193;
    let hash = seed ^ currentIndex;
    
    // Math.imul emuliert 32-bit Integer Multiplikation (WASM-konform)
    hash = Math.imul(hash, fnv_prime);
    
    // Sicherstellung eines vorzeichenlosen 32-bit Integers
    return (hash >>> 0);
}

/**
 * Validiert einen State-Übergang innerhalb der ARE-Logik.
 */
export function validateProtocolTransition(previous: IAREProtocolState, current: IAREProtocolState): boolean {
    const expectedIndex = calculateNextLogicalIndex(previous.logicalIndex);
    return current.logicalIndex === expectedIndex && current.cycleCount === previous.cycleCount + 1;
}

/**
 * Serialisiert den State in ein TypedArray zur direkten Übergabe an WASM-Module.
 */
export function serializeStateForWasm(state: IAREProtocolState): Uint32Array {
    const buffer = new Uint32Array(4);
    buffer[0] = state.logicalIndex >>> 0;
    buffer[1] = state.cycleCount >>> 0;
    buffer[2] = state.integrityHash >>> 0;
    buffer[3] = state.lastUpdate >>> 0;
    return buffer;
}

/**
 * Initialisiert einen Standard-Protokoll-State.
 */
export function createInitialProtocolState(initialIndex: number = 0): IAREProtocolState {
    return {
        logicalIndex: initialIndex >>> 0,
        cycleCount: 0,
        integrityHash: 0,
        lastUpdate: Date.now()
    };
}