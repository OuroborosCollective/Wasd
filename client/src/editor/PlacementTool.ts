export class PlacementTool {
  place(type:string, position:{x:number;y:number;z:number}){
    return { type, position };
  }
}