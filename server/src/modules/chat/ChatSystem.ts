export interface ChatMessage {
  id: string;
  sender: string;
  channel: "global" | "local" | "party" | "guild" | "system";
  text: string;
  timestamp: number;
}

export class ChatSystem {
  private history: ChatMessage[] = [];
  private readonly MAX_HISTORY = 200;
  private readonly RATE_LIMIT_MS = 500;
  private lastMessageTime: Map<string, number> = new Map();

  sendMessage(senderId: string, senderName: string, channel: ChatMessage["channel"], text: string): ChatMessage | null {
    // Rate limit
    const now = Date.now();
    const lastTime = this.lastMessageTime.get(senderId) || 0;
    if (now - lastTime < this.RATE_LIMIT_MS) return null;
    this.lastMessageTime.set(senderId, now);

    // Sanitize
    const sanitized = text.trim().substring(0, 200);
    if (!sanitized) return null;

    const msg: ChatMessage = {
      id: `msg_${now}_${Math.random().toString(36).substring(2, 6)}`,
      sender: senderName,
      channel,
      text: sanitized,
      timestamp: now
    };

    this.history.push(msg);
    if (this.history.length > this.MAX_HISTORY) {
      this.history = this.history.slice(-this.MAX_HISTORY);
    }

    return msg;
  }

  getRecentMessages(channel?: string, count: number = 50): ChatMessage[] {
    let msgs = this.history;
    if (channel) {
      msgs = msgs.filter(m => m.channel === channel);
    }
    return msgs.slice(-count);
  }

  systemMessage(text: string): ChatMessage {
    const msg: ChatMessage = {
      id: `sys_${Date.now()}`,
      sender: "System",
      channel: "system",
      text,
      timestamp: Date.now()
    };
    this.history.push(msg);
    return msg;
  }
}
