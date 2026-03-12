export class CrashRecovery {
  recover(snapshotArchive: any) {
    return snapshotArchive.latest ? snapshotArchive.latest() : null;
  }
}