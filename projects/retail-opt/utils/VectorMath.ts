export interface Vector2D {
    x: number;
    y: number;
}

export class VectorMath {
    /**
     * Berechnet die euklidische Distanz zwischen zwei Punkten.
     */
    public static getDistance(p1: Vector2D, p2: Vector2D): number {
        const dx = p1.x - p2.x;
        const dy = p1.y - p2.y;
        return Math.sqrt(dx * dx + dy * dy);
    }

    /**
     * Lineare Interpolation zwischen zwei Werten.
     */
    public static lerp(start: number, end: number, t: number): number {
        return start + (end - start) * this.clamp(t, 0, 1);
    }

    /**
     * Begrenzt einen Wert auf ein Minimum und Maximum.
     */
    public static clamp(value: number, min: number, max: number): number {
        return Math.max(min, Math.min(max, value));
    }

    /**
     * Berechnet die Intensität für das Quest-Echo System basierend auf der Entfernung.
     * Nutzt einen exponentiellen Abfall (Falloff).
     * @param distance Aktuelle Distanz zum Ziel
     * @param maxRadius Maximaler Radius, ab dem die Intensität 0 erreicht
     * @param falloff Exponent für die Kurve (1 = Linear, 2 = Quadratisch)
     */
    public static calculateEchoIntensity(distance: number, maxRadius: number, falloff: number = 2): number {
        if (distance >= maxRadius) return 0;
        if (distance <= 0) return 1;

        const normalizedDistance = distance / maxRadius;
        const intensity = 1 - Math.pow(normalizedDistance, falloff);
        
        return this.clamp(intensity, 0, 1);
    }

    /**
     * Berechnet die Richtung von einem Startpunkt zu einem Zielpunkt als normalisierter Vektor.
     */
    public static getDirection(from: Vector2D, to: Vector2D): Vector2D {
        const dist = this.getDistance(from, to);
        if (dist === 0) return { x: 0, y: 0 };
        
        return {
            x: (to.x - from.x) / dist,
            y: (to.y - from.y) / dist
        };
    }

    /**
     * Interpoliert zwischen zwei 2D Vektoren.
     */
    public static lerpVector(v1: Vector2D, v2: Vector2D, t: number): Vector2D {
        return {
            x: this.lerp(v1.x, v2.x, t),
            y: this.lerp(v1.y, v2.y, t)
        };
    }
}