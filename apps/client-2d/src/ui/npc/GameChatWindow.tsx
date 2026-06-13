/**
 * GameChatWindow - Mobile MMORPG Chat System
 * 
 * Bottom-anchored chat panel with tabs for different chat channels.
 * Diamond Glass design system with glassmorphism.
 * Touch-friendly with proper keyboard handling.
 */

import React, { useCallback, useEffect, useRef, useState } from "react";

// ============================================================================
// TYPES
// ============================================================================

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

// ============================================================================
// CONSTANTS
// ============================================================================

const CHANNEL_CONFIG: Record<ChatChannel, {
  label: string;
  icon: string;
  color: string;
  usernameColor: string;
}> = {
  local: { label: "LOCAL", icon: "◎", color: "#00e5ff", usernameColor: "#00e5ff" },
  global: { label: "GLOBAL", icon: "◉", color: "#9d00ff", usernameColor: "#9d00ff" },
  trade: { label: "TRADE", icon: "◆", color: "#ff7a00", usernameColor: "#ff7a00" },
  guild: { label: "GUILD", icon: "◈", color: "#50c878", usernameColor: "#50c878" },
  faction: { label: "FACTION", icon: "◇", color: "#9d00ff", usernameColor: "#9d00ff" },
};

const MAX_MESSAGES = 100;

// ============================================================================
// ANIMATIONS
// ============================================================================

const CHAT_ANIMATIONS = `
  @keyframes chat-slide-in {
    from { opacity: 0; transform: translateY(20px); }
    to { opacity: 1; transform: translateY(0); }
  }
  @keyframes tab-indicator {
    0%, 100% { transform: scaleX(1); }
    50% { transform: scaleX(1.1); }
  }
  @keyframes notification-pulse {
    0%, 100% { opacity: 1; transform: scale(1); }
    50% { opacity: 0.6; transform: scale(1.3); }
  }
  @keyframes message-appear {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
  }
  @keyframes drag-handle-pulse {
    0%, 100% { opacity: 0.5; }
    50% { opacity: 0.8; }
  }
  @keyframes send-glow {
    0%, 100% { box-shadow: 0 0 4px 1px rgba(0, 229, 255, 0.4); }
    50% { box-shadow: 0 0 8px 2px rgba(0, 229, 255, 0.7); }
  }
`;

// ============================================================================
// STYLES INJECTION
// ============================================================================

let stylesInjected = false;
function injectStyles() {
  if (stylesInjected || typeof document === "undefined") return;
  const style = document.createElement("style");
  style.id = "game-chat-styles";
  style.textContent = CHAT_ANIMATIONS;
  document.head.appendChild(style);
  stylesInjected = true;
}

// ============================================================================
// HELPERS
// ============================================================================

