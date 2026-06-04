import React from 'react';

interface RefinementSuccessProps {
  className?: string;
}

export function RefinementSuccess({ className = '' }: RefinementSuccessProps) {
  const content = `
<!-- Background Effects -->
<div class="energy-flow"></div>
<div class="energy-flow-2"></div>
<!-- Particle Container -->
<div class="fixed inset-0 pointer-events-none z-0" id="particle-container"></div>
<!-- TopAppBar -->
<header class="bg-surface/80 backdrop-blur-xl fixed top-0 w-full rounded-b-xl border-b border-white/10 shadow-[0_0_15px_rgba(0,229,255,0.2)] flex items-center justify-between px-margin-mobile h-touch-min w-full z-50 transition-all duration-300">
<button class="text-on-surface-variant hover:bg-white/5 active:scale-95 transition-all duration-300 p-unit rounded-full flex items-center justify-center">
<span class="material-symbols-outlined text-[24px]">blur_on</span>
</button>
<h1 class="font-display-lg-mobile text-display-lg-mobile tracking-tighter text-mana-cyan truncate">OUROBOROS</h1>
<button class="text-on-surface-variant hover:bg-white/5 active:scale-95 transition-all duration-300 p-unit rounded-full flex items-center justify-center">
<span class="material-symbols-outlined text-[24px]">account_circle</span>
</button>
</header>
<!-- Main Content Canvas -->
<main class="flex-grow pt-[80px] px-gutter md:px-margin-tablet max-w-4xl mx-auto w-full flex flex-col items-center justify-center gap-gutter relative z-10 min-h-screen">
<!-- Success Celebration Overlay Content -->
<div class="w-full flex flex-col items-center gap-8 py-8">
<!-- Headline -->
<div class="text-center animate-enter-shatter">
<h2 class="font-display-lg text-display-lg text-tertiary uppercase tracking-[0.2em] text-glow-success">SUCCESS</h2>
<p class="font-body-md text-body-md text-on-surface-variant mt-2 tracking-widest uppercase">Refinement Complete</p>
</div>
<!-- Central Workspace (Pedestal) / The Item -->
<div class="w-full max-w-md glass-panel flex flex-col items-center justify-center p-margin-mobile relative animate-enter-shatter animate-enter-delay-1">
<div class="absolute inset-0 bg-tertiary/10 pointer-events-none"></div>
<div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-tertiary/20 rounded-full blur-3xl animate-[pulse_2s_ease-in-out_infinite]"></div>
<div class="z-10 text-center mb-4">
<h3 class="font-headline-md text-headline-md text-white">Mythic Blade Head <span class="text-tertiary">+1</span></h3>
</div>
<!-- 2.5D Mockup Area -->
<div class="w-full max-w-[250px] aspect-square relative z-10 flex items-center justify-center my-margin-mobile">
<img alt="Weapon Part" class="w-full h-full object-contain drop-shadow-[0_0_40px_rgba(42,229,0,0.6)] animate-[pulse_2s_ease-in-out_infinite] hover:scale-110 transition-transform duration-500" data-alt="A highly detailed 3D render of a glowing, angular sci-fi sword blade suspended in mid-air within a technological containment field. The blade is forged from dark crystalline material with vibrant cyan energy coursing through geometric etched lines. Soft blue light emanates from the containment field, highlighting the sharp chamfered edges of the weapon against a deep marine-blue void background. The aesthetic is cyber-zen, blending mystical ancient weaponry with futuristic precision." src="https://lh3.googleusercontent.com/aida-public/AB6AXuANVzx7j0efv3wpSn59Z83xcyyXLrZzI0wtCIat7uYYlwFbt5balKDl-o7PaAjbGpq1mx0Cn-HVmXOz0H3Rlngg5SkuHzsKV27BBUp8AsjJ8Ky2GTprHx2hNx1uzJEHib0zHgsklGfpdg4J6UJf1x27fb8W8R9xSSijUrp5qcZTvh5is-H9gCF-7VczFJLl7xbKL9ix9wbIsmhEOHd4OsT7ht5jgTcG0mewTZLbrDPXLJPCwbo2L39PIDrWSzjkuCqxsLmIwQDQo6w"/>
</div>
</div>
<!-- Stats Upgrade Panel -->
<div class="w-full max-w-md glass-panel p-margin-mobile flex flex-col gap-4 animate-enter-shatter animate-enter-delay-2">
<h4 class="font-label-caps text-label-caps text-on-surface-variant text-center border-b border-white/10 pb-2">STAT ENHANCEMENTS</h4>
<div class="space-y-4">
<!-- Stat 1 -->
<div class="flex items-center justify-between bg-surface/50 p-3 rounded border border-white/5">
<span class="font-body-md text-on-surface">Potency</span>
<div class="flex items-center gap-3 font-label-caps text-label-caps">
<span class="text-on-surface-variant">94%</span>
<span class="material-symbols-outlined text-tertiary text-sm">arrow_forward</span>
<span class="text-tertiary font-bold">98%</span>
<span class="material-symbols-outlined text-tertiary text-lg animate-bounce">arrow_upward</span>
</div>
</div>
<!-- Stat 2 -->
<div class="flex items-center justify-between bg-surface/50 p-3 rounded border border-white/5">
<span class="font-body-md text-on-surface">Stability</span>
<div class="flex items-center gap-3 font-label-caps text-label-caps">
<span class="text-on-surface-variant">78%</span>
<span class="material-symbols-outlined text-tertiary text-sm">arrow_forward</span>
<span class="text-tertiary font-bold">85%</span>
<span class="material-symbols-outlined text-tertiary text-lg animate-bounce" style="animation-delay: 0.1s">arrow_upward</span>
</div>
</div>
<!-- Stat 3 -->
<div class="flex items-center justify-between bg-surface/50 p-3 rounded border border-white/5">
<span class="font-body-md text-on-surface">Durability</span>
<div class="flex items-center gap-3 font-label-caps text-label-caps">
<span class="text-energy-amber">-12%</span>
<span class="material-symbols-outlined text-tertiary text-sm">arrow_forward</span>
<span class="text-on-surface-variant">0%</span>
<span class="material-symbols-outlined text-tertiary text-lg animate-bounce" style="animation-delay: 0.2s">arrow_upward</span>
</div>
</div>
</div>
</div>
<!-- Action Action Panel -->
<div class="w-full max-w-md animate-enter-shatter animate-enter-delay-3">
<button class="btn-hex w-full h-[72px] flex items-center justify-center gap-unit drop-shadow-[0_0_20px_rgba(255,122,0,0.4)]">
<span class="material-symbols-outlined text-void-black text-3xl">verified</span>
<span class="font-headline-md text-headline-md text-void-black uppercase tracking-wider">CLAIM UPGRADE</span>
</button>
</div>
</div>
</main>
<!-- BottomNavBar -->
<nav class="bg-surface-container-lowest/80 backdrop-blur-2xl fixed bottom-0 w-full rounded-t-xl border-t border-white/5 shadow-[0_-4px_20px_rgba(0,0,0,0.5)] flex justify-around items-center h-16 px-gutter pb-safe z-50 md:hidden">
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
