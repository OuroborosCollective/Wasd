type EventCallback = (payload?: any) => void;

class EventEmitter {
    private listeners: Map<string, EventCallback[]>;

    constructor() {
        this.listeners = new Map();
    }

    public subscribe(event: string, callback: EventCallback): () => void {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, []);
        }
        
        const eventListeners = this.listeners.get(event);
        if (eventListeners) {
            eventListeners.push(callback);
        }

        return () => this.unsubscribe(event, callback);
    }

    public unsubscribe(event: string, callback: EventCallback): void {
        const eventListeners = this.listeners.get(event);
        if (eventListeners) {
            this.listeners.set(
                event,
                eventListeners.filter((cb) => cb !== callback)
            );
        }
    }

    public emitWorldEvent(event: string, data?: any): void {
        const eventListeners = this.listeners.get(event);
        if (eventListeners) {
            eventListeners.forEach((callback) => {
                try {
                    callback(data);
                } catch (error) {
                    console.error(`Error in event listener for ${event}:`, error);
                }
            });
        }
    }
}

const worldEvents = new EventEmitter();
export default worldEvents;