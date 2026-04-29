import React, { useState, useEffect, useRef, useMemo } from 'react';

interface WorldEvent {
  id: string;
  timestamp: number;
  description: string;
  type: 'legend' | 'event' | 'cycle';
}

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

// Mocking Context Hook for WorldHistory - Assuming this exists in the project
// In a real scenario, this would be imported from a context provider
const useWorldHistory = () => {
  const [history, setHistory] = useState<WorldEvent[]>([
    { id: '1', timestamp: Date.now() - 10000, description: 'The First Awakening', type: 'legend' },
    { id: '2', timestamp: Date.now() - 5000, description: 'The Shattering of the Sigil', type: 'event' }
  ]);
  return { history };
};

// Mocking the NPC Chat Agent interface
class NPCChatAgent {
  private persona: string;
  private systemPrompt: string;

  constructor(persona: string, context: string) {
    this.persona = persona;
    this.systemPrompt = `You are the ${persona}. Your knowledge is bound to the World History provided. 
    Context: ${context}
    Answer support requests based on the current 'Legenden-Lage' and maintain your character at all times.`;
  }

  async sendMessage(history: Message[], userInput: string): Promise<string> {
    // In a real implementation, this would call an LLM API (OpenAI/Anthropic)
    // with the combined system prompt and history.
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(`As the ${this.persona}, I acknowledge your query: "${userInput}". The cycles indicate progress.`);
      }, 1000);
    });
  }
}

const OuroborosAssistant: React.FC = () => {
  const { history } = useWorldHistory();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const contextSummary = useMemo(() => {
    return history.map(h => `[${h.type}] ${h.description}`).join('; ');
  }, [history]);

  const agent = useMemo(() => {
    return new NPCChatAgent('Guardian of the Cycle', contextSummary);
  }, [contextSummary]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage: Message = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsTyping(true);

    try {
      const response = await agent.sendMessage(messages, input);
      const assistantMessage: Message = { role: 'assistant', content: response };
      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Failed to get response:', error);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '600px',
      width: '400px',
      border: '1px solid #333',
      borderRadius: '8px',
      backgroundColor: '#0a0a0a',
      color: '#e0e0e0',
      fontFamily: 'monospace',
      overflow: 'hidden',
      boxShadow: '0 0 20px rgba(0,255,100,0.1)'
    }}>
      <div style={{
        padding: '10px',
        borderBottom: '1px solid #333',
        backgroundColor: '#111',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div style={{ fontWeight: 'bold', color: '#00ff88' }}>GUARDIAN OF THE CYCLE</div>
        <div style={{ fontSize: '10px', color: '#888' }}>
          <span style={{ 
            display: 'inline-block', 
            width: '8px', 
            height: '8px', 
            borderRadius: '50%', 
            backgroundColor: '#00ff88', 
            marginRight: '5px' 
          }}></span>
          CONTEXT SYNCED ({history.length} Events)
        </div>
      </div>

      <div ref={scrollRef} style={{
        flex: 1,
        overflowY: 'auto',
        padding: '15px',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px'
      }}>
        {messages.length === 0 && (
          <div style={{ color: '#555', textAlign: 'center', marginTop: '20px' }}>
            The cycle begins with your word.
          </div>
        )}
        {messages.map((msg, i) => (
          <div key={i} style={{
            alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
            maxWidth: '80%',
            padding: '10px',
            borderRadius: '4px',
            backgroundColor: msg.role === 'user' ? '#1a1a1a' : '#002211',
            border: msg.role === 'user' ? '1px solid #444' : '1px solid #004422',
            fontSize: '14px',
            lineHeight: '1.4'
          }}>
            <div style={{ fontSize: '10px', marginBottom: '4px', opacity: 0.6 }}>
              {msg.role === 'user' ? 'INITIATOR' : 'GUARDIAN'}
            </div>
            {msg.content}
          </div>
        ))}
        {isTyping && (
          <div style={{ fontSize: '12px', color: '#00ff88', animation: 'pulse 1.5s infinite' }}>
            The Guardian is interpreting the weave...
          </div>
        )}
      </div>

      <div style={{ padding: '15px', borderTop: '1px solid #333', backgroundColor: '#111' }}>
        <div style={{ display: 'flex', gap: '10px' }}>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Query the cycle..."
            style={{
              flex: 1,
              backgroundColor: '#000',
              border: '1px solid #444',
              color: '#fff',
              padding: '8px',
              borderRadius: '4px',
              outline: 'none'
            }}
          />
          <button
            onClick={handleSend}
            disabled={isTyping}
            style={{
              backgroundColor: '#00ff88',
              color: '#000',
              border: 'none',
              padding: '8px 15px',
              borderRadius: '4px',
              fontWeight: 'bold',
              cursor: isTyping ? 'not-allowed' : 'pointer',
              opacity: isTyping ? 0.5 : 1
            }}
          >
            SEND
          </button>
        </div>
      </div>
      <style>{`
        @keyframes pulse {
          0% { opacity: 0.4; }
          50% { opacity: 1; }
          100% { opacity: 0.4; }
        }
        ::-webkit-scrollbar {
          width: 5px;
        }
        ::-webkit-scrollbar-track {
          background: #0a0a0a;
        }
        ::-webkit-scrollbar-thumb {
          background: #333;
        }
      `}</style>
    </div>
  );
};

export default OuroborosAssistant;