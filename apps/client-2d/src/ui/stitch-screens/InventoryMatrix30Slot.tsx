import React from 'react';

interface InventoryMatrix30SlotProps {
  className?: string;
}

export function InventoryMatrix30Slot({ className = '' }: InventoryMatrix30SlotProps) {
  const content = `
<!-- Blurred Background Map/Forest -->
<div class="bg-mystical-forest" data-alt="A mystical ancient forest at twilight. Deep marine blues and purples dominate the shadows, while ethereal glowing flora emit soft cyan and sunset-orange lights. The scene is slightly obscured by a dense, atmospheric fog, creating a serene, highly detailed fantasy-science landscape suitable for an MMORPG backdrop. The style is hyper-refined Diamond Glass aesthetic." style="background-image: url('https://lh3.googleusercontent.com/aida-public/AB6AXuDmWZPH0GgcYL5R08H98F4AfG8L-qjdVkA0wUGTOgbpr5FdjXEqYQrHKypBLJkk6mahmvBNcN-iViu1l0ygiv-b2S_t3ZVuLV9bm06pUcDJyvpOPhF_tWI2fG35dJIGvkYu8tNksETBhBYlAgKA2X7rfAHq5b5LcJwU9R5UgG28qq9Ma5Vt7TUO96vLKs8gczGxJJxPbtjwwBzAV-9qhkFNt6rsYEgVrvyi2r4PvjvLYbU79geO_fQNuuyitKw605dBrY7tJd7gE1I');"></div>
<!-- TopAppBar -->
<header class="fixed top-0 w-full rounded-b-xl border-b border-white/10 shadow-[0_0_15px_rgba(0,229,255,0.2)] bg-surface/60 backdrop-blur-xl flex items-center justify-between px-margin-mobile h-touch-min z-50 transition-all duration-300">
<button class="w-touch-min h-touch-min flex items-center justify-center text-on-surface-variant hover:bg-white/5 rounded-full active:scale-95 transition-all">
<span class="material-symbols-outlined">blur_on</span>
</button>
<h1 class="font-display-lg-mobile text-display-lg-mobile tracking-tighter text-mana-cyan font-bold">OUROBOROS</h1>
<button class="w-touch-min h-touch-min flex items-center justify-center text-on-surface-variant hover:bg-white/5 rounded-full active:scale-95 transition-all">
<span class="material-symbols-outlined">account_circle</span>
</button>
</header>
<!-- Main Content Area -->
<main class="pt-safe pb-safe px-margin-mobile max-w-4xl mx-auto h-screen flex flex-col justify-center">
<!-- Inventory Container -->
<div class="glass-panel chamfered-corners w-full p-6 flex flex-col gap-6 shadow-[0_10px_40px_rgba(0,0,0,0.5)]">
<!-- Header Section -->
<div class="flex justify-between items-end border-b border-white/10 pb-4">
<div>
<h2 class="font-headline-md text-headline-md text-on-surface tracking-wider">INVENTORY</h2>
<p class="font-label-sm text-label-sm text-on-surface-variant mt-1">CAPACITY: <span class="text-mana-cyan">18</span>/30</p>
</div>
<!-- Sort/Filter Controls -->
<div class="flex gap-2">
<button class="glass-panel px-3 py-1 flex items-center gap-1 rounded text-on-surface-variant hover:text-white transition-colors border border-white/5">
<span class="material-symbols-outlined text-[16px]">filter_list</span>
<span class="font-label-caps text-label-caps">ALL</span>
</button>
</div>
</div>
<!-- Grid -->
<div class="grid grid-cols-5 md:grid-cols-6 gap-2 md:gap-3">
<!-- Slot 1: Active/Epic Item -->
<div class="inventory-slot rarity-epic active chamfered-corners cursor-pointer" onclick="toggleTooltip(true)">
<div class="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center animate-pulse">
<span class="material-symbols-outlined text-purple-400">diamond</span>
</div>
<span class="item-count">x1</span>
</div>
<!-- Slot 2: Common Item -->
<div class="inventory-slot chamfered-corners cursor-pointer">
<span class="material-symbols-outlined text-on-surface-variant/80">local_drink</span>
<span class="item-count">x5</span>
</div>
<!-- Slot 3: Rare Item -->
<div class="inventory-slot chamfered-corners cursor-pointer border-blue-500/30">
<span class="material-symbols-outlined text-blue-400">shield</span>
<span class="item-count">x1</span>
</div>
<!-- Slots 4-18: Various Items -->
<div class="inventory-slot chamfered-corners cursor-pointer"><span class="material-symbols-outlined text-green-400">eco</span><span class="item-count">x12</span></div>
<div class="inventory-slot chamfered-corners cursor-pointer"><span class="material-symbols-outlined text-on-surface-variant">hardware</span></div>
<div class="inventory-slot chamfered-corners cursor-pointer"><span class="material-symbols-outlined text-energy-amber">bolt</span><span class="item-count">x3</span></div>
<div class="inventory-slot chamfered-corners cursor-pointer"><span class="material-symbols-outlined text-on-surface-variant">book</span></div>
<div class="inventory-slot chamfered-corners cursor-pointer border-blue-500/30"><span class="material-symbols-outlined text-blue-400">auto_awesome</span></div>
<!-- Empty Slots to fill 30 -->
<div class="inventory-slot chamfered-corners"></div><div class="inventory-slot chamfered-corners"></div>
<div class="inventory-slot chamfered-corners"></div><div class="inventory-slot chamfered-corners"></div>
<div class="inventory-slot chamfered-corners"></div><div class="inventory-slot chamfered-corners"></div>
<div class="inventory-slot chamfered-corners"></div><div class="inventory-slot chamfered-corners"></div>
<div class="inventory-slot chamfered-corners"></div><div class="inventory-slot chamfered-corners"></div>
<div class="inventory-slot chamfered-corners"></div><div class="inventory-slot chamfered-corners"></div>
<div class="inventory-slot chamfered-corners"></div><div class="inventory-slot chamfered-corners"></div>
<div class="inventory-slot chamfered-corners"></div><div class="inventory-slot chamfered-corners"></div>
<div class="inventory-slot chamfered-corners"></div><div class="inventory-slot chamfered-corners"></div>
<div class="inventory-slot chamfered-corners"></div><div class="inventory-slot chamfered-corners"></div>
<div class="inventory-slot chamfered-corners"></div><div class="inventory-slot chamfered-corners"></div>
</div>
<!-- Bottom Action -->
<div class="mt-2 flex justify-end">
<button class="px-6 py-2 glass-panel border border-energy-amber/50 text-energy-amber font-label-caps text-label-caps hover:bg-energy-amber/10 transition-colors flex items-center gap-2">
<span class="material-symbols-outlined text-[18px]">sort</span>
                    AUTO-SORT
                </button>
</div>
</div>
</main>
<!-- Item Tooltip Overlay (Hidden by default, positioned absolute) -->
<div class="tooltip-glass chamfered-corners p-4 flex flex-col gap-3" id="item-tooltip">
<div class="flex justify-between items-start">
<div>
<h3 class="font-headline-md text-[18px] leading-tight text-white font-bold drop-shadow-[0_0_5px_rgba(168,85,247,0.8)]">Abyssal Shard</h3>
<span class="font-label-sm text-label-sm text-purple-400 tracking-widest uppercase">Epic Crafting Material</span>
</div>
<button class="text-on-surface-variant hover:text-white" onclick="toggleTooltip(false)">
<span class="material-symbols-outlined">close</span>
</button>
</div>
<p class="font-body-md text-[14px] text-on-surface-variant italic border-y border-white/5 py-2">
            "A fragment of pure potential, crystallized in the deepest trenches of the Void Ocean. It hums with latent, chaotic energy."
        </p>
<div class="flex flex-col gap-2">
<div class="flex justify-between items-center">
<span class="font-label-caps text-[10px] text-on-surface">RESONANCE</span>
<span class="font-label-sm text-tertiary">75%</span>
</div>
<div class="stat-bar-container w-full">
<div class="stat-bar-fill"></div>
</div>
</div>
<div class="mt-2 grid grid-cols-2 gap-2">
<button class="glass-panel border-white/10 text-on-surface font-label-caps text-[10px] py-2 hover:bg-white/5">DROP</button>
<button class="hex-button text-black font-label-caps text-[10px] py-2 font-bold flex items-center justify-center gap-1">
<span class="material-symbols-outlined text-[14px]">bolt</span> USE
            </button>
</div>
</div>
<!-- BottomNavBar -->
<nav class="fixed bottom-0 left-0 w-full z-50 flex justify-around items-center h-16 px-gutter pb-safe bg-surface-container-lowest/40 backdrop-blur-2xl rounded-t-xl border-t border-white/5 shadow-[0_-4px_20px_rgba(0,0,0,0.5)] md:hidden">
<!-- Inactive Tab -->
<a class="flex flex-col items-center justify-center text-on-surface-variant/70 hover:text-tertiary-fixed-dim transition-transform duration-200" href="#">
<span class="material-symbols-outlined" style="font-variation-settings: 'FILL' 0;">assignment</span>
</a>
<!-- Inactive Tab -->
<a class="flex flex-col items-center justify-center text-on-surface-variant/70 hover:text-tertiary-fixed-dim transition-transform duration-200" href="#">
<span class="material-symbols-outlined" style="font-variation-settings: 'FILL' 0;">explore</span>
</a>
<!-- Inactive Tab -->
<a class="flex flex-col items-center justify-center text-on-surface-variant/70 hover:text-tertiary-fixed-dim transition-transform duration-200" href="#">
<span class="material-symbols-outlined" style="font-variation-settings: 'FILL' 0;">bolt</span>
</a>
<!-- Active Tab (Bag/Inventory context maps to 'work' based on JSON array provided) -->
<a class="flex flex-col items-center justify-center text-energy-amber drop-shadow-[0_0_8px_rgba(255,122,0,0.6)] scale-110 animate-pulse-subtle transition-transform duration-200" href="#">
<span class="material-symbols-outlined" style="font-variation-settings: 'FILL' 1;">work</span>
</a>
<!-- Inactive Tab -->
<a class="flex flex-col items-center justify-center text-on-surface-variant/70 hover:text-tertiary-fixed-dim transition-transform duration-200" href="#">
<span class="material-symbols-outlined" style="font-variation-settings: 'FILL' 0;">group</span>
</a>
</nav>

`;
  
  return (
    <div className={className} dangerouslySetInnerHTML={{ __html: content }} />
  );
}
