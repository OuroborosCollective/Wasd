import { GLBRegistry } from "../modules/asset-registry/GLBRegistry.js";
import { ChunkSystem } from "../modules/world/ChunkSystem.js";
import { ObserverEngine } from "../modules/observer/ObserverEngine.js";
import { PlayerSystem } from "../modules/player/PlayerSystem.js";
import { CombatSystem } from "../modules/combat/CombatSystem.js";
import { CombatService } from "../modules/combat/CombatService.js";
import { InventorySystem } from "../modules/inventory/InventorySystem.js";
import { NPCSystem } from "../modules/npc/NPCSystem.js";
import { GuildSystem } from "../modules/guild/GuildSystem.js";
import { EconomySystem } from "../modules/economy/EconomySystem.js";
import { QuestEngine } from "../modules/quest/QuestEngine.js";
import { WorldSystem } from "../modules/world/WorldSystem.js";
import { PersistenceManager } from "./PersistenceManager.js";
import { verifyFirebaseToken } from "../config/firebase.js";
import { GameWebSocketServer } from "../networking/WebSocketServer.js";
import { WorldHistory } from "../modules/history/WorldHistory.js";
import { bootstrapWarfrontNpcs, runWarfrontCombatTick } from "../modules/warfront/WarfrontCombatOrchestrator.js";
import { AREInvariantGuard, DeterminismViolation, type AREGuardPayload, type AREInvariantGuardStatus } from "../are/AREInvariantGuard.js";
import { areValidationState } from "../are/AREValidationState.js";
import { createWorldHashSnapshot, type WorldHashSnapshot } from "../are/WorldHashSnapshot.js";
import { deterministicTickRecorder, type DeterministicRecorderStats, type DeterministicReplaySnapshot, type DeterministicTickRecord } from "../are/DeterministicTickRecorder.js";
import { ouroborosOracleEngine, type OracleReport } from "../are/OuroborosOracle.js";
import { areAutoRepairService, type AutoRepairStatus } from "../are/AREAutoRepairService.js";
import { deterministicUsageTracker, type DeterministicUsageStats } from "../are/DeterministicUsageTracker.js";
import { AssetPoolResolver } from "../modules/world/AssetPoolResolver.js";
import { ensureGlbUrl } from "../modules/asset-registry/builtinModelFallbacks.js";
import {
  generateLogicalVillage,
  type LogicalVillageEntity,
} from "../world/generation/index.js";

function sectorOf(entity: any): number {
  const x = Number(entity?.position?.x ?? 0);
  const y = Number(entity?.position?.y ?? entity?.position?.z ?? 0);
  return Math.abs((Math.floor(x / 64) * 31 + Math.floor(y / 64) * 17) % 64);
}

export class WorldTick {
  private timer: NodeJS.Timeout | null = null;
  private tickCount = 0;
  private readonly areGuard = new AREInvariantGuard({ throwOnViolation: true });
  private lastAREGuardStatus: AREInvariantGuardStatus | null = null;
  private lastWorldHashSnapshot: WorldHashSnapshot | null = null;
  private lastOracleReport: OracleReport | null = null;

  public chunkSystem: ChunkSystem;
  public observerEngine: ObserverEngine;
  public playerSystem: PlayerSystem;
  public combatSystem: CombatSystem;
  public combatService: CombatService;
  public inventorySystem: InventorySystem;
  public npcSystem: NPCSystem;
  public guildSystem: GuildSystem;
  public economySystem: EconomySystem;
  public questSystem: QuestEngine;
  public worldSystem: WorldSystem;
  public persistence: PersistenceManager;
  public glbRegistry: GLBRegistry;
  public readonly assetPoolResolver: AssetPoolResolver;
  private readonly worldStaticEntities = new Map<string, LogicalVillageEntity>();
  private sceneLayoutRevision = 1;
  private lootEntities: Map<string, any> = new Map();
  private socketToPlayer: Map<string, string> = new Map();
  private lastActionTimes: Map<string, any> = new Map();

