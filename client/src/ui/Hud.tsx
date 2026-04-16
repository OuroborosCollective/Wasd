import React, { useMemo } from "react";
import type { EntityNet, LootNet, QuestStateNet } from "@shared/protocol";

export type HudProps = {
  connected: boolean;
  youId?: string;
  entities: EntityNet[];
  loot: LootNet[];
  inv: {
    gold: number;
    weight: number;
    maxWeight: number;
    items: { itemId: string; qty: number; name?: string }[];
  } | null;
  quests: QuestStateNet[];
  targetId?: string;
  onTarget: (id: string | undefined) => void;
  onAttack: () => void;
  onLootTake: (lootId: string) => void;
  onCraftOpen: () => void;
  onHousingOpen: () => void;
  onInventoryOpen?: () => void;
  onQuestLogOpen?: () => void;
  fxFeed: Array<{ id: string; kind: string; n?: number; x: number; y: number; t: number }>;
};

export function Hud(p: HudProps) {
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
    <div className="pointer-events-none fixed inset-0 z-[4800] text-slate-100 font-sans">
      <div className="pointer-events-none absolute left-0 right-0 top-0 p-3 md:p-4">
        <div className="mx-auto grid max-w-6xl grid-cols-2 items-start gap-3 md:grid-cols-3">
          <StatusCard connected={p.connected} you={you} />
          <div className="hidden md:block" />
          <MiniPanels inv={p.inv} onCraftOpen={p.onCraftOpen} onHousingOpen={p.onHousingOpen} />
        </div>
      </div>

      <div className="pointer-events-none absolute left-0 right-0 top-[72px] px-3 md:top-[86px] md:px-4">
        <div className="mx-auto max-w-6xl">
          <TargetFrame target={target} onClear={() => p.onTarget(undefined)} onAttack={p.onAttack} />
        </div>
      </div>

      <div className="pointer-events-none absolute left-3 top-[150px] w-[min(420px,calc(100vw-24px))] md:left-4 md:top-[170px]">
        <QuestTracker quests={p.quests} />
      </div>

      <div className="pointer-events-none absolute right-3 top-[150px] w-[min(360px,calc(100vw-24px))] md:right-4 md:top-[170px]">
        <LootPanel loot={nearLoot} onTake={p.onLootTake} />
      </div>

      <div className="pointer-events-auto absolute bottom-0 left-0 right-0 p-3 md:p-4">
        <div className="mx-auto flex max-w-6xl items-end justify-center">
          <Hotbar
            onAttack={p.onAttack}
            onInventory={p.onInventoryOpen ?? p.onCraftOpen}
            onQuests={p.onQuestLogOpen ?? p.onHousingOpen}
            disabled={!p.connected}
          />
        </div>
      </div>

      <FxOverlay fx={p.fxFeed} />
    </div>
  );
}

