export class FixedPoint {
  private static readonly DECIMALS = 6;
  private static readonly SCALING_FACTOR = BigInt(10 ** FixedPoint.DECIMALS);

  private constructor(public readonly value: bigint) {}

  public static fromRaw(value: bigint): FixedPoint {
    return new FixedPoint(value);
  }

  public static fromNumber(value: number): FixedPoint {
    return new FixedPoint(BigInt(Math.round(value * Number(FixedPoint.SCALING_FACTOR))));
  }

  public static fromString(value: string): FixedPoint {
    const [integral, fractional = ""] = value.split(".");
    const paddedFractional = fractional.padEnd(FixedPoint.DECIMALS, "0").slice(0, FixedPoint.DECIMALS);
    return new FixedPoint(BigInt(integral + paddedFractional));
  }

  public toNumber(): number {
    return Number(this.value) / Number(FixedPoint.SCALING_FACTOR);
  }

  public add(other: FixedPoint): FixedPoint {
    return new FixedPoint(this.value + other.value);
  }

  public sub(other: FixedPoint): FixedPoint {
    return new FixedPoint(this.value - other.value);
  }

  public mul(other: FixedPoint): FixedPoint {
    return new FixedPoint((this.value * other.value) / FixedPoint.SCALING_FACTOR);
  }

  public div(other: FixedPoint): FixedPoint {
    if (other.value === 0n) throw new Error("Division by zero");
    return new FixedPoint((this.value * FixedPoint.SCALING_FACTOR) / other.value);
  }

  public abs(): FixedPoint {
    return new FixedPoint(this.value < 0n ? -this.value : this.value);
  }

  public compareTo(other: FixedPoint): number {
    if (this.value > other.value) return 1;
    if (this.value < other.value) return -1;
    return 0;
  }

  public toString(): string {
    const isNegative = this.value < 0n;
    const absoluteValue = isNegative ? -this.value : this.value;
    const s = absoluteValue.toString().padStart(FixedPoint.DECIMALS + 1, "0");
    const pivot = s.length - FixedPoint.DECIMALS;
    const integral = s.slice(0, pivot);
    const fractional = s.slice(pivot);
    return (isNegative ? "-" : "") + integral + "." + fractional;
  }

  public toJSON(): string {
    return this.toString();
  }
}