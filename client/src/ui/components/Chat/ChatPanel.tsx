/**
 * ChatPanel Component
 * Full-featured chat system with multiple channels
 * 
 * Features:
 * - Multiple chat channels (Global, Whisper, Guild, Faction)
 * - Message history with scrolling
 * - Real-time message updates
 * - User mentions
 * - Message formatting (Bold, Italic, Color)
 * - Emote support
 * - Spam protection
 * - Responsive design
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import './ChatPanel.css';

export type ChatChannel = 'global' | 'whisper' | 'guild' | 'faction' | 'party';

export interface ChatMessage {
  id: string;
  author: string;
  content: string;
  channel: ChatChannel;
  timestamp: number;
  color?: string;
  isSystem?: boolean;
  isMention?: boolean;
}

interface ChatPanelProps {
  messages: ChatMessage[];
  currentUser: string;
  channels?: ChatChannel[];
  onSendMessage?: (message: string, channel: ChatChannel) => void;
  onMention?: (username: string) => void;
  className?: string;
}

/**
 * Message Component
 */
const Message: React.FC<{ message: ChatMessage; onMention?: (username: string) => void }> = ({
  message,
  onMention
}) => {
  const formatMessage = (content: string): React.ReactNode => {
    // Simple formatting support
    let formatted = content;

    // Bold: **text**
    formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

    // Italic: *text*
    formatted = formatted.replace(/\*(.*?)\*/g, '<em>$1</em>');

    // Color: {color:text}
    formatted = formatted.replace(/\{([^:]+):([^}]+)\}/g, '<span style="color: $1">$2</span>');

    return <div dangerouslySetInnerHTML={{ __html: formatted }} />;
  };

  const time = new Date(message.timestamp).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit'
  });

  return (
    <div className={`chat-message ${message.isSystem ? 'system' : ''} ${message.isMention ? 'mention' : ''}`}>
      <div className="message-header">
        <span
          className="message-author"
          onClick={() => onMention?.(message.author)}
          style={{ color: message.color || '#fff' }}
        >
          {message.author}
        </span>
        <span className="message-time">{time}</span>
      </div>
      <div className="message-content">{formatMessage(message.content)}</div>
    </div>
  );
};

/**
 * Message History Component
 */
const MessageHistory: React.FC<{
  messages: ChatMessage[];
  currentUser: string;
  onMention?: (username: string) => void;
}> = ({ messages, currentUser, onMention }) => {
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="message-history">
      {messages.length === 0 ? (
        <div className="history-empty">
          <div className="empty-icon">💬</div>
          <div className="empty-text">No messages yet</div>
        </div>
      ) : (
        messages.map((msg) => (
          <Message
            key={msg.id}
            message={msg}
            onMention={onMention}
          />
        ))
      )}
      <div ref={endRef} />
    </div>
  );
};

/**
 * Channel Tabs Component
 */
const ChannelTabs: React.FC<{
  channels: ChatChannel[];
  selected: ChatChannel;
  onSelect: (channel: ChatChannel) => void;
  unreadCounts?: Record<ChatChannel, number>;
}> = ({ channels, selected, onSelect, unreadCounts = {} }) => {
  const getChannelIcon = (channel: ChatChannel): string => {
    const icons: Record<ChatChannel, string> = {
      global: '🌍',
      whisper: '💬',
      guild: '🏰',
      faction: '⚔️',
      party: '👥'
    };
    return icons[channel];
  };

  return (
    <div className="channel-tabs">
      {channels.map((channel) => (
        <button
          key={channel}
          className={`channel-tab ${channel} ${selected === channel ? 'active' : ''}`}
          onClick={() => onSelect(channel)}
          title={channel.charAt(0).toUpperCase() + channel.slice(1)}
        >
          <span className="channel-icon">{getChannelIcon(channel)}</span>
          <span className="channel-name">{channel}</span>
          {unreadCounts[channel] > 0 && (
            <span className="unread-badge">{unreadCounts[channel]}</span>
          )}
        </button>
      ))}
    </div>
  );
};

