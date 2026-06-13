import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";

export type ChatChannel = "local" | "global" | "trade" | "guild" | "faction";

export interface ChatMessage {
  readonly id: string;
  readonly channel: ChatChannel;
  readonly senderName: string;
  readonly senderId: string;
  readonly text: string;
  readonly timestamp: number;
  readonly isSystem?: boolean;
}

export interface ChatState {
  readonly isOpen: boolean;
  readonly isMinimized: boolean;
  readonly activeTab: ChatChannel;
  readonly unreadCounts: Readonly<Record<ChatChannel, number>>;
  readonly messages: ReadonlyArray<ChatMessage>;
}

export interface GameChatWindowProps {
  readonly state: ChatState;
  readonly currentPlayerId: string;
  readonly currentPlayerName: string;
  readonly onSendMessage: (channel: ChatChannel, text: string) => void;
  readonly onClose: () => void;
  readonly onTabChange: (tab: ChatChannel) => void;
  readonly onMinimize: () => void;
  readonly onMaximize: () => void;
}

export interface UseChatReturn {
  readonly state: ChatState;
  readonly sendMessage: (channel: ChatChannel, text: string) => void;
  readonly setActiveTab: (tab: ChatChannel) => void;
  readonly close: () => void;
  readonly toggleMinimize: () => void;
  readonly open: () => void;
  readonly clearUnread: (channel: ChatChannel) => void;
  readonly addSystemMessage: (text: string) => void;
}

const CHANNELS: readonly ChatChannel[] = ["local", "global", "trade", "guild", "faction"];
const MAX_MESSAGES = 100;
const COLORS: Record<ChatChannel, string> = {
  local: "#00e5ff",
  global: "#9d00ff",
  trade: "#ff7a00",
  guild: "#50c878",
  faction: "#9d00ff",
};
const LABELS: Record<ChatChannel, string> = {
  local: "LOCAL",
  global: "GLOBAL",
  trade: "TRADE",
  guild: "GUILD",
  faction: "FACTION",
};

