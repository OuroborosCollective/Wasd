export class FixedPoint {
    public static readonly PRECISION: bigint = 18n;
    public static readonly SCALE: bigint = 10n ** FixedPoint.PRECISION;

    public static fromNumber(value: number): bigint {
        return BigInt(Math.round(value * Number(FixedPoint.SCALE)));
    }

    public static fromBigInt(value: bigint | number | string): bigint {
        return BigInt(value) * FixedPoint.SCALE;
    }

    public static toNumber(value: bigint): number {
        return Number(value) / Number(FixedPoint.SCALE);
    }

    public static add(a: bigint, b: bigint): bigint {
        return a + b;
    }

    public static sub(a: bigint, b: bigint): bigint {
        return a - b;
    }

    public static mul(a: bigint, b: bigint): bigint {
        return (a * b) / FixedPoint.SCALE;
    }

    public static div(a: bigint, b: bigint): bigint {
        if (b === 0n) {
            throw new Error("FixedPoint: Division by zero");
        }
        return (a * FixedPoint.SCALE) / b;
    }

    public static toString(value: bigint): string {
        const isNegative = value < 0n;
        const absValue = isNegative ? -value : value;
        const str = absValue.toString().padStart(Number(FixedPoint.PRECISION) + 1, "0");
        const splitAt = str.length - Number(FixedPoint.PRECISION);
        const integerPart = str.substring(0, splitAt);
        const fractionalPart = str.substring(splitAt).replace(/0+$/, "");
        const result = fractionalPart.length > 0 ? `${integerPart}.${fractionalPart}` : integerPart;
        return isNegative ? `-${result}` : result;
    }

    public static parse(value: string): bigint {
        const parts = value.split(".");
        const integerPart = BigInt(parts[0]) * FixedPoint.SCALE;
        if (parts.length === 1) {
            return integerPart;
        }
        
        let fractionalStr = parts[1].substring(0, Number(FixedPoint.PRECISION));
        fractionalStr = fractionalStr.padEnd(Number(FixedPoint.PRECISION), "0");
        const fractionalPart = BigInt(fractionalStr);
        
        return value.startsWith("-") ? integerPart - fractionalPart : integerPart + fractionalPart;
    }
}