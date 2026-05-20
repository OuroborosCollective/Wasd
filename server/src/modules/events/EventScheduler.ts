// @ARE-GUARD-EXEMPT: non-sim module
export class EventScheduler {
  private events:any[] = [];
  schedule(event:any){ this.events.push(event); return event; }
  due(){ return this.events; }
}