/**
 * RuntimeValidation - Phase 12: Runtime Validation Framework
 * 
 * Non-blocking runtime checks for ARE-Logic, deterministic workflows,
 * and data flow validation across all system boundaries.
 * 
 * @ARE-GUARD-EXEMPT: Validation framework for runtime checks; not world-state input.
 */

import { KAPPA, assertSafeInteger } from './Kappa';

// ─── Validation Result Types ────────────────────────────────────────────────

export type ValidationSeverity = 'info' | 'warn' | 'error';

export interface ValidationResult {
  valid: boolean;
  severity: ValidationSeverity;
  message: string;
  context?: string;
  timestamp: number;
  tickCount?: number;
}

export interface DataFlowValidation {
  source: string;
  target: string;
  dataShape: string;
  validationResults: ValidationResult[];
}

// ─── Validation Configuration ────────────────────────────────────────────────

export interface RuntimeValidationConfig {
  enableFloatChecks: boolean;
  enableKappaBoundsChecks: boolean;
  enableArrayBoundsChecks: boolean;
  enableNullChecks: boolean;
  enableTypeChecks: boolean;
  enableDataFlowChecks: boolean;
  enableStateTransitionChecks: boolean;
  maxViolationHistory: number;
  logViolations: boolean;
}

export const DEFAULT_RUNTIME_VALIDATION_CONFIG: RuntimeValidationConfig = {
  enableFloatChecks: true,
  enableKappaBoundsChecks: true,
  enableArrayBoundsChecks: true,
  enableNullChecks: true,
  enableTypeChecks: true,
  enableDataFlowChecks: true,
  enableStateTransitionChecks: true,
  maxViolationHistory: 100,
  logViolations: true,
};

// ─── Validation Context ──────────────────────────────────────────────────────

export interface ValidationContext {
  tickId?: number;
  systemName?: string;
  operation?: string;
  layerName?: string;
}

// ─── Main Validation Class ───────────────────────────────────────────────────

export class RuntimeValidation {
  private config: RuntimeValidationConfig;
  private violationHistory: ValidationResult[] = [];
  private dataFlowCache: Map<string, DataFlowValidation> = new Map();
  private tickStats: {
    totalValidations: number;
    passedValidations: number;
    failedValidations: number;
    lastTickProcessed: number;
  } = {
    totalValidations: 0,
    passedValidations: 0,
    failedValidations: 0,
    lastTickProcessed: 0,
  };

  constructor(config: Partial<RuntimeValidationConfig> = {}) {
    this.config = { ...DEFAULT_RUNTIME_VALIDATION_CONFIG, ...config };
  }

  // ─── Core Validation Methods ──────────────────────────────────────────────

  /**
   * Validate that a value is a safe integer (not float, not NaN, not Infinity)
   */
  validateSafeInteger(value: unknown, context: ValidationContext): ValidationResult {
    this.tickStats.totalValidations++;
    
    if (value === null || value === undefined) {
      return this.failResult('Value is null/undefined', 'error', context);
    }

    if (typeof value !== 'number') {
      return this.failResult(`Expected number, got ${typeof value}`, 'error', context);
    }

    if (Number.isNaN(value)) {
      return this.failResult('NaN detected', 'error', context);
    }

    if (!Number.isFinite(value)) {
      return this.failResult('Infinity detected', 'error', context);
    }

    if (!Number.isInteger(value)) {
      return this.failResult(`Float detected: ${value}`, 'error', context);
    }

    if (!Number.isSafeInteger(value)) {
      return this.failResult(`Unsafe integer: ${value}`, 'warn', context);
    }

    return this.passResult('Valid integer', context);
  }

  /**
   * Validate Kappa integer bounds
   */
  validateKappaValue(value: unknown, context: ValidationContext): ValidationResult {
    this.tickStats.totalValidations++;

    const integerResult = this.validateSafeInteger(value, context);
    if (!integerResult.valid) {
      return integerResult;
    }

    const numValue = value as number;
    
    // Kappa values should be within reasonable bounds
    // Using BigInt for overflow-safe comparison
    const KAPPA_MAX = BigInt(KAPPA) * BigInt(1e9); // Reasonable upper bound
    const KAPPA_MIN = BigInt(KAPPA) * BigInt(-1e9); // Reasonable lower bound
    
    if (BigInt(numValue) > KAPPA_MAX || BigInt(numValue) < KAPPA_MIN) {
      return this.failResult(
        `Kappa value out of bounds: ${numValue}`,
        'warn',
        context
      );
    }

    return this.passResult('Valid Kappa value', context);
  }

