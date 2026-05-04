// @ts-nocheck
export enum AgentRole {
  ARCHITECT = 'ARCHITECT',
  DEVELOPER = 'DEVELOPER',
  REVIEWER = 'REVIEWER'
}

export enum TaskStatus {
  PENDING = 'PENDING',
  ANALYZING = 'ANALYZING',
  IN_PROGRESS = 'IN_PROGRESS',
  REVIEWING = 'REVIEWING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED'
}

export interface ModuleBlueprint {
  id: string;
  name: string;
  description: string;
  dependencies: string[];
  architectureNotes: string;
  files: {
    path: string;
    content: string;
    purpose: string;
    exports: string[];
  }[];
}

export interface ValidationReport {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  suggestions: string[];
  coveragePercent?: number;
  reviewedAt: Date;
  reviewerId: string;
}

export interface SwarmTask {
  id: string;
  parentId?: string;
  role: AgentRole;
  status: TaskStatus;
  description: string;
  payload: {
    context?: string;
    requirements?: string[];
    existingCode?: string;
  };
  blueprint?: ModuleBlueprint;
  validationReport?: ValidationReport;
  output?: string;
  error?: {
    message: string;
    stack?: string;
    code?: string;
  };
  metadata: {
    startTime: Date;
    endTime?: Date;
    tokensUsed?: number;
    modelName?: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface SwarmState {
  activeTasks: SwarmTask[];
  completedTasks: SwarmTask[];
  currentBlueprint?: ModuleBlueprint;
  globalContext: Record<string, any>;
}