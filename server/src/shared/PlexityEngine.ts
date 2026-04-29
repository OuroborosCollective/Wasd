export class PlexityEngine {
    private static getTypeWeight(type: string): number {
        const weights: Record<string, number> = {
            'player': 1.0,
            'boss': 0.9,
            'npc': 0.7,
            'mob': 0.5,
            'projectile': 0.4,
            'item': 0.2,
            'static': 0.1
        };
        return weights[type] || 0.1;
    }

    public static calculatePlexity(entity: any): number {
        if (!entity) return 0;

        const weightType = 0.45;
        const weightHP = 0.35;
        const weightResonance = 0.20;

        const typeScore = this.getTypeWeight(entity.type);

        const health = typeof entity.health === 'number' ? entity.health : 0;
        const maxHealth = typeof entity.maxHealth === 'number' && entity.maxHealth > 0 ? entity.maxHealth : 1;
        const hpRatio = Math.min(Math.max(health / maxHealth, 0), 1);

        const resonance = typeof entity.resonance === 'number' ? entity.resonance : 0;
        const inverseResonance = 1 / (Math.abs(resonance) + 1);

        const plexity = (typeScore * weightType) + (hpRatio * weightHP) + (inverseResonance * weightResonance);

        return Math.min(Math.max(plexity, 0), 1);
    }
}