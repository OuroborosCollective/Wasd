import { useCallback, useEffect, useRef, useState } from "react";
import type { EntityNet, FxKind, LootNet, QuestStateNet, ServerMsg } from "../../../shared/protocol";
import {
  getCombatTargetNpcId,
  getPlayerGold,
  getPlayerInventory,
  getPlayerInventoryWeight,
  getPlayerMaxCarryWeight,
  getPlayerQuests,
  subscribePlayerState,
  type ClientQuestEntry,
} from "../state/playerState";

export type WorldBossEncounterHud = {
  dungeonId: string;
  sceneId: string;
  bossName: string;
  bossHp: number;
  bossHpMax: number;
  respawnRemainingMs: number;
  updatedAt: number;
};

export type WorldBossRankingRow = {
  playerId: string;
  playerName: string;
  rank: number;
  damage: number;
};

export type VoteBuffHud = {
  activeMultiplier: number;
  totalRemainingMs: number;
  blocks: Array<{
    id: string;
    bannerId: string;
    providerKey: string;
    expiresAt: number;
    remainingMs: number;
  }>;
};

export type VoteBannerHud = {
  internalId: string;
  providerKey: string;
  displayName: string;
  bannerImage: string;
  targetUrl: string;
  description?: string;
  sortOrder: number;
  buffHours: number;
  cooldownHours: number;
  voteWindowHours: number;
  claimInstructions?: string;
  status: "ready" | "cooldown" | "pending" | "claimable";
  cooldownRemainingMs: number;
  nextEligibleAt: number;
  session?: {
    id: string;
    status: string;
    expiresAt: number;
    verifiedAt?: number;
    voteUrl: string;
  };
};

export type WarfrontHudSector = {
  id: string;
  label: string;
  kind: "combat" | "crafting" | "scouting";
  routeKey: string;
  targetPoints: number;
  currentPoints: number;
  progressPct: number;
  yourPoints: number;
};

export type WarfrontHudState = {
  cycleId: string;
  seasonId: string;
  phase: "building" | "boss_ready" | "boss_active" | "cooldown";
  progressPct: number;
  endsAt: number;
  sectors: WarfrontHudSector[];
  personal: {
    cyclePoints: number;
    seasonPoints: number;
    nextTierPoints?: number;
    nextTierLabel?: string;
    claimedTierIds: string[];
  };
  frontBoss: {
    active: boolean;
    npcId: string | null;
    mutator: string | null;
  };
};

function mapEntityKind(type: unknown): EntityNet["kind"] {
  const t = typeof type === "string" ? type : "";
  if (t === "player" || t === "npc" || t === "monster" || t === "loot" || t === "object") {
    return t;
  }
  return "object";
}

function clientQuestToNet(q: ClientQuestEntry): QuestStateNet {
  const goal = Math.max(1, Math.floor(Number(q.progressMax ?? q.requiredCount ?? 1)));
  const rawProgress = typeof q.progress === "number" ? q.progress : q.completed ? goal : 0;
  const progress = Math.min(goal, Math.max(0, Math.floor(rawProgress)));
  const goalText =
    q.objectiveType === "collect" && q.requiredItemId
      ? `Sammle: ${q.requiredItemId} (${progress}/${goal})`
      : q.objectiveType === "combat"
        ? `Besiege Ziele`
        : q.targetNpcId || q.targetId
          ? `Sprich mit / erreiche Ziel`
          : "Quest aktiv";
  return {
    id: q.id,
    title: q.title || q.id,
    step: 0,
    done: Boolean(q.completed),
    progress,
    goal,
    goalText,
  };
}

function wireToServerMsg(data: Record<string, unknown>): ServerMsg | null {
  if (data.type === "fx" && data.at && typeof data === "object") {
    const at = data.at as Record<string, unknown>;
    const kind = data.kind as FxKind;
    if (typeof kind !== "string") return null;
    return {
      t: "fx",
      at: { x: Number(at.x) || 0, y: Number(at.y) || 0 },
      kind: kind as FxKind,
      n: typeof data.n === "number" ? data.n : undefined,
    };
  }
  if (data.type === "combat_result") {
    const crit = Boolean(data.crit);
    const hit = Boolean(data.hit);
    const damage = Math.floor(Number(data.damage ?? 0));
    const kind: FxKind = crit ? "crit" : hit ? "hit" : "miss";
    return { t: "fx", at: { x: 0, y: 0 }, kind, n: damage };
  }
  return null;
}