  /**
   * Validate array bounds access
   */
  validateArrayAccess<T>(
    array: T[],
    index: number,
    context: ValidationContext
  ): ValidationResult {
    this.tickStats.totalValidations++;

    if (!Array.isArray(array)) {
      return this.failResult('Not an array', 'error', context);
    }

    if (index < 0) {
      return this.failResult(`Negative array index: ${index}`, 'error', context);
    }

    if (index >= array.length) {
      return this.failResult(
        `Array index out of bounds: ${index} >= ${array.length}`,
        'error',
        context
      );
    }

    return this.passResult('Valid array access', context);
  }

  /**
   * Validate position structure (Kappa position)
   */
  validateKappaPosition(
    position: unknown,
    context: ValidationContext
  ): ValidationResult {
    this.tickStats.totalValidations++;

    if (position === null || position === undefined) {
      return this.failResult('Position is null/undefined', 'error', context);
    }

    if (typeof position !== 'object') {
      return this.failResult('Position is not an object', 'error', context);
    }

    const pos = position as Record<string, unknown>;

    for (const axis of ['x', 'y', 'z']) {
      if (pos[axis] === undefined) {
        // Position might be 2D, so only warn
        if (axis === 'z' && pos.x !== undefined && pos.y !== undefined) {
          continue;
        }
        return this.failResult(`Position missing ${axis} axis`, 'warn', context);
      }

      const axisResult = this.validateKappaValue(pos[axis], {
        ...context,
        operation: `${context.operation || 'validate'}.${axis}`,
      });
      if (!axisResult.valid) {
        return axisResult;
      }
    }

    return this.passResult('Valid Kappa position', context);
  }

  /**
   * Validate entity state structure
   */
  validateEntityState(
    entity: unknown,
    context: ValidationContext
  ): ValidationResult {
    this.tickStats.totalValidations++;

    if (entity === null || entity === undefined) {
      return this.failResult('Entity is null/undefined', 'error', context);
    }

    if (typeof entity !== 'object') {
      return this.failResult('Entity is not an object', 'error', context);
    }

    const ent = entity as Record<string, unknown>;

    // Required fields check
    if (!ent.id) {
      return this.failResult('Entity missing id', 'error', context);
    }

    if (typeof ent.id !== 'string' && typeof ent.id !== 'number') {
      return this.failResult('Entity id is not string/number', 'error', context);
    }

    // Position validation (if present)
    if (ent.position) {
      const posResult = this.validateKappaPosition(ent.position, context);
      if (!posResult.valid) {
        return posResult;
      }
    }

    return this.passResult('Valid entity state', context);
  }

  /**
   * Validate state transition
   */
  validateStateTransition(
    fromState: unknown,
    toState: unknown,
    allowedTransitions: string[],
    context: ValidationContext
  ): ValidationResult {
    this.tickStats.totalValidations++;

    if (fromState === undefined || toState === undefined) {
      return this.failResult('State transition: undefined state', 'error', context);
    }

    const transition = `${String(fromState)}->${String(toState)}`;
    
    if (!allowedTransitions.includes(transition) && !allowedTransitions.includes(String(toState))) {
      return this.failResult(
        `Invalid state transition: ${transition}`,
        'warn',
        context
      );
    }

    return this.passResult('Valid state transition', context);
  }

  /**
   * Validate data flow between systems
   */
  validateDataFlow(
    sourceSystem: string,
    targetSystem: string,
    data: unknown,
    schema: Record<string, string>,
    context: ValidationContext
  ): ValidationResult {
    this.tickStats.totalValidations++;

    if (data === null || data === undefined) {
      return this.failResult(
        `Data flow ${sourceSystem}->${targetSystem}: data is null`,
        'error',
        context
      );
    }

    if (typeof data !== 'object') {
      return this.failResult(
        `Data flow ${sourceSystem}->${targetSystem}: data is not object`,
        'error',
        context
      );
    }

    const obj = data as Record<string, unknown>;
    const errors: string[] = [];

    for (const [field, expectedType] of Object.entries(schema)) {
      if (obj[field] === undefined) {
        errors.push(`Missing field: ${field}`);
        continue;
      }

      const actualType = typeof obj[field];
      if (expectedType === 'number' && typeof obj[field] !== 'number') {
        errors.push(`Field ${field}: expected number, got ${actualType}`);
      } else if (expectedType === 'string' && typeof obj[field] !== 'string') {
        errors.push(`Field ${field}: expected string, got ${actualType}`);
      } else if (expectedType === 'object' && typeof obj[field] !== 'object') {
        errors.push(`Field ${field}: expected object, got ${actualType}`);
      }
    }

    if (errors.length > 0) {
      return this.failResult(
        `Data flow validation failed: ${errors.join('; ')}`,
        'error',
        context
      );
    }

    // Cache the data flow validation
    const cacheKey = `${sourceSystem}->${targetSystem}`;
    const existing = this.dataFlowCache.get(cacheKey);
    if (existing) {
      existing.validationResults.push(this.passResult('Data flow valid', context));
    } else {
      this.dataFlowCache.set(cacheKey, {
        source: sourceSystem,
        target: targetSystem,
        dataShape: Object.keys(schema).join(','),
        validationResults: [this.passResult('Data flow valid', context)],
      });
    }

    return this.passResult('Data flow valid', context);
  }

