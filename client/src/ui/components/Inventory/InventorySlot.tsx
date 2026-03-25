'use client';

/**
 * InventorySlot Component
 * Displays a single inventory item with drag & drop support
 * 
 * Features:
 * - Rarity color coding
 * - Item tooltips
 * - Quick equip buttons
 * - Stack count display
 * - Drag & drop support
 * - Responsive design
 */

import React, { useState, useRef } from 'react';
import Image from 'next/image';
import './InventorySlot.css';
import { Item, ItemRarity } from '../../../types/item';

interface InventorySlotProps {
  item?: Item;
  slot: number;
  isEquipped?: boolean;
  onDragStart?: (slot: number, item: Item) => void;
  onDrop?: (fromSlot: number, toSlot: number) => void;
  onEquip?: (slot: number) => void;
  onUnequip?: (slot: number) => void;
  onUse?: (slot: number) => void;
  className?: string;
}

/**
 * Get rarity color class
 */
const getRarityClass = (rarity: ItemRarity): string => {
  const rarityMap: Record<ItemRarity, string> = {
    common: 'rarity-common',
    uncommon: 'rarity-uncommon',
    rare: 'rarity-rare',
    epic: 'rarity-epic',
    legendary: 'rarity-legendary',
    mythic: 'rarity-mythic'
  };
  return rarityMap[rarity] || 'rarity-common';
};

/**
 * Get rarity color for display
 */
const getRarityColor = (rarity: ItemRarity): string => {
  const colorMap: Record<ItemRarity, string> = {
    common: '#999999',
    uncommon: '#1eff00',
    rare: '#0070dd',
    epic: '#a335ee',
    legendary: '#ff8000',
    mythic: '#e6cc80'
  };
  return colorMap[rarity] || '#999999';
};

/**
 * ItemTooltip Component
 */
const ItemTooltip: React.FC<{ item: Item }> = ({ item }) => {
  const [showTooltip, setShowTooltip] = useState(false);
  const tooltipRef = useRef<HTMLDivElement>(null);

  return (
    <>
      <div
        className="item-tooltip-trigger"
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
      />
      {showTooltip && (
        <div className="item-tooltip" ref={tooltipRef}>
          <div className={`tooltip-header ${getRarityClass(item.rarity)}`}>
            <div className="tooltip-name">{item.name}</div>
            <div className="tooltip-rarity">{item.rarity.toUpperCase()}</div>
          </div>

          {item.description && (
            <div className="tooltip-description">{item.description}</div>
          )}

          {item.stats && Object.keys(item.stats).length > 0 && (
            <div className="tooltip-stats">
              <div className="stats-title">Stats</div>
              {Object.entries(item.stats).map(([key, value]) => (
                value !== undefined && (
                  <div key={key} className="stat-line">
                    <span className="stat-name">{key}:</span>
                    <span className={`stat-value ${value > 0 ? 'positive' : 'negative'}`}>
                      {value > 0 ? '+' : ''}{value}
                    </span>
                  </div>
                )
              ))}
            </div>
          )}

          {item.type && (
            <div className="tooltip-type">
              <span className="type-label">Type:</span>
              <span className="type-value">{item.type}</span>
            </div>
          )}

          {item.value !== undefined && (
            <div className="tooltip-value">
              <span className="value-label">Value:</span>
              <span className="value-amount">{item.value} Gold</span>
            </div>
          )}

          {item.weight !== undefined && (
            <div className="tooltip-weight">
              <span className="weight-label">Weight:</span>
              <span className="weight-amount">{item.weight} kg</span>
            </div>
          )}

          {item.rarity_description && (
            <div className="tooltip-rarity-desc">{item.rarity_description}</div>
          )}
        </div>
      )}
    </>
  );
};

/**
 * Main InventorySlot Component
 */
export const InventorySlot: React.FC<InventorySlotProps> = ({
  item,
  slot,
  isEquipped = false,
  onDragStart,
  onDrop,
  onEquip,
  onUnequip,
  onUse,
  className = ''
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [showActions, setShowActions] = useState(false);

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>) => {
    if (!item) return;
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('slotIndex', slot.toString());
    onDragStart?.(slot, item);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    const fromSlot = parseInt(e.dataTransfer.getData('slotIndex'), 10);
    if (fromSlot !== slot) {
      onDrop?.(fromSlot, slot);
    }
  };

  const handleContextMenu = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    setShowActions(!showActions);
  };

  return (
    <div
      className={`inventory-slot ${getRarityClass(item?.rarity || 'common')} ${className} ${
        isDragOver ? 'drag-over' : ''
      } ${isEquipped ? 'equipped' : ''} ${showActions ? 'show-actions' : ''}`}
      draggable={!!item}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onContextMenu={handleContextMenu}
    >
      {item ? (
        <>
          {/* Item Icon */}
          <div className="slot-icon-container">
            <Image 
              src={item.icon} 
              alt={item.name} 
              className="slot-icon" 
              width={48} 
              height={48} 
              referrerPolicy="no-referrer"
            />

            {/* Rarity Border */}
            <div
              className="rarity-border"
              style={{ borderColor: getRarityColor(item.rarity) }}
            />

            {/* Stack Count */}
            {item.stackSize && item.stackSize > 1 && (
              <div className="stack-count">{item.stackSize}</div>
            )}

            {/* Equipped Badge */}
            {isEquipped && <div className="equipped-badge">E</div>}
          </div>

          {/* Item Tooltip */}
          <ItemTooltip item={item} />

          {/* Action Buttons */}
          {showActions && (
            <div className="slot-actions">
              {item.equippable && !isEquipped && (
                <button
                  className="action-btn equip-btn"
                  onClick={() => {
                    onEquip?.(slot);
                    setShowActions(false);
                  }}
                  title="Equip"
                >
                  ⚔️
                </button>
              )}

              {isEquipped && (
                <button
                  className="action-btn unequip-btn"
                  onClick={() => {
                    onUnequip?.(slot);
                    setShowActions(false);
                  }}
                  title="Unequip"
                >
                  ❌
                </button>
              )}

              {item.type === 'consumable' && (
                <button
                  className="action-btn use-btn"
                  onClick={() => {
                    onUse?.(slot);
                    setShowActions(false);
                  }}
                  title="Use"
                >
                  ✓
                </button>
              )}
            </div>
          )}
        </>
      ) : (
        <div className="slot-empty">
          <div className="empty-text">Empty</div>
        </div>
      )}
    </div>
  );
};

export default InventorySlot;
