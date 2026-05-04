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