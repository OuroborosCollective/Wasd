/**
 * Caravan / trade route helper (minimal surface for TradeAIBehavior).
 */
export class CaravanLogic {
  targetPosition: { x: number; y: number; z: number } | null = { x: 0, y: 0, z: 0 };

  recalculateRoute(): void {
    this.targetPosition = { x: 0, y: 0, z: 0 };
  }
}
