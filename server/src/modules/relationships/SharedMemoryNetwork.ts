export class SharedMemoryNetwork {
  share(memories:any[]) {
    return {
      sharedCount: memories.length,
      propagatedAt: Date.now()
    };
  }
}