  public getPersistenceStats(): any { return {}; }
  public placementEngine: any = {};
  public listActiveVoteBanners(): any { return []; }
  public handleVoteProviderCallback(data: any): any { return { ok: true }; }
  public getAdminVoteBanners(): any { return []; }
  public upsertVoteBanner(data: any): any { return { ok: true, banner: {} }; }
  public deleteVoteBanner(id: any): any { return { ok: true }; }
  public setVoteBannerOrder(data: any): any { return { ok: true }; }
  public getVoteAdminDiagnostics(): any { return {}; }
  public debouncedSave(): void {}
  public craftingSystem: any = {};
  public skillSystem: any = {};
  public worldState: any = { customDialogues: {} };
  public createNPC(id: any, name: any, x: any, y: any): void {}
  public playerToSocket: Map<string, string> = new Map();
  public updateLootCache(): void {}
  public npcRespawnTimers: Map<string, any> = new Map();
  public resourceSystem: any = { nodes: new Map() };
  public chatSystem: any = { getRecentMessages: () => [], systemMessage: () => {}, sendMessage: () => ({}) };
  public lootSystem: any = { rollLoot: () => ({ items: [], gold: 0 }) };
  public liveHeal: any = { getStatus: () => ({ tickCount: this.tickCount, autoRepair: areAutoRepairService.getStatus(), usage: deterministicUsageTracker.getStats(this.tickCount) }), flush: () => {} };
  public getPlaytesterDebugLogPath(): string { return ""; }
  public buildPlaytesterMonitorPayload(options?: any): any { return {}; }
  public assetHealthService: any = { getStatus: () => ({}), getStats: () => null, flush: () => {} };
  public async init(): Promise<void> {
    this.seedDemoVillage();
  }

  private seedDemoVillage(): void {
    try {
      const res = generateLogicalVillage(this.glbRegistry, this.assetPoolResolver, {
        centerX: 480,
        centerZ: 480,
        seed: "server_default_village",
        housesPerSide: 4,
        layoutRevision: this.sceneLayoutRevision,
      });
      for (const e of res.entities) this.worldStaticEntities.set(e.id, e);
    } catch (e) {
      console.warn("[WorldTick] seedDemoVillage failed:", e);
    }
  }
  private keysDown: Map<string, Set<string>> = new Map();

  constructor(private ws: GameWebSocketServer) {
    this.chunkSystem = new ChunkSystem(64);
    this.observerEngine = new ObserverEngine();
    this.playerSystem = new PlayerSystem();
    this.combatSystem = new CombatSystem();
    this.combatService = new CombatService();
    this.inventorySystem = new InventorySystem();
    this.npcSystem = new NPCSystem();
    this.guildSystem = new GuildSystem();
    this.economySystem = new EconomySystem();
    this.questSystem = new QuestEngine();
    this.persistence = new PersistenceManager();
    this.worldSystem = new WorldSystem(this.persistence);
    this.glbRegistry = new GLBRegistry();
    this.assetPoolResolver = new AssetPoolResolver();
    const dummyPlayer = this.playerSystem.createPlayer("dummy_player", "Dummy Player");
    dummyPlayer.position.x = 500;
    dummyPlayer.position.y = 500;
    this.observerEngine.register("dummy_player", { x: 500, y: 500 });
    bootstrapWarfrontNpcs(this.npcSystem);
    this.ws.onPlayerConnect = (id) => console.log(`Socket ${id} connected. Waiting for login...`);
    this.ws.onPlayerDisconnect = async (id) => {
      const uid = this.socketToPlayer.get(id);
      if (uid) {
        const player = this.playerSystem.getPlayer(uid);
        if (player) { player.isOffline = true; player.state = "idle"; player.stateTimer = this.tickCount + 50; }
        this.observerEngine.unregister(id);
        this.socketToPlayer.delete(id);
        await this.saveAll();
        console.log(`Player ${player?.name} (Socket ${id}) disconnected.`);
      }
    };
    this.ws.onPlayerMessage = async (id, msg) => this.handlePlayerMessage(id, msg);
  }

  public getAREGuardStatus(): AREInvariantGuardStatus | null { return this.lastAREGuardStatus; }
  public getWorldHashSnapshot(): WorldHashSnapshot | null { return this.lastWorldHashSnapshot; }
  public getReplayRecorderStats(): DeterministicRecorderStats { return deterministicTickRecorder.stats(); }
  public getReplaySnapshot(tick: number): DeterministicReplaySnapshot | null { return deterministicTickRecorder.replay(tick); }
  public getAutoRepairStatus(): AutoRepairStatus { return areAutoRepairService.getStatus(); }
  public getDeterministicUsageStats(): DeterministicUsageStats { return deterministicUsageTracker.getStats(this.tickCount); }
  public getOracleReport(): OracleReport { this.lastOracleReport = ouroborosOracleEngine.generate(deterministicTickRecorder.records()); return this.lastOracleReport; }

