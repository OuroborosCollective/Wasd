import React from 'react';

interface ModularSpearDetailProps {
  className?: string;
}

export function ModularSpearDetail({ className = '' }: ModularSpearDetailProps) {
  const content = `
<!-- TopAppBar -->
<header class="bg-surface-dim/80 backdrop-blur-xl dark:bg-surface-dim/80 fixed top-0 w-full border-b border-white/10 shadow-[0_0_15px_rgba(0,229,255,0.2)] flex justify-between items-center px-margin-mobile h-touch-min z-50">
<div class="flex items-center gap-3">
<button class="text-on-surface-variant hover:bg-white/5 active:scale-95 transition-transform rounded-full p-1 flex items-center justify-center">
<span class="material-symbols-outlined">arrow_back</span>
</button>
</div>
<h1 class="font-headline-md text-headline-md-mobile text-energy-amber tracking-widest text-glow uppercase">OUROBOROS</h1>
<div class="flex items-center gap-3 text-primary dark:text-primary-fixed-dim">
<button class="hover:bg-white/5 active:scale-95 transition-transform rounded-full p-1 flex items-center justify-center">
<span class="material-symbols-outlined">settings</span>
</button>
</div>
</header>
<!-- Main Canvas -->
<main class="pt-[60px] px-margin-mobile flex flex-col gap-unit relative">
<!-- Weapon Header Plate -->
<section class="diamond-glass chamfered rounded-lg p-gutter mt-unit flex flex-col items-center justify-center text-center relative glow-orange">
<!-- Weapon Render Placeholder -->
<div class="w-full h-48 mb-4 relative">
<img alt="Luminous Pike Render" class="w-full h-full object-contain drop-shadow-[0_0_20px_rgba(255,122,0,0.5)]" data-alt="A glowing, hyper-detailed 3D render of a futuristic fantasy spear, 'Luminous Pike'. The spear features a sharp, crystalline tip emitting bright white and sunset orange energy. The shaft is dark, reinforced metallic carbon-fiber, and the base has a complex, glowing counterweight. Set against a deep, oceanic dark blue void with subtle refraction effects and high-fidelity texturing, perfect for a high-end mobile MMORPG item inspection screen." src="https://lh3.googleusercontent.com/aida-public/AB6AXuCEgfWaWd7lXjxWxAkx4ief7N3ApIaJ6AjYpsRj-vpCYksYG7QF02R1oe51LyEZkYBjlPqTXfY5iWin8YN82F-UE_q25W5jutS4iqbwNRua6HBdZUcB_G98RDG1OxkTn_pGyFa5WFNBFg2czFB0oLE6RY-beQZCJMVgk1VeZFOPI6tdXpVPpgNGJuN7ERVVW6UUVtu-51qoy90zxYS2_oXT58J_Ogo7iySSibP9lEDTShQOvpP28VWPJ2yD7NLazb-GAer04z0RXpI"/>
</div>
<div class="inline-flex items-center gap-2 bg-secondary-container/20 px-3 py-1 rounded-full border border-secondary-container/50 mb-2">
<span class="w-2 h-2 rounded-full bg-energy-amber shadow-[0_0_8px_#FF7A00]"></span>
<span class="font-label-caps text-label-caps text-energy-amber">RARE · 1H GUARDIAN SPEAR</span>
</div>
<h2 class="font-display-lg-mobile text-display-lg-mobile text-on-surface mb-1">Luminous Pike</h2>
<p class="font-body-md text-body-md text-on-surface-variant flex items-center gap-1 justify-center">
<span class="material-symbols-outlined text-[16px] text-mana-cyan">swords</span>
                Base DMG: 142 - 168
            </p>
</section>
<!-- Stats Grid -->
<section class="grid grid-cols-2 gap-unit">
<div class="diamond-glass rounded-DEFAULT p-3 flex flex-col items-start border-l-2 border-l-energy-amber">
<span class="font-label-sm text-label-sm text-on-surface-variant uppercase mb-1">Light/Holy DMG</span>
<span class="font-headline-md text-headline-md-mobile text-energy-amber flex items-center gap-1">
<span class="material-symbols-outlined text-[20px]">bolt</span> +45
                </span>
</div>
<div class="diamond-glass rounded-DEFAULT p-3 flex flex-col items-start border-l-2 border-l-mana-cyan">
<span class="font-label-sm text-label-sm text-on-surface-variant uppercase mb-1">Crit Rate</span>
<span class="font-headline-md text-headline-md-mobile text-mana-cyan flex items-center gap-1">
<span class="material-symbols-outlined text-[20px]">target</span> 12.5%
                </span>
</div>
</section>
<!-- Modular Parts -->
<section class="flex flex-col gap-unit mt-2">
<h3 class="font-label-caps text-label-caps text-on-surface-variant border-b border-white/10 pb-1 mb-1">MODULAR COMPONENTS</h3>
<!-- Tip -->
<div class="diamond-glass rounded-lg p-3 flex items-center gap-3">
<div class="w-12 h-12 bg-surface-container-high rounded flex items-center justify-center border border-energy-amber/30">
<span class="material-symbols-outlined text-energy-amber">flare</span>
</div>
<div class="flex-1">
<h4 class="font-body-md text-body-md font-bold text-on-surface leading-tight">Crystalline Tip</h4>
<p class="font-label-sm text-label-sm text-on-surface-variant">Converts 20% physical DMG to Holy.</p>
</div>
<button class="text-primary hover:text-energy-amber transition-colors">
<span class="material-symbols-outlined">sync</span>
</button>
</div>
<!-- Shaft -->
<div class="diamond-glass rounded-lg p-3 flex items-center gap-3">
<div class="w-12 h-12 bg-surface-container-high rounded flex items-center justify-center border border-white/10">
<span class="material-symbols-outlined text-on-surface-variant">linear_scale</span>
</div>
<div class="flex-1">
<h4 class="font-body-md text-body-md font-bold text-on-surface leading-tight">Reinforced Shaft</h4>
<p class="font-label-sm text-label-sm text-on-surface-variant">+15 Block Strength, +5% Parry.</p>
</div>
<button class="text-primary hover:text-energy-amber transition-colors">
<span class="material-symbols-outlined">sync</span>
</button>
</div>
<!-- Counterweight -->
<div class="diamond-glass rounded-lg p-3 flex items-center gap-3">
<div class="w-12 h-12 bg-surface-container-high rounded flex items-center justify-center border border-mana-cyan/30">
<span class="material-symbols-outlined text-mana-cyan">fitness_center</span>
</div>
<div class="flex-1">
<h4 class="font-body-md text-body-md font-bold text-on-surface leading-tight">Counterweight Cord</h4>
<p class="font-label-sm text-label-sm text-on-surface-variant">Reduces thrust stamina cost by 10%.</p>
</div>
<button class="text-primary hover:text-energy-amber transition-colors">
<span class="material-symbols-outlined">sync</span>
</button>
</div>
</section>
<!-- Set Bonus -->
<section class="diamond-glass rounded-lg p-gutter border-t-2 border-t-tertiary-fixed mt-2 relative overflow-hidden">
<div class="absolute -right-4 -top-4 w-16 h-16 bg-tertiary-fixed/20 blur-xl rounded-full"></div>
<div class="flex justify-between items-start mb-2">
<h3 class="font-label-caps text-label-caps text-tertiary-fixed">SET BONUS</h3>
<span class="font-label-caps text-label-caps text-on-surface-variant bg-surface-container-high px-2 py-0.5 rounded">2/4 EQUIPPED</span>
</div>
<h4 class="font-body-lg text-body-lg text-on-surface mb-1">Sun-Shield Vanguard</h4>
<p class="font-body-md text-body-md text-on-surface-variant text-sm">
<span class="text-tertiary-fixed">(2)</span> Blocking an attack builds Radiant Charge. At full charge, next block reflects 50% DMG as Holy burst.
            </p>
</section>
<!-- Action Button -->
<div class="mt-4 flex justify-center pb-4">
<button class="hex-btn bg-energy-amber text-void-black font-headline-md text-body-md px-12 py-3 border-2 border-tertiary-fixed flex items-center gap-2 shadow-[0_0_20px_rgba(255,122,0,0.3)] active:scale-95 transition-transform">
<span class="material-symbols-outlined" style="font-variation-settings: 'FILL' 1;">add_circle</span>
                EQUIP ITEM
            </button>
</div>
</main>
`;
  
  return (
    <div className={className} dangerouslySetInnerHTML={{ __html: content }} />
  );
}
