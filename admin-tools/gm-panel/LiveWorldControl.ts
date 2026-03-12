export class LiveWorldControl {
  trigger(eventType:string){
    return { eventType, triggered:true };
  }
}