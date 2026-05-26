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
  items: InventoryItem[];
  equippedWeaponId?: string | null;
  onEquipWeapon: (item: InventoryItem) => void;
};

function tone(item: InventoryItem): string {
  return item.rarity ? `rarity-${item.rarity.toLowerCase()}` : "rarity-common";
}

function initials(item: InventoryItem): string {
  const text = item.weaponClass ?? item.type ?? item.name;
  return text.slice(0, 2).toUpperCase();
}

export function InventoryPanel({ items, equippedWeaponId, onEquipWeapon }: InventoryPanelProps) {
  const gear = items.filter((item) => item.type === "weapon" || Boolean(item.weaponVisualId));
  const other = items.filter((item) => !gear.includes(item));

  return (
    <div className="inventory-panel" aria-label="Inventory">
      <section className="inventory-section">
        <header><b>Gear</b><small>{gear.length} synced</small></header>
        {gear.length === 0 ? <p className="inventory-empty">No synced gear yet.</p> : (
          <div className="inventory-grid" role="list">
            {gear.map((item) => {
              const active = Boolean(item.weaponVisualId && item.weaponVisualId === equippedWeaponId);
              return (
                <button key={item.itemId} type="button" className={active ? `inventory-item equipped ${tone(item)}` : `inventory-item ${tone(item)}`} onClick={() => onEquipWeapon(item)} role="listitem" aria-pressed={active}>
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
