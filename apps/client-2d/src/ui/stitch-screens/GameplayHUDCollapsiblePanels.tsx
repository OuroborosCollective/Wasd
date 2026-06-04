/**
 * GameplayHUDCollapsiblePanels - Collapsible Panels & Mini Icons
 * 
 * Stitch design for collapsible HUD panels
 */

import React from 'react';

interface GameplayHUDCollapsiblePanelsProps {
  className?: string;
}

export function GameplayHUDCollapsiblePanels({ className = '' }: GameplayHUDCollapsiblePanelsProps) {
  const content = `
<div class="flex flex-col gap-2 p-4">
  <!-- Collapsible Buff Bar -->
  <div class="diamond-glass rounded-xl overflow-hidden">
    <button class="w-full px-4 py-2 flex items-center justify-between bg-surface-container hover:bg-surface-container-high transition-colors" onclick="this.parentElement.classList.toggle('collapsed')">
      <div class="flex items-center gap-2">
        <span class="material-symbols-outlined text-secondary text-lg" style="font-variation-settings:'FILL' 1;">bolt</span>
        <span class="font-label-caps text-label-caps text-secondary tracking-wider">BUFFS</span>
      </div>
      <span class="material-symbols-outlined text-on-surface-variant text-sm transition-transform">expand_less</span>
    </button>
    <div class="p-3 flex gap-2 overflow-x-auto">
      <!-- Buff Icons -->
      <div class="w-10 h-10 rounded-lg bg-primary/20 border border-primary flex items-center justify-center relative group cursor-pointer hover:scale-110 transition-transform">
        <span class="material-symbols-outlined text-primary" style="font-variation-settings:'FILL' 1;">shield</span>
        <div class="absolute -bottom-1 left-1/2 -translate-x-1/2 px-1 py-0.5 bg-void-black text-primary text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">Shield +20%</div>
      </div>
      <div class="w-10 h-10 rounded-lg bg-secondary/20 border border-secondary flex items-center justify-center relative group cursor-pointer hover:scale-110 transition-transform">
        <span class="material-symbols-outlined text-secondary" style="font-variation-settings:'FILL' 1;">local_fire_department</span>
        <div class="absolute -bottom-1 left-1/2 -translate-x-1/2 px-1 py-0.5 bg-void-black text-secondary text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">Fire Res</div>
      </div>
      <div class="w-10 h-10 rounded-lg bg-tertiary/20 border border-tertiary flex items-center justify-center relative group cursor-pointer hover:scale-110 transition-transform">
        <span class="material-symbols-outlined text-tertiary" style="font-variation-settings:'FILL' 1;">speed</span>
        <div class="absolute -bottom-1 left-1/2 -translate-x-1/2 px-1 py-0.5 bg-void-black text-tertiary text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">Haste +15%</div>
      </div>
      <div class="w-10 h-10 rounded-lg bg-mana-cyan/20 border border-mana-cyan flex items-center justify-center relative group cursor-pointer hover:scale-110 transition-transform">
        <span class="material-symbols-outlined text-mana-cyan" style="font-variation-settings:'FILL' 1;">water_drop</span>
        <div class="absolute -bottom-1 left-1/2 -translate-x-1/2 px-1 py-0.5 bg-void-black text-mana-cyan text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">Mana Regen</div>
      </div>
    </div>
  </div>

  <!-- Collapsible Stats Panel -->
  <div class="diamond-glass rounded-xl overflow-hidden">
    <button class="w-full px-4 py-2 flex items-center justify-between bg-surface-container hover:bg-surface-container-high transition-colors" onclick="this.parentElement.classList.toggle('collapsed')">
      <div class="flex items-center gap-2">
        <span class="material-symbols-outlined text-energy-amber text-lg" style="font-variation-settings:'FILL' 1;">insights</span>
        <span class="font-label-caps text-label-caps text-energy-amber tracking-wider">STATS</span>
      </div>
      <span class="material-symbols-outlined text-on-surface-variant text-sm transition-transform">expand_less</span>
    </button>
    <div class="p-3 grid grid-cols-2 gap-3">
      <!-- Stat Items -->
      <div class="flex items-center gap-2">
        <div class="w-8 h-8 rounded bg-tertiary/20 flex items-center justify-center">
          <span class="material-symbols-outlined text-tertiary text-sm" style="font-variation-settings:'FILL' 1;">favorite</span>
        </div>
        <div>
          <span class="font-label-caps text-label-caps text-on-surface-variant">HP</span>
          <span class="font-label-sm text-label-sm text-tertiary ml-2">1,250/1,500</span>
        </div>
      </div>
      <div class="flex items-center gap-2">
        <div class="w-8 h-8 rounded bg-mana-cyan/20 flex items-center justify-center">
          <span class="material-symbols-outlined text-mana-cyan text-sm" style="font-variation-settings:'FILL' 1;">water_drop</span>
        </div>
        <div>
          <span class="font-label-caps text-label-caps text-on-surface-variant">MP</span>
          <span class="font-label-sm text-label-sm text-mana-cyan ml-2">800/1,000</span>
        </div>
      </div>
      <div class="flex items-center gap-2">
        <div class="w-8 h-8 rounded bg-secondary/20 flex items-center justify-center">
          <span class="material-symbols-outlined text-secondary text-sm" style="font-variation-settings:'FILL' 1;">bolt</span>
        </div>
        <div>
          <span class="font-label-caps text-label-caps text-on-surface-variant">STA</span>
          <span class="font-label-sm text-label-sm text-secondary ml-2">95/100</span>
        </div>
      </div>
      <div class="flex items-center gap-2">
        <div class="w-8 h-8 rounded bg-energy-amber/20 flex items-center justify-center">
          <span class="material-symbols-outlined text-energy-amber text-sm" style="font-variation-settings:'FILL' 1;">schedule</span>
        </div>
        <div>
          <span class="font-label-caps text-label-caps text-on-surface-variant">XP</span>
          <span class="font-label-sm text-label-sm text-energy-amber ml-2">12,450</span>
        </div>
      </div>
    </div>
  </div>

  <!-- Mini Icon Quick Access -->
  <div class="flex gap-2 justify-center">
    <button class="w-12 h-12 rounded-full diamond-glass border border-primary/30 flex items-center justify-center hover:border-primary hover:scale-110 transition-all">
      <span class="material-symbols-outlined text-primary text-xl" style="font-variation-settings:'FILL' 1;">map</span>
    </button>
    <button class="w-12 h-12 rounded-full diamond-glass border border-secondary/30 flex items-center justify-center hover:border-secondary hover:scale-110 transition-all">
      <span class="material-symbols-outlined text-secondary text-xl" style="font-variation-settings:'FILL' 1;">school</span>
    </button>
    <button class="w-12 h-12 rounded-full diamond-glass border border-tertiary/30 flex items-center justify-center hover:border-tertiary hover:scale-110 transition-all">
      <span class="material-symbols-outlined text-tertiary text-xl" style="font-variation-settings:'FILL' 1;">inventory_2</span>
    </button>
    <button class="w-12 h-12 rounded-full diamond-glass border border-energy-amber/30 flex items-center justify-center hover:border-energy-amber hover:scale-110 transition-all">
      <span class="material-symbols-outlined text-energy-amber text-xl" style="font-variation-settings:'FILL' 1;">storefront</span>
    </button>
    <button class="w-12 h-12 rounded-full diamond-glass border border-mana-cyan/30 flex items-center justify-center hover:border-mana-cyan hover:scale-110 transition-all">
      <span class="material-symbols-outlined text-mana-cyan text-xl" style="font-variation-settings:'FILL' 1;">mail</span>
    </button>
  </div>
</div>`;

  return (
    <div className={className} dangerouslySetInnerHTML={{ __html: content }} />
  );
}
