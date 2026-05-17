/**
 * ComboValidator - Server-Side Skill Combo Validation
 * 
 * Validates skill sequences (e.g., Impact Buster after Ember Bolt).
 * Uses logicalIndex for O(1) timing and position verification.
 * 10-Hz tick synchronization with server authority.
 * 
 * Features:
 * - logicalIndex-based O(1) verification
 * - Server-authoritative state
 * - Deterministic validation
 * - Combo break on desync
 * - Position verification
 */

export interface Vector3 {
  x: number;
  y: number;
  z?: number;
}

export interface SkillProperties {
  isProjectile: boolean;
  isAOE: boolean;
  knockback: number;
  element: SkillElement;
}

export enum SkillElement {
  PHYSICAL = 'physical',
  FIRE = 'fire',
  ICE = 'ice',
  LIGHTNING = 'lightning'
}

export interface ComboDefinition {
  skillId: string;
  nextSkills: string[];
  windowMs: number;
  bonusMultiplier: number;
  requirements: ComboRequirements;
}

export interface ComboRequirements {
  minDistance: number;
  maxDistance: number;
  targetLogicalIndex: number;
  requiresBuff?: string;
}

export interface PlayerComboState {
  playerId: string;
  lastSkillId: string;
  lastLogicalIndex: number;
  lastTimestamp: number;
  lastPosition: Vector3;
  comboChain: string[];
}

export interface EntityState {
  entityId: string;
  logicalIndex: number;
  position: Vector3;
  health: number;
  buffStates: Map<string, number>;
}

export interface ComboResult {
  valid: boolean;
  extraDamage: number;
  healAmount: number;
  slowMs: number;
  bonusApplied: boolean;
  errorCode?: ComboErrorCode;
  serverLogicalIndex: number;
  serverTimestamp: number;
}

export enum ComboErrorCode {
  NO_SEQUENCE = 'NO_SEQUENCE',
  OUT_OF_ORDER = 'OUT_OF_ORDER',
  INVALID_TRANSITION = 'INVALID_TRANSITION',
  WINDOW_EXPIRED = 'WINDOW_EXPIRED',
  POSITION_MISMATCH = 'POSITION_MISMATCH',
  LOGICAL_INDEX_MISMATCH = 'LOGICAL_INDEX_MISMATCH',
  TARGET_INVALID = 'TARGET_INVALID',
  BUFF_MISSING = 'BUFF_MISSING',
  COOLDOWN = 'COOLDOWN'
}

const DEFAULT_COMBO_DEFINITIONS: Map<string, ComboDefinition> = new Map([
  ['ember_bolt', {
    skillId: 'ember_bolt',
    nextSkills: ['impact_buster', 'fire_nova'],
    windowMs: 800,
    bonusMultiplier: 1.5,
    requirements: { minDistance: 0, maxDistance: 15, targetLogicalIndex: 0 }
  }],
  ['impact_buster', {
    skillId: 'impact_buster',
    nextSkills: ['shatter_strike'],
    windowMs: 600,
    bonusMultiplier: 1.8,
    requirements: { minDistance: 0, maxDistance: 8, targetLogicalIndex: 0 }
  }],
  ['fire_nova', {
    skillId: 'fire_nova',
    nextSkills: ['ember_bolt'],
    windowMs: 1000,
    bonusMultiplier: 1.4,
    requirements: { minDistance: 0, maxDistance: 20, targetLogicalIndex: 0 }
  }],
  ['shatter_strike', {
    skillId: 'shatter_strike',
    nextSkills: [],
    windowMs: 0,
    bonusMultiplier: 2.0,
    requirements: { minDistance: 0, maxDistance: 5, targetLogicalIndex: 0 }
  }]
]);

export const TICK_RATE_MS = 100;

export class ComboValidator {
  private comboDefinitions: Map<string, ComboDefinition>;
  private playerStates: Map<string, PlayerComboState>;
  private cooldowns: Map<string, number>;
  private tickCount: number = 0;

