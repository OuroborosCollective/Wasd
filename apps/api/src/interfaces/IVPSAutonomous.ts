export enum ActionPriority {
  LOW = 0,
  MEDIUM = 1,
  HIGH = 2,
  CRITICAL = 3
}

export enum SystemSubsystem {
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
  status: string;
  heartbeat: number;
  load: number;
}

export interface IVPSState {
  metrics: {
    cpuUsage: number;
    ramUsage: number;
    diskUsage: number;
  };
  services: IVPSService[];
  security: {
    unauthorizedAccessAttempts: number;
  };
}

export interface IVPSHealthStatus {
  id: string;
  isOperational: boolean;
  load: number;
}

export interface IAutonomousAction {
  type: string;
  subsystem: SystemSubsystem;
  priority: ActionPriority;
  reason: string;
  targetId?: string;
}
