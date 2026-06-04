import React from 'react';

interface UpgradeCrystallineForgeProps {
  className?: string;
}

export function UpgradeCrystallineForge({ className = '' }: UpgradeCrystallineForgeProps) {
  const content = `
<!-- TopAppBar -->
<header class="bg-surface/60 backdrop-blur-xl fixed top-0 w-full rounded-b-xl border-b border-white/10 shadow-[0_0_15px_rgba(0,229,255,0.2)] flex items-center justify-between px-margin-mobile h-touch-min w-full z-50 transition-all duration-300">
<button class="text-on-surface-variant hover:bg-white/5 active:scale-95 transition-all duration-300 p-unit rounded-full flex items-center justify-center">
<span class="material-symbols-outlined text-[24px]">blur_on</span>
</button>
<h1 class="font-display-lg-mobile text-display-lg-mobile tracking-tighter text-mana-cyan truncate">OUROBOROS</h1>
<button class="text-on-surface-variant hover:bg-white/5 active:scale-95 transition-all duration-300 p-unit rounded-full flex items-center justify-center">
<span class="material-symbols-outlined text-[24px]">account_circle</span>
</button>
</header>
<!-- Main Content Canvas -->
<main class="flex-grow pt-[80px] px-gutter md:px-margin-tablet max-w-7xl mx-auto w-full flex flex-col gap-gutter">
<!-- Header Section -->
<div class="text-center my-unit">
<h2 class="font-headline-md text-headline-md text-on-surface uppercase tracking-widest">CRYSTALLINE FORGE</h2>
<p class="font-body-md text-body-md text-on-surface-variant">Modular Refinement Protocol</p>
</div>
<!-- Layout Grid -->
<div class="grid grid-cols-1 lg:grid-cols-12 gap-gutter lg:h-[calc(100vh-200px)]">
<!-- Central Workspace (Pedestal) -->
<div class="lg:col-span-7 glass-panel rounded-xl flex flex-col items-center justify-center p-margin-mobile min-h-[400px] relative">
<div class="absolute inset-0 bg-mana-cyan/5 rounded-xl pointer-events-none"></div>
<div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-mana-cyan/20 rounded-full blur-3xl"></div>
<div class="z-10 text-center mb-auto">
<h3 class="font-headline-md text-headline-md text-mana-cyan">Mythic Blade Head</h3>
<span class="font-label-caps text-label-caps text-outline inline-block mt-unit px-unit py-1 border border-outline/30 rounded">CONTAINMENT STABLE</span>
</div>
<!-- 2.5D Mockup Area -->
<div class="w-full max-w-[300px] aspect-square relative z-10 flex items-center justify-center my-margin-mobile">
<img alt="Weapon Part" class="w-full h-full object-contain drop-shadow-[0_0_30px_rgba(0,229,255,0.4)] animate-[pulse_4s_ease-in-out_infinite]" data-alt="A highly detailed 3D render of a glowing, angular sci-fi sword blade suspended in mid-air within a technological containment field. The blade is forged from dark crystalline material with vibrant cyan energy coursing through geometric etched lines. Soft blue light emanates from the containment field, highlighting the sharp chamfered edges of the weapon against a deep marine-blue void background. The aesthetic is cyber-zen, blending mystical ancient weaponry with futuristic precision." src="https://lh3.googleusercontent.com/aida-public/AB6AXuANVzx7j0efv3wpSn59Z83xcyyXLrZzI0wtCIat7uYYlwFbt5balKDl-o7PaAjbGpq1mx0Cn-HVmXOz0H3Rlngg5SkuHzsKV27BBUp8AsjJ8Ky2GTprHx2hNx1uzJEHib0zHgsklGfpdg4J6UJf1x27fb8W8R9xSSijUrp5qcZTvh5is-H9gCF-7VczFJLl7xbKL9ix9wbIsmhEOHd4OsT7ht5jgTcG0mewTZLbrDPXLJPCwbo2L39PIDrWSzjkuCqxsLmIwQDQo6w"/>
</div>
<!-- Elemental Infusion Selector -->
<div class="mt-auto w-full max-w-md z-10">
<p class="font-label-caps text-label-caps text-on-surface-variant mb-unit text-center">ELEMENTAL INFUSION</p>
<div class="flex justify-between items-center px-margin-mobile">
<button class="diamond-chip w-12 h-12 bg-energy-amber/20 text-energy-amber border border-energy-amber/50 hover:bg-energy-amber/40 active">
<span class="material-symbols-outlined" style="font-variation-settings: 'FILL' 1;">local_fire_department</span>
</button>
<button class="diamond-chip w-12 h-12 bg-blue-500/20 text-blue-500 border border-blue-500/50 hover:bg-blue-500/40">
<span class="material-symbols-outlined" style="font-variation-settings: 'FILL' 1;">water_drop</span>
</button>
<button class="diamond-chip w-12 h-12 bg-mana-cyan/20 text-mana-cyan border border-mana-cyan/50 hover:bg-mana-cyan/40">
<span class="material-symbols-outlined" style="font-variation-settings: 'FILL' 1;">ac_unit</span>
</button>
<button class="diamond-chip w-12 h-12 bg-purple-500/20 text-purple-500 border border-purple-500/50 hover:bg-purple-500/40">
<span class="material-symbols-outlined" style="font-variation-settings: 'FILL' 1;">bolt</span>
</button>
<button class="diamond-chip w-12 h-12 bg-white/20 text-white border border-white/50 hover:bg-white/40">
<span class="material-symbols-outlined" style="font-variation-settings: 'FILL' 1;">storm</span>
</button>
</div>
</div>
</div>
<!-- Upgrade Details & Resources Sidebar -->
<div class="lg:col-span-5 flex flex-col gap-gutter">
<!-- Stats Panel -->
<div class="glass-panel rounded-xl p-margin-mobile flex-grow flex flex-col justify-center">
<h4 class="font-label-caps text-label-caps text-on-surface-variant mb-margin-mobile">PROJECTION STATS</h4>
<div class="space-y-gutter">
<div>
<div class="flex justify-between font-label-sm text-label-sm mb-1">
<span class="text-on-surface">Potency</span>
<span class="text-tertiary">94%</span>
</div>
<div class="progress-trough h-3 rounded-full">
<div class="progress-fill h-full w-[94%] rounded-full"></div>
</div>
</div>
<div>
<div class="flex justify-between font-label-sm text-label-sm mb-1">
<span class="text-on-surface">Stability</span>
<span class="text-tertiary">78%</span>
</div>
<div class="progress-trough h-3 rounded-full">
<div class="progress-fill h-full w-[78%] rounded-full"></div>
</div>
</div>
<div class="pt-unit">
<div class="flex justify-between font-label-sm text-label-sm mb-1">
<span class="text-on-surface">Durability Matrix</span>
<span class="text-secondary">WARNING: -12%</span>
</div>
<div class="progress-trough h-1 rounded-full bg-surface-variant">
<div class="bg-energy-amber h-full w-[60%] rounded-full"></div>
</div>
</div>
</div>
</div>
<!-- Resources Panel -->
<div class="glass-panel rounded-xl p-margin-mobile flex-grow">
<h4 class="font-label-caps text-label-caps text-on-surface-variant mb-margin-mobile">REQUIRED MATERIALS</h4>
<div class="grid grid-cols-2 gap-unit">
<div class="bg-surface/50 border border-white/5 rounded-lg p-unit flex items-center gap-unit">
<div class="w-10 h-10 rounded bg-mana-cyan/10 flex items-center justify-center flex-shrink-0">
<span class="material-symbols-outlined text-mana-cyan">diamond</span>
</div>
<div class="overflow-hidden">
<p class="font-label-sm text-label-sm text-on-surface truncate">Mithril Ore</p>
<p class="font-body-md text-body-md text-on-surface-variant">12 <span class="text-on-surface/50 text-sm">/ 40</span></p>
</div>
</div>
<div class="bg-surface/50 border border-white/5 rounded-lg p-unit flex items-center gap-unit">
<div class="w-10 h-10 rounded bg-energy-amber/10 flex items-center justify-center flex-shrink-0">
<span class="material-symbols-outlined text-energy-amber">hexagon</span>
</div>
<div class="overflow-hidden">
<p class="font-label-sm text-label-sm text-on-surface truncate">Energy Crystal</p>
<p class="font-body-md text-body-md text-tertiary">3 <span class="text-on-surface/50 text-sm">/ 2</span></p>
</div>
</div>
</div>
</div>
<!-- Action Panel -->
<div class="glass-panel rounded-xl p-margin-mobile flex justify-center items-center">
<button class="btn-hex w-full max-w-[280px] h-[60px] flex items-center justify-center gap-unit">
<span class="material-symbols-outlined text-void-black">build</span>
<span class="font-headline-md text-headline-md text-void-black uppercase">REFINE PART</span>
</button>
</div>
</div>
</div>
</main>
<!-- BottomNavBar -->
<nav class="bg-surface-container-lowest/40 backdrop-blur-2xl fixed bottom-0 w-full rounded-t-xl border-t border-white/5 shadow-[0_-4px_20px_rgba(0,0,0,0.5)] flex justify-around items-center h-16 px-gutter pb-safe z-50 md:hidden">
<a class="flex flex-col items-center justify-center text-on-surface-variant/70 hover:text-tertiary-fixed-dim animate-pulse-subtle transition-transform duration-200" href="#">
<span class="material-symbols-outlined text-[24px]">assignment</span>
<span class="font-label-caps text-label-caps sr-only">assignment</span>
</a>
<a class="flex flex-col items-center justify-center text-on-surface-variant/70 hover:text-tertiary-fixed-dim animate-pulse-subtle transition-transform duration-200" href="#">
<span class="material-symbols-outlined text-[24px]">explore</span>
<span class="font-label-caps text-label-caps sr-only">explore</span>
</a>
<!-- Active Tab -->
<a class="flex flex-col items-center justify-center text-energy-amber drop-shadow-[0_0_8px_rgba(255,122,0,0.6)] scale-110 hover:text-tertiary-fixed-dim animate-pulse-subtle transition-transform duration-200" href="#">
<span class="material-symbols-outlined text-[24px]" style="font-variation-settings: 'FILL' 1;">bolt</span>
<span class="font-label-caps text-label-caps sr-only">bolt</span>
</a>
<a class="flex flex-col items-center justify-center text-on-surface-variant/70 hover:text-tertiary-fixed-dim animate-pulse-subtle transition-transform duration-200" href="#">
<span class="material-symbols-outlined text-[24px]">work</span>
<span class="font-label-caps text-label-caps sr-only">work</span>
</a>
<a class="flex flex-col items-center justify-center text-on-surface-variant/70 hover:text-tertiary-fixed-dim animate-pulse-subtle transition-transform duration-200" href="#">
<span class="material-symbols-outlined text-[24px]">group</span>
<span class="font-label-caps text-label-caps sr-only">group</span>
</a>
</nav>

`;
  
  return (
    <div className={className} dangerouslySetInnerHTML={{ __html: content }} />
  );
}
