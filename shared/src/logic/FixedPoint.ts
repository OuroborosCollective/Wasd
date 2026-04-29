export interface IFixedPoint {
    readonly value: bigint;
    readonly decimals: number;
}

export class FixedPoint implements IFixedPoint {
    public readonly value: bigint;
    public readonly decimals: number;

    constructor(value: bigint, decimals: number) {
        this.value = value;
        this.decimals = decimals;
    }

    public static fromNumber(val: number, decimals: number = 2): FixedPoint {
        const multiplier = BigInt(Math.pow(10, decimals));
        const value = BigInt(Math.round(val * Number(multiplier)));
        return new FixedPoint(value, decimals);
    }

    public static fromBigInt(value: bigint, decimals: number = 2): FixedPoint {
        return new FixedPoint(value, decimals);
    }

    public static fromString(val: string, decimals: number = 2): FixedPoint {
        const parts = val.split('.');
        const multiplier = BigInt(Math.pow(10, decimals));
        let value = BigInt(parts[0]) * multiplier;
        
        if (parts.length > 1) {
            let fracStr = parts[1].substring(0, decimals);
            fracStr = fracStr.padEnd(decimals, '0');
            const fracValue = BigInt(fracStr);
            if (value >= 0n) {
                value += fracValue;
            } else {
                value -= fracValue;
            }
        }
        return new FixedPoint(value, decimals);
    }

    public add(other: IFixedPoint): FixedPoint {
        const scaledOther = this.rescale(other.value, other.decimals, this.decimals);
        return new FixedPoint(this.value + scaledOther, this.decimals);
    }

    public subtract(other: IFixedPoint): FixedPoint {
        const scaledOther = this.rescale(other.value, other.decimals, this.decimals);
        return new FixedPoint(this.value - scaledOther, this.decimals);
    }

    public multiply(other: IFixedPoint): FixedPoint {
        const multiplier = BigInt(Math.pow(10, other.decimals));
        const newValue = (this.value * other.value) / multiplier;
        return new FixedPoint(newValue, this.decimals);
    }

    public divide(other: IFixedPoint): FixedPoint {
        if (other.value === 0n) throw new Error("Division by zero");
        const multiplier = BigInt(Math.pow(10, other.decimals));
        const newValue = (this.value * multiplier) / other.value;
        return new FixedPoint(newValue, this.decimals);
    }

    public equals(other: IFixedPoint): boolean {
        return this.value === this.rescale(other.value, other.decimals, this.decimals);
    }

    public greaterThan(other: IFixedPoint): boolean {
        return this.value > this.rescale(other.value, other.decimals, this.decimals);
    }

    public lessThan(other: IFixedPoint): boolean {
        return this.value < this.rescale(other.value, other.decimals, this.decimals);
    }

    public toNumber(): number {
        const divisor = Math.pow(10, this.decimals);
        return Number(this.value) / divisor;
    }

    public toString(): string {
        const s = this.value.toString();
        if (this.decimals === 0) return s;

        const isNegative = this.value < 0n;
        const absoluteS = isNegative ? s.substring(1) : s;
        const padded = absoluteS.padStart(this.decimals + 1, '0');
        
        const splitIndex = padded.length - this.decimals;
        const integerPart = padded.substring(0, splitIndex);
        const fractionalPart = padded.substring(splitIndex);
        
        return (isNegative ? '-' : '') + integerPart + "." + fractionalPart;
    }

    private rescale(value: bigint, fromDecimals: number, toDecimals: number): bigint {
        if (fromDecimals === toDecimals) return value;
        const diff = toDecimals - fromDecimals;
        if (diff > 0) {
            return value * BigInt(Math.pow(10, diff));
        } else {
            return value / BigInt(Math.pow(10, Math.abs(diff)));
        }
    }

    public toJSON(): string {
        return this.toString();
    }
}