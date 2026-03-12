export class TerrainBrush {
  paint(position: {x:number;y:number;z:number}, radius: number) {
    return { position, radius, action: "paint_terrain" };
  }
}