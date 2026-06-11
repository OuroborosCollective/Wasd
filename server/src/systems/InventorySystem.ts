export interface InventoryItemDefinition {
  id: string;
  name: string;
  stackable: boolean;
  maxStack: number;
  type?: string;
  rarity?: string;
  tags?: readonly string[];
}

export interface InventoryStack {
  itemId: string;
  amount: number;
}

export interface InventorySnapshot {
  playerId: string;
  stacks: InventoryStack[];
}

export interface InventoryMutationResult {
  ok: boolean;
  reason?: string;
  snapshot: InventorySnapshot;
}

export class InventorySystem {
  private readonly items = new Map<string, InventoryItemDefinition>();
  private readonly inventories = new Map<string, Map<string, number>>();

  constructor(initialItems: InventoryItemDefinition[] = []) {
    for (const item of initialItems) {
      this.registerItem(item);
    }
  }

  public registerItem(item: InventoryItemDefinition): void {
    this.assertValidItemDefinition(item);

    this.items.set(item.id, {
      ...item,
      tags: item.tags ? [...item.tags].sort() : [],
    });
  }

  public registerItems(items: InventoryItemDefinition[]): void {
    for (const item of items) {
      this.registerItem(item);
    }
  }

  public getItem(id: string): InventoryItemDefinition | null {
    const item = this.items.get(id);
    return item ? { ...item, tags: item.tags ? [...item.tags] : [] } : null;
  }

  public getKnownItems(): InventoryItemDefinition[] {
    return [...this.items.values()]
      .sort((a, b) => a.id.localeCompare(b.id))
      .map((item) => ({
        ...item,
        tags: item.tags ? [...item.tags] : [],
      }));
  }

  public async hasItem(
    playerId: string,
    itemId: string,
    amount: number,
  ): Promise<boolean> {
    return this.hasItemSync(playerId, itemId, amount);
  }

  public hasItemSync(playerId: string, itemId: string, amount: number): boolean {
    this.assertPlayerId(playerId);
    this.assertItemId(itemId);
    this.assertPositiveAmount(amount);

    const inventory = this.inventories.get(playerId);
    if (!inventory) return false;

    return (inventory.get(itemId) ?? 0) >= amount;
  }

  public getAmount(playerId: string, itemId: string): number {
    this.assertPlayerId(playerId);
    this.assertItemId(itemId);

    return this.inventories.get(playerId)?.get(itemId) ?? 0;
  }

  public addItem(
    playerId: string,
    itemId: string,
    amount = 1,
  ): InventoryMutationResult {
    this.assertPlayerId(playerId);
    this.assertItemId(itemId);
    this.assertPositiveAmount(amount);

    const definition = this.items.get(itemId);
    if (!definition) {
      return this.fail(playerId, "ITEM_NOT_REGISTERED");
    }

    const inventory = this.getOrCreateInventory(playerId);
    const currentAmount = inventory.get(itemId) ?? 0;

    if (!definition.stackable && currentAmount + amount > 1) {
      return this.fail(playerId, "ITEM_NOT_STACKABLE");
    }

    if (definition.stackable && currentAmount + amount > definition.maxStack) {
      return this.fail(playerId, "STACK_LIMIT_EXCEEDED");
    }

    inventory.set(itemId, currentAmount + amount);

    return {
      ok: true,
      snapshot: this.snapshot(playerId),
    };
  }

  public removeItem(
    playerId: string,
    itemId: string,
    amount = 1,
  ): InventoryMutationResult {
    this.assertPlayerId(playerId);
    this.assertItemId(itemId);
    this.assertPositiveAmount(amount);

    const inventory = this.inventories.get(playerId);
    if (!inventory) {
      return this.fail(playerId, "INVENTORY_NOT_FOUND");
    }

    const currentAmount = inventory.get(itemId) ?? 0;

    if (currentAmount < amount) {
      return this.fail(playerId, "INSUFFICIENT_ITEM_AMOUNT");
    }

    const nextAmount = currentAmount - amount;

    if (nextAmount <= 0) {
      inventory.delete(itemId);
    } else {
      inventory.set(itemId, nextAmount);
    }

    if (inventory.size === 0) {
      this.inventories.delete(playerId);
    }

    return {
      ok: true,
      snapshot: this.snapshot(playerId),
    };
  }

