/**
 * PlotDestiller.ts - Web-Novel Engine (Story Generation)
 * 
 * Converts Ouroboros WorldHistory to distilled plot points.
 * Uses legendSpread to generate autonomous narrative strands.
 * Parses raw event data to iterative JSON tree for writer tools.
 * 
 * Features:
 * - WorldHistory to Plot-Points conversion
 * - Autonomous narrative strand generation
 * - Iterative JSON tree output
 * - Deterministic legend parsing
 */

import { EventEmitter } from 'events';

/** Raw event from WorldHistory */
export interface WorldEvent {
    id: string;
    timestamp: number;
    type: EventType;
    actor: string;
    action: string;
    target?: string;
    location?: string;
    metadata?: Record<string, any>;
}

/** Event types */
export enum EventType {
    Combat = 'combat',
    Dialogue = 'dialogue',
    Quest = 'quest',
    Discovery = 'discovery',
    Achievement = 'achievement',
    Social = 'social',
    Trade = 'trade',
    Location = 'location'
}

/** Legend from player action */
export interface PlayerLegend {
    id: string;
    playerId: string;
    title: string;
    description: string;
    legendSpread: number;
    resonanceFactor: number;
    originEra: string;
    events: WorldEvent[];
    createdAt: number;
    intensity: number;
}

/** Plot point in narrative */
export interface PlotPoint {
    id: string;
    originLegendId: string;
    title: string;
    description: string;
    narrativeImpact: number;
    priority: number;
    isKeyMoment: boolean;
    distillationDate: number;
    era: string;
    characters: string[];
    tags: string[];
}

/** Narrative strand */
export interface NarrativeStrand {
    id: string;
    title: string;
    theme: string;
    plotPoints: PlotPoint[];
    legendSpread: number;
    urgency: number;
    relatedLegends: string[];
}

/** JSON Tree Node for Writer Tools */
export interface NarrativeTreeNode {
    id: string;
    type: 'act' | 'chapter' | 'scene' | 'beat';
    title: string;
    summary: string;
    plotPoints: PlotPoint[];
    children: NarrativeTreeNode[];
    metadata: {
        depth: number;
        wordCount: number;
        keyMoments: number;
    };
}

/** Tree configuration */
export interface TreeConfig {
    maxDepth: number;
    minPriority: number;
    groupingMode: 'era' | 'theme' | 'priority';
}

/** Resonance factor for narrative */
export interface ResonanceFactor {
    coefficient: number;
    decay: number;
    amplitude: number;
}

/**
 * Main PlotDestiller class.
 * Converts WorldHistory to narrative tree.
 */
export class PlotDestiller extends EventEmitter {
    private legends: Map<string, PlayerLegend> = new Map();
    private plotPoints: Map<string, PlotPoint> = new Map();
    private config: TreeConfig;

    constructor(config?: Partial<TreeConfig>) {
        super();
        this.config = {
            maxDepth: config?.maxDepth || 4,
            minPriority: config?.minPriority || 0.3,
            groupingMode: config?.groupingMode || 'era'
        };
    }

    /**
     * Add raw world event.
     */
    public addEvent(event: WorldEvent): void {
        // Extract legend from event
        const legendId = this.extractLegendId(event);
        
        let legend = this.legends.get(legendId);
        if (!legend) {
            legend = this.createLegendFromEvent(event);
            this.legends.set(legendId, legend);
        }
        
        legend.events.push(event);
        this.emit('event_added', event);
    }

    /**
     * Add multiple events.
     */
    public addEvents(events: WorldEvent[]): void {
        for (const event of events) {
            this.addEvent(event);
        }
    }

    /**
     * Extract legend ID from event.
     */
    private extractLegendId(event: WorldEvent): string {
        return `legend_${event.actor}_${event.type}_${Math.floor(event.timestamp / 86400000)}`;
    }

    /**
     * Create legend from event.
     */
    private createLegendFromEvent(event: WorldEvent): PlayerLegend {
        return {
            id: this.extractLegendId(event),
            playerId: event.actor,
            title: this.generateTitle(event),
            description: this.generateDescription(event),
            legendSpread: this.calculateLegendSpread(event),
            resonanceFactor: this.calculateResonance(event),
            originEra: this.getEra(event.timestamp),
            events: [event],
            createdAt: event.timestamp,
            intensity: 0.5
        };
    }

    /**
     * Generate title from event.
     */
    private generateTitle(event: WorldEvent): string {
        const action = event.action || 'Unknown Action';
        const target = event.target ? ` with ${event.target}` : '';
        
        switch (event.type) {
            case EventType.Combat: return `Battle: ${action}${target}`;
            case EventType.Dialogue: return `Words: ${action}`;
            case EventType.Quest: return `Quest: ${action}`;
            case EventType.Discovery: return `Discovery: ${action}`;
            case EventType.Achievement: return `Achievement: ${action}`;
            case EventType.Social: return `Social: ${action}`;
            case EventType.Trade: return `Trade: ${action}`;
            default: return `${action}${target}`;
        }
    }

