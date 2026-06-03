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
// Phase 4 Game Modules
import { createInventory, type InventoryState, applyInventoryEvent } from "../game/inventory";
import { createEquipment, type EquipmentState, applyEquipmentEvent } from "../game/equipment";
import { createInitialQuests, type QuestState, applyQuestEvent } from "../game/quests";
import { createSkillStates, type SkillId, tickSkillCooldowns, canUseSkill, triggerSkillCooldown } from "../game/skills";
import { createGameplayEventQueue, type GameplayEventQueue } from "../game/gameplayEvents";
import { findNearestInteractionTarget } from "../game/interactions";
import { createChunkObserver } from "../world/chunkObserver";
// Phase 4 UI Components
import { MobileActionBar } from "./MobileActionBar";
import { InventoryPanel } from "./InventoryPanel";
import { EquipmentPanel } from "./EquipmentPanel";
import { QuestJournal } from "./QuestJournal";
import { InteractionPrompt } from "./InteractionPrompt";
// Phase 5 Game Modules
import { createDialogueState, type DialogueState, openDialogue, closeDialogue } from "../game/dialogue";
import { createLootFeedStore, type LootFeedStore } from "../game/loot";
import { createCombatLogStore, type CombatLogStore } from "../game/combat";
import { createChunkSnapshotStore, type ChunkSnapshotStore } from "../world/chunkSnapshot";
// Phase 5 UI Components
import { NpcDialoguePanel } from "./NpcDialoguePanel";
import { LootFeed } from "./LootFeed";
import { CombatLog } from "./CombatLog";
// Phase 7 Identity Modules
import { getOrCreateClientIdentity, resetClientIdentityForDebug } from "../identity/clientIdentity";
import { getClientSessionToken, setClientSessionToken } from "../identity/sessionToken";
import { getSelectedCharacterId, setSelectedCharacterId, type ClientCharacterSummary } from "../identity/characterSelection";
// Phase 7 UI Components
import { IdentityDebugPanel } from "./IdentityDebugPanel";
import { CharacterSelectPanel } from "./CharacterSelectPanel";

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

  // Phase 4 Gameplay State Refs
  const inventoryRef = useRef<InventoryState | null>(null);
  const equipmentRef = useRef<EquipmentState | null>(null);
  const questsRef = useRef<QuestState[]>([]);
  const skillsRef = useRef<ReturnType<typeof createSkillStates> | null>(null);
  const gameplayEventQueueRef = useRef<GameplayEventQueue | null>(null);
  const chunkObserverRef = useRef<ReturnType<typeof createChunkObserver> | null>(null);
  const interactionTargetRef = useRef<{ entityId: string; kind: "npc" | "loot"; label: string; distance: number } | null>(null);
  const observedChunkCountRef = useRef<number>(0);

  // Phase 5 Gameplay State Refs
  const dialogueStateRef = useRef<DialogueState>(createDialogueState());
  const lootFeedStoreRef = useRef<LootFeedStore | null>(null);
  const combatLogStoreRef = useRef<CombatLogStore | null>(null);
  const chunkSnapshotStoreRef = useRef<ChunkSnapshotStore | null>(null);
  const gameplayStateVersionRef = useRef<number>(0);

  // Phase 4 UI State
  const [inventoryOpen, setInventoryOpen] = useState(false);
  const [equipmentOpen, setEquipmentOpen] = useState(false);
  const [questOpen, setQuestOpen] = useState(false);
  // UI display values (updated periodically)
  const [inventoryCount, setInventoryCount] = useState(0);
  const [trackedQuestTitle, setTrackedQuestTitle] = useState<string | undefined>(undefined);

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
  const gameplayEventQueueSizeRef = useRef<number>(0);

  // Phase 7: Identity State
  const identityRef = useRef(getOrCreateClientIdentity());
  const [stableGuestId] = useState(identityRef.current.stableGuestId);
  const [sessionToken, setSessionTokenState] = useState<string | null>(
    getClientSessionToken().token
  );
  const [identityStatus, setIdentityStatus] = useState<string>("initializing");
  const [characterId, setCharacterId] = useState<string>("");
  const [characterName, setCharacterName] = useState<string>("");
  const [characters, setCharacters] = useState<ClientCharacterSummary[]>([]);
  const [characterSelectOpen, setCharacterSelectOpen] = useState(false);
  const [identityDebugOpen, setIdentityDebugOpen] = useState(false);

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

        // Phase 7: Identity fields for network
        const identity = {
          stableGuestId: identityRef.current.stableGuestId,
          sessionToken: getClientSessionToken().token ?? undefined,
          selectedCharacterId: getSelectedCharacterId()
        };

        // Connect network with Phase 7 events
        const network = createNetworkClient(config, {
          onStatusChange(status) {
            networkStatusRef.current = status;
            triggerUpdate();
          },
          onWelcome(payload) {
            clientWorld.setLocalPlayerId(payload.playerId);
            serverClock.observe(payload.serverTick);

            // Phase 7: Handle identity from server
            if (payload.sessionToken) {
              setClientSessionToken(payload.sessionToken);
              setSessionTokenState(payload.sessionToken);
            }
            if (payload.characterId) {
              setSelectedCharacterId(payload.characterId);
              setCharacterId(payload.characterId);
            }
            if (payload.characterName) {
              setCharacterName(payload.characterName);
            }
            if (payload.resumed) {
              setIdentityStatus("resumed");
              addToast("Sitzung wiederhergestellt", "success");
            } else {
              setIdentityStatus("guest");
              addToast("Willkommen in Areloria", "success");
            }
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
            combatLogStoreRef.current?.push(result);
            if (result.kind === "damage" && result.amount !== undefined) {
              addToast(`${result.amount} Schaden!`, "warning");
            }
            triggerUpdate();
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
          },
          // Phase 4 Event Handlers
          onInventorySnapshot(payload) {
            if (inventoryRef.current) {
              inventoryRef.current = applyInventoryEvent(inventoryRef.current, {
                type: "inventory_set",
                slots: payload.slots
              });
              triggerUpdate();
            }
          },
          onEquipmentSnapshot(payload) {
            if (equipmentRef.current) {
              equipmentRef.current = applyEquipmentEvent(equipmentRef.current, {
                type: "equipment_set",
                slots: payload.slots
              });
              triggerUpdate();
            }
          },
          onQuestSnapshot(payload) {
            questsRef.current = applyQuestEvent(questsRef.current, {
              type: "quest_snapshot",
              quests: payload.quests
            });
            triggerUpdate();
          },
          onLootPickupResult(payload) {
            if (payload.ok && payload.itemId) {
              lootFeedStoreRef.current?.push(payload.itemId, payload.quantity ?? 1);
              gameplayEventQueueRef.current?.push({
                type: "loot_pickup_confirmed",
                itemId: payload.itemId,
                quantity: payload.quantity ?? 1,
                entityId: payload.entityId
              });
              addToast(`+${payload.quantity ?? 1}x ${payload.itemId}`, "success");
            } else if (payload.reason) {
              addToast(payload.reason, "warning");
            }
            triggerUpdate();
          },
          onNpcDialogue(payload) {
            dialogueStateRef.current = openDialogue(dialogueStateRef.current, {
              npcId: payload.npcId,
              npcName: payload.npcName,
              text: payload.text
            });
            addToast(`${payload.npcName}: ${payload.text.slice(0, 60)}...`, "info");
            triggerUpdate();
          },
          // Phase 5 Event Handlers
          onServerError(payload) {
            addToast(`Server: ${payload.message}`, "error");
          },
          onSkillResult(payload) {
            if (!payload.ok && payload.reason) {
              addToast(`Skill: ${payload.reason}`, "warning");
            } else if (payload.ok) {
              addToast(`Skill ${payload.skillId} aktiviert`, "info");
            }
          },
          onChunkSnapshot(payload) {
            chunkSnapshotStoreRef.current?.apply(payload);
            triggerUpdate();
          },
          // Phase 7 Event Handlers
          onCharacterList(payload) {
            setCharacters(payload.characters);
            triggerUpdate();
          },
          onCharacterSelectResult(payload) {
            if (payload.ok && payload.character) {
              setSelectedCharacterId(payload.character.id);
              setCharacterId(payload.character.id);
              setCharacterName(payload.character.name);
              addToast(`Character ${payload.character.name} ausgewählt`, "success");
            } else if (payload.reason) {
              addToast(`Auswahl fehlgeschlagen: ${payload.reason}`, "error");
            }
            setCharacterSelectOpen(false);
            triggerUpdate();
          },
          onCharacterCreateResult(payload) {
            if (payload.ok && payload.character) {
              setCharacters((prev) => [...prev, payload.character!]);
              setSelectedCharacterId(payload.character.id);
              setCharacterId(payload.character.id);
              setCharacterName(payload.character.name);
              addToast(`Character ${payload.character.name} erstellt`, "success");
            } else if (payload.reason) {
              addToast(`Erstellung fehlgeschlagen: ${payload.reason}`, "error");
            }
            setCharacterSelectOpen(false);
            triggerUpdate();
          },
          onOwnershipError(payload) {
            addToast(`Ownership: ${payload.message}`, "error");
          }
        }, identity);
        networkClientRef.current = network;

        // Phase 4: Initialize Gameplay Systems
        inventoryRef.current = createInventory(24);
        equipmentRef.current = createEquipment();
        questsRef.current = createInitialQuests();
        skillsRef.current = createSkillStates();
        gameplayEventQueueRef.current = createGameplayEventQueue();
        chunkObserverRef.current = createChunkObserver({
          chunkSize: config.world.chunkSize,
          radius: config.world.observerRadiusChunks
        });

        // Phase 5: Initialize Server Contract Stores
        lootFeedStoreRef.current = createLootFeedStore(12);
        combatLogStoreRef.current = createCombatLogStore(30);
        chunkSnapshotStoreRef.current = createChunkSnapshotStore(128);

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

            // Phase 4: Tick skill cooldowns
            if (skillsRef.current) {
              skillsRef.current = tickSkillCooldowns(skillsRef.current);
            }

            // 7. Get view state
            const viewState = clientWorld.getViewState();
            entityCountRef.current = viewState.entities.length;

            // Phase 4: Find interaction target
            const localPlayer = viewState.entities.find(e => e.id === viewState.localPlayerId);
            if (localPlayer) {
              interactionTargetRef.current = findNearestInteractionTarget(
                localPlayer,
                viewState.entities,
                80
              );

              // Phase 4: Update chunk observer
              const chunkObserve = chunkObserverRef.current?.update(localPlayer.x, localPlayer.y);
              if (chunkObserve) {
                network.sendChunkObserve(chunkObserve);
                observedChunkCountRef.current = chunkObserve.chunks.length;
              }
            }

            // Phase 4: Drain and process gameplay events
            const events = gameplayEventQueueRef.current?.drain() ?? [];
            gameplayEventQueueSizeRef.current = events.length;

            for (const event of events) {
              if (inventoryRef.current) {
                inventoryRef.current = applyInventoryEvent(inventoryRef.current, event as never);
              }
              if (equipmentRef.current) {
                equipmentRef.current = applyEquipmentEvent(equipmentRef.current, event as never);
              }
              questsRef.current = applyQuestEvent(questsRef.current, event as never);
            }

            // Phase 4: Update UI display values
            if (inventoryRef.current) {
              const count = inventoryRef.current.slots.reduce((sum, slot) => sum + (slot.stack?.quantity ?? 0), 0);
              if (count !== inventoryCount) setInventoryCount(count);
            }
            const tracked = questsRef.current.find(q => q.tracked);
            if (tracked?.title !== trackedQuestTitle) {
              setTrackedQuestTitle(tracked?.title);
            }

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
  const skills = skillsRef.current;
  const inventory = inventoryRef.current;
  const equipment = equipmentRef.current;
  const quests = questsRef.current;
  const interactionTarget = interactionTargetRef.current;
  const observedChunkCount = observedChunkCountRef.current;
  const gameplayEventQueueSize = gameplayEventQueueSizeRef.current;
  const dialogueState = dialogueStateRef.current;
  const lootFeedEntries = lootFeedStoreRef.current?.getAll() ?? [];
  const combatLogEntries = combatLogStoreRef.current?.getAll() ?? [];
  const chunkSnapshotCount = chunkSnapshotStoreRef.current?.size() ?? 0;
  const gameplayStateVersion = gameplayStateVersionRef.current;

  // Phase 4 Action Handlers
  function handleSkill(skillId: SkillId) {
    const tickId = clockRef.current?.getTickId() ?? 0;
    const sequenceId = lastSequenceIdRef.current + 1;

    if (!canUseSkill(skillsRef.current ?? {}, skillId)) {
      return;
    }

    // Trigger cooldown locally
    if (skillsRef.current) {
      skillsRef.current = triggerSkillCooldown(skillsRef.current, skillId);
    }

    // Push gameplay event
    gameplayEventQueueRef.current?.push({
      type: "skill_requested",
      tickId,
      skillId
    });

    // Send to network
    networkClientRef.current?.sendSkillCast({
      sequenceId,
      tickId,
      skillId: skillId === "impact_buster" ? "impact_buster" : "primary",
      x: 0,
      y: 0,
      clientTimeMs: Date.now()
    });

    triggerUpdate();
  }

  function handleInteract() {
    if (!interactionTarget) return;

    const tickId = clockRef.current?.getTickId() ?? 0;
    const sequenceId = lastSequenceIdRef.current + 1;

    if (interactionTarget.kind === "loot") {
      networkClientRef.current?.sendLootPickupRequest({
        tickId,
        sequenceId,
        entityId: interactionTarget.entityId
      });
      gameplayEventQueueRef.current?.push({
        type: "loot_pickup_requested",
        tickId,
        entityId: interactionTarget.entityId
      });
    } else if (interactionTarget.kind === "npc") {
      networkClientRef.current?.sendNpcInteractRequest({
        tickId,
        sequenceId,
        npcId: interactionTarget.entityId
      });
      gameplayEventQueueRef.current?.push({
        type: "npc_interaction_requested",
        tickId,
        npcId: interactionTarget.entityId
      });
    }

    triggerUpdate();
  }

  function handleQuestTrack(questId: string) {
    networkClientRef.current?.sendQuestTrack(questId);
    questsRef.current = applyQuestEvent(questsRef.current, {
      type: "quest_track",
      questId
    });
    triggerUpdate();
  }

  function handleDialogueClose() {
    dialogueStateRef.current = closeDialogue(dialogueStateRef.current);
    triggerUpdate();
  }

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
        inventoryCount={inventoryCount}
        trackedQuestTitle={trackedQuestTitle}
        observedChunkCount={observedChunkCount}
        gameplayEventQueueSize={gameplayEventQueueSize}
        dialogueOpen={dialogueState.active !== null}
        combatLogCount={combatLogEntries.length}
        chunkSnapshotCount={chunkSnapshotCount}
        gameplayStateVersion={gameplayStateVersion}
        onOpenIdentityDebug={() => setIdentityDebugOpen(true)}
        onOpenCharacterSelect={() => setCharacterSelectOpen(true)}
        stableGuestId={stableGuestId}
        characterId={characterId}
        identityStatus={identityStatus}
      />

      {/* Phase 4: Mobile Action Bar */}
      {phase === "READY" && skills && (
        <MobileActionBar
          skills={skills}
          onSkill={handleSkill}
          onInventory={() => setInventoryOpen(true)}
          onQuest={() => setQuestOpen(true)}
          onEquipment={() => setEquipmentOpen(true)}
        />
      )}

      {/* Phase 4: Inventory Panel */}
      {inventory && (
        <InventoryPanel
          open={inventoryOpen}
          inventory={inventory}
          onClose={() => setInventoryOpen(false)}
        />
      )}

      {/* Phase 4: Equipment Panel */}
      {equipment && (
        <EquipmentPanel
          open={equipmentOpen}
          equipment={equipment}
          onClose={() => setEquipmentOpen(false)}
        />
      )}

      {/* Phase 4: Quest Journal */}
      <QuestJournal
        open={questOpen}
        quests={quests}
        onClose={() => setQuestOpen(false)}
        onTrack={handleQuestTrack}
      />

      {/* Phase 4: Interaction Prompt */}
      <InteractionPrompt
        target={interactionTarget}
        onInteract={handleInteract}
      />

      {/* Phase 5: NPC Dialogue Panel */}
      <NpcDialoguePanel
        dialogue={dialogueState}
        onClose={handleDialogueClose}
      />

      {/* Phase 5: Loot Feed */}
      <LootFeed entries={lootFeedEntries} />

      {/* Phase 5: Combat Log */}
      <CombatLog entries={combatLogEntries} />

      {/* Phase 7: Character Select Panel */}
      <CharacterSelectPanel
        open={characterSelectOpen}
        characters={characters}
        selectedCharacterId={getSelectedCharacterId()}
        onSelect={(characterId) => {
          networkClientRef.current?.sendCharacterSelect(characterId);
        }}
        onCreate={(name) => {
          networkClientRef.current?.sendCharacterCreate(name);
        }}
        onClose={() => setCharacterSelectOpen(false)}
      />

      {/* Phase 7: Identity Debug Panel */}
      <IdentityDebugPanel
        open={identityDebugOpen}
        stableGuestId={stableGuestId}
        sessionToken={sessionToken}
        playerId={localPlayerId}
        characterId={characterId || null}
        identityStatus={identityStatus}
        onResetIdentity={() => {
          resetClientIdentityForDebug();
          window.location.reload();
        }}
        onClose={() => setIdentityDebugOpen(false)}
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