function formatTimestamp(ts: number): string {
  const date = new Date(ts);
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function generateMessageId(): string {
  return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// ============================================================================
// TAB BAR COMPONENT
// ============================================================================

interface TabBarProps {
  activeTab: ChatChannel;
  unreadCounts: Record<ChatChannel, number>;
  onTabChange: (tab: ChatChannel) => void;
}

function TabBar({ activeTab, unreadCounts, onTabChange }: TabBarProps) {
  const tabs = Object.entries(CHANNEL_CONFIG) as [ChatChannel, typeof CHANNEL_CONFIG.local][];

  return (
    <div
      className="chat-tab-bar"
      style={{
        display: "flex",
        alignItems: "stretch",
        borderBottom: "1px solid rgba(132, 147, 150, 0.2)",
        backgroundColor: "rgba(9, 14, 17, 0.8)",
        overflowX: "auto",
        overflowY: "hidden",
        scrollbarWidth: "none",
      }}
    >
      {tabs.map(([channel, config]) => {
        const isActive = channel === activeTab;
        const unread = unreadCounts[channel] || 0;

        return (
          <button
            key={channel}
            onClick={() => onTabChange(channel)}
            style={{
              flex: "1 0 auto",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "6px",
              padding: "12px 8px",
              backgroundColor: "transparent",
              border: "none",
              borderBottom: isActive ? `2px solid ${config.color}` : "2px solid transparent",
              cursor: "pointer",
              transition: "all 0.2s ease",
              minWidth: "60px",
              position: "relative",
            }}
          >
            <span
              style={{
                fontSize: "10px",
                color: isActive ? config.color : "rgba(132, 147, 150, 0.6)",
                transition: "color 0.2s ease",
              }}
            >
              {config.icon}
            </span>
            <span
              style={{
                fontFamily: "Epilogue, sans-serif",
                fontSize: "10px",
                fontWeight: isActive ? "700" : "600",
                letterSpacing: "0.1em",
                color: isActive ? config.color : "rgba(132, 147, 150, 0.6)",
                transition: "color 0.2s ease",
              }}
            >
              {config.label}
            </span>
            {unread > 0 && (
              <span
                style={{
                  position: "absolute",
                  top: "6px",
                  right: "4px",
                  width: "8px",
                  height: "8px",
                  borderRadius: "0",
                  backgroundColor: "#50c878",
                  animation: "notification-pulse 1.5s ease-in-out infinite",
                }}
              />
            )}
          </button>
        );
      })}
    </div>
  );
}

// ============================================================================
// MESSAGE LIST COMPONENT
// ============================================================================

interface MessageListProps {
  messages: ChatMessage[];
  activeTab: ChatChannel;
  currentPlayerId: string;
}

function MessageList({ messages, activeTab, currentPlayerId }: MessageListProps) {
  const listRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);

  // Filter messages for active tab
  const visibleMessages = messages.filter(
    (m) => m.channel === activeTab || m.isSystem
  );

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (autoScroll && listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [visibleMessages, autoScroll]);

  const handleScroll = () => {
    if (!listRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = listRef.current;
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 50;
    setAutoScroll(isAtBottom);
  };

  if (visibleMessages.length === 0) {
    return (
      <div
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "rgba(132, 147, 150, 0.5)",
          fontFamily: "Epilogue, sans-serif",
          fontSize: "12px",
          letterSpacing: "0.1em",
        }}
      >
        No messages in {CHANNEL_CONFIG[activeTab].label} chat
      </div>
    );
  }

  return (
    <div
      ref={listRef}
      onScroll={handleScroll}
      style={{
        flex: 1,
        overflowY: "auto",
        padding: "8px 12px",
        display: "flex",
        flexDirection: "column",
        gap: "8px",
      }}
    >
      {visibleMessages.map((message) => {
        const config = CHANNEL_CONFIG[message.channel];
        const isOwnMessage = message.senderId === currentPlayerId;

        if (message.isSystem) {
          return (
            <div
              key={message.id}
              style={{
                fontFamily: "Epilogue, sans-serif",
                fontSize: "11px",
                color: "rgba(132, 147, 150, 0.6)",
                textAlign: "center",
                padding: "4px 8px",
                animation: "message-appear 0.3s ease-out",
              }}
            >
              {message.text}
            </div>
          );
        }

        return (
          <div
            key={message.id}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: isOwnMessage ? "flex-end" : "flex-start",
              animation: "message-appear 0.3s ease-out",
              maxWidth: "85%",
              alignSelf: isOwnMessage ? "flex-end" : "flex-start",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              {!isOwnMessage && (
                <span
                  style={{
                    fontFamily: "Epilogue, sans-serif",
                    fontSize: "10px",
                    fontWeight: "700",
                    letterSpacing: "0.05em",
                    color: config.usernameColor,
                  }}
                >
                  {message.senderName}
                </span>
              )}
              <span
                style={{
                  fontFamily: "Epilogue, sans-serif",
                  fontSize: "10px",
                  color: "rgba(132, 147, 150, 0.4)",
                }}
              >
                {formatTimestamp(message.timestamp)}
              </span>
            </div>
            <div
              style={{
                backgroundColor: isOwnMessage
                  ? "rgba(0, 229, 255, 0.15)"
                  : "rgba(21, 29, 30, 0.6)",
                border: isOwnMessage
                  ? "1px solid rgba(0, 229, 255, 0.3)"
                  : "1px solid rgba(132, 147, 150, 0.2)",
                borderRadius: "0",
                padding: "8px 12px",
                marginTop: "2px",
              }}
            >
              <span
                style={{
                  fontFamily: "Epilogue, sans-serif",
                  fontSize: "13px",
                  color: "#dce4e5",
                  lineHeight: "1.4",
                  wordBreak: "break-word",
                }}
              >
                {message.text}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ============================================================================
// INPUT COMPONENT
// ============================================================================

interface ChatInputProps {
  channel: ChatChannel;
  onSend: (text: string) => void;
}

function ChatInput({ channel, onSend }: ChatInputProps) {
  const [text, setText] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const config = CHANNEL_CONFIG[channel];

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const trimmed = text.trim();
      if (!trimmed) return;
      onSend(trimmed);
      setText("");
      inputRef.current?.focus();
    },
    [text, onSend]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSubmit(e as unknown as React.FormEvent);
      }
    },
    [handleSubmit]
  );

  return (
    <form
      onSubmit={handleSubmit}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "8px",
        padding: "8px 12px",
        borderTop: "1px solid rgba(132, 147, 150, 0.2)",
        backgroundColor: "rgba(9, 14, 17, 0.8)",
      }}
    >
      <input
        ref={inputRef}
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={`Message ${config.label}...`}
        style={{
          flex: 1,
          backgroundColor: "rgba(21, 29, 30, 0.6)",
          border: "none",
          borderBottom: `2px solid ${config.color}`,
          borderRadius: "0",
          padding: "10px 12px",
          fontFamily: "Epilogue, sans-serif",
          fontSize: "13px",
          color: "#dce4e5",
          outline: "none",
          transition: "border-color 0.2s ease",
        }}
        onFocus={(e) => {
          e.currentTarget.style.borderBottomColor = "#00e5ff";
        }}
        onBlur={(e) => {
          e.currentTarget.style.borderBottomColor = config.color;
        }}
      />
      <button
        type="submit"
        disabled={!text.trim()}
        style={{
          width: "40px",
          height: "40px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: text.trim()
            ? "rgba(0, 229, 255, 0.15)"
            : "rgba(132, 147, 150, 0.1)",
          border: text.trim()
            ? "1px solid rgba(0, 229, 255, 0.4)"
            : "1px solid rgba(132, 147, 150, 0.2)",
          borderRadius: "0",
          cursor: text.trim() ? "pointer" : "not-allowed",
          transition: "all 0.2s ease",
          animation: text.trim() ? "send-glow 2s ease-in-out infinite" : "none",
          opacity: text.trim() ? 1 : 0.5,
        }}
      >
        <span
          style={{
            fontSize: "16px",
            color: text.trim() ? "#00e5ff" : "rgba(132, 147, 150, 0.5)",
          }}
        >
          ➤
        </span>
      </button>
    </form>
  );
}

