import { EventEmitter } from 'events';

export enum AgentRole {
    JULES = 'JULES',
    SENTINEL = 'SENTINEL',
    SUPERVISOR = 'SUPERVISOR'
}

export enum TaskStatus {
    PENDING = 'PENDING',
    IN_PROGRESS = 'IN_PROGRESS',
    COMPLETED = 'COMPLETED',
    FAILED = 'FAILED'
}

export interface Task {
    id: string;
    type: 'UI_DEVELOPMENT' | 'SECURITY_CHECK' | 'STATE_SYNC' | 'VALIDATION';
    priority: number;
    payload: any;
    status: TaskStatus;
    assignedTo?: AgentRole;
    result?: any;
}

export interface GlobalState {
    lastSync: number;
    activeTasks: Task[];
    context: Record<string, any>;
}

export class SupervisorAgent extends EventEmitter {
    private state: GlobalState;
    private agents: Map<AgentRole, any>;

    constructor() {
        super();
        this.state = {
            lastSync: Date.now(),
            activeTasks: [],
            context: {}
        };
        this.agents = new Map();
    }

    public registerAgent(role: AgentRole, instance: any): void {
        this.agents.set(role, instance);
        this.log(`Agent ${role} registered.`);
    }

    public async dispatchTask(task: Task): Promise<void> {
        this.state.activeTasks.push(task);
        
        const targetRole = this.determineAssignee(task);
        task.assignedTo = targetRole;
        task.status = TaskStatus.IN_PROGRESS;

        this.log(`Dispatching task ${task.id} (${task.type}) to ${targetRole}`);

        try {
            const agent = this.agents.get(targetRole);
            if (!agent) throw new Error(`Agent ${targetRole} not found`);

            const result = await agent.execute(task);
            
            task.status = TaskStatus.COMPLETED;
            task.result = result;
            
            await this.synchronizeState(targetRole, result);
        } catch (error) {
            task.status = TaskStatus.FAILED;
            this.log(`Task ${task.id} failed: ${error}`);
        } finally {
            this.emit('taskUpdated', task);
        }
    }

    private determineAssignee(task: Task): AgentRole {
        switch (task.type) {
            case 'UI_DEVELOPMENT':
                return AgentRole.JULES;
            case 'SECURITY_CHECK':
            case 'VALIDATION':
                return AgentRole.SENTINEL;
            default:
                return AgentRole.SENTINEL;
        }
    }

    private async synchronizeState(source: AgentRole, update: any): Promise<void> {
        this.state.lastSync = Date.now();
        this.state.context = { ...this.state.context, ...update };

        const targets = [AgentRole.JULES, AgentRole.SENTINEL].filter(r => r !== source);

        for (const role of targets) {
            const agent = this.agents.get(role);
            if (agent && typeof agent.updateContext === 'function') {
                await agent.updateContext(this.state.context);
                this.log(`State synchronized to ${role}`);
            }
        }
    }

    public getGlobalState(): GlobalState {
        return { ...this.state };
    }

    private log(message: string): void {
        console.log(`[SupervisorAgent] [${new Date().toISOString()}] ${message}`);
    }

    public async runPlan(planSteps: Task[]): Promise<void> {
        this.log("Starting plan execution based on PLAN.md specifications.");
        for (const step of planSteps.sort((a, b) => b.priority - a.priority)) {
            await this.dispatchTask(step);
        }
    }
}

export const supervisor = new SupervisorAgent();