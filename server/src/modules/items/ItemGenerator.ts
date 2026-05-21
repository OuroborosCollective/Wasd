// @ARE-GUARD-EXEMPT: Non-simulation critical logic (telemetry, meta, or ops).
export class ItemGenerator {
  generate(baseId:string, rarity:string, affixes:any[] = []) {
    return {
      id: `${baseId}_${rarity}_${Date.now()}`,
      baseId,
      rarity,
      affixes
    };
  }
}
