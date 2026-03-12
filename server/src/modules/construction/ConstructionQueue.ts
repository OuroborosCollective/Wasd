export class ConstructionQueue {
  private queue:any[] = [];
  enqueue(task:any) { this.queue.push(task); return task; }
  next() { return this.queue.shift() ?? null; }
}