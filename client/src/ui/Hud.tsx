import React, { useMemo } from "react";
import type { EntityNet, FxKind, LootNet, QuestStateNet } from "../../../shared/protocol";

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
      <div className="pointer-events-none absolute inset-x-0 top-0 bottom-[max(5.5rem,env(safe-area-inset-bottom,0px)+5rem)] overflow-y-auto overflow-x-hidden p-2 sm:p-3 md:bottom-28 md:p-4">
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
                  <div className="mb-1 text-[10px] uppercase tracking-widest text-violet-300/80">Leinenstrang</div>
                  <div className="leading-snug">{p.questlineProgress}</div>
                </div>
              ) : null}
            </div>
            <LootPanel loot={nearLoot} onTake={p.onLootTake} />
          </div>
        </div>
      </div>

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
    <div
      className="pointer-events-auto flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-white/10 bg-black/45 p-2.5 backdrop-blur-md sm:p-3 md:p-4"
      onTouchStart={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <div className="min-w-0 flex-1">
        <div className="text-[10px] uppercase tracking-widest text-slate-300/80 sm:text-xs">Inventar</div>
        <div className="text-xs font-semibold sm:text-sm">
          Gold: <span className="text-amber-300">{inv?.gold ?? 0}</span>
        </div>
        <div className="text-[10px] text-slate-300/80 sm:text-xs">
          Gewicht: {inv ? `${inv.weight}/${inv.maxWeight}` : "—"}
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
    <div
      className="pointer-events-auto flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-white/10 bg-black/45 p-2.5 backdrop-blur-md sm:p-3 md:p-4"
      onTouchStart={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
    >
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
      <div className="pointer-events-none rounded-2xl border border-white/10 bg-black/35 p-2.5 text-[11px] text-slate-200/80 backdrop-blur-md sm:p-3 sm:text-xs">
        Keine aktiven Quests.
      </div>
    );
  }

  return (
    <div className="pointer-events-none rounded-2xl border border-white/10 bg-black/35 p-2.5 backdrop-blur-md sm:p-3">
      <div className="mb-1.5 text-[10px] uppercase tracking-widest text-slate-300/80 sm:mb-2 sm:text-xs">Quests</div>
      <div className="space-y-1.5 sm:space-y-2">
        {quests.slice(0, 5).map((q) => (
          <div key={q.id} className="rounded-xl border border-white/10 bg-white/5 p-1.5 sm:p-2">
            <div className="text-xs font-semibold leading-tight sm:text-sm">{q.title}</div>
            <div className="text-[10px] text-slate-200/80 sm:text-xs">{q.goalText}</div>
            <div className="mt-1">
              <div className="h-1.5 overflow-hidden rounded-full bg-white/10 sm:h-2">
                <div
                  className="h-full bg-emerald-400/90"
                  style={{ width: `${Math.floor((q.progress / Math.max(1, q.goal)) * 100)}%` }}
                />
              </div>
              <div className="mt-0.5 text-[10px] text-slate-200/70 sm:mt-1 sm:text-[11px]">
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
    <div
      className="pointer-events-auto rounded-2xl border border-white/10 bg-black/35 p-2.5 backdrop-blur-md sm:p-3"
      onTouchStart={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
    >
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
    <div
      className="pointer-events-auto w-full max-w-[min(100%,28rem)] rounded-2xl border border-white/10 bg-black/60 p-1.5 shadow-[0_12px_50px_rgba(0,0,0,0.55)] backdrop-blur-md sm:max-w-none sm:p-2 md:p-3"
      onTouchStart={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <div className="flex flex-wrap justify-center gap-1 sm:gap-2">
        <KeySlot keyHint="1" label="Atk" onClick={onAttack} disabled={disabled} />
        <KeySlot keyHint="2" label="Skl" onClick={() => {}} disabled />
        <KeySlot keyHint="3" label="Pot" onClick={() => {}} disabled />
        <KeySlot keyHint="I" label="Inv" onClick={() => {}} disabled />
        <KeySlot keyHint="Q" label="Qst" onClick={() => {}} disabled />
      </div>
      <div className="mt-1 hidden text-center text-[10px] text-slate-200/70 sm:mt-2 md:block md:text-[11px]">
        Tipp: Monster antippen → „Atk“ oder Taste 1.
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