    /**
     * Generate description from event.
     */
    private generateDescription(event: WorldEvent): string {
        const parts = [
            `On this day, ${event.actor} performed ${event.action}`,
        ];
        
        if (event.target) {
            parts.push(` involving ${event.target}`);
        }
        
        if (event.location) {
            parts.push(` at ${event.location}`);
        }
        
        return parts.join('') + '.';
    }

    /**
     * Calculate legend spread.
     */
    private calculateLegendSpread(event: WorldEvent): number {
        const typeWeight: Record<EventType, number> = {
            [EventType.Combat]: 0.9,
            [EventType.Quest]: 0.8,
            [EventType.Discovery]: 0.85,
            [EventType.Achievement]: 0.95,
            [EventType.Dialogue]: 0.4,
            [EventType.Social]: 0.5,
            [EventType.Trade]: 0.3,
            [EventType.Location]: 0.2
        };
        
        return typeWeight[event.type] || 0.5;
    }

    /**
     * Calculate resonance factor.
     */
    private calculateResonance(event: WorldEvent): number {
        // Base resonance
        let resonance = 0.5;
        
        // Events with targets have higher resonance
        if (event.target) resonance += 0.2;
        
        // Combat and achievements have highest resonance
        if (event.type === EventType.Combat || event.type === EventType.Achievement) {
            resonance += 0.3;
        }
        
        return Math.min(1.0, resonance);
    }

    /**
     * Get era from timestamp.
     */
    private getEra(timestamp: number): string {
        const year = new Date(timestamp).getFullYear();
        
        if (year < 100) return 'Mythic Age';
        if (year < 500) return 'Age of Heroes';
        if (year < 1000) return 'Era of Kings';
        return 'Current Era';
    }

    /**
     * Distill all legends to plot points.
     */
    public distillAll(): PlotPoint[] {
        const points: PlotPoint[] = [];
        
        for (const legend of this.legends.values()) {
            const point = this.distillLegend(legend);
            this.plotPoints.set(point.id, point);
            points.push(point);
        }
        
        return points.sort((a, b) => b.priority - a.priority);
    }

    /**
     * Distill single legend to plot point.
     */
    public distillLegend(legend: PlayerLegend): PlotPoint {
        const narrativeImpact = this.calculateNarrativeImpact(legend);
        const priority = this.calculatePriority(legend);
        
        return {
            id: `plot_${legend.id}`,
            originLegendId: legend.id,
            title: legend.title,
            description: legend.description,
            narrativeImpact,
            priority,
            isKeyMoment: priority > 0.75,
            distillationDate: Date.now(),
            era: legend.originEra,
            characters: [legend.playerId, ...legend.events.map(e => e.target).filter(Boolean) as string[]],
            tags: [legend.events[0]?.type || 'unknown']
        };
    }

    /**
     * Calculate narrative impact.
     */
    private calculateNarrativeImpact(legend: PlayerLegend): number {
        const spreadWeight = 0.4;
        const resonanceWeight = 0.6;
        
        return (legend.legendSpread * spreadWeight) + (legend.resonanceFactor * resonanceWeight);
    }

    /**
     * Calculate priority.
     */
    private calculatePriority(legend: PlayerLegend): number {
        const base = legend.legendSpread * legend.resonanceFactor;
        const normalized = Math.pow(legend.resonanceFactor, 1.5);
        
        return Math.min(1.0, (base * 0.7) + (normalized * 0.3));
    }

    /**
     * Generate narrative strands from legends.
     */
    public generateStrands(): NarrativeStrand[] {
        const strands: Map<string, NarrativeStrand> = new Map();
        
        for (const legend of this.legends.values()) {
            const theme = this.extractTheme(legend);
            
            if (!strands.has(theme)) {
                strands.set(theme, {
                    id: `strand_${theme.toLowerCase().replace(/\s+/g, '-')}`,
                    title: `The ${theme} Saga`,
                    theme,
                    plotPoints: [],
                    legendSpread: 0,
                    urgency: 0,
                    relatedLegends: []
                });
            }
            
            const strand = strands.get(theme)!;
            const point = this.distillLegend(legend);
            strand.plotPoints.push(point);
            strand.legendSpread = Math.max(strand.legendSpread, legend.legendSpread);
            strand.urgency = Math.max(strand.urgency, point.priority);
            strand.relatedLegends.push(legend.id);
        }
        
        return Array.from(strands.values())
            .sort((a, b) => b.urgency - a.urgency);
    }

    /**
     * Extract theme from legend.
     */
    private extractTheme(legend: PlayerLegend): string {
        const type = legend.events[0]?.type;
        
        switch (type) {
            case EventType.Combat: return 'War';
            case EventType.Quest: return 'Adventure';
            case EventType.Discovery: return 'Mystery';
            case EventType.Achievement: return 'Triumph';
            case EventType.Dialogue: return 'Intrigue';
            case EventType.Social: return 'Alliance';
            case EventType.Trade: return 'Commerce';
            default: return 'General';
        }
    }

