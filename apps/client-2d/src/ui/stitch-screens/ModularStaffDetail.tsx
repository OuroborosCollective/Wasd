import React from 'react';

interface ModularStaffDetailProps {
  className?: string;
}

export function ModularStaffDetail({ className = '' }: ModularStaffDetailProps) {
  const content = `
<!-- Ambient Background Effect -->
<div class="fixed inset-0 z-[-1] pointer-events-none opacity-40">
<div class="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-primary-container via-deep-space to-deep-space mix-blend-screen"></div>
<div class="absolute top-[10%] left-[20%] w-[300px] h-[300px] bg-mana-cyan rounded-full mix-blend-screen filter blur-[150px] opacity-20 animate-pulse"></div>
</div>
<!-- TopAppBar -->
<header class="bg-surface-dim/80 backdrop-blur-xl dark:bg-surface-dim/80 text-primary dark:text-primary-fixed-dim font-headline-md text-headline-md-mobile fixed top-0 w-full border-b border-white/10 shadow-[0_0_15px_rgba(0,229,255,0.2)] flex justify-between items-center px-margin-mobile h-touch-min z-50">
<div class="flex items-center gap-3">
<button class="text-on-surface-variant hover:text-mana-cyan transition-colors h-touch-min w-touch-min flex items-center justify-center">
<span class="material-symbols-outlined" style="font-variation-settings: 'FILL' 0;">arrow_back_ios</span>
</button>
<h1 class="font-headline-md text-headline-md-mobile text-energy-amber tracking-widest uppercase">Inventory</h1>
</div>
<button class="text-on-surface-variant hover:text-mana-cyan transition-colors active:scale-95 transition-transform h-touch-min w-touch-min flex items-center justify-center">
<span class="material-symbols-outlined" style="font-variation-settings: 'FILL' 0;">settings</span>
</button>
</header>
<!-- Main Content Canvas -->
<main class="flex-grow pt-[80px] pb-[100px] px-gutter flex flex-col gap-unit">
<!-- Weapon Header Plate -->
<div class="glass-panel chamfered p-4 flex flex-col gap-2">
<div class="flex justify-between items-start">
<div>
<div class="flex items-center gap-2 mb-1">
<span class="inline-flex items-center justify-center bg-secondary-container/20 border border-secondary-container text-secondary-container font-label-caps text-label-caps px-2 py-0.5 transform -skew-x-12">
<span class="skew-x-12">MYTHIC</span>
</span>
<span class="inline-flex items-center justify-center bg-mana-cyan/20 border border-mana-cyan text-mana-cyan font-label-caps text-label-caps px-2 py-0.5 transform -skew-x-12">
<span class="skew-x-12">STAFF</span>
</span>
</div>
<h2 class="font-display-lg-mobile text-display-lg-mobile text-mana-cyan drop-shadow-[0_0_8px_rgba(0,229,255,0.8)]">Celestial Pillar</h2>
</div>
<div class="flex flex-col items-end">
<span class="font-label-sm text-label-sm text-on-surface-variant">ILVL</span>
<span class="font-headline-md text-headline-md text-surface-tint">450</span>
</div>
</div>
</div>
<!-- 3D Viewer / Hero Area -->
<div class="relative h-[250px] w-full flex items-center justify-center my-2">
<!-- Simulated 3D Weapon Representation -->
<img alt="Glowing Staff" class="h-[220px] object-contain weapon-glow mix-blend-screen opacity-90" data-alt="A highly detailed 3D render of a futuristic fantasy staff floating in a dark void. The staff features a glowing cyan crystal head, an ancient carved dark wood handle, and a geometric glowing base. The style is Diamond Glass with deep blue transparency and vibrant cyan energy glows, evoking a Cyber-Zen aesthetic. Soft ambient lighting highlights the crystalline textures." src="https://lh3.googleusercontent.com/aida-public/AB6AXuD2FnWOqPC5tHRPAsxE3RQMnPlzswPWEF-BOmDuZQmI012sEC52eyyHOMGGOmWqfUP2KpklFkHJRSQWR77BYD-xWg3qCaAVBPHvtLer38hJavp0olKYmnjguIFAzvLR-UWLP-YdXlR-8Ids4-exHHqLxtC2dylBnsxzAF4vRtwRuCQE1VVkA2gxe1RO-B3fR_Q3KCzTk46qt39zfV6b5YO1IrS1B1RJEwfS9V_jN4azEUV2iJRCzKsaOjbWf4ySy3yOixpqZB8tc5E"/>
<!-- Contextual Actions -->
<div class="absolute bottom-0 right-0 flex gap-2">
<button class="glass-panel p-2 rounded-full border-white/20 text-on-surface hover:text-mana-cyan transition-colors h-touch-min w-touch-min flex items-center justify-center">
<span class="material-symbols-outlined">360</span>
</button>
</div>
</div>
<!-- Modular Breakdown -->
<div class="grid grid-cols-1 gap-unit">
<h3 class="font-label-caps text-label-caps text-on-surface-variant uppercase tracking-widest pl-2 border-l-2 border-mana-cyan mb-1">Configuration</h3>
<!-- Part 1: Head -->
<div class="glass-panel p-3 flex gap-4 items-center cursor-pointer hover:bg-white/5 transition-colors border-l-2 border-l-mana-cyan">
<div class="w-12 h-12 bg-surface-container rounded flex items-center justify-center border border-mana-cyan/30 relative overflow-hidden">
<span class="material-symbols-outlined text-mana-cyan text-2xl relative z-10">diamond</span>
<div class="absolute inset-0 bg-mana-cyan/10"></div>
</div>
<div class="flex-grow">
<div class="font-label-sm text-label-sm text-mana-cyan">FOCAL CRYSTAL</div>
<div class="font-body-md text-body-md font-medium text-surface-tint">Starcore Prism</div>
</div>
<div class="text-right">
<div class="font-label-sm text-label-sm text-tertiary">+120 MATK</div>
</div>
</div>
<!-- Part 2: Grip -->
<div class="glass-panel p-3 flex gap-4 items-center cursor-pointer hover:bg-white/5 transition-colors border-l-2 border-l-secondary">
<div class="w-12 h-12 bg-surface-container rounded flex items-center justify-center border border-secondary/30">
<span class="material-symbols-outlined text-secondary text-2xl">straighten</span>
</div>
<div class="flex-grow">
<div class="font-label-sm text-label-sm text-secondary">ANCIENT WOOD GRIP</div>
<div class="font-body-md text-body-md font-medium text-surface-tint">Ironwood Shaft</div>
</div>
<div class="text-right">
<div class="font-label-sm text-label-sm text-tertiary">+45 HASTE</div>
</div>
</div>
<!-- Part 3: Base -->
<div class="glass-panel p-3 flex gap-4 items-center cursor-pointer hover:bg-white/5 transition-colors border-l-2 border-l-tertiary">
<div class="w-12 h-12 bg-surface-container rounded flex items-center justify-center border border-tertiary/30">
<span class="material-symbols-outlined text-tertiary text-2xl">flare</span>
</div>
<div class="flex-grow">
<div class="font-label-sm text-label-sm text-tertiary">RESONANCE SHARD</div>
<div class="font-body-md text-body-md font-medium text-surface-tint">Void Anchor</div>
</div>
<div class="text-right">
<div class="font-label-sm text-label-sm text-tertiary">+20 CRIT</div>
</div>
</div>
</div>
</main>
`;
  
  return (
    <div className={className} dangerouslySetInnerHTML={{ __html: content }} />
  );
}