  /**
   * Validate inventory operation
   */
  validateInventoryOperation(
    operation: 'add' | 'remove' | 'transfer' | 'equip' | 'unequip',
    itemId: string,
    quantity: number,
    context: ValidationContext
  ): ValidationResult {
    this.tickStats.totalValidations++;

    if (!itemId || typeof itemId !== 'string') {
      return this.failResult('Invalid itemId', 'error', context);
    }

    if (operation !== 'remove' && quantity <= 0) {
      return this.failResult(`Invalid quantity for ${operation}: ${quantity}`, 'error', context);
    }

    if (quantity < 0) {
      return this.failResult(`Negative quantity: ${quantity}`, 'error', context);
    }

    const validOperations = ['add', 'remove', 'transfer', 'equip', 'unequip'];
    if (!validOperations.includes(operation)) {
      return this.failResult(`Unknown operation: ${operation}`, 'error', context);
    }

    return this.passResult('Valid inventory operation', context);
  }

  /**
   * Validate combat action
   */
  validateCombatAction(
    action: 'attack' | 'skill' | 'defend' | 'flee',
    attackerId: string,
    targetId: string,
    context: ValidationContext
  ): ValidationResult {
    this.tickStats.totalValidations++;

    if (!attackerId) {
      return this.failResult('Combat action: missing attackerId', 'error', context);
    }

    if (!targetId && action !== 'defend') {
      return this.failResult('Combat action: missing targetId', 'warn', context);
    }

    if (attackerId === targetId && action !== 'defend') {
      return this.failResult('Combat action: self-targeting not allowed', 'warn', context);
    }

    const validActions = ['attack', 'skill', 'defend', 'flee'];
    if (!validActions.includes(action)) {
      return this.failResult(`Unknown combat action: ${action}`, 'error', context);
    }

    return this.passResult('Valid combat action', context);
  }

  /**
   * Validate NPC behavior request
   */
  validateNPCBehavior(
    npcId: string,
    behavior: string,
    parameters: Record<string, unknown>,
    context: ValidationContext
  ): ValidationResult {
    this.tickStats.totalValidations++;

    if (!npcId) {
      return this.failResult('NPC behavior: missing npcId', 'error', context);
    }

    if (!behavior || typeof behavior !== 'string') {
      return this.failResult('NPC behavior: invalid behavior type', 'error', context);
    }

    // Validate parameters are serializable
    try {
      JSON.stringify(parameters);
    } catch {
      return this.failResult('NPC behavior: parameters not serializable', 'error', context);
    }

    return this.passResult('Valid NPC behavior', context);
  }

  /**
   * Validate tick system execution
   */
  validateTickSystemExecution(
    systemName: string,
    tickCount: number,
    durationMs: number,
    context: ValidationContext
  ): ValidationResult {
    this.tickStats.totalValidations++;
    this.tickStats.lastTickProcessed = tickCount;

    if (!systemName) {
      return this.failResult('Tick system: missing systemName', 'error', context);
    }

    if (tickCount < 0) {
      return this.failResult(`Tick system: negative tickCount ${tickCount}`, 'error', context);
    }

    // Warn if tick duration is unusually high (potential performance issue)
    if (durationMs > 100) {
      return this.failResult(
        `Tick system ${systemName}: high duration ${durationMs}ms`,
        'warn',
        context
      );
    }

    return this.passResult('Valid tick execution', context);
  }

