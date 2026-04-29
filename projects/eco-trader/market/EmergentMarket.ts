export interface ResourceData {
    id: string;
    name: string;
    quantity: number;
    maxCapacity: number;
    basePrice: number;
}

export interface TradeTransaction {
    resourceId: string;
    amount: number;
    type: 'BUY' | 'SELL';
}

export class EmergentMarket {
    private resources: Map<string, ResourceData>;

    constructor(initialResources: ResourceData[]) {
        this.resources = new Map();
        initialResources.forEach(res => {
            this.resources.set(res.id, { ...res });
        });
    }

    public updateStocksAtClose(transactions: TradeTransaction[]): void {
        transactions.forEach(tx => {
            const resource = this.resources.get(tx.resourceId);
            if (resource) {
                if (tx.type === 'BUY') {
                    resource.quantity = Math.max(0, resource.quantity - tx.amount);
                } else {
                    resource.quantity = Math.min(resource.maxCapacity, resource.quantity + tx.amount);
                }
            }
        });
    }

    public calculateSaturation(resourceId: string): number {
        const resource = this.resources.get(resourceId);
        if (!resource || resource.maxCapacity === 0) {
            return 0;
        }
        return resource.quantity / resource.maxCapacity;
    }

    public getPrice(resourceId: string): number {
        const resource = this.resources.get(resourceId);
        if (!resource) return 0;

        const saturation = this.calculateSaturation(resourceId);
        const supplyModifier = 1.5 - saturation;
        
        return Math.max(0.1, resource.basePrice * supplyModifier);
    }

    public getResourceState(resourceId: string): ResourceData | undefined {
        const res = this.resources.get(resourceId);
        return res ? { ...res } : undefined;
    }

    public getMarketOverview(): ResourceData[] {
        return Array.from(this.resources.values()).map(res => ({ ...res }));
    }

    public applyNaturalRegeneration(resourceId: string, amount: number): void {
        const resource = this.resources.get(resourceId);
        if (resource) {
            resource.quantity = Math.min(resource.maxCapacity, resource.quantity + amount);
        }
    }
}