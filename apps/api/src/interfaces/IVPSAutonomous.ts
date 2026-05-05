export interface IVPSHealthStatus {
  id: string;
  isOperational: boolean;
  load: number;
}

export interface IVPSState {
  id: string;
  status: 'healthy' | 'warning' | 'critical' | 'unknown';
  cpuUsage: number;
  memoryUsage: number;
  diskUsage: number;
  uptime: number;
  lastUpdate: Date;
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

export enum ActionPriority {
  LOW = 0,
  MEDIUM = 1,
  HIGH = 2,
  CRITICAL = 3
}

export enum SystemSubsystem {
  KERNEL = 'kernel',
  RESOURCES = 'resources',
  MEMORY = 'memory',
  STORAGE = 'storage',
  SERVICES = 'services',
  SECURITY = 'security',
  NETWORKING = 'networking'
}

export interface IAutonomousAction {
  id?: string;
  type: string;
  priority: ActionPriority;
  target?: string;
  targetId?: string;
  subsystem: SystemSubsystem;
  description?: string;
  reason?: string;
  timestamp?: Date;
}

export interface IVPSService {
  id: string;
  status: string;
  heartbeat: number;
  load: number;
  getState(): Promise<IVPSState>;
  executeAction(action: IAutonomousAction): Promise<void>;
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