// ============================================================================
// DRAG HANDLE COMPONENT
// ============================================================================

interface DragHandleProps {
  onDrag: (dy: number) => void;
  onDoubleClick: () => void;
}

function DragHandle({ onDrag, onDoubleClick }: DragHandleProps) {
  const startYRef = useRef<number | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    startYRef.current = e.touches[0].clientY;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (startYRef.current === null) return;
    const deltaY = e.touches[0].clientY - startYRef.current;
    if (Math.abs(deltaY) > 5) {
      onDrag(deltaY);
      startYRef.current = e.touches[0].clientY;
    }
  };

  const handleTouchEnd = () => {
    startYRef.current = null;
  };

  return (
    <div
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onDoubleClick={onDoubleClick}
      style={{
        height: "4px",
        backgroundColor: "rgba(132, 147, 150, 0.3)",
        cursor: "ns-resize",
        animation: "drag-handle-pulse 2s ease-in-out infinite",
        flexShrink: 0,
      }}
    />
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function GameChatWindow({
  state,
  currentPlayerId,
  currentPlayerName,
  onSendMessage,
  onClose,
  onTabChange,
  onMinimize,
  onMaximize,
}: GameChatWindowProps) {
  // Inject styles on mount
  useEffect(() => {
    injectStyles();
  }, []);

  if (!state.isOpen) return null;

  const handleSend = useCallback(
    (text: string) => {
      onSendMessage(state.activeTab, text);
    },
    [state.activeTab, onSendMessage]
  );

  const handleDrag = useCallback(
    (dy: number) => {
      // Drag to minimize/maximize
      if (dy > 30) {
        onMinimize();
      } else if (dy < -30) {
        onMaximize();
      }
    },
    [onMinimize, onMaximize]
  );

  return (
    <div
      className="game-chat-window"
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        height: state.isMinimized ? "48px" : "45vh",
        maxHeight: state.isMinimized ? "48px" : "400px",
        display: "flex",
        flexDirection: "column",
        backgroundColor: "rgba(13, 21, 22, 0.92)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        borderTop: "1px solid rgba(0, 229, 255, 0.3)",
        borderRadius: "0",
        zIndex: 900,
        animation: "chat-slide-in 0.3s ease-out",
        transition: "height 0.3s ease",
      }}
    >
      {/* Drag Handle */}
      <DragHandle
        onDrag={handleDrag}
        onDoubleClick={state.isMinimized ? onMaximize : onMinimize}
      />

      {/* Tab Bar */}
      <TabBar
        activeTab={state.activeTab}
        unreadCounts={state.unreadCounts}
        onTabChange={onTabChange}
      />

      {/* Message List (hidden when minimized) */}
      {!state.isMinimized && (
        <MessageList
          messages={state.messages}
          activeTab={state.activeTab}
          currentPlayerId={currentPlayerId}
        />
      )}

      {/* Input (hidden when minimized) */}
      {!state.isMinimized && (
        <ChatInput channel={state.activeTab} onSend={handleSend} />
      )}

      {/* Minimized State */}
      {state.isMinimized && (
        <div
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            padding: "0 12px",
            gap: "12px",
          }}
        >
          <span
            style={{
              fontFamily: "Epilogue, sans-serif",
              fontSize: "11px",
              fontWeight: "700",
              letterSpacing: "0.15em",
              color: CHANNEL_CONFIG[state.activeTab].color,
            }}
          >
            {CHANNEL_CONFIG[state.activeTab].label}
          </span>
          <span
            style={{
              fontFamily: "Epilogue, sans-serif",
              fontSize: "11px",
              color: "rgba(132, 147, 150, 0.6)",
            }}
          >
            {state.messages.filter((m) => m.channel === state.activeTab).length} messages
          </span>
        </div>
      )}

      {/* Close Button */}
      <button
        onClick={onClose}
        style={{
          position: "absolute",
          top: "8px",
          right: "8px",
          width: "24px",
          height: "24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "transparent",
          border: "1px solid rgba(132, 147, 150, 0.3)",
          borderRadius: "0",
          cursor: "pointer",
          color: "rgba(132, 147, 150, 0.6)",
          fontSize: "12px",
          transition: "all 0.2s ease",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = "#00e5ff";
          e.currentTarget.style.color = "#00e5ff";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = "rgba(132, 147, 150, 0.3)";
          e.currentTarget.style.color = "rgba(132, 147, 150, 0.6)";
        }}
      >
        ✕
      </button>
    </div>
  );
}

