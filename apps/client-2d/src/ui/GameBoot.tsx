import React, { useEffect, useRef, useState } from "react";
import { BOOT_PHASES, type BootPhase } from "../theme/designTokens";
import { BootOverlay } from "./BootOverlay";
import { ARELORIA_BOOT_CONFIG, type AreloriaBootConfig } from "../boot/boot.config";
import { createLogicClock, type LogicTick } from "../logic/logicClock";
import { createInputBuffer, type InputBuffer } from "../logic/inputBuffer";
import { createPendingInputQueue, type PendingInputQueue } from "../logic/pendingInputQueue";
import { createClientWorld, type ClientWorld } from "../logic/clientWorld";
import { createNetworkClient, type NetworkStatus, type NetworkClient } from "../net/networkClient";
import { createSnapshotBuffer, type SnapshotBuffer } from "../net/snapshotBuffer";
import { createLatencyTracker, type LatencyTracker } from "../net/latencyTracker";
import { createServerClock, type ServerClock } from "../net/serverClock";
import { createPixiClient, type PixiClient } from "../engine/pixiClient";
import { createCombatFxStore, type CombatFxStore } from "../fx/combatFx";
import { MobileHud } from "./MobileHud";
import { DebugHud } from "./DebugHud";
import { VersionOverlay } from "./VersionOverlay";
import { ToastStack, type ClientToast } from "./ui/ToastStack";
import { ChatMiniPanel } from "./ui/ChatMiniPanel";
import { NetworkQualityHud } from "./ui/NetworkQualityHud";
import type { ChatMessagePayload } from "../net/protocol";

type BootPhaseState =
  | "BOOTING"
  | "CHECKING_DEVICE"
  | "CHECKING_SERVER"
  | "LOADING_ASSETS"
  | "CONNECTING_WORLD"
  | "SYNCING_TICK"
  | "READY"
  | "DEGRADED"
  | "OFFLINE"
  | "FATAL";

interface GameBootProps {
  onReady?: () => void;
  onDegraded?: () => void;
  onFatal?: (error: string) => void;
}

