export class WorldEditor {
  place(type:string, position:{x:number;y:number;z:number}){
    return { action:"place", type, position };
  }
}