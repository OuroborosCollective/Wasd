export interface Vector3 {
    x: number;
    y: number;
    z: number;
}

export class CullingSystem {
    private frustumPlanes: number[][];
    private cameraPosition: Vector3;
    private maxDistanceSq: number;

    constructor(maxDistance: number = 256) {
        this.frustumPlanes = [
            [0, 0, 0, 0], // Left
            [0, 0, 0, 0], // Right
            [0, 0, 0, 0], // Bottom
            [0, 0, 0, 0], // Top
            [0, 0, 0, 0], // Near
            [0, 0, 0, 0]  // Far
        ];
        this.cameraPosition = { x: 0, y: 0, z: 0 };
        this.maxDistanceSq = maxDistance * maxDistance;
    }

    /**
     * Updates the frustum planes based on the View-Projection matrix.
     * Expects a column-major 4x4 matrix (Float32Array of length 16).
     */
    public update(viewProjectionMatrix: Float32Array, cameraPos: Vector3): void {
        this.cameraPosition = cameraPos;
        const m = viewProjectionMatrix;

        // Extract planes from matrix rows (Gribb-Hartmann method)
        // Left
        this.setPlane(0, m[3] + m[0], m[7] + m[4], m[11] + m[8], m[15] + m[12]);
        // Right
        this.setPlane(1, m[3] - m[0], m[7] - m[4], m[11] - m[8], m[15] - m[12]);
        // Bottom
        this.setPlane(2, m[3] + m[1], m[7] + m[5], m[11] + m[9], m[15] + m[13]);
        // Top
        this.setPlane(3, m[3] - m[1], m[7] - m[5], m[11] - m[9], m[15] - m[13]);
        // Near
        this.setPlane(4, m[3] + m[2], m[7] + m[6], m[11] + m[10], m[15] + m[14]);
        // Far
        this.setPlane(5, m[3] - m[2], m[7] - m[6], m[11] - m[10], m[15] - m[14]);
    }

    private setPlane(index: number, a: number, b: number, c: number, d: number): void {
        const length = Math.sqrt(a * a + b * b + c * c);
        this.frustumPlanes[index][0] = a / length;
        this.frustumPlanes[index][1] = b / length;
        this.frustumPlanes[index][2] = c / length;
        this.frustumPlanes[index][3] = d / length;
    }

    /**
     * Checks if a chunk is visible based on radial distance and frustum planes.
     * @param center The center position of the chunk
     * @param radius The bounding radius of the chunk (typically chunk size * sqrt(3) / 2)
     */
    public isVisible(center: Vector3, radius: number): boolean {
        // 1. Radial Distance Culling (Early Exit)
        const dx = center.x - this.cameraPosition.x;
        const dy = center.y - this.cameraPosition.y;
        const dz = center.z - this.cameraPosition.z;
        const distSq = dx * dx + dy * dy + dz * dz;

        // If the chunk is further than maxDistance, cull it
        // We use radius to ensure we don't cull chunks that are partially within range
        const effectiveRadius = radius + Math.sqrt(this.maxDistanceSq);
        if (distSq > effectiveRadius * effectiveRadius) {
            return false;
        }

        // 2. Frustum Culling
        for (let i = 0; i < 6; i++) {
            const plane = this.frustumPlanes[i];
            // Sphere-plane intersection: distance from center to plane
            const distance = plane[0] * center.x + 
                             plane[1] * center.y + 
                             plane[2] * center.z + 
                             plane[3];

            // If the sphere is completely behind any plane, it is not visible
            if (distance < -radius) {
                return false;
            }
        }

        return true;
    }

    public setMaxDistance(distance: number): void {
        this.maxDistanceSq = distance * distance;
    }
}