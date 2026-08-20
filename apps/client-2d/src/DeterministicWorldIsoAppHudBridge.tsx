import { useState } from "react";
import {
  LiveAuthoritativeWorld2D,
  type Live2DRuntimeSnapshot,
} from "./LiveAuthoritativeWorld2D";
import { ArelorianStitchHud, type PlayerVitalsData } from "./ArelorianStitchHud";
import { useLiveRuntimeState } from "./live/liveRuntimeState";

type HudMessage = { from: string; txt: string };

const INITIAL_RUNTIME: Live2DRuntimeSnapshot = {
  phase: "mounting",
  connected: false,
  rendererStatus: "waiting",
  playerPos: null,
  visibleEntities: 0,
  serverTick: null,
  presentationSha256: null,
  renderProfile: null,
  error: null,
};

/**
 * Sentinel display values used only to suppress the old invented HUD percentages
 * until an authoritative vitals snapshot is available. They are deliberately
 * zero and must never be interpreted as player state.
 */
const UNKNOWN_VITALS: PlayerVitalsData = {
  hp: 0,
  maxHp: 1,
  mana: 0,
  maxMana: 1,
  stamina: 0,
  maxStamina: 1,
  xp: 0,
  maxXp: 1,
  level: 0,
};

export function DeterministicWorldIsoApp() {
  const [runtime, setRuntime] = useState<Live2DRuntimeSnapshot>(INITIAL_RUNTIME);
  const [messages, setMessages] = useState<HudMessage[]>([
    { from: "System", txt: "Waiting for authoritative server reality." },
  ]);
  const live = useLiveRuntimeState();

  function append(from: string, txt: string): void {
    setMessages((current) => [...current.slice(-7), { from, txt }]);
  }

  const playerName = live.characterName || live.playerId || "Awaiting server identity";
  const playerPos = live.playerPos ?? runtime.playerPos ?? undefined;
  const chunkCoords = live.chunkCoords ?? undefined;
  const connected = live.networkStatus === "connected" || runtime.connected;

  return (
    <>
      <LiveAuthoritativeWorld2D onRuntimeSnapshot={setRuntime} />
      <ArelorianStitchHud
        connected={connected}
        assetStatus={`${runtime.rendererStatus.toUpperCase()} · ${runtime.visibleEntities} LIVE ENTITIES · ${runtime.renderProfile ?? "DEFAULT"}`}
        weaponCount={0}
        equippedWeaponId={null}
        inventoryItems={[]}
        playerName={playerName}
        messages={messages}
        onSkill={(skillId) => {
          window.dispatchEvent(new CustomEvent("wasd:client-action", { detail: { action: "use_skill", payload: { skillId } } }));
          append("Skill", `${skillId.toUpperCase()} request forwarded to the canonical client-action bridge.`);
        }}
        onChat={(text) => append(playerName, text)}
        onInteract={() => {
          window.dispatchEvent(new CustomEvent("wasd:client-action", { detail: { action: "interact", payload: {} } }));
          append("World", "Interaction request forwarded to the server-authoritative bridge.");
        }}
        onStrike={() => {
          window.dispatchEvent(new CustomEvent("wasd:client-action", { detail: { action: "attack", payload: {} } }));
          append("Combat", "Attack request forwarded to the server-authoritative bridge.");
        }}
        onCycleWeapon={() => append("Inventory", "Waiting for authoritative equipment binding.")}
        onToggleAutoMove={() => append("System", "Auto-move is disabled in the read-only renderer; movement belongs to CanonicalIntent input.")}
        vitals={UNKNOWN_VITALS}
        debugPlayerPos={playerPos}
        debugChunkCoords={chunkCoords}
        debugVisibleChunks={live.visibleChunks ?? runtime.visibleEntities}
        debugHeartbeatReceived={live.heartbeatStatus === "ok"}
        debugInitialized={runtime.phase === "ready"}
        debugNetworkStatus={live.networkStatus}
        debugServerTick={live.serverTick ?? runtime.serverTick}
        debugAckSeq={live.acknowledgedInputSeq}
        debugIdentity={live.playerId ?? live.stableGuestId}
        debugCharacter={live.characterName}
      />
    </>
  );
}