  constructor(definitions?: Map<string, ComboDefinition>) {
    this.comboDefinitions = definitions || DEFAULT_COMBO_DEFINITIONS;
    this.playerStates = new Map();
    this.cooldowns = new Map();
  }

  public getCurrentTick(): number {
    return this.tickCount;
  }

  public advanceTick(): void {
    this.tickCount++;
  }

  public getServerTimestamp(): number {
    return this.tickCount * TICK_RATE_MS;
  }

  public calculateDistance(a: Vector3, b: Vector3): number {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    const dz = (b.z !== undefined && a.z !== undefined) ? a.z - a.z : 0;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }

  public validateSkillSequence(
    playerId: string,
    skillId: string,
    clientLogicalIndex: number,
    position: Vector3,
    targetEntityId?: string,
    targetLogicalIndex?: number,
    targetPosition?: Vector3,
    currentBuffStates: Map<string, number> = new Map()
  ): ComboResult {
    const serverTime = this.getServerTimestamp();
    const currentState = this.playerStates.get(playerId);
    const definition = this.comboDefinitions.get(skillId);
    
    if (clientLogicalIndex === 0) {
      this.playerStates.set(playerId, {
        playerId,
        lastSkillId: skillId,
        lastLogicalIndex: 0,
        lastTimestamp: serverTime,
        lastPosition: position,
        comboChain: [skillId]
      });
      
      return {
        valid: true,
        extraDamage: 0,
        healAmount: 0,
        slowMs: 0,
        bonusApplied: false,
        serverLogicalIndex: 0,
        serverTimestamp: serverTime
      };
    }
    
    const cooldownKey = `${playerId}_${skillId}`;
    const lastCooldown = this.cooldowns.get(cooldownKey) || 0;
    if (definition && serverTime - lastCooldown < definition.skillId.length * 100) {
      return {
        valid: false,
        extraDamage: 0,
        healAmount: 0,
        slowMs: 0,
        bonusApplied: false,
        errorCode: ComboErrorCode.COOLDOWN,
        serverLogicalIndex: currentState?.lastLogicalIndex ?? -1,
        serverTimestamp: serverTime
      };
    }
    
    if (!currentState) {
      return {
        valid: false,
        extraDamage: 0,
        healAmount: 0,
        slowMs: 0,
        bonusApplied: false,
        errorCode: ComboErrorCode.NO_SEQUENCE,
        serverLogicalIndex: -1,
        serverTimestamp: serverTime
      };
    }
    
    if (clientLogicalIndex !== currentState.lastLogicalIndex + 1) {
      this.playerStates.delete(playerId);
      return {
        valid: false,
        extraDamage: 0,
        healAmount: 0,
        slowMs: 0,
        bonusApplied: false,
        errorCode: ComboErrorCode.OUT_OF_ORDER,
        serverLogicalIndex: currentState.lastLogicalIndex,
        serverTimestamp: serverTime
      };
    }
    
    const prevDefinition = this.comboDefinitions.get(currentState.lastSkillId);
    if (!prevDefinition) {
      this.playerStates.delete(playerId);
      return {
        valid: false,
        extraDamage: 0,
        healAmount: 0,
        slowMs: 0,
        bonusApplied: false,
        errorCode: ComboErrorCode.INVALID_TRANSITION,
        serverLogicalIndex: currentState.lastLogicalIndex,
        serverTimestamp: serverTime
      };
    }
    
    if (!prevDefinition.nextSkills.includes(skillId)) {
      this.playerStates.delete(playerId);
      return {
        valid: false,
        extraDamage: 0,
        healAmount: 0,
        slowMs: 0,
        bonusApplied: false,
        errorCode: ComboErrorCode.INVALID_TRANSITION,
        serverLogicalIndex: currentState.lastLogicalIndex,
        serverTimestamp: serverTime
      };
    }
    
    const timeDiff = serverTime - currentState.lastTimestamp;
    if (timeDiff > prevDefinition.windowMs) {
      this.playerStates.delete(playerId);
      return {
        valid: false,
        extraDamage: 0,
        healAmount: 0,
        slowMs: 0,
        bonusApplied: false,
        errorCode: ComboErrorCode.WINDOW_EXPIRED,
        serverLogicalIndex: currentState.lastLogicalIndex,
        serverTimestamp: serverTime
      };
    }
    
    if (targetPosition) {
      const distance = this.calculateDistance(position, targetPosition);
      if (distance > prevDefinition.requirements.maxDistance || 
          distance < prevDefinition.requirements.minDistance) {
        this.playerStates.delete(playerId);
        return {
          valid: false,
          extraDamage: 0,
          healAmount: 0,
          slowMs: 0,
          bonusApplied: false,
          errorCode: ComboErrorCode.POSITION_MISMATCH,
          serverLogicalIndex: currentState.lastLogicalIndex,
          serverTimestamp: serverTime
        };
      }
    }
    
    if (prevDefinition.requirements.requiresBuff) {
      const hasBuff = currentBuffStates.has(prevDefinition.requirements.requiresBuff);
      if (!hasBuff) {
        this.playerStates.delete(playerId);
        return {
          valid: false,
          extraDamage: 0,
          healAmount: 0,
          slowMs: 0,
          bonusApplied: false,
          errorCode: ComboErrorCode.BUFF_MISSING,
          serverLogicalIndex: currentState.lastLogicalIndex,
          serverTimestamp: serverTime
        };
      }
    }
    
    const bonusMultiplier = prevDefinition.bonusMultiplier;
    const extraDamage = definition ? Math.floor(definition.skillId.length * 10 * bonusMultiplier) : 0;
    
    const newChain = [...currentState.comboChain, skillId];
    this.playerStates.set(playerId, {
      playerId,
      lastSkillId: skillId,
      lastLogicalIndex: clientLogicalIndex,
      lastTimestamp: serverTime,
      lastPosition: position,
      comboChain: newChain
    });
    
    this.cooldowns.set(cooldownKey, serverTime);
    
    return {
      valid: true,
      extraDamage,
      healAmount: Math.floor(extraDamage * 0.2),
      slowMs: Math.floor(bonusMultiplier * 50),
      bonusApplied: bonusMultiplier > 1.0,
      serverLogicalIndex: clientLogicalIndex,
      serverTimestamp: serverTime
    };
  }

