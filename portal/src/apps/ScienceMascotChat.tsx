import React, { useCallback, useEffect, useRef, useState } from "react";
import type { VisualThemeState } from "@wasd/shared";
import { completeScienceMascotChat } from "../ai/scienceMascotBrain";

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
  const marina = visual.mode === "marina";

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

  return (
    <div
      className={`rounded-xl border p-3 ${
        fire ? "border-red-500/50 bg-black/50" : marina ? "border-cyan-500/35 bg-slate-950/70" : "border-slate-600 bg-slate-950/60"
      }`}
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="text-xs font-bold uppercase tracking-wider text-slate-300">
          Emily · World-aware
        </div>
        <div className="font-mono text-[10px] text-slate-500">
          h={visual.hazardIndex.toFixed(2)} · {visual.mode}
        </div>
      </div>

      <div
        ref={listRef}
        className="mb-2 max-h-48 space-y-2 overflow-y-auto rounded-lg bg-black/35 p-2 text-sm"
        style={{
          fontFamily: fire ? "ui-monospace, monospace" : "inherit",
          letterSpacing: fire ? "0.02em" : "normal",
        }}
      >
        {lines.map((ln) => (
          <div
            key={ln.id}
            className={`rounded-md px-2 py-1.5 ${
              ln.role === "user" ? "ml-4 bg-slate-800/90 text-slate-100" : "mr-4 bg-cyan-950/40 text-cyan-50"
            } ${fire && ln.role === "assistant" ? "text-red-50" : ""}`}
          >
            <div className="text-[10px] uppercase text-slate-500">
              {ln.role}
              {ln.source ? ` · ${ln.source}` : ""}
            </div>
            <div className={fire && ln.role === "assistant" ? "whitespace-pre-wrap leading-snug" : "whitespace-pre-wrap"}>
              {ln.content}
            </div>
          </div>
        ))}
      </div>

      <div className="flex gap-2">
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
          className="min-w-0 flex-1 rounded border border-slate-600 bg-slate-900 px-2 py-1.5 text-sm text-white placeholder:text-slate-500 disabled:opacity-50"
        />
        <button
          type="button"
          disabled={!active || busy}
          onClick={() => void send()}
          className="shrink-0 rounded px-3 py-1.5 text-xs font-semibold text-slate-900 disabled:opacity-50"
          style={{
            backgroundColor: "var(--wasd-aura, #00e5ff)",
            boxShadow: fire ? "0 0 12px rgba(230,0,0,0.5)" : "0 0 10px rgba(0,229,255,0.35)",
          }}
        >
          {busy ? "…" : "Send"}
        </button>
      </div>
      {!import.meta.env.VITE_WASD_API_BASE && (
        <p className="mt-2 text-[10px] leading-snug text-slate-500">
          Local Emily mode (heuristic). Set <code className="text-cyan-600">VITE_WASD_API_BASE</code> + server{" "}
          <code className="text-cyan-600">GEMINI_API_KEY</code> for Gemini.
        </p>
      )}
    </div>
  );
};

export default ScienceMascotChat;
