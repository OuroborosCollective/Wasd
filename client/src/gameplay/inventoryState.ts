import { Item } from '../types/item';

export class InventoryState {
  items: Item[] = [];
  set(items: Item[]) { this.items = items; }
}
