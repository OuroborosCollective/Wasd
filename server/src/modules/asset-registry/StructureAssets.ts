export const StructureAssets = {
  castle_wall: {
    assetId: "castle_wall",
    type: "structure",
    model: "/assets/models/buildings/castle_wall.glb",
    collision: true
  },
  castle_gate: {
    assetId: "castle_gate",
    type: "interactive_structure",
    model: "/assets/models/buildings/castle_gate.glb",
    collision: true,
    states: ["open", "closed", "locked", "damaged", "destroyed"]
  },
  castle_watch_tower: {
    assetId: "castle_watch_tower",
    type: "defense_structure",
    model: "/assets/models/buildings/castle_watch_tower.glb",
    collision: true
  }
};