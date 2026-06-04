import React from 'react';

interface ModularItemDetailViewProps {
  className?: string;
}

export function ModularItemDetailView({ className = '' }: ModularItemDetailViewProps) {
  const content = `
<!-- Ambient Background -->
<div class="fixed inset-0 z-[-1] bg-[url('https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&amp;w=2564&amp;auto=format&amp;fit=crop')] bg-cover bg-center opacity-30" data-alt="A deep marine blue oceanic void, swirling with subtle mana-cyan energy currents. The aesthetic is 'Diamond Glass' from ARELORIAN, blending ancient mystical serenity with futuristic precision. The lighting is moody and refractive, evoking the feeling of being deep underwater yet surrounded by high-tech crystalline structures. Deep blacks and vibrant energy highlights dominate the scene."></div>
<div class="fixed inset-0 z-[-1] bg-gradient-to-t from-deep-space via-transparent to-deep-space opacity-80"></div>
<!-- TopAppBar -->
<header class="bg-surface-dim/80 backdrop-blur-xl dark:bg-surface-dim/80 fixed top-0 w-full border-b border-white/10 shadow-[0_0_15px_rgba(0,229,255,0.2)] flex justify-between items-center px-margin-mobile h-touch-min z-50">
<div class="flex items-center gap-4">
<button class="text-on-surface-variant hover:bg-white/5 active:scale-95 transition-transform p-2 rounded-full">
<span class="material-symbols-outlined" data-icon="arrow_back">arrow_back</span>
</button>
<span class="font-headline-md text-headline-md-mobile text-energy-amber tracking-widest">OUROBOROS</span>
</div>
<button class="text-primary dark:text-primary-fixed-dim hover:bg-white/5 active:scale-95 transition-transform p-2 rounded-full">
<span class="material-symbols-outlined" data-icon="settings">settings</span>
</button>
</header>
<!-- Main Content Canvas -->
<main class="flex-1 mt-[60px] pb-[80px] p-margin-tablet flex flex-col md:flex-row gap-gutter h-[calc(100vh-140px)]">
<!-- Center Stage: 3D Sword View (simulated) -->
<div class="flex-1 glass-panel diamond-edge rounded-xl relative flex items-center justify-center overflow-hidden">
<!-- Refraction Overlay -->
<div class="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent pointer-events-none"></div>
<img alt="Mythic Greatsword" class="max-h-[80%] object-contain mix-blend-screen opacity-80" data-alt="A highly detailed, 2.5D crystalline mythic greatsword from the MMORPG ARELORIAN. The weapon features sharp, faceted geometric shapes typical of the 'Diamond Glass' aesthetic. Glowing runes in mana-cyan run along the blade, and the hilt incorporates sunset-orange energy cores. The sword appears to float in a deep marine-blue void, illuminated by high-refractive translucency and sophisticated light play." src="https://lh3.googleusercontent.com/aida-public/AB6AXuBsE8CoTkN9WIPLeTM2rP1Xa5z66d3Vp7ZO5_FjqN3w-aEfERRJQaiBJZoSZuT6k5EbGOtmLkLMPWV6M6La7lPEjs7YwsrxJbGs6M27w6DC24GufCX8ll0yDC-JRPvg2XUfrIDR0cpo0GvGv9bClWuMTj-90qWNRQxa6QpD4gapWj4Aj2o7oWi6j91WiRgwh2kO8_ulUXqSOS97tByC9_SDCqa1MzKB83oX67aJmdrrdUaLNKgJvXFRPSpNboPFX3xrxZdp2l4nvB0"/>
<!-- Hotspots -->
<div class="absolute top-[20%] right-[30%] flex items-center gap-2">
<div class="w-3 h-3 bg-mana-cyan rounded-full animate-ping"></div>
<div class="w-3 h-3 bg-mana-cyan rounded-full absolute"></div>
<span class="font-label-caps text-label-caps text-mana-cyan bg-surface/50 px-2 py-1 rounded backdrop-blur-md border border-mana-cyan/30">ASTRAL BLADE</span>
</div>
<div class="absolute bottom-[30%] left-[40%] flex items-center gap-2">
<span class="font-label-caps text-label-caps text-energy-amber bg-surface/50 px-2 py-1 rounded backdrop-blur-md border border-energy-amber/30">SOLAR CORE HILT</span>
<div class="relative">
<div class="w-3 h-3 bg-energy-amber rounded-full animate-ping"></div>
<div class="w-3 h-3 bg-energy-amber rounded-full absolute top-0 left-0"></div>
</div>
</div>
</div>
<!-- Right Panel: Stats & Modular Components -->
<div class="w-full md:w-[400px] flex flex-col gap-gutter overflow-y-auto pr-2 custom-scrollbar">
<!-- Item Header -->
<div class="glass-panel rounded-xl p-6 flex flex-col gap-4">
<div>
<div class="flex justify-between items-start mb-2">
<h1 class="font-display-lg-mobile text-display-lg-mobile text-mana-cyan drop-shadow-[0_0_10px_rgba(0,229,255,0.5)]">AEON'S EDGE</h1>
<span class="bg-tertiary-fixed-dim/20 text-tertiary-fixed-dim border border-tertiary-fixed-dim/50 px-3 py-1 rounded-sm font-label-caps text-label-caps diamond-edge">MYTHIC</span>
</div>
<p class="font-body-md text-body-md text-on-surface-variant">Two-Handed Greatsword • Lvl 60 Req.</p>
</div>
<!-- Primary Stats -->
<div class="grid grid-cols-2 gap-4 mt-4">
<div class="bg-surface-container-highest/50 p-4 rounded-lg border-l-2 border-energy-amber">
<div class="font-label-sm text-label-sm text-on-surface-variant mb-1 uppercase">Damage</div>
<div class="font-headline-md text-headline-md text-on-surface">1,450 - 1,820</div>
</div>
<div class="bg-surface-container-highest/50 p-4 rounded-lg border-l-2 border-mana-cyan">
<div class="font-label-sm text-label-sm text-on-surface-variant mb-1 uppercase">Attack Speed</div>
<div class="font-headline-md text-headline-md text-on-surface">0.85 <span class="text-body-md text-on-surface-variant">/sec</span></div>
</div>
</div>
</div>
<!-- Components Breakdown -->
<div class="glass-panel rounded-xl p-6 flex-1">
<h3 class="font-headline-md text-headline-md text-on-surface mb-6 flex items-center gap-2">
<span class="material-symbols-outlined text-energy-amber" data-icon="extension">extension</span>
                    Modular Components
                </h3>
<div class="flex flex-col gap-4">
<!-- Blade -->
<div class="flex items-center gap-4 bg-surface-container-low/50 p-3 rounded-lg border border-white/5 hover:border-mana-cyan/30 transition-colors cursor-pointer group">
<div class="w-12 h-12 bg-surface-container rounded flex items-center justify-center border border-mana-cyan/20">
<span class="material-symbols-outlined text-mana-cyan" data-icon="swords">swords</span>
</div>
<div class="flex-1">
<div class="flex justify-between">
<span class="font-body-lg text-body-lg text-on-surface">Astral Edge</span>
<span class="font-label-caps text-label-caps text-tertiary-fixed-dim">LEGENDARY</span>
</div>
<div class="font-label-sm text-label-sm text-on-surface-variant mt-1">+450 Base Dmg, +15% Crit Chance</div>
</div>
</div>
<!-- Hilt -->
<div class="flex items-center gap-4 bg-surface-container-low/50 p-3 rounded-lg border border-white/5 hover:border-energy-amber/30 transition-colors cursor-pointer group">
<div class="w-12 h-12 bg-surface-container rounded flex items-center justify-center border border-energy-amber/20">
<span class="material-symbols-outlined text-energy-amber" data-icon="hardware">hardware</span>
</div>
<div class="flex-1">
<div class="flex justify-between">
<span class="font-body-lg text-body-lg text-on-surface">Solar Core</span>
<span class="font-label-caps text-label-caps text-secondary-fixed-dim">EPIC</span>
</div>
<div class="font-label-sm text-label-sm text-on-surface-variant mt-1">+20% Fire Dmg, +50 Stamina</div>
</div>
</div>
<!-- Pommel -->
<div class="flex items-center gap-4 bg-surface-container-low/50 p-3 rounded-lg border border-white/5 hover:border-primary-fixed-dim/30 transition-colors cursor-pointer group">
<div class="w-12 h-12 bg-surface-container rounded flex items-center justify-center border border-primary-fixed-dim/20">
<span class="material-symbols-outlined text-primary-fixed-dim" data-icon="circle">circle</span>
</div>
<div class="flex-1">
<div class="flex justify-between">
<span class="font-body-lg text-body-lg text-on-surface">Void Weight</span>
<span class="font-label-caps text-label-caps text-primary-fixed-dim">RARE</span>
</div>
<div class="font-label-sm text-label-sm text-on-surface-variant mt-1">Armor Penetration +10%</div>
</div>
</div>
</div>
</div>
<!-- Actions -->
<div class="flex gap-4 mt-2">
<button class="flex-1 bg-surface-container-high border border-white/10 font-label-caps text-label-caps py-4 rounded-lg hover:bg-white/5 transition-colors">COMPARE</button>
<button class="flex-[2] bg-energy-amber/20 border-2 border-energy-amber text-energy-amber font-label-caps text-label-caps py-4 rounded-lg hex-btn glow-pulse hover:bg-energy-amber/40 transition-colors">EQUIP</button>
</div>
</div>
</main>
<!-- BottomNavBar -->
<nav class="fixed bottom-0 left-0 w-full z-50 flex justify-around items-center pb-safe bg-surface-container-lowest/90 backdrop-blur-2xl dark:bg-surface-container-lowest/90 border-t border-white/10 shadow-[0_-4px_20px_rgba(0,0,0,0.5)] rounded-t-xl h-[80px]">
<button class="flex flex-col items-center justify-center text-on-surface-variant px-4 py-2 hover:text-mana-cyan transition-colors active:brightness-125">
<span class="material-symbols-outlined" data-icon="explore">explore</span>
<span class="font-label-caps text-label-caps mt-1">Gathering</span>
</button>
<button class="flex flex-col items-center justify-center text-on-surface-variant px-4 py-2 hover:text-mana-cyan transition-colors active:brightness-125">
<span class="material-symbols-outlined" data-icon="architecture">architecture</span>
<span class="font-label-caps text-label-caps mt-1">Crafting</span>
</button>
<button class="flex flex-col items-center justify-center bg-tertiary-container text-tertiary border-t-2 border-tertiary px-4 py-2 hover:text-mana-cyan transition-colors active:brightness-125">
<span class="material-symbols-outlined" data-icon="inventory_2">inventory_2</span>
<span class="font-label-caps text-label-caps mt-1">Inventory</span>
</button>
<button class="flex flex-col items-center justify-center text-on-surface-variant px-4 py-2 hover:text-mana-cyan transition-colors active:brightness-125">
<span class="material-symbols-outlined" data-icon="groups">groups</span>
<span class="font-label-caps text-label-caps mt-1">Social</span>
</button>
</nav>

`;
  
  return (
    <div className={className} dangerouslySetInnerHTML={{ __html: content }} />
  );
}
