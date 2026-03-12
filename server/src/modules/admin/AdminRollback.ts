export class AdminRollback {
  revert(snapshot:any){
    return {
      reverted: true,
      snapshot
    };
  }
}