  /**
   * Validate layer value (IARE layer)
   */
  validateLayerValue(
    layerName: string,
    value: unknown,
    context: ValidationContext
  ): ValidationResult {
    this.tickStats.totalValidations++;

    const integerResult = this.validateSafeInteger(value, {
      ...context,
      layerName,
    });
    if (!integerResult.valid) {
      return integerResult;
    }

    // Layer values should be non-negative (conservation principle)
    if ((value as number) < 0) {
      return this.failResult(
        `Layer ${layerName}: negative value violates conservation`,
        'error',
        context
      );
    }

    return this.passResult(`Valid layer ${layerName} value`, context);
  }

  /**
   * Validate world snapshot
   */
  validateWorldSnapshot(
    snapshot: unknown,
    context: ValidationContext
  ): ValidationResult {
    this.tickStats.totalValidations++;

    if (snapshot === null || snapshot === undefined) {
      return this.failResult('World snapshot is null/undefined', 'error', context);
    }

    if (typeof snapshot !== 'object') {
      return this.failResult('World snapshot is not an object', 'error', context);
    }

    const snap = snapshot as Record<string, unknown>;

    // Required snapshot fields
    if (snap.tick === undefined) {
      return this.failResult('World snapshot missing tick', 'error', context);
    }

    if (snap.worldHash === undefined) {
      return this.failResult('World snapshot missing worldHash', 'error', context);
    }

    const tickResult = this.validateSafeInteger(snap.tick, context);
    if (!tickResult.valid) {
      return tickResult;
    }

    return this.passResult('Valid world snapshot', context);
  }

  // ─── Batch Validation ─────────────────────────────────────────────────────

  /**
   * Validate multiple values at once
   */
  validateBatch(
    items: Array<{ value: unknown; context: ValidationContext }>
  ): ValidationResult[] {
    return items.map(({ value, context }) => this.validateSafeInteger(value, context));
  }

  // ─── Statistics ────────────────────────────────────────────────────────────

  getStats() {
    return {
      ...this.tickStats,
      violationCount: this.violationHistory.length,
      dataFlowPaths: this.dataFlowCache.size,
    };
  }

  getViolations(limit = 50): ValidationResult[] {
    return this.violationHistory.slice(-limit);
  }

  getDataFlowCache(): DataFlowValidation[] {
    return Array.from(this.dataFlowCache.values());
  }

  clearStats(): void {
    this.violationHistory = [];
    this.tickStats = {
      totalValidations: 0,
      passedValidations: 0,
      failedValidations: 0,
      lastTickProcessed: 0,
    };
    this.dataFlowCache.clear();
  }

  // ─── Private Helpers ──────────────────────────────────────────────────────

  private passResult(message: string, context: ValidationContext): ValidationResult {
    this.tickStats.passedValidations++;
    return {
      valid: true,
      severity: 'info',
      message,
      context: this.formatContext(context),
      timestamp: getValidationTimestamp(context.tickId),
      tickCount: context.tickId,
    };
  }

  private failResult(
    message: string,
    severity: ValidationSeverity,
    context: ValidationContext
  ): ValidationResult {
    this.tickStats.failedValidations++;
    
    const result: ValidationResult = {
      valid: false,
      severity,
      message,
      context: this.formatContext(context),
      timestamp: getValidationTimestamp(context.tickId),
      tickCount: context.tickId,
    };

    // Store violation (non-blocking)
    this.violationHistory.push(result);
    if (this.violationHistory.length > this.config.maxViolationHistory) {
      this.violationHistory.shift();
    }

    // Log if enabled
    if (this.config.logViolations) {
      const prefix = severity === 'error' ? '❌' : severity === 'warn' ? '⚠️' : 'ℹ️';
      console[severity === 'error' ? 'error' : 'warn'](
        `[RuntimeValidation] ${prefix} ${message} (${result.context})`
      );
    }

    return result;
  }

  private formatContext(context: ValidationContext): string {
    const parts: string[] = [];
    if (context.systemName) parts.push(context.systemName);
    if (context.operation) parts.push(context.operation);
    if (context.layerName) parts.push(`layer:${context.layerName}`);
    return parts.join('.') || 'unknown';
  }

  // ─── Configuration ───────────────────────────────────────────────────────

  updateConfig(config: Partial<RuntimeValidationConfig>): void {
    this.config = { ...this.config, ...config };
  }

  getConfig(): RuntimeValidationConfig {
    return { ...this.config };
  }
}

// ─── Singleton Instance ───────────────────────────────────────────────────────

