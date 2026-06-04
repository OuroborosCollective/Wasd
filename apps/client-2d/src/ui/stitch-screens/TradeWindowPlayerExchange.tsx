/**
 * TradeWindow - Player Exchange
 * 
 * Stitch design for player-to-player trading
 */

import React from 'react';

interface TradeWindowProps {
  className?: string;
  onTradeRequest?: () => void;
  onLockTrade?: () => void;
  onCancel?: () => void;
}

export function TradeWindow({ 
  className = '', 
  onTradeRequest,
  onLockTrade,
  onCancel 
}: TradeWindowProps) {
  const content = `
<div class="min-h-screen bg-deep-marine flex items-center justify-center p-4">
  <div class="w-full max-w-lg diamond-glass p-6">
    <!-- Header -->
    <div class="flex justify-between items-center mb-6">
      <h2 class="font-headline-md text-headline-md text-primary tracking-wider">Trade Window</h2>
      <button class="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center text-on-surface-variant hover:text-primary transition-colors">
        <span class="material-symbols-outlined text-sm">close</span>
      </button>
    </div>

    <!-- Trade Status -->
    <div class="flex justify-center mb-4">
      <div class="px-4 py-1 rounded-full bg-surface-container border border-secondary/30">
        <span class="font-label-caps text-label-caps text-secondary tracking-widest">READY</span>
      </div>
    </div>

    <!-- Trade Areas -->
    <div class="grid grid-cols-2 gap-4 mb-6">
      <!-- Your Offer -->
      <div class="flex flex-col gap-2">
        <div class="flex items-center gap-2 mb-2">
          <div class="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center">
            <img src="https://lh3.googleusercontent.com/aida-public/AB6AXuDAj5i-MASKZ3FvY9eW8k2Lq1xjNQ8vLq9X8vLq9X8vLq9X8vLq9X8vLq9X8vLq9X8vLq9X8vLq9X8vLq9X8vLq9X8vLq9X8vLq9X8vLq9X8vLq9X8vLq9X8vLq9X8vLq9X8vLq9X8vLq9X8vLq9X8vLq9X8vLq9X8vLq9X8vLq9X8vLq9X8vLq9X8vLq9X8vLq9X8vLq9X8" alt="Your avatar" class="w-full h-full rounded-full object-cover opacity-80"/>
          </div>
          <span class="font-label-caps text-label-caps text-on-surface-variant">Your Offer</span>
        </div>
        
        <!-- Gold Input -->
        <div class="flex items-center gap-2 p-2 bg-surface-container-low rounded-lg border border-secondary/20">
          <span class="material-symbols-outlined text-secondary text-sm">toll</span>
          <input type="number" placeholder="0" class="bg-transparent flex-1 font-label-caps text-label-caps text-primary focus:outline-none w-16"/>
        </div>

        <!-- Item Slots -->
        <div class="grid grid-cols-4 gap-1">
          ${Array(8).fill('<div class="aspect-square bg-surface-container-low rounded border border-outline/20 hover:border-secondary/50 transition-colors cursor-pointer"></div>').join('')}
        </div>
      </div>

      <!-- Their Offer -->
      <div class="flex flex-col gap-2">
        <div class="flex items-center gap-2 mb-2">
          <div class="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center border border-primary/30">
            <span class="material-symbols-outlined text-primary text-sm">person</span>
          </div>
          <span class="font-label-caps text-label-caps text-on-surface-variant">Their Offer</span>
        </div>
        
        <!-- Gold Display -->
        <div class="flex items-center gap-2 p-2 bg-surface-container-low rounded-lg border border-primary/20">
          <span class="material-symbols-outlined text-primary text-sm">toll</span>
          <span class="font-label-caps text-label-caps text-primary/70">Waiting...</span>
        </div>

        <!-- Item Slots -->
        <div class="grid grid-cols-4 gap-1">
          ${Array(8).fill('<div class="aspect-square bg-surface-container-low rounded border border-outline/10 opacity-50"></div>').join('')}
        </div>
      </div>
    </div>

    <!-- Lock Status -->
    <div class="flex justify-center mb-4">
      <button class="flex items-center gap-2 px-4 py-2 rounded-lg bg-surface-container border border-outline/30 hover:border-secondary/50 transition-colors">
        <span class="material-symbols-outlined text-sm text-on-surface-variant">lock</span>
        <span class="font-label-caps text-label-caps text-on-surface-variant">Lock Trade</span>
      </button>
    </div>

    <!-- Action Buttons -->
    <div class="flex gap-3">
      <button class="flex-1 hex-button bg-secondary/20 border border-secondary text-secondary font-label-caps py-3 flex items-center justify-center gap-2 hover:bg-secondary/30 neon-glow-orange transition-all">
        <span class="material-symbols-outlined text-sm">assignment</span>
        <span>QUESTS</span>
      </button>
      <button class="flex-1 hex-button bg-primary/20 border border-primary text-primary font-label-caps py-3 flex items-center justify-center gap-2 hover:bg-primary/30 transition-all">
        <span class="material-symbols-outlined text-sm">explore</span>
        <span>INVENTORY</span>
      </button>
      <button class="flex-1 hex-button bg-tertiary/20 border border-tertiary text-tertiary font-label-caps py-3 flex items-center justify-center gap-2 hover:bg-tertiary/30 neon-glow-green transition-all">
        <span class="material-symbols-outlined text-sm">bolt</span>
        <span>SKILLS</span>
      </button>
    </div>

    <!-- Confirm Trade -->
    <button class="w-full mt-4 py-3 rounded-lg bg-energy-amber/20 border border-energy-amber text-energy-amber font-headline-md hover:bg-energy-amber/30 transition-all flex items-center justify-center gap-2">
      <span class="material-symbols-outlined">swap_horiz</span>
      <span>TRADE</span>
    </button>
  </div>
</div>`;

  return (
    <div className={className} dangerouslySetInnerHTML={{ __html: content }} />
  );
}
