export interface Vector3 {
    readonly x: number;
    readonly y: number;
    readonly z: number;
}

export interface Quaternion {
    readonly x: number;
    readonly y: number;
    readonly z: number;
    readonly w: number;
}

/**
 * AREStructure (45% Weighting)
 * Defines static geometry and persistent identification.
 * Essential for deterministic spatial indexing.
 */
export interface AREStructure {
    readonly entityId: string;
    readonly layerId: number;
    readonly geometryHash: string;
    readonly boundingBox: {
        readonly min: Vector3;
        readonly max: Vector3;
    };
    readonly isStatic: boolean;
}

/**
 * AREDynamics (35% Weighting)
 * Captures transient motion states, forces, and kinetic energy.
 * Required for physics reconciliation and interpolation.
 */
export interface AREDynamics {
    readonly position: Vector3;
    readonly orientation: Quaternion;
    readonly linearVelocity: Vector3;
    readonly angularVelocity: Vector3;
    readonly appliedForces: Vector3[];
    readonly mass: number;
    readonly friction: number;
}

/**
 * AREMetadata (20% Weighting)
 * Temporal and integrity markers for network synchronization.
 * Ensures state validity and sequence order.
 */
export interface AREMetadata {
    readonly tick: number;
    readonly timestamp: number;
    readonly checksum: string;
    readonly producerId: string;
    readonly authSignature?: string;
}

/**
 * AREPayload
 * Root container for Advanced Reality Engine state packets.
 */
export interface AREPayload {
    readonly structure: AREStructure;
    readonly dynamics: AREDynamics;
    readonly metadata: AREMetadata;
}

export type DeterministicState = AREPayload[];