export class KappaMath {
  public static readonly KAPPA = 1000n;
  private static readonly KAPPA_N = 1000n;

  /**
   * INTERACT_DISTANCE_KAPPA: Defines the standard interaction reach.
   * Default: 4.0 units (4000n in Kappa Fixed-Point).
   */
  public static readonly INTERACT_DISTANCE_KAPPA = 4000n;

  /**
   * Converts a float value to a Kappa fixed-point BigInt.
   */
  static toFixed(val: number): bigint {
    return BigInt(Math.round(val * Number(this.KAPPA_N)));
  }

  /**
   * Converts a Kappa fixed-point BigInt back to a float.
   */
  static fromFixed(val: bigint): number {
    return Number(val) / Number(this.KAPPA_N);
  }

  /**
   * Addition of two fixed-point values.
   */
  static add(a: bigint, b: bigint): bigint {
    return a + b;
  }

  /**
   * Subtraction of two fixed-point values.
   */
  static sub(a: bigint, b: bigint): bigint {
    return a - b;
  }

  /**
   * Multiplication of two fixed-point values.
   */
  static mul(a: bigint, b: bigint): bigint {
    return (a * b) / this.KAPPA_N;
  }

  /**
   * Division of two fixed-point values.
   */
  static div(a: bigint, b: bigint): bigint {
    if (b === 0n) return 0n;
    return (a * this.KAPPA_N) / b;
  }

  /**
   * Deterministic Integer Square Root for BigInt.
   */
  static sqrt(value: bigint): bigint {
    if (value < 0n) return 0n;
    if (value < 2n) return value;
    let x = value / 2n + 1n;
    let y = (x + value / x) / 2n;
    while (y < x) {
      x = y;
      y = (x + value / x) / 2n;
    }
    return x;
  }

  /**
   * Creates a new BigInt64Array representing a 3D vector in fixed-point.
   */
  static createVec3(x = 0, y = 0, z = 0): BigInt64Array {
    const v = new BigInt64Array(3);
    v[0] = this.toFixed(x);
    v[1] = this.toFixed(y);
    v[2] = this.toFixed(z);
    return v;
  }

  /**
   * Vector addition: out = a + b
   */
  static vAdd(a: BigInt64Array, b: BigInt64Array, out: BigInt64Array): void {
    out[0] = a[0] + b[0];
    out[1] = a[1] + b[1];
    out[2] = a[2] + b[2];
  }

  /**
   * Vector subtraction: out = a - b
   */
  static vSub(a: BigInt64Array, b: BigInt64Array, out: BigInt64Array): void {
    out[0] = a[0] - b[0];
    out[1] = a[1] - b[1];
    out[2] = a[2] - b[2];
  }

  /**
   * Scalar multiplication: out = v * scalar(fixed)
   */
  static vMulScalar(v: BigInt64Array, scalar: bigint, out: BigInt64Array): void {
    out[0] = (v[0] * scalar) / this.KAPPA_N;
    out[1] = (v[1] * scalar) / this.KAPPA_N;
    out[2] = (v[2] * scalar) / this.KAPPA_N;
  }

  /**
   * Scalar division: out = v / scalar(fixed)
   */
  static vDivScalar(v: BigInt64Array, scalar: bigint, out: BigInt64Array): void {
    if (scalar === 0n) return;
    out[0] = (v[0] * this.KAPPA_N) / scalar;
    out[1] = (v[1] * this.KAPPA_N) / scalar;
    out[2] = (v[2] * this.KAPPA_N) / scalar;
  }

  /**
   * Dot product of two fixed-point vectors.
   */
  static vDot(a: BigInt64Array, b: BigInt64Array): bigint {
    const x = (a[0] * b[0]) / this.KAPPA_N;
    const y = (a[1] * b[1]) / this.KAPPA_N;
    const z = (a[2] * b[2]) / this.KAPPA_N;
    return x + y + z;
  }

  /**
   * Magnitude of a fixed-point vector.
   */
  static vMag(v: BigInt64Array): bigint {
    const magSq = this.vMagSq(v);
    // To keep it in fixed point: sqrt(dot * KAPPA)
    return this.sqrt(magSq * this.KAPPA_N);
  }

  /**
   * Squared magnitude of a fixed-point vector.
   */
  static vMagSq(v: BigInt64Array): bigint {
    return this.vDot(v, v);
  }

  /**
   * Squared distance between two fixed-point vectors.
   */
  static vDistSq(a: BigInt64Array, b: BigInt64Array): bigint {
    const dx = a[0] - b[0];
    const dy = a[1] - b[1];
    const dz = a[2] - b[2];
    const x = (dx * dx) / this.KAPPA_N;
    const y = (dy * dy) / this.KAPPA_N;
    const z = (dz * dz) / this.KAPPA_N;
    return x + y + z;
  }

  /**
   * Normalizes the vector.
   */
  static vNormalize(v: BigInt64Array, out: BigInt64Array): void {
    const mag = this.vMag(v);
    if (mag === 0n) {
      out[0] = 0n;
      out[1] = 0n;
      out[2] = 0n;
      return;
    }
    this.vDivScalar(v, mag, out);
  }

  /**
   * Linear interpolation between two fixed-point vectors.
   * alpha is a fixed-point value (0 to KAPPA).
   */
  static vLerp(a: BigInt64Array, b: BigInt64Array, alpha: bigint, out: BigInt64Array): void {
    const invAlpha = this.KAPPA_N - alpha;
    out[0] = ((a[0] * invAlpha) / this.KAPPA_N + (b[0] * alpha) / this.KAPPA_N);
    out[1] = ((a[1] * invAlpha) / this.KAPPA_N + (b[1] * alpha) / this.KAPPA_N);
    out[2] = ((a[2] * invAlpha) / this.KAPPA_N + (b[2] * alpha) / this.KAPPA_N);
  }

  /**
   * Copies vector source to target.
   */
  static vCopy(src: BigInt64Array, dest: BigInt64Array): void {
    dest[0] = src[0];
    dest[1] = src[1];
    dest[2] = src[2];
  }

  /**
   * Sets vector components directly (expecting BigInts).
   */
  static vSet(v: BigInt64Array, x: bigint, y: bigint, z: bigint): void {
    v[0] = x;
    v[1] = y;
    v[2] = z;
  }
}