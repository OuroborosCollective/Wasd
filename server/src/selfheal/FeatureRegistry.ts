// ============================================================
// FeatureRegistry.ts
// Verwaltet alle bekannten Features des Spiels.
// ============================================================

import { FeatureDefinition } from "./types.js";

export class FeatureRegistry {
  private features = new Map<string, FeatureDefinition>();

  constructor() {
    this.registerCoreFeatures();
  }

  private registerCoreFeatures(): void {
    const coreFeatures: FeatureDefinition[] = [
      {
        id: "world_tick",
        name: "WorldTick (100ms Game Loop)",
        subsystem: "WorldTick",
        description: "Herz des Servers — 100ms Simulationsschritt",
        priority: "CORE",
        isProtected: true,
      },
      {
        id: "npc_system",
        name: "NPC System",
        subsystem: "NPCSystem",
        description: "NPC Spawn, Tick, Interaktion und Dialog",
        priority: "CORE",
        isProtected: true,
      },
      {
        id: "combat_system",
        name: "Combat System",
        subsystem: "CombatSystem",
        description: "Angriffe, Schaden, Tod, Respawn",
        priority: "CORE",
        isProtected: true,
      },
      {
        id: "loot_system",
        name: "Loot System",
        subsystem: "LootSystem",
        description: "Beute-Drops bei Kills",
        priority: "HIGH",
        isProtected: true,
      },
      {
        id: "skill_system",
        name: "Skill System",
        subsystem: "SkillSystem",
        description: "Fertigkeitsbäume und Leveling",
        priority: "CORE",
        isProtected: true,
      },
      {
        id: "world_system",
        name: "World System",
        subsystem: "WorldSystem",
        description: "Welt-Orchestrator",
        priority: "CORE",
        isProtected: true,
      },
      {
        id: "economy_engine",
        name: "Economy Engine",
        subsystem: "EconomyEngine",
        description: "Wirtschafts-Orchestrator",
        priority: "HIGH",
        isProtected: true,
      }
    ];

    coreFeatures.forEach(f => this.features.set(f.id, f));
  }

  public getFeature(id: string): FeatureDefinition | undefined {
    return this.features.get(id);
  }

  public getAllFeatures(): FeatureDefinition[] {
    return Array.from(this.features.values());
  }
}
