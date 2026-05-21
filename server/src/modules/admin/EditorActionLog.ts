// @ARE-GUARD-EXEMPT: Editor action timestamp; not simulation input.
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