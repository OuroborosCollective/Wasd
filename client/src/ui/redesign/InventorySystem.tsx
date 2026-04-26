import React, { useState, useEffect, useMemo } from "react";
import { 
  getPlayerInventory, 
  getPlayerGearInventory,
  getPlayerGold, 
  subscribePlayerState 
} from "../../state/playerState";
import { sendEquipItem, sendUseItem, sendCommand } from "../../networking/websocketClient";
import "./InventorySystem.css";

type FilterType = "all" | "gear" | "consumables" | "quest" | "misc";

export const InventorySystem: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [items, setItems] = useState<any[]>(getPlayerInventory());
  const [gearItems, setGearItems] = useState<any[]>(getPlayerGearInventory());
  const [gold, setGold] = useState(getPlayerGold());
  const [filter, setFilter] = useState<FilterType>("all");

  useEffect(() => {
    return subscribePlayerState(() => {
      setItems(getPlayerInventory());
      setGearItems(getPlayerGearInventory());
      setGold(getPlayerGold());
    });
  }, []);

  const allDisplayItems = useMemo(() => {
    const combined = [...items];
    if (Array.isArray(gearItems)) {
        gearItems.forEach(g => {
            combined.push({ ...g, itemId: g.uid || g.id, isGear: true });
        });
    }
    return combined;
  }, [items, gearItems]);

  const filteredItems = useMemo(() => {
    return allDisplayItems.filter(item => {
      if (!item) return false;
      const type = (item.type || "").toLowerCase();
      if (filter === "all") return true;
      if (filter === "gear") return item.isGear || item.slot || type === "weapon" || type === "armor";
      if (filter === "consumables") return type === "consumable" || item.healAmount || item.restoreMana;
      if (filter === "quest") return type === "quest";
      if (filter === "misc") return type === "misc" || (!item.type && !item.slot && !item.isGear);
      return true;
    });
  }, [allDisplayItems, filter]);

  const handleAction = (item: any) => {
    if (item.isGear || item.slot || item.type === "weapon" || item.type === "armor") {
      sendCommand("equip_item", { itemId: item.uid || item.itemId || item.id });
    } else {
      sendUseItem(item.itemId || item.id);
    }
  };

  return (
    <div className="inventory-overlay" onClick={onClose} onTouchStart={(e) => e.stopPropagation()} onPointerDown={(e) => e.stopPropagation()}>
      <div className="inventory-card gold-frame" onClick={e => e.stopPropagation()} onTouchStart={(e) => e.stopPropagation()} onPointerDown={(e) => e.stopPropagation()}>
        <header className="inventory-header">
          <h2 className="gold-text">Master Inventory</h2>
          <div className="inv-stats gold-text">{allDisplayItems.length} / 40 Slots</div>
          <button className="close-btn" onClick={onClose}>×</button>
        </header>

        <nav className="inventory-nav">
          <button className={filter === "all" ? "active" : ""} onClick={() => setFilter("all")}>All</button>
          <button className={filter === "gear" ? "active" : ""} onClick={() => setFilter("gear")}>Gear</button>
          <button className={filter === "consumables" ? "active" : ""} onClick={() => setFilter("consumables")}>Items</button>
          <button className={filter === "quest" ? "active" : ""} onClick={() => setFilter("quest")}>Quest</button>
        </nav>

        <main className="inventory-grid-redesign">
          {filteredItems.map((item, idx) => (
            <div key={idx} className={`item-slot-redesign ${item.rarity || 'common'} ${item.isGear ? 'gear-item' : ''}`} onClick={() => handleAction(item)}>
              <div className="item-icon">
                {item.isGear || item.slot ? "🛡️" : item.healAmount ? "🧪" : "📦"}
              </div>
              <span className="item-name">{item.name || item.itemId || item.id}</span>
              {item.qty > 1 && <span className="item-qty">x{item.qty}</span>}
              {item.isGear && <span className="gear-tag">GEAR</span>}
            </div>
          ))}
          {Array.from({ length: Math.max(0, 24 - filteredItems.length) }).map((_, idx) => (
            <div key={`empty-${idx}`} className="item-slot-redesign empty"></div>
          ))}
        </main>

        <footer className="inventory-footer">
          <div className="currency">
            <span className="gold gold-text">💰 {gold.toLocaleString()}</span>
            <span className="gems" style={{color: "#7eb8ff"}}>💎 0</span>
          </div>
          <div className="inv-actions">
             <button className="gold-frame" onClick={() => sendCommand("sort_inventory", {})}>SORT</button>
             <button className="gold-frame">FILTER</button>
          </div>
        </footer>
      </div>
    </div>
  );
};
