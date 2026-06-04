import React from 'react';

interface InteractiveWorldMapProps {
  className?: string;
}

export function InteractiveWorldMap({ className = '' }: InteractiveWorldMapProps) {
  const content = `
<!-- Background Map Layer -->
<div class="absolute inset-0 z-0 bg-cover bg-center" data-alt="A lush, detailed fantasy landscape featuring glowing blue mushrooms, ancient mossy ruins, and towering bioluminescent orange crystal formations in a dense, magical forest. The lighting is mystical and enchanting, blending deep forest greens with vibrant, otherworldly cyan and amber highlights, fitting a high-fantasy MMORPG setting." style="background-image: url('https://lh3.googleusercontent.com/aida/AP1WRLvI7-D1ob5tnMoF14PfPIYXqbXPsj1CvRwx3kJ8VIeX3YX7aHG0YfOYM21biiPrE-jSRSHFEnyQ-vBnwhvqREB-hfpejs7gvy3gzoAxiJkwEoXlznJidOYunoQm5ar6B1_9ivzjCRiqOQyrISPn7mUfeKd7XUuca6CZ48ZM4_eSPvgjeTD-mzd0GvdZku1_5GMNhz6ba_hyGujjkYEzLYU9wkaCeVeoQ6-9sN7jt9-000lSRkffYV8y_Sc');">
<!-- Technical Grid Overlay -->
<div class="absolute inset-0 map-grid mix-blend-screen opacity-70"></div>
<!-- Scanlines -->
<div class="absolute inset-0 scanlines opacity-30"></div>
</div>
<!-- Map Markers Layer -->
<div class="absolute inset-0 z-10 pointer-events-none">
<!-- City Marker 1 -->
<div class="absolute top-[30%] left-[40%] pointer-events-auto group cursor-pointer">
<div class="relative flex flex-col items-center">
<div class="w-8 h-8 rounded-full bg-surface-container-low/80 border-2 border-energy-amber flex items-center justify-center shadow-[0_0_15px_rgba(255,122,0,0.6)] z-10 marker-pulse">
<span class="material-symbols-outlined text-energy-amber" data-icon="fort" style="font-size: 18px;">fort</span>
</div>
<div class="mt-2 px-3 py-1 bg-surface-container-low/90 backdrop-blur-md rounded border border-white/10 font-label-caps text-label-caps text-energy-amber opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                    Bastion of Light
                </div>
</div>
</div>
<!-- Resource Marker 1 -->
<div class="absolute top-[60%] left-[70%] pointer-events-auto group cursor-pointer">
<div class="relative flex flex-col items-center">
<div class="w-6 h-6 rotate-45 bg-mana-cyan/20 border border-mana-cyan flex items-center justify-center shadow-[0_0_10px_rgba(0,229,255,0.4)] z-10">
<span class="material-symbols-outlined text-mana-cyan -rotate-45" data-icon="diamond" style="font-size: 14px;">diamond</span>
</div>
<div class="mt-2 px-2 py-1 bg-surface-container-low/90 backdrop-blur-md rounded border border-white/10 font-label-sm text-label-sm text-mana-cyan opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                    Aether Crystal Vein
                </div>
</div>
</div>
</div>
<!-- Top App Bar -->
<header class="bg-surface-container-low/60 backdrop-blur-xl border-b border-white/10 shadow-[0_0_15px_rgba(175,200,240,0.3)] fixed top-0 w-full flex justify-between items-center px-margin-mobile h-16 z-50">
<button class="w-touch-min h-touch-min flex items-center justify-center text-primary hover:bg-white/5 transition-colors active:scale-95 transition-transform rounded-full">
<span class="material-symbols-outlined" data-icon="menu">menu</span>
</button>
<h1 class="font-headline-md text-headline-md-mobile tracking-widest text-primary uppercase drop-shadow-[0_0_8px_rgba(175,200,240,0.8)]">
            WORLD MAP
        </h1>
<button class="w-touch-min h-touch-min flex items-center justify-center text-primary hover:bg-white/5 transition-colors active:scale-95 transition-transform rounded-full">
<span class="material-symbols-outlined" data-icon="layers">layers</span>
</button>
</header>
<!-- Floating UI - Minimap (Top Right, below header) -->
<div class="absolute top-24 right-4 z-40 hidden md:block">
<div class="diamond-glass bg-surface-container-low/80 w-48 h-48 rounded-xl chamfered-bl flex flex-col overflow-hidden">
<div class="bg-surface-container-highest/50 py-1 px-3 border-b border-white/10 flex justify-between items-center">
<span class="font-label-caps text-label-caps text-primary">SECTOR 7G</span>
<span class="material-symbols-outlined text-primary/50 text-[16px]" data-icon="my_location">my_location</span>
</div>
<div class="flex-1 relative bg-surface-dim">
<!-- Mini map representation -->
<div class="absolute inset-0 opacity-50" data-alt="Minimap thumbnail of a fantasy landscape showing glowing crystals and forest ruins." style="background-image: url('https://lh3.googleusercontent.com/aida/AP1WRLvI7-D1ob5tnMoF14PfPIYXqbXPsj1CvRwx3kJ8VIeX3YX7aHG0YfOYM21biiPrE-jSRSHFEnyQ-vBnwhvqREB-hfpejs7gvy3gzoAxiJkwEoXlznJidOYunoQm5ar6B1_9ivzjCRiqOQyrISPn7mUfeKd7XUuca6CZ48ZM4_eSPvgjeTD-mzd0GvdZku1_5GMNhz6ba_hyGujjkYEzLYU9wkaCeVeoQ6-9sN7jt9-000lSRkffYV8y_Sc'); background-size: cover; background-position: center;"></div>
<!-- Viewport indicator -->
<div class="absolute top-1/4 left-1/4 w-1/2 h-1/2 border border-mana-cyan/50 bg-mana-cyan/10"></div>
<!-- Mini markers -->
<div class="absolute top-[30%] left-[40%] w-2 h-2 rounded-full bg-energy-amber shadow-[0_0_5px_rgba(255,122,0,1)]"></div>
</div>
</div>
</div>
<!-- Floating UI - Layer Controls (Left side) -->
<div class="absolute top-1/2 -translate-y-1/2 left-4 z-40 flex flex-col gap-2">
<div class="diamond-glass bg-surface-container-low/80 rounded-lg p-2 flex flex-col gap-3">
<button class="w-10 h-10 rounded bg-primary/20 text-mana-cyan border border-mana-cyan/50 flex items-center justify-center shadow-[0_0_10px_rgba(0,229,255,0.3)]" title="Show Resources">
<span class="material-symbols-outlined fill" data-icon="landscape" data-weight="fill">landscape</span>
</button>
<button class="w-10 h-10 rounded text-on-surface-variant hover:bg-white/5 hover:text-primary transition-colors flex items-center justify-center" title="Show Factions">
<span class="material-symbols-outlined" data-icon="flag">flag</span>
</button>
<button class="w-10 h-10 rounded text-on-surface-variant hover:bg-white/5 hover:text-primary transition-colors flex items-center justify-center" title="Show Dungeons">
<span class="material-symbols-outlined" data-icon="swords">swords</span>
</button>
<div class="w-8 h-[1px] bg-white/10 mx-auto my-1"></div>
<button class="w-10 h-10 rounded text-on-surface-variant hover:bg-white/5 hover:text-primary transition-colors flex items-center justify-center" title="Settings">
<span class="material-symbols-outlined" data-icon="settings">settings</span>
</button>
</div>
</div>
<!-- Floating Action Button (Bottom Right, above nav) -->
<div class="absolute bottom-28 right-4 z-40">
<button class="hex-btn bg-energy-amber w-14 h-14 flex items-center justify-center border-2 border-tertiary shadow-[0_0_20px_rgba(255,122,0,0.4)]">
<span class="material-symbols-outlined text-void-black font-bold" data-icon="add_location">add_location</span>
</button>
</div>
<!-- Bottom Nav Bar -->
<nav class="bg-surface-container-highest/40 backdrop-blur-2xl border-t border-white/10 shadow-[0_-4px_20px_rgba(0,0,0,0.5)] fixed bottom-0 left-0 w-full z-50 flex justify-around items-center px-4 pb-4 h-20 md:hidden rounded-t-xl">
<!-- Active Tab: MAP -->
<button class="flex flex-col items-center justify-center text-energy-amber drop-shadow-[0_0_10px_rgba(255,122,0,0.6)] w-touch-min h-touch-min active:scale-90 duration-150">
<span class="material-symbols-outlined fill text-[28px]" data-icon="map" data-weight="fill">map</span>
<span class="font-label-caps text-label-caps mt-1">MAP</span>
</button>
<button class="flex flex-col items-center justify-center text-on-surface-variant/70 hover:text-primary transition-all w-touch-min h-touch-min active:scale-90 duration-150">
<span class="material-symbols-outlined text-[24px]" data-icon="scroll">school</span>
<span class="font-label-caps text-label-caps mt-1">QUESTS</span>
</button>
<button class="flex flex-col items-center justify-center text-on-surface-variant/70 hover:text-primary transition-all w-touch-min h-touch-min active:scale-90 duration-150">
<span class="material-symbols-outlined text-[24px]" data-icon="person">person</span>
<span class="font-label-caps text-label-caps mt-1">HERO</span>
</button>
<button class="flex flex-col items-center justify-center text-on-surface-variant/70 hover:text-primary transition-all w-touch-min h-touch-min active:scale-90 duration-150">
<span class="material-symbols-outlined text-[24px]" data-icon="shield">shield</span>
<span class="font-label-caps text-label-caps mt-1">GUILD</span>
</button>
<button class="flex flex-col items-center justify-center text-on-surface-variant/70 hover:text-primary transition-all w-touch-min h-touch-min active:scale-90 duration-150">
<span class="material-symbols-outlined text-[24px]" data-icon="storefront">storefront</span>
<span class="font-label-caps text-label-caps mt-1">SHOP</span>
</button>
</nav>

`;
  
  return (
    <div className={className} dangerouslySetInnerHTML={{ __html: content }} />
  );
}
