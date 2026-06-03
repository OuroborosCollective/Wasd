import { useEffect, useState } from "react";

export type InventoryItem = {
  itemId: string;
  name: string;
  type: string;
  weaponVisualId?: string | null;
  weaponClass?: string | null;
  rarity?: string | null;
  quantity?: number | null;
};

type InventoryPanelProps = {
  items?: InventoryItem[];
  equippedWeaponId?: string | null;
  onEquipWeapon?: (item: InventoryItem) => void;
};

function normalizeItem(raw: any, index: number): InventoryItem | null {
  if (!raw) return null;
  const itemId = String(raw.itemId ?? raw.id ?? raw.uid ?? `item-${index}`);
  const weaponVisualId = raw.weaponVisualId ?? raw.visualId ?? raw.equippedWeaponId ?? null;
  const type = String(raw.type ?? raw.kind ?? (weaponVisualId ? "weapon" : "item"));
  return {
    itemId,
    name: String(raw.name ?? raw.label ?? weaponVisualId ?? itemId),
    type,
    weaponVisualId,
    weaponClass: raw.weaponClass ?? raw.class ?? null,
    rarity: raw.rarity ?? null,
    quantity: Number.isFinite(Number(raw.quantity)) ? Number(raw.quantity) : null,
  };
}

function normalizeInventory(payload: any): InventoryItem[] {
  const source = payload?.self?.inventory ?? payload?.player?.inventory ?? payload?.inventory ?? payload?.items ?? [];
  const array = Array.isArray(source) ? source : Object.values(source ?? {});
  return array.map(normalizeItem).filter(Boolean) as InventoryItem[];
}

function tone(item: InventoryItem): string {
  return item.rarity ? `rarity-${item.rarity.toLowerCase()}` : "rarity-common";
}

function initials(item: InventoryItem): string {
  const text = item.weaponClass ?? item.type ?? item.name;
  return text.slice(0, 2).toUpperCase();
}

export function InventoryPanel({ items, equippedWeaponId, onEquipWeapon }: InventoryPanelProps) {
  const [syncedItems, setSyncedItems] = useState<InventoryItem[]>(items ?? []);

  useEffect(() => {
    if (items) setSyncedItems(items);
  }, [items]);

  useEffect(() => {
    function handleHeartbeat(event: Event) {
      const payload = (event as CustomEvent).detail?.payload;
      const next = normalizeInventory(payload);
      if (next.length > 0) setSyncedItems(next);
    }
    window.addEventListener("areloria:WORLD_HEARTBEAT", handleHeartbeat);
    return () => window.removeEventListener("areloria:WORLD_HEARTBEAT", handleHeartbeat);
  }, []);

  function equip(item: InventoryItem) {
    onEquipWeapon?.(item);
    window.__areloriaClient?.emit("intent:equip", {
      itemId: item.itemId,
      weaponVisualId: item.weaponVisualId ?? null,
    });
  }

  const gear = syncedItems.filter((item) => item.type === "weapon" || Boolean(item.weaponVisualId));
  const other = syncedItems.filter((item) => !gear.includes(item));

  return (
    <div className="inventory-panel" aria-label="Inventory">
      <section className="inventory-section">
        <header><b>Gear</b><small>{gear.length} synced</small></header>
        {gear.length === 0 ? <p className="inventory-empty">No gear synced yet.</p> : (
          <div className="inventory-grid" role="list">
            {gear.map((item) => {
              const active = Boolean(item.weaponVisualId && item.weaponVisualId === equippedWeaponId);
              return (
                <button key={item.itemId} type="button" className={active ? `inventory-item equipped ${tone(item)}` : `inventory-item ${tone(item)}`} onClick={() => equip(item)} role="listitem" aria-pressed={active}>
                  <span className="inventory-icon">{initials(item)}</span>
                  <span className="inventory-meta"><b>{item.name}</b><small>{item.rarity ?? "common"} · {item.weaponClass ?? item.type}</small></span>
                  {active && <i>equipped</i>}
                </button>
              );
            })}
          </div>
        )}
      </section>
      <section className="inventory-section compact">
        <header><b>Items</b><small>{other.length} entries</small></header>
        {other.length === 0 ? <p className="inventory-empty">No other synced items.</p> : (
          <ul className="inventory-list">
            {other.map((item) => <li key={item.itemId}><span>{item.name}</span><small>{item.quantity && item.quantity > 1 ? `x${item.quantity}` : item.type}</small></li>)}
          </ul>
        )}
      </section>
    </div>
  );
}