// ============================================================================
// HOOK FOR CHAT STATE MANAGEMENT
// ============================================================================

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

export function useChat(
  playerId: string,
  playerName: string,
  onSend?: (channel: ChatChannel, text: string) => void
): UseChatReturn {
  const [state, setState] = useState<ChatState>({
    isOpen: true,
    isMinimized: false,
    activeTab: "local",
    unreadCounts: { local: 0, global: 0, trade: 0, guild: 0, faction: 0 },
    messages: [],
  });

  const addMessage = useCallback(
    (message: Omit<ChatMessage, "id" | "timestamp">) => {
      setState((prev) => {
        const newMessage: ChatMessage = {
          ...message,
          id: generateMessageId(),
          timestamp: Date.now(),
        };
        const newMessages = [...prev.messages, newMessage].slice(-MAX_MESSAGES);
        const newUnreadCounts = { ...prev.unreadCounts };

        // Increment unread for non-active tabs
        if (message.channel !== prev.activeTab) {
          newUnreadCounts[message.channel] = (newUnreadCounts[message.channel] || 0) + 1;
        }

        return {
          ...prev,
          messages: newMessages,
          unreadCounts: newUnreadCounts,
        };
      });
    },
    []
  );

  const sendMessage = useCallback(
    (channel: ChatChannel, text: string) => {
      addMessage({
        channel,
        senderName: playerName,
        senderId: playerId,
        text,
      });
      onSend?.(channel, text);
    },
    [addMessage, playerId, playerName, onSend]
  );

  const setActiveTab = useCallback((tab: ChatChannel) => {
    setState((prev) => ({
      ...prev,
      activeTab: tab,
      unreadCounts: { ...prev.unreadCounts, [tab]: 0 },
    }));
  }, []);

  const close = useCallback(() => {
    setState((prev) => ({ ...prev, isOpen: false }));
  }, []);

  const open = useCallback(() => {
    setState((prev) => ({ ...prev, isOpen: true }));
  }, []);

  const toggleMinimize = useCallback(() => {
    setState((prev) => ({ ...prev, isMinimized: !prev.isMinimized }));
  }, []);

  const clearUnread = useCallback((channel: ChatChannel) => {
    setState((prev) => ({
      ...prev,
      unreadCounts: { ...prev.unreadCounts, [channel]: 0 },
    }));
  }, []);

  const addSystemMessage = useCallback(
    (text: string) => {
      addMessage({
        channel: "local",
        senderName: "SYSTEM",
        senderId: "system",
        text,
        isSystem: true,
      });
    },
    [addMessage]
  );

  return {
    state,
    sendMessage,
    setActiveTab,
    close,
    toggleMinimize,
    open,
    clearUnread,
    addSystemMessage,
  };
}

export default GameChatWindow;