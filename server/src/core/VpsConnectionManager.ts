/**
 * @file server/src/core/VpsConnectionManager.ts
 * @description SOVEREIGN AAAA+ COMPILER - SSH Migration. 
 * MANDATE: O(1) Complexity, KappaPos Integer Determinism, SSH2 Protocol.
 * WAKE-UP SHIELD: Integrated Cost-Brake (Max 5 Reconnects), Non-Blocking Lock.
 * FIXES: Latency Integer Math, Resource Leakage (conn.end), Race-Conditions.
 */

import { Client } from 'ssh2';

export interface VpsState {
    logicalIndex: number; 
    isConnected: boolean;
    isConnecting: boolean;
    latencyMs: number;
    lastHeartbeatTick: number;
    probeStartTick: number; // For deterministic latency measurement
    integrityLevel: number; // 0-10000 (kappaPos)
    reconnectAttempts: number;
}

export interface BridgeConfig {
    vpsIp: string;
    sshUser: string;
    sshKey: string; 
    targetTickRate: number; // 10Hz = 100ms
}

export class VpsConnectionManager {
    private static readonly KAPPA_MAX = 10000;
    private static readonly RECONNECT_LIMIT = 5;
    private static readonly TICK_MS = 100;
    
    private readonly config: BridgeConfig = {
        vpsIp: "46.202.154.25",
        sshUser: "root",
        sshKey: process.env.SSH_BRIDGE_KEY || "UNSET_SOVEREIGN_KEY",
        targetTickRate: 10
    };

    private state: VpsState = {
        logicalIndex: 4620215425,
        isConnected: false,
        isConnecting: false,
        latencyMs: 0,
        lastHeartbeatTick: 0,
        probeStartTick: 0,
        integrityLevel: 10000,
        reconnectAttempts: 0
    };

    private currentGlobalTick: number = 0;

    /**
     * CORE TICK (10Hz)
     * Deterministic integer scaling. Strictly no floats.
     */
    public tick(currentTick: number): void {
        this.currentGlobalTick = currentTick;
        const kappaScaling = ((currentTick % VpsConnectionManager.KAPPA_MAX) * (this.state.logicalIndex % 1000)) % VpsConnectionManager.KAPPA_MAX;
        
        // AUTO-FIX TRIGGER: Low integrity or disconnected, if not already trying
        if ((this.state.integrityLevel < 5000 || !this.state.isConnected) && !this.state.isConnecting) {
            this.executeSshAutoFix(kappaScaling, currentTick);
        }

        // PERIODIC PROBE: Every 1 second (10 ticks)
        if (currentTick % 10 === 0 && !this.state.isConnecting) {
            this.probeSshBridge(currentTick);
        }
    }

    /**
     * KAPPA-POS PLEXITY METRIC (Stateless Integer Math)
     * Logic: 45% Connectivity, 35% Integrity, 20% Latency Impact.
     */
    public calculatePlexity(): number {
        const typeWeight = this.state.isConnected ? 4500 : 0;
        const hpWeight = ((this.state.integrityLevel * 3500) / VpsConnectionManager.KAPPA_MAX) | 0;
        
        // Latency Weight: Inverse scaling, max 1000ms floor. Integer division only.
        const latRef = (1000 - Math.min(1000, this.state.latencyMs)) | 0;
        const resonanceWeight = ((latRef * 2000) / 1000) | 0;
        
        return (typeWeight + hpWeight + resonanceWeight) | 0;
    }

