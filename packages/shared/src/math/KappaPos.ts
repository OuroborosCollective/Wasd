/**
 * KappaPos - Deterministic Integer Grid Utility
 *
 * Mandate: Eliminierung von Floating-Point-Drift.
 * Deterministic rounding using Math.floor(val * SCALE + EPSILON).
 */

export const KAPPA_SCALE = 1000;
export const KAPPA_EPSILON = 1e-9;

export interface KappaPos {
    x: number; // Integer representation (scaled by 1000)
    y: number; // Integer representation (scaled by 1000)
    z?: number; // Integer representation (scaled by 1000)
}

export class KappaPosGrid {
    /**
     * Converts a floating point coordinate to its integer Kappa representation.
     */
    public static toInternal(val: number): number {
        if (typeof val !== 'number' || isNaN(val)) return 0;
        return Math.floor(val * KAPPA_SCALE + KAPPA_EPSILON);
    }

    /**
     * Converts an internal Kappa integer back to floating point.
     */
    public static toExternal(internalVal: number): number {
        return internalVal / KAPPA_SCALE;
    }

    /**
     * Creates a KappaPos object from floating point coordinates.
     */
    public static create(x: number, y: number, z?: number): KappaPos {
        return {
            x: this.toInternal(x),
            y: this.toInternal(y),
            z: z !== undefined ? this.toInternal(z) : undefined
        };
    }

    /**
     * Generates a deterministic hash for a KappaPos.
     */
    public static getHash(pos: KappaPos): string {
        const data = `${pos.x},${pos.y},${pos.z ?? 0}`;
        let hash = 0;
        for (let i = 0; i < data.length; i++) {
            const char = data.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash |= 0; // Convert to 32bit integer
        }
        return hash.toString(16);
    }

    /**
     * Deterministic distance squared calculation (avoids Math.sqrt).
     * Returns squared distance in internal (integer) units.
     */
    public static distanceSq(a: KappaPos, b: KappaPos): number {
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const dz = (a.z ?? 0) - (b.z ?? 0);
        return dx * dx + dy * dy + dz * dz;
    }

    /**
     * Deterministic movement.
     */
    public static move(pos: KappaPos, vx: number, vy: number, vz: number = 0, dt: number = 1): KappaPos {
        const scaledDt = this.toInternal(dt);
        const ivx = this.toInternal(vx);
        const ivy = this.toInternal(vy);
        const ivz = this.toInternal(vz);

        return {
            x: pos.x + Math.floor((ivx * scaledDt) / KAPPA_SCALE),
            y: pos.y + Math.floor((ivy * scaledDt) / KAPPA_SCALE),
            z: pos.z !== undefined ? pos.z + Math.floor((ivz * scaledDt) / KAPPA_SCALE) : undefined
        };
    }
}