  public comparePortalWorldHash(portalSnapshot: Partial<WorldHashSnapshot> | null | undefined): any {
    if (!this.lastWorldHashSnapshot) return { ok: false, error: "world_hash_snapshot_not_ready" };
    const server = this.lastWorldHashSnapshot;
    const portalWorldHash = portalSnapshot?.worldHash ?? null;
    const portalChunks = new Map((portalSnapshot?.chunks ?? []).map((chunk: any) => [`${chunk.chunkX}:${chunk.chunkY}`, chunk.hash]));
    const mismatches = server.chunks.filter((chunk) => portalChunks.has(`${chunk.chunkX}:${chunk.chunkY}`) && portalChunks.get(`${chunk.chunkX}:${chunk.chunkY}`) !== chunk.hash).map((chunk) => ({ chunkX: chunk.chunkX, chunkY: chunk.chunkY, serverHash: chunk.hash, portalHash: portalChunks.get(`${chunk.chunkX}:${chunk.chunkY}`) }));
    return { ok: Boolean(portalWorldHash && portalWorldHash === server.worldHash) && mismatches.length === 0, serverWorldHash: server.worldHash, portalWorldHash, mismatches, missingPortalChunks: server.chunks.filter((chunk) => !portalChunks.has(`${chunk.chunkX}:${chunk.chunkY}`)).map((chunk) => ({ chunkX: chunk.chunkX, chunkY: chunk.chunkY })) };
  }

  private restoreWorldStateFromRecord(record: DeterministicTickRecord, sector: number): void {
    const playerMap = this.playerSystem.getPlayersMap();
    for (const [id, player] of [...playerMap.entries()]) if (sectorOf(player) === sector) playerMap.delete(id);
    for (const player of record.worldState.players as any[]) if (sectorOf(player) === sector) this.playerSystem.setPlayer(String(player.id), { ...player });

    const npcMap = this.npcSystem.getNPCsMap();
    for (const [id, npc] of [...npcMap.entries()]) if (sectorOf(npc) === sector) npcMap.delete(id);
    for (const npc of record.worldState.npcs as any[]) if (sectorOf(npc) === sector) this.npcSystem.addNPC({ ...npc, visionRange: npc.visionRange ?? 10, visionAngle: npc.visionAngle ?? 90, targetId: npc.targetId ?? null, isProcessingAI: false, rotation: npc.rotation ?? 0 } as any);

    for (const [id, loot] of [...this.lootEntities.entries()]) if (sectorOf(loot) === sector) this.lootEntities.delete(id);
    for (const loot of record.worldState.loot as any[]) if (sectorOf(loot) === sector) this.lootEntities.set(String(loot.id), { ...loot });

    this.lastWorldHashSnapshot = record.worldSnapshot;
    if (record.guard) this.lastAREGuardStatus = record.guard;
    if (record.worldSnapshot) areValidationState.updateWorld(record.worldSnapshot);
    if (record.guard) areValidationState.updateGuard(record.guard);
  }

  private rotToClient(rotation: unknown): { x: number; y: number; z: number } {
    if (typeof rotation === "number" && Number.isFinite(rotation)) {
      return { x: 0, y: rotation, z: 0 };
    }
    if (rotation && typeof rotation === "object") {
      const r = rotation as Record<string, unknown>;
      const x = Number(r.x ?? 0);
      const y = Number(r.y ?? 0);
      const z = Number(r.z ?? 0);
      return {
        x: Number.isFinite(x) ? x : 0,
        y: Number.isFinite(y) ? y : 0,
        z: Number.isFinite(z) ? z : 0,
      };
    }
    return { x: 0, y: 0, z: 0 };
  }

