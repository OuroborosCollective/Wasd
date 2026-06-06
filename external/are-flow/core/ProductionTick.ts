export interface Vector3Float {
  x: number;
  y: number;
  z: number;
}

export interface Vector3Fixed {
  x: number;
  y: number;
  z: number;
}

export interface EntityState {
  logicalIndex: string;

  /**
   * Public/API-Format:
   * normale Weltkoordinaten, z.B. 12.5
   */
  position: Vector3Float;
  velocity: Vector3Float;
  acceleration: Vector3Float;
  previousAcceleration: Vector3Float;

  /**
   * Deterministische Signatur.
   * Kein echter Abstand.
   */
  kappaPos: number;

  /**
   * Jerk-Stärke ohne sqrt.
   * Je höher, desto abrupter ändert sich die Bewegung.
   */
  resonance: number;
}

interface InternalEntityFixed {
  logicalIndex: string;
  position: Vector3Fixed;
  velocity: Vector3Fixed;
  acceleration: Vector3Fixed;
  previousAcceleration: Vector3Fixed;
  kappaPos: number;
  resonance: number;
}

export class HardProductionTick {
  /**
   * 10 Hz = alle 100 ms ein Tick.
   */
  public static readonly TICK_INTERVAL_MS = 100;

  /**
   * Fixed-Point-Skalierung.
   *
   * 1_000_000 bedeutet:
   * 1.0 Welt-Einheit = 1_000_000 interne Einheiten.
   */
  public static readonly SCALE = 1_000_000;

  /**
   * dt = 0.1 Sekunden.
   *
   * Als Fixed-Point:
   * 0.1 * 1_000_000 = 100_000
   */
  private static readonly DT_FIXED =
    HardProductionTick.SCALE / 10;

  /**
   * 0.5 * dt²
   *
   * dt = 0.1
   * dt² = 0.01
   * 0.5 * dt² = 0.005
   *
   * Als Fixed-Point:
   * 0.005 * 1_000_000 = 5_000
   */
  private static readonly HALF_DT_SQUARED_FIXED = 5_000;

  private static readonly MAX_ABS_FIXED =
    1_000_000_000 * HardProductionTick.SCALE;

  public processEntities(entities: readonly EntityState[]): EntityState[] {
    /**
     * Erst sortieren.
     * Wichtig: Die Simulationsreihenfolge darf niemals von Array-Zufall,
     * Datenbank-Reihenfolge oder Netzwerk-Reihenfolge abhängen.
     */
    const ordered = [...entities].sort((a, b) =>
      a.logicalIndex.localeCompare(b.logicalIndex)
    );

    const result: EntityState[] = [];

    for (const entity of ordered) {
      const fixed = this.toFixedEntity(entity);
      const updated = this.processFixedEntity(fixed);
      result.push(this.toFloatEntity(updated));
    }

    return result;
  }

  private processFixedEntity(entity: InternalEntityFixed): InternalEntityFixed {
    /**
     * Velocity-Integration:
     *
     * vNext = v + a * dt
     *
     * Weil a und dt beide Fixed-Point sind:
     * a * dt / SCALE
     */
    const nextVelocity: Vector3Fixed = {
      x: this.safeAdd(
        entity.velocity.x,
        this.fixedMul(entity.acceleration.x, HardProductionTick.DT_FIXED)
      ),
      y: this.safeAdd(
        entity.velocity.y,
        this.fixedMul(entity.acceleration.y, HardProductionTick.DT_FIXED)
      ),
      z: this.safeAdd(
        entity.velocity.z,
        this.fixedMul(entity.acceleration.z, HardProductionTick.DT_FIXED)
      ),
    };

    /**
     * Position-Integration:
     *
     * pNext = p + v * dt + 0.5 * a * dt²
     */
    const nextPosition: Vector3Fixed = {
      x: this.safeAdd(
        entity.position.x,
        this.safeAdd(
          this.fixedMul(entity.velocity.x, HardProductionTick.DT_FIXED),
          this.fixedMul(
            entity.acceleration.x,
            HardProductionTick.HALF_DT_SQUARED_FIXED
          )
        )
      ),
      y: this.safeAdd(
        entity.position.y,
        this.safeAdd(
          this.fixedMul(entity.velocity.y, HardProductionTick.DT_FIXED),
          this.fixedMul(
            entity.acceleration.y,
            HardProductionTick.HALF_DT_SQUARED_FIXED
          )
        )
      ),
      z: this.safeAdd(
        entity.position.z,
        this.safeAdd(
          this.fixedMul(entity.velocity.z, HardProductionTick.DT_FIXED),
          this.fixedMul(
            entity.acceleration.z,
            HardProductionTick.HALF_DT_SQUARED_FIXED
          )
        )
      ),
    };

    /**
     * Jerk:
     *
     * jerk = Änderung der Beschleunigung / dt
     *
     * Also:
     * jerk = (a - previousA) / 0.1
     *
     * Teilen durch 0.1 ist mal 10.
     */
    const jerk: Vector3Fixed = {
      x: this.safeMul(
        entity.acceleration.x - entity.previousAcceleration.x,
        10
      ),
      y: this.safeMul(
        entity.acceleration.y - entity.previousAcceleration.y,
        10
      ),
      z: this.safeMul(
        entity.acceleration.z - entity.previousAcceleration.z,
        10
      ),
    };

    /**
     * Resonance:
     *
     * Keine Wurzel.
     * Keine Distanz.
     * Nur Stärke².
     *
     * resonance = jerk.x² + jerk.y² + jerk.z²
     */
    const resonance = this.safeAdd(
      this.safeAdd(
        this.fixedMul(jerk.x, jerk.x),
        this.fixedMul(jerk.y, jerk.y)
      ),
      this.fixedMul(jerk.z, jerk.z)
    );

    const kappaPos = this.calculateKappaSignature(
      entity.logicalIndex,
      nextPosition,
      nextVelocity,
      resonance
    );

    return {
      ...entity,
      position: nextPosition,
      velocity: nextVelocity,
      previousAcceleration: entity.acceleration,
      kappaPos,
      resonance,
    };
  }