  public validateAgainstState(
    playerId: string,
    skillId: string,
    clientLogicalIndex: number,
    playerState: EntityState,
    targetState?: EntityState,
    buffStates: Map<string, number> = new Map()
  ): ComboResult {
    return this.validateSkillSequence(
      playerId,
      skillId,
      clientLogicalIndex,
      playerState.position,
      targetState?.entityId,
      targetState?.logicalIndex,
      targetState?.position,
      buffStates
    );
  }

  public breakCombo(playerId: string): void {
    this.playerStates.delete(playerId);
  }

  public getComboChain(playerId: string): string[] {
    const state = this.playerStates.get(playerId);
    return state?.comboChain || [];
  }

  public isInCombo(playerId: string): boolean {
    return this.playerStates.has(playerId);
  }

  public resetCombo(playerId: string): void {
    this.playerStates.delete(playerId);
  }

  public registerDefinition(definition: ComboDefinition): void {
    this.comboDefinitions.set(definition.skillId, definition);
  }

  public getDefinition(skillId: string): ComboDefinition | undefined {
    return this.comboDefinitions.get(skillId);
  }

  public clearCooldowns(): void {
    this.cooldowns.clear();
  }

  public getPlayerState(playerId: string): PlayerComboState | undefined {
    return this.playerStates.get(playerId);
  }
}

export default ComboValidator;
