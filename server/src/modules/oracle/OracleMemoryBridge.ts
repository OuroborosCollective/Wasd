export class OracleMemoryBridge {
  buildSignal(memory: any[], history: any[]) {
    return {
      memoryCount: memory.length,
      historyCount: history.length,
      strength: memory.length + history.length
    };
  }
}