  /**
   * Kappa ist hier keine echte Position.
   *
   * Kappa ist eine deterministische Signatur:
   * Gleicher Input => gleicher Output.
   * Anderer Zustand => andere Signatur.
   */
  private calculateKappaSignature(
    logicalIndex: string,
    position: Vector3Fixed,
    velocity: Vector3Fixed,
    resonance: number
  ): number {
    let hash = 2166136261;

    hash = this.hashString(hash, logicalIndex);

    hash = this.hashNumber(hash, position.x);
    hash = this.hashNumber(hash, position.y);
    hash = this.hashNumber(hash, position.z);

    hash = this.hashNumber(hash, velocity.x);
    hash = this.hashNumber(hash, velocity.y);
    hash = this.hashNumber(hash, velocity.z);

    hash = this.hashNumber(hash, resonance);

    return hash >>> 0;
  }

  private hashString(seed: number, value: string): number {
    let hash = seed >>> 0;

    for (let i = 0; i < value.length; i++) {
      hash ^= value.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }

    return hash >>> 0;
  }

  private hashNumber(seed: number, value: number): number {
    let hash = seed >>> 0;

    hash ^= value | 0;
    hash = Math.imul(hash, 16777619);

    hash ^= (value / 0x100000000) | 0;
    hash = Math.imul(hash, 16777619);

    return hash >>> 0;
  }

  private toFixedEntity(entity: EntityState): InternalEntityFixed {
    return {
      logicalIndex: entity.logicalIndex,
      position: this.toFixedVector(entity.position),
      velocity: this.toFixedVector(entity.velocity),
      acceleration: this.toFixedVector(entity.acceleration),
      previousAcceleration: this.toFixedVector(entity.previousAcceleration),
      kappaPos: entity.kappaPos >>> 0,
      resonance: this.toFixedNumber(entity.resonance),
    };
  }

  private toFloatEntity(entity: InternalEntityFixed): EntityState {
    return {
      logicalIndex: entity.logicalIndex,
      position: this.toFloatVector(entity.position),
      velocity: this.toFloatVector(entity.velocity),
      acceleration: this.toFloatVector(entity.acceleration),
      previousAcceleration: this.toFloatVector(entity.previousAcceleration),
      kappaPos: entity.kappaPos >>> 0,
      resonance: entity.resonance / HardProductionTick.SCALE,
    };
  }

  private toFixedVector(vector: Vector3Float): Vector3Fixed {
    return {
      x: this.toFixedNumber(vector.x),
      y: this.toFixedNumber(vector.y),
      z: this.toFixedNumber(vector.z),
    };
  }

  private toFloatVector(vector: Vector3Fixed): Vector3Float {
    return {
      x: vector.x / HardProductionTick.SCALE,
      y: vector.y / HardProductionTick.SCALE,
      z: vector.z / HardProductionTick.SCALE,
    };
  }

  private toFixedNumber(value: number): number {
    if (!Number.isFinite(value)) {
      return 0;
    }

    return this.clamp(
      Math.round(value * HardProductionTick.SCALE),
      -HardProductionTick.MAX_ABS_FIXED,
      HardProductionTick.MAX_ABS_FIXED
    );
  }

  /**
   * Fixed-Point Multiplikation:
   *
   * Beispiel:
   * 2.0 * 3.0
   *
   * Intern:
   * 2_000_000 * 3_000_000 = 6_000_000_000_000
   *
   * Danach durch SCALE:
   * 6_000_000_000_000 / 1_000_000 = 6_000_000
   *
   * Also wieder 6.0 im Fixed-Format.
   */
  private fixedMul(a: number, b: number): number {
    return this.clamp(
      Math.trunc((a * b) / HardProductionTick.SCALE),
      -HardProductionTick.MAX_ABS_FIXED,
      HardProductionTick.MAX_ABS_FIXED
    );
  }

  private safeAdd(a: number, b: number): number {
    return this.clamp(
      a + b,
      -HardProductionTick.MAX_ABS_FIXED,
      HardProductionTick.MAX_ABS_FIXED
    );
  }

  private safeMul(a: number, b: number): number {
    return this.clamp(
      a * b,
      -HardProductionTick.MAX_ABS_FIXED,
      HardProductionTick.MAX_ABS_FIXED
    );
  }

  private clamp(value: number, min: number, max: number): number {
    if (!Number.isFinite(value)) {
      return 0;
    }

    if (value < min) {
      return min;
    }

    if (value > max) {
      return max;
    }

    return value;
  }
    }
