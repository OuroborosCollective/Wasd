export enum ActionPriority {
  LOW = 1,
  MEDIUM = 2,
  HIGH = 3,
  CRITICAL = 4
}

export enum SystemSubsystem {
  DATABASE = 'DATABASE',
  REDIS = 'REDIS',
  COMPUTE = 'COMPUTE',
  NETWORK = 'NETWORK',
  KERNEL = 'KERNEL',
  RESOURCES = 'RESOURCES',
  MEMORY = 'MEMORY',
  STORAGE = 'STORAGE',
  SERVICES = 'SERVICES',
  SECURITY = 'SECURITY',
  NETWORKING = 'NETWORKING'
}

export interface IVPSService {
  id: string;
  name: string;
  version: string;
  status: 'idle' | 'active' | 'error' | 'maintenance';
  heartbeat: number;
  load: number;
}

export interface IVPSState {
  status: 'idle' | 'active' | 'error' | 'maintenance';
  lastCheck: Date;
  activeActions: number;
  services: IVPSService[];
  metrics: {
    cpuUsage: number;
    ramUsage: number;
    diskUsage: number;
  };
  security: {
    unauthorizedAccessAttempts: number;
  };
}

export interface IVPSHealthStatus {
  id: string;
  isOperational: boolean;
  load: number;
  subsystems?: Record<SystemSubsystem, boolean>;
}

export interface IAutonomousAction {
  id?: string;
  type: string;
  priority: ActionPriority;
  execute?: () => Promise<void>;
  subsystem: SystemSubsystem;
  reason: string;
  targetId?: string;
}

export interface IVPSAutonomous {
  id: string;
  name: string;
  status: 'idle' | 'active' | 'error' | 'maintenance';
  isActive: boolean;
  lastHeartbeat: Date;
  version: string;
  capabilities: string[];
  configuration: Record<string, any>;
}
