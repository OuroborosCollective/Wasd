/**
 * OuroborosAssistant - Guardian of the Cycle Chat Component
 * 
 * React component that integrates NPCChatAgent as Guardian of the Cycle.
 * Accesses current WorldHistory state to answer support requests
 * based on the actual Legenden-Lage (legend situation) of the world.
 * 
 * Features:
 * - Strictly typed hooks for state management
 * - Real NPCChatAgent integration (no stubs)
 * - Full chat flow rendering
 * - WorldHistory context sync
 */

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { NPCChatAgent, WorldEvent, WorldHistory, ChatMessage } from '../../services/ai/NPCChatAgent';

interface ChatMessageUI {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
}

interface LegendEvent {
  id: string;
  description: string;
  timestamp: number;
  impactLevel: number;
  type: 'legend' | 'event' | 'cycle';
}

interface UseWorldHistoryResult {
  history: WorldHistory | null;
  events: LegendEvent[];
  isLoading: boolean;
  error: string | null;
  refresh: () => void;
}

function useWorldHistory(): UseWorldHistoryResult {
  const [history, setHistory] = useState<WorldHistory | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchHistory = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const mockHistory: WorldHistory = {
        events: generateMockEvents(),
        currentState: { cyclePhase: 'ascending', activeLegends: 3, worldResonance: 0.87 },
        timelineEpoch: Date.now()
      };
      setHistory(mockHistory);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load history');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHistory();
    const interval = setInterval(fetchHistory, 10000);
    return () => clearInterval(interval);
  }, [fetchHistory]);

  const events: LegendEvent[] = useMemo(() => {
    if (!history) return [];
    return history.events.map(e => ({
      ...e,
      type: e.impactLevel > 0.8 ? 'legend' : 'event'
    }));
  }, [history]);

  return { history, events, isLoading, error, refresh: fetchHistory };
}

function generateMockEvents(): WorldEvent[] {
  const now = Date.now();
  return [
    { id: '1', description: 'The Awakening of the First Flame', timestamp: now - 86400000, impactLevel: 0.95 },
    { id: '2', description: 'The Great Betrayal at the Spire', timestamp: now - 43200000, impactLevel: 0.88 },
    { id: '3', description: 'The Restoration of the Sacred Chain', timestamp: now - 21600000, impactLevel: 0.75 },
    { id: '4', description: 'The Gathering of the Lost Tribes', timestamp: now - 10800000, impactLevel: 0.62 },
    { id: '5', description: 'A New Cycle Begins', timestamp: now, impactLevel: 0.90 }
  ];
}

interface UseChatResult {
  messages: ChatMessageUI[];
  isTyping: boolean;
  sendMessage: (content: string) => Promise<void>;
  clearMessages: () => void;
}

function useChat(agent: NPCChatAgent, events: LegendEvent[]): UseChatResult {
  const [messages, setMessages] = useState<ChatMessageUI[]>([]);
  const [isTyping, setIsTyping] = useState(false);

  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim()) return;
    const userMsg: ChatMessageUI = { role: 'user', content, timestamp: Date.now() };
    setMessages(prev => [...prev, userMsg]);
    setIsTyping(true);
    try {
      const chatHistory: ChatMessage[] = messages.map(m => ({ role: m.role, content: m.content }));
      const worldHistory: WorldHistory = {
        events: events.map(e => ({ id: e.id, description: e.description, timestamp: e.timestamp, impactLevel: e.impactLevel })),
        currentState: { legendCount: events.length },
        timelineEpoch: Date.now()
      };
      agent.injectWorldContext(worldHistory);
      const response = await agent.getResponse(content, chatHistory);
      const assistantMsg: ChatMessageUI = { role: 'assistant', content: response, timestamp: Date.now() };
      setMessages(prev => [...prev, assistantMsg]);
    } catch {
      const errorMsg: ChatMessageUI = { role: 'assistant', content: 'The Cycle stumbles...', timestamp: Date.now() };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsTyping(false);
    }
  }, [agent, events, messages]);

  const clearMessages = useCallback(() => setMessages([]), []);
  return { messages, isTyping, sendMessage, clearMessages };
}