export const runtimeValidation = new RuntimeValidation();

// ─── Decorators for automatic validation ────────────────────────────────────

/**
 * Decorator to wrap a function with validation context
 */
export function withValidation<T extends (...args: any[]) => any>(
  systemName: string,
  operation: string,
  validator: (args: Parameters<T>, context: ValidationContext) => ValidationResult
) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = function (...args: Parameters<T>) {
      const context: ValidationContext = {
        systemName,
        operation,
      };

      const result = validator(args, context);
      if (!result.valid && result.severity === 'error') {
        console.error(`[RuntimeValidation] Validation failed: ${result.message}`);
        // Don't block, just log
      }

      return originalMethod.apply(this, args);
    };

    return descriptor;
  };
}

// ─── Validation Middleware Factory ───────────────────────────────────────────

export function createValidationMiddleware(validation: RuntimeValidation) {
  return {
    /**
     * Middleware for tick systems
     */
    tickSystem: (systemName: string) => {
      return {
        beforeTick: (tickCount: number) => {
          validation.validateSafeInteger(tickCount, {
            systemName,
            operation: 'beforeTick',
          });
        },
        afterTick: (tickCount: number, durationMs: number) => {
          validation.validateTickSystemExecution(
            systemName,
            tickCount,
            durationMs,
            { systemName, operation: 'afterTick' }
          );
        },
      };
    },

    /**
     * Middleware for entity operations
     */
    entity: (systemName: string) => {
      return {
        onSpawn: (entity: unknown) => {
          validation.validateEntityState(entity, {
            systemName,
            operation: 'onSpawn',
          });
        },
        onUpdate: (entity: unknown) => {
          validation.validateEntityState(entity, {
            systemName,
            operation: 'onUpdate',
          });
        },
        onDespawn: (entityId: string) => {
          if (!entityId) {
            console.warn(`[RuntimeValidation] Despawn: missing entityId in ${systemName}`);
          }
        },
      };
    },

    /**
     * Middleware for data flow
     */
    dataFlow: (sourceSystem: string) => {
      return {
        sendTo: (targetSystem: string, data: unknown, schema: Record<string, string>) => {
          validation.validateDataFlow(
            sourceSystem,
            targetSystem,
            data,
            schema,
            { systemName: sourceSystem, operation: `sendTo.${targetSystem}` }
          );
        },
      };
    },
  };
}

// ─── Quick Validation Helpers ────────────────────────────────────────────────

export const validate = {
  /**
   * Quick safe integer check
   */
  isSafeInteger: (value: unknown): boolean => {
    return (
      typeof value === 'number' &&
      Number.isInteger(value) &&
      Number.isSafeInteger(value) &&
      Number.isFinite(value)
    );
  },

  /**
   * Quick Kappa position check
   */
  isKappaPosition: (pos: unknown): boolean => {
    if (!pos || typeof pos !== 'object') return false;
    const p = pos as Record<string, unknown>;
    return validate.isSafeInteger(p.x) && validate.isSafeInteger(p.y);
  },

  /**
   * Quick entity ID check
   */
  isValidEntityId: (id: unknown): boolean => {
    return typeof id === 'string' && id.length > 0;
  },

  /**
   * Quick serializable check
   */
  isSerializable: (value: unknown): boolean => {
    try {
      JSON.stringify(value);
      return true;
    } catch {
      return false;
    }
  },
};

// ─── Deterministic Timestamp Provider ────────────────────────────────────────
// @ARE-GUARD-EXEMPT: Validation metadata timestamp - not world-state input

let _validationTickCounter = 0;
let _validationSequenceCounter = 0;

/**
 * Returns a deterministic tick-based timestamp for validation metadata.
 * Uses the ARE tick counter, not Date.now().
 */
export function getValidationTimestamp(tickId?: number): number {
  // Use provided tickId if available, otherwise use internal counter
  const base = tickId !== undefined ? tickId * 1000 : _validationTickCounter * 1000;
  // Add a sequence number to ensure uniqueness within the same tick
  _validationSequenceCounter = (_validationSequenceCounter + 1) % 1000;
  return base + _validationSequenceCounter;
}

/**
 * Advance the validation tick counter (call at start of each tick)
 */
export function advanceValidationTick(): void {
  _validationTickCounter++;
  _validationSequenceCounter = 0;
}

/**
 * Reset validation counters (for testing)
 */
export function resetValidationCounters(): void {
  _validationTickCounter = 0;
  _validationSequenceCounter = 0;
}
