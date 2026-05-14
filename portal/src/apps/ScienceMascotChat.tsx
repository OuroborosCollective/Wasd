import React, { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import type { VisualThemeState } from "@wasd/shared";
import { completeScienceMascotChat } from "../ai/scienceMascotBrain";
import { PortalWorldHistory } from "../world/PortalWorldHistory";

type Role = "user" | "assistant";

interface ChatLine {
  id: string;
  role: Role;
  content: string;
  source?: "gemini" | "local";
}

export interface ScienceMascotChatProps {
  visual: VisualThemeState;
  /** When false, chat is disabled (sync paused). */
  active: boolean;
}

const ScienceMascotChat: React.FC<ScienceMascotChatProps> = ({ visual, active }) => {
  const hist = useMemo(() => PortalWorldHistory.getInstance(), []);
  const digest = useSyncExternalStore(
    (onStore) => hist.subscribe(onStore),
    () => hist.getEchoDigestSummary(12),
    () => hist.getEchoDigestSummary(12),
  );

  const visualRef = useRef(visual);
  useEffect(() => {
    visualRef.current = visual;
  }, [visual]);

  const [lines, setLines] = useState<ChatLine[]>([
    {
      id: "boot",
      role: "assistant",
      content:
        visual.mode === "fire_glitch"
          ? "Emily online. Hazard hot — keep queries tight."
          : "Emily online. Marina band stable — ask with context; I read echoes + hazard.",
      source: "local",
    },
  ]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  const fire = visual.mode === "fire_glitch";

  const send = useCallback(async () => {
    const text = input.trim();
    if (!text || !active || busy) return;
    setInput("");
    setBusy(true);
    const userLine: ChatLine = { id: `u_${Date.now()}`, role: "user", content: text };
    setLines((prev) => [...prev, userLine]);
    try {
      const { text: reply, source } = await completeScienceMascotChat(text, visualRef.current);
      setLines((prev) => [
        ...prev,
        { id: `a_${Date.now()}`, role: "assistant", content: reply, source },
      ]);
    } catch (e) {
      setLines((prev) => [
        ...prev,
        {
          id: `e_${Date.now()}`,
          role: "assistant",
          content: `Emily fault: ${e instanceof Error ? e.message : String(e)}`,
          source: "local",
        },
      ]);
    } finally {
      setBusy(false);
      requestAnimationFrame(() => {
        listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
      });
    }
  }, [input, active, busy]);

  const probeStress = useCallback(async () => {
    if (!active || busy) return;
    setBusy(true);
    const q =
      "Stress probe: one line — count combat vs trade echoes in the last window and state hazard_index.";
    setLines((prev) => [...prev, { id: `u_p_${Date.now()}`, role: "user", content: q }]);
    try {
      const { text: reply, source } = await completeScienceMascotChat(q, visualRef.current);
      setLines((prev) => [
        ...prev,
        { id: `a_p_${Date.now()}`, role: "assistant", content: reply, source },
      ]);
    } finally {
      setBusy(false);
    }
  }, [active, busy]);

  const panelStyle: React.CSSProperties = {
    border: "1px solid color-mix(in srgb, var(--wasd-aura) 45%, transparent)",
    boxShadow: fire
      ? `0 0 26px color-mix(in srgb, var(--wasd-aura) 40%, transparent), inset 0 0 0 1px color-mix(in srgb, var(--wasd-aura) 22%, transparent)`
      : `0 0 20px color-mix(in srgb, var(--wasd-aura) 28%, transparent), inset 0 1px 0 color-mix(in srgb, var(--wasd-aura) 15%, transparent)`,
    background: `linear-gradient(165deg, color-mix(in srgb, var(--wasd-aura-secondary) 50%, #020617) 0%, rgba(15,23,42,0.82) 42%, rgba(2,6,23,0.94) 100%)`,
    backdropFilter: "blur(10px)",
    animation: fire
      ? `mascotPanelGlitch calc(var(--wasd-phase-period, 0.9s) * 0.85) ease-in-out infinite`
      : undefined,
  };

  return (
    <div className="relative overflow-hidden rounded-xl p-3 text-slate-100" style={panelStyle}>
      <div
        className="pointer-events-none absolute inset-0 opacity-30"
        style={{
          background: `radial-gradient(circle at 20% 0%, color-mix(in srgb, var(--wasd-aura) 55%, transparent), transparent 55%)`,
        }}
      />
      <style>{`
        @keyframes mascotPanelGlitch {
          0%, 100% { filter: brightness(1); transform: translateX(0); }
          50% { filter: brightness(1.06); transform: translateX(0.4px); }
        }
      `}</style>

      <div className="relative z-10">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <div>
            <div
              className="text-xs font-bold uppercase tracking-[0.2em]"
              style={{
                color: "var(--wasd-aura)",
                textShadow: `0 0 14px color-mix(in srgb, var(--wasd-aura) 55%, transparent)`,
              }}
            >
              Emily · Sovereign channel
            </div>
            <div className="text-[10px] text-slate-500">Screen 10 · ThemeEngine CSS vars</div>
          </div>
          <div
            className="rounded border px-2 py-0.5 font-mono text-[10px]"
            style={{
              borderColor: "color-mix(in srgb, var(--wasd-aura) 35%, transparent)",
              color: "color-mix(in srgb, var(--wasd-aura) 90%, #fff)",
            }}
          >
            h={visual.hazardIndex.toFixed(2)} · {visual.mode}
          </div>
        </div>

        <div
          ref={listRef}
          className="mb-2 max-h-52 space-y-2 overflow-y-auto rounded-lg p-2 text-sm"
          style={{
            border: "1px solid color-mix(in srgb, var(--wasd-aura) 18%, transparent)",
            background: "rgba(2,6,23,0.45)",
            fontFamily: fire ? "ui-monospace, monospace" : "inherit",
            letterSpacing: fire ? "0.03em" : "normal",
            boxShadow: `inset 0 0 24px color-mix(in srgb, var(--wasd-aura) 6%, transparent)`,
          }}
        >
          {lines.map((ln) => (
            <div
              key={ln.id}
              className={`rounded-md px-2 py-1.5 ${ln.role === "user" ? "ml-3" : "mr-3"}`}
              style={
                ln.role === "user"
                  ? {
                      background: "color-mix(in srgb, var(--wasd-aura-secondary) 35%, #0f172a)",
                      border: "1px solid color-mix(in srgb, var(--wasd-aura) 22%, transparent)",
                      color: "#e2e8f0",
                    }
                  : {
                      background: "color-mix(in srgb, var(--wasd-aura) 12%, rgba(15,23,42,0.95))",
                      border: "1px solid color-mix(in srgb, var(--wasd-aura) 28%, transparent)",
                      color: fire ? "#fecaca" : "#ecfeff",
                      boxShadow: fire
                        ? `0 0 12px color-mix(in srgb, var(--wasd-aura) 25%, transparent)`
                        : `0 0 8px color-mix(in srgb, var(--wasd-aura) 12%, transparent)`,
                    }
              }
            >
              <div
                className="text-[10px] uppercase"
                style={{ color: "color-mix(in srgb, var(--wasd-aura) 65%, #94a3b8)" }}
              >
                {ln.role}
                {ln.source ? ` · ${ln.source}` : ""}
              </div>
              <div className="whitespace-pre-wrap leading-snug">{ln.content}</div>
            </div>
          ))}
        </div>

        <div
          className="mb-2 rounded-md px-2 py-1.5 font-mono text-[10px] leading-relaxed text-slate-300"
          style={{
            border: "1px dashed color-mix(in srgb, var(--wasd-aura) 25%, transparent)",
            background: "rgba(0,0,0,0.25)",
          }}
        >
          <div className="font-semibold text-slate-400">Echo digest (ring)</div>
          <div>
            combat={digest.combat} · trade={digest.trade} · total={digest.total}
          </div>
          {digest.lines.length > 0 && (
            <ul className="mt-1 list-inside list-disc text-slate-400">
              {digest.lines.map((l, i) => (
                <li key={i} className="truncate">
                  {l}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          <input
            type="text"
            disabled={!active || busy}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void send();
              }
            }}
            placeholder={active ? (fire ? "Short. Technical." : "Ask with analytical depth…") : "Paused"}
            className="min-w-0 flex-1 rounded border px-2 py-1.5 text-sm text-white placeholder:text-slate-500 disabled:opacity-50"
            style={{
              borderColor: "color-mix(in srgb, var(--wasd-aura) 35%, #334155)",
              background: "rgba(15,23,42,0.75)",
              boxShadow: `inset 0 0 12px color-mix(in srgb, var(--wasd-aura) 8%, transparent)`,
            }}
          />
          <button
            type="button"
            disabled={!active || busy}
            onClick={() => void send()}
            className="shrink-0 rounded px-3 py-1.5 text-xs font-semibold text-slate-950 disabled:opacity-50"
            style={{
              backgroundColor: "var(--wasd-aura)",
              boxShadow: `0 0 14px color-mix(in srgb, var(--wasd-aura) 55%, transparent)`,
            }}
          >
            {busy ? "…" : "Send"}
          </button>
          <button
            type="button"
            disabled={!active || busy}
            onClick={() => void probeStress()}
            className="shrink-0 rounded border px-2 py-1.5 text-[11px] font-semibold text-slate-200 disabled:opacity-50"
            style={{
              borderColor: "color-mix(in srgb, var(--wasd-aura) 40%, transparent)",
              background: "color-mix(in srgb, var(--wasd-aura) 8%, rgba(15,23,42,0.9))",
            }}
            title="Ask Emily to summarize the echo window (after 10× stress)"
          >
            Stress-check
          </button>
        </div>
        {!import.meta.env.VITE_WASD_API_BASE && (
          <p className="mt-2 text-[10px] leading-snug text-slate-500">
            Local Emily mode (heuristic). Set <code className="text-cyan-500/90">VITE_WASD_API_BASE</code> + server{" "}
            <code className="text-cyan-500/90">GEMINI_API_KEY</code> for Gemini.
          </p>
        )}
      </div>
    </div>
  );
};

export default ScienceMascotChat;
