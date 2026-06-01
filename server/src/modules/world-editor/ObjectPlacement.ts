export class ObjectPlacement {
  place(assetId: string, position: {x:number;y:number;z:number}) {
    return { assetId, position, placedAt: 0 /* ARE-DETERMINISM-ALLOW: determinism placeholder */ };
  }
}