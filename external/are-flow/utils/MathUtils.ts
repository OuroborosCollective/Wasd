export class MathUtils {
    private static readonly PRECISION: number = 1000000000;

    /**
     * Wandelt eine Gleitkommazahl in einen Festkomma-Integer um.
     */
    public static toFixed(value: number): number {
        return Math.round(value * MathUtils.PRECISION);
    }

    /**
     * Wandelt einen Festkomma-Integer zurück in eine Gleitkommazahl.
     */
    public static fromFixed(fixedValue: number): number {
        return fixedValue / MathUtils.PRECISION;
    }

    /**
     * Addiert zwei Festkommazahlen.
     */
    public static fixedAdd(a: number, b: number): number {
        return a + b;
    }

    /**
     * Subtrahiert b von a (Festkomma).
     */
    public static fixedSub(a: number, b: number): number {
        return a - b;
    }

    /**
     * Multipliziert zwei Festkommazahlen.
     */
    public static fixedMul(a: number, b: number): number {
        return Math.round((a * b) / MathUtils.PRECISION);
    }

    /**
     * Dividiert a durch b (Festkomma).
     */
    public static fixedDiv(a: number, b: number): number {
        if (b === 0) {
            return 0;
        }
        return Math.round((a * MathUtils.PRECISION) / b);
    }

    /**
     * Begrenzt eine Festkommazahl auf einen Bereich.
     */
    public static fixedClamp(value: number, min: number, max: number): number {
        return Math.max(min, Math.min(max, value));
    }

    /**
     * Spezifische Normalisierung für kappaPos (0.0 bis 1.0 in Festkomma).
     */
    public static normalizeKappa(kappa: number): number {
        return MathUtils.fixedClamp(kappa, 0, MathUtils.PRECISION);
    }

    /**
     * Berechnet den Fortschritt basierend auf Geschwindigkeit und Zeitdelta in Festkomma-Präzision.
     */
    public static calculateProgress(currentFixed: number, speedFixed: number, deltaTimeSeconds: number): number {
        const dtFixed = MathUtils.toFixed(deltaTimeSeconds);
        const delta = MathUtils.fixedMul(speedFixed, dtFixed);
        return MathUtils.fixedAdd(currentFixed, delta);
    }

    /**
     * Prüft auf annähernde Gleichheit im Festkomma-Raum.
     */
    public static fixedEquals(a: number, b: number, tolerance: number = 1): boolean {
        return Math.abs(a - b) <= tolerance;
    }
}