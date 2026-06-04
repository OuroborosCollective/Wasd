import React from 'react';

interface ModularAxeDetailProps {
  className?: string;
}

export function ModularAxeDetail({ className = '' }: ModularAxeDetailProps) {
  const content = `
<!-- Sub-page Header (Navigation shell suppressed per intent rules) -->
<header class="fixed top-0 w-full z-50 glass-panel border-b-0 h-[72px] flex items-center px-margin-mobile justify-between shadow-[0_0_20px_rgba(0,0,0,0.8)]">
<button class="w-touch-min h-touch-min flex items-center justify-center rounded-full hover:bg-white/5 active:scale-95 transition-all text-on-surface-variant">
<span class="material-symbols-outlined">arrow_back</span>
</button>
<div class="flex flex-col items-center">
<span class="font-label-caps text-label-caps text-mana-cyan tracking-widest opacity-80">Weapon Details</span>
</div>
<button class="w-touch-min h-touch-min flex items-center justify-center rounded-full hover:bg-white/5 active:scale-95 text-on-surface-variant">
<span class="material-symbols-outlined">more_vert</span>
</button>
</header>
<main class="flex-1 pt-[88px] pb-[120px] px-margin-mobile flex flex-col gap-6 relative">
<!-- Ambient Background Glow -->
<div class="absolute top-20 left-1/2 -translate-x-1/2 w-[300px] h-[300px] bg-mana-cyan/10 rounded-full blur-[80px] pointer-events-none"></div>
<!-- Hero Item Showcase -->
<section class="relative w-full aspect-square glass-panel glass-edge-glow rounded-xl flex items-center justify-center overflow-hidden">
<div class="refraction-overlay"></div>
<!-- Rarity Tag -->
<div class="absolute top-4 left-4 bg-secondary-container/20 border border-energy-amber/50 px-3 py-1 rounded flex items-center gap-2 backdrop-blur-md z-10">
<span class="w-2 h-2 rounded-full bg-energy-amber shadow-[0_0_8px_theme('colors.energy-amber')] animate-pulse"></span>
<span class="font-label-caps text-label-caps text-energy-amber">Legendary</span>
</div>
<!-- Elemental Tag -->
<div class="absolute top-4 right-4 bg-primary-container/30 border border-mana-cyan/30 px-3 py-1 rounded flex items-center gap-1 backdrop-blur-md z-10">
<span class="material-symbols-outlined text-[16px] text-mana-cyan" style="font-variation-settings: 'FILL' 1;">ac_unit</span>
<span class="font-label-caps text-label-caps text-mana-cyan">Frost</span>
</div>
<img alt="Frost-Bite Greataxe" class="w-4/5 h-4/5 object-contain drop-shadow-[0_0_30px_rgba(0,229,255,0.3)] z-0 mix-blend-screen relative hover:scale-105 transition-transform duration-700 ease-out" data-alt="A highly detailed, imposing 2H battle axe named Frost-Bite Greataxe floating in a dark, ethereal void. The weapon features a heavy cleaver head radiating a cold, frosty cyan aura, an obsidian handle with subtle crystalline textures, and a heavy, weighted dark metal pommel. The style is hyper-realistic fantasy-science fiction, lit by dramatic, high-contrast cyan and deep blue lighting against a pure black background, highlighting the sharp, diamond-glass edges." src="https://lh3.googleusercontent.com/aida-public/AB6AXuAdyug0S8mCag9GNRfdpESEldZQUJ-CwsGJIDtKeWtNY1yMQoLmafjlEU2yug1mzeCVgKSh6ReJgjQCHx9wXlqZkktqhFTGL1BiMQRiHni_LfmVms-QZqnKvjloN2lyF_Qp_KqqS1tax0lGIklVcGwMRhtlmD6fuPrp3yh4YcdRM2MWkKTC-2Jjt6nmHdVfRRTQKea4K4h96LwWwLzUIth28hdzF224F5YleGgppLWnL8uDeaBUcFgeB0NLLDjIzZsmZRO083qzzdM"/>
</section>
<!-- Title & Primary Stats -->
<section class="flex flex-col gap-2 text-center">
<h1 class="font-display-lg-mobile text-display-lg-mobile text-on-surface drop-shadow-md">Frost-Bite Greataxe</h1>
<p class="font-body-md text-body-md text-on-surface-variant">2H Battle Axe • Level 45 Required</p>
</section>
<!-- Bento Grid: Quick Stats -->
<section class="grid grid-cols-3 gap-3">
<div class="glass-panel rounded-lg p-3 flex flex-col items-center justify-center gap-1">
<span class="material-symbols-outlined text-energy-amber">swords</span>
<span class="font-headline-md text-headline-md text-on-surface">340</span>
<span class="font-label-sm text-label-sm text-on-surface-variant uppercase">Damage</span>
</div>
<div class="glass-panel rounded-lg p-3 flex flex-col items-center justify-center gap-1">
<span class="material-symbols-outlined text-mana-cyan">speed</span>
<span class="font-headline-md text-headline-md text-on-surface">0.8</span>
<span class="font-label-sm text-label-sm text-on-surface-variant uppercase">Speed</span>
</div>
<div class="glass-panel rounded-lg p-3 flex flex-col items-center justify-center gap-1">
<span class="material-symbols-outlined text-tertiary">fitness_center</span>
<span class="font-headline-md text-headline-md text-on-surface">24kg</span>
<span class="font-label-sm text-label-sm text-on-surface-variant uppercase">Weight</span>
</div>
</section>
<!-- Modular Components Section -->
<section class="flex flex-col gap-4 mt-2">
<div class="flex items-center gap-2 mb-1">
<span class="material-symbols-outlined text-mana-cyan" style="font-variation-settings: 'FILL' 1;">widgets</span>
<h2 class="font-headline-md text-headline-md text-on-surface text-lg">Modular Construction</h2>
</div>
<!-- Part 1 -->
<div class="glass-panel rounded-xl p-4 flex gap-4 items-center border-l-2 border-l-energy-amber bg-gradient-to-r from-energy-amber/5 to-transparent relative overflow-hidden">
<div class="refraction-overlay"></div>
<div class="w-12 h-12 rounded bg-surface-container-lowest flex items-center justify-center border border-white/5 shrink-0 z-10">
<span class="material-symbols-outlined text-energy-amber">hardware</span>
</div>
<div class="flex flex-col z-10">
<span class="font-label-sm text-label-sm text-energy-amber uppercase tracking-wider">Head Component</span>
<span class="font-body-md text-body-md font-bold text-on-surface">Heavy Cleaver Head</span>
<span class="font-label-sm text-label-sm text-on-surface-variant mt-1">+15% Critical Damage multiplier. Causes minor bleeding.</span>
</div>
</div>
<!-- Part 2 -->
<div class="glass-panel rounded-xl p-4 flex gap-4 items-center border-l-2 border-l-mana-cyan bg-gradient-to-r from-mana-cyan/5 to-transparent relative overflow-hidden">
<div class="refraction-overlay"></div>
<div class="w-12 h-12 rounded bg-surface-container-lowest flex items-center justify-center border border-white/5 shrink-0 z-10">
<span class="material-symbols-outlined text-mana-cyan">straight</span>
</div>
<div class="flex flex-col z-10">
<span class="font-label-sm text-label-sm text-mana-cyan uppercase tracking-wider">Handle Component</span>
<span class="font-body-md text-body-md font-bold text-on-surface">Obsidian Handle</span>
<span class="font-label-sm text-label-sm text-on-surface-variant mt-1">Absorbs shock, increasing swing stability by 20%.</span>
</div>
</div>
<!-- Part 3 -->
<div class="glass-panel rounded-xl p-4 flex gap-4 items-center border-l-2 border-l-tertiary bg-gradient-to-r from-tertiary/5 to-transparent relative overflow-hidden">
<div class="refraction-overlay"></div>
<div class="w-12 h-12 rounded bg-surface-container-lowest flex items-center justify-center border border-white/5 shrink-0 z-10">
<span class="material-symbols-outlined text-tertiary">anchor</span>
</div>
<div class="flex flex-col z-10">
<span class="font-label-sm text-label-sm text-tertiary uppercase tracking-wider">Pommel Component</span>
<span class="font-body-md text-body-md font-bold text-on-surface">Weighted Pommel</span>
<span class="font-label-sm text-label-sm text-on-surface-variant mt-1">Shifts center of mass, enabling sweeping attacks.</span>
</div>
</div>
</section>
<!-- Effects & Set Bonuses -->
<section class="glass-panel rounded-xl p-5 flex flex-col gap-4 mt-2 relative overflow-hidden">
<div class="refraction-overlay"></div>
<div class="flex flex-col gap-2 z-10">
<div class="flex justify-between items-center">
<span class="font-label-caps text-label-caps text-on-surface-variant">Elemental Effect</span>
<span class="font-body-md text-body-md text-mana-cyan font-bold drop-shadow-[0_0_5px_rgba(0,229,255,0.5)]">Frost Damage (+40)</span>
</div>
<!-- Scanning Progress Bar for Frost effect intensity -->
<div class="w-full h-2 bg-surface-container-lowest rounded-full overflow-hidden border border-black/50 shadow-inner relative">
<div class="h-full bg-mana-cyan w-[60%] relative">
<div class="absolute top-0 bottom-0 left-0 right-0 bg-gradient-to-r from-transparent via-white/50 to-transparent translate-x-[-100%] animate-[scan_2s_ease-in-out_infinite]"></div>
</div>
</div>
</div>
<div class="h-[1px] w-full bg-white/10 my-2 z-10"></div>
<div class="flex flex-col gap-2 z-10">
<div class="flex items-center gap-2">
<span class="material-symbols-outlined text-energy-amber text-[18px]">verified_user</span>
<span class="font-label-caps text-label-caps text-energy-amber">Set Bonus Active</span>
</div>
<p class="font-body-md text-body-md text-on-surface font-semibold">Vanguard's Might (3/5)</p>
<ul class="flex flex-col gap-1 mt-1">
<li class="font-label-sm text-label-sm text-on-surface-variant flex items-center gap-2">
<span class="w-1 h-1 rounded-full bg-on-surface-variant"></span>
                        (2) +50 Total Health
                    </li>
<li class="font-label-sm text-label-sm text-energy-amber flex items-center gap-2 drop-shadow-[0_0_2px_rgba(255,122,0,0.3)]">
<span class="w-1 h-1 rounded-full bg-energy-amber"></span>
                        (3) Cleave attacks apply Frostbite
                    </li>
<li class="font-label-sm text-label-sm text-on-surface-variant/50 flex items-center gap-2">
<span class="w-1 h-1 rounded-full bg-on-surface-variant/50"></span>
                        (5) Gain 'Unstoppable' aura for 5s after kill
                    </li>
</ul>
</div>
</section>
</main>
<!-- Fixed Action Bar at Bottom -->
<footer class="fixed bottom-0 w-full glass-panel border-t border-white/5 p-margin-mobile flex gap-4 items-center z-50 bg-surface-container-highest/80">
<button class="w-touch-min h-touch-min rounded-lg border border-white/10 flex items-center justify-center hover:bg-white/5 active:scale-95 transition-all text-on-surface">
<span class="material-symbols-outlined">compare_arrows</span>
</button>
<button class="flex-1 hex-button h-12 shadow-[0_0_15px_rgba(255,122,0,0.3)] hover:shadow-[0_0_25px_rgba(255,122,0,0.5)] transition-all">
<div class="hex-button-content w-full h-full flex items-center justify-center gap-2">
<span class="material-symbols-outlined text-energy-amber text-[20px]" style="font-variation-settings: 'FILL' 1;">swords</span>
<span class="font-label-caps text-label-caps text-energy-amber text-glow-orange font-bold">EQUIP WEAPON</span>
</div>
</button>
</footer>

`;
  
  return (
    <div className={className} dangerouslySetInnerHTML={{ __html: content }} />
  );
}
