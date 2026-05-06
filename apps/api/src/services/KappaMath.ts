export class KappaMath {
  public static readonly KAPPA = 1000;

  /**
   * Converts a float value to a Kappa fixed-point integer.
   */
  static toFixed(val: number): number {
    return Math.round(val * this.KAPPA) | 0;
  }

  /**
   * Converts a Kappa fixed-point integer back to a float.
   */
  static fromFixed(val: number): number {
    return val / this.KAPPA;
  }

  /**
   * Addition of two fixed-point values.
   */
  static add(a: number, b: number): number {
    return (a + b) | 0;
  }

  /**
   * Subtraction of two fixed-point values.
   */
  static sub(a: number, b: number): number {
    return (a - b) | 0;
  }

  /**
   * Multiplication of two fixed-point values.
   */
  static mul(a: number, b: number): number {
    return Math.trunc((a * b) / this.KAPPA) | 0;
  }

  /**
   * Division of two fixed-point values.
   */
  static div(a: number, b: number): number {
    if (b === 0) return 0;
    return Math.trunc((a * this.KAPPA) / b) | 0;
  }

  /**
   * Creates a new Int32Array representing a 3D vector in fixed-point.
   */
  static createVec3(x = 0, y = 0, z = 0): Int32Array {
    const v = new Int32Array(3);
    v[0] = this.toFixed(x);
    v[1] = this.toFixed(y);
    v[2] = this.toFixed(z);
    return v;
  }

  /**
   * Vector addition: out = a + b
   */
  static vAdd(a: Int32Array, b: Int32Array, out: Int32Array): void {
    out[0] = (a[0] + b[0]) | 0;
    out[1] = (a[1] + b[1]) | 0;
    out[2] = (a[2] + b[2]) | 0;
  }

  /**
   * Vector subtraction: out = a - b
   */
  static vSub(a: Int32Array, b: Int32Array, out: Int32Array): void {
    out[0] = (a[0] - b[0]) | 0;
    out[1] = (a[1] - b[1]) | 0;
    out[2] = (a[2] - b[2]) | 0;
  }

  /**
   * Scalar multiplication: out = v * scalar(fixed)
   */
  static vMulScalar(v: Int32Array, scalar: number, out: Int32Array): void {
    out[0] = this.mul(v[0], scalar);
    out[1] = this.mul(v[1], scalar);
    out[2] = this.mul(v[2], scalar);
  }

  /**
   * Scalar division: out = v / scalar(fixed)
   */
  static vDivScalar(v: Int32Array, scalar: number, out: Int32Array): void {
    if (scalar === 0) return;
    out[0] = this.div(v[0], scalar);
    out[1] = this.div(v[1], scalar);
    out[2] = this.div(v[2], scalar);
  }

  /**
   * Dot product of two fixed-point vectors.
   */
  static vDot(a: Int32Array, b: Int32Array): number {
    const x = this.mul(a[0], b[0]);
    const y = this.mul(a[1], b[1]);
    const z = this.mul(a[2], b[2]);
    return (x + y + z) | 0;
  }

  /**
   * Squared magnitude of a fixed-point vector.
   */
  static vMagSq(v: Int32Array): number {
    return this.vDot(v, v);
  }

  /**
   * Squared distance between two fixed-point vectors.
   */
  static vDistSq(a: Int32Array, b: Int32Array): number {
    const dx = (a[0] - b[0]) | 0;
    const dy = (a[1] - b[1]) | 0;
    const dz = (a[2] - b[2]) | 0;
    const x = this.mul(dx, dx);
    const y = this.mul(dy, dy);
    const z = this.mul(dz, dz);
    return (x + y + z) | 0;
  }

  /**
   * Linear interpolation between two fixed-point vectors.
   * alpha is a fixed-point value (0 to KAPPA).
   */
  static vLerp(a: Int32Array, b: Int32Array, alpha: number, out: Int32Array): void {
    const invAlpha = (this.KAPPA - alpha) | 0;
    out[0] = (this.mul(a[0], invAlpha) + this.mul(b[0], alpha)) | 0;
    out[1] = (this.mul(a[1], invAlpha) + this.mul(b[1], alpha)) | 0;
    out[2] = (this.mul(a[2], invAlpha) + this.mul(b[2], alpha)) | 0;
  }

  /**
   * Copies vector source to target.
   */
  static vCopy(src: Int32Array, dest: Int32Array): void {
    dest[0] = src[0];
    dest[1] = src[1];
    dest[2] = src[2];
  }

  /**
   * Sets vector components directly.
   */
  static vSet(v: Int32Array, x: number, y: number, z: number): void {
    v[0] = x | 0;
    v[1] = y | 0;
    v[2] = z | 0;
  }
}