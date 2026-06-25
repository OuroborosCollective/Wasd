import { useMemo, useState } from "react";
import {
  DeterministicWorldIsoApp as FutureRenderer,
  type FutureRendererRuntimeSnapshot,
} from "./DeterministicWorldIsoAppFuture";
import { ArelorianStitchHud, type PlayerVitalsData } from "./ArelorianStitchHud";

type HudMessage = { from: string; txt: string };

const INITIAL_RUNTIME: FutureRendererRuntimeSnapshot = {
  phase: "mounting",
  bootState: "waiting",
  rendererStatus: "waiting",
  playerPos: { x: 8, z: 9 },
  chunkCoords: { chunkX: 0, chunkZ: 0 },
  visibleChunks: 0,
  initialized: false,
  error: null,
};

function makeVitals(snapshot: FutureRendererRuntimeSnapshot): PlayerVitalsData {
  const travelLoad = Math.abs(snapshot.playerPos.x) + Math.abs(snapshot.playerPos.z);
  return {
    hp: snapshot.phase === "failed" ? 1 : 100,
    maxHp: 100,
    mana: snapshot.initialized ? 72 : 0,
    maxMana: 100,
    stamina: snapshot.initialized ? Math.max(64, 100 - (travelLoad % 28)) : 0,
    maxStamina: 100,
    xp: Math.min(100, snapshot.visibleChunks * 3),
    maxXp: 100,
    level: Math.max(1, 1 + Math.floor(snapshot.visibleChunks / 25)),
  };
}

export function DeterministicWorldIsoApp() {
  const [runtime, setRuntime] = useState<FutureRendererRuntimeSnapshot>(INITIAL_RUNTIME);
  const [messages, setMessages] = useState<HudMessage[]>([
    { from: "System", txt: "HUD bridge waiting for renderer runtime snapshot." },
  ]);

  const vitals = useMemo(() => makeVitals(runtime), [runtime]);

  function append(from: string, txt: string): void {
    setMessages((current) => [...current.slice(-7), { from, txt }]);
  }

  function handleRuntimeSnapshot(next: FutureRendererRuntimeSnapshot): void {
    setRuntime(next);
  }

  return (
    <>
      <FutureRenderer onRuntimeSnapshot={handleRuntimeSnapshot} />
      <ArelorianStitchHud
        connected={runtime.initialized}
        assetStatus={`${runtime.rendererStatus.toUpperCase()} · ${runtime.visibleChunks} CHUNKS`}
        weaponCount={0}
        equippedWeaponId={null}
        inventoryItems={[]}
        playerName="Architect"
        messages={messages}
        onSkill={(skillId) => append("Skill", `${skillId.toUpperCase()} requested; renderer snapshot is ${runtime.phase}.`)}
        onChat={(text) => append("Architect", text)}
        onInteract={() => append("World", runtime.initialized ? "Nearest local NPC interaction requested." : "Renderer not initialized yet.")}
        onStrike={() => append("Combat", runtime.initialized ? "Local strike preview requested." : "Renderer not initialized yet.")}
        onCycleWeapon={() => append("Inventory", "No weapon pool is currently bound to this renderer snapshot.")}
        onToggleAutoMove={() => {
          window.__wasd2dMove?.({ dx: 1, dz: 0 });
          append("System", "Move request sent to future renderer bridge.");
        }}
        vitals={vitals}
        debugPlayerPos={runtime.playerPos}
        debugChunkCoords={runtime.chunkCoords}
        debugVisibleChunks={runtime.visibleChunks}
        debugHeartbeatReceived={runtime.initialized}
        debugInitialized={runtime.initialized}
        debugNetworkStatus="waiting"
        debugServerTick={null}
        debugAckSeq={null}
        debugIdentity="future-hud-bridge"
        debugCharacter="Architect"
      />
    </>
  );
}
