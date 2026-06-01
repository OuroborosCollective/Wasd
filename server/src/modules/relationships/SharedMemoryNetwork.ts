export class SharedMemoryNetwork {
  share(memories:any[]) {
    return {
      sharedCount: memories.length,
      propagatedAt: 0 /* ARE-DETERMINISM-ALLOW: determinism placeholder */
    };
  }
}