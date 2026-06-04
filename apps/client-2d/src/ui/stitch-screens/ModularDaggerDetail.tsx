import React from 'react';

interface ModularDaggerDetailProps {
  className?: string;
}

export function ModularDaggerDetail({ className = '' }: ModularDaggerDetailProps) {
  const content = `
<!-- Top Navigation Anchor -->
<nav class="fixed top-0 w-full bg-surface-dim/80 backdrop-blur-xl dark:bg-surface-dim/80 border-b border-white/10 shadow-[0_0_15px_rgba(0,229,255,0.2)] flex justify-between items-center px-margin-mobile h-touch-min z-50">
<div class="flex items-center gap-2">
<div class="w-8 h-8 rounded-full overflow-hidden border border-mana-cyan/50">
<img alt="Character Portrait" class="w-full h-full object-cover" data-alt="A close-up portrait of a fantasy sci-fi character wearing glowing high-tech armor. The lighting is cinematic with deep shadows and vibrant cyan and neon green highlights. The character has an intense expression, fitting a diamond glass UI aesthetic. The background is dark and out of focus." src="https://lh3.googleusercontent.com/aida-public/AB6AXuCc6BWNRuc3Y9e_TNit1bq6n4p-fJeP6HOpahAwP8j4TvK8SpOHF_y9sDOnzCnuDq2MQATB-3siMchEb0JgqdqqnU8iogVMrxa_TyFy5h5D1oMwYU5F2ylo9bs81529dAzuCRLd-24qMDz6Qs-vGR8t4-tVDYQ5i9q-CREE5S8DpMdoyJQMGiLJA3JIHozPUhhLFTdre-3QP3uzOIUIQkSovfeJUGY4CYySek62cK_5ywjb8ElScJBU1Ar97sColORVL0JmH-w2vxQ"/>
</div>
<span class="font-headline-md text-headline-md-mobile text-energy-amber tracking-widest uppercase">OUROBOROS</span>
</div>
<button class="text-primary dark:text-primary-fixed-dim hover:bg-white/5 p-2 rounded-full active:scale-95 transition-transform flex items-center justify-center">
<span class="material-symbols-outlined">settings</span>
</button>
</nav>
<!-- Main Content Canvas -->
<main class="pt-24 px-margin-mobile space-y-6 max-w-lg mx-auto">
<!-- Weapon Header / Hero -->
<section class="glass-panel diamond-chamfer rounded-xl p-6 relative overflow-hidden flex flex-col items-center justify-center text-center">
<div class="refraction-overlay"></div>
<div class="absolute top-4 left-4 flex gap-2">
<span class="bg-tertiary-container/80 text-tertiary font-label-caps text-label-caps px-2 py-1 rounded-sm border border-tertiary/30 neon-glow-green">EPIC</span>
<span class="bg-surface-variant/80 text-on-surface-variant font-label-caps text-label-caps px-2 py-1 rounded-sm border border-white/10">DAGGER</span>
</div>
<!-- Weapon Visualization Placeholder -->
<div class="w-48 h-48 my-4 relative">
<!-- Abstract Representation of the Sonic Dagger -->
<div class="absolute inset-0 bg-gradient-to-tr from-surface-container-lowest to-surface-container-highest rounded-full blur-xl opacity-50"></div>
<img alt="Sonic Dagger" class="w-full h-full object-contain drop-shadow-[0_0_20px_rgba(42,229,0,0.5)] mix-blend-screen" data-alt="A highly detailed, futuristic sonic dagger glowing with intense neon green energy. The blade is jagged and crystalline, reflecting light like shattered diamond glass. The hilt is dark, ergonomic, and wrapped in high-tech materials. The background is completely black to emphasize the luminous poison/venom effects radiating from the weapon." src="https://lh3.googleusercontent.com/aida-public/AB6AXuCIKp5WgWbvbFwc0i7v2BdxzcOrreI5bI3Jy58834I6rQm4d79cYujM61h46dPoxZYOtTIg0vN4UiaS5ZAhmFTT55QNundzY6R1qCF1vPknH3KtGdCjnzG6EENFTF85O6-fTu_EV3AXmRQkQTnWsdY75Bw-lZ8dVzzgAAPwyACyusHB5ollvVoQqw8GwcwDRQyS2R3XTDluAW32OPFDv8Je0TjaqGB0dbarJmWHNpIduV-ZI6VsXQTAKmGLW4XuGGajPZm6_nMNfKY"/>
</div>
<h1 class="font-display-lg-mobile text-display-lg-mobile text-mana-cyan mb-1">Viper's Kiss</h1>
<p class="font-body-md text-body-md text-on-surface-variant">Level 45 Required</p>
</section>
<!-- Stats Grid (Bento Style) -->
<section class="grid grid-cols-2 gap-4">
<!-- Damage Panel -->
<div class="glass-panel diamond-chamfer rounded-xl p-4 relative">
<div class="refraction-overlay"></div>
<div class="flex items-center gap-2 mb-2 text-on-surface-variant">
<span class="material-symbols-outlined text-mana-cyan" style="font-variation-settings: 'FILL' 1;">swords</span>
<span class="font-label-caps text-label-caps">PHYSICAL</span>
</div>
<div class="font-headline-md text-headline-md text-on-surface">420 - 550</div>
<div class="text-mana-cyan/70 font-label-sm text-label-sm mt-1">+15% Crit Rate</div>
</div>
<!-- Elemental Panel -->
<div class="glass-panel diamond-chamfer rounded-xl p-4 relative neon-glow-green border-tertiary/30">
<div class="refraction-overlay"></div>
<div class="flex items-center gap-2 mb-2 text-tertiary">
<span class="material-symbols-outlined" style="font-variation-settings: 'FILL' 1;">water_drop</span>
<span class="font-label-caps text-label-caps">VENOM DOT</span>
</div>
<div class="font-headline-md text-headline-md text-tertiary">120/sec</div>
<div class="text-tertiary/70 font-label-sm text-label-sm mt-1">Duration: 8s</div>
</div>
</section>
<!-- Modular Construction (3-part logic) -->
<section class="space-y-3">
<h2 class="font-label-caps text-label-caps text-on-surface-variant pl-2 flex items-center gap-2">
<span class="material-symbols-outlined text-sm">build</span>
                MODULAR COMPONENTS
            </h2>
<!-- Head: Jagged Edge -->
<div class="glass-panel rounded-lg p-3 flex items-center gap-4 hover:bg-white/5 transition-colors border-l-2 border-l-mana-cyan">
<div class="w-12 h-12 rounded bg-surface-container-high flex items-center justify-center border border-white/5">
<span class="material-symbols-outlined text-mana-cyan text-2xl">change_history</span>
</div>
<div class="flex-1">
<h3 class="font-body-md text-body-md text-on-surface font-semibold">Jagged Edge</h3>
<p class="font-label-sm text-label-sm text-on-surface-variant">Head • Piercing DMG +20%</p>
</div>
<span class="material-symbols-outlined text-on-surface-variant">chevron_right</span>
</div>
<!-- Grip: Ergonomic Hilt -->
<div class="glass-panel rounded-lg p-3 flex items-center gap-4 hover:bg-white/5 transition-colors border-l-2 border-l-secondary">
<div class="w-12 h-12 rounded bg-surface-container-high flex items-center justify-center border border-white/5">
<span class="material-symbols-outlined text-secondary text-2xl">drag_handle</span>
</div>
<div class="flex-1">
<h3 class="font-body-md text-body-md text-on-surface font-semibold">Ergonomic Hilt</h3>
<p class="font-label-sm text-label-sm text-on-surface-variant">Grip • Attack Speed +10%</p>
</div>
<span class="material-symbols-outlined text-on-surface-variant">chevron_right</span>
</div>
<!-- Base: Hidden Needle -->
<div class="glass-panel rounded-lg p-3 flex items-center gap-4 hover:bg-white/5 transition-colors border-l-2 border-l-tertiary">
<div class="w-12 h-12 rounded bg-surface-container-high flex items-center justify-center border border-white/5 neon-glow-green">
<span class="material-symbols-outlined text-tertiary text-2xl" style="font-variation-settings: 'FILL' 1;">science</span>
</div>
<div class="flex-1">
<h3 class="font-body-md text-body-md text-on-surface font-semibold">Hidden Needle</h3>
<p class="font-label-sm text-label-sm text-on-surface-variant">Base • Applies Poison on Crit</p>
</div>
<span class="material-symbols-outlined text-on-surface-variant">chevron_right</span>
</div>
</section>
<!-- Set Bonus Card -->
<section class="glass-panel rounded-xl p-4 relative border border-secondary/20">
<div class="absolute top-0 right-0 p-2">
<span class="material-symbols-outlined text-secondary/30 text-4xl">vpn_key</span>
</div>
<h3 class="font-label-caps text-label-caps text-secondary mb-2 flex items-center gap-2">
                SET BONUS
                <span class="bg-secondary-container/30 text-secondary px-2 py-0.5 rounded-full text-[10px]">1 / 3</span>
</h3>
<p class="font-body-md text-body-md text-on-surface font-semibold mb-1">Shadow Stalker</p>
<ul class="font-label-sm text-label-sm text-on-surface-variant space-y-1">
<li class="opacity-100 flex items-center gap-2">
<span class="w-1 h-1 rounded-full bg-secondary"></span>
<span>(2) Movement Speed +15% in Stealth</span>
</li>
<li class="opacity-50 flex items-center gap-2">
<span class="w-1 h-1 rounded-full bg-outline"></span>
<span>(3) First strike guarantees Critical Hit</span>
</li>
</ul>
</section>
<!-- Action Button -->
<button class="w-full h-12 mt-6 relative group overflow-hidden" style="clip-path: polygon(10px 0, calc(100% - 10px) 0, 100% 10px, 100% calc(100% - 10px), calc(100% - 10px) 100%, 10px 100%, 0 calc(100% - 10px), 0 10px);">
<div class="absolute inset-0 bg-energy-amber group-hover:bg-energy-amber/90 transition-colors"></div>
<div class="absolute inset-0 border-2 border-tertiary-fixed opacity-80 group-hover:opacity-100 transition-opacity"></div>
<div class="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]"></div>
<span class="relative z-10 font-label-caps text-label-caps text-white flex items-center justify-center gap-2 h-full">
                EQUIP WEAPON
                <span class="material-symbols-outlined text-sm">hardware</span>
</span>
</button>

</main>
<!-- Bottom Navigation Shell -->
<nav class="fixed bottom-0 left-0 w-full z-50 flex justify-around items-center pb-safe bg-surface-container-lowest/90 backdrop-blur-2xl dark:bg-surface-container-lowest/90 rounded-t-xl shadow-[0_-4px_20px_rgba(0,0,0,0.5)]">
<a class="flex flex-col items-center justify-center text-on-surface-variant px-4 py-2 hover:text-mana-cyan transition-colors active:brightness-125 w-1/4" href="#">
<span class="material-symbols-outlined mb-1">explore</span>
<span class="font-label-caps text-[10px] uppercase">Gathering</span>
</a>
<a class="flex flex-col items-center justify-center text-on-surface-variant px-4 py-2 hover:text-mana-cyan transition-colors active:brightness-125 w-1/4" href="#">
<span class="material-symbols-outlined mb-1">architecture</span>
<span class="font-label-caps text-[10px] uppercase">Crafting</span>
</a>
<a class="flex flex-col items-center justify-center bg-tertiary-container text-tertiary border-t-2 border-tertiary px-4 py-2 w-1/4" href="#">
<span class="material-symbols-outlined mb-1" style="font-variation-settings: 'FILL' 1;">inventory_2</span>
<span class="font-label-caps text-[10px] uppercase">Inventory</span>
</a>
<a class="flex flex-col items-center justify-center text-on-surface-variant px-4 py-2 hover:text-mana-cyan transition-colors active:brightness-125 w-1/4" href="#">
<span class="material-symbols-outlined mb-1">groups</span>
<span class="font-label-caps text-[10px] uppercase">Social</span>
</a>
</nav>
`;
  
  return (
    <div className={className} dangerouslySetInnerHTML={{ __html: content }} />
  );
}
