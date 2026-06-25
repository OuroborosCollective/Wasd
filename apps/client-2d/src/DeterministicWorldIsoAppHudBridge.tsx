import { useMemo, useState } from "react";
import { DeterministicWorldIsoApp as FutureRenderer } from "./DeterministicWorldIsoAppFuture";
import { ArelorianStitchHud, type PlayerVitalsData } from "./ArelorianStitchHud";

const CHUNK_TILES = 16;
const START_POS = { x: 8, z: 9 };

type HudMessage = { from: string; txt: string };

function chunkCoord(tile: number): number {
  return Math.floor(tile / CHUNK_TILES);
}

function makeVitals(chunkCount: number, pos: { x: number; z: number }): PlayerVitalsData {
  const travelLoad = Math.abs(pos.x) + Math.abs(pos.z);
  return {
    hp: 100,
    maxHp: 100,
    mana: 72,
    maxMana: 100,
    stamina: Math.max(64, 100 - (travelLoad % 28)),
    maxStamina: 100,
    xp: Math.min(100, chunkCount * 3),
    maxXp: 100,
    level: Math.max(1, 1 + Math.floor(chunkCount / 25)),
  };
}

export function DeterministicWorldIsoApp() {
  const [pos, setPos] = useState(START_POS);
  const [messages, setMessages] = useState<HudMessage[]>([
    { from: "System", txt: "HUD bridge online. Future renderer remains the authoritative visual world." },
  ]);

  const chunkCoords = useMemo(() => ({ chunkX: chunkCoord(pos.x), chunkZ: chunkCoord(pos.z) }), [pos.x, pos.z]);
  const visibleChunks = 25;
  const vitals = useMemo(() => makeVitals(visibleChunks, pos), [pos.x, pos.z]);

  function append(from: string, txt: string): void {
    setMessages((current) => [...current.slice(-7), { from, txt }]);
  }

  function nudge(dx: number, dz: number): void {
    window.__wasd2dMove?.({ dx, dz });
    setPos((current) => ({ x: current.x + dx, z: current.z + dz }));
  }

  return (
    <>
      <FutureRenderer />
      <ArelorianStitchHud
        connected={true}
        assetStatus={`LOCAL PLAN · ${visibleChunks} CHUNKS`}
        weaponCount={0}
        equippedWeaponId={null}
        inventoryItems={[]}
        playerName="Architect"
        messages={messages}
        onSkill={(skillId) => append("Skill", `${skillId.toUpperCase()} queued in local HUD bridge.`)}
        onChat={(text) => append("Architect", text)}
        onInteract={() => append("World", "Nearest local NPC interaction queued.")}
        onStrike={() => append("Combat", "Local strike preview pulse emitted.")}
        onCycleWeapon={() => append("Inventory", "No weapon pool bound to this preview bridge yet.")}
        onToggleAutoMove={() => {
          nudge(1, 0);
          append("System", "HUD bridge nudged the future renderer east.");
        }}
        vitals={vitals}
        debugPlayerPos={pos}
        debugChunkCoords={chunkCoords}
        debugVisibleChunks={visibleChunks}
        debugHeartbeatReceived={true}
        debugInitialized={true}
        debugNetworkStatus="connected"
        debugServerTick={null}
        debugAckSeq={null}
        debugIdentity="future-hud-bridge"
        debugCharacter="Architect"
      />
    </>
  );
}
