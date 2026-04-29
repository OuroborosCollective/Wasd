export class FixedPoint {
    private static readonly FRACTIONAL_DIGITS = 12n;
    private static readonly SCALE = 10n ** FixedPoint.FRACTIONAL_DIGITS;

    public readonly value: bigint;

    private constructor(value: bigint) {
        this.value = value;
    }

    public static fromRaw(value: bigint): FixedPoint {
        return new FixedPoint(value);
    }

    public static fromNumber(value: number): FixedPoint {
        return new FixedPoint(BigInt(Math.round(value * Number(FixedPoint.SCALE))));
    }

    public static fromString(value: string): FixedPoint {
        const parts = value.split('.');
        if (parts.length === 1) {
            return new FixedPoint(BigInt(parts[0]) * FixedPoint.SCALE);
        }
        const integerPart = BigInt(parts[0]);
        let fractionalPartStr = parts[1].substring(0, Number(FixedPoint.FRACTIONAL_DIGITS));
        const paddingNeeded = Number(FixedPoint.FRACTIONAL_DIGITS) - fractionalPartStr.length;
        if (paddingNeeded > 0) {
            fractionalPartStr = fractionalPartStr.padEnd(Number(FixedPoint.FRACTIONAL_DIGITS), '0');
        }
        const fractionalPart = BigInt(fractionalPartStr);
        const sign = integerPart < 0n || parts[0].startsWith('-') ? -1n : 1n;
        return new FixedPoint(integerPart * FixedPoint.SCALE + (sign * fractionalPart));
    }

    public static readonly ZERO = new FixedPoint(0n);
    public static readonly ONE = new FixedPoint(FixedPoint.SCALE);

    public add(other: FixedPoint): FixedPoint {
        return new FixedPoint(this.value + other.value);
    }

    public sub(other: FixedPoint): FixedPoint {
        return new FixedPoint(this.value - other.value);
    }

    public mul(other: FixedPoint): FixedPoint {
        return new FixedPoint((this.value * other.value) / FixedPoint.SCALE);
    }

    public div(other: FixedPoint): FixedPoint {
        if (other.value === 0n) throw new Error("DivisionByZero");
        return new FixedPoint((this.value * FixedPoint.SCALE) / other.value);
    }

    public toNumber(): number {
        return Number(this.value) / Number(FixedPoint.SCALE);
    }

    public toString(): string {
        const s = this.value.toString();
        const isNegative = this.value < 0n;
        const absS = isNegative ? s.substring(1) : s;
        const padded = absS.padStart(Number(FixedPoint.FRACTIONAL_DIGITS) + 1, '0');
        const splitAt = padded.length - Number(FixedPoint.FRACTIONAL_DIGITS);
        const result = padded.substring(0, splitAt) + '.' + padded.substring(splitAt);
        const trimmed = result.replace(/\.?0+$/, "");
        const final = trimmed.endsWith('.') ? trimmed.substring(0, trimmed.length - 1) : trimmed;
        return (isNegative ? '-' : '') + (final === "" ? "0" : final);
    }

    public equals(other: FixedPoint): boolean {
        return this.value === other.value;
    }

    public gt(other: FixedPoint): boolean {
        return this.value > other.value;
    }

    public gte(other: FixedPoint): boolean {
        return this.value >= other.value;
    }

    public lt(other: FixedPoint): boolean {
        return this.value < other.value;
    }

    public lte(other: FixedPoint): boolean {
        return this.value <= other.value;
    }

    public abs(): FixedPoint {
        return this.value < 0n ? new FixedPoint(-this.value) : this;
    }

    public static max(a: FixedPoint, b: FixedPoint): FixedPoint {
        return a.value > b.value ? a : b;
    }

    public static min(a: FixedPoint, b: FixedPoint): FixedPoint {
        return a.value < b.value ? a : b;
    }
}

export class FixedPointVector2 {
    constructor(public x: FixedPoint, public y: FixedPoint) {}

    public add(other: FixedPointVector2): FixedPointVector2 {
        return new FixedPointVector2(this.x.add(other.x), this.y.add(other.y));
    }

    public sub(other: FixedPointVector2): FixedPointVector2 {
        return new FixedPointVector2(this.x.sub(other.x), this.y.y.sub(other.y));
    }

    public mul(scalar: FixedPoint): FixedPointVector2 {
        return new FixedPointVector2(this.x.mul(scalar), this.y.mul(scalar));
    }

    public dot(other: FixedPointVector2): FixedPoint {
        return this.x.mul(other.x).add(this.y.mul(other.y));
    }
}