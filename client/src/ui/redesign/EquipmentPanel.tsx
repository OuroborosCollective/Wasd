import React, { useState, useEffect } from "react";
import { getPlayerEquipment, subscribePlayerState } from "../../state/playerState";
import { sendUnequipItem } from "../../networking/websocketClient";
import "./EquipmentPanel.css";

export const EquipmentPanel: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [equipment, setEquipment] = useState<any>(getPlayerEquipment());

  useEffect(() => {
    return subscribePlayerState(() => {
      setEquipment(getPlayerEquipment());
    });
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent, slotName: string, item: any) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      if (item) sendUnequipItem(slotName);
    }
  };

  const renderSlot = (slotName: string, label: string) => {
    const item = (equipment as any)[slotName];
    return (
      <div className="equipment-slot-container">
        <label className="slot-label">{label}</label>
        <div
          className={`equipment-slot gold-frame ${item ? 'has-item' : 'empty'}`}
          onClick={() => item && sendUnequipItem(slotName)}
          onKeyDown={(e) => handleKeyDown(e, slotName, item)}
          role="button"
          tabIndex={0}
          aria-label={item ? `Unequip ${item.name || item.itemId} from ${label}` : `Empty ${label} slot`}
        >
          {item ? (
            <div className="equipped-item">
              <span className="item-icon">{slotName === "weapon" ? "⚔️" : "🛡️"}</span>
              <span className="item-name-overlay">{item.name || item.itemId}</span>
            </div>
          ) : (
            <span className="empty-slot-icon">+</span>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="equipment-overlay" onClick={onClose} onTouchStart={(e) => e.stopPropagation()} onPointerDown={(e) => e.stopPropagation()}>
      <div className="equipment-card gold-frame" onClick={e => e.stopPropagation()} onTouchStart={(e) => e.stopPropagation()} onPointerDown={(e) => e.stopPropagation()}>
        <header className="equipment-header">
          <h2 className="gold-text">Character & Gear</h2>
          <button className="close-btn" onClick={onClose} aria-label="Close equipment panel">×</button>
        </header>

        <main className="equipment-content">
          <div className="slots-column left">
            {renderSlot("head", "Head")}
            {renderSlot("neck", "Neck")}
            {renderSlot("chest", "Chest")}
            {renderSlot("back", "Back")}
          </div>

          <div className="character-preview-area">
             <div className="char-render-ring">
                <div className="char-placeholder">🧙</div>
             </div>
             <div className="char-stats-summary">
                <div className="stat-summary-item">
                    <span>Power</span>
                    <span className="gold-text">1,250</span>
                </div>
                <div className="stat-summary-item">
                    <span>Defense</span>
                    <span className="gold-text">840</span>
                </div>
             </div>
          </div>

          <div className="slots-column right">
            {renderSlot("weapon", "Main Hand")}
            {renderSlot("offHand", "Off Hand")}
            {renderSlot("legs", "Legs")}
            {renderSlot("feet", "Feet")}
          </div>
        </main>
      </div>
    </div>
  );
};
