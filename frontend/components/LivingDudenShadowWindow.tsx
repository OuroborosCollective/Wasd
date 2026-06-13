"use client";

import React, { useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from "recharts";
import {
  Eye,
  AlertTriangle,
  CheckCircle2,
  Activity,
  MessageSquare,
  Hash,
  Shield,
  TrendingUp,
  Volume2,
  BookOpen,
  Filter,
  Cpu,
  Skull,
  Heart,
  Sparkles,
} from "lucide-react";
import type {
  LivingDudenTelemetry,
  ShadowStatus,
  SpeechEvent,
  WordFactorRanking,
  TermWatchEntry,
} from "./LivingDudenShadowWindow.types";

// Diamond Glass Design System Colors (from Stitch)
const DESIGN_SYSTEM = {
  // Backgrounds
  background: '#101419',
  surface: '#101419',
  surfaceDim: '#101419',
  surfaceBright: '#36393f',
  surfaceContainerLowest: '#0a0f13',
  surfaceContainerLow: '#181c21',
  surfaceContainer: '#1c2025',
  surfaceContainerHigh: '#262a30',
  surfaceContainerHighest: '#31353b',
  
  // Primary - Mana Cyan
  primary: '#00e5ff',
  primaryContainer: '#00e5ff',
  onPrimary: '#00363d',
  
  // Secondary - Void Violet  
  secondary: '#9d00ff',
  secondaryContainer: '#9d05ff',
  onSecondary: '#4b007e',
  
  // Tertiary - Lexicon Green
  tertiary: '#50c878',
  tertiaryContainer: '#71e894',
  
  // On Surface
  onSurface: '#e0e2ea',
  onSurfaceVariant: '#bac9cc',
  
  // Error/Warning
  error: '#ffb4ab',
  warning: '#ff7a00',
  
  // Outline
  outline: '#849396',
  outlineVariant: '#3b494c',
} as const;

// Heartbeat animation keyframes - injected via style tag
const HEARTBEAT_KEYFRAMES = `
  @keyframes heartbeat {
    0%, 100% { opacity: 1; transform: scale(1); }
    50% { opacity: 0.4; transform: scale(0.85); }
  }
  @keyframes pulse-glow {
    0%, 100% { box-shadow: 0 0 8px 2px rgba(0, 229, 255, 0.4); }
    50% { box-shadow: 0 0 16px 4px rgba(0, 229, 255, 0.7); }
  }
  @keyframes mana-pulse {
    0%, 100% { box-shadow: 0 0 4px 1px rgba(0, 229, 255, 0.6); }
    50% { box-shadow: 0 0 8px 2px rgba(0, 229, 255, 0.9); }
  }
  @keyframes scan-line {
    0% { transform: translateY(-100%); }
    100% { transform: translateY(100vh); }
  }
  @keyframes fade-in {
    from { opacity: 0; transform: translateY(8px); }
    to { opacity: 1; transform: translateY(0); }
  }
`;

function getStatusConfig(status: ShadowStatus): {
  label: string;
  dotClass: string;
  badgeClass: string;
  icon: React.ReactNode;
} {
  switch (status) {
    case "live":
      return {
        label: "SHADOW LIVE",
        dotClass: "bg-[#00e5ff] animate-heartbeat",
        badgeClass:
          "border-[#00e5ff]/40 bg-[#00e5ff]/10 text-[#00e5ff]",
        icon: <Activity size={12} />,
      };
    case "empty":
      return {
        label: "SHADOW EMPTY",
        dotClass: "bg-[#ff7a00]",
        badgeClass:
          "border-[#ff7a00]/40 bg-[#ff7a00]/10 text-[#ff7a00]",
        icon: <Heart size={12} />,
      };
    case "error":
      return {
        label: "SHADOW ERROR",
        dotClass: "bg-[#ffb4ab]",
        badgeClass:
          "border-[#ffb4ab]/40 bg-[#ffb4ab]/10 text-[#ffb4ab]",
        icon: <AlertTriangle size={12} />,
      };
  }
}

function getReactionLaneColor(lane: string): string {
  switch (lane) {
    case "aggressive":
      return "text-[#ffb4ab] bg-[#ffb4ab]/20";
    case "defensive":
      return "text-[#ff7a00] bg-[#ff7a00]/20";
    case "friendly":
      return "text-[#50c878] bg-[#50c878]/20";
    default:
      return "text-[#bac9cc] bg-[#bac9cc]/20";
  }
}

function getFactorColor(factor: number): string {
  if (factor >= 0.8) return "bg-[#50c878]"; // Lexicon Green - stable
  if (factor >= 0.5) return "bg-[#00e5ff]"; // Mana Cyan - moderate
  if (factor >= 0.3) return "bg-[#ff7a00]"; // Warning Orange - caution
  return "bg-[#849396]"; // Outline - low
}

function formatHash(hash: string, length = 8): string {
  if (hash.length <= length) return hash;
  return `${hash.slice(0, length)}...`;
}

function truncateText(text: string, maxLength = 60): string {
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength)}...`;
}

// Empty State Component
function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center animate-fade-in">
      <div className="relative mb-6">
        <div className="w-20 h-20 rounded-none bg-[#1c2025]/80 border border-[#00e5ff]/20 flex items-center justify-center backdrop-blur-xl">
          <Eye className="w-10 h-10 text-[#849396]" />
        </div>
        <div className="absolute inset-0 border border-[#00e5ff]/30 animate-heartbeat" />
        <div className="absolute inset-2 border border-[#00e5ff]/20 animate-pulse" />
      </div>
      <h3 className="text-xl font-semibold text-[#e0e2ea] mb-2 tracking-tight">
        Waiting for first ARE Shadow language event...
      </h3>
      <p className="text-[#849396] max-w-md text-sm">
        The Living Duden is observing. Run NPC speech generation or test probes to populate this panel.
      </p>
      <div className="mt-6 flex items-center gap-2 text-[#00e5ff]/60 text-xs font-mono tracking-widest uppercase">
        <div className="w-2 h-2 bg-[#00e5ff] animate-heartbeat" />
        <span>Shadow telemetry active — listening for language patterns</span>
      </div>
    </div>
  );
}

// Error State Component
function ErrorState({
  message,
  endpoint,
}: {
  message?: string;
  endpoint?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="w-20 h-20 rounded-none bg-[#93000a]/20 border border-[#ffb4ab]/30 flex items-center justify-center mb-6 backdrop-blur-xl">
        <AlertTriangle className="w-10 h-10 text-[#ffb4ab]" />
      </div>
      <h3 className="text-xl font-semibold text-[#ffb4ab] mb-2">
        Language telemetry route unavailable
      </h3>
      <p className="text-[#bac9cc] max-w-md mb-4 text-sm">
        {message || "The Living Duden endpoint is not responding."}
      </p>
      {endpoint && (
        <div className="mt-4 p-3 bg-[#181c21]/80 rounded-none border border-[#849396]/30 backdrop-blur-xl">
          <p className="text-xs text-[#849396] mb-1 font-mono tracking-widest uppercase">Expected Endpoint</p>
          <code className="text-sm text-[#00e5ff] font-mono">{endpoint}</code>
        </div>
      )}
    </div>
  );
}

// Header Component
function ShadowHeader({
  status,
  tick,
  probeCount,
  antigenIndex,
  outcomeHistorySize,
}: {
  status: ShadowStatus;
  tick?: number;
  probeCount?: number;
  antigenIndex?: number;
  outcomeHistorySize?: number;
}) {
  const config = getStatusConfig(status);

  return (
    <div className="space-y-4">
      {/* Status Badge Row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-cyan-500/10 rounded-lg border border-cyan-500/30">
            <Eye className="w-5 h-5 text-cyan-400" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white tracking-wide">
              Living Duden — Shadow Telemetry
            </h2>
            <p className="text-xs text-slate-500 uppercase tracking-widest">
              ARE Language Side-Channel
            </p>
          </div>
        </div>

        <div
          className={`flex items-center gap-2 px-4 py-2 rounded-full border ${config.badgeClass}`}
        >
          <div className={`w-2.5 h-2.5 rounded-full ${config.dotClass}`} />
          {config.icon}
          <span className="text-xs font-bold tracking-widest">
            {config.label}
          </span>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-slate-900/80 border border-slate-800 rounded-lg p-3">
          <div className="flex items-center gap-2 text-slate-500 text-xs mb-1">
            <Hash size={12} />
            Latest Tick
          </div>
          <p className="text-lg font-mono font-bold text-cyan-400">
            {tick !== undefined ? `T+${tick.toString().padStart(5, "0")}` : "—"}
          </p>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-lg p-3">
          <div className="flex items-center gap-2 text-slate-500 text-xs mb-1">
            <Activity size={12} />
            Shadow Probes
          </div>
          <p className="text-lg font-mono font-bold text-violet-400">
            {probeCount ?? "—"}
          </p>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-lg p-3">
          <div className="flex items-center gap-2 text-slate-500 text-xs mb-1">
            <Shield size={12} />
            Antigen Index
          </div>
          <p className="text-lg font-mono font-bold text-emerald-400">
            {antigenIndex !== undefined
              ? `${(antigenIndex * 100).toFixed(1)}%`
              : "—"}
          </p>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-lg p-3">
          <div className="flex items-center gap-2 text-slate-500 text-xs mb-1">
            <TrendingUp size={12} />
            Outcome History
          </div>
          <p className="text-lg font-mono font-bold text-amber-400">
            {outcomeHistorySize ?? "—"}
          </p>
        </div>
      </div>

      {/* ARE Rule Banner */}
      <div className="flex items-center gap-3 px-4 py-2 bg-cyan-500/5 border border-cyan-500/20 rounded-lg">
        <Shield className="w-4 h-4 text-cyan-500/70 flex-shrink-0" />
        <p className="text-xs text-cyan-400/80 italic">
          Shadow data observes. It never mutates runtime truth. Hash proves.
        </p>
      </div>
    </div>
  );
}

// NPC Speech Timeline Component
function SpeechTimeline({ speech }: { speech: ReadonlyArray<SpeechEvent> }) {
  if (speech.length === 0) {
    return (
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-6 text-center">
        <MessageSquare className="w-8 h-8 text-slate-600 mx-auto mb-2" />
        <p className="text-slate-500 text-sm">No speech events recorded</p>
      </div>
    );
  }

  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
      <div className="flex items-center gap-2 mb-4">
        <MessageSquare className="w-4 h-4 text-cyan-400" />
        <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">
          NPC Speech Timeline
        </h3>
        <span className="ml-auto text-xs text-slate-500">
          {speech.length} events
        </span>
      </div>

      <div className="space-y-3 max-h-96 overflow-y-auto pr-2 custom-scrollbar">
        {speech.slice(0, 20).map((event, index) => (
          <div
            key={event.eventHash || index}
            className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-3 hover:border-cyan-500/30 transition-colors"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-mono text-slate-500">
                    T+{event.tick.toString().padStart(5, "0")}
                  </span>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full ${getReactionLaneColor(
                      event.reactionLane
                    )}`}
                  >
                    {event.reactionLane}
                  </span>
                  <span className="text-xs text-slate-600">
                    {event.role}
                  </span>
                </div>

                <p className="text-sm text-slate-200 mb-2 leading-relaxed">
                  "{truncateText(event.constructedText, 100)}"
                </p>

                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs text-slate-500">
                    Intent:{" "}
                    <span className="text-cyan-400">{event.intent}</span>
                  </span>
                  <span className="text-xs text-slate-600">•</span>
                  <span className="text-xs text-slate-500">
                    Conf:{" "}
                    <span className="text-emerald-400">
                      {(event.confidence * 100).toFixed(0)}%
                    </span>
                  </span>
                </div>

                {event.termAlerts.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {event.termAlerts.slice(0, 3).map((alert, i) => (
                      <span
                        key={i}
                        className={`text-xs px-2 py-0.5 rounded ${
                          alert.severity === "high"
                            ? "bg-rose-500/20 text-rose-400"
                            : alert.severity === "medium"
                              ? "bg-amber-500/20 text-amber-400"
                              : "bg-slate-700 text-slate-400"
                        }`}
                      >
                        {alert.term}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="text-right flex-shrink-0">
                <p className="text-xs font-mono text-slate-600" title={event.speechHash}>
                  {formatHash(event.speechHash, 6)}
                </p>
              </div>
            </div>

            {/* Sentence Structure */}
            <div className="mt-2 pt-2 border-t border-slate-700/50">
              <div className="flex items-center gap-2 flex-wrap">
                <BookOpen size={12} className="text-slate-500" />
                <span className="text-xs text-slate-500">Structure:</span>
                {event.sentenceStructure.split(" ").map((word, i) => (
                  <span
                    key={i}
                    className="text-xs px-1.5 py-0.5 bg-slate-700/50 text-slate-300 rounded"
                  >
                    {word}
                  </span>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Word Factor Ranking Component
function WordFactorRankingTable({
  rankings,
}: {
  rankings: ReadonlyArray<WordFactorRanking>;
}) {
  if (rankings.length === 0) {
    return (
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-4 h-4 text-violet-400" />
          <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">
            Word Factor Rankings
          </h3>
        </div>
        <p className="text-slate-500 text-sm text-center py-8">
          No word rankings available
        </p>
      </div>
    );
  }

  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
      <div className="flex items-center gap-2 mb-4">
        <TrendingUp className="w-4 h-4 text-violet-400" />
        <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">
          Living Duden — Word Factor Rankings
        </h3>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-700">
              <th className="text-left text-xs text-slate-500 uppercase tracking-wider pb-2 pr-4">
                Rank
              </th>
              <th className="text-left text-xs text-slate-500 uppercase tracking-wider pb-2 pr-4">
                Lemma
              </th>
              <th className="text-left text-xs text-slate-500 uppercase tracking-wider pb-2 pr-4">
                Lang
              </th>
              <th className="text-left text-xs text-slate-500 uppercase tracking-wider pb-2 pr-4">
                Factor
              </th>
              <th className="text-left text-xs text-slate-500 uppercase tracking-wider pb-2">
                Success Rate
              </th>
            </tr>
          </thead>
          <tbody>
            {rankings.slice(0, 15).map((item, index) => (
              <tr
                key={item.lemma + index}
                className="border-b border-slate-800/50 hover:bg-slate-800/30"
              >
                <td className="py-2 pr-4">
                  <span className="text-slate-500 font-mono">{index + 1}</span>
                </td>
                <td className="py-2 pr-4">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-200">{item.lemma}</span>
                    {item.quarantined && (
                      <Skull
                        size={12}
                        className="text-amber-500"
                        title="Quarantined"
                      />
                    )}
                  </div>
                  <span className="text-xs text-slate-500">
                    {item.partOfSpeech}
                  </span>
                </td>
                <td className="py-2 pr-4">
                  <span className="text-xs text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded">
                    {item.language}
                  </span>
                </td>
                <td className="py-2 pr-4">
                  <div className="flex items-center gap-2">
                    <div className="w-16 h-2 bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${getFactorColor(item.factor)} rounded-full`}
                        style={{ width: `${item.factor * 100}%` }}
                      />
                    </div>
                    <span className="text-xs font-mono text-slate-400">
                      {item.factor.toFixed(2)}
                    </span>
                  </div>
                </td>
                <td className="py-2">
                  <span
                    className={`font-mono ${
                      item.successRate > 0.7
                        ? "text-emerald-400"
                        : item.successRate > 0.4
                          ? "text-amber-400"
                          : "text-slate-400"
                    }`}
                  >
                    {(item.successRate * 100).toFixed(1)}%
                  </span>
                  <span className="text-xs text-slate-600 ml-2">
                    ({item.npcUses}/{item.totalUses})
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Thought Vector Display Component
function ThoughtVectorDisplay({
  thoughtVector,
}: {
  thoughtVector: SpeechEvent["thoughtVector"];
}) {
  const vectors = [
    { key: "hunger", label: "Hunger", color: "bg-rose-500" },
    { key: "trust", label: "Trust", color: "bg-emerald-500" },
    { key: "fear", label: "Fear", color: "bg-violet-500" },
    { key: "duty", label: "Duty", color: "bg-cyan-500" },
    { key: "pride", label: "Pride", color: "bg-amber-500" },
    { key: "revenge", label: "Revenge", color: "bg-rose-600" },
  ] as const;

  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
      <div className="flex items-center gap-2 mb-4">
        <Brain className="w-4 h-4 text-cyan-400" />
        <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">
          Thought Vector
        </h3>
      </div>

      <div className="space-y-3">
        {vectors.map(({ key, label, color }) => {
          const value = thoughtVector[key];
          return (
            <div key={key} className="flex items-center gap-3">
              <span className="text-xs text-slate-500 w-16">{label}</span>
              <div className="flex-1 h-3 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className={`h-full ${color} rounded-full transition-all duration-500`}
                  style={{ width: `${Math.max(2, value * 100)}%` }}
                />
              </div>
              <span className="text-xs font-mono text-slate-400 w-10 text-right">
                {value.toFixed(2)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Term Watch Panel Component
function TermWatchPanel({ termWatch }: { termWatch: ReadonlyArray<TermWatchEntry> }) {
  if (termWatch.length === 0) {
    return (
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="w-4 h-4 text-amber-400" />
          <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">
            Term Watch — Faction Monitor
          </h3>
        </div>
        <p className="text-slate-500 text-sm text-center py-8">
          No faction term watch data
        </p>
      </div>
    );
  }

  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
      <div className="flex items-center gap-2 mb-4">
        <Filter className="w-4 h-4 text-amber-400" />
        <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">
          Term Watch — Faction Monitor
        </h3>
      </div>

      <div className="space-y-4">
        {termWatch.map((entry, index) => (
          <div
            key={entry.factionId || index}
            className="bg-slate-800/40 border border-slate-700/50 rounded-lg p-3"
          >
            <div className="flex items-center gap-2 mb-2">
              <Shield size={14} className="text-slate-500" />
              <span className="text-sm font-semibold text-slate-300">
                {entry.factionName || entry.factionId}
              </span>
            </div>

            {entry.tabooTerms.length > 0 && (
              <div className="mb-2">
                <span className="text-xs text-rose-500 uppercase tracking-wider">
                  Taboo
                </span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {entry.tabooTerms.map((term, i) => (
                    <span
                      key={i}
                      className="text-xs px-2 py-0.5 bg-rose-500/20 text-rose-400 rounded"
                    >
                      {term}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {entry.honorifics.length > 0 && (
              <div>
                <span className="text-xs text-amber-500 uppercase tracking-wider">
                  Honorifics
                </span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {entry.honorifics.map((term, i) => (
                    <span
                      key={i}
                      className="text-xs px-2 py-0.5 bg-amber-500/20 text-amber-400 rounded"
                    >
                      {term}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// Archive Stats Component
function ArchiveStats({
  archive,
}: {
  archive: LivingDudenTelemetry["archive"];
}) {
  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
      <div className="flex items-center gap-2 mb-4">
        <BookOpen className="w-4 h-4 text-emerald-400" />
        <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">
          Lexeme Archive
        </h3>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-slate-800/50 rounded-lg p-3 text-center">
          <p className="text-2xl font-bold text-white font-mono">
            {archive.totalLexemes.toLocaleString()}
          </p>
          <p className="text-xs text-slate-500">Total Lexemes</p>
        </div>
        <div className="bg-slate-800/50 rounded-lg p-3 text-center">
          <p className="text-2xl font-bold text-emerald-400 font-mono">
            {archive.inventedCount.toLocaleString()}
          </p>
          <p className="text-xs text-slate-500">Invented</p>
        </div>
        <div className="bg-slate-800/50 rounded-lg p-3 text-center">
          <p className="text-2xl font-bold text-amber-400 font-mono">
            {archive.quarantinedCount.toLocaleString()}
          </p>
          <p className="text-xs text-slate-500">Quarantined</p>
        </div>
        <div className="bg-slate-800/50 rounded-lg p-3 text-center">
          <p className="text-2xl font-bold text-cyan-400 font-mono">
            {archive.promotedCount.toLocaleString()}
          </p>
          <p className="text-xs text-slate-500">Promoted</p>
        </div>
      </div>

      {Object.keys(archive.byLanguageCount).length > 0 && (
        <div className="mt-4 pt-4 border-t border-slate-700">
          <p className="text-xs text-slate-500 mb-2">By Language</p>
          <div className="flex flex-wrap gap-2">
            {Object.entries(archive.byLanguageCount)
              .slice(0, 8)
              .map(([lang, count]) => (
                <span
                  key={lang}
                  className="text-xs px-2 py-1 bg-slate-800 text-slate-300 rounded"
                >
                  {lang}: {count}
                </span>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Charts Components
function AntigenIndexChart({ telemetry }: { telemetry: LivingDudenTelemetry }) {
  // Generate chart data from speech events
  const chartData = useMemo(() => {
    const tickGroups = new Map<number, number>();
    telemetry.speech.forEach((event) => {
      const bucket = Math.floor(event.tick / 10) * 10;
      tickGroups.set(bucket, (tickGroups.get(bucket) || 0) + 1);
    });

    return Array.from(tickGroups.entries())
      .map(([tick, count]) => ({
        tick: `T+${tick}`,
        antigen: count,
      }))
      .sort((a, b) => a.tick.localeCompare(b.tick));
  }, [telemetry.speech]);

  if (chartData.length < 2) {
    return (
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-4">
          <Shield className="w-4 h-4 text-emerald-400" />
          <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">
            Antigen Index Over Time
          </h3>
        </div>
        <p className="text-slate-500 text-sm text-center py-12">
          Insufficient data for chart
        </p>
      </div>
    );
  }

  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
      <div className="flex items-center gap-2 mb-4">
        <Shield className="w-4 h-4 text-emerald-400" />
        <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">
          Antigen Index Over Time
        </h3>
      </div>

      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis dataKey="tick" stroke="#64748b" fontSize={10} />
            <YAxis stroke="#64748b" fontSize={10} />
            <Tooltip
              contentStyle={{
                backgroundColor: "#0f172a",
                border: "1px solid #1e293b",
                borderRadius: "0.5rem",
                fontSize: "12px",
              }}
              labelStyle={{ color: "#e2e8f0" }}
            />
            <Line
              type="monotone"
              dataKey="antigen"
              name="Antigen Index"
              stroke="#22d3ee"
              strokeWidth={2}
              dot={false}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function SpeechEventsChart({ telemetry }: { telemetry: LivingDudenTelemetry }) {
  const chartData = useMemo(() => {
    const hourGroups = new Map<number, number>();
    telemetry.speech.forEach((event) => {
      const hour = event.tick % 24;
      hourGroups.set(hour, (hourGroups.get(hour) || 0) + 1);
    });

    return Array.from({ length: 24 }, (_, i) => ({
      hour: `${i.toString().padStart(2, "0")}:00`,
      events: hourGroups.get(i) || 0,
    }));
  }, [telemetry.speech]);

  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
      <div className="flex items-center gap-2 mb-4">
        <Volume2 className="w-4 h-4 text-violet-400" />
        <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">
          Speech Events per Hour
        </h3>
      </div>

      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis dataKey="hour" stroke="#64748b" fontSize={10} />
            <YAxis stroke="#64748b" fontSize={10} />
            <Tooltip
              contentStyle={{
                backgroundColor: "#0f172a",
                border: "1px solid #1e293b",
                borderRadius: "0.5rem",
                fontSize: "12px",
              }}
              labelStyle={{ color: "#e2e8f0" }}
            />
            <Bar dataKey="events" name="Events" fill="#a855f7" isAnimationActive={false} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function StructureAnalytics({
  structures,
}: {
  structures: LivingDudenTelemetry["structureRankings"];
}) {
  if (structures.length === 0) {
    return (
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="w-4 h-4 text-cyan-400" />
          <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">
            Sentence Structure Analytics
          </h3>
        </div>
        <p className="text-slate-500 text-sm text-center py-8">
          No structure data available
        </p>
      </div>
    );
  }

  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="w-4 h-4 text-cyan-400" />
        <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">
          Sentence Structure Analytics
        </h3>
      </div>

      <div className="flex flex-wrap gap-2">
        {structures.slice(0, 12).map((item, index) => (
          <div
            key={item.structure || index}
            className="flex items-center gap-2 px-3 py-1.5 bg-slate-800/50 border border-slate-700/50 rounded-lg"
          >
            <span className="text-xs text-slate-400">{item.structure}</span>
            <span className="text-xs font-mono text-cyan-400">
              {item.count}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// Brain icon helper (not in lucide-react by default)
function Brain({ size = 24, className = "" }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96.44 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 4.44-1.54" />
      <path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96.44 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-4.44-1.54" />
    </svg>
  );
}

// Main Component
export default function LivingDudenShadowWindow({
  telemetry,
  status = "empty",
  errorMessage,
  endpoint,
  isLoading = false,
}: {
  telemetry?: LivingDudenTelemetry;
  status?: ShadowStatus;
  errorMessage?: string;
  endpoint?: string;
  isLoading?: boolean;
}) {
  // Inject keyframe animations
  const styleId = "living-duden-shadow-styles";
  React.useEffect(() => {
    if (!document.getElementById(styleId)) {
      const style = document.createElement("style");
      style.id = styleId;
      style.textContent = HEARTBEAT_KEYFRAMES;
      document.head.appendChild(style);
    }
  }, []);

  // Determine display state
  if (status === "error") {
    return (
      <div className="bg-[#101419] border border-[#ffb4ab]/20 overflow-hidden backdrop-blur-xl">
        <div className="p-6 border-b border-[#3b494c]/50 bg-[#181c21]/50">
          <ShadowHeader status="error" />
        </div>
        <div className="p-6">
          <ErrorState message={errorMessage} endpoint={endpoint} />
        </div>
      </div>
    );
  }

  if (status === "empty" || !telemetry || telemetry.speech.length === 0) {
    return (
      <div className="bg-[#101419] border border-[#849396]/20 overflow-hidden backdrop-blur-xl">
        <div className="p-6 border-b border-[#3b494c]/50 bg-[#181c21]/50">
          <ShadowHeader status="empty" />
        </div>
        <div className="p-6">
          <EmptyState />
        </div>
      </div>
    );
  }

  // Extract latest values
  const latestSpeech = telemetry.speech[0];
  const latestTick = latestSpeech?.tick;
  const probeCount = telemetry.speech.length;
  const antigenIndex =
    telemetry.archive.quarantinedCount / Math.max(1, telemetry.archive.totalLexemes);
  const outcomeHistorySize = telemetry.outcomeHistorySize;

  return (
    <div className="bg-[#101419] border border-[#00e5ff]/20 overflow-hidden backdrop-blur-xl">
      {/* Header */}
      <div className="p-6 border-b border-[#3b494c]/50 bg-[#181c21]/50">
        <ShadowHeader
          status="live"
          tick={latestTick}
          probeCount={probeCount}
          antigenIndex={antigenIndex}
          outcomeHistorySize={outcomeHistorySize}
        />
      </div>

      {/* Content */}
      <div className="p-6 space-y-6">
        {/* Top Row: Speech Timeline + Archive Stats */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <SpeechTimeline speech={telemetry.speech} />
          </div>
          <div>
            <ArchiveStats archive={telemetry.archive} />
          </div>
        </div>

        {/* Second Row: Word Rankings + Thought Vector */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <WordFactorRankingTable rankings={telemetry.wordFactorRankings} />
          <ThoughtVectorDisplay
            thoughtVector={
              latestSpeech?.thoughtVector || {
                hunger: 0,
                trust: 0,
                fear: 0,
                duty: 0,
                pride: 0,
                revenge: 0,
              }
            }
          />
        </div>

        {/* Third Row: Structure Analytics + Term Watch */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <StructureAnalytics structures={telemetry.structureRankings} />
          <TermWatchPanel termWatch={telemetry.termWatch} />
        </div>

        {/* Fourth Row: Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <AntigenIndexChart telemetry={telemetry} />
          <SpeechEventsChart telemetry={telemetry} />
        </div>
      </div>
    </div>
  );
}