export function useGameHudState() {
  const [youId, setYouId] = useState<string | undefined>();
  const [entities, setEntities] = useState<EntityNet[]>([]);
  const [loot, setLoot] = useState<LootNet[]>([]);
  const lootMapRef = useRef<Map<string, LootNet>>(new Map());
  const [quests, setQuests] = useState<QuestStateNet[]>([]);
  const [inv, setInv] = useState<{
    gold: number;
    weight: number;
    maxWeight: number;
    items: { itemId: string; qty: number }[];
  } | null>(null);
  const [fxFeed, setFxFeed] = useState<
    Array<{ id: string; kind: FxKind; n?: number; x: number; y: number; t: number }>
  >([]);
  const [worldBossEncounter, setWorldBossEncounter] = useState<WorldBossEncounterHud | null>(null);
  const [worldBossTop, setWorldBossTop] = useState<WorldBossRankingRow[]>([]);
  const [voteBuff, setVoteBuff] = useState<VoteBuffHud>({
    activeMultiplier: 1,
    totalRemainingMs: 0,
    blocks: [],
  });
  const [voteBanners, setVoteBanners] = useState<VoteBannerHud[]>([]);
  const [warfront, setWarfront] = useState<WarfrontHudState | null>(null);

  const fxId = useRef(0);

  const pushFx = useCallback((kind: FxKind, n: number | undefined, x: number, y: number) => {
    const id = `fx_${++fxId.current}`;
    setFxFeed((cur) =>
      [...cur, { id, kind, n, x, y, t: Date.now() }].slice(-25)
    );
    window.setTimeout(() => {
      setFxFeed((cur) => cur.filter((e) => e.id !== id));
    }, 900);
  }, []);

  const applyVoteStatusPayload = useCallback((payload: Record<string, unknown>) => {
    const buffRaw = payload.buff && typeof payload.buff === "object" ? (payload.buff as Record<string, unknown>) : {};
    const blocksRaw = Array.isArray(buffRaw.blocks) ? buffRaw.blocks : [];
    setVoteBuff({
      activeMultiplier: Math.max(1, Number(buffRaw.activeMultiplier ?? 1)),
      totalRemainingMs: Math.max(0, Number(buffRaw.totalRemainingMs ?? 0)),
      blocks: blocksRaw
        .map((row: unknown) => {
          if (!row || typeof row !== "object") return null;
          const r = row as Record<string, unknown>;
          const id = typeof r.id === "string" ? r.id : "";
          if (!id) return null;
          return {
            id,
            bannerId: typeof r.bannerId === "string" ? r.bannerId : "",
            providerKey: typeof r.providerKey === "string" ? r.providerKey : "",
            expiresAt: Math.max(0, Number(r.expiresAt ?? 0)),
            remainingMs: Math.max(0, Number(r.remainingMs ?? 0)),
          };
        })
        .filter((row): row is VoteBuffHud["blocks"][number] => Boolean(row))
        .sort((a: VoteBuffHud["blocks"][number], b: VoteBuffHud["blocks"][number]) => (a?.expiresAt ?? 0) - (b?.expiresAt ?? 0)),
    });
    if (Array.isArray(payload.banners)) {
      setVoteBanners(
        payload.banners
          .map((row: unknown) => {
            if (!row || typeof row !== "object") return null;
            const b = row as Record<string, unknown>;
            const internalId = typeof b.internalId === "string" ? b.internalId : "";
            const displayName = typeof b.displayName === "string" ? b.displayName : "";
            if (!internalId || !displayName) return null;
            const status = typeof b.status === "string" ? b.status : "ready";
            const sessionRaw =
              b.session && typeof b.session === "object" ? (b.session as Record<string, unknown>) : null;
            return {
              internalId,
              providerKey: typeof b.providerKey === "string" ? b.providerKey : "",
              displayName,
              bannerImage: typeof b.bannerImage === "string" ? b.bannerImage : "",
              targetUrl: typeof b.targetUrl === "string" ? b.targetUrl : "",
              description: typeof b.description === "string" ? b.description : undefined,
              sortOrder: Math.max(0, Number(b.sortOrder ?? 0)),
              buffHours: Math.max(1, Number(b.buffHours ?? 4)),
              cooldownHours: Math.max(1, Number(b.cooldownHours ?? 24)),
              voteWindowHours: Math.max(1, Number(b.voteWindowHours ?? 12)),
              claimInstructions:
                typeof b.claimInstructions === "string" ? b.claimInstructions : undefined,
              status:
                status === "cooldown" || status === "pending" || status === "claimable"
                  ? status
                  : "ready",
              cooldownRemainingMs: Math.max(0, Number(b.cooldownRemainingMs ?? 0)),
              nextEligibleAt: Math.max(0, Number(b.nextEligibleAt ?? 0)),
              session: sessionRaw
                ? {
                    id: typeof sessionRaw.id === "string" ? sessionRaw.id : "",
                    status: typeof sessionRaw.status === "string" ? sessionRaw.status : "pending",
                    expiresAt: Math.max(0, Number(sessionRaw.expiresAt ?? 0)),
                    verifiedAt:
                      typeof sessionRaw.verifiedAt === "number"
                        ? Math.max(0, sessionRaw.verifiedAt)
                        : undefined,
                    voteUrl: typeof sessionRaw.voteUrl === "string" ? sessionRaw.voteUrl : "",
                  }
                : undefined,
            } satisfies VoteBannerHud;
          })
          .filter((row): row is VoteBannerHud => Boolean(row))
          .sort((a: VoteBannerHud, b: VoteBannerHud) => (a?.sortOrder ?? 0) - (b?.sortOrder ?? 0)),
      );
    }
  }, []);

  const onServerMsg = useCallback(
    (m: ServerMsg) => {
      if (m.t === "snapshot") {
        setYouId(m.you);
        setEntities(m.entities);
        setLoot(m.loot);
        lootMapRef.current = new Map(m.loot.map((l: LootNet) => [l.id, l]));
        return;
      }
      if (m.t === "inv") {
        setInv({
          gold: m.gold,
          weight: m.weight,
          maxWeight: m.maxWeight,
          items: m.items.map((i: { itemId: string; qty: number }) => ({ itemId: i.itemId, qty: i.qty })),
        });
      } else if (m.t === "quests") {
        setQuests(m.active);
      } else if (m.t === "fx") {
        pushFx(m.kind, m.n, m.at.x, m.at.y);
      }
    },
    [pushFx]
  );

  const onWirePayload = useCallback(
    (data: Record<string, unknown>) => {
      const mapped = wireToServerMsg(data);
      if (mapped) {
        onServerMsg(mapped);
      }
      const msgType = typeof data.type === "string" ? data.type : "";
      if (msgType === "worldboss_spawned") {
        setWorldBossEncounter((prev) => ({
          dungeonId: typeof data.dungeonId === "string" ? data.dungeonId : prev?.dungeonId ?? "worldboss_obsidian_fracture",
          sceneId: typeof data.sceneId === "string" ? data.sceneId : prev?.sceneId ?? "worldboss_obsidian_fracture",
          bossName: typeof data.name === "string" ? data.name : prev?.bossName ?? "Worldboss",
          bossHp: Number(prev?.bossHp ?? 0),
          bossHpMax: Number(prev?.bossHpMax ?? 0),
          respawnRemainingMs: 0,
          updatedAt: Date.now(),
        }));
      } else if (msgType === "worldboss_encounter_update") {
        setWorldBossEncounter({
          dungeonId: typeof data.dungeonId === "string" ? data.dungeonId : "worldboss_obsidian_fracture",
          sceneId: typeof data.sceneId === "string" ? data.sceneId : "worldboss_obsidian_fracture",
          bossName: typeof data.bossName === "string" ? data.bossName : "Worldboss",
          bossHp: Math.max(0, Number(data.hp ?? 0)),
          bossHpMax: Math.max(1, Number(data.maxHp ?? 1)),
          respawnRemainingMs: 0,
          updatedAt: Date.now(),
        });
      } else if (msgType === "worldboss_status") {
        setWorldBossEncounter({
          dungeonId: typeof data.dungeonId === "string" ? data.dungeonId : "worldboss_obsidian_fracture",
          sceneId: typeof data.sceneId === "string" ? data.sceneId : "worldboss_obsidian_fracture",
          bossName: typeof data.bossName === "string" ? data.bossName : "Worldboss",
          bossHp: Math.max(0, Number(data.bossHp ?? 0)),
          bossHpMax: Math.max(1, Number(data.bossHpMax ?? 1)),
          respawnRemainingMs: Math.max(0, Number(data.respawnRemainingMs ?? 0)),
          updatedAt: Date.now(),
        });
        if (Array.isArray(data.top)) {
          setWorldBossTop(
            data.top
              .map((row: unknown) => {
                if (!row || typeof row !== "object") return null;
                const entry = row as Record<string, unknown>;
                return {
                  playerId: typeof entry.playerId === "string" ? entry.playerId : "",
                  playerName: typeof entry.playerName === "string" ? entry.playerName : "Unknown",
                  rank: Math.max(1, Number(entry.rank ?? 99)),
                  damage: Math.max(0, Number(entry.damage ?? 0)),
                } satisfies WorldBossRankingRow;
              })
              .filter((row): row is WorldBossRankingRow => Boolean(row?.playerId))
              .sort((a: WorldBossRankingRow, b: WorldBossRankingRow) => (a?.rank ?? 0) - (b?.rank ?? 0))
              .slice(0, 5)
          );
        }
      } else if (msgType === "worldboss_defeated") {
        setWorldBossEncounter((prev) =>
          prev
            ? {
                ...prev,
                bossHp: 0,
                respawnRemainingMs: Math.max(prev.respawnRemainingMs, 1),
                updatedAt: Date.now(),
              }
            : null
        );
        if (Array.isArray(data.top)) {
          setWorldBossTop(
            data.top
              .map((row: unknown) => {
                if (!row || typeof row !== "object") return null;
                const entry = row as Record<string, unknown>;
                return {
                  playerId: typeof entry.playerId === "string" ? entry.playerId : "",
                  playerName: typeof entry.playerName === "string" ? entry.playerName : "Unknown",
                  rank: Math.max(1, Number(entry.rank ?? 99)),
                  damage: Math.max(0, Number(entry.damage ?? 0)),
                } satisfies WorldBossRankingRow;
              })
              .filter((row): row is WorldBossRankingRow => Boolean(row?.playerId))
              .sort((a: WorldBossRankingRow, b: WorldBossRankingRow) => (a?.rank ?? 0) - (b?.rank ?? 0))
              .slice(0, 5)
          );
        }
      } else if (msgType === "worldboss_ranking" && Array.isArray(data.top)) {
        setWorldBossTop(
          data.top
            .map((row: unknown) => {
              if (!row || typeof row !== "object") return null;
              const entry = row as Record<string, unknown>;
              return {
                playerId: typeof entry.playerId === "string" ? entry.playerId : "",
                playerName: typeof entry.playerName === "string" ? entry.playerName : "Unknown",
                rank: Math.max(1, Number(entry.rank ?? 99)),
                damage: Math.max(0, Number(entry.damage ?? 0)),
              } satisfies WorldBossRankingRow;
            })
            .filter((row): row is WorldBossRankingRow => Boolean(row?.playerId))
            .sort((a: WorldBossRankingRow, b: WorldBossRankingRow) => (a?.rank ?? 0) - (b?.rank ?? 0))
            .slice(0, 5)
        );
      } else if (msgType === "vote_status") {
        applyVoteStatusPayload(data);
      } else if (
        (msgType === "vote_session_opened" ||
          msgType === "vote_verify_result" ||
          msgType === "vote_claim_result") &&
        data.status &&
        typeof data.status === "object"
      ) {
        applyVoteStatusPayload(data.status as Record<string, unknown>);
      } else if (msgType === "vote_banners" && Array.isArray(data.banners)) {
        setVoteBanners((prev) => {
          const byId = new Map(prev.map((row) => [row.internalId, row]));
          const merged = data.banners
            .map((row: unknown) => {
              if (!row || typeof row !== "object") return null;
              const b = row as Record<string, unknown>;
              const internalId = typeof b.internalId === "string" ? b.internalId : "";
              if (!internalId) return null;
              const existing = byId.get(internalId);
              return {
                internalId,
                providerKey: typeof b.providerKey === "string" ? b.providerKey : existing?.providerKey ?? "",
                displayName: typeof b.displayName === "string" ? b.displayName : existing?.displayName ?? internalId,
                bannerImage: typeof b.bannerImage === "string" ? b.bannerImage : existing?.bannerImage ?? "",
                targetUrl: typeof b.targetUrl === "string" ? b.targetUrl : existing?.targetUrl ?? "",
                description: typeof b.description === "string" ? b.description : existing?.description,
                sortOrder: Math.max(0, Number(b.sortOrder ?? existing?.sortOrder ?? 0)),
                buffHours: Math.max(1, Number(b.buffHours ?? existing?.buffHours ?? 4)),
                cooldownHours: Math.max(1, Number(b.cooldownHours ?? existing?.cooldownHours ?? 24)),
                voteWindowHours: Math.max(1, Number(b.voteWindowHours ?? existing?.voteWindowHours ?? 12)),
                claimInstructions:
                  typeof b.claimInstructions === "string"
                    ? b.claimInstructions
                    : existing?.claimInstructions,
                status: existing?.status ?? "ready",
                cooldownRemainingMs: existing?.cooldownRemainingMs ?? 0,
                nextEligibleAt: existing?.nextEligibleAt ?? 0,
                session: existing?.session,
              } satisfies VoteBannerHud;
            })
            .filter((row): row is VoteBannerHud => Boolean(row))
            .sort((a: VoteBannerHud, b: VoteBannerHud) => (a?.sortOrder ?? 0) - (b?.sortOrder ?? 0));
          return merged;
        });
      } else if (
        (msgType === "warfront_status" || msgType === "warfront_info_result") &&
        data.status &&
        typeof data.status === "object"
      ) {
        const status = data.status as Record<string, unknown>;
        const sectors = Array.isArray(status.sectors) ? status.sectors : [];
        const personalRaw =
          status.personal && typeof status.personal === "object"
            ? (status.personal as Record<string, unknown>)
            : {};
        const nextTierRaw =
          personalRaw.nextTier && typeof personalRaw.nextTier === "object"
            ? (personalRaw.nextTier as Record<string, unknown>)
            : null;
        const frontBossRaw =
          status.frontBoss && typeof status.frontBoss === "object"
            ? (status.frontBoss as Record<string, unknown>)
            : {};
        setWarfront({
          cycleId: typeof status.cycleId === "string" ? status.cycleId : "",
          seasonId: typeof status.seasonId === "string" ? status.seasonId : "",
          phase:
            status.phase === "boss_ready" ||
            status.phase === "boss_active" ||
            status.phase === "cooldown"
              ? status.phase
              : "building",
          progressPct: Math.max(0, Math.min(100, Number(status.progressPct ?? 0))),
          endsAt: Math.max(0, Number(status.endsAt ?? 0)),
          sectors: sectors
            .map((row: unknown) => {
              if (!row || typeof row !== "object") return null;
              const s = row as Record<string, unknown>;
              const id = typeof s.id === "string" ? s.id : "";
              if (!id) return null;
              return {
                id,
                label: typeof s.label === "string" ? s.label : id,
                kind: s.kind === "crafting" || s.kind === "scouting" ? s.kind : "combat",
                routeKey: typeof s.routeKey === "string" ? s.routeKey : "",
                targetPoints: Math.max(0, Number(s.targetPoints ?? 0)),
                currentPoints: Math.max(0, Number(s.currentPoints ?? 0)),
                progressPct: Math.max(0, Math.min(100, Number(s.progressPct ?? 0))),
                yourPoints: Math.max(0, Number(s.yourPoints ?? 0)),
              } satisfies WarfrontHudSector;
            })
            .filter((row): row is WarfrontHudSector => Boolean(row)),
          personal: {
            cyclePoints: Math.max(0, Number(personalRaw.cyclePoints ?? 0)),
            seasonPoints: Math.max(0, Number(personalRaw.seasonPoints ?? 0)),
            nextTierPoints: nextTierRaw
              ? Math.max(0, Number(nextTierRaw.pointsRequired ?? 0))
              : undefined,
            nextTierLabel: nextTierRaw && typeof nextTierRaw.id === "string" ? nextTierRaw.id : undefined,
            claimedTierIds: Array.isArray(personalRaw.claimedTierIds)
              ? personalRaw.claimedTierIds.filter((x): x is string => typeof x === "string")
              : [],
          },
          frontBoss: {
            active: Boolean(frontBossRaw.active),
            npcId: typeof frontBossRaw.npcId === "string" ? frontBossRaw.npcId : null,
            mutator: typeof frontBossRaw.mutator === "string" ? frontBossRaw.mutator : null,
          },
        });
      }
    },
    [applyVoteStatusPayload, onServerMsg]
  );

  const syncInventoryFromPlayerState = useCallback(() => {
    const rows = getPlayerInventory();
    const items = rows
      .filter((r) => r && typeof r.id === "string")
      .map((r) => ({
        itemId: String(r.id),
        qty: Math.max(1, Math.floor(Number(r.quantity) || 1)),
      }));
    setInv({
      gold: getPlayerGold(),
      weight: getPlayerInventoryWeight(),
      maxWeight: getPlayerMaxCarryWeight(),
      items,
    });
  }, []);

  const syncQuestsFromPlayerState = useCallback(() => {
    setQuests(getPlayerQuests().filter((q) => !q.completed).map(clientQuestToNet));
  }, []);

  useEffect(() => {
    const unsub = subscribePlayerState(() => {
      syncInventoryFromPlayerState();
      syncQuestsFromPlayerState();
    });
    queueMicrotask(() => {
      syncInventoryFromPlayerState();
      syncQuestsFromPlayerState();
    });
    return unsub;
  }, [syncInventoryFromPlayerState, syncQuestsFromPlayerState]);

  useEffect(() => {
    const onYou = (ev: Event) => {
      const ce = ev as CustomEvent<{ playerId?: string }>;
      const id = typeof ce.detail?.playerId === "string" ? ce.detail.playerId.trim() : "";
      if (id) setYouId(id);
    };
    window.addEventListener("areloria:local-player-id", onYou as EventListener);
    return () => window.removeEventListener("areloria:local-player-id", onYou as EventListener);
  }, []);

  const onEntitySync = useCallback((raw: unknown[]) => {
    const nextEntities: EntityNet[] = [];
    for (const item of raw) {
      if (!item || typeof item !== "object") continue;
      const o = item as Record<string, unknown>;
      const id = typeof o.id === "string" ? o.id : "";
      if (!id) continue;
      const pos = (o.position || {}) as Record<string, unknown>;
      const x = Number(pos.x) || 0;
      const y = Number(pos.z) || 0;
      const name = typeof o.name === "string" ? o.name : id;
      const hp = Math.max(0, Number(o.health ?? 0));
      const hpMax = Math.max(1, Number(o.maxHealth ?? 1));
      const level = Math.max(1, Math.floor(Number(o.level ?? 1)));
      nextEntities.push({
        id,
        name,
        x,
        y,
        hp,
        hpMax,
        level,
        kind: mapEntityKind(o.type),
      });
      if (o.type === "loot") {
        const existing = lootMapRef.current.get(id);
        if (existing) {
          lootMapRef.current.set(id, { ...existing, x, y });
        }
      }
    }
    setEntities(nextEntities);
    setLoot(Array.from(lootMapRef.current.values()));
  }, []);

  const onLootSpawned = useCallback((raw: unknown) => {
    if (!raw || typeof raw !== "object") return;
    const bag = raw as LootNet;
    if (typeof bag.id !== "string") return;
    lootMapRef.current.set(bag.id, bag);
    setLoot(Array.from(lootMapRef.current.values()));
  }, []);

  const onLootDespawned = useCallback((lootId: string) => {
    lootMapRef.current.delete(lootId);
    setLoot(Array.from(lootMapRef.current.values()));
  }, []);

  return {
    youId,
    entities,
    loot,
    quests,
    inv,
    fxFeed,
    worldBossEncounter,
    worldBossTop,
    voteBuff,
    voteBanners,
    warfront,
    onServerMsg,
    onWirePayload,
    onEntitySync,
    onLootSpawned,
    onLootDespawned,
  };
}