  public transferItem(
    fromPlayerId: string,
    toPlayerId: string,
    itemId: string,
    amount = 1,
  ): InventoryMutationResult {
    this.assertPlayerId(fromPlayerId);
    this.assertPlayerId(toPlayerId);
    this.assertItemId(itemId);
    this.assertPositiveAmount(amount);

    if (fromPlayerId === toPlayerId) {
      return this.fail(fromPlayerId, "CANNOT_TRANSFER_TO_SELF");
    }

    if (!this.hasItemSync(fromPlayerId, itemId, amount)) {
      return this.fail(fromPlayerId, "INSUFFICIENT_ITEM_AMOUNT");
    }

    const addPreview = this.canAddItem(toPlayerId, itemId, amount);
    if (!addPreview.ok) {
      return this.fail(fromPlayerId, addPreview.reason ?? "TARGET_CANNOT_RECEIVE_ITEM");
    }

    this.removeItem(fromPlayerId, itemId, amount);
    this.addItem(toPlayerId, itemId, amount);

    return {
      ok: true,
      snapshot: this.snapshot(fromPlayerId),
    };
  }

  public canAddItem(
    playerId: string,
    itemId: string,
    amount = 1,
  ): { ok: boolean; reason?: string } {
    this.assertPlayerId(playerId);
    this.assertItemId(itemId);
    this.assertPositiveAmount(amount);

    const definition = this.items.get(itemId);
    if (!definition) {
      return { ok: false, reason: "ITEM_NOT_REGISTERED" };
    }

    const inventory = this.inventories.get(playerId);
    const currentAmount = inventory?.get(itemId) ?? 0;

    if (!definition.stackable && currentAmount + amount > 1) {
      return { ok: false, reason: "ITEM_NOT_STACKABLE" };
    }

    if (definition.stackable && currentAmount + amount > definition.maxStack) {
      return { ok: false, reason: "STACK_LIMIT_EXCEEDED" };
    }

    return { ok: true };
  }

  public clearInventory(playerId: string): InventorySnapshot {
    this.assertPlayerId(playerId);
    this.inventories.delete(playerId);
    return this.snapshot(playerId);
  }

  public snapshot(playerId: string): InventorySnapshot {
    this.assertPlayerId(playerId);

    const inventory = this.inventories.get(playerId);

    return {
      playerId,
      stacks: inventory
        ? [...inventory.entries()]
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([itemId, amount]) => ({ itemId, amount }))
        : [],
    };
  }

  public hydrate(snapshot: InventorySnapshot): void {
    this.assertPlayerId(snapshot.playerId);

    const nextInventory = new Map<string, number>();

    for (const stack of snapshot.stacks) {
      this.assertItemId(stack.itemId);
      this.assertPositiveAmount(stack.amount);

      if (!this.items.has(stack.itemId)) {
        throw new Error(`UNKNOWN_ITEM_IN_SNAPSHOT:${stack.itemId}`);
      }

      const previous = nextInventory.get(stack.itemId) ?? 0;
      nextInventory.set(stack.itemId, previous + stack.amount);
    }

    const normalized = [...nextInventory.entries()].sort(([a], [b]) =>
      a.localeCompare(b),
    );

    this.inventories.set(snapshot.playerId, new Map(normalized));
  }

  private getOrCreateInventory(playerId: string): Map<string, number> {
    let inventory = this.inventories.get(playerId);

    if (!inventory) {
      inventory = new Map<string, number>();
      this.inventories.set(playerId, inventory);
    }

    return inventory;
  }

  private fail(playerId: string, reason: string): InventoryMutationResult {
    return {
      ok: false,
      reason,
      snapshot: this.snapshot(playerId),
    };
  }

  private assertValidItemDefinition(item: InventoryItemDefinition): void {
    this.assertItemId(item.id);

    if (!item.name || typeof item.name !== "string") {
      throw new Error("INVALID_ITEM_NAME");
    }

    if (!Number.isInteger(item.maxStack) || item.maxStack < 1) {
      throw new Error("INVALID_ITEM_MAX_STACK");
    }

    if (!item.stackable && item.maxStack !== 1) {
      throw new Error("NON_STACKABLE_ITEM_MUST_HAVE_MAX_STACK_1");
    }
  }

  private assertPlayerId(playerId: string): void {
    if (!playerId || typeof playerId !== "string") {
      throw new Error("INVALID_PLAYER_ID");
    }
  }

  private assertItemId(itemId: string): void {
    if (!itemId || typeof itemId !== "string") {
      throw new Error("INVALID_ITEM_ID");
    }
  }

  private assertPositiveAmount(amount: number): void {
    if (!Number.isInteger(amount) || amount <= 0) {
      throw new Error("INVALID_ITEM_AMOUNT");
    }
  }
        }
