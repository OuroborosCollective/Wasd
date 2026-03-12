export class DungeonGenerator {
  generate(seed: number) {
    const rooms = [];
    const roomCount = 4 + Math.floor(Math.abs(Math.sin(seed)) * 6);
    for (let i = 0; i < roomCount; i++) {
      rooms.push({
        id: i,
        type: this.randomRoom(seed + i),
        danger: 1 + (i % 5)
      });
    }
    return { seed, rooms };
  }

  randomRoom(seed: number) {
    const types = [
      "hall",
      "treasure_room",
      "monster_lair",
      "collapsed_passage",
      "ancient_shrine"
    ];
    return types[Math.abs(Math.floor(seed)) % types.length];
  }
}