import { useState } from "react";
import {
  LiveAuthoritativeWorld2D,
  type Live2DRuntimeSnapshot,
} from "./LiveAuthoritativeWorld2D";
import { ArelorianStitchHud, type PlayerVitalsData } from "./ArelorianStitchHud";
import { useLiveRuntimeState } from "./live/liveRuntimeState";
import { deriveWorldBootStatus } from "./worldBootStatus";

type HudMessage = { from: string; txt: string };

const INITIAL_RUNTIME: Live2DRuntimeSnapshot = {
  phase: "mounting",
  connected: false,
  rendererStatus: "waiting",
  playerPos: null,
  visibleEntities: 0,
  resolvedAssetEntities: 0,
  missingPresentationEntities: 0,
  debugShapeEntities: 0,
  serverTick: null,
  presentationSha256: null,
  renderProfile: null,
  assetManifestLoaded: false,
  worldProjectionReady: false,
  activeWorldChunks: 0,
  resolvedWorldAssets: 0,
  missingWorldAssets: 0,
  worldSeed: null,
  worldHash: null,
  worldGenerator: null,
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
  const presentationState = runtime.missingPresentationEntities > 0
    ? `MISSING ${runtime.missingPresentationEntities}`
    : `${runtime.resolvedAssetEntities} ACTOR ASSETS`;
  const worldState = runtime.worldProjectionReady
    ? `${runtime.activeWorldChunks ?? 0} CHUNKS · ${runtime.resolvedWorldAssets ?? 0} WORLD ASSETS${(runtime.missingWorldAssets ?? 0) > 0 ? ` · ${runtime.missingWorldAssets} MISSING` : ""}`
    : "WORLD PROJECTION WAITING";
  const worldBootStatus = deriveWorldBootStatus(runtime, live.networkStatus, live.serverTick);
  const authoritativeTick = live.serverTick ?? runtime.serverTick;
  const hasServerEvidence = runtime.worldProjectionReady === true
    && (live.networkStatus === "connected" || runtime.connected)
    && typeof authoritativeTick === "number";

  return (
    <div data-testid="deterministic-world-root" data-boot-state={worldBootStatus} style={{ display: "contents" }}>
      <output
        data-testid="world-boot-status"
        data-server-evidence={hasServerEvidence ? "present" : "pending"}
        aria-live="polite"
        style={{
          position: "absolute",
          width: 1,
          height: 1,
          padding: 0,
          margin: -1,
          overflow: "hidden",
          clip: "rect(0, 0, 0, 0)",
          whiteSpace: "nowrap",
          border: 0,
        }}
      >
        World boot: {worldBootStatus}; renderer {runtime.rendererStatus}; network {live.networkStatus}; server tick {authoritativeTick ?? "pending"}; evidence {hasServerEvidence ? "present" : "pending"}.
      </output>
      <LiveAuthoritativeWorld2D onRuntimeSnapshot={setRuntime} />
      <ArelorianStitchHud
        connected={connected}
        assetStatus={`${runtime.rendererStatus.toUpperCase()} · ${runtime.visibleEntities} LIVE ENTITIES · ${presentationState} · ${worldState} · ${runtime.renderProfile ?? "DEFAULT"}`}
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
        debugVisibleChunks={runtime.activeWorldChunks ?? live.visibleChunks ?? runtime.visibleEntities}
        debugHeartbeatReceived={live.heartbeatStatus === "ok"}
        debugInitialized={runtime.phase === "ready" && runtime.worldProjectionReady === true}
        debugNetworkStatus={live.networkStatus}
        debugServerTick={live.serverTick ?? runtime.serverTick}
        debugAckSeq={live.acknowledgedInputSeq}
        debugIdentity={live.playerId ?? live.stableGuestId}
        debugCharacter={live.characterName}
      />
    </div>
  );
}