export function GameBoot({ onReady, onDegraded, onFatal }: GameBootProps): React.ReactElement {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [phase, setPhase] = useState<BootPhaseState>("BOOTING");
  const [message, setMessage] = useState("Initialisiere Areloria…");
  const [fatal, setFatal] = useState<string | null>(null);

  // Runtime state refs (not React state to avoid re-render storms)
  const configRef = useRef<AreloriaBootConfig>(ARELORIA_BOOT_CONFIG);
  const pixiRef = useRef<PixiClient | null>(null);
  const clockRef = useRef<ReturnType<typeof createLogicClock> | null>(null);
  const inputBufferRef = useRef<InputBuffer | null>(null);
  const pendingInputQueueRef = useRef<PendingInputQueue | null>(null);
  const clientWorldRef = useRef<ClientWorld | null>(null);
  const snapshotBufferRef = useRef<SnapshotBuffer | null>(null);
  const networkClientRef = useRef<NetworkClient | null>(null);
  const latencyTrackerRef = useRef<LatencyTracker | null>(null);
  const serverClockRef = useRef<ServerClock | null>(null);
  const combatFxRef = useRef<CombatFxStore | null>(null);

  const networkStatusRef = useRef<NetworkStatus>("idle");
  const mountedRef = useRef(false);
  const lastSnapshotTickRef = useRef<number>(0);
  const entityCountRef = useRef<number>(0);
  const pendingInputCountRef = useRef<number>(0);
  const lastSequenceIdRef = useRef<number>(0);
  const acknowledgedInputSeqRef = useRef<number>(0);
  const rttMsRef = useRef<number>(0);
  const networkQualityRef = useRef<"offline" | "poor" | "ok" | "good">("offline");
  const serverOffsetMsRef = useRef<number>(0);
  const toastsRef = useRef<ClientToast[]>([]);
  const chatMessagesRef = useRef<ChatMessagePayload[]>([]);

  // Force re-render for UI overlays
  const [, forceUpdate] = useState(0);
  const triggerUpdate = () => forceUpdate((n) => n + 1);

  // Keyboard state for WASD
  const keysRef = useRef<Set<string>>(new Set());

  // Toast helper
  function addToast(message: string, severity: ClientToast["severity"] = "info"): void {
    const toast: ClientToast = {
      id: `toast_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      message,
      severity,
      createdAtMs: Date.now()
    };
    toastsRef.current = [...toastsRef.current.slice(-8), toast];
    triggerUpdate();

    // Auto-remove after 4200ms
    setTimeout(() => {
      toastsRef.current = toastsRef.current.filter((t) => t.id !== toast.id);
      triggerUpdate();
    }, 4200);
  }

  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if (["w", "a", "s", "d", "arrowup", "arrowdown", "arrowleft", "arrowright"].includes(key)) {
        e.preventDefault();
        keysRef.current.add(key);
        updateKeyboardInput();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      keysRef.current.delete(key);
      updateKeyboardInput();
    };

    function updateKeyboardInput() {
      const input = inputBufferRef.current;
      if (!input) return;

      let x = 0;
      let y = 0;

      if (keysRef.current.has("a") || keysRef.current.has("arrowleft")) x -= 1;
      if (keysRef.current.has("d") || keysRef.current.has("arrowright")) x += 1;
      if (keysRef.current.has("w") || keysRef.current.has("arrowup")) y -= 1;
      if (keysRef.current.has("s") || keysRef.current.has("arrowdown")) y += 1;

      input.setMove(x, y);
    }

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, []);

  useEffect(() => {
    let disposed = false;
    mountedRef.current = true;

    async function boot() {
      try {
        // Phase 1: BOOTING
        setPhase("BOOTING");
        setMessage("Starte Areloria Client…");

        await new Promise((resolve) => setTimeout(resolve, 300));
        if (disposed) return;

        // Phase 2: CHECKING_DEVICE
        setPhase("CHECKING_DEVICE");
        setMessage("Prüfe Gerät, WebGL und Browser-Fähigkeiten…");

        const healthResult = await runDeviceHealthCheck();
        if (disposed) return;

        if (!healthResult.ok) {
          setPhase("DEGRADED");
          setMessage(healthResult.reason);
          onDegraded?.();
          return;
        }

        // Phase 3: CHECKING_SERVER
        setPhase("CHECKING_SERVER");
        setMessage("Prüfe Server-Verbindung…");

        const serverOk = await checkServerHealth();
        if (disposed) return;

        if (!serverOk) {
          setPhase("OFFLINE");
          setMessage("Server nicht erreichbar. Starte im Offline-Modus.");
          onDegraded?.();
        }

        // Phase 4: LOADING_ASSETS (minimal - PIXI assets are simple)
        setPhase("LOADING_ASSETS");
        setMessage("Lade Spiel-Assets…");
        await new Promise((resolve) => setTimeout(resolve, 200));
        if (disposed) return;

        // Phase 5: CONNECTING_WORLD - Initialize PIXI
        setPhase("CONNECTING_WORLD");
        setMessage("Verbinde mit der Spielwelt…");

        const mount = mountRef.current;
        if (!mount) {
          throw new Error("Mount element not found");
        }

        const config = configRef.current;
        const pixi = await createPixiClient({
          mount,
          maxFps: config.renderMaxFps,
          theme: config.design.theme,
          chunkSize: config.world.chunkSize,
          interpolationMs: config.world.interpolationMs
        });
        pixiRef.current = pixi;
        if (disposed) return;

        // Initialize Phase 3 systems
        const inputBuffer = createInputBuffer();
        inputBufferRef.current = inputBuffer;

        const pendingInputQueue = createPendingInputQueue();
        pendingInputQueueRef.current = pendingInputQueue;

        const snapshotBuffer = createSnapshotBuffer();
        snapshotBufferRef.current = snapshotBuffer;

        const latencyTracker = createLatencyTracker();
        latencyTrackerRef.current = latencyTracker;

        const serverClock = createServerClock();
        serverClockRef.current = serverClock;

        const combatFx = createCombatFxStore();
        combatFxRef.current = combatFx;

        const clientWorld = createClientWorld({
          spawnX: 0,
          spawnY: 0,
          playerSpeed: 80 // units per second
        });
        clientWorldRef.current = clientWorld;

        // Connect network with Phase 3 events
        const network = createNetworkClient(config, {
          onStatusChange(status) {
            networkStatusRef.current = status;
            triggerUpdate();
          },
          onWelcome(payload) {
            clientWorld.setLocalPlayerId(payload.playerId);
            serverClock.observe(payload.serverTick);
            addToast("Willkommen in Areloria", "success");
          },
          onWorldSnapshot(snapshot) {
            snapshotBuffer.push(snapshot);

            // Acknowledge pending inputs
            if (snapshot.acknowledgedInputSeq !== undefined) {
              pendingInputQueue.acknowledge(snapshot.acknowledgedInputSeq);
              acknowledgedInputSeqRef.current = snapshot.acknowledgedInputSeq;
            }

            // Apply snapshot with pending inputs for reconciliation
            clientWorld.applySnapshot(
              snapshot,
              pendingInputQueue.getPending(),
              1 / config.logicHz
            );

            lastSnapshotTickRef.current = snapshot.serverTick;
            entityCountRef.current = clientWorld.getEntityCount();
            pendingInputCountRef.current = pendingInputQueue.getPendingCount();
            triggerUpdate();
          },
          onCombatResult(result) {
            combatFx.push(result);
            if (result.kind === "damage" && result.amount !== undefined) {
              addToast(`${result.amount} Schaden!`, "warning");
            }
          },
          onToast(payload) {
            addToast(
              payload.message,
              (payload.severity as ClientToast["severity"]) ?? "info"
            );
          },
          onChatMessage(payload) {
            chatMessagesRef.current = [...chatMessagesRef.current.slice(-24), payload];
            triggerUpdate();
          },
          onServerHeartbeat(payload) {
            serverClock.observe(payload.serverTick, payload.serverTimeMs);
            serverOffsetMsRef.current = serverClock.getServerTimeOffsetMs();
            triggerUpdate();

            if (payload.clientSentAtMs !== undefined) {
              latencyTracker.markPong(payload.clientSentAtMs, Date.now());
              rttMsRef.current = latencyTracker.getRttMs();
              networkQualityRef.current = latencyTracker.getQuality();
              triggerUpdate();
            }
          }
        });
        networkClientRef.current = network;

        // Phase 6: SYNCING_TICK - Start logic clock
        setPhase("SYNCING_TICK");
        setMessage("Synchronisiere Spielzustand…");

        // Spawn local player immediately for offline/degraded mode
        clientWorld.spawnLocalPlayer();

        // Start network connection (non-blocking, will reconnect automatically)
        network.connect();

        // Create logic clock at 10Hz
        const clock = createLogicClock({
          hz: config.logicHz,
          onTick(logicTick: LogicTick) {
            if (!mountedRef.current) return;

            // 1. Consume input for this tick
            const input = inputBuffer.consumeForTick(logicTick.tickId);

            // 2. Push to pending queue
            pendingInputQueue.push(input);
            lastSequenceIdRef.current = input.sequenceId;
            pendingInputCountRef.current = pendingInputQueue.getPendingCount();

            // 3. Apply to local player
            clientWorld.applyInput(input, logicTick.fixedDtSec);

            // 4. Send to network
            network.sendInputFrame(input);

            // 5. If skill cast, send skill message
            if (input.skill1) {
              network.sendSkillCast({
                sequenceId: input.sequenceId,
                tickId: input.tickId,
                skillId: "impact_buster",
                x: clientWorld.localPlayerId ? 0 : 0,
                y: clientWorld.localPlayerId ? 0 : 0,
                clientTimeMs: input.clientTimeMs
              });
            }

            // 6. Step combat FX
            combatFx.step();

            // 7. Get view state
            const viewState = clientWorld.getViewState();
            entityCountRef.current = viewState.entities.length;

            // 8. Render
            if (pixiRef.current) {
              pixiRef.current.logicTick(
                { tickId: logicTick.tickId, fixedDtSec: logicTick.fixedDtSec },
                viewState,
                combatFx.getAll()
              );
            }

            triggerUpdate();
          }
        });

        clockRef.current = clock;
        clock.start();

        if (disposed) {
          clock.stop();
          return;
        }

        document.body.dataset.areloriaBoot = "ready";
        setPhase("READY");
        setMessage("Areloria ist bereit.");
        onReady?.();
      } catch (error) {
        console.error("[Areloria Boot]", error);
        const errorMessage = error instanceof Error ? error.message : String(error);
        setPhase("FATAL");
        setFatal(errorMessage);
        onFatal?.(errorMessage);
      }
    }

    boot();

    return () => {
      disposed = true;
      mountedRef.current = false;

      if (clockRef.current) {
        clockRef.current.stop();
      }
      if (pixiRef.current) {
        pixiRef.current.destroy();
      }
    };
  }, [onReady, onDegraded, onFatal]);

  const config = configRef.current;
  const tickId = clockRef.current?.getTickId() ?? 0;
  const localPlayerId = clientWorldRef.current?.localPlayerId ?? "pending";
  const networkStatus = networkStatusRef.current;
  const entityCount = entityCountRef.current;
  const lastSnapshotTick = lastSnapshotTickRef.current;
  const pendingInputCount = pendingInputCountRef.current;
  const lastSequenceId = lastSequenceIdRef.current;
  const acknowledgedInputSeq = acknowledgedInputSeqRef.current;
  const rttMs = rttMsRef.current;
  const networkQuality = networkQualityRef.current;
  const serverOffsetMs = serverOffsetMsRef.current;
  const toasts = toastsRef.current;
  const chatMessages = chatMessagesRef.current;

  return (
    <div style={{ width: "100%", height: "100%", position: "relative" }}>
      <div
        ref={mountRef}
        id="areloria-pixi-root"
        style={{
          position: "fixed",
          inset: 0,
          width: "100vw",
          height: "100dvh",
          overflow: "hidden"
        }}
      />

      {phase !== "READY" && (
        <BootOverlay
          phase={phase as BootPhase}
          message={message}
          fatal={fatal}
        />
      )}

      {/* Mobile touch controls - always visible */}
      {inputBufferRef.current && <MobileHud input={inputBufferRef.current} />}

      {/* Toast notifications */}
      {toasts.length > 0 && <ToastStack toasts={toasts} />}

      {/* Chat mini panel */}
      {phase === "READY" && (
        <ChatMiniPanel
          messages={chatMessages}
          onSend={(text) => networkClientRef.current?.sendChat(text)}
        />
      )}

      {/* Debug HUD - only in dev mode */}
      <DebugHud
        config={config}
        bootPhase={phase}
        networkStatus={networkStatus}
        tickId={tickId}
        entityCount={entityCount}
        localPlayerId={localPlayerId}
        lastSnapshotTick={lastSnapshotTick}
        pendingInputCount={pendingInputCount}
        lastSequenceId={lastSequenceId}
        acknowledgedInputSeq={acknowledgedInputSeq}
        rttMs={rttMs}
        networkQuality={networkQuality}
        serverOffsetMs={serverOffsetMs}
      />

      {/* Network quality HUD - only in dev mode */}
      {config.design.showDebugHud && (
        <NetworkQualityHud
          rttMs={rttMs}
          quality={networkQuality}
          pendingInputs={pendingInputCount}
          lastSequenceId={lastSequenceId}
          acknowledgedInputSeq={acknowledgedInputSeq}
          serverTick={lastSnapshotTick}
          serverOffsetMs={serverOffsetMs}
        />
      )}

      {/* Version overlay */}
      <VersionOverlay config={config} />
    </div>
  );
}

interface HealthCheckResult {
  ok: boolean;
  reason: string;
}

async function runDeviceHealthCheck(): Promise<HealthCheckResult> {
  try {
    const canvas = document.createElement("canvas");
    const gl =
      canvas.getContext("webgl2") ??
      canvas.getContext("webgl") ??
      canvas.getContext("experimental-webgl");

    if (!gl) {
      return { ok: false, reason: "WebGL ist auf diesem Gerät nicht verfügbar." };
    }

    if (!navigator.onLine) {
      return { ok: false, reason: "Gerät ist offline." };
    }

    if (window.innerWidth < 320 || window.innerHeight < 240) {
      return { ok: false, reason: "Viewport zu klein für Areloria." };
    }

    return { ok: true, reason: "Gerät bereit." };
  } catch (error) {
    return {
      ok: false,
      reason: error instanceof Error ? error.message : "Unbekannter Fehler"
    };
  }
}

async function checkServerHealth(): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const response = await fetch("/health", {
      method: "GET",
      signal: controller.signal
    });

    clearTimeout(timeoutId);
    return response.ok;
  } catch {
    console.warn("[Areloria Boot] Server health check failed, continuing anyway");
    return true;
  }
}