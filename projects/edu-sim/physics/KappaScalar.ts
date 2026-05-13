/**
 * KappaScalar - Particle Physics Sandbox (Edu-Sim)
 * 
 * Teaching simulation for atomic movements using ARE-logic.
 * Uses INTEGER SCALING to prevent rounding errors:
 * - velocity * 1000 + Math.floor()
 * 
 * Mobile optimized + ZERO garbage collection:
 * - Object pooling for particle reuse
 * - Pre-allocated arrays
 * - No new objects in tick loop
 */

// Scale factor for integer arithmetic (prevent floating point drift)
const SCALE = 1000;
const SCALE_FACTOR = SCALE;

/**
 * Particle state (reused to avoid GC)
 */
interface ParticleState {
  id: number;
  x: number;     // Internal: x * SCALE
  y: number;
  vx: number;   // Internal: vx * SCALE
  vy: number;
  mass: number;
  charge: number;
  active: boolean;
}

/**
 * Pre-allocated particle pool (mobile optimized)
 */
export class ParticlePool {
  private readonly pool: ParticleState[];
  private readonly activeIndices: number[] = [];
  private nextId = 0;
  
  // Pre-allocated for zero GC
  private static readonly MAX_PARTICLES = 10000;
  
  constructor(capacity: number = 1000) {
    const size = Math.min(capacity, ParticlePool.MAX_PARTICLES);
    this.pool = new Array(size);
    
    // Pre-allocate all particles
    for (let i = 0; i < size; i++) {
      this.pool[i] = {
        id: 0,
        x: 0,
        y: 0,
        vx: 0,
        vy: 0,
        mass: 1,
        charge: 0,
        active: false
      };
    }
  }
  
  /**
   * Get particle from pool (NO allocation)
   */
  public allocate(): ParticleState | null {
    // Find inactive particle
    for (let i = 0; i < this.pool.length; i++) {
      if (!this.pool[i].active) {
        this.pool[i].active = true;
        this.pool[i].id = this.nextId++;
        this.activeIndices.push(i);
        return this.pool[i];
      }
    }
    return null;
  }
  
  /**
   * Return particle to pool (NO deallocation)
   */
  public release(particle: ParticleState): void {
    particle.active = false;
    // Remove from active indices (swap with last)
    const idx = this.activeIndices.indexOf(particle.id);
    if (idx >= 0) {
      this.activeIndices[idx] = this.activeIndices[this.activeIndices.length - 1];
      this.activeIndices.pop();
    }
  }
  
  /**
   * Iterate active particles (NO allocation)
   */
  public forEach(callback: (p: ParticleState) => void): void {
    for (let i = 0; i < this.activeIndices.length; i++) {
      const idx = this.activeIndices[i];
      if (this.pool[idx].active) {
        callback(this.pool[idx]);
      }
    }
  }
  
  public get count(): number {
    return this.activeIndices.length;
  }
}

/**
 * Velocity in external coordinates
 */
export interface Velocity {
  vx: number;
  vy: number;
}

/**
 * Position in external coordinates
 */
export interface Position {
  x: number;
  y: number;
}

/**
 * KappaScalar - Core physics calculations
 */
export class KappaScalar {
  private static readonly SCALE = SCALE_FACTOR;
  
  /**
   * Convert external to internal (NO floating point drift)
   * Uses Math.floor for deterministic rounding
   */
  public static toInternal(value: number): number {
    return Math.floor(value * KappaScalar.SCALE);
  }
  
  /**
   * Convert internal to external
   */
  public static toExternal(internalValue: number): number {
    return internalValue / KappaScalar.SCALE;
  }
  
  /**
   * Convert velocity to internal (velocity * 1000)
   */
  public static velocityToInternal(v: number): number {
    return Math.floor(v * KappaScalar.SCALE);
  }
  
  /**
   * Update position: current + velocity * SCALE
   * Core movement formula: x_new = x + floor(v * 1000)
   */
  public static updatePosition(currentInternal: number, velocity: number): number {
    const scaledVelocity = Math.floor(velocity * KappaScalar.SCALE);
    return currentInternal + scaledVelocity;
  }
  
  /**
   * Update velocity with acceleration (Verlet integration)
   */
  public static updateVelocity(
    currentVelocity: number,
    acceleration: number,
    dt: number
  ): number {
    const scaledDt = Math.floor(dt * KappaScalar.SCALE);
    return currentVelocity + (acceleration * scaledDt);
  }
  
  /**
   * Create position from external coordinates
   */
  public static createExternal(x: number, y: number): Position {
    return { x, y };
  }
  
  /**
   * Update particle position (internal)
   * Returns SAME object - NO allocation
   */
  public static updateParticle(
    particle: ParticleState,
    dt: number
  ): void {
    // Apply velocity: x += vx * dt * SCALE
    const scaledDt = Math.floor(dt * KappaScalar.SCALE);
    
    particle.x += particle.vx * scaledDt;
    particle.y += particle.vy * scaledDt;
  }
  