function stableHash(input: string): string {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

function formatTimestamp(tick: number): string {
  return `T+${tick.toString().padStart(4, "0")}`;
}

function createMessageId(parts: { readonly sequence: number; readonly channel: ChatChannel; readonly senderId: string; readonly text: string }): string {
  return `msg_${parts.sequence}_${stableHash(`${parts.sequence}|${parts.channel}|${parts.senderId}|${parts.text}`)}`;
}

function TabBar({ activeTab, unreadCounts, onTabChange }: { activeTab: ChatChannel; unreadCounts: Readonly<Record<ChatChannel, number>>; onTabChange: (tab: ChatChannel) => void }) {
  return (
    <div style={{ display: "flex", borderBottom: "1px solid rgba(132,147,150,0.2)", backgroundColor: "rgba(9,14,17,0.86)" }}>
      {CHANNELS.map((channel) => {
        const active = channel === activeTab;
        return (
          <button
            key={channel}
            type="button"
            onClick={() => onTabChange(channel)}
            style={{
              flex: 1,
              minWidth: 64,
              padding: "12px 8px",
              border: "none",
              borderBottom: active ? `2px solid ${COLORS[channel]}` : "2px solid transparent",
              background: "transparent",
              color: active ? COLORS[channel] : "rgba(132,147,150,0.72)",
              fontFamily: "Epilogue, sans-serif",
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: "0.12em",
              cursor: "pointer",
              position: "relative",
            }}
          >
            {LABELS[channel]}
            {(unreadCounts[channel] ?? 0) > 0 ? <span style={{ position: "absolute", top: 6, right: 8, width: 7, height: 7, backgroundColor: "#50c878" }} /> : null}
          </button>
        );
      })}
    </div>
  );
}

function MessageList({ messages, activeTab, currentPlayerId }: { messages: ReadonlyArray<ChatMessage>; activeTab: ChatChannel; currentPlayerId: string }) {
  const listRef = useRef<HTMLDivElement>(null);
  const visibleMessages = useMemo(() => messages.filter((message) => message.channel === activeTab || message.isSystem), [messages, activeTab]);

  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [visibleMessages]);

  if (visibleMessages.length === 0) {
    return <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "rgba(132,147,150,0.58)", fontSize: 12 }}>No messages in {LABELS[activeTab]} chat</div>;
  }

  return (
    <div ref={listRef} style={{ flex: 1, overflowY: "auto", padding: "10px 12px", display: "flex", flexDirection: "column", gap: 8 }}>
      {visibleMessages.map((message) => {
        const own = message.senderId === currentPlayerId;
        return (
          <div key={message.id} style={{ alignSelf: own ? "flex-end" : "flex-start", maxWidth: "86%" }}>
            <div style={{ display: "flex", gap: 8, justifyContent: own ? "flex-end" : "flex-start", marginBottom: 2 }}>
              {!own ? <span style={{ color: COLORS[message.channel], fontSize: 10, fontWeight: 700 }}>{message.senderName}</span> : null}
              <span style={{ color: "rgba(132,147,150,0.55)", fontSize: 10 }}>{formatTimestamp(message.timestamp)}</span>
            </div>
            <div style={{ padding: "8px 12px", border: own ? "1px solid rgba(0,229,255,0.32)" : "1px solid rgba(132,147,150,0.22)", backgroundColor: own ? "rgba(0,229,255,0.14)" : "rgba(21,29,30,0.66)", color: "#dce4e5", fontSize: 13, lineHeight: 1.4 }}>
              {message.text}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ChatInput({ channel, onSend }: { channel: ChatChannel; onSend: (text: string) => void }) {
  const [text, setText] = useState("");
  const submit = useCallback((event: React.FormEvent) => {
    event.preventDefault();
    const trimmed = text.trim();
    if (!trimmed) return;
    onSend(trimmed);
    setText("");
  }, [onSend, text]);

  return (
    <form onSubmit={submit} style={{ display: "flex", gap: 8, padding: "8px 12px", borderTop: "1px solid rgba(132,147,150,0.2)", backgroundColor: "rgba(9,14,17,0.86)" }}>
      <input
        value={text}
        onChange={(event) => setText(event.target.value)}
        placeholder={`Message ${LABELS[channel]}...`}
        style={{ flex: 1, padding: "10px 12px", backgroundColor: "rgba(21,29,30,0.66)", border: "none", borderBottom: `2px solid ${COLORS[channel]}`, color: "#dce4e5", outline: "none" }}
      />
      <button type="submit" disabled={!text.trim()} style={{ width: 42, border: "1px solid rgba(0,229,255,0.35)", backgroundColor: text.trim() ? "rgba(0,229,255,0.14)" : "rgba(132,147,150,0.1)", color: text.trim() ? "#00e5ff" : "rgba(132,147,150,0.5)", cursor: text.trim() ? "pointer" : "not-allowed" }}>➤</button>
    </form>
  );
}

function DragHandle({ onDrag, onDoubleClick }: { onDrag: (dy: number) => void; onDoubleClick: () => void }) {
  const startYRef = useRef<number | null>(null);
  return (
    <div
      onTouchStart={(event) => { startYRef.current = event.touches[0]?.clientY ?? null; }}
      onTouchMove={(event) => {
        if (startYRef.current === null) return;
        const y = event.touches[0]?.clientY;
        if (typeof y !== "number") return;
        const delta = y - startYRef.current;
        if (Math.abs(delta) > 5) {
          onDrag(delta);
          startYRef.current = y;
        }
      }}
      onTouchEnd={() => { startYRef.current = null; }}
      onDoubleClick={onDoubleClick}
      style={{ height: 4, backgroundColor: "rgba(132,147,150,0.3)", cursor: "ns-resize", flexShrink: 0 }}
    />
  );
}

export function GameChatWindow({ state, currentPlayerId, onSendMessage, onClose, onTabChange, onMinimize, onMaximize }: GameChatWindowProps) {
  const handleSend = useCallback((text: string) => {
    onSendMessage(state.activeTab, text);
  }, [onSendMessage, state.activeTab]);

  const handleDrag = useCallback((dy: number) => {
    if (dy > 30) onMinimize();
    if (dy < -30) onMaximize();
  }, [onMinimize, onMaximize]);

  if (!state.isOpen) return null;

  return (
    <div style={{ position: "fixed", left: 0, right: 0, bottom: 0, height: state.isMinimized ? 48 : "45vh", maxHeight: state.isMinimized ? 48 : 400, display: "flex", flexDirection: "column", backgroundColor: "rgba(13,21,22,0.94)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)", borderTop: "1px solid rgba(0,229,255,0.3)", zIndex: 900 }}>
      <DragHandle onDrag={handleDrag} onDoubleClick={state.isMinimized ? onMaximize : onMinimize} />
      <TabBar activeTab={state.activeTab} unreadCounts={state.unreadCounts} onTabChange={onTabChange} />
      {!state.isMinimized ? <MessageList messages={state.messages} activeTab={state.activeTab} currentPlayerId={currentPlayerId} /> : <div style={{ flex: 1, display: "flex", alignItems: "center", padding: "0 12px", gap: 12, color: COLORS[state.activeTab], fontWeight: 700, letterSpacing: "0.12em" }}>{LABELS[state.activeTab]} · {state.messages.filter((message) => message.channel === state.activeTab).length} messages</div>}
      {!state.isMinimized ? <ChatInput channel={state.activeTab} onSend={handleSend} /> : null}
      <button type="button" onClick={onClose} style={{ position: "absolute", top: 8, right: 8, width: 24, height: 24, background: "transparent", border: "1px solid rgba(132,147,150,0.3)", color: "rgba(132,147,150,0.74)", cursor: "pointer" }}>✕</button>
    </div>
  );
}

export function useChat(playerId: string, playerName: string, onSend?: (channel: ChatChannel, text: string) => void): UseChatReturn {
  const sequenceRef = useRef(0);
  const [state, setState] = useState<ChatState>({
    isOpen: true,
    isMinimized: false,
    activeTab: "local",
    unreadCounts: { local: 0, global: 0, trade: 0, guild: 0, faction: 0 },
    messages: [],
  });

  const addMessage = useCallback((message: Omit<ChatMessage, "id" | "timestamp">) => {
    setState((prev) => {
      sequenceRef.current += 1;
      const timestamp = sequenceRef.current;
      const nextMessage: ChatMessage = { ...message, id: createMessageId({ sequence: timestamp, channel: message.channel, senderId: message.senderId, text: message.text }), timestamp };
      const unreadCounts = { ...prev.unreadCounts };
      if (message.channel !== prev.activeTab) unreadCounts[message.channel] = (unreadCounts[message.channel] ?? 0) + 1;
      return { ...prev, messages: [...prev.messages, nextMessage].slice(-MAX_MESSAGES), unreadCounts };
    });
  }, []);

  const sendMessage = useCallback((channel: ChatChannel, text: string) => {
    addMessage({ channel, senderName: playerName, senderId: playerId, text });
    onSend?.(channel, text);
  }, [addMessage, onSend, playerId, playerName]);

  const setActiveTab = useCallback((tab: ChatChannel) => {
    setState((prev) => ({ ...prev, activeTab: tab, unreadCounts: { ...prev.unreadCounts, [tab]: 0 } }));
  }, []);

  const close = useCallback(() => setState((prev) => ({ ...prev, isOpen: false })), []);
  const open = useCallback(() => setState((prev) => ({ ...prev, isOpen: true })), []);
  const toggleMinimize = useCallback(() => setState((prev) => ({ ...prev, isMinimized: !prev.isMinimized })), []);
  const clearUnread = useCallback((channel: ChatChannel) => setState((prev) => ({ ...prev, unreadCounts: { ...prev.unreadCounts, [channel]: 0 } })), []);
  const addSystemMessage = useCallback((text: string) => addMessage({ channel: "local", senderName: "SYSTEM", senderId: "system", text, isSystem: true }), [addMessage]);

  return { state, sendMessage, setActiveTab, close, toggleMinimize, open, clearUnread, addSystemMessage };
}

export default GameChatWindow;
