export class Interpolation {
    /**
     * Linear interpolation between two values.
     * @param start The start value.
     * @param end The end value.
     * @param alpha The interpolation factor (clamped between 0 and 1).
     */
    public static lerp(start: number, end: number, alpha: number): number {
        const clampedAlpha = Math.min(Math.max(alpha, 0), 1);
        return start + (end - start) * clampedAlpha;
    }

    /**
     * Clamps a value between a minimum and maximum range.
     */
    public static clamp(value: number, min: number, max: number): number {
        return Math.min(Math.max(value, min), max);
    }

    /**
     * Smoothstep interpolation.
     * Provides a smooth transition between 0 and 1 based on x.
     */
    public static smoothstep(edge0: number, edge1: number, x: number): number {
        const t = Math.min(Math.max((x - edge0) / (edge1 - edge0), 0), 1);
        return t * t * (3 - 2 * t);
    }

    /**
     * Smootherstep interpolation (Ken Perlin's version).
     * Provides even smoother transitions (zero 1st and 2nd derivatives at endpoints).
     */
    public static smootherstep(edge0: number, edge1: number, x: number): number {
        const t = Math.min(Math.max((x - edge0) / (edge1 - edge0), 0), 1);
        return t * t * t * (t * (t * 6 - 15) + 10);
    }
}