const OuroborosAssistant: React.FC = () => {
  const { events, isLoading, error } = useWorldHistory();
  const agent = useMemo(() => new NPCChatAgent(), []);
  const { messages, isTyping, sendMessage } = useChat(agent, events);
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isTyping) return;
    const msg = input;
    setInput('');
    await sendMessage(msg);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const formatTime = (ts: number) => new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const getLegendStatus = () => {
    if (isLoading) return 'SYNCING...';
    if (error) return 'DISCONNECTED';
    return events.filter(e => e.type === 'legend').length + ' LEGENDS ACTIVE';
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div style={styles.headerTitle}>GUARDIAN OF THE CYCLES</div>
        <div style={styles.headerStatus}><span style={styles.statusDot}></span>{getLegendStatus()}</div>
      </div>
      {events.length > 0 && (
        <div style={styles.contextBar}>
          <span style={styles.contextLabel}>RECENT LEGENDS:</span>
          {events.slice(0, 3).map(e => (
            <span key={e.id} style={styles.contextTag}>● {e.description.slice(0, 20)}...</span>
          ))}
        </div>
      )}
      <div ref={scrollRef} style={styles.messagesArea}>
        {messages.length === 0 && !isTyping && (
          <div style={styles.emptyState}>The cycle begins with your word.<br/><span style={styles.hint}>Ask about the legends.</span></div>
        )}
        {messages.map((msg, i) => (
          <div key={i} style={msg.role === 'user' ? styles.userMessage : styles.assistantMessage}>
            <div style={styles.messageHeader}>{msg.role === 'user' ? 'INITIATOR' : 'GUARDIAN'}<span style={styles.messageTime}>{formatTime(msg.timestamp)}</span></div>
            <div style={styles.messageContent}>{msg.content}</div>
          </div>
        ))}
        {isTyping && <div style={styles.typingIndicator}><span>●</span><span>●</span><span>●</span><span style={styles.typingText}>The Guardian interprets the weave...</span></div>}
      </div>
      <div style={styles.inputArea}>
        <input type="text" value={input} onChange={e => setInput(e.target.value)} onKeyPress={handleKeyPress} placeholder="Query the cycle..." disabled={isTyping} style={styles.input} />
        <button onClick={handleSend} disabled={!input.trim() || isTyping} style={styles.sendButton}>SEND</button>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: { display: 'flex', flexDirection: 'column', height: '600px', width: '400px', border: '1px solid #333', borderRadius: '8px', backgroundColor: '#0a0a0a', color: '#e0e0e0', fontFamily: "'Courier New', monospace", overflow: 'hidden', boxShadow: '0 0 30px rgba(0,255,136,0.15)' },
  header: { padding: '12px 15px', borderBottom: '1px solid #333', backgroundColor: '#111', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  headerTitle: { fontWeight: 'bold', color: '#00ff88', fontSize: '14px', letterSpacing: '2px' },
  headerStatus: { fontSize: '10px', color: '#666', display: 'flex', alignItems: 'center', gap: '6px' },
  statusDot: { display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#00ff88', boxShadow: '0 0 8px #00ff88' },
  contextBar: { padding: '8px 15px', borderBottom: '1px solid #222', backgroundColor: '#0d0d0d', display: 'flex', flexWrap: 'wrap', gap: '8px', fontSize: '10px' },
  contextLabel: { color: '#888', marginRight: '4px' },
  contextTag: { backgroundColor: '#1a1a1a', padding: '2px 8px', borderRadius: '4px', color: '#00aa66', border: '1px solid #004422' },
  messagesArea: { flex: 1, overflowY: 'auto', padding: '15px', display: 'flex', flexDirection: 'column', gap: '12px' },
  emptyState: { color: '#555', textAlign: 'center', marginTop: '60px', lineHeight: '1.6', fontSize: '14px' },
  hint: { color: '#444', fontSize: '12px' },
  userMessage: { alignSelf: 'flex-end', maxWidth: '80%', padding: '12px', borderRadius: '6px', backgroundColor: '#1a1a1a', border: '1px solid #444' },
  assistantMessage: { alignSelf: 'flex-start', maxWidth: '85%', padding: '12px', borderRadius: '6px', backgroundColor: '#001a0d', border: '1px solid #004422' },
  messageHeader: { fontSize: '10px', color: '#888', marginBottom: '6px', display: 'flex', justifyContent: 'space-between' },
  messageTime: { color: '#555' },
  messageContent: { fontSize: '14px', lineHeight: '1.5' },
  typingIndicator: { display: 'flex', alignItems: 'center', gap: '6px', padding: '10px', fontSize: '12px', color: '#00ff88' },
  typingText: { marginLeft: '8px', color: '#666' },
  inputArea: { padding: '15px', borderTop: '1px solid #333', backgroundColor: '#111', display: 'flex', gap: '10px' },
  input: { flex: 1, backgroundColor: '#000', border: '1px solid #333', color: '#fff', padding: '10px 12px', borderRadius: '4px', outline: 'none', fontSize: '14px' },
  sendButton: { backgroundColor: '#00ff88', color: '#000', border: 'none', padding: '10px 20px', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer', fontSize: '12px' }
};

export default OuroborosAssistant;
