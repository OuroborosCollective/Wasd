import React, { useMemo } from "react";
import type { EntityNet, FxKind, LootNet, QuestStateNet } from "../../../shared/protocol";
import type {
  WorldBossEncounterHud,
  WorldBossRankingRow,
} from "./useGameHudState";

function formatMsCompact(ms: number): string {
  const safe = Math.max(0, Math.floor(ms));
  const totalMinutes = Math.ceil(safe / 60000);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  if (h <= 0) return `${m}m`;
  return `${h}h ${m}m`;
}

type Props = {
  connected: boolean;
  youId?: string;
  entities: EntityNet[];
  loot: LootNet[];
  inv: {
    gold: number;
    weight: number;
    maxWeight: number;
    items: { itemId: string; qty: number }[];
  } | null;
  quests: QuestStateNet[];
  targetId?: string;
  onTarget: (id: string | undefined) => void;
  onAttack: () => void;
  onLootTake: (lootId: string) => void;
  onCraftOpen: () => void;
  onHousingOpen: () => void;
  fxFeed: Array<{ id: string; kind: FxKind; n?: number; x: number; y: number; t: number }>;
  questlineProgress?: string | null;
  worldBossEncounter?: WorldBossEncounterHud | null;
  worldBossTop?: WorldBossRankingRow[];
  voteBuff?: {
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
  voteBanners?: Array<{
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
  }>;
  onVoteRefresh: () => void;
  onVoteOpen: (bannerId: string) => void;
  onVoteVerify: (sessionId: string) => void;
  onVoteClaim: (sessionId: string) => void;
};

export function Hud(p: Props) {
  const you = useMemo(() => p.entities.find((e) => e.id === p.youId), [p.entities, p.youId]);
  const target = useMemo(() => p.entities.find((e) => e.id === p.targetId), [p.entities, p.targetId]);

  const nearLoot = useMemo(() => {
    if (!you) return [];
    const R2 = 3.5 * 3.5;
    return p.loot
      .filter((b) => {
        const dx = b.x - you.x;
        const dy = b.y - you.y;
        return dx * dx + dy * dy <= R2;
      })
      .slice(0, 3);
  }, [p.loot, you]);

  return (
    <div className="pointer-events-none fixed inset-0 z-[5500] text-slate-100">
      {/* Scrollable HUD column — avoids overlap on narrow phones; sits below legacy auth (z-12000) */}
      <div className="pointer-events-none absolute inset-x-0 top-0 bottom-[max(4rem,env(safe-area-inset-bottom,0px)+3.5rem)] overflow-y-auto overflow-x-hidden p-1.5 sm:p-3 md:bottom-28 md:p-4">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 md:gap-3">
          <div className="flex flex-col gap-2 md:grid md:grid-cols-3 md:items-start">
            <StatusCard connected={p.connected} you={you} />
            <div className="hidden md:block" />
            <MiniPanels inv={p.inv} onCraftOpen={p.onCraftOpen} onHousingOpen={p.onHousingOpen} />
          </div>

          <div className="md:max-w-xl">
            <TargetFrame target={target} onClear={() => p.onTarget(undefined)} onAttack={p.onAttack} />
          </div>

          <div className="grid grid-cols-1 gap-2 md:grid-cols-2 md:gap-3">
            <div>
              <QuestTracker quests={p.quests} />
              {p.questlineProgress ? (
                <div className="pointer-events-none mt-2 rounded-2xl border border-violet-500/30 bg-black/40 p-2 text-[11px] text-violet-200/90 backdrop-blur-md">
                  <div className="mb-1 text-[10px] uppercase tracking-widest text-violet-300/80">Questline</div>
                  <div className="leading-snug">{p.questlineProgress}</div>
                </div>
              ) : null}
              {p.worldBossEncounter ? (
                <div className="mt-2">
                  <WorldBossPanel
                    encounter={p.worldBossEncounter}
                    ranking={p.worldBossTop ?? []}
                  />
                </div>
              ) : null}
            </div>
            <LootPanel loot={nearLoot} onTake={p.onLootTake} />
          </div>
        </div>
      </div>

      <VoteMiniPanel
        voteBuff={p.voteBuff}
        voteBanners={p.voteBanners ?? []}
        onRefresh={p.onVoteRefresh}
        onVoteOpen={p.onVoteOpen}
        onVoteVerify={p.onVoteVerify}
        onVoteClaim={p.onVoteClaim}
      />

      <div className="pointer-events-auto fixed bottom-0 left-0 right-0 z-[5600] border-t border-white/5 bg-gradient-to-t from-black/70 to-transparent px-2 pb-[max(0.5rem,env(safe-area-inset-bottom,0px))] pt-1 md:px-4 md:pb-3 md:pt-2">
        <div className="mx-auto flex max-w-6xl justify-center">
          <Hotbar onAttack={p.onAttack} disabled={!p.connected} />
        </div>
      </div>

      <FxOverlay fx={p.fxFeed} />
    </div>
  );
}

function StatusCard({ connected, you }: { connected: boolean; you?: EntityNet }) {
  return (
    <div className="pointer-events-none rounded-2xl border border-white/10 bg-black/45 p-2.5 shadow-[0_12px_50px_rgba(0,0,0,0.55)] backdrop-blur-md sm:p-3 md:p-4">
      <div className="flex items-center justify-between gap-2 sm:gap-3">
        <div className="min-w-0">
          <div className="text-[10px] uppercase tracking-widest text-slate-300/80 sm:text-xs">Status</div>
          <div className="text-xs font-semibold sm:text-sm">
            {connected ? "Online" : "Offline"}{" "}
            <span className={connected ? "text-emerald-400" : "text-rose-400"}>{connected ? "●" : "●"}</span>
          </div>
        </div>
        {you && (
          <div className="min-w-0 text-right">
            <div className="truncate text-[11px] text-slate-300/80 sm:text-xs">
              {you.name} (Lv {you.level})
            </div>
            <HpBar hp={you.hp} hpMax={you.hpMax} />
          </div>
        )}
      </div>
    </div>
  );
}

function MiniPanels({
  inv,
  onCraftOpen,
  onHousingOpen,
}: {
  inv: Props["inv"];
  onCraftOpen: () => void;
  onHousingOpen: () => void;
}) {
  return (
    <div className="pointer-events-auto flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-white/10 bg-black/45 p-2.5 backdrop-blur-md sm:p-3 md:p-4">
      <div className="min-w-0 flex-1">
        <div className="text-[10px] uppercase tracking-widest text-slate-300/80 sm:text-xs">Inventory</div>
        <div className="text-xs font-semibold sm:text-sm">
          Gold: <span className="text-amber-300">{inv?.gold ?? 0}</span>
        </div>
        <div className="text-[10px] text-slate-300/80 sm:text-xs">
          Weight: {inv ? `${inv.weight}/${inv.maxWeight}` : "—"}
        </div>
      </div>
      <div className="flex shrink-0 gap-1.5 sm:gap-2">
        <button type="button" onClick={onCraftOpen} className={btn("sm")}>
          Craft
        </button>
        <button type="button" onClick={onHousingOpen} className={btn("sm")}>
          Housing
        </button>
      </div>
    </div>
  );
}

function TargetFrame({
  target,
  onAttack,
  onClear,
}: {
  target?: EntityNet;
  onAttack: () => void;
  onClear: () => void;
}) {
  if (!target) return null;
  return (
    <div className="pointer-events-auto flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-white/10 bg-black/45 p-2.5 backdrop-blur-md sm:p-3 md:p-4">
      <div className="min-w-0">
        <div className="text-[10px] uppercase tracking-widest text-slate-300/80 sm:text-xs">Ziel</div>
        <div className="truncate text-xs font-semibold sm:text-sm">
          {target.name} (Lv {target.level})
        </div>
        <HpBar hp={target.hp} hpMax={target.hpMax} />
      </div>
      <div className="flex shrink-0 gap-1.5 sm:gap-2">
        <button type="button" onClick={onAttack} className={btn("sm", "primary")}>
          Angreifen
        </button>
        <button type="button" onClick={onClear} className={btn("sm")}>
          X
        </button>
      </div>
    </div>
  );
}

function QuestTracker({ quests }: { quests: QuestStateNet[] }) {
  if (!quests?.length) {
    return (
      <div className="pointer-events-none rounded-xl border border-white/10 bg-black/35 px-2 py-1.5 text-[10px] text-slate-200/80 backdrop-blur-md sm:rounded-2xl sm:p-3 sm:text-xs">
        No active quests.
      </div>
    );
  }

  return (
    <div className="pointer-events-none rounded-xl border border-white/10 bg-black/35 px-2 py-1.5 backdrop-blur-md sm:rounded-2xl sm:p-3">
      <div className="mb-1 text-[9px] uppercase tracking-widest text-slate-300/80 sm:mb-2 sm:text-xs">Quests</div>
      <div className="space-y-1 sm:space-y-2">
        {quests.slice(0, 5).map((q) => (
          <div key={q.id} className="rounded-lg border border-white/10 bg-white/5 p-1 sm:rounded-xl sm:p-2">
            <div className="text-[10px] font-semibold leading-tight sm:text-sm">{q.title}</div>
            <div className="text-[9px] text-slate-200/80 sm:text-xs">{q.goalText}</div>
            <div className="mt-0.5 sm:mt-1">
              <div className="h-1 overflow-hidden rounded-full bg-white/10 sm:h-1.5">
                <div
                  className="h-full bg-emerald-400/90"
                  style={{ width: `${Math.floor((q.progress / Math.max(1, q.goal)) * 100)}%` }}
                />
              </div>
              <div className="mt-0.5 text-[8px] text-slate-200/70 sm:mt-1 sm:text-[11px]">
                {q.done ? "Fertig" : `${q.progress}/${q.goal}`}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function LootPanel({ loot, onTake }: { loot: LootNet[]; onTake: (id: string) => void }) {
  if (!loot.length) return null;
  return (
    <div className="pointer-events-auto rounded-2xl border border-white/10 bg-black/35 p-2.5 backdrop-blur-md sm:p-3">
      <div className="mb-1.5 text-[10px] uppercase tracking-widest text-slate-300/80 sm:mb-2 sm:text-xs">Beute in der Nähe</div>
      <div className="space-y-1.5 sm:space-y-2">
        {loot.map((b) => (
          <div
            key={b.id}
            className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/10 bg-white/5 p-1.5 sm:p-2"
          >
            <div className="min-w-0 flex-1">
              <div className="text-[10px] text-slate-200/80 sm:text-xs">
                {b.items.map((i) => `${i.qty}× ${i.itemId}`).join(", ")}
                {b.gear?.length
                  ? (b.items.length ? " · " : "") +
                    b.gear.map((g) => `[${g.rarity}] ${g.name}`).join(", ")
                  : ""}{" "}
                {b.gold ? `+${b.gold}g` : ""}
              </div>
              <div className="text-[9px] text-slate-200/60 sm:text-[11px]">ID: {b.id.slice(0, 8)}</div>
            </div>
            <button type="button" onClick={() => onTake(b.id)} className={btn("sm", "primary")}>
              Nehmen
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function Hotbar({ onAttack, disabled }: { onAttack: () => void; disabled: boolean }) {
  return (
    <div className="w-full max-w-[min(100%,28rem)] rounded-2xl border border-white/10 bg-black/60 p-1.5 shadow-[0_12px_50px_rgba(0,0,0,0.55)] backdrop-blur-md sm:max-w-none sm:p-2 md:p-3">
      <div className="flex flex-wrap justify-center gap-1 sm:gap-2">
        <KeySlot keyHint="1" label="Atk" onClick={onAttack} disabled={disabled} />
        <KeySlot keyHint="2" label="Skl" onClick={() => {}} disabled />
        <KeySlot keyHint="3" label="Pot" onClick={() => {}} disabled />
        <KeySlot keyHint="I" label="Inv" onClick={() => {}} disabled />
        <KeySlot keyHint="Q" label="Qst" onClick={() => {}} disabled />
      </div>
      <div className="mt-1 hidden text-center text-[10px] text-slate-200/70 sm:mt-2 md:block md:text-[11px]">
        Tip: Tap a monster to attack (press 1).
      </div>
    </div>
  );
}

function KeySlot({
  keyHint,
  label,
  onClick,
  disabled,
}: {
  keyHint: string;
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={[
        "relative h-11 min-w-[2.75rem] flex-1 overflow-hidden rounded-xl border sm:h-12 sm:min-w-[3rem] md:h-14 md:w-14 md:flex-none",
        "border-white/10 bg-gradient-to-b from-white/10 to-white/5",
        "transition hover:from-white/15 hover:to-white/10 active:scale-[0.98]",
        "disabled:opacity-40 disabled:hover:from-white/10 disabled:hover:to-white/5",
      ].join(" ")}
    >
      <span className="absolute left-1.5 top-1 text-[9px] font-semibold text-slate-200/80 sm:left-2 sm:top-1.5 sm:text-[10px]">
        {keyHint}
      </span>
      <span className="text-[10px] font-semibold sm:text-xs">{label}</span>
    </button>
  );
}

function HpBar({ hp, hpMax }: { hp: number; hpMax: number }) {
  const pct = Math.max(0, Math.min(100, Math.floor((hp / Math.max(1, hpMax)) * 100)));
  return (
    <div className="mt-0.5 sm:mt-1">
      <div className="h-1.5 overflow-hidden rounded-full bg-white/10 sm:h-2">
        <div
          className={`h-full ${pct > 50 ? "bg-emerald-400" : pct > 20 ? "bg-amber-400" : "bg-rose-500"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="mt-0.5 text-[10px] text-slate-200/70 sm:mt-1 sm:text-[11px]">
        {hp}/{hpMax}
      </div>
    </div>
  );
}

function WorldBossPanel({
  encounter,
  ranking,
}: {
  encounter: WorldBossEncounterHud;
  ranking: WorldBossRankingRow[];
}) {
  // On desktop (sm+), always show expanded. On mobile, start collapsed.
  const [expanded, setExpanded] = React.useState(false);
  const panelRef = React.useRef<HTMLDivElement>(null);
  const hpPct = Math.max(
    0,
    Math.min(
      100,
      Math.floor((encounter.bossHp / Math.max(1, encounter.bossHpMax)) * 100),
    ),
  );
  const respawnSecs = Math.max(
    0,
    Math.ceil((encounter.respawnRemainingMs ?? 0) / 1000),
  );

  // Collapsed mini-bar: visible on mobile when not expanded, hidden on desktop
  const collapsedBar = !expanded ? (
    <div
      className="pointer-events-auto cursor-pointer rounded-xl border border-red-500/35 bg-black/45 px-2.5 py-1.5 text-[10px] backdrop-blur-md sm:hidden"
      onClick={() => setExpanded(true)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === "Enter") setExpanded(true); }}
    >
      <div className="flex items-center gap-2">
        <span className="shrink-0 text-red-300/90">⚔</span>
        <span className="truncate text-red-100/80">{encounter.bossName}</span>
        <span className="shrink-0 text-slate-200/60">
          {Math.max(0, Math.floor(encounter.bossHp))}/{Math.max(1, Math.floor(encounter.bossHpMax))}
        </span>
      </div>
      <div className="mt-1 h-1 overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full bg-gradient-to-r from-red-600 to-orange-400"
          style={{ width: `${hpPct}%` }}
        />
      </div>
    </div>
  ) : null;

  // Full panel: always visible on desktop, visible on mobile when expanded
  return (
    <>
      {collapsedBar}
      <div
        ref={panelRef}
        className={[
          "pointer-events-none rounded-2xl border border-red-500/35 bg-black/45 p-1.5 text-[10px] backdrop-blur-md sm:p-3 sm:text-xs",
          // Hide on mobile when collapsed, always show on desktop
          expanded ? "" : "hidden sm:block",
        ].join(" ")}
      >
        <div className="pointer-events-auto mb-1 flex items-center justify-between gap-2">
          <div className="uppercase tracking-widest text-red-300/90">Worldboss</div>
          <div className="flex items-center gap-2">
            <div className="truncate text-red-100/80">{encounter.bossName}</div>
            {expanded ? (
              <button
                type="button"
                onClick={() => setExpanded(false)}
                className="shrink-0 rounded-md border border-white/10 bg-white/5 px-1.5 py-0.5 text-[9px] text-slate-300 hover:bg-white/10 sm:hidden"
              >
                ✕
              </button>
            ) : null}
          </div>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-white/10 sm:h-2">
          <div
            className="h-full bg-gradient-to-r from-red-600 to-orange-400"
            style={{ width: `${hpPct}%` }}
          />
        </div>
        <div className="mt-1 text-slate-200/80">
          HP {Math.max(0, Math.floor(encounter.bossHp))}/
          {Math.max(1, Math.floor(encounter.bossHpMax))}
          {respawnSecs > 0 ? ` · Respawn ${respawnSecs}s` : ""}
        </div>
        {ranking.length > 0 ? (
          <div className="mt-1.5 space-y-0.5 text-slate-100/90 sm:mt-2 sm:space-y-1">
            <div className="uppercase tracking-widest text-[9px] text-amber-300/90 sm:text-[10px]">
              Damage Top 5
            </div>
            {ranking.map((row) => (
              <div key={`${row.playerId}-${row.rank}`} className="flex justify-between gap-2">
                <span>
                  #{row.rank} {row.playerName}
                </span>
                <span className="text-amber-200">{Math.max(0, Math.floor(row.damage))}</span>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </>
  );
}

function voteStatusLabel(status: string): string {
  if (status === "claimable") return "Reward claimable";
  if (status === "pending") return "Verification running";
  if (status === "cooldown") return "Already voted today";
  return "Vote now";
}

function voteActionLabel(status: string): string {
  if (status === "claimable") return "Claim";
  if (status === "pending") return "Verify";
  return "Vote";
}

function VoteMiniPanel({
  voteBuff,
  voteBanners,
  onRefresh,
  onVoteOpen,
  onVoteVerify,
  onVoteClaim,
}: {
  voteBuff: Props["voteBuff"];
  voteBanners: NonNullable<Props["voteBanners"]>;
  onRefresh: Props["onVoteRefresh"];
  onVoteOpen: Props["onVoteOpen"];
  onVoteVerify: Props["onVoteVerify"];
  onVoteClaim: Props["onVoteClaim"];
}) {
  const [open, setOpen] = React.useState(false);
  const remaining = voteBuff?.totalRemainingMs ?? 0;
  const hasBuff = (voteBuff?.activeMultiplier ?? 1) > 1 && remaining > 0;

  return (
    <div className="pointer-events-auto fixed right-2 top-1/2 z-[5650] -translate-y-1/2 sm:right-3">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="group flex min-h-[44px] items-center gap-2 rounded-full border border-indigo-400/40 bg-black/60 px-3 py-2 text-xs text-indigo-100 shadow-[0_10px_28px_rgba(0,0,0,0.45)] backdrop-blur-md"
      >
        <span className="text-base">🗳️</span>
        <span className="font-semibold">Vote</span>
        <span className={hasBuff ? "text-emerald-300" : "text-slate-300/80"}>
          {hasBuff ? `x${voteBuff?.activeMultiplier ?? 2}` : "x1"}
        </span>
      </button>
      {open ? (
        <div className="mt-2 w-[min(88vw,420px)] rounded-2xl border border-indigo-400/30 bg-black/80 p-3 text-[11px] text-slate-100 shadow-[0_20px_60px_rgba(0,0,0,0.55)] backdrop-blur-md sm:text-xs">
          <div className="mb-2 flex items-center justify-between gap-2">
            <div className="uppercase tracking-widest text-indigo-200">Vote Forge</div>
            <button type="button" onClick={onRefresh} className={btn("sm")}>
              Refresh
            </button>
          </div>
          <div className="mb-2 text-slate-200/90">
            Active Vote Buff:{" "}
            <span className={hasBuff ? "text-emerald-300" : "text-slate-300/80"}>
              {hasBuff ? `x${voteBuff?.activeMultiplier ?? 2} (${formatMsCompact(remaining)})` : "not active"}
            </span>
          </div>
          {voteBanners.length === 0 ? (
            <div className="rounded-xl border border-white/10 bg-white/5 p-2 text-slate-300/80">
              No active vote banners configured.
            </div>
          ) : (
            <div className="space-y-2">
              {voteBanners.map((banner) => {
                const sessionId = banner.session?.id ?? "";
                return (
                  <div key={banner.internalId} className="rounded-xl border border-white/10 bg-white/5 p-2">
                    <div className="mb-1 flex items-center justify-between gap-2">
                      <div className="font-semibold text-indigo-100">{banner.displayName}</div>
                      <div className="text-[10px] text-slate-300">{voteStatusLabel(banner.status)}</div>
                    </div>
                    {banner.description ? (
                      <div className="mb-1 text-[10px] text-slate-300/85">{banner.description}</div>
                    ) : null}
                    <div className="mb-2 text-[10px] text-slate-300/80">
                      +{banner.buffHours}h XP-Buff · Cooldown {banner.cooldownHours}h
                      {banner.status === "cooldown"
                        ? ` · wieder in ${formatMsCompact(banner.cooldownRemainingMs)}`
                        : ""}
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          if (banner.status === "claimable" && sessionId) {
                            onVoteClaim(sessionId);
                            return;
                          }
                          if (banner.status === "pending" && sessionId) {
                            onVoteVerify(sessionId);
                            return;
                          }
                          onVoteOpen(banner.internalId);
                        }}
                        className={btn("sm", "primary")}
                      >
                        {voteActionLabel(banner.status)}
                      </button>
                      <a
                        href={banner.session?.voteUrl || banner.targetUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex min-h-[36px] items-center rounded-xl border border-white/15 px-2 py-1 text-[11px] text-slate-100 hover:bg-white/10"
                      >
                        Open External
                      </a>
                      {banner.status === "pending" && sessionId ? (
                        <button
                          type="button"
                          onClick={() => onVoteVerify(sessionId)}
                          className={btn("sm")}
                        >
                          Verify now
                        </button>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}

function FxOverlay({ fx }: { fx: Props["fxFeed"] }) {
  const last = fx.slice(-4);
  return (
    <div className="pointer-events-none absolute left-1/2 top-[40%] z-[5400] -translate-x-1/2 space-y-1 md:top-1/2">
      {last.map((f) => (
        <div
          key={f.id}
          className={[
            "text-center text-lg font-extrabold tracking-tight drop-shadow sm:text-2xl md:text-3xl",
            f.kind === "crit"
              ? "text-rose-300"
              : f.kind === "hit"
                ? "text-amber-200"
                : f.kind === "heal"
                  ? "text-emerald-200"
                  : f.kind === "xp"
                    ? "text-sky-200"
                    : f.kind === "gold"
                      ? "text-amber-300"
                      : f.kind === "block"
                        ? "text-slate-100"
                        : "text-slate-200",
          ].join(" ")}
        >
          {f.n ?? (f.kind === "miss" ? "MISS" : "")}
        </div>
      ))}
    </div>
  );
}

function btn(size?: "sm", variant?: "primary") {
  const sz =
    size === "sm"
      ? "px-2 py-1.5 text-[11px] sm:px-3 sm:py-2 sm:text-sm"
      : "px-3 py-2 text-sm font-semibold shadow-[0_8px_25px_rgba(0,0,0,0.35)]";
  const col =
    variant === "primary"
      ? "border-white/10 bg-gradient-to-b from-indigo-400/90 to-indigo-600/90 hover:from-indigo-300/90 hover:to-indigo-500/90"
      : "border-white/10 bg-white/5 hover:bg-white/10";
  return ["rounded-xl border font-semibold transition active:scale-[0.98]", sz, col].join(" ");
}
