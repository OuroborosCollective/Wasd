/**
 * Ouroboros MonsterDirector — Server-Authoritative AI State Machine
 * 
 * ARCHITECTURE (Stateless Determinism):
 * - All AI logic runs server-side in 10-Hz WorldHeartbeat
 * - Client receives rendered result only — zero client-side AI
 * - State Machine: IDLE → WANDER → PURSUE → ATTACK → DEAD
 * 
 * HABITAT-KAPPA-DISTANCE (KAPPA Math):
 * - Monsters spawn at a seed position (spawnSeed)
 * - Maximum distance from spawn = habitatRadius (in Kappa-Meters)
 * - Aggro triggers when player enters detectionRadius
 * - Prevents rubber-banding: NPC snaps back to habitat if player retreats
 * 
 * SECURITY (Exploit Prevention):
 * - Aggro state is server-determined — client cannot force aggro
 * - Kappa-distance enforced on every tick — no teleporting out of range
 * - Despawn timer prevents infinite corpse farming
 */

import { KappaPosGrid } from "@wasd/shared";
import { createARESeed, SeededARERng, type ARERng } from "../../core/determinism/AREDeterminism.js";

// ─── Types ────────────────────────────────────────────────────────────────────

export enum MonsterState {
  IDLE = "IDLE",
  WANDER = "WANDER",
  PURSUE = "PURSUE",
  ATTACK = "ATTACK",
  DEAD = "DEAD",
}

export interface KappaCoord {
  x: number; // Kappa-int (1 unit = 1 meter)
  y: number;
  z: number;
}

export interface MonsterEntity {
  id: string;
  name: string;
  position: KappaCoord;
  rotation: number;
  health: number;
  maxHealth: number;
  
  // Habitat configuration
  spawnSeed: KappaCoord;     // Original spawn center
  habitatRadius: number;    // Max distance from spawn (kappa meters)
  
  // AI state
  state: MonsterState;
  stateTimer: number;       // Ticks in current state
  targetId: string | null;  // Player/NPC being chased
  
  // Perception parameters
  detectionRadius: number;  // Aggro range (kappa-meters)
  attackRange: number;      // Combat range (kappa-meters)
  wanderSpeed: number;      // Tiles per tick when wandering
  
  // Combat stats
  damage: number;
  attackSpeed: number;      // Attacks per second
  stamina: number;
  maxStamina: number;
  
  // Drop table seed
  dropTableSeed: number;
  
  // Passive skills
  skills?: {
    combat?: { level: number };
    heavy_armor?: { level: number };
    evasion?: { level: number };
    sword_mastery?: { level: number };
    blunt_force?: { level: number };
    archery?: { level: number };
  };
}

// ─── MonsterDirector ───────────────────────────────────────────────────────────

export class MonsterDirector {
  private monsters: Map<string, MonsterEntity> = new Map();
  private worldTick = 0;
  
  // Kappa-distance constants
  private readonly DEFAULT_HABITAT_RADIUS = 8000;  // 8 kappa-meters from spawn
  private readonly DEFAULT_DETECTION_RADIUS = 4000;  // 4 kappa-meters aggro range
  private readonly DEFAULT_ATTACK_RANGE = 1500;      // 1.5 kappa-meters (melee)
  private readonly WANDER_SPEED = 50;               // 0.05 kappa-meters per tick
  
  // Despawn timer for dead monsters
  private readonly DESPAWN_TICKS = 300;             // 30 seconds at 10Hz
  
  constructor() {}
  
  /**
   * Sync world tick for deterministic behavior.
   * Called from WorldTick.tick() each heartbeat.
   */
  public setTick(tick: number): void {
    this.worldTick = tick;
  }
  
  /**
   * Register a new monster entity.
   */
  public addMonster(monster: MonsterEntity): void {
    // Initialize spawn seed if not set
    monster.spawnSeed ??= { ...monster.position };
    monster.habitatRadius ??= this.DEFAULT_HABITAT_RADIUS;
    monster.detectionRadius ??= this.DEFAULT_DETECTION_RADIUS;
    monster.attackRange ??= this.DEFAULT_ATTACK_RANGE;
    monster.state ??= MonsterState.IDLE;
    monster.stateTimer ??= 0;
    monster.dropTableSeed ??= this.hashEntityId(monster.id);
    
    this.monsters.set(monster.id, monster);
  }
  
  /**
   * Remove a monster (GM command or cleanup).
   */
  public removeMonster(id: string): boolean {
    return this.monsters.delete(id);
  }
  
  /**
   * Get all active monsters.
   */
  public getAllMonsters(): MonsterEntity[] {
    return Array.from(this.monsters.values());
  }
  
