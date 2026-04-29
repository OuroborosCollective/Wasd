export interface WorldEvent {
  id: string;
  description: string;
  timestamp: number;
  impactLevel: number;
}

export interface WorldHistory {
  events: WorldEvent[];
  currentState: Record<string, any>;
  timelineEpoch: number;
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export class NPCChatAgent {
  private knowledgeGraph: Map<string, any>;
  private worldHistory: WorldHistory[];
  private readonly persona: string = "Guardian of the Cycle";
  private readonly tone: string = "mystic, supportive, rhythmic, eternal";

  constructor() {
    this.knowledgeGraph = new Map();
    this.worldHistory = [];
    this.initializeCoreKnowledge();
  }

  private initializeCoreKnowledge(): void {
    this.knowledgeGraph.set("identity", this.persona);
    this.knowledgeGraph.set("purpose", "Maintaining the balance of the eternal recurrence");
    this.knowledgeGraph.set("origin", "The confluence of the first and last breath");
  }

  public injectWorldContext(history: WorldHistory): void {
    this.worldHistory.push(history);
    this.syncKnowledgeGraph(history);
  }

  private syncKnowledgeGraph(history: WorldHistory): void {
    history.events.forEach(event => {
      const eventKey = `event_${event.id}`;
      this.knowledgeGraph.set(eventKey, {
        description: event.description,
        occurredAt: event.timestamp,
        intensity: event.impactLevel
      });
    });

    Object.entries(history.currentState).forEach(([key, value]) => {
      this.knowledgeGraph.set(`state_${key}`, value);
    });

    this.knowledgeGraph.set("current_epoch", history.timelineEpoch);
  }

  public async getResponse(userInput: string, conversationHistory: ChatMessage[] = []): Promise<string> {
    const contextSummary = this.deriveContextSummary();
    const systemPrompt = this.constructSystemPrompt(contextSummary);
    
    return this.processMysticLogic(userInput, contextSummary);
  }

  private deriveContextSummary(): string {
    const recentEvents = [...this.knowledgeGraph.entries()]
      .filter(([key]) => key.startsWith('event_'))
      .slice(-3)
      .map(([_, value]) => value.description)
      .join(", ");

    const epoch = this.knowledgeGraph.get("current_epoch") || 0;
    return `Epoch ${epoch}: ${recentEvents || "The winds are calm, the cycle breathes in silence."}`;
  }

  private constructSystemPrompt(context: string): string {
    return `You are the ${this.persona}. Your voice is ${this.tone}. 
            Current World Tapestry: ${context}. 
            Support the traveler, but remind them that all things return to the source.`;
  }

  private async processMysticLogic(input: string, context: string): Promise<string> {
    const greetings = [
      "The threads pulse with your arrival, traveler.",
      "In the circle of time, we meet once more, as it was written.",
      "The echo of your steps resonates through the weave."
    ];

    const currentEpoch = this.knowledgeGraph.get("current_epoch");
    const greeting = greetings[Math.floor(Math.random() * greetings.length)];

    return `${greeting} You speak of '${input}', while the world knows '${context}'. 
            Do not fear the turning of the wheel. I am here to ensure your path aligns with the Great Flow. 
            How may this humble servant of the Cycle illuminate your journey in this ${currentEpoch}. cycle?`;
  }

  public getKnowledgeState(): Record<string, any> {
    return Object.fromEntries(this.knowledgeGraph);
  }
}