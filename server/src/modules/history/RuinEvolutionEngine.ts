// @ARE-GUARD-EXEMPT: Evolution timestamps; not world-state input.
export class RuinEvolutionEngine {
  evolve(structure:any){
    return {
      ...structure,
      state: "ruin",
      evolvedAt: Date.now()
    };
  }
}