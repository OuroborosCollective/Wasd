/**
 * ScarcityLogic - Resource Scarcity & Political Escalation Engine
 * 
 * Identifies resource bottlenecks and political escalation (Hostility Score).
 * Triggers scarcity events when currentStock < safetyThreshold.
 * Adjusts hostility score by +0.15 (integer-mapped: +1500).
 * 
 * Features:
 * - Safety threshold detection
 * - Deterministic triggerScarcityEvent
 * - Integer-mapped hostility adjustment (+1500 = +0.15)
 * - No delta-time management
 */

import { ResourceRegistry } from './ResourceRegistry';
import { ScarcityStateTracker } from './ScarcityStateTracker';

export interface ScarcityResult {
  severity: number;
  scoreAdjustment: number;
  isEffective: boolean;
  triggeredEvent?: ScarcityEvent;
}

export interface ScarcityEvent {
  id: string;
  resourceId: string;
  regionId: string;
  type: ScarcityEventType;
  timestamp: number;
  currentStock: number;
  safetyThreshold: number;
  hostiliyAdjustment: number;
}

export enum ScarcityEventType {
  BOTTLENECK_DETECTED = 'BOTTLENECK_DETECTED',
  CRITICAL_SHORTAGE = 'CRITICAL_SHORTAGE',
  POLITICAL_ESCALATION = 'POLITICAL_ESCALATION',
  FAMINE_WARNING = 'FAMINE_WARNING',
  TRADE_WAR = 'TRADE_WAR'
}

export interface HostilityScore {
  sourceFaction: string;
  targetFaction: string;
  score: number;
}

export interface ResourceStock {
  resourceId: string;
  regionId: string;
  currentStock: number;
  safetyThreshold: number;
}

const INT_SCALE = 10000;
const HOSTILITY_ADJUSTMENT = 1500;
const CRITICAL_THRESHOLD = 2500;
const WARNING_THRESHOLD = 5000;

export class ScarcityLogic {
  private static readonly LEAD_TIME = 10;
  private static readonly EXPONENTIAL_BASE = 1.1;
  private static readonly BASE_ADJUSTMENT = 0.5;

  public static checkScarcityCondition(resourceId: string, currentStock: number, safetyThreshold: number): ScarcityEvent | null {
    const threshold = safetyThreshold * INT_SCALE;
    const stock = currentStock * INT_SCALE;
    if (stock >= threshold) return null;
    const shortageRatio = (threshold - stock) / threshold;
    const eventType = this.determineEventType(shortageRatio);
    return {
      id: this.generateEventId(resourceId),
      resourceId,
      regionId: 'global',
      type: eventType,
      timestamp: Date.now(),
      currentStock,
      safetyThreshold,
      hostiliyAdjustment: HOSTILITY_ADJUSTMENT
    };
  }

  private static determineEventType(shortageRatio: number): ScarcityEventType {
    if (shortageRatio >= CRITICAL_THRESHOLD) return ScarcityEventType.CRITICAL_SHORTAGE;
    if (shortageRatio >= WARNING_THRESHOLD) return ScarcityEventType.BOTTLENECK_DETECTED;
    return ScarcityEventType.POLITICAL_ESCALATION;
  }

  private static generateEventId(resourceId: string): string {
    return 'Scarcity_' + resourceId + '_' + Date.now();
  }

  public static triggerScarcityEvent(event: ScarcityEvent, currentHostility: number): HostilityScore {
    const newScore = Math.min(INT_SCALE, currentHostility + HOSTILITY_ADJUSTMENT);
    return { sourceFaction: event.resourceId, targetFaction: event.regionId, score: newScore };
  }

  public static calculateShortageRatio(currentStock: number, safetyThreshold: number): number {
    if (safetyThreshold <= 0) return 0;
    return Math.max(0, (safetyThreshold - currentStock) / safetyThreshold);
  }

  public static evaluateResourceScarcity(stock: ResourceStock, tracker: ScarcityStateTracker, currentHostility = 0): ScarcityResult {
    const event = this.checkScarcityCondition(stock.resourceId, stock.currentStock, stock.safetyThreshold);
    if (!event) {
      tracker.resetDuration(stock.resourceId);
      return { severity: 0, scoreAdjustment: 0, isEffective: false };
    }
    tracker.incrementDuration(stock.resourceId);
    const duration = tracker.getDuration(stock.resourceId);
    const isEffective = duration >= this.LEAD_TIME;
    const weight = ResourceRegistry.getWeight(stock.resourceId);
    const severity = this.calculateShortageRatio(stock.currentStock, stock.safetyThreshold);
    let scoreAdjustment = 0;
    if (isEffective) {
      const effectiveDuration = duration - this.LEAD_TIME;
      scoreAdjustment = this.BASE_ADJUSTMENT * weight * Math.pow(this.EXPONENTIAL_BASE, effectiveDuration) * severity;
    }
    return { severity, scoreAdjustment, isEffective, triggeredEvent: event };
  }

  public static adjustHostility(sourceFaction: string, targetFaction: string, currentScore: number, addPositive = true): HostilityScore {
    const adjustment = addPositive ? HOSTILITY_ADJUSTMENT : -HOSTILITY_ADJUSTMENT;
    const newScore = Math.max(0, Math.min(INT_SCALE, currentScore + adjustment));
    return { sourceFaction, targetFaction, score: newScore };
  }

  public static toFloatScore(intScore: number): number { return intScore / INT_SCALE; }
  public static toIntScore(floatScore: number): number { return Math.floor(floatScore * INT_SCALE); }

  public static calculateScarcity(resourceId: string, currentAmount: number, targetAmount: number, tracker: ScarcityStateTracker): ScarcityResult {
    if (targetAmount <= 0) return { severity: 0, scoreAdjustment: 0, isEffective: false };
    const severity = Math.max(0, (targetAmount - currentAmount) / targetAmount);
    if (severity <= 0) {
      tracker.resetDuration(resourceId);
      return { severity: 0, scoreAdjustment: 0, isEffective: false };
    }
    tracker.incrementDuration(resourceId);
    const duration = tracker.getDuration(resourceId);
    const weight = ResourceRegistry.getWeight(resourceId);
    const isEffective = duration >= ScarcityLogic.LEAD_TIME;
    if (!isEffective) return { severity, scoreAdjustment: 0, isEffective: false };
    const effectiveDuration = duration - ScarcityLogic.LEAD_TIME;
    const scoreAdjustment = ScarcityLogic.BASE_ADJUSTMENT * weight * Math.pow(ScarcityLogic.EXPONENTIAL_BASE, effectiveDuration) * severity;
    return { severity, scoreAdjustment, isEffective: true };
  }
}

export default ScarcityLogic;
