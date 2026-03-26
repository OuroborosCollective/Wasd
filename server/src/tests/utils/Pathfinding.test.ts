import { describe, it, expect } from "vitest";
import { Pathfinding, Point } from "../../utils/Pathfinding";

describe("Pathfinding utils", () => {
  it("should find a direct path when there are no obstacles", () => {
    const start: Point = { x: 0, y: 0 };
    const end: Point = { x: 3, y: 0 };
    const isObstacle = (x: number, y: number) => false;

    const path = Pathfinding.findPath(start, end, isObstacle);

    // Path should be (0,0) -> (1,0) -> (2,0) -> (3,0)
    expect(path).toHaveLength(4);
    expect(path[0]).toEqual({ x: 0, y: 0 });
    expect(path[path.length - 1]).toEqual({ x: 3, y: 0 });
  });

  it("should navigate around a simple obstacle", () => {
    const start: Point = { x: 0, y: 0 };
    const end: Point = { x: 2, y: 0 };

    // Obstacle at (1,0)
    const isObstacle = (x: number, y: number) => x === 1 && y === 0;

    const path = Pathfinding.findPath(start, end, isObstacle);

    // Path should avoid (1,0), so it might go (0,0) -> (1,1) -> (2,0) or similar
    expect(path[0]).toEqual({ x: 0, y: 0 });
    expect(path[path.length - 1]).toEqual({ x: 2, y: 0 });

    // Verify none of the path points are obstacles
    for (const point of path) {
      expect(isObstacle(point.x, point.y)).toBe(false);
    }
  });

  it("should return fallback linear path when destination is completely blocked", () => {
    const start: Point = { x: 0, y: 0 };
    const end: Point = { x: 2, y: 0 };

    // Block destination completely
    const isObstacle = (x: number, y: number) => {
      // Wall around destination
      if (x === 1 && y >= -1 && y <= 1) return true;
      if (x === 2 && (y === -1 || y === 1)) return true;
      if (x === 3 && y >= -1 && y <= 1) return true;
      return false;
    };

    const path = Pathfinding.findPath(start, end, isObstacle);

    // Fallback is [start, end]
    expect(path).toEqual([start, end]);
  });

  it("should return fallback linear path when max iterations are exceeded", () => {
    const start: Point = { x: 0, y: 0 };
    // Very far end point, maxIterations is 200, so this will trigger fallback
    const end: Point = { x: 1000, y: 1000 };

    const isObstacle = (x: number, y: number) => false;

    const path = Pathfinding.findPath(start, end, isObstacle);

    // Fallback is [start, end]
    expect(path).toEqual([start, end]);
  });

  it("should round start and end points correctly", () => {
    const start: Point = { x: 0.1, y: 0.4 }; // rounds to 0, 0
    const end: Point = { x: 0.9, y: 1.2 };   // rounds to 1, 1

    const isObstacle = (x: number, y: number) => false;

    const path = Pathfinding.findPath(start, end, isObstacle);

    expect(path[0]).toEqual({ x: 0, y: 0 });
    expect(path[path.length - 1]).toEqual({ x: 1, y: 1 });
  });
});
