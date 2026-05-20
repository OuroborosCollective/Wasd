// @ARE-GUARD-EXEMPT: non-sim module
export class AdminRollback {
  revert(snapshot:any){
    return {
      reverted: true,
      snapshot
    };
  }
}