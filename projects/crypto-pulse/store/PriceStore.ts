interface MarketPriceShiftEvent extends CustomEvent {
    detail: {
        asset: string;
        shift: number;
    };
}

export type PriceData = Record<string, number>;
type Listener = (prices: PriceData) => void;

class PriceStore {
    private prices: PriceData = {
        'BTC': 65000,
        'ETH': 3500,
        'SOL': 140,
        'DOT': 7,
        'ADA': 0.45
    };

    private listeners: Set<Listener> = new Set();

    constructor() {
        this.initEventListener();
    }

    private initEventListener(): void {
        if (typeof window !== 'undefined') {
            window.addEventListener('market_price_shift', (event: Event) => {
                const customEvent = event as MarketPriceShiftEvent;
                const { asset, shift } = customEvent.detail;
                this.updatePrice(asset, shift);
            });
        }
    }

    private updatePrice(asset: string, shift: number): void {
        if (this.prices.hasOwnProperty(asset)) {
            this.prices[asset] = parseFloat((this.prices[asset] + shift).toFixed(2));
            this.notify();
        }
    }

    public getPrices(): PriceData {
        return { ...this.prices };
    }

    public subscribe(listener: Listener): () => void {
        this.listeners.add(listener);
        listener(this.getPrices());
        return () => {
            this.listeners.delete(listener);
        };
    }

    private notify(): void {
        const currentPrices = this.getPrices();
        this.listeners.forEach(listener => listener(currentPrices));
    }
}

export const priceStore = new PriceStore();