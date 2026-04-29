export enum ScarcityType {
    STRIKE = 'STRIKE',
    RESOURCE_SHORTAGE = 'RESOURCE_SHORTAGE',
    NATURAL_DISASTER = 'NATURAL_DISASTER',
    LOGISTICS_FAILURE = 'LOGISTICS_FAILURE',
    POLITICAL_UNREST = 'POLITICAL_UNREST'
}

export interface ScarcityEvent {
    id: string;
    type: ScarcityType;
    resourceId: string;
    multiplier: number;
    duration: number;
    remainingDuration: number;
    description: string;
}

export class ScarcityEvents {
    private activeEvents: ScarcityEvent[] = [];
    private readonly baseProbability: number = 0.05;

    constructor() {}

    public update(): void {
        this.activeEvents.forEach(event => {
            event.remainingDuration--;
        });

        this.activeEvents = this.activeEvents.filter(event => event.remainingDuration > 0);
    }

    public generateRandomEvent(availableResourceIds: string[]): ScarcityEvent | null {
        if (Math.random() > this.baseProbability) {
            return null;
        }

        const resourceId = availableResourceIds[Math.floor(Math.random() * availableResourceIds.length)];
        const type = this.getRandomType();
        const multiplier = 1.5 + Math.random() * 2.5; 
        const duration = 5 + Math.floor(Math.random() * 15);

        const newEvent: ScarcityEvent = {
            id: Math.random().toString(36).substr(2, 9),
            type: type,
            resourceId: resourceId,
            multiplier: multiplier,
            duration: duration,
            remainingDuration: duration,
            description: this.generateDescription(type, resourceId)
        };

        this.activeEvents.push(newEvent);
        return newEvent;
    }

    public triggerThresholdScarcity(resourceId: string, intensity: number): void {
        const event: ScarcityEvent = {
            id: 'threshold-' + Date.now(),
            type: ScarcityType.RESOURCE_SHORTAGE,
            resourceId: resourceId,
            multiplier: 1 + intensity,
            duration: 10,
            remainingDuration: 10,
            description: `Kritischer Mangel an ${resourceId} festgestellt.`
        };
        this.activeEvents.push(event);
    }

    public getPriceMultiplier(resourceId: string): number {
        let totalMultiplier = 1.0;
        const relevantEvents = this.activeEvents.filter(e => e.resourceId === resourceId);
        
        relevantEvents.forEach(e => {
            totalMultiplier *= e.multiplier;
        });

        return totalMultiplier;
    }

    public getActiveEvents(): ScarcityEvent[] {
        return [...this.activeEvents];
    }

    private getRandomType(): ScarcityType {
        const types = Object.values(ScarcityType);
        return types[Math.floor(Math.random() * types.length)];
    }

    private generateDescription(type: ScarcityType, resourceId: string): string {
        switch (type) {
            case ScarcityType.STRIKE:
                return `Arbeiterstreik in der Produktion von ${resourceId}.`;
            case ScarcityType.RESOURCE_SHORTAGE:
                return `Unerwarteter Rohstoffmangel bei ${resourceId}.`;
            case ScarcityType.NATURAL_DISASTER:
                return `Naturkatastrophe beeinträchtigt Gewinnung von ${resourceId}.`;
            case ScarcityType.LOGISTICS_FAILURE:
                return `Lieferkettenunterbrechung für ${resourceId}.`;
            case ScarcityType.POLITICAL_UNREST:
                return `Politische Unruhen destabilisieren den Markt für ${resourceId}.`;
            default:
                return `Unvorhergesehenes Ereignis bei ${resourceId}.`;
        }
    }
}