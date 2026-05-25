export interface TerritoryCell {
  x: number;
  y: number;
  z: number;
  factionId: string | null;
  controlGradient: number; // 0.0 to 1.0 representing strength of hold
  symbioticTension: number; // Conflict/adaptation pressure
}

export class SymbioticTerritoryWeb {
  private grid: Map<string, TerritoryCell> = new Map();
  private readonly CELL_SIZE = 50;

  public applyPlayerInfluence(x: number, y: number, z: number, playerFaction: string, influenceStrength: number): void {
      const cx = Math.floor(x / this.CELL_SIZE);
      const cy = Math.floor(y / this.CELL_SIZE);
      const cz = Math.floor(z / this.CELL_SIZE);
      const key = `${cx},${cy},${cz}`;

      let cell = this.grid.get(key);
      if (!cell) {
          cell = {
            x: cx * this.CELL_SIZE,
            y: cy * this.CELL_SIZE,
            z: cz * this.CELL_SIZE,
            factionId: playerFaction,
            controlGradient: 0,
            symbioticTension: 0
          };
          this.grid.set(key, cell);
      }

      if (cell.factionId === playerFaction) {
          // Strengthen control
          cell.controlGradient = Math.min(1.0, cell.controlGradient + influenceStrength);
          // Reduce tension as control solidifies
          cell.symbioticTension = Math.max(0, cell.symbioticTension - 0.05);
      } else {
          // Increase tension, potentially flip control
          cell.symbioticTension += influenceStrength * 1.5;
          if (cell.symbioticTension > 1.0) {
              // Faction shift occurs
              cell.factionId = playerFaction;
              cell.controlGradient = 0.2; // Weak initial hold
              cell.symbioticTension = 0.5; // High remaining tension
          }
      }
  }

  public getTerritoryMatrix(): TerritoryCell[] {
      return Array.from(this.grid.values());
  }
}