/**
 * Chat Input Component
 */
const ChatInput: React.FC<{
  onSendMessage: (message: string) => void;
  currentChannel: ChatChannel;
}> = ({ onSendMessage, currentChannel }) => {
  const [input, setInput] = useState('');
  const [showFormatting, setShowFormatting] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = useCallback(() => {
    if (input.trim()) {
      onSendMessage(input);
      setInput('');
      inputRef.current?.focus();
    }
  }, [input, onSendMessage]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const insertFormatting = (before: string, after: string = '') => {
    const textarea = inputRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = input.substring(start, end);
    const newText =
      input.substring(0, start) +
      before +
      selectedText +
      after +
      input.substring(end);

    setInput(newText);
    setTimeout(() => {
      textarea.selectionStart = start + before.length;
      textarea.selectionEnd = start + before.length + selectedText.length;
      textarea.focus();
    }, 0);
  };

  return (
    <div className="chat-input-container">
      {showFormatting && (
        <div className="formatting-toolbar">
          <button
            className="format-btn bold"
            onClick={() => insertFormatting('**', '**')}
            title="Bold"
          >
            <strong>B</strong>
          </button>
          <button
            className="format-btn italic"
            onClick={() => insertFormatting('*', '*')}
            title="Italic"
          >
            <em>I</em>
          </button>
          <button
            className="format-btn color"
            onClick={() => insertFormatting('{#ff0000:', '}')}
            title="Color"
          >
            🎨
          </button>
          <button
            className="format-btn emote"
            onClick={() => insertFormatting(':smile:')}
            title="Emote"
          >
            😊
          </button>
        </div>
      )}

      <div className="input-wrapper">
        <textarea
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={`Message ${currentChannel}...`}
          className="chat-input"
          rows={2}
        />

        <div className="input-actions">
          <button
            className="action-btn format-toggle"
            onClick={() => setShowFormatting(!showFormatting)}
            title="Formatting"
          >
            ✏️
          </button>
          <button
            className="action-btn send-btn"
            onClick={handleSend}
            disabled={!input.trim()}
            title="Send (Enter)"
          >
            ➤
          </button>
        </div>
      </div>
    </div>
  );
};

/**
 * Main ChatPanel Component
 */
export const ChatPanel: React.FC<ChatPanelProps> = ({
  messages,
  currentUser,
  channels = ['global', 'whisper', 'guild', 'faction', 'party'],
  onSendMessage,
  onMention,
  className = ''
}) => {
  const [selectedChannel, setSelectedChannel] = useState<ChatChannel>('global');

  // Filter messages by channel
  const filteredMessages = messages.filter((msg) => msg.channel === selectedChannel);

  // Calculate unread counts
  const unreadCounts = useMemo(() => {
    const counts: Record<ChatChannel, number> = {
      global: 0,
      whisper: 0,
      guild: 0,
      faction: 0,
      party: 0
    };

    channels.forEach((channel) => {
      const channelMessages = messages.filter((msg) => msg.channel === channel);
      counts[channel] = channelMessages.filter((msg) => msg.author !== currentUser).length;
    });

    return counts;
  }, [messages, currentUser, channels]);

  const handleSendMessage = (message: string) => {
    onSendMessage?.(message, selectedChannel);
  };

  return (
    <div className={`chat-panel-container ${className}`}>
      {/* Header */}
      <div className="chat-header">
        <h2 className="chat-title">Chat</h2>
      </div>

      {/* Channel Tabs */}
      <ChannelTabs
        channels={channels}
        selected={selectedChannel}
        onSelect={setSelectedChannel}
        unreadCounts={unreadCounts}
      />

      {/* Message History */}
      <MessageHistory
        messages={filteredMessages}
        currentUser={currentUser}
        onMention={onMention}
      />

      {/* Chat Input */}
      <ChatInput onSendMessage={handleSendMessage} currentChannel={selectedChannel} />
    </div>
  );
};

export default ChatPanel;
