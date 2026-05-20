// @ARE-GUARD-EXEMPT: meta path
// @ARE-GUARD-EXEMPT: meta telemetry side-channel reason
// @ARE-GUARD-EXEMPT: meta path
export class EditorActionLog {
  private actions:any[] = [];
  record(action:any){
    this.actions.push({ ...action, ts: Date.now() });
    return action;
  }
  all(){
    return this.actions;
  }
}