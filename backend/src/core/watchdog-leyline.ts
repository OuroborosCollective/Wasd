import { WatchdogEmitter } from './watchdog-emitter.js';

export type LeylineNodeState =
  | 'STABLE'
  | 'UNSTABLE'
  | 'OVERLOAD'
  | 'OFFLINE'
  | 'UNKNOWN';

export type WatchdogSeverity =
  | 'INFO'
  | 'WARNING'
  | 'ERROR'
  | 'CRITICAL';

export interface LeylineMonitorOptions {
  emitterUrl?: string;
  cooldownMs?: number;
  origin?: string;
  surgeThreshold?: number;
}

export interface LeylineNode {
  id: string;
  state: LeylineNodeState;
  load?: number;
  region?: string;
}

export interface LeylineSurgePayload {
  message: string;
  eventKey: string;
  nodes: LeylineNode[];
  overloadedCount: number;
  totalCount: number;
  timestamp: number;
  region?: string;
}

/**
 * WatchdogLeylineMonitor
 *
 * Überwacht magische Netzwerk-Knoten / Leylines.
 *
 * Zweck:
 * - erkennt kritische Magie-Überlastung
 * - verhindert Event-Spam durch Cooldown
 * - sendet Recovery-Events, wenn sich das Netzwerk stabilisiert
 * - geeignet für deterministische 10Hz-WorldTick-Überwachung
 */
export class WatchdogLeylineMonitor {
  private readonly emitter: WatchdogEmitter;
  private readonly cooldownMs: number;
  private readonly origin: string;
  private readonly surgeThreshold: number;

  private lastSurgeAt = 0;
  private surgeActive = false;
  private lastEventKey: string | null = null;

  constructor(options: LeylineMonitorOptions = {}) {
    this.emitter = new WatchdogEmitter(options.emitterUrl ?? 'ws://localhost:9090');
    this.cooldownMs = options.cooldownMs ?? 5_000;
    this.origin = options.origin ?? 'LEYLINE_MONITOR';
    this.surgeThreshold = options.surgeThreshold ?? 2;
  }

  /**
   * Kompatibilitätsmethode für deinen bisherigen Code.
   * Prüft zwei benachbarte Nodes.
   */
  public monitorLeylineNetwork(
    nodeStateA: LeylineNodeState,
    nodeStateB: LeylineNodeState
  ): void {
    this.monitorNodes([
      { id: 'node_a', state: nodeStateA },
      { id: 'node_b', state: nodeStateB }
    ]);
  }

  /**
   * Erweiterte Überwachung für mehrere Leyline-Knoten.
   */
  public monitorNodes(nodes: LeylineNode[]): void {
    if (!Array.isArray(nodes) || nodes.length === 0) {
      this.emitSafe(
        'LEYLINE_MONITOR_INVALID_INPUT',
        {
          message: 'Leyline monitor received no nodes.',
          timestamp: Date.now()
        },
        'WARNING'
      );
      return;
    }

    const overloadedNodes = nodes.filter((node) => node.state === 'OVERLOAD');
    const overloadedCount = overloadedNodes.length;
    const isSurge = overloadedCount >= this.surgeThreshold;

    const eventKey = this.createEventKey(nodes);

    if (isSurge) {
      this.handleSurge(nodes, overloadedCount, eventKey);
      return;
    }

    if (this.surgeActive) {
      this.handleRecovery(nodes, overloadedCount, eventKey);
    }
  }

  /**
   * Für 10Hz-Tick-Systeme:
   * Kann direkt im WorldTick / WatchdogTick aufgerufen werden.
   */
  public tick(nodes: LeylineNode[]): void {
    this.monitorNodes(nodes);
  }

  private handleSurge(
    nodes: LeylineNode[],
    overloadedCount: number,
    eventKey: string
  ): void {
    const now = Date.now();
    const isSameEvent = this.lastEventKey === eventKey;
    const isCoolingDown = now - this.lastSurgeAt < this.cooldownMs;

    if (this.surgeActive && isSameEvent && isCoolingDown) {
      return;
    }

    this.surgeActive = true;
    this.lastSurgeAt = now;
    this.lastEventKey = eventKey;

    const payload: LeylineSurgePayload = {
      message: `Critical magic network overload detected. ${overloadedCount}/${nodes.length} leyline nodes are overloaded.`,
      eventKey,
      nodes,
      overloadedCount,
      totalCount: nodes.length,
      timestamp: now,
      region: this.resolveRegion(nodes)
    };

    this.emitSafe(
      'LEYLINE_SURGE',
      payload,
      'CRITICAL'
    );
  }

  private handleRecovery(
    nodes: LeylineNode[],
    overloadedCount: number,
    eventKey: string
  ): void {
    this.surgeActive = false;
    this.lastEventKey = eventKey;

    this.emitSafe(
      'LEYLINE_RECOVERY',
      {
        message: `Leyline network recovered. ${overloadedCount}/${nodes.length} nodes still overloaded.`,
        eventKey,
        nodes,
        overloadedCount,
        totalCount: nodes.length,
        timestamp: Date.now(),
        region: this.resolveRegion(nodes)
      },
      'INFO'
    );
  }

  private createEventKey(nodes: LeylineNode[]): string {
    return nodes
      .map((node) => `${node.id}:${node.state}`)
      .sort()
      .join('|');
  }

  private resolveRegion(nodes: LeylineNode[]): string | undefined {
    const regions = nodes
      .map((node) => node.region)
      .filter((region): region is string => Boolean(region));

    if (regions.length === 0) {
      return undefined;
    }

    const uniqueRegions = [...new Set(regions)];

    if (uniqueRegions.length === 1) {
      return uniqueRegions[0];
    }

    return uniqueRegions.join(',');
  }

  private emitSafe(
    type: string,
    payload: unknown,
    severity: WatchdogSeverity
  ): void {
    try {
      this.emitter.emit(
        type,
        payload,
        severity,
        this.origin
      );
    } catch (error) {
      console.error(`[${this.origin}] Failed to emit watchdog event:`, {
        type,
        severity,
        error
      });
    }
  }
}
