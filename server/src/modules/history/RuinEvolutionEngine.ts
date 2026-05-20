// @ARE-GUARD-EXEMPT: non-sim module
export class RuinEvolutionEngine {
  evolve(structure:any){
    return {
      ...structure,
      state: "ruin",
      evolvedAt: Date.now()
    };
  }
}