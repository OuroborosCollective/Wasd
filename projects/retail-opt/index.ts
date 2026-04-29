export class Perception {
    private beacons: Map<string, { position: { x: number; y: number }; confidence: number; timestamp: number }> = new Map();

    /**
     * Places or updates an echo beacon for tracking objects within the retail environment.
     * @param id Unique identifier for the tracked item.
     * @param position Coordinates of the item.
     * @param confidence Detection confidence level (0.0 - 1.0).
     * @param timestamp System timestamp of the detection.
     */
    public placeEchoBeacon(id: string, position: { x: number; y: number }, confidence: number, timestamp: number): void {
        this.beacons.set(id, { position, confidence, timestamp });
        console.log(`[Perception] EchoBeacon updated: ${id} at [${position.x}, ${position.y}] (Conf: ${confidence}, TS: ${timestamp})`);
    }

    /**
     * Retrieves the current state of a specific beacon.
     */
    public getBeaconState(id: string) {
        return this.beacons.get(id);
    }

    /**
     * Returns all active beacons.
     */
    public getAllBeacons() {
        return Array.from(this.beacons.entries());
    }
}

// Instantiate the module
export const retailPerception = new Perception();

// Initialization Demonstration
retailPerception.placeEchoBeacon('sale_item_42', { x: 50, y: 50 }, 0.95, 90000);