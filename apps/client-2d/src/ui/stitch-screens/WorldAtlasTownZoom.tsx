import React from 'react';

interface WorldAtlasTownZoomProps {
  className?: string;
}

export function WorldAtlasTownZoom({ className = '' }: WorldAtlasTownZoomProps) {
  const content = `
<!-- Game World Background with Grid -->
<div class="absolute inset-0 z-0">
<img alt="Game World Background" class="w-full h-full object-cover opacity-80" data-alt="A lush, isometric 2D game world background featuring a high-fantasy town or village. The scene includes detailed stone houses with glowing, faceted crystalline roofs. The environment is rich with luminescent flora, glowing mushrooms, and ancient stone paths. The overall aesthetic is 'Diamond Glass' blending Cyber-Zen mysticism with deep marine darkblue tones and vibrant neon-green and mana-cyan energy glows." src="https://lh3.googleusercontent.com/aida/AP1WRLvI7-D1ob5tnMoF14PfPIYXqbXPsj1CvRwx3kJ8VIeX3YX7aHG0YfOYM21biiPrE-jSRSHFEnyQ-vBnwhvqREB-hfpejs7gvy3gzoAxiJkwEoXlznJidOYunoQm5ar6B1_9ivzjCRiqOQyrISPn7mUfeKd7XUuca6CZ48ZM4_eSPvgjeTD-mzd0GvdZku1_5GMNhz6ba_hyGujjkYEzLYU9wkaCeVeoQ6-9sN7jt9-000lSRkffYV8y_Sc"/>
<div class="absolute inset-0 grid-overlay z-10 pointer-events-none"></div>
</div>
<!-- Map Markers (Absolute positioned for demo) -->
<div class="absolute top-1/4 left-1/4 z-20 flex flex-col items-center">
<div class="w-8 h-8 rounded-full bg-mana-cyan/20 border border-mana-cyan glow-cyan flex items-center justify-center mb-1">
<span class="material-symbols-outlined text-mana-cyan text-sm" data-icon="location_on" data-weight="fill" style="font-variation-settings: 'FILL' 1;">location_on</span>
</div>
<span class="font-label-caps text-label-caps text-mana-cyan drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">Lumen Village</span>
</div>
<div class="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-20 flex flex-col items-center">
<div class="w-12 h-12 rounded-full bg-energy-amber/20 border border-energy-amber glow-orange flex items-center justify-center mb-1 animate-pulse-glow">
<span class="material-symbols-outlined text-energy-amber text-2xl" data-icon="swords" data-weight="fill" style="font-variation-settings: 'FILL' 1;">swords</span>
</div>
<span class="font-label-caps text-label-caps text-energy-amber drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">Shattered Spire</span>
</div>
<!-- Resource/NPC Icons -->
<img alt="Merchant NPC" class="absolute top-1/3 right-1/4 w-10 h-10 object-cover rounded-full border border-mana-cyan glow-cyan z-20 cursor-pointer hover:scale-110 transition-transform" src="https://lh3.googleusercontent.com/aida/AP1WRLt6SeQahg4gq2674VDKEX0rRPuFpyH1vBUAeBAyiI561X4w_KocNnb-0LdIeX2Sy9p_kxClhfZClp1jkNgrwglnlzxb_hJMJkrety9rtn42lrWjPx_Evfgs360D4vx8WIy_XCzNFoMPXEvv6UrR5XEfsLr2IE7XXQPfjbdwkWbhAtzxpve_Sm3Rk2f0a_P5mYoJXlA76iJ66BeBpzvawCLN4EV-oBjbwI0_P7bbXUri-v66OJnCANMDA2Y"/>
<img alt="Resource Node" class="absolute bottom-1/3 left-1/3 w-8 h-8 object-cover rounded-full border border-tertiary glow-cyan z-20 cursor-pointer hover:scale-110 transition-transform" src="https://lh3.googleusercontent.com/aida/AP1WRLt6SeQahg4gq2674VDKEX0rRPuFpyH1vBUAeBAyiI561X4w_KocNnb-0LdIeX2Sy9p_kxClhfZClp1jkNgrwglnlzxb_hJMJkrety9rtn42lrWjPx_Evfgs360D4vx8WIy_XCzNFoMPXEvv6UrR5XEfsLr2IE7XXQPfjbdwkWbhAtzxpve_Sm3Rk2f0a_P5mYoJXlA76iJ66BeBpzvawCLN4EV-oBjbwI0_P7bbXUri-v66OJnCANMDA2Y"/>
<!-- TopAppBar JSON Component -->
<header class="fixed top-0 w-full z-40 bg-surface-container-low/60 backdrop-blur-xl border-b border-white/10 shadow-[0_0_15px_rgba(175,200,240,0.3)] flex justify-between items-center px-margin-mobile h-16">
<button aria-label="Menu" class="w-touch-min h-touch-min flex items-center justify-center text-primary hover:bg-white/5 transition-colors rounded-full active:scale-95 transition-transform">
<span class="material-symbols-outlined" data-icon="menu">menu</span>
</button>
<h1 class="font-headline-md text-headline-md-mobile tracking-widest text-primary uppercase drop-shadow-[0_0_8px_rgba(175,200,240,0.8)]">WORLD MAP</h1>
<button aria-label="Layers" class="w-touch-min h-touch-min flex items-center justify-center text-primary hover:bg-white/5 transition-colors rounded-full active:scale-95 transition-transform">
<span class="material-symbols-outlined" data-icon="layers">layers</span>
</button>
</header>
<!-- Zoom Slider (Right side) -->
<div class="fixed right-margin-mobile top-1/2 transform -translate-y-1/2 z-30 glass-panel rounded-full py-4 px-2 flex flex-col items-center space-y-4">
<button class="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-on-surface-variant hover:text-primary transition-colors">
<span class="material-symbols-outlined text-sm" data-icon="add">add</span>
</button>
<div class="h-32 w-1 bg-surface-container-high rounded-full relative">
<!-- Slider Track -->
<div class="absolute bottom-0 left-0 w-full bg-mana-cyan h-full rounded-full glow-cyan"></div>
<!-- Slider Thumb -->
<div class="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full border-2 border-mana-cyan shadow-[0_0_10px_rgba(0,229,255,0.8)] cursor-pointer"></div>
</div>
<button class="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-on-surface-variant hover:text-primary transition-colors">
<span class="material-symbols-outlined text-sm" data-icon="remove">remove</span>
</button>
</div>
<!-- Central Overlay: Group Finder Popup -->
<div class="fixed inset-0 z-50 flex items-center justify-center px-margin-mobile pointer-events-none">
<div class="glass-panel w-full max-w-sm rounded-xl p-gutter pointer-events-auto relative overflow-hidden">
<!-- Refraction Overlay -->
<div class="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent pointer-events-none"></div>
<div class="relative z-10">
<div class="flex items-center justify-between mb-4 border-b border-white/10 pb-2">
<h2 class="font-label-caps text-label-caps text-energy-amber flex items-center gap-2">
<span class="material-symbols-outlined text-lg" data-icon="group" data-weight="fill" style="font-variation-settings: 'FILL' 1;">group</span>
                        DUNGEON FOUND
                    </h2>
<button class="text-on-surface-variant hover:text-white transition-colors">
<span class="material-symbols-outlined text-sm" data-icon="close">close</span>
</button>
</div>
<h3 class="font-headline-md text-headline-md-mobile text-white mb-6 text-center drop-shadow-md">SHATTERED SPIRE</h3>
<div class="space-y-3 mb-6">
<!-- Party Item 1 -->
<div class="bg-surface-container-high/50 rounded-lg p-3 border border-white/5 flex justify-between items-center">
<div>
<p class="font-body-md text-sm text-white mb-1">Aether Knights</p>
<div class="flex gap-1">
<span class="w-4 h-4 rounded-full bg-blue-500/50 border border-blue-400 flex items-center justify-center"><span class="material-symbols-outlined text-[10px] text-white" data-icon="shield" data-weight="fill" style="font-variation-settings: 'FILL' 1;">shield</span></span>
<span class="w-4 h-4 rounded-full bg-red-500/50 border border-red-400 flex items-center justify-center"><span class="material-symbols-outlined text-[10px] text-white" data-icon="swords" data-weight="fill" style="font-variation-settings: 'FILL' 1;">swords</span></span>
<span class="w-4 h-4 rounded-full bg-red-500/50 border border-red-400 flex items-center justify-center"><span class="material-symbols-outlined text-[10px] text-white" data-icon="swords" data-weight="fill" style="font-variation-settings: 'FILL' 1;">swords</span></span>
<span class="w-4 h-4 rounded-full border border-dashed border-tertiary flex items-center justify-center"><span class="material-symbols-outlined text-[10px] text-tertiary" data-icon="favorite">favorite</span></span>
</div>
</div>
<span class="font-label-sm text-label-sm text-on-surface-variant">Looking for Healer</span>
</div>
<!-- Party Item 2 -->
<div class="bg-surface-container-high/50 rounded-lg p-3 border border-white/5 flex justify-between items-center">
<div>
<p class="font-body-md text-sm text-white mb-1">Shadow Walkers</p>
<div class="flex gap-1">
<span class="w-4 h-4 rounded-full border border-dashed border-blue-400 flex items-center justify-center"><span class="material-symbols-outlined text-[10px] text-blue-400" data-icon="shield">shield</span></span>
<span class="w-4 h-4 rounded-full bg-red-500/50 border border-red-400 flex items-center justify-center"><span class="material-symbols-outlined text-[10px] text-white" data-icon="swords" data-weight="fill" style="font-variation-settings: 'FILL' 1;">swords</span></span>
<span class="w-4 h-4 rounded-full bg-tertiary/50 border border-tertiary flex items-center justify-center"><span class="material-symbols-outlined text-[10px] text-white" data-icon="favorite" data-weight="fill" style="font-variation-settings: 'FILL' 1;">favorite</span></span>
<span class="w-4 h-4 rounded-full border border-dashed border-red-400 flex items-center justify-center"><span class="material-symbols-outlined text-[10px] text-red-400" data-icon="swords">swords</span></span>
</div>
</div>
<span class="font-label-sm text-label-sm text-on-surface-variant">Need Tank &amp; DPS</span>
</div>
</div>
<button class="hex-btn w-full bg-energy-amber border-2 border-[#2ae500] text-on-secondary-fixed py-3 font-headline-md text-base uppercase tracking-wider glow-orange animate-pulse-glow hover:brightness-110 transition-all active:scale-95">
                    JOIN QUEUE
                </button>
</div>
</div>
</div>
<!-- BottomNavBar JSON Component -->
<nav class="fixed bottom-0 left-0 w-full z-50 flex justify-around items-center px-4 pb-4 h-20 bg-surface-container-highest/40 backdrop-blur-2xl border-t border-white/10 shadow-[0_-4px_20px_rgba(0,0,0,0.5)] rounded-t-xl md:hidden">
<!-- MAP (Active) -->
<a class="flex flex-col items-center justify-center text-energy-amber drop-shadow-[0_0_10px_rgba(255,122,0,0.6)] w-touch-min h-touch-min active:scale-90 duration-150" href="#">
<span class="material-symbols-outlined mb-1" data-icon="map" data-weight="fill" style="font-variation-settings: 'FILL' 1;">map</span>
<span class="font-label-caps text-label-caps">MAP</span>
</a>
<!-- QUESTS -->
<a class="flex flex-col items-center justify-center text-on-surface-variant/70 hover:text-primary transition-all w-touch-min h-touch-min active:scale-90 duration-150" href="#">
<span class="material-symbols-outlined mb-1" data-icon="scroll">school</span>
<span class="font-label-caps text-label-caps">QUESTS</span>
</a>
<!-- HERO -->
<a class="flex flex-col items-center justify-center text-on-surface-variant/70 hover:text-primary transition-all w-touch-min h-touch-min active:scale-90 duration-150" href="#">
<span class="material-symbols-outlined mb-1" data-icon="person">person</span>
<span class="font-label-caps text-label-caps">HERO</span>
</a>
<!-- GUILD -->
<a class="flex flex-col items-center justify-center text-on-surface-variant/70 hover:text-primary transition-all w-touch-min h-touch-min active:scale-90 duration-150" href="#">
<span class="material-symbols-outlined mb-1" data-icon="shield">shield</span>
<span class="font-label-caps text-label-caps">GUILD</span>
</a>
<!-- SHOP -->
<a class="flex flex-col items-center justify-center text-on-surface-variant/70 hover:text-primary transition-all w-touch-min h-touch-min active:scale-90 duration-150" href="#">
<span class="material-symbols-outlined mb-1" data-icon="storefront">storefront</span>
<span class="font-label-caps text-label-caps">SHOP</span>
</a>
</nav>

`;
  
  return (
    <div className={className} dangerouslySetInnerHTML={{ __html: content }} />
  );
}
