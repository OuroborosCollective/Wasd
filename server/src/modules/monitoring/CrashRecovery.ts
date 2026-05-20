// @ARE-GUARD-EXEMPT: non-sim module
export class CrashRecovery {
  recover(snapshotArchive: any) {
    return snapshotArchive.latest ? snapshotArchive.latest() : null;
  }
}