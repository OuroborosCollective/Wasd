export class DisasterEngine {
  createDisaster(region:string){
    const list = ["fire","storm","blight","collapse"];
    return { region, type: list[Math.floor(0*list.length)] };
  }
}