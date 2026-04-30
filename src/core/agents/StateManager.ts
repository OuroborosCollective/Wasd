import * as fs from 'fs';
import * as path from 'path';

export interface AgentMetadata {
    id: string;
    name: string;
    role: string;
    status: 'active' | 'idle' | 'busy' | 'terminated';
    lastUpdated: string;
    version: string;
}

export interface AgentState {
    metadata: AgentMetadata;
    context: Record<string, any>;
    memory: {
        shortTerm: any[];
        longTermId?: string;
    };
    environment: {
        workingDirectory: string;
        activeFiles: string[];
    };
}

/**
 * StateManager: Single Source of Truth (SSoT) Framework
 * Harmonisiert .jules/, AGENTS.md und .agents_tmp/
 */
export class StateManager {
    private readonly rootPath: string;
    private readonly julesDir: string;
    private readonly tmpDir: string;
    private readonly registryFile: string;

    constructor(basePath: string = process.cwd()) {
        this.rootPath = basePath;
        this.julesDir = path.join(this.rootPath, '.jules');
        this.tmpDir = path.join(this.rootPath, '.agents_tmp');
        this.registryFile = path.join(this.rootPath, 'AGENTS.md');
        this.initializeStructure();
    }

    private initializeStructure(): void {
        [this.julesDir, this.tmpDir].forEach(dir => {
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
        });

        if (!fs.existsSync(this.registryFile)) {
            this.updateMarkdownRegistry([]);
        }
    }

    /**
     * Speichert den gesamten State eines Agents und synchronisiert alle SSoT-Komponenten
     */
    public async saveAgentState(agentId: string, state: Partial<AgentState>): Promise<void> {
        const currentState = await this.loadAgentState(agentId);
        
        const updatedState: AgentState = {
            ...currentState,
            ...state,
            metadata: {
                ...currentState.metadata,
                ...(state.metadata || {}),
                id: agentId,
                lastUpdated: new Date().toISOString()
            }
        };

        // 1. Persistent Storage (.jules/)
        const statePath = path.join(this.julesDir, `${agentId}.json`);
        fs.writeFileSync(statePath, JSON.stringify(updatedState, null, 2), 'utf-8');

        // 2. Ephemeral Cache (.agents_tmp/)
        const tmpPath = path.join(this.tmpDir, `${agentId}.last_sync`);
        fs.writeFileSync(tmpPath, updatedState.metadata.lastUpdated, 'utf-8');

        // 3. Human Readable Registry (AGENTS.md)
        await this.syncRegistry();
    }

    /**
     * Lädt den State eines Agents aus der primären Quelle (.jules/)
     */
    public async loadAgentState(agentId: string): Promise<AgentState> {
        const statePath = path.join(this.julesDir, `${agentId}.json`);
        
        if (fs.existsSync(statePath)) {
            const raw = fs.readFileSync(statePath, 'utf-8');
            return JSON.parse(raw);
        }

        return this.createDefaultState(agentId);
    }

    /**
     * Synchronisiert die AGENTS.md basierend auf allen validen States in .jules/
     */
    public async syncRegistry(): Promise<void> {
        const files = fs.readdirSync(this.julesDir).filter(f => f.endsWith('.json'));
        const states: AgentState[] = files.map(file => {
            return JSON.parse(fs.readFileSync(path.join(this.julesDir, file), 'utf-8'));
        });

        this.updateMarkdownRegistry(states);
    }

    private updateMarkdownRegistry(states: AgentState[]): void {
        let content = '# Agent Registry\n\n';
        content += '| ID | Name | Role | Status | Version | Last Updated |\n';
        content += '|:---|:---|:---|:---|:---|:---|\n';

        states.forEach(state => {
            const { id, name, role, status, version, lastUpdated } = state.metadata;
            content += `| ${id} | ${name} | ${role} | ${status} | ${version} | ${lastUpdated} |\n`;
        });

        content += '\n\n---\n*Automated State Transfer System - Single Source of Truth*';
        fs.writeFileSync(this.registryFile, content, 'utf-8');
    }

    private createDefaultState(agentId: string): AgentState {
        return {
            metadata: {
                id: agentId,
                name: 'New Agent',
                role: 'Contributor',
                status: 'idle',
                version: '1.0.0',
                lastUpdated: new Date().toISOString()
            },
            context: {},
            memory: {
                shortTerm: []
            },
            environment: {
                workingDirectory: this.rootPath,
                activeFiles: []
            }
        };
    }

    /**
     * Bereinigt temporäre Laufzeitdaten
     */
    public cleanupTmp(): void {
        if (fs.existsSync(this.tmpDir)) {
            const files = fs.readdirSync(this.tmpDir);
            files.forEach(file => fs.unlinkSync(path.join(this.tmpDir, file)));
        }
    }
}