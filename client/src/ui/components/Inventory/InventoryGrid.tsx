/**
 * InventoryGrid Component
 * Displays inventory items in a grid with drag & drop support
 * 
 * Features:
 * - Configurable grid size
 * - Drag & drop between slots
 * - Sort and filter options
 * - Search functionality
 * - Responsive design
 */

import React, { useState, useCallback, useMemo } from 'react';
import { InventorySlot, Item, ItemRarity } from './InventorySlot';
import './InventoryGrid.css';

interface InventoryGridProps {
  items: (Item | undefined)[];
  equippedItems?: Record<string, Item>;
  columns?: number;
  onItemMove?: (fromSlot: number, toSlot: number) => void;
  onEquip?: (slot: number) => void;
  onUnequip?: (slot: number) => void;
  onUse?: (slot: number) => void;
  onSearch?: (query: string) => void;
  onSort?: (sortBy: SortOption) => void;
  onFilter?: (filter: FilterOption) => void;
  className?: string;
}

export type SortOption = 'name' | 'rarity' | 'type' | 'value';
export type FilterOption = 'all' | 'weapon' | 'armor' | 'accessory' | 'consumable' | 'quest' | 'misc';

/**
 * InventoryGrid Component
 */
export const InventoryGrid: React.FC<InventoryGridProps> = ({
  items,
  equippedItems = {},
  columns = 5,
  onItemMove,
  onEquip,
  onUnequip,
  onUse,
  onSearch,
  onSort,
  onFilter,
  className = ''
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('name');
  const [filterBy, setFilterBy] = useState<FilterOption>('all');
  const [showStats, setShowStats] = useState(false);

  /**
   * Filter items based on current filter
   */
  const filteredItems = useMemo(() => {
    return items.map((item, index) => ({
      item,
      index,
      matches:
        (!item ||
          (filterBy === 'all' || item.type === filterBy) &&
          (searchQuery === '' || item.name.toLowerCase().includes(searchQuery.toLowerCase())))
    }));
  }, [items, filterBy, searchQuery]);

  /**
   * Sort filtered items
   */
  const sortedItems = useMemo(() => {
    const sorted = [...filteredItems].sort((a, b) => {
      if (!a.item || !b.item) return 0;

      switch (sortBy) {
        case 'name':
          return a.item.name.localeCompare(b.item.name);
        case 'rarity': {
          const rarityOrder: Record<ItemRarity, number> = {
            common: 1,
            uncommon: 2,
            rare: 3,
            epic: 4,
            legendary: 5,
            mythic: 6
          };
          return rarityOrder[b.item.rarity] - rarityOrder[a.item.rarity];
        }
        case 'type':
          return a.item.type.localeCompare(b.item.type);
        case 'value':
          return (b.item.value || 0) - (a.item.value || 0);
        default:
          return 0;
      }
    });
    return sorted;
  }, [filteredItems, sortBy]);

  /**
   * Calculate inventory stats
   */
  const stats = useMemo(() => {
    const totalItems = items.filter(Boolean).length;
    const totalValue = items.reduce((sum, item) => sum + (item?.value || 0), 0);
    const totalWeight = items.reduce((sum, item) => sum + (item?.weight || 0), 0);
    const rarityCount = {
      common: 0,
      uncommon: 0,
      rare: 0,
      epic: 0,
      legendary: 0,
      mythic: 0
    };

    items.forEach(item => {
      if (item) {
        rarityCount[item.rarity]++;
      }
    });

    return { totalItems, totalValue, totalWeight, rarityCount };
  }, [items]);

  const handleSearchChange = (query: string) => {
    setSearchQuery(query);
    onSearch?.(query);
  };

  const handleSortChange = (sort: SortOption) => {
    setSortBy(sort);
    onSort?.(sort);
  };

  const handleFilterChange = (filter: FilterOption) => {
    setFilterBy(filter);
    onFilter?.(filter);
  };

  const rows = Math.ceil(items.length / columns);

  return (
    <div className={`inventory-grid-container ${className}`}>
      {/* Header */}
      <div className="inventory-header">
        <div className="inventory-title">Inventory</div>
        <div className="inventory-controls">
          {/* Search */}
          <div className="search-control">
            <input
              type="text"
              placeholder="Search items..."
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="search-input"
            />
          </div>

          {/* Sort */}
          <div className="sort-control">
            <select
              value={sortBy}
              onChange={(e) => handleSortChange(e.target.value as SortOption)}
              className="sort-select"
            >
              <option value="name">Sort: Name</option>
              <option value="rarity">Sort: Rarity</option>
              <option value="type">Sort: Type</option>
              <option value="value">Sort: Value</option>
            </select>
          </div>

          {/* Filter */}
          <div className="filter-control">
            <select
              value={filterBy}
              onChange={(e) => handleFilterChange(e.target.value as FilterOption)}
              className="filter-select"
            >
              <option value="all">All Items</option>
              <option value="weapon">Weapons</option>
              <option value="armor">Armor</option>
              <option value="accessory">Accessories</option>
              <option value="consumable">Consumables</option>
              <option value="quest">Quest Items</option>
              <option value="misc">Misc</option>
            </select>
          </div>

          {/* Stats Toggle */}
          <button
            className="stats-toggle"
            onClick={() => setShowStats(!showStats)}
            title="Toggle stats"
          >
            📊
          </button>
        </div>
      </div>

      {/* Stats Panel */}
      {showStats && (
        <div className="inventory-stats">
          <div className="stat-item">
            <span className="stat-label">Total Items:</span>
            <span className="stat-value">{stats.totalItems}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Total Value:</span>
            <span className="stat-value gold">{stats.totalValue}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Total Weight:</span>
            <span className="stat-value">{stats.totalWeight.toFixed(1)} kg</span>
          </div>
          <div className="rarity-breakdown">
            {Object.entries(stats.rarityCount).map(([rarity, count]) =>
              count > 0 ? (
                <div key={rarity} className={`rarity-item rarity-${rarity}`}>
                  <span className="rarity-name">{rarity}</span>
                  <span className="rarity-count">{count}</span>
                </div>
              ) : null
            )}
          </div>
        </div>
      )}

      {/* Grid */}
      <div
        className="inventory-grid"
        style={{
          gridTemplateColumns: `repeat(${columns}, 1fr)`,
          gridAutoRows: '60px'
        }}
      >
        {items.map((item, index) => {
          const isEquipped = Object.values(equippedItems).some(eq => eq?.id === item?.id);
          return (
            <InventorySlot
              key={index}
              item={item}
              slot={index}
              isEquipped={isEquipped}
              onDragStart={(slot, draggedItem) => {
                // Drag start logic
              }}
              onDrop={(fromSlot, toSlot) => {
                onItemMove?.(fromSlot, toSlot);
              }}
              onEquip={(slot) => {
                onEquip?.(slot);
              }}
              onUnequip={(slot) => {
                onUnequip?.(slot);
              }}
              onUse={(slot) => {
                onUse?.(slot);
              }}
            />
          );
        })}
      </div>

      {/* Empty State */}
      {items.length === 0 && (
        <div className="inventory-empty">
          <div className="empty-icon">🎒</div>
          <div className="empty-text">Your inventory is empty</div>
        </div>
      )}

      {/* No Results */}
      {items.length > 0 && sortedItems.every(item => !item.matches) && (
        <div className="inventory-no-results">
          <div className="no-results-icon">🔍</div>
          <div className="no-results-text">No items match your search</div>
        </div>
      )}
    </div>
  );
};

export default InventoryGrid;
