import { GeneratedItem } from './LootGenerator';

export interface DroppedLoot {
  id: string;
  item: GeneratedItem;
  position: { x: number; y: number; z: number };
  expiresAt: number; // Timestamp wann das Loot verschwindet
  ownerId?: string; // Optionaler Besitzer, der das Loot zuerst aufheben darf
}

export class LootDropSystem {
  private droppedItems: Map<string, DroppedLoot> = new Map();

  /**
   * Lässt Loot an einer bestimmten Position in der Welt fallen.
   * @param items Die zu droppenden Items.
   * @param position Die Weltkoordinaten, an denen das Loot fallen soll.
   * @param ownerId Optionaler Spieler, der das Loot zuerst aufheben darf.
   * @returns Eine Liste der IDs der gedroppten Items.
   */
  dropLoot(
    items: GeneratedItem[],
    position: { x: number; y: number; z: number },
    ownerId?: string
  ): string[] {
    const droppedItemIds: string[] = [];

    for (const item of items) {
      const dropId = `loot_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      const droppedLoot: DroppedLoot = {
        id: dropId,
        item,
        position,
        expiresAt: Date.now() + 5 * 60 * 1000, // Loot verschwindet nach 5 Minuten
        ownerId,
      };
      this.droppedItems.set(dropId, droppedLoot);
      droppedItemIds.push(dropId);
      console.log(`Loot dropped: ${item.baseItem.name} at (${position.x}, ${position.y}, ${position.z})`);
      // TODO: Event an Clients in der Nähe senden, um das Loot zu visualisieren
    }
    return droppedItemIds;
  }

  /**
   * Sammelt ein gedropptes Item auf.
   * @param dropId Die ID des gedroppten Items.
   * @param collectorId Die ID des Spielers, der das Item aufhebt.
   * @returns Das aufgesammelte Item oder null, wenn es nicht gefunden wurde oder der Besitzer nicht stimmt.
   */
  collectLoot(dropId: string, collectorId: string): GeneratedItem | null {
    const droppedLoot = this.droppedItems.get(dropId);

    if (!droppedLoot) {
      return null; // Item nicht gefunden
    }

    // Prüfen, ob der Sammler der Besitzer ist oder ob die Besitzzeit abgelaufen ist
    if (droppedLoot.ownerId && droppedLoot.ownerId !== collectorId && Date.now() < droppedLoot.expiresAt) {
      return null; // Nicht der Besitzer und Besitzzeit noch nicht abgelaufen
    }

    this.droppedItems.delete(dropId);
    console.log(`Loot collected: ${droppedLoot.item.baseItem.name} by ${collectorId}`);
    // TODO: Event an Clients senden, dass das Loot verschwunden ist
    return droppedLoot.item;
  }

  /**
   * Gibt alle aktuell gedroppten Items zurück.
   */
  getAllDroppedLoot(): DroppedLoot[] {
    // Entferne abgelaufene Items
    this.cleanupExpiredLoot();
    return Array.from(this.droppedItems.values());
  }

  /**
   * Entfernt abgelaufene Items aus der Liste.
   */
  private cleanupExpiredLoot(): void {
    const now = Date.now();
    for (const [id, loot] of this.droppedItems.entries()) {
      if (loot.expiresAt < now) {
        this.droppedItems.delete(id);
        console.log(`Loot expired and removed: ${loot.item.baseItem.name}`);
        // TODO: Event an Clients senden, dass das Loot verschwunden ist
      }
    }
  }

  /**
   * Gibt ein spezifisches gedropptes Item zurück.
   */
  getDroppedLoot(dropId: string): DroppedLoot | undefined {
    this.cleanupExpiredLoot(); // Sicherstellen, dass nur gültige Items zurückgegeben werden
    return this.droppedItems.get(dropId);
  }
}