function StatusCard({ connected, you }: { connected: boolean; you?: EntityNet }) {
  return (
    <div className="pointer-events-none rounded-2xl border border-white/10 bg-black/45 p-3 shadow-[0_12px_50px_rgba(0,0,0,0.55)] backdrop-blur-md md:p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-xs uppercase tracking-widest text-slate-300/80">Status</div>
          <div className="text-sm font-semibold">
            {connected ? "Online" : "Offline"}{" "}
            <span className={connected ? "text-emerald-400" : "text-rose-400"}>●</span>
          </div>
        </div>
        {you && (
          <div className="text-right">
            <div className="text-xs text-slate-300/80">
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
  inv: HudProps["inv"];
  onCraftOpen: () => void;
  onHousingOpen: () => void;
}) {
  return (
    <div className="pointer-events-auto flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-black/45 p-3 backdrop-blur-md md:p-4">
      <div className="min-w-0">
        <div className="text-xs uppercase tracking-widest text-slate-300/80">Inventar</div>
        <div className="text-sm font-semibold">
          Gold: <span className="text-amber-300">{inv?.gold ?? 0}</span>
        </div>
        <div className="text-xs text-slate-300/80">Gewicht: {inv ? `${inv.weight}/${inv.maxWeight}` : "—"}</div>
      </div>
      <div className="flex gap-2">
        <button type="button" onClick={onCraftOpen} className={btn()}>
          Craft
        </button>
        <button type="button" onClick={onHousingOpen} className={btn()}>
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
    <div className="pointer-events-auto flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-black/45 p-3 backdrop-blur-md md:p-4">
      <div className="min-w-0">
        <div className="text-xs uppercase tracking-widest text-slate-300/80">Ziel</div>
        <div className="truncate text-sm font-semibold">
          {target.name} (Lv {target.level})
        </div>
        <HpBar hp={target.hp} hpMax={target.hpMax} />
      </div>
      <div className="flex gap-2">
        <button type="button" onClick={onAttack} className={btn("primary")}>
          Angreifen
        </button>
        <button type="button" onClick={onClear} className={btn()}>
          X
        </button>
      </div>
    </div>
  );
}

function QuestTracker({ quests }: { quests: QuestStateNet[] }) {
  if (!quests?.length)
    return (
      <div className="pointer-events-none rounded-2xl border border-white/10 bg-black/35 p-3 text-xs text-slate-200/80 backdrop-blur-md">
        Keine aktiven Quests.
      </div>
    );

  return (
    <div className="pointer-events-none rounded-2xl border border-white/10 bg-black/35 p-3 backdrop-blur-md">
      <div className="mb-2 text-xs uppercase tracking-widest text-slate-300/80">Quests</div>
      <div className="space-y-2">
        {quests.slice(0, 5).map((q) => (
          <div key={q.id} className="rounded-xl border border-white/10 bg-white/5 p-2">
            <div className="text-sm font-semibold leading-tight">{q.title}</div>
            <div className="text-xs text-slate-200/80">{q.goalText}</div>
            <div className="mt-1">
              <div className="h-2 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full bg-emerald-400/90"
                  style={{ width: `${Math.floor((q.progress / Math.max(1, q.goal)) * 100)}%` }}
                />
              </div>
              <div className="mt-1 text-[11px] text-slate-200/70">{q.done ? "Fertig" : `${q.progress}/${q.goal}`}</div>
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
    <div className="pointer-events-auto rounded-2xl border border-white/10 bg-black/35 p-3 backdrop-blur-md">
      <div className="mb-2 text-xs uppercase tracking-widest text-slate-300/80">Beute in der Nähe</div>
      <div className="space-y-2">
        {loot.map((b) => (
          <div
            key={b.id}
            className="flex items-center justify-between gap-2 rounded-xl border border-white/10 bg-white/5 p-2"
          >
            <div className="min-w-0">
              <div className="text-xs text-slate-200/80">
                {b.items.map((i) => `${i.qty}× ${i.name ?? i.itemId}`).join(", ")}{" "}
                {b.gold ? `+${b.gold}g` : ""}
              </div>
              <div className="text-[11px] text-slate-200/60">ID: {b.id.slice(0, 8)}</div>
            </div>
            <button type="button" onClick={() => onTake(b.id)} className={btn("primary")}>
              Nehmen
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function Hotbar({
  onAttack,
  onInventory,
  onQuests,
  disabled,
}: {
  onAttack: () => void;
  onInventory: () => void;
  onQuests: () => void;
  disabled: boolean;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/55 p-2 shadow-[0_12px_50px_rgba(0,0,0,0.55)] backdrop-blur-md md:p-3">
      <div className="flex flex-wrap justify-center gap-2">
        <KeySlot keyHint="1" label="Attack" onClick={onAttack} disabled={disabled} />
        <KeySlot keyHint="2" label="Skill" onClick={() => undefined} disabled />
        <KeySlot keyHint="3" label="Potion" onClick={() => undefined} disabled />
        <KeySlot keyHint="I" label="Inv" onClick={onInventory} disabled={disabled} />
        <KeySlot keyHint="Q" label="Quests" onClick={onQuests} disabled={disabled} />
      </div>
      <div className="mt-2 hidden text-center text-[11px] text-slate-200/70 md:block">
        Tipp: Ziel wählen → „1“ oder „Angreifen“.
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
        "relative h-14 w-14 overflow-hidden rounded-xl border md:h-16 md:w-16",
        "border-white/10 bg-gradient-to-b from-white/10 to-white/5",
        "transition hover:from-white/15 hover:to-white/10 active:scale-[0.98]",
        "disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:from-white/10 disabled:hover:to-white/5",
      ].join(" ")}
    >
      <span className="absolute left-2 top-2 text-[10px] font-semibold text-slate-200/80">{keyHint}</span>
      <span className="text-xs font-semibold">{label}</span>
    </button>
  );
}

function HpBar({ hp, hpMax }: { hp: number; hpMax: number }) {
  const pct = Math.max(0, Math.min(100, Math.floor((hp / Math.max(1, hpMax)) * 100)));
  return (
    <div className="mt-1">
      <div className="h-2 overflow-hidden rounded-full bg-white/10">
        <div
          className={`h-full ${pct > 50 ? "bg-emerald-400" : pct > 20 ? "bg-amber-400" : "bg-rose-500"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="mt-1 text-[11px] text-slate-200/70">
        {hp}/{hpMax}
      </div>
    </div>
  );
}

function FxOverlay({ fx }: { fx: HudProps["fxFeed"] }) {
  const last = fx.slice(-4);
  return (
    <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 space-y-1">
      {last.map((f) => (
        <div
          key={f.id}
          className={[
            "text-center font-extrabold tracking-tight drop-shadow",
            f.kind === "crit"
              ? "text-3xl text-rose-300"
              : f.kind === "hit"
                ? "text-2xl text-amber-200"
                : f.kind === "heal"
                  ? "text-2xl text-emerald-200"
                  : f.kind === "gold" || f.kind === "xp"
                    ? "text-2xl text-amber-300"
                    : "text-xl text-slate-200",
          ].join(" ")}
        >
          {f.n ?? (f.kind === "miss" ? "MISS" : "")}
        </div>
      ))}
    </div>
  );
}

function btn(variant?: "primary") {
  return [
    "rounded-xl border px-3 py-2 text-sm font-semibold transition active:scale-[0.98]",
    "shadow-[0_8px_25px_rgba(0,0,0,0.35)]",
    variant === "primary"
      ? "border-white/10 bg-gradient-to-b from-indigo-400/90 to-indigo-600/90 hover:from-indigo-300/90 hover:to-indigo-500/90"
      : "border-white/10 bg-white/5 hover:bg-white/10",
  ].join(" ");
}