  /**
   * Main AI tick — called every 100ms from WorldTick.
   * Iterates all monsters and processes their state machine.
   */
  public tick(onlinePlayers: { id: string; position: KappaCoord; stealthLevel?: number }[]): MonsterTickResult[] {
    const results: MonsterTickResult[] = [];
    
    for (const monster of this.monsters.values()) {
      // Skip dead monsters (they're despawning)
      if (monster.state === MonsterState.DEAD) {
        monster.stateTimer++;
        if (monster.stateTimer >= this.DESPAWN_TICKS) {
          this.monsters.delete(monster.id);
          results.push({ type: "despawn", monsterId: monster.id });
        }
        continue;
      }
      
      // Find nearest detectable player
      const nearestPlayer = this.findNearestPlayer(monster, onlinePlayers);
      
      // State machine transition
      const previousState = monster.state;
      this.transitionState(monster, nearestPlayer);
      
      // Execute current state behavior
      const tickResult = this.executeState(monster, nearestPlayer);
      
      if (tickResult) {
        results.push(tickResult);
      }
      
      // Increment state timer
      monster.stateTimer++;
    }
    
    return results;
  }
  
  /**
   * Get monster by ID.
   */
  public getMonster(id: string): MonsterEntity | undefined {
    return this.monsters.get(id);
  }
  
  /**
   * Force a monster to take damage.
   * Returns true if monster died.
   */
  public applyDamage(monsterId: string, damage: number): { health: number; died: boolean } {
    const monster = this.monsters.get(monsterId);
    if (!monster) return { health: 0, died: false };
    
    monster.health = Math.max(0, monster.health - damage);
    const died = monster.health <= 0;
    
    if (died) {
      monster.state = MonsterState.DEAD;
      monster.stateTimer = 0;
    }
    
    return { health: monster.health, died };
  }
  
  /**
   * Check if monster is alive.
   */
  public isAlive(monsterId: string): boolean {
    const monster = this.monsters.get(monsterId);
    return monster !== undefined && monster.state !== MonsterState.DEAD;
  }
  
  // ─── Private Methods ─────────────────────────────────────────────────────────
  
  /**
   * Find nearest detectable player within aggro radius.
   * Uses stealth check for hidden players.
   */
  private findNearestPlayer(
    monster: MonsterEntity,
    players: { id: string; position: KappaCoord; stealthLevel?: number }[]
  ): { id: string; position: KappaCoord } | null {
    let nearest: { id: string; position: KappaCoord; distance: number } | null = null;
    
    for (const player of players) {
      const distance = this.kappaDistance(monster.position, player.position);
      
      // Skip if out of detection range
      if (distance > monster.detectionRadius) continue;
      
      // Stealth check: high stealth = harder to detect
      const stealthPenalty = (player.stealthLevel ?? 0) * 500;
      const effectiveRange = monster.detectionRadius - stealthPenalty;
      
      if (distance > effectiveRange) continue;
      
      // Update nearest if closer
      if (!nearest || distance < nearest.distance) {
        nearest = { id: player.id, position: player.position, distance };
      }
    }
    
    return nearest ? { id: nearest.id, position: nearest.position } : null;
  }
  
  /**
   * Calculate KAPPA-distance between two positions.
   * Uses Euclidean distance in Kappa-coordinates (1 unit = 1 meter).
   */
  private kappaDistance(a: KappaCoord, b: KappaCoord): number {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    const dz = (a.z ?? 0) - (b.z ?? 0);
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }
  
  /**
   * State machine transition logic.
   */
  private transitionState(
    monster: MonsterEntity,
    nearestPlayer: { id: string; position: KappaCoord } | null
  ): void {
    const previousState = monster.state;
    
    switch (monster.state) {
      case MonsterState.IDLE:
        // Transition to PURSUE if player in range
        if (nearestPlayer) {
          monster.state = MonsterState.PURSUE;
          monster.targetId = nearestPlayer.id;
          monster.stateTimer = 0;
        } else {
          // Random chance to start wandering
          const rng = this.createMonsterRng(monster, "idle");
          if (rng.nextFloat() < 0.01) { // 1% chance per tick
            monster.state = MonsterState.WANDER;
            monster.stateTimer = 0;
          }
        }
        break;
        
      case MonsterState.WANDER:
        // Transition to PURSUE if player detected
        if (nearestPlayer) {
          monster.state = MonsterState.PURSUE;
          monster.targetId = nearestPlayer.id;
          monster.stateTimer = 0;
        } else if (monster.stateTimer > 600) { // Wander for ~60 seconds
          monster.state = MonsterState.IDLE;
          monster.stateTimer = 0;
        }
        break;
        
      case MonsterState.PURSUE:
        if (!nearestPlayer) {
          // Lost target — return to idle
          monster.state = MonsterState.IDLE;
          monster.targetId = null;
          monster.stateTimer = 0;
        } else {
          const distance = this.kappaDistance(monster.position, nearestPlayer.position);
          if (distance <= monster.attackRange) {
            // In attack range — transition to ATTACK
            monster.state = MonsterState.ATTACK;
            monster.stateTimer = 0;
          }
        }
        break;
        
      case MonsterState.ATTACK:
        if (!nearestPlayer) {
          monster.state = MonsterState.IDLE;
          monster.targetId = null;
          monster.stateTimer = 0;
        } else {
          const distance = this.kappaDistance(monster.position, nearestPlayer.position);
          if (distance > monster.attackRange) {
            // Target moved out of range — pursue again
            monster.state = MonsterState.PURSUE;
            monster.stateTimer = 0;
          }
        }
        break;
    }
  }
  
