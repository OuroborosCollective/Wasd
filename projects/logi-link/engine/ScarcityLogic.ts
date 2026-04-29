import { ResourceRegistry } from "./ResourceRegistry";
import { ScarcityStateTracker } from "./ScarcityStateTracker";

export interface ScarcityResult {
    severity: number;
    scoreAdjustment: number;
    isEffective: boolean;
}

export class ScarcityLogic {
    private static readonly LEAD_TIME: number = 10;
    private static readonly EXPONENTIAL_BASE: number = 1.1;
    private static readonly BASE_ADJUSTMENT: number = 0.5;

    public static calculateScarcity(
        resourceId: string,
        currentAmount: number,
        targetAmount: number,
        tracker: ScarcityStateTracker
    ): ScarcityResult {
        if (targetAmount <= 0) {
            return { severity: 0, scoreAdjustment: 0, isEffective: false };
        }

        const severity = Math.max(0, (targetAmount - currentAmount) / targetAmount);
        
        if (severity <= 0) {
            tracker.resetDuration(resourceId);
            return { severity: 0, scoreAdjustment: 0, isEffective: false };
        }

        tracker.incrementDuration(resourceId);
        const duration = tracker.getDuration(resourceId);
        const weight = ResourceRegistry.getWeight(resourceId);
        
        const isEffective = duration >= ScarcityLogic.LEAD_TIME;
        
        if (!isEffective) {
            return { severity, scoreAdjustment: 0, isEffective: false };
        }

        const effectiveDuration = duration - ScarcityLogic.LEAD_TIME;
        const scoreAdjustment = ScarcityLogic.BASE_ADJUSTMENT * 
                                weight * 
                                Math.pow(ScarcityLogic.EXPONENTIAL_BASE, effectiveDuration) * 
                                severity;

        return {
            severity,
            scoreAdjustment,
            isEffective: true
        };
    }
}