import React from 'react';

interface WarfrontStrategicMapProps {
  className?: string;
}

export function WarfrontStrategicMap({ className = '' }: WarfrontStrategicMapProps) {
  const content = `
<!-- TopAppBar JSON Component -->
<header class="bg-surface/60 backdrop-blur-xl border-b border-white/10 shadow-[0_0_15px_rgba(0,229,255,0.2)] fixed top-0 w-full flex justify-between items-center px-margin-mobile h-touch-min z-50">
<div class="flex items-center gap-gutter text-primary hover:bg-white/5 transition-colors active:scale-95 duration-150 p-2 rounded-full cursor-pointer">
<span class="material-symbols-outlined" data-icon="signal_cellular_alt" style="font-variation-settings: 'FILL' 1;">signal_cellular_alt</span>
</div>
<h1 class="font-headline-md text-headline-md text-mana-cyan tracking-wider">Warfront - Azure Sector</h1>
<div class="flex items-center gap-gutter text-on-surface-variant hover:bg-white/5 transition-colors active:scale-95 duration-150 p-2 rounded-full cursor-pointer">
<span class="material-symbols-outlined" data-icon="sync">sync</span>
</div>
</header>
<!-- Main Atlas View Area -->
<main class="relative flex-1 w-full h-full mt-[44px] mb-[64px] md:mb-0 bg-deep-space overflow-hidden">
<!-- Background Map Image -->
<div class="absolute inset-0 z-0 bg-cover bg-center opacity-40" data-alt="A highly detailed, futuristic sci-fi tactical map interface viewed from a top-down perspective. Deep oceanic marine blues dominate the background, resembling a high-tech holographic projection over a dark void. Glowing cyan and fiery sunset-orange energy lines traverse the terrain, highlighting strategic sectors. The aesthetic is Cyber-Zen, combining mystical serenity with sharp crystalline geometry and ambient particle effects." style="background-image: url('https://lh3.googleusercontent.com/aida-public/AB6AXuAgSkuZG8aW0yg0EQINrDV9XZ13YoFiCFXeMASyUVr4c6p3DahZzlhjVqnKcbGQvFErPWIV-nWFgztX79bFysBZwm66jTC80dEkjwbobKxkReOl6vCVRD1eaHWwAXs3r9XgqwSdI9krt4KWcCqHKCufrcYl7jrJ_a7GO16z6uY1QiiFnI93jskOTx5B0yd9TtZLttG9FriqpmD1_oZbxiLW1h1rTZxIy76_D26I_CxYQvhUULr56bwlAnzsmMv6ZRzjXrVXMTfZb_A');">
</div>
<!-- Holographic Grid -->
<div class="absolute inset-0 z-0 holographic-grid pointer-events-none"></div>
<!-- Simulated Tactical Map SVG Overlay -->
<svg class="absolute inset-0 w-full h-full z-10 pointer-events-none" xmlns="http://www.w3.org/2000/svg">
<!-- Front Lines -->
<path class="front-line-cyan opacity-80" d="M 0,300 Q 200,350 400,200 T 800,150 T 1200,400 T 1600,250" fill="none" stroke-dasharray="10 5"></path>
<path class="front-line-amber opacity-80" d="M 0,500 Q 300,450 500,600 T 900,550 T 1300,700 T 1600,500" fill="none" stroke-dasharray="15 10"></path>
<!-- Contested Zone Glow -->
<circle class="opacity-50" cx="600" cy="400" fill="url(#contested-grad)" r="150"></circle>
<defs>
<radialgradient cx="50%" cy="50%" id="contested-grad" r="50%">
<stop offset="0%" stop-color="#FF7A00" stop-opacity="0.8"></stop>
<stop offset="100%" stop-color="#FF7A00" stop-opacity="0"></stop>
</radialgradient>
</defs>
</svg>
<!-- Map Markers -->
<div class="absolute z-20 top-[35%] left-[25%] -translate-x-1/2 -translate-y-1/2 flex flex-col items-center">
<div class="w-10 h-10 rounded-full border border-mana-cyan bg-mana-cyan/20 flex items-center justify-center pulse-cyan backdrop-blur-md cursor-pointer hover:scale-110 transition-transform">
<span class="material-symbols-outlined text-mana-cyan text-[20px]" style="font-variation-settings: 'FILL' 1;">security</span>
</div>
<span class="font-label-caps text-label-caps text-mana-cyan mt-1 drop-shadow-md">Azure Sanctum</span>
</div>
<div class="absolute z-20 top-[40%] left-[60%] -translate-x-1/2 -translate-y-1/2 flex flex-col items-center">
<div class="w-12 h-12 rounded-full border border-energy-amber bg-energy-amber/30 flex items-center justify-center glow-warning backdrop-blur-md cursor-pointer hover:scale-110 transition-transform shadow-[0_0_20px_#FF7A00]">
<span class="material-symbols-outlined text-energy-amber text-[24px]" style="font-variation-settings: 'FILL' 1;">swords</span>
</div>
<span class="font-label-caps text-label-caps text-energy-amber mt-1 bg-surface-dim/80 px-2 py-0.5 rounded border border-energy-amber/30 backdrop-blur-sm">Sector B4 Contested</span>
</div>
<div class="absolute z-20 top-[65%] left-[45%] -translate-x-1/2 -translate-y-1/2 flex flex-col items-center">
<div class="w-8 h-8 rounded-full border border-secondary-fixed bg-secondary-container/20 flex items-center justify-center backdrop-blur-md cursor-pointer hover:scale-110 transition-transform">
<span class="material-symbols-outlined text-secondary-fixed text-[16px]">local_shipping</span>
</div>
<span class="font-label-sm text-label-sm text-secondary-fixed mt-1 opacity-70">Supply Line Alpha</span>
</div>
<!-- Faction Balance HUD -->
<div class="absolute top-margin-mobile left-1/2 -translate-x-1/2 z-30 w-11/12 max-w-md glass-panel chamfered-45 p-3 flex flex-col gap-2">
<div class="flex justify-between items-center px-1">
<span class="font-label-caps text-label-caps text-mana-cyan">Azure</span>
<span class="font-label-caps text-label-caps text-on-surface opacity-60">Balance of Power</span>
<span class="font-label-caps text-label-caps text-energy-amber">Solar</span>
</div>
<div class="h-2 bg-surface-container-highest rounded-full overflow-hidden flex">
<div class="h-full bg-mana-cyan/80 shadow-[0_0_8px_#00E5FF]" style="width: 45%;"></div>
<div class="h-full bg-surface-dim" style="width: 15%;"></div>
<div class="h-full bg-energy-amber/80 shadow-[0_0_8px_#FF7A00]" style="width: 40%;"></div>
</div>
</div>
<!-- Combat Log Panel -->
<div class="absolute bottom-margin-mobile left-margin-mobile right-margin-mobile md:left-auto md:w-96 md:bottom-margin-tablet md:right-margin-tablet z-30 glass-panel chamfered-45 p-4 max-h-[265px] flex flex-col">
<div class="flex items-center gap-2 mb-3 border-b border-white/10 pb-2">
<span class="material-symbols-outlined text-outline-variant text-[18px]">history</span>
<h3 class="font-label-caps text-label-caps text-on-surface tracking-widest">Tactical Feed</h3>
</div>
<div class="flex-1 overflow-y-auto pr-2 space-y-3 font-label-sm text-label-sm">
<div class="flex gap-3 items-start">
<span class="text-energy-amber opacity-70 mt-0.5">[10:01]</span>
<p class="text-on-surface flex-1">Territory Shift: <span class="text-secondary-fixed font-medium">Sector C2</span> secured by Void Walkers.</p>
</div>
<div class="flex gap-3 items-start">
<span class="text-energy-amber opacity-70 mt-0.5">[09:45]</span>
<p class="text-on-surface flex-1">Solar Exiles counter-offensive detected at <span class="text-energy-amber font-medium">Ridge-7</span>.</p>
</div>
<div class="flex gap-3 items-start">
<span class="text-mana-cyan opacity-70 mt-0.5">[09:42]</span>
<p class="text-on-surface flex-1">Azure Sanctum forces capturing <span class="text-mana-cyan font-medium">Sector B4</span>.</p>
</div>
<div class="flex gap-3 items-start opacity-50">
<span class="text-outline mt-0.5">[09:15]</span>
<p class="text-on-surface flex-1">Supply drop designated at Grid <span class="font-medium">Delta-9</span>.</p>
</div>
</div>
</div>
</main>
<!-- BottomNavBar JSON Component (Visible only on mobile/tablet portrait as per rules, hidden on md:flex) -->
<nav class="bg-surface-container-low/80 backdrop-blur-2xl border-t border-white/10 shadow-[0_-4px_20px_rgba(0,0,0,0.5)] fixed bottom-0 left-0 w-full z-50 flex justify-around items-center h-16 px-4 pb-safe rounded-t-xl md:hidden">
<!-- Active Tab: Map -->
<div class="flex flex-col items-center justify-center text-mana-cyan drop-shadow-[0_0_8px_rgba(0,229,255,0.6)] cursor-pointer hover:text-primary transition-all active:bg-primary-container/20 rounded-full scale-110 p-2">
<span class="material-symbols-outlined" data-icon="map" style="font-variation-settings: 'FILL' 1;">map</span>
<span class="font-label-sm text-label-sm uppercase mt-1">Map</span>
</div>
<div class="flex flex-col items-center justify-center text-outline opacity-70 cursor-pointer hover:text-primary transition-all active:bg-primary-container/20 rounded-full hover:scale-110 p-2">
<span class="material-symbols-outlined" data-icon="scroll">school</span>
<span class="font-label-sm text-label-sm uppercase mt-1">Quests</span>
</div>
<div class="flex flex-col items-center justify-center text-outline opacity-70 cursor-pointer hover:text-primary transition-all active:bg-primary-container/20 rounded-full hover:scale-110 p-2">
<span class="material-symbols-outlined" data-icon="shield">shield</span>
<span class="font-label-sm text-label-sm uppercase mt-1">Hero</span>
</div>
<div class="flex flex-col items-center justify-center text-outline opacity-70 cursor-pointer hover:text-primary transition-all active:bg-primary-container/20 rounded-full hover:scale-110 p-2">
<span class="material-symbols-outlined" data-icon="group">group</span>
<span class="font-label-sm text-label-sm uppercase mt-1">Guild</span>
</div>
<div class="flex flex-col items-center justify-center text-outline opacity-70 cursor-pointer hover:text-primary transition-all active:bg-primary-container/20 rounded-full hover:scale-110 p-2">
<span class="material-symbols-outlined" data-icon="shopping_cart">shopping_cart</span>
<span class="font-label-sm text-label-sm uppercase mt-1">Shop</span>
</div>
</nav>
<!-- Side Navigation for Web (Hidden on mobile) - Conceptual Extension for Desktop -->
<aside class="hidden md:flex flex-col w-20 bg-surface-container-low/80 backdrop-blur-2xl border-r border-white/10 shadow-[4px_0_20px_rgba(0,0,0,0.5)] fixed left-0 top-[44px] bottom-0 z-40 py-6 items-center gap-8">
<div class="flex flex-col items-center justify-center text-mana-cyan drop-shadow-[0_0_8px_rgba(0,229,255,0.6)] cursor-pointer p-2 scale-110">
<span class="material-symbols-outlined" data-icon="map" style="font-variation-settings: 'FILL' 1;">map</span>
</div>
<div class="flex flex-col items-center justify-center text-outline opacity-70 hover:text-primary transition-all cursor-pointer p-2">
<span class="material-symbols-outlined" data-icon="scroll">school</span>
</div>
<div class="flex flex-col items-center justify-center text-outline opacity-70 hover:text-primary transition-all cursor-pointer p-2">
<span class="material-symbols-outlined" data-icon="shield">shield</span>
</div>
<div class="flex flex-col items-center justify-center text-outline opacity-70 hover:text-primary transition-all cursor-pointer p-2">
<span class="material-symbols-outlined" data-icon="group">group</span>
</div>
</aside>
`;
  
  return (
    <div className={className} dangerouslySetInnerHTML={{ __html: content }} />
  );
}
