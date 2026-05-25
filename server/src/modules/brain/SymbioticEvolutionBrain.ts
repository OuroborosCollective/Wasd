import { TerritoryCell } from '../plexity/SymbioticTerritoryWeb.js';

export interface FactionEvolutionEvent {
  factionId: string;
  eventType: 'EXPANSION' | 'COLLAPSE' | 'SYMBIOSIS';
  centerPoint: { x: number, y: number, z: number };
  magnitude: number;
}

export class SymbioticEvolutionBrain {
  public analyzeTerritorialShifts(cells: TerritoryCell[]): FactionEvolutionEvent[] {
      const events: FactionEvolutionEvent[] = [];
      const factionMetrics = new Map<string, { totalControl: number, highTensionCells: number, center: {x: number, y: number, z: number}, count: number }>();

      // Gather metrics
      for (const cell of cells) {
          if (!cell.factionId) continue;

          let metrics = factionMetrics.get(cell.factionId);
          if (!metrics) {
              metrics = { totalControl: 0, highTensionCells: 0, center: { x: 0, y: 0, z: 0 }, count: 0 };
              factionMetrics.set(cell.factionId, metrics);
          }

          metrics.totalControl += cell.controlGradient;
          if (cell.symbioticTension > 0.8) metrics.highTensionCells++;

          metrics.center.x += cell.x;
          metrics.center.y += cell.y;
          metrics.center.z += cell.z;
          metrics.count++;
      }

      // Evaluate emergent behavior
      for (const [factionId, metrics] of factionMetrics.entries()) {
          const avgControl = metrics.totalControl / metrics.count;
          const centerPoint = {
              x: metrics.center.x / metrics.count,
              y: metrics.center.y / metrics.count,
              z: metrics.center.z / metrics.count
          };

          if (metrics.highTensionCells > 10) {
              events.push({
                  factionId,
                  eventType: 'COLLAPSE',
                  centerPoint,
                  magnitude: metrics.highTensionCells / metrics.count
              });
          } else if (avgControl > 0.8 && metrics.count > 5) {
              events.push({
                  factionId,
                  eventType: 'EXPANSION',
                  centerPoint,
                  magnitude: avgControl
              });
          } else if (avgControl > 0.5 && metrics.highTensionCells > 2) {
             events.push({
                  factionId,
                  eventType: 'SYMBIOSIS',
                  centerPoint,
                  magnitude: avgControl * 1.5
              });
          }
      }

      return events;
  }
}