    /**
     * SSH-BASED PROBE
     * Enforces resource cleanup and tick-based latency.
     */
    private probeSshBridge(tick: number): void {
        if (this.state.isConnecting) return;
        
        this.state.isConnecting = true;
        this.state.probeStartTick = tick;
        const conn = new Client();
        
        conn.on('ready', () => {
            conn.exec('uptime', (err, stream) => {
                if (err) {
                    this.handleFailure(conn);
                    return;
                }
                stream.on('close', () => {
                    // Latency calculated via tick difference to maintain integer flow
                    const endTick = this.currentGlobalTick;
                    const delta = (endTick - this.state.probeStartTick) | 0;
                    this.state.latencyMs = (delta * VpsConnectionManager.TICK_MS) | 0;
                    
                    this.state.isConnected = true;
                    this.state.isConnecting = false;
                    this.state.lastHeartbeatTick = endTick;
                    
                    // Integrity recovery scaled by latency (Jitter-aware)
                    const recovery = (500 - (this.state.latencyMs / 20)) | 0;
                    this.state.integrityLevel = Math.min(VpsConnectionManager.KAPPA_MAX, (this.state.integrityLevel + Math.max(100, recovery)) | 0);
                    
                    this.state.reconnectAttempts = 0; 
                    conn.end();
                }).on('data', () => {});
            });
        }).on('error', () => {
            this.handleFailure(conn);
        }).connect({
            host: this.config.vpsIp,
            port: 22,
            username: this.config.sshUser,
            privateKey: this.config.sshKey,
            readyTimeout: 3000
        });
    }

    /**
     * SHARED FAILURE HANDLER
     * Ensures resource cleanup and integrity penalty.
     */
    private handleFailure(conn?: Client): void {
        if (conn) {
            conn.destroy(); // Immediate socket termination
        }
        this.state.isConnected = false;
        this.state.isConnecting = false;
        this.state.integrityLevel = Math.max(0, (this.state.integrityLevel - 1500) | 0);
    }

    /**
     * AUTO-FIX: WakeUpShield Enforcement with Non-Blocking Lock
     */
    private executeSshAutoFix(kappa: number, tick: number): void {
        if (this.state.reconnectAttempts >= VpsConnectionManager.RECONNECT_LIMIT) {
            this.state.integrityLevel = 100; // Locked state
            return;
        }

        this.state.isConnecting = true;
        this.state.reconnectAttempts = (this.state.reconnectAttempts + 1) | 0;
        const conn = new Client();
        
        conn.on('ready', () => {
            const cmd = `echo "ARE_FIX_${kappa}" > /tmp/bridge_status && systemctl restart vps-bridge`;
            conn.exec(cmd, (err, stream) => {
                if (err) {
                    this.handleFailure(conn);
                    return;
                }
                stream.on('close', () => {
                    this.state.isConnecting = false;
                    this.state.isConnected = true;
                    this.state.reconnectAttempts = 0; 
                    this.state.lastHeartbeatTick = this.currentGlobalTick;
                    conn.end();
                }).on('data', () => {});
            });
        }).on('error', () => {
            this.handleFailure(conn);
        }).connect({
            host: this.config.vpsIp,
            port: 22,
            username: this.config.sshUser,
            privateKey: this.config.sshKey,
            readyTimeout: 4000
        });
    }

    public getStatus() {
        return {
            idx: this.state.logicalIndex,
            active: this.state.isConnected,
            integrity: this.state.integrityLevel,
            plexity: this.calculatePlexity(),
            vps: this.config.vpsIp,
            retry: this.state.reconnectAttempts,
            lat: this.state.latencyMs
        };
    }
}

/**
 * VALIDATION TEST SCRIPT
 * Deterministic non-blocking check.
 */
export async function validateVpsConnectivity(): Promise<boolean> {
    const manager = new VpsConnectionManager();
    let virtualTick = 0;

    return new Promise((resolve) => {
        const timeout = setTimeout(() => {
            resolve(false);
        }, 15000);

        const runner = setInterval(() => {
            virtualTick = (virtualTick + 1) | 0;
            manager.tick(virtualTick);
            
            const status = manager.getStatus();
            if (status.active && status.integrity > 8000) {
                clearInterval(runner);
                clearTimeout(timeout);
                resolve(true);
            }
            
            if (virtualTick > 140) { // Max 14 seconds simulation
                clearInterval(runner);
                resolve(false);
            }
        }, 100);
    });
}

export const vpsManager = new VpsConnectionManager();