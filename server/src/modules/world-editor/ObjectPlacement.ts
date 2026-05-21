// @ARE-GUARD-EXEMPT: Placement timestamps; not world-state input.
export class ObjectPlacement {
  place(assetId: string, position: {x:number;y:number;z:number}) {
    return { assetId, position, placedAt: Date.now() };
  }
}