import { describe, it, expect, beforeEach } from "vitest";
import { ConstructionQueue } from "../modules/construction/ConstructionQueue.js";
import { UpgradeSystem } from "../modules/construction/UpgradeSystem.js";

// ---------------------------------------------------------------------------
// ConstructionQueue
// ---------------------------------------------------------------------------
describe("ConstructionQueue", () => {
  let queue: ConstructionQueue;

  beforeEach(() => { queue = new ConstructionQueue(); });

  it("next() returns null when queue is empty", () => {
    expect(queue.next()).toBeNull();
  });

  it("enqueue() returns the enqueued task", () => {
    const task = { type: "build_wall", plot: "A1" };
    const result = queue.enqueue(task);
    expect(result).toBe(task);
  });

  it("next() dequeues tasks in FIFO order", () => {
    const t1 = { id: 1 };
    const t2 = { id: 2 };
    queue.enqueue(t1);
    queue.enqueue(t2);
    expect(queue.next()).toBe(t1);
    expect(queue.next()).toBe(t2);
  });

  it("next() removes the task from the queue", () => {
    queue.enqueue({ id: 1 });
    queue.next();
    expect(queue.next()).toBeNull();
  });

  it("multiple enqueues and dequeues interleave correctly", () => {
    queue.enqueue({ id: "a" });
    queue.next();
    queue.enqueue({ id: "b" });
    expect(queue.next()?.id).toBe("b");
  });
});

// ---------------------------------------------------------------------------
// UpgradeSystem
// ---------------------------------------------------------------------------
describe("UpgradeSystem", () => {
  let upgrader: UpgradeSystem;

  beforeEach(() => { upgrader = new UpgradeSystem(); });

  it("upgrade() sets structure level to targetLevel when higher", () => {
    const structure = { level: 1 };
    upgrader.upgrade(structure, 3);
    expect(structure.level).toBe(3);
  });

  it("upgrade() does not downgrade below current level", () => {
    const structure = { level: 5 };
    upgrader.upgrade(structure, 2);
    expect(structure.level).toBe(5);
  });

  it("upgrade() to same level keeps level unchanged", () => {
    const structure = { level: 3 };
    upgrader.upgrade(structure, 3);
    expect(structure.level).toBe(3);
  });

  it("upgrade() returns the mutated structure", () => {
    const structure = { level: 1 };
    const result = upgrader.upgrade(structure, 4);
    expect(result).toBe(structure);
  });

  it("upgrade() defaults level from undefined to 1 before comparing", () => {
    const structure: any = {};
    upgrader.upgrade(structure, 2);
    expect(structure.level).toBe(2);
  });
});
