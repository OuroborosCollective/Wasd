export class NavMeshNodes {
  createNode(x:number, y:number){
    return { x, y, walkable: true };
  }
}