  private resolvePlayerModelUrl(player: any): string {
    const cls = String(player?.class ?? "warrior")
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "_");
    const fromLink =
      this.glbRegistry.getModelForTarget("player_default", cls) ||
      this.glbRegistry.getModelForTarget("player_default", "warrior");
    return ensureGlbUrl("player", fromLink);
  }

  private resolveNpcModelUrl(n: any): string {
    const fusion = typeof n?.fusionAdaptiveGlbPath === "string" ? n.fusionAdaptiveGlbPath.trim() : "";
    if (fusion) return ensureGlbUrl("npc", fusion);
    const linked =
      this.glbRegistry.getModelForTarget("npc_single", String(n?.id ?? "")) ||
      this.glbRegistry.getModelForTarget("npc_single", String(n?.role ?? "").replace(/\s+/g, "_").toLowerCase());
    return ensureGlbUrl("npc", linked);
  }

  private buildClientEntityList(players: any[], npcs: any[], loot: any[]): any[] {
    const out: any[] = [];
    for (const p of players) {
      if (!p?.id || p.id === "dummy_player") continue;
      const g = p.guildId ? this.guildSystem.getGuild(p.guildId) : null;
      out.push({
        id: p.id,
        type: "player",
        name: p.name,
        position: { x: p.position.x, y: p.position.y, z: p.position.z || 0 },
        rotation: this.rotToClient(p.rotation),
        visible: !p.isOffline,
        modelUrl: this.resolvePlayerModelUrl(p),
        modelVersion: this.sceneLayoutRevision,
        health: p.health,
        maxHealth: p.maxHealth,
        guildId: p.guildId ?? null,
        guildName: g?.name ?? null,
      });
    }
    for (const n of npcs) {
      if (!n?.id) continue;
      out.push({
        id: n.id,
        type: "npc",
        name: n.name,
        role: n.role,
        position: { x: n.position.x, y: n.position.y, z: n.position.z || 0 },
        rotation: this.rotToClient(n.rotation),
        visible: true,
        modelUrl: this.resolveNpcModelUrl(n),
        modelVersion: this.sceneLayoutRevision,
        health: n.health,
        maxHealth: n.maxHealth,
      });
    }
    for (const l of loot) {
      if (!l?.id) continue;
      out.push({
        id: l.id,
        type: "loot",
        name: l.item?.name ?? "Loot",
        position: { x: l.position.x, y: l.position.y, z: l.position.z || 0 },
        rotation: { x: 0, y: 0, z: 0 },
        visible: true,
        modelUrl: ensureGlbUrl("loot", l.glbPath),
        modelVersion: this.sceneLayoutRevision,
      });
    }
    for (const obj of this.worldStaticEntities.values()) {
      out.push({
        id: obj.id,
        type: "object",
        name: obj.name,
        role: obj.role,
        position: { ...obj.position },
        rotation: { ...obj.rotation },
        visible: obj.visible,
        modelUrl: obj.modelUrl,
        modelVersion: obj.modelVersion ?? this.sceneLayoutRevision,
      });
    }
    return out;
  }

  private sendWelcome(socketId: string, player: any, uid: string): void {
    const g = player.guildId ? this.guildSystem.getGuild(player.guildId) : null;
    this.ws.sendToPlayer(socketId, {
      type: "welcome",
      playerId: uid,
      id: uid,
      playerName: player.name,
      guildId: player.guildId ?? null,
      guildName: g?.name ?? null,
      stats: {
        gold: player.gold,
        xp: player.xp,
        hp: player.health,
        maxHp: player.maxHealth,
        mp: player.mana,
        maxMp: player.maxMana,
        level: player.level || 1,
      },
      inventory: player.inventory,
      equipment: player.equipment,
      quests: player.quests,
    });
  }

  private handleAdminWorldGenerate(socketId: string, player: any, msg: any): void {
    const prompt = typeof msg.prompt === "string" ? msg.prompt : "";
    const seed = `${player.id}:${prompt || "village"}`;
    const m = /(\d+)\s*(house|häuser|homes)/i.exec(prompt);
    const housesPerSide = m ? Math.max(2, Math.min(8, parseInt(m[1]!, 10))) : 4;
    const near = player.position || { x: 0, y: 0, z: 0 };
    const centerX = Number(near.x) + 40;
    const centerZ = Number(near.z ?? near.y) + 40;
    this.sceneLayoutRevision += 1;
    for (const key of [...this.worldStaticEntities.keys()]) {
      if (key.startsWith("vlg_")) this.worldStaticEntities.delete(key);
    }
    const built = generateLogicalVillage(this.glbRegistry, this.assetPoolResolver, {
      centerX,
      centerZ,
      seed,
      housesPerSide,
      layoutRevision: this.sceneLayoutRevision,
    });
    for (const e of built.entities) this.worldStaticEntities.set(e.id, { ...e, modelVersion: this.sceneLayoutRevision });
    this.ws.sendToPlayer(socketId, {
      type: "toast",
      kind: "ok",
      text: `Village layout spawned (${built.entities.length} objects). Model keys: ${[...new Set(built.usedModelKeys)].join(", ")}${built.missingHints.length ? ` — missing pools: ${built.missingHints.join(", ")}` : ""}`,
    });
  }

  private async handlePlayerMessage(id: string, msg: any) {
    if (msg.type === "login") {
      const guestAllowed = process.env.ALLOW_GUEST_LOGIN === "1";
      const guestRaw = typeof msg.guestId === "string" ? msg.guestId.trim() : "";
      if (guestAllowed && guestRaw) {
        const uid = guestRaw.slice(0, 96);
        const charName =
          typeof msg.guestName === "string" && msg.guestName.trim()
            ? msg.guestName.trim().slice(0, 48)
            : `Guest_${uid.slice(0, 6)}`;
        let player = this.playerSystem.getPlayer(uid);
        if (!player) {
          player = this.playerSystem.createPlayer(uid, charName, msg.class, msg.appearance);
          this.hydratePlayer(player);
        } else {
          player.isOffline = false;
        }
        if (player.name !== charName) player.name = charName;
        this.socketToPlayer.set(id, uid);
        this.playerToSocket.set(uid, id);
        this.observerEngine.register(id, { x: player.position.x, y: player.position.y });
        this.sendWelcome(id, player, uid);
        return;
      }
      if (!msg.token) {
        this.ws.sendToPlayer(id, { type: "error", message: "Authentication failed: No token provided" });
        setTimeout(() => {
          const client = Array.from((this.ws as any).wss.clients).find((c: any) => c.id === id);
          if (client) (client as any).close();
        }, 500);
        return;
      }
      let charName = "Unknown";
      let uid = "";
      try {
        const decodedToken = (await verifyFirebaseToken(msg.token)) as any;
        if (decodedToken) {
          uid = decodedToken.uid;
          charName =
            decodedToken.name ||
            decodedToken.email?.split("@")[0] ||
            `Player_${uid.substring(0, 6)}`;
        } else {
          this.ws.sendToPlayer(id, { type: "error", message: "Authentication service unavailable" });
          return;
        }
      } catch {
        this.ws.sendToPlayer(id, { type: "error", message: "Authentication failed: Invalid token" });
        return;
      }
      let player = this.playerSystem.getPlayer(uid);
      if (!player) {
        player = this.playerSystem.createPlayer(uid, charName, msg.class, msg.appearance);
        this.hydratePlayer(player);
      } else {
        player.isOffline = false;
      }
      if (player.name !== charName) player.name = charName;
      this.socketToPlayer.set(id, uid);
      this.playerToSocket.set(uid, id);
      this.observerEngine.register(id, { x: player.position.x, y: player.position.y });
      this.sendWelcome(id, player, uid);
      return;
    }
    const playerId = this.socketToPlayer.get(id);
    if (!playerId) return;
    const player = this.playerSystem.getPlayer(playerId);
    if (!player) return;
    const charName = player.name;
    const nowTick = this.tickCount;
    const checkCooldown = (cooldownMs: number) => {
      const cooldownTicks = Math.max(1, Math.ceil(cooldownMs / 100));
      const pTimes = this.lastActionTimes.get(charName) || {};
      const last = pTimes["general"] || 0;
      if (nowTick - last < cooldownTicks) return false;
      pTimes["general"] = nowTick;
      this.lastActionTimes.set(charName, pTimes);
      return true;
    };

    if (msg.type === "guild_create") {
      const name = typeof msg.guildName === "string" ? msg.guildName.trim().slice(0, 48) : "";
      if (!name) {
        this.ws.sendToPlayer(id, { type: "toast", kind: "warn", text: "Guild name required." });
        return;
      }
      if (player.guildId) {
        this.ws.sendToPlayer(id, { type: "toast", kind: "warn", text: "Already in a guild. Leave first." });
        return;
      }
      const { guild } = this.guildSystem.createGuildForPlayer(player.id, name);
      player.guildId = guild.id;
      this.ws.sendToPlayer(id, {
        type: "guild_sync",
        guild: { id: guild.id, name: guild.name, rank: "founder", members: [...guild.members] },
      });
      this.ws.sendToPlayer(id, { type: "toast", kind: "ok", text: `Guild «${guild.name}» created.` });
      return;
    }
    if (msg.type === "guild_join") {
      const gid = typeof msg.guildId === "string" ? msg.guildId.trim() : "";
      if (!gid || player.guildId) return;
      const g = this.guildSystem.addMember(gid, player.id);
      if (!g) {
        this.ws.sendToPlayer(id, { type: "toast", kind: "err", text: "Guild not found." });
        return;
      }
      player.guildId = gid;
      this.ws.sendToPlayer(id, {
        type: "guild_sync",
        guild: { id: g.id, name: g.name, rank: g.ranks[player.id] ?? "member", members: [...g.members] },
      });
      return;
    }
    if (msg.type === "guild_leave") {
      if (!player.guildId) return;
      const gid = player.guildId;
      this.guildSystem.removeMember(gid, player.id);
      player.guildId = null;
      this.ws.sendToPlayer(id, { type: "guild_sync", guild: null });
      return;
    }

    if (msg.type === "admin_generate_world") {
      this.handleAdminWorldGenerate(id, player, msg);
      return;
    }
    if (msg.type === "admin_glb_scan") {
      this.ws.sendToPlayer(id, { type: "admin_glb_scan_result", models: this.glbRegistry.scanModels() });
      return;
    }
    if (msg.type === "admin_glb_list") {
      this.ws.sendToPlayer(id, { type: "admin_glb_list_result", links: this.glbRegistry.getLinks() });
      return;
    }
    if (msg.type === "admin_glb_link") {
      const glbPath = typeof msg.glbPath === "string" ? msg.glbPath.trim() : "";
      const targetType = typeof msg.targetType === "string" ? msg.targetType.trim() : "";
      const targetId = typeof msg.targetId === "string" ? msg.targetId.trim() : "";
      if (!glbPath || !targetType || !targetId) return;
      this.glbRegistry.addLink({ glbPath, targetType: targetType as any, targetId });
      this.sceneLayoutRevision += 1;
      this.ws.sendToPlayer(id, { type: "admin_glb_list_result", links: this.glbRegistry.getLinks() });
      return;
    }
    if (msg.type === "admin_glb_unlink") {
      const targetType = typeof msg.targetType === "string" ? msg.targetType.trim() : "";
      const targetId = typeof msg.targetId === "string" ? msg.targetId.trim() : "";
      if (!targetType || !targetId) return;
      this.glbRegistry.removeLink(targetType, targetId);
      this.sceneLayoutRevision += 1;
      this.ws.sendToPlayer(id, { type: "admin_glb_list_result", links: this.glbRegistry.getLinks() });
      return;
    }
    if (msg.type === "admin_glb_upload" && msg.data && msg.filename) {
      try {
        const buf = Buffer.from(String(msg.data), "base64");
        this.glbRegistry.saveModel(String(msg.filename).replace(/[^a-z0-9._-]+/gi, "_"), buf);
        this.glbRegistry.reloadLinks();
        this.ws.sendToPlayer(id, { type: "toast", kind: "ok", text: `Uploaded ${msg.filename}` });
      } catch (e) {
        this.ws.sendToPlayer(id, { type: "toast", kind: "err", text: "Upload failed." });
      }
      return;
    }

    if (msg.type === "move_intent" || msg.type === "MOVE") {
      const speed = 5;
      let dx = Number(msg.dx) || 0;
      let dy = Number(msg.dy ?? msg.dz) || 0;
      const magSq = dx * dx + dy * dy;
      if (magSq > 1) {
        const mag = Math.sqrt(magSq);
        dx /= mag;
        dy /= mag;
      }
      if (!Number.isNaN(dx) && !Number.isNaN(dy)) {
        player.position.x += dx * speed;
        player.position.y += dy * speed;
        player.position.x = Math.floor(player.position.x * 1000) / 1000;
        player.position.y = Math.floor(player.position.y * 1000) / 1000;
        if (player.position.z === undefined) player.position.z = 0;
        this.observerEngine.updatePosition(id, { x: player.position.x, y: player.position.y });
      }
    } else if (msg.type === "chat") {
      if (msg.text && typeof msg.text === "string" && msg.text.trim().length > 0)
        this.ws.broadcast({
          type: "CHAT_MSG",
          payload: { channel: msg.channel || "local", sender: player.name, text: msg.text.trim() },
        });
    } else if (msg.type === "USE_SKILL") {
      const skillId = msg.skillId;
      if (skillId === "atk" && !checkCooldown(800)) return;
      if (skillId === "def") player.mana = Math.min(player.maxMana, player.mana + 10);
      if (skillId === "mag" && !checkCooldown(3000)) return;
      if ((skillId === "mag" || skillId === "atk") && !checkCooldown(800)) return;
    } else if (msg.type === "attack") {
      if (!checkCooldown(800)) return;
      this.handleAttack(id, player, msg);
    } else if (msg.type === "interact") {
      if (!checkCooldown(500)) return;
      this.handleInteract(id, player, msg);
    } else if (msg.type === "dialogue_choice") this.handleDialogueChoice(id, player, msg);
    else if (msg.type === "equip") {
      this.inventorySystem.equipItem(player, msg.itemId);
      this.saveAll();
    } else if (msg.type === "unequip") {
      this.inventorySystem.unequipItem(player, msg.slot);
      this.saveAll();
    } else if (msg.type === "drop") {
      this.inventorySystem.removeItem(player, msg.itemId);
      this.saveAll();
    }
  }

  private handleAttack(id: string, player: any, msg: any) { const targetId = msg.targetId; const npc = this.npcSystem.getNPC(targetId); if (npc && npc.health !== undefined) { const dist = Math.hypot(player.position.x - npc.position.x, player.position.y - npc.position.y); if (dist < 30) { const baseDamage = 10; npc.health -= baseDamage; this.ws.broadcast({ type: "combat_feedback", targetId, damage: baseDamage, health: npc.health, maxHealth: npc.maxHealth }); if (npc.health <= 0) this.handleNPCDeath(id, player, npc, targetId); } } }
  private handleInteract(id: string, player: any, msg: any) { const targetId = msg.targetId; const npc = this.npcSystem.getNPC(targetId); const loot = this.lootEntities.get(targetId); if (npc) { const dist = Math.hypot(player.position.x - npc.position.x, player.position.y - npc.position.y); if (dist < 20) { const interaction = this.npcSystem.handleInteraction(targetId, player, this.questSystem.getQuestDefinitions()); if (interaction) this.ws.sendToPlayer(id, { type: "dialogue", source: interaction.source, text: interaction.text, choices: interaction.choices, npcId: interaction.npcId }); } } else if (loot) { const dist = Math.hypot(player.position.x - loot.position.x, player.position.y - loot.position.y); if (dist < 20) { this.inventorySystem.addItem(player, loot.item); this.lootEntities.delete(targetId); this.ws.sendToPlayer(id, { type: "dialogue", source: "System", text: `Picked up ${loot.item.name}!` }); } } }
  private handleDialogueChoice(id: string, player: any, msg: any) { const { npcId, nodeId, choiceId } = msg; const interaction = this.npcSystem.handleChoice(npcId, nodeId, choiceId, player); if (interaction) this.ws.sendToPlayer(id, { type: "dialogue", source: interaction.source, text: interaction.text, choices: interaction.choices, npcId: interaction.npcId }); }
  private handleNPCDeath(socketId: string, player: any, npc: any, npcInstanceId: string) { npc.health = npc.maxHealth || 100; this.ws.sendToPlayer(socketId, { type: "dialogue", source: "System", text: `${npc.name} respawns.` }); }
  private hydratePlayer(player: any) {
    if (!player.id) player.id = "unknown";
    if (!player.name) player.name = player.id;
    if (!player.position) player.position = { x: 0, y: 0, z: 0 };
    if (player.guildId === undefined || player.guildId === "") player.guildId = null;
    if (!player.inventory) player.inventory = [];
    if (!player.quests) player.quests = [];
    if (!player.equipment) player.equipment = { weapon: null, armor: null };
  }
  private async saveAll() { const allPlayers = this.playerSystem.getAllPlayers(); const data: any = {}; for (const p of allPlayers) if (p.id !== "dummy_player") data[p.id] = p; await this.persistence.save(data); }
  private syncNpcPerceptionFromPlayers(): void { const dummy = this.playerSystem.getPlayer("dummy_player"); if (dummy) this.npcSystem.updatePlayerState({ id: dummy.id, position: { x: dummy.position.x, y: dummy.position.y, z: dummy.position.z ?? 0 }, stealthValue: typeof dummy.stealthValue === "number" ? dummy.stealthValue : 0 }); for (const p of this.playerSystem.getAllPlayers()) { if (!p?.id || p.id === "dummy_player") continue; this.npcSystem.updatePlayerState({ id: p.id, position: { x: p.position.x, y: p.position.y, z: p.position.z ?? 0 }, stealthValue: typeof p.stealthValue === "number" ? p.stealthValue : 0 }); } }
  start() { this.timer = setInterval(() => this.tick(), 100); }
  stop() { if (this.timer) clearInterval(this.timer); this.timer = null; }
  private buildAREPayload(): AREGuardPayload { return { l: 13, k: 1000, r: Math.round((0.5 + Math.sin(this.tickCount / 10) * 0.5) * 1000) / 1000, tick: this.tickCount, deterministicSeed: `ARE|k1000|tick:${this.tickCount}|chunk:64` }; }

  private updateAREContract(payload: AREGuardPayload, strippedPlayers: any[], strippedNpcs: any[], strippedLoot: any[]) {
    let guardStatus: AREInvariantGuardStatus;
    try { guardStatus = this.areGuard.validateTick(payload, this.tickCount); } catch (error) { if (error instanceof DeterminismViolation || (error as Error)?.name === "DeterminismViolation") guardStatus = this.areGuard.getStatus(); else throw error; }
    this.lastAREGuardStatus = guardStatus;
    areValidationState.updateGuard(guardStatus);
    if (this.tickCount % 10 === 0 || !this.lastWorldHashSnapshot) {
      this.lastWorldHashSnapshot = createWorldHashSnapshot({ tick: this.tickCount, payload, players: strippedPlayers, npcs: strippedNpcs, loot: strippedLoot, chunkSize: 64 });
      areValidationState.updateWorld(this.lastWorldHashSnapshot);
    }
    const hashCount = this.lastWorldHashSnapshot ? 2 + this.lastWorldHashSnapshot.chunks.length : 1;
    const usage = deterministicUsageTracker.recordHashes(this.tickCount, hashCount, "world_hash_snapshot");
    deterministicTickRecorder.record({ tick: this.tickCount, payload, worldHash: this.lastWorldHashSnapshot?.worldHash ?? null, worldSnapshot: this.lastWorldHashSnapshot, guard: guardStatus, worldState: { players: strippedPlayers, npcs: strippedNpcs, loot: strippedLoot } });
    if (this.tickCount % 10 === 0) this.lastOracleReport = ouroborosOracleEngine.generate(deterministicTickRecorder.records());
    const repairPlan = areAutoRepairService.evaluate({ tick: this.tickCount, guard: guardStatus, oracle: this.lastOracleReport, records: deterministicTickRecorder.records(), players: strippedPlayers, npcs: strippedNpcs, loot: strippedLoot, restoreWorldState: (record, sector) => this.restoreWorldStateFromRecord(record, sector) });
    if (repairPlan) this.ws.broadcast({ type: "ARE_AUTO_REPAIR", payload: areAutoRepairService.getStatus() });
    if (!guardStatus.ok && this.tickCount % 10 === 0) this.ws.broadcast({ type: "ARE_DETERMINISM_VIOLATION", payload: areValidationState.getSnapshot() });
    if (this.tickCount % 10 === 0) this.ws.broadcast({ type: "ARE_USAGE", payload: usage });
  }

  tick() {
    this.tickCount += 1;
    const payload = this.buildAREPayload();
    const allPlayers = this.playerSystem.getAllPlayers();
    this.syncNpcPerceptionFromPlayers();
    this.npcSystem.tick(allPlayers.filter((p) => !p.isOffline), this.worldSystem.worldTime);
    runWarfrontCombatTick({ tickCount: this.tickCount, npcSystem: this.npcSystem, playerSystem: this.playerSystem, combatService: this.combatService, broadcast: (payload) => this.ws.broadcast(payload) });
    const npcsAgg = this.npcSystem.getAllNPCs();
    let aggSum = 0;
    let aggN = 0;
    for (const n of npcsAgg) { const a = n.traits?.aggression; if (typeof a === "number" && Number.isFinite(a)) { aggSum += a; aggN++; } }
    WorldHistory.getInstance().recordAggressionSample(aggN > 0 ? aggSum / aggN : 0.36, this.tickCount);
    this.worldSystem.tick();
    const strippedPlayers = [];
    for (let i = 0; i < allPlayers.length; i++) { const p = allPlayers[i]; strippedPlayers.push({ id: p.id, name: p.name, class: p.class, appearance: p.appearance, position: { x: p.position.x, y: p.position.y, z: p.position.z || 0 }, rotation: p.rotation || 0, level: p.level, health: p.health, maxHealth: p.maxHealth, isOffline: !!p.isOffline, state: p.state }); }
    const allNpcs = this.npcSystem.getAllNPCs();
    const strippedNpcs = [];
    for (let i = 0; i < allNpcs.length; i++) { const n = allNpcs[i]; strippedNpcs.push({ id: n.id, name: n.name, position: { x: n.position.x, y: n.position.y, z: n.position.z || 0 }, rotation: n.rotation || 0, health: n.health, maxHealth: n.maxHealth, role: n.role, state: n.state, fusionAdaptiveGlbPath: n.fusionAdaptiveGlbPath }); }
    const strippedLoot = [];
    for (const l of this.lootEntities.values()) strippedLoot.push({ id: l.id, position: { x: l.position.x, y: l.position.y, z: l.position.z || 0 }, item: l.item ? { id: l.item.id, name: l.item.name, type: l.item.type } : null, glbPath: l.glbPath });
    this.updateAREContract(payload, strippedPlayers, strippedNpcs, strippedLoot);
    const autoRepair = areAutoRepairService.getStatus();
    const usage = deterministicUsageTracker.getStats(this.tickCount);
    if (this.tickCount % 10 === 0) { const npcs = allNpcs.map(n => ({ id: n.id, name: n.name, x: n.position.x, y: n.position.y })); this.ws.broadcast({ type: "WORLD_HEARTBEAT", payload: { players: Object.fromEntries(allPlayers.filter(p => !p.isOffline).map(p => [p.id, { id: p.id, name: p.name, x: p.position.x, y: p.position.y }])), agents: npcs, are: areValidationState.getSnapshot(), replay: deterministicTickRecorder.stats(), oracle: this.lastOracleReport, autoRepair, usage } }); }
    if (this.tickCount % 600 === 0) this.saveAll().catch((e) => console.error(e));
    this.ws.broadcast({
      type: "world_tick",
      tick: this.tickCount,
      players: strippedPlayers,
      npcs: strippedNpcs,
      loot: strippedLoot,
      are: { guard: this.lastAREGuardStatus, worldHash: this.lastWorldHashSnapshot?.worldHash ?? null },
      replay: { latestTick: this.tickCount },
      oracle: this.lastOracleReport,
      autoRepair,
      usage,
    });
    this.ws.broadcast({
      type: "entity_sync",
      entities: this.buildClientEntityList(strippedPlayers, strippedNpcs, strippedLoot),
      chunks: [],
      sceneLayoutRevision: this.sceneLayoutRevision,
    });
  }
}
