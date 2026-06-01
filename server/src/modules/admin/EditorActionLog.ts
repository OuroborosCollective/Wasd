export class EditorActionLog {
  private actions:any[] = [];
  record(action:any){
    this.actions.push({ ...action, ts: 0 /* ARE-DETERMINISM-ALLOW: determinism placeholder */ });
    return action;
  }
  all(){
    return this.actions;
  }
}