export interface ValidationResult {
    isValid: boolean;
    errors: string[];
    warnings: string[];
    integrityScore: number;
}

export interface FusionContext {
    researchProgress: number; // 0.0 to 1.0
    portalStability: number;  // 0.0 to 1.0
    manifestationCount: number;
    requiredManifestations: number;
    worldIntegrity: number;
}

export class ImpactBusterValidator {
    private readonly MIN_RESEARCH_THRESHOLD = 0.75;
    private readonly MIN_PORTAL_STABILITY = 0.85;
    private readonly CRITICAL_WORLD_INTEGRITY = 0.40;

    public validate(context: FusionContext): ValidationResult {
        const errors: string[] = [];
        const warnings: string[] = [];

        this.checkResearchDependency(context, errors);
        this.checkPortalStability(context, errors, warnings);
        this.checkPhysicalManifestation(context, errors);

        const integrityScore = this.calculateIntegrityScore(context);

        return {
            isValid: errors.length === 0,
            errors,
            warnings,
            integrityScore
        };
    }

    private checkResearchDependency(context: FusionContext, errors: string[]): void {
        if (context.researchProgress < this.MIN_RESEARCH_THRESHOLD) {
            errors.push(`Incomplete Research: Portal research must be at least ${(this.MIN_RESEARCH_THRESHOLD * 100).toFixed(0)}% to stabilize Impact Buster.`);
        }
    }

    private checkPortalStability(context: FusionContext, errors: string[], warnings: string[]): void {
        if (context.portalStability < this.MIN_PORTAL_STABILITY) {
            errors.push("Insufficient Portal Stability: Deployment failed due to erratic energy fluctuations.");
        }

        if (context.portalStability < 0.95 && context.portalStability >= this.MIN_PORTAL_STABILITY) {
            warnings.push("Portal sub-optimal: Harmonic resonance may cause minor structural decay.");
        }
    }

    private checkPhysicalManifestation(context: FusionContext, errors: string[]): void {
        if (context.manifestationCount < context.requiredManifestations) {
            errors.push(`Missing Manifestations: Physical anchor points (${context.manifestationCount}/${context.requiredManifestations}) do not match portal frequency.`);
        }

        if (context.worldIntegrity < this.CRITICAL_WORLD_INTEGRITY) {
            errors.push("World Manifestation Critical: The physical world layer is too thin to support Impact Buster activation.");
        }
    }

    private calculateIntegrityScore(context: FusionContext): number {
        const researchWeight = 0.3;
        const stabilityWeight = 0.4;
        const worldWeight = 0.3;

        const score = (context.researchProgress * researchWeight) +
                      (context.portalStability * stabilityWeight) +
                      (context.worldIntegrity * worldWeight);

        return Math.min(1, Math.max(0, score));
    }

    public canInitiateFusion(context: FusionContext): boolean {
        const result = this.validate(context);
        return result.isValid && result.integrityScore > 0.8;
    }
}