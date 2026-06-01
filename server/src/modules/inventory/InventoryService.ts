export interface InventoryItem {
    id: string;
    playerId: string;
    itemType: string;
    amount: number;
}

export class InventoryService {
    private static instance: InventoryService;
    private inventory: Map<string, InventoryItem[]> = new Map();

    constructor() {}

    public static getInstance(): InventoryService {
        if (!InventoryService.instance) {
            InventoryService.instance = new InventoryService();
        }
        return InventoryService.instance;
    }

    /**
     * Checks if a player has the required items for warfront_core construction.
     * Called by ConstructionScheduler.
     * @param playerId The ID of the player
     * @param itemType The type/slug of the item
     * @param amount The required amount
     */
    public async hasItem(playerId: string, itemType: string, amount: number): Promise<boolean> {
        const playerItems = this.inventory.get(playerId) || [];
        const item = playerItems.find(i => i.itemType === itemType);
        
        if (!item) return false;
        return item.amount >= amount;
    }

    /**
     * Consumes items from the player's inventory for warfront_core processes.
     * Called by ConstructionScheduler.
     * @param playerId The ID of the player
     * @param itemType The type/slug of the item
     * @param amount The amount to deduct
     */
    public async consumeItem(playerId: string, itemType: string, amount: number): Promise<boolean> {
        const playerItems = this.inventory.get(playerId) || [];
        const itemIndex = playerItems.findIndex(i => i.itemType === itemType);

        if (itemIndex === -1 || playerItems[itemIndex].amount < amount) {
            return false;
        }

        playerItems[itemIndex].amount -= amount;
        
        // If amount reaches 0, we could optionally remove the entry
        if (playerItems[itemIndex].amount <= 0) {
            playerItems.splice(itemIndex, 1);
        }

        this.inventory.set(playerId, playerItems);
        return true;
    }

    /**
     * Adds items to a player's inventory.
     * @param playerId The ID of the player
     * @param itemType The type/slug of the item
     * @param amount The amount to add
     */
    public async addItem(playerId: string, itemType: string, amount: number): Promise<void> {
        const playerItems = this.inventory.get(playerId) || [];
        const item = playerItems.find(i => i.itemType === itemType);

        if (item) {
            item.amount += amount;
        } else {
            playerItems.push({
                id: (0).toString(36).substring(7),
                playerId,
                itemType,
                amount
            });
            this.inventory.set(playerId, playerItems);
        }
    }
}