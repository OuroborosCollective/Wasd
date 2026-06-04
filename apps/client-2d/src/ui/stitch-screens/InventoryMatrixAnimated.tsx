/**
 * InventoryMatrixAnimated - Animated Diamond Glass Inventory
 * 
 * Stitch design for inventory grid with diamond glass aesthetic
 */

import React from 'react';

interface InventoryMatrixAnimatedProps {
  className?: string;
  slots?: number;
  onItemSelect?: (slotId: number) => void;
}

export function InventoryMatrixAnimated({ 
  className = '',
  slots = 24,
  onItemSelect
}: InventoryMatrixAnimatedProps) {
  const content = `
<div class="bg-deep-marine min-h-screen p-4">
  <!-- Header -->
  <div class="flex items-center justify-between mb-4">
    <div class="flex items-center gap-3">
      <div class="w-10 h-10 rounded-full bg-surface-container border border-primary/30 flex items-center justify-center">
        <span class="material-symbols-outlined text-primary">inventory_2</span>
      </div>
      <div>
        <h2 class="font-headline-md text-headline-md text-primary">Inventory</h2>
        <span class="font-label-sm text-label-sm text-on-surface-variant">12/48 slots</span>
      </div>
    </div>
    <button class="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center text-on-surface-variant hover:text-primary transition-colors">
      <span class="material-symbols-outlined text-sm">tune</span>
    </button>
  </div>

  <!-- Category Tabs -->
  <div class="flex gap-2 mb-4 overflow-x-auto pb-2">
    <button class="px-4 py-2 rounded-lg bg-primary/20 border border-primary text-primary font-label-caps text-label-caps whitespace-nowrap">All</button>
    <button class="px-4 py-2 rounded-lg bg-surface-container border border-outline/30 text-on-surface-variant font-label-caps text-label-caps whitespace-nowrap hover:border-primary/50 transition-colors">Weapons</button>
    <button class="px-4 py-2 rounded-lg bg-surface-container border border-outline/30 text-on-surface-variant font-label-caps text-label-caps whitespace-nowrap hover:border-primary/50 transition-colors">Armor</button>
    <button class="px-4 py-2 rounded-lg bg-surface-container border border-outline/30 text-on-surface-variant font-label-caps text-label-caps whitespace-nowrap hover:border-primary/50 transition-colors">Consumables</button>
    <button class="px-4 py-2 rounded-lg bg-surface-container border border-outline/30 text-on-surface-variant font-label-caps text-label-caps whitespace-nowrap hover:border-primary/50 transition-colors">Materials</button>
  </div>

  <!-- Inventory Grid -->
  <div class="grid grid-cols-6 gap-2">
    ${Array(slots).fill(0).map((_, i) => `
    <div 
      class="aspect-square diamond-glass rounded-lg border border-outline/20 hover:border-secondary/50 hover:scale-105 transition-all cursor-pointer flex items-center justify-center group relative
        ${i === 5 ? 'ring-2 ring-secondary shadow-[0_0_10px_rgba(255,122,0,0.5)]' : ''}
        ${i === 12 ? 'ring-2 ring-primary shadow-[0_0_10px_rgba(175,200,240,0.5)]' : ''}">
      ${i === 5 ? '<span class="material-symbols-outlined text-secondary text-2xl" style="font-variation-settings:\'FILL\' 1;">swords</span>' : ''}
      ${i === 12 ? '<span class="material-symbols-outlined text-primary text-2xl" style="font-variation-settings:\'FILL\' 1;">shield</span>' : ''}
      ${i === 18 ? '<span class="material-symbols-outlined text-tertiary text-2xl" style="font-variation-settings:\'FILL\' 1;">local_fire_department</span>' : ''}
      
      <!-- Item Count Badge -->
      ${i === 5 ? '<div class="absolute bottom-0 right-0 px-1 py-0.5 bg-energy-amber text-void-black font-label-sm text-label-sm rounded-tl-lg">99</div>' : ''}
      
      <!-- Hover Glow -->
      <div class="absolute inset-0 rounded-lg bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
    </div>
    `).join('')}
  </div>

  <!-- Quick Actions -->
  <div class="mt-6 flex gap-3">
    <button class="flex-1 hex-button bg-surface-container border border-outline/50 text-on-surface-variant font-label-caps py-3 flex items-center justify-center gap-2 hover:border-secondary transition-all">
      <span class="material-symbols-outlined text-sm">sort</span>
      <span>Sort</span>
    </button>
    <button class="flex-1 hex-button bg-surface-container border border-outline/50 text-on-surface-variant font-label-caps py-3 flex items-center justify-center gap-2 hover:border-secondary transition-all">
      <span class="material-symbols-outlined text-sm">search</span>
      <span>Search</span>
    </button>
    <button class="flex-1 hex-button bg-secondary/20 border border-secondary text-secondary font-label-caps py-3 flex items-center justify-center gap-2 hover:bg-secondary/30 neon-glow-orange transition-all">
      <span class="material-symbols-outlined text-sm">storefront</span>
      <span>Shop</span>
    </button>
  </div>
</div>`;

  return (
    <div className={className} dangerouslySetInnerHTML={{ __html: content }} />
  );
}
