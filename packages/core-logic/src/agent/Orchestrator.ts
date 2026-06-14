import { EventEmitter } from 'node:events';

export interface AgentAction {
  type: string;
  payload: any;
  priority: number;
}

export interface Perception {
  source: string;
  data: any;
  timestamp: number;
}

export interface AgentState {
  id: string;
  name: string;
  memory: any[];
  goals: string[];
  currentTask?: string;
  status: 'idle' | 'busy' | 'reactive' | 'thinking';
}

export interface IMemoryProvider {
  store(key: string, value: any): Promise<void>;
  retrieve(key: string): Promise<any>;
  query(query: string, limit: number): Promise<any[]>;
}

export interface ILLMProvider {
  generate(prompt: string, context: any): Promise<string>;
}

export interface IDeterministicClock {
  nextTick(): number;
}

export function createDeterministicClock(startTick = 0): IDeterministicClock {
  let tick = Math.max(0, Math.floor(Number(startTick) || 0));
  return {
    nextTick(): number {
      tick += 1;
      return tick;
    },
  };
}

export class Orchestrator extends EventEmitter {
  private state: AgentState;
  private memory: IMemoryProvider;
  private llm: ILLMProvider;
  private clock: IDeterministicClock;
  private perceptionQueue: Perception[] = [];
  private isProcessing: boolean = false;

  constructor(
    id: string,
    name: string,
    memoryProvider: IMemoryProvider,
    llmProvider: ILLMProvider,
    clock: IDeterministicClock = createDeterministicClock(),
  ) {
    super();
    this.state = {
      id,
      name,
      memory: [],
      goals: [],
      status: 'idle'
    };
    this.memory = memoryProvider;
    this.llm = llmProvider;
    this.clock = clock;
  }

  public async perceive(input: any, source: string): Promise<void> {
    const perception: Perception = {
      source,
      data: input,
      timestamp: this.clock.nextTick(),
    };
    this.perceptionQueue.push(perception);
    
    // Immediate reactive check (logic from ReactiveBrain)
    await this.evaluateReactiveTriggers(perception);
    
    if (!this.isProcessing) {
      this.processCycle();
    }
  }

  private async evaluateReactiveTriggers(perception: Perception): Promise<void> {
    // Logic consolidated from ReactiveBrain.ts
    // High priority triggers that bypass the LLM planning loop
    if (perception.source === 'system' && perception.data.type === 'emergency') {
      this.emit('action', { type: 'STOP', priority: 100 });
    }
  }

  private async processCycle(): Promise<void> {
    if (this.perceptionQueue.length === 0) {
      this.isProcessing = false;
      return;
    }

    this.isProcessing = true;
    this.state.status = 'thinking';

    const currentPerception = this.perceptionQueue.shift();
    
    try {
      // 1. Context Retrieval
      const relevantMemories = await this.memory.query(JSON.stringify(currentPerception?.data), 5);
      
      // 2. Planning (Logic from agent/ components)
      const prompt = this.constructPrompt(currentPerception, relevantMemories);
      const decision = await this.llm.generate(prompt, this.state);
      
      // 3. Action Parsing & Execution
      const actions = this.parseActions(decision);
      for (const action of actions) {
        await this.executeAction(action);
      }

      // 4. State Update
      await this.updateMemory(currentPerception, decision);
      
    } catch (error) {
      console.error('Orchestrator Processing Error:', error);
      this.emit('error', error);
    } finally {
      this.state.status = 'idle';
      setImmediate(() => this.processCycle());
    }
  }

  private constructPrompt(perception: Perception | undefined, context: any[]): string {
    return `
      System: You are ${this.state.name}, an autonomous agent.
      Current State: ${JSON.stringify(this.state)}
      Recent Perception: ${JSON.stringify(perception)}
      Context: ${JSON.stringify(context)}
      Task: Decide the next sequence of actions. Return JSON format.
    `;
  }

  private parseActions(llmOutput: string): AgentAction[] {
    try {
      const parsed = JSON.parse(llmOutput);
      return Array.isArray(parsed) ? parsed : [parsed];
    } catch {
      // Fallback for non-JSON or partial responses
      return [{ type: 'SPEAK', payload: { text: llmOutput }, priority: 1 }];
    }
  }

  private async executeAction(action: AgentAction): Promise<void> {
    this.emit('action', action);
    // Logic for handling specific internal state changes based on actions
    if (action.type === 'SET_GOAL') {
      this.state.goals.push(action.payload.goal);
    }
  }

  private async updateMemory(perception: Perception | undefined, result: string): Promise<void> {
    const timestamp = this.clock.nextTick();
    const memoryEntry = {
      perception,
      decision: result,
      timestamp,
    };
    await this.memory.store(`mem_${String(timestamp).padStart(12, '0')}`, memoryEntry);
  }

  public getState(): AgentState {
    return { ...this.state };
  }

  public updateConfig(config: Partial<AgentState>): void {
    this.state = { ...this.state, ...config };
  }
}