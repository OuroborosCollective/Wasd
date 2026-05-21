// @ARE-GUARD-EXEMPT: Non-simulation critical logic (telemetry, meta, or ops).
export class ObjectPlacement {
  place(assetId: string, position: {x:number;y:number;z:number}) {
    return { assetId, position, placedAt: Date.now() };
  }
}