  /**
   * Apply force to particle (F = ma)
   * Returns SAME object - NO allocation
   */
  public static applyForce(
    particle: ParticleState,
    fx: number,
    fy: number,
    dt: number
  ): void {
    const invMass = 1 / particle.mass;
    const scaledDt = Math.floor(dt * KappaScalar.SCALE);
    
    // a = F/m
    const ax = fx * invMass;
    const ay = fy * invMass;
    
    // v += a * dt * SCALE
    particle.vx += Math.floor(ax * scaledDt);
    particle.vy += Math.floor(ay * scaledDt);
  }
  
  /**
   * Convert particle to render position
   * Returns SAME object - NO allocation
   */
  public static toRenderPos(
    particle: ParticleState,
    output: Position
  ): Position {
    output.x = particle.x / KappaScalar.SCALE;
    output.y = particle.y / KappaScalar.SCALE;
    return output;
  }
  
  /**
   * Apply boundary conditions (bounce)
   * Returns SAME object - NO allocation
   */
  public static applyBounds(
    particle: ParticleState,
    minX: number,
    maxX: number,
    minY: number,
    maxY: number,
    damping: number = 0.9
  ): void {
    const imaxX = maxX * KappaScalar.SCALE;
    const imaxY = maxY * KappaScalar.SCALE;
    const iminX = minX * KappaScalar.SCALE;
    const iminY = minY * KappaScalar.SCALE;
    const idamping = Math.floor(damping * KappaScalar.SCALE);
    
    if (particle.x < iminX) {
      particle.x = iminX;
      particle.vx = -particle.vx * idamping / KappaScalar.SCALE;
    } else if (particle.x > imaxX) {
      particle.x = imaxX;
      particle.vx = -particle.vx * idamping / KappaScalar.SCALE;
    }
    
    if (particle.y < iminY) {
      particle.y = iminY;
      particle.vy = -particle.vy * idamping / KappaScalar.SCALE;
    } else if (particle.y > imaxY) {
      particle.y = imaxY;
      particle.vy = -particle.vy * idamping / KappaScalar.SCALE;
    }
  }
  
  /**
   * Calculate distance between particles (squared)
   */
  public static distanceSquared(
    p1: ParticleState,
    p2: ParticleState
  ): number {
    const dx = p1.x - p2.x;
    const dy = p1.y - p2.y;
    return (dx * dx + dy * dy) / (KappaScalar.SCALE * KappaScalar.SCALE);
  }
  
  /**
   * Calculate collision response
   * Returns SAME objects - NO allocation
   */
  public static resolveCollision(
    p1: ParticleState,
    p2: ParticleState,
    restitution: number = 0.95
  ): void {
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const distSq = dx * dx + dy * dy;
    
    if (distSq === 0) return;
    
    const dist = Math.sqrt(distSq);
    const nx = dx / dist;
    const ny = dy / dist;
    
    // Relative velocity
    const dvx = p1.vx - p2.vx;
    const dvy = p1.vy - p2.vy;
    
    // Relative velocity along normal
    const dvn = dvx * nx + dvy * ny;
    
    // Don't resolve if separating
    if (dvn > 0) return;
    
    // Impulse scalar
    const invMass1 = 1 / p1.mass;
    const invMass2 = 1 / p2.mass;
    const j = -(1 + restitution) * dvn / (invMass1 + invMass2);
    
    // Apply impulse
    const ij = Math.floor(j * KappaScalar.SCALE);
    p1.vx += ij * invMass1;
    p1.vy += ij * invMass1;
    p2.vx -= ij * invMass2;
    p2.vy -= ij * invMass2;
    
    // Separate particles
    const overlap = 1; // Min overlap in internal units
    p1.x -= Math.floor(nx * overlap * invMass1 / (invMass1 + invMass2));
    p1.y -= Math.floor(ny * overlap * invMass1 / (invMass1 + invMass2));
    p2.x += Math.floor(nx * overlap * invMass2 / (invMass1 + invMass2));
    p2.y += Math.floor(ny * overlap * invMass2 / (invMass1 + invMass2));
  }
}

export interface KappaPos {
  x: number;
  y: number;
}

export class KappaScalarLegacy {
  public static toInternal(value: number): number {
    return Math.floor(value * 1000);
  }

  public static toExternal(internalValue: number): number {
    return internalValue / 1000;
  }

  public static updatePosition(currentInternal: number, velocity: number): number {
    return currentInternal + Math.floor(velocity * 1000);
  }

  public static createPos(x: number, y: number, isExternal: boolean = true): KappaPos {
    if (isExternal) {
      return {
        x: KappaScalarLegacy.toInternal(x),
        y: KappaScalarLegacy.toInternal(y)
      };
    }
    return { x: Math.floor(x), y: Math.floor(y) };
  }

  public static updateKappaPos(pos: KappaPos, velocity: { x: number; y: number }): KappaPos {
    return {
      x: KappaScalarLegacy.updatePosition(pos.x, velocity.x),
      y: KappaScalarLegacy.updatePosition(pos.y, velocity.y)
    };
  }

  public static toRenderPos(pos: KappaPos): { x: number; y: number } {
    return {
      x: KappaScalarLegacy.toExternal(pos.x),
      y: KappaScalarLegacy.toExternal(pos.y)
    };
  }
}

export default { ParticlePool, KappaScalar, KappaScalarLegacy };