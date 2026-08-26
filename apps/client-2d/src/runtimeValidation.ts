/**
 * Client 2D Runtime Validation - Phase 12
 * 
 * Non-blocking runtime checks for the 2D client, validating:
 * - Network packet integrity
 * - Entity state consistency
 * - Kappa position validation
 * - Data flow from server
 */

export type ValidationSeverity = 'info' | 'warn' | 'error';

export interface ValidationResult {
  valid: boolean;
  severity: ValidationSeverity;
  message: string;
  context?: string;
  timestamp: number;
}

// ─── Validation Configuration ────────────────────────────────────────────────

interface ClientValidationConfig {
  enableKappaValidation: boolean;
  enableEntityValidation: boolean;
  enableNetworkValidation: boolean;
  enablePositionValidation: boolean;
  maxViolations: number;
  logLevel: 'none' | 'warn' | 'error' | 'all';
}

const DEFAULT_CONFIG: ClientValidationConfig = {
  enableKappaValidation: true,
  enableEntityValidation: true,
  enableNetworkValidation: true,
  enablePositionValidation: true,
  maxViolations: 100,
  logLevel: 'warn',
};

// ─── Quick Validation Helpers ────────────────────────────────────────────────

export const validate = {
  /**
   * Check if value is a valid Kappa integer
   */
  isKappaInt(value: unknown): boolean {
    return (
      typeof value === 'number' &&
      Number.isInteger(value) &&
      Number.isFinite(value)
    );
  },

  /**
   * Check if position has valid Kappa coordinates
   */
  isKappaPosition(pos: unknown): boolean {
    if (!pos || typeof pos !== 'object') return false;
    const p = pos as Record<string, unknown>;
    return validate.isKappaInt(p.x) && validate.isKappaInt(p.y);
  },

  /**
   * Check if entity ID is valid
   */
  isValidEntityId(id: unknown): boolean {
    return typeof id === 'string' && id.length > 0 && id.length < 256;
  },

  /**
   * Check if quantity is valid for game operations
   */
  isValidQuantity(qty: unknown): boolean {
    if (typeof qty !== 'number') return false;
    return Number.isInteger(qty) && qty >= 0 && qty < 1_000_000_000;
  },

  /**
   * Check if chat message is safe
   */
  isSafeChatMessage(text: unknown): boolean {
    if (typeof text !== 'string') return false;
    return text.length > 0 && text.length < 2000;
  },

  /**
   * Check if skill ID format is valid
   */
  isValidSkillId(skillId: unknown): boolean {
    if (typeof skillId !== 'string') return false;
    return skillId.length > 0 && skillId.length < 64;
  },
};

// ─── Network Packet Validation ───────────────────────────────────────────────

export interface PacketValidationResult {
  valid: boolean;
  type: string;
  errors: string[];
}

export function validateNetworkPacket(
  rawData: unknown,
  expectedFields: string[]
): PacketValidationResult {
  const errors: string[] = [];
  
  if (rawData === null || rawData === undefined) {
    return { valid: false, type: 'unknown', errors: ['Packet is null/undefined'] };
  }

  if (typeof rawData !== 'object') {
    return { valid: false, type: 'unknown', errors: ['Packet is not an object'] };
  }

  const packet = rawData as Record<string, unknown>;

  // Check for type field
  const type = packet.type ?? packet.event;
  if (!type || typeof type !== 'string') {
    errors.push('Missing or invalid type field');
  }

  // Check expected fields
  for (const field of expectedFields) {
    if (packet[field] === undefined) {
      errors.push(`Missing expected field: ${field}`);
    }
  }

  return {
    valid: errors.length === 0,
    type: typeof type === 'string' ? type : 'unknown',
    errors,
  };
}

// ─── Entity State Validation ─────────────────────────────────────────────────

