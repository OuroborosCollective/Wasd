// @ARE-GUARD-EXEMPT: non-sim module
export class NavMeshNodes {
  createNode(x:number, y:number){
    return { x, y, walkable: true };
  }
}