  /**
   * Execute behavior for current state.
   */
  private executeState(
    monster: MonsterEntity,
    nearestPlayer: { id: string; position: KappaCoord } | null
  ): MonsterTickResult | null {
    switch (monster.state) {
      case MonsterState.IDLE:
        // Idle: regenerate stamina slowly
        monster.stamina = Math.min(monster.maxStamina, monster.stamina + 1);
        return null;
        
      case MonsterState.WANDER:
        // Move randomly within habitat
        const wanderDir = this.createWanderDirection(monster);
        const newPos = this.applyMovement(monster.position, wanderDir, monster.wanderSpeed ?? this.WANDER_SPEED);
        
        // Check habitat boundary — snap back if exceeded
        if (this.isOutOfHabitat(newPos, monster.spawnSeed, monster.habitatRadius)) {
          // Return to spawn
          monster.position = { ...monster.spawnSeed };
        } else {
          monster.position = newPos;
        }
        
        // Face movement direction
        monster.rotation = Math.atan2(wanderDir.y, wanderDir.x);
        return { type: "move", monsterId: monster.id, position: monster.position };
        
      case MonsterState.PURSUE:
        if (nearestPlayer) {
          // Move toward target
          const direction = this.normalizeDirection(monster.position, nearestPlayer.position);
          const pursueSpeed = (monster.wanderSpeed ?? this.WANDER_SPEED) * 1.5; // Faster than wander
          const newPos = this.applyMovement(monster.position, direction, pursueSpeed);
          
          // Check habitat — don't pursue outside
          if (!this.isOutOfHabitat(newPos, monster.spawnSeed, monster.habitatRadius)) {
            monster.position = newPos;
          }
          
          // Face target
          monster.rotation = Math.atan2(direction.y, direction.x);
          return { type: "move", monsterId: monster.id, position: monster.position };
        }
        return null;
        
      case MonsterState.ATTACK:
        // ATTACK state handled by CombatDirector
        // Just ensure we're facing the target
        if (nearestPlayer) {
          const direction = this.normalizeDirection(monster.position, nearestPlayer.position);
          monster.rotation = Math.atan2(direction.y, direction.x);
        }
        return null;
        
      default:
        return null;
    }
  }
  
  /**
   * Check if position exceeds habitat radius from spawn seed.
   */
  private isOutOfHabitat(pos: KappaCoord, spawnSeed: KappaCoord, radius: number): boolean {
    return this.kappaDistance(pos, spawnSeed) > radius;
  }
  
  /**
   * Create deterministic wander direction.
   */
  private createWanderDirection(monster: MonsterEntity): { x: number; y: number } {
    const rng = this.createMonsterRng(monster, `wander:${this.worldTick}`);
    const angle = rng.nextFloat() * Math.PI * 2;
    return {
      x: Math.cos(angle),
      y: Math.sin(angle),
    };
  }
  
  /**
   * Apply movement delta to position.
   */
  private applyMovement(pos: KappaCoord, dir: { x: number; y: number }, speed: number): KappaCoord {
    return {
      x: pos.x + Math.round(dir.x * speed),
      y: pos.y + Math.round(dir.y * speed),
      z: pos.z ?? 0,
    };
  }
  
  /**
   * Normalize direction vector.
   */
  private normalizeDirection(from: KappaCoord, to: KappaCoord): { x: number; y: number } {
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const len = Math.sqrt(dx * dx + dy * dy);
    
    if (len === 0) return { x: 0, y: 0 };
    
    return {
      x: dx / len,
      y: dy / len,
    };
  }
  
  /**
   * Create deterministic RNG for monster behavior.
   */
  private createMonsterRng(monster: MonsterEntity, salt: string): SeededARERng {
    return new SeededARERng(createARESeed([
      "monster",
      monster.id,
      this.worldTick,
      salt,
      monster.dropTableSeed,
    ]));
  }
  
  /**
   * Hash entity ID to number for seeding.
   */
  private hashEntityId(id: string): number {
    let hash = 0;
    for (let i = 0; i < id.length; i++) {
      hash = ((hash << 5) - hash) + id.charCodeAt(i);
      hash = hash & hash;
    }
    return Math.abs(hash);
  }
}

// ─── Result Types ──────────────────────────────────────────────────────────────

export type MonsterTickResult =
  | { type: "move"; monsterId: string; position: KappaCoord }
  | { type: "despawn"; monsterId: string }
  | { type: "death"; monsterId: string; position: KappaCoord; dropTableSeed: number };

// ─── Singleton Export ──────────────────────────────────────────────────────────

export const monsterDirector = new MonsterDirector();