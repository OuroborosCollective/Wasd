export enum ElementType {
    FROST = 'FROST',
    ELECTRO = 'ELECTRO',
    FIRE = 'FIRE',
    NATURE = 'NATURE',
    VOID = 'VOID',
    PHYSICAL = 'PHYSICAL',
    ARCANE = 'ARCANE',
    LIGHTNING = 'LIGHTNING'
}

export interface ITriangulationConfig {
    explosionRadius: number;
    baseDamage: number;
    scalingFactor: number;
    explosionDelayMs: number;
    chainLimit: number;
    visualEffectId: string;
    isRecursive: boolean;
}

export interface IResonanceProperties {
    element: ElementType;
    damageMultiplier: number;
    statusEffectId: string;
    triangulationConfig: ITriangulationConfig;
    procChance: number;
    internalCooldownMs: number;
    resistanceReduction: number;
}

export type ResonanceDefinitionMap = Record<string, IResonanceProperties>;

export const DEFAULT_TRIANGULATION_CONFIG: ITriangulationConfig = {
    explosionRadius: 5.0,
    baseDamage: 100,
    scalingFactor: 1.5,
    explosionDelayMs: 500,
    chainLimit: 3,
    visualEffectId: 'fx_triangulation_default',
    isRecursive: false
};