export interface EntityValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export function validateEntityState(
  entity: unknown,
  context: string = 'entity'
): EntityValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (entity === null || entity === undefined) {
    errors.push(`${context}: Entity is null/undefined`);
    return { valid: false, errors, warnings };
  }

  if (typeof entity !== 'object') {
    errors.push(`${context}: Entity is not an object`);
    return { valid: false, errors, warnings };
  }

  const e = entity as Record<string, unknown>;

  // Required ID
  if (!e.id) {
    errors.push(`${context}: Missing entity ID`);
  } else if (!validate.isValidEntityId(e.id)) {
    errors.push(`${context}: Invalid entity ID format`);
  }

  // Position validation (if present)
  if (e.x !== undefined && e.y !== undefined) {
    if (!validate.isKappaInt(e.x)) {
      warnings.push(`${context}: x is not a Kappa integer`);
    }
    if (!validate.isKappaInt(e.y)) {
      warnings.push(`${context}: y is not a Kappa integer`);
    }
  }

  // Health validation (if present)
  if (e.hp !== undefined) {
    if (typeof e.hp !== 'number') {
      errors.push(`${context}: hp is not a number`);
    } else if (e.hp < 0) {
      warnings.push(`${context}: hp is negative`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

// ─── Kappa Position Validation ──────────────────────────────────────────────

export interface PositionValidationResult {
  valid: boolean;
  x: number;
  y: number;
  errors: string[];
}

export function validateKappaPosition(
  x: unknown,
  y: unknown,
  context: string = 'position'
): PositionValidationResult {
  const errors: string[] = [];

  const numX = Number(x);
  const numY = Number(y);

  if (!Number.isFinite(numX)) {
    errors.push(`${context}: x is not finite`);
  } else if (!Number.isInteger(numX)) {
    errors.push(`${context}: x is not integer (got ${numX})`);
  }

  if (!Number.isFinite(numY)) {
    errors.push(`${context}: y is not finite`);
  } else if (!Number.isInteger(numY)) {
    errors.push(`${context}: y is not integer (got ${numY})`);
  }

  return {
    valid: errors.length === 0,
    x: numX,
    y: numY,
    errors,
  };
}

// ─── Chunk Coordinate Validation ─────────────────────────────────────────────

const CHUNK_TILES = 16;
const KAPPA_PER_TILE = 1000;

export function validateChunkCoord(kappa: unknown, context: string = 'chunk'): PositionValidationResult {
  return validateKappaPosition(kappa, 0, context);
}

export function kappaToChunkCoord(kappa: number): number {
  return Math.floor(kappa / (CHUNK_TILES * KAPPA_PER_TILE));
}

export function isValidChunkCoord(coord: number): boolean {
  return Number.isInteger(coord) && Math.abs(coord) < 1_000_000;
}

// ─── World Heartbeat Validation ─────────────────────────────────────────────

export interface HeartbeatValidationResult {
  valid: boolean;
  tickCount: number;
  errors: string[];
}

export function validateWorldHeartbeat(
  payload: unknown
): HeartbeatValidationResult {
  const errors: string[] = [];

  if (payload === null || payload === undefined) {
    return { valid: false, tickCount: 0, errors: ['Heartbeat is null'] };
  }

  if (typeof payload !== 'object') {
    return { valid: false, tickCount: 0, errors: ['Heartbeat is not an object'] };
  }

  const hb = payload as Record<string, unknown>;

  // Validate tick
  if (hb.tick === undefined) {
    errors.push('Heartbeat missing tick');
  } else if (!validate.isKappaInt(hb.tick)) {
    errors.push('Heartbeat tick is not a valid integer');
  }

  // Validate entities array
  if (hb.entities !== undefined && !Array.isArray(hb.entities)) {
    errors.push('Heartbeat entities is not an array');
  }

  // Validate each entity
  const entities = hb.entities as unknown[];
  if (Array.isArray(entities)) {
    for (let i = 0; i < entities.length; i++) {
      const entityResult = validateEntityState(entities[i], `entity[${i}]`);
      errors.push(...entityResult.errors);
    }
  }

  return {
    valid: errors.length === 0,
    tickCount: Number(hb.tick ?? 0),
    errors,
  };
}

// ─── Inventory Operation Validation ─────────────────────────────────────────

export function validateInventoryAdd(
  itemId: unknown,
  quantity: unknown
): ValidationResult {
  if (!validate.isValidEntityId(itemId)) {
    return {
      valid: false,
      severity: 'error',
      message: 'Invalid itemId for add operation',
      timestamp: Date.now(),
    };
  }

  if (!validate.isValidQuantity(quantity)) {
    return {
      valid: false,
      severity: 'error',
      message: 'Invalid quantity for add operation',
      timestamp: Date.now(),
    };
  }

  return {
    valid: true,
    severity: 'info',
    message: 'Valid inventory add',
    timestamp: Date.now(),
  };
}

// ─── Combat Action Validation ────────────────────────────────────────────────

export function validateCombatAction(
  attackerId: unknown,
  targetId: unknown,
  skillId: unknown
): ValidationResult {
  const errors: string[] = [];

  if (!validate.isValidEntityId(attackerId)) {
    errors.push('Invalid attacker ID');
  }

  if (targetId !== null && targetId !== undefined && !validate.isValidEntityId(targetId)) {
    errors.push('Invalid target ID');
  }

  if (skillId !== undefined && !validate.isValidSkillId(skillId)) {
    errors.push('Invalid skill ID');
  }

  if (attackerId === targetId && skillId !== 'self_heal') {
    errors.push('Self-targeting combat not allowed');
  }

  return {
    valid: errors.length === 0,
    severity: errors.length > 0 ? 'error' : 'info',
    message: errors.length > 0 ? errors.join('; ') : 'Valid combat action',
    timestamp: Date.now(),
  };
}

// ─── Dialogue/NPC Validation ─────────────────────────────────────────────────

export function validateDialoguePayload(
  payload: unknown
): ValidationResult {
  if (payload === null || payload === undefined) {
    return {
      valid: false,
      severity: 'error',
      message: 'Dialogue payload is null',
      timestamp: Date.now(),
    };
  }

  if (typeof payload !== 'object') {
    return {
      valid: false,
      severity: 'error',
      message: 'Dialogue payload is not an object',
      timestamp: Date.now(),
    };
  }

  const p = payload as Record<string, unknown>;

  // NPC ID check
  if (p.npcId === undefined && p.source === undefined && p.targetId === undefined) {
    return {
      valid: false,
      severity: 'warn',
      message: 'Dialogue missing NPC identifier',
      timestamp: Date.now(),
    };
  }

  // Text check (should exist or be empty)
  const text = p.text ?? p.dialogueText ?? p.message;
  if (text !== undefined && typeof text !== 'string') {
    return {
      valid: false,
      severity: 'error',
      message: 'Dialogue text is not a string',
      timestamp: Date.now(),
    };
  }

  return {
    valid: true,
    severity: 'info',
    message: 'Valid dialogue payload',
    timestamp: Date.now(),
  };
}

// ─── State Hash Validation ───────────────────────────────────────────────────

export function validateStateHash(hash: unknown, context: string = 'stateHash'): ValidationResult {
  if (hash === null || hash === undefined) {
    return {
      valid: false,
      severity: 'error',
      message: `${context} is null/undefined`,
      timestamp: Date.now(),
    };
  }

  if (typeof hash !== 'string') {
    return {
      valid: false,
      severity: 'error',
      message: `${context} is not a string`,
      timestamp: Date.now(),
    };
  }

  // State hashes should be hex strings of reasonable length
  if (!/^[0-9a-f]{8,128}$/i.test(hash)) {
    return {
      valid: false,
      severity: 'warn',
      message: `${context} has unexpected format`,
      timestamp: Date.now(),
    };
  }

  return {
    valid: true,
    severity: 'info',
    message: `Valid ${context}`,
    timestamp: Date.now(),
  };
}

// ─── Runtime Validation Manager ─────────────────────────────────────────────

class ClientRuntimeValidation {
  private config: ClientValidationConfig;
  private violations: ValidationResult[] = [];
  private stats = {
    totalChecks: 0,
    passedChecks: 0,
    failedChecks: 0,
  };

  constructor(config: Partial<ClientValidationConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  validate(value: unknown, validator: (v: unknown) => ValidationResult): ValidationResult {
    this.stats.totalChecks++;
    const result = validator(value);
    
    if (result.valid) {
      this.stats.passedChecks++;
    } else {
      this.stats.failedChecks++;
      this.recordViolation(result);
    }

    return result;
  }

  private recordViolation(result: ValidationResult): void {
    this.violations.push(result);
    if (this.violations.length > this.config.maxViolations) {
      this.violations.shift();
    }

    if (this.config.logLevel !== 'none') {
      const level = result.severity === 'error' ? 'error' : 'warn';
      if (this.config.logLevel === 'all' || 
          (this.config.logLevel === 'warn' && level === 'warn') ||
          (this.config.logLevel === 'error' && level === 'error')) {
        console[level](`[ClientValidation] ${result.severity.toUpperCase()}: ${result.message}`, result.context);
      }
    }
  }

  getStats() {
    return {
      ...this.stats,
      violationCount: this.violations.length,
    };
  }

  getViolations(limit = 50): ValidationResult[] {
    return this.violations.slice(-limit);
  }

  clear(): void {
    this.violations = [];
    this.stats = { totalChecks: 0, passedChecks: 0, failedChecks: 0 };
  }

  updateConfig(config: Partial<ClientValidationConfig>): void {
    this.config = { ...this.config, ...config };
  }
}

export const clientRuntimeValidation = new ClientRuntimeValidation();

// ─── Integration Hooks ───────────────────────────────────────────────────────

/**
 * Validate incoming network message
 */
export function validateIncomingMessage(
  rawData: unknown,
  messageType: string
): boolean {
  const result = clientRuntimeValidation.validate(
    rawData,
    (data) => {
      const expectedFields = getExpectedFields(messageType);
      const packetResult = validateNetworkPacket(data, expectedFields);
      
      if (!packetResult.valid) {
        return {
          valid: false,
          severity: 'error',
          message: `Invalid ${messageType} packet: ${packetResult.errors.join(', ')}`,
          timestamp: Date.now(),
        };
      }
      return { valid: true, severity: 'info', message: 'Valid packet', timestamp: Date.now() };
    }
  );
  return result.valid;
}

function getExpectedFields(messageType: string): string[] {
  const fieldMap: Record<string, string[]> = {
    'world_heartbeat': ['tick', 'entities'],
    'entity_sync': ['entities'],
    'combat_result': ['damage', 'attacker', 'target'],
    'inventory_update': ['items'],
    'loot_spawned': ['loot'],
    'dialogue': ['text', 'source'],
    'chat_message': ['text', 'sender'],
  };
  return fieldMap[messageType] || [];
}

/**
 * Validate entity before rendering
 */
export function validateEntityForRendering(
  entity: unknown,
  entityId: string
): boolean {
  const result = validateEntityState(entity, `render:${entityId}`);
  
  if (!result.valid) {
    console.warn(`[ClientValidation] Entity ${entityId} validation failed:`, result.errors);
  }
  
  for (const warning of result.warnings) {
    console.warn(`[ClientValidation] Entity ${entityId} warning:`, warning);
  }

  return result.valid;
}

/**
 * Validate position before movement
 */
export function validateMovementPosition(
  x: number,
  y: number,
  entityId: string
): boolean {
  const result = validateKappaPosition(x, y, `move:${entityId}`);
  
  if (!result.valid) {
    console.warn(`[ClientValidation] Invalid movement for ${entityId}:`, result.errors);
  }

  return result.valid;
}
