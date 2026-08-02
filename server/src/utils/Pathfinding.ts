export interface Point {
  x: number;
  y: number;
}

class Node {
  constructor(
    public x: number,
    public y: number,
    public g: number = 0,
    public h: number = 0,
    public parent: Node | null = null
  ) {}

  get f(): number {
    return this.g + this.h;
  }
}

// Bolt: Fast non-allocating numeric coordinate hash instead of string template interpolation.
// Encodes two 16-bit coordinates into a single 32-bit integer to eliminate GC churn and map lookup overhead.
function nodeKey(x: number, y: number): number {
  return ((x & 0xffff) | ((y & 0xffff) << 16));
}

export class Pathfinding {
  private static readonly GRID_SIZE = 1.0; // 1 unit per grid cell

  /**
   * Simple A* implementation for grid-based movement
   */
  public static findPath(start: Point, end: Point, isObstacle: (x: number, y: number) => boolean): Point[] {
    const startNode = new Node(Math.round(start.x), Math.round(start.y));
    const endNode = new Node(Math.round(end.x), Math.round(end.y));

    const openList: Node[] = [startNode];
    const openMap: Map<number, Node> = new Map([[nodeKey(startNode.x, startNode.y), startNode]]);
    const closedList: Set<number> = new Set();

    const maxIterations = 200; // Prevent infinite loops
    let iterations = 0;

    while (openList.length > 0 && iterations < maxIterations) {
      iterations++;
      
      // Get node with lowest f cost
      let currentIndex = 0;
      for (let i = 1; i < openList.length; i++) {
        if (openList[i].f < openList[currentIndex].f) {
          currentIndex = i;
        }
      }

      const currentNode = openList[currentIndex];

      // Bolt: O(1) swap-and-pop array removal instead of slow O(N) splice.
      // Swapping the target element with the last element of the array and calling .pop()
      // avoids shifting subsequent array elements and reduces memory allocation.
      const lastIndex = openList.length - 1;
      if (currentIndex < lastIndex) {
        openList[currentIndex] = openList[lastIndex];
      }
      openList.pop();

      const currentKey = nodeKey(currentNode.x, currentNode.y);
      openMap.delete(currentKey);
      closedList.add(currentKey);

      // Reached destination
      if (Math.abs(currentNode.x - endNode.x) < 1 && Math.abs(currentNode.y - endNode.y) < 1) {
        const path: Point[] = [];
        let curr: Node | null = currentNode;
        while (curr) {
          path.push({ x: curr.x, y: curr.y });
          curr = curr.parent;
        }
        return path.reverse();
      }

      // Generate neighbors (8 directions)
      for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
          if (dx === 0 && dy === 0) continue;

          const nx = currentNode.x + dx;
          const ny = currentNode.y + dy;

          const neighborKey = nodeKey(nx, ny);
          if (closedList.has(neighborKey)) continue;
          if (isObstacle(nx, ny)) continue;

          // Diagonal movement cost is sqrt(2), straight is 1
          const g = currentNode.g + (dx !== 0 && dy !== 0 ? 1.414 : 1);
          const h = Math.abs(nx - endNode.x) + Math.abs(ny - endNode.y); // Manhattan distance
          
          const existingNode = openMap.get(neighborKey);
          if (existingNode) {
            if (g < existingNode.g) {
              existingNode.g = g;
              existingNode.parent = currentNode;
            }
          } else {
            const newNode = new Node(nx, ny, g, h, currentNode);
            openList.push(newNode);
            openMap.set(neighborKey, newNode);
          }
        }
      }
    }

    // No path found or limit reached, return linear path as fallback
    return [start, end];
  }
}