    /**
     * Generate iterative JSON tree for writer tools.
     */
    public generateTree(): NarrativeTreeNode {
        const points = this.distillAll();
        const strands = this.generateStrands();
        
        // Group by era or priority based on config
        const groups = this.groupPlotPoints(points);
        
        const root: NarrativeTreeNode = {
            id: 'root_narrative',
            type: 'act',
            title: 'The Ouroboros Chronicle',
            summary: `A tale of ${points.length} pivotal moments across ${strands.length} narrative strands.`,
            plotPoints: [],
            children: [],
            metadata: {
                depth: 0,
                wordCount: 0,
                keyMoments: 0
            }
        };
        
        // Build tree
        let actIndex = 1;
        for (const [groupKey, groupPoints] of groups) {
            const actNode = this.createActNode(groupKey, groupPoints, actIndex++);
            root.children.push(actNode);
            root.metadata.wordCount += actNode.metadata.wordCount;
            root.metadata.keyMoments += actNode.metadata.keyMoments;
        }
        
        this.emit('tree_generated', root);
        return root;
    }

    /**
     * Group plot points.
     */
    private groupPlotPoints(points: PlotPoint[]): Map<string, PlotPoint[]> {
        const groups: Map<string, PlotPoint[]> = new Map();
        
        for (const point of points) {
            const key = this.config.groupingMode === 'era' 
                ? point.era 
                : this.config.groupingMode === 'priority'
                    ? `Priority ${Math.floor(point.priority * 10) / 10}`
                    : point.tags[0] || 'General';
            
            if (!groups.has(key)) {
                groups.set(key, []);
            }
            groups.get(key)!.push(point);
        }
        
        return groups;
    }

    /**
     * Create act node.
     */
    private createActNode(title: string, points: PlotPoint[], index: number): NarrativeTreeNode {
        const chapters = this.createChapterNodes(points, index);
        
        return {
            id: `act_${index}`,
            type: 'act',
            title: `Act ${index}: ${title}`,
            summary: this.generateSummary(points),
            plotPoints: [],
            children: chapters,
            metadata: {
                depth: 1,
                wordCount: chapters.reduce((sum, c) => sum + c.metadata.wordCount, 0),
                keyMoments: chapters.reduce((sum, c) => sum + c.metadata.keyMoments, 0)
            }
        };
    }

    /**
     * Create chapter nodes.
     */
    private createChapterNodes(points: PlotPoint[], actIndex: number): NarrativeTreeNode[] {
        const chapters: NarrativeTreeNode[] = [];
        
        // Group points into chapters of 5
        for (let i = 0; i < points.length; i += 5) {
            const chapterPoints = points.slice(i, i + 5);
            const chapterIndex = Math.floor(i / 5) + 1;
            
            chapters.push({
                id: `chapter_${actIndex}_${chapterIndex}`,
                type: 'chapter',
                title: `Chapter ${actIndex}.${chapterIndex}`,
                summary: chapterPoints.map(p => p.title).join('; '),
                plotPoints: chapterPoints,
                children: chapterPoints.map(p => this.createBeatNode(p, chapterIndex)),
                metadata: {
                    depth: 2,
                    wordCount: chapterPoints.length * 500,
                    keyMoments: chapterPoints.filter(p => p.isKeyMoment).length
                }
            });
        }
        
        return chapters;
    }

    /**
     * Create beat node.
     */
    private createBeatNode(point: PlotPoint, chapterIndex: number): NarrativeTreeNode {
        return {
            id: `beat_${point.id}`,
            type: 'beat',
            title: point.title,
            summary: point.description,
            plotPoints: [point],
            children: [],
            metadata: {
                depth: 3,
                wordCount: 100,
                keyMoments: point.isKeyMoment ? 1 : 0
            }
        };
    }

    /**
     * Generate summary from points.
     */
    private generateSummary(points: PlotPoint[]): string {
        if (points.length === 0) return 'No events recorded.';
        
        const keyMoments = points.filter(p => p.isKeyMoment).length;
        const avgPriority = points.reduce((sum, p) => sum + p.priority, 0) / points.length;
        
        return `${points.length} moments, ${keyMoments} key moments, average priority ${avgPriority.toFixed(2)}.`;
    }

    /**
     * Export tree as JSON string.
     */
    public exportJSON(pretty: boolean = true): string {
        const tree = this.generateTree();
        return pretty ? JSON.stringify(tree, null, 2) : JSON.stringify(tree);
    }

    /**
     * Get plot points.
     */
    public getPlotPoints(): PlotPoint[] {
        return Array.from(this.plotPoints.values());
    }

    /**
     * Get legends.
     */
    public getLegends(): PlayerLegend[] {
        return Array.from(this.legends.values());
    }

    /**
     * Clear all data.
     */
    public clear(): void {
        this.legends.clear();
        this.plotPoints.clear();
    }
}

export default PlotDestiller;
export { EventType };
export type { WorldEvent, PlayerLegend, NarrativeStrand, NarrativeTreeNode, TreeConfig };