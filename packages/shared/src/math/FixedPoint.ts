export type FixedPointValue = bigint;

export class FixedPoint {
    public static readonly DEFAULT_DECIMALS: number = 18;

    /**
     * Konvertiert eine Number in einen BigInt Fixed-Point Wert.
     * Nutzt Math.round um Präzisionsverluste beim Floating-Point-Scaling zu minimieren.
     */
    public static fromNumber(value: number, decimals: number = FixedPoint.DEFAULT_DECIMALS): FixedPointValue {
        const factor: number = Math.pow(10, decimals);
        return BigInt(Math.round(value * factor));
    }

    /**
     * Konvertiert einen BigInt Fixed-Point Wert zurück in eine Number.
     */
    public static toNumber(value: FixedPointValue, decimals: number = FixedPoint.DEFAULT_DECIMALS): number {
        const factor: number = Math.pow(10, decimals);
        return Number(value) / factor;
    }

    /**
     * Addiert zwei Fixed-Point Werte.
     */
    public static add(a: FixedPointValue, b: FixedPointValue): FixedPointValue {
        return a + b;
    }

    /**
     * Subtrahiert b von a.
     */
    public static sub(a: FixedPointValue, b: FixedPointValue): FixedPointValue {
        return a - b;
    }

    /**
     * Multipliziert zwei Fixed-Point Werte und skaliert das Ergebnis zurück.
     */
    public static mul(a: FixedPointValue, b: FixedPointValue, decimals: number = FixedPoint.DEFAULT_DECIMALS): FixedPointValue {
        const multiplier: bigint = BigInt(10) ** BigInt(decimals);
        return (a * b) / multiplier;
    }

    /**
     * Dividiert a durch b mit Skalierung zur Erhaltung der Präzision.
     */
    public static div(a: FixedPointValue, b: FixedPointValue, decimals: number = FixedPoint.DEFAULT_DECIMALS): FixedPointValue {
        if (b === 0n) {
            throw new Error("FixedPoint: Division by zero");
        }
        const multiplier: bigint = BigInt(10) ** BigInt(decimals);
        return (a * multiplier) / b;
    }

    /**
     * Vergleicht zwei Werte auf Gleichheit.
     */
    public static equals(a: FixedPointValue, b: FixedPointValue): boolean {
        return a === b;
    }

    /**
     * Gibt den Absolutwert zurück.
     */
    public static abs(value: FixedPointValue): FixedPointValue {
        return value < 0n ? -value : value;
    }
}