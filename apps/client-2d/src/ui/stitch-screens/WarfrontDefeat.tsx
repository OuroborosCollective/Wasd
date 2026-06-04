import React from 'react';

interface WarfrontDefeatProps {
  className?: string;
}

export function WarfrontDefeat({ className = '' }: WarfrontDefeatProps) {
  const content = `
<!-- Background Layer -->
<div class="fixed inset-0 z-0">
<!-- Main Image -->
<div class="absolute inset-0 bg-cover bg-center opacity-40 scale-105 transform mix-blend-luminosity" data-alt="A darkened, fractured sci-fi fantasy battlefield environment. Shattered obsidian earth dominates the foreground, heavily textured with cracks. Vibrant cyan energy leaks intensely from deep fissures in the ground, providing eerie uplighting. The sky is a looming, atmospheric void storm in deep purples and blacks. The overall aesthetic is 'Diamond Glass', combining high-tech precision with ancient ruin, lit by high-contrast neon glows against profound darkness." style="background-image: url('https://lh3.googleusercontent.com/aida-public/AB6AXuCYtNJKP6Fo770pOb1ZBnNsBbae1cpWfF3SU526LSG7oSgBqDyuBDuAhWrl5LMO_4hAN5btBZM6p34qgXN2ufgmi8O0ZFcVoDIQ1am-h7G2004VFt5SaHYfGmsP-S5JtLjA3TCl0CN4NkzkzAmL7M7tAwcNH4UKt-g-CQ5Zof1be-hyjMQskBrZn2dxDAbNeneeFaqZS-J8-LApRq-BvdvUQjYjt1wk_NrUpi1p0diDqZZUbaTObfBHDih64SQc3JWsPkhtvrGNPWc');">
</div>
<!-- Overlays for depth and readability -->
<div class="absolute inset-0 bg-gradient-to-t from-void-black via-void-black/80 to-transparent"></div>
<div class="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(111,136,173,0.1)_0%,transparent_70%)]"></div>
</div>
<!-- Main Canvas -->
<main class="relative z-10 min-h-screen flex flex-col items-center justify-between px-margin-mobile py-12 md:py-margin-tablet max-w-5xl mx-auto">
<!-- Top Section: Title & Context -->
<header class="flex flex-col items-center mt-8 mb-12 text-center w-full">
<div class="inline-flex items-center gap-2 mb-4">
<span class="w-12 h-[1px] bg-gradient-to-r from-transparent to-mana-cyan"></span>
<span class="font-label-caps text-label-caps text-mana-cyan tracking-widest uppercase">ARELORIAN</span>
<span class="w-12 h-[1px] bg-gradient-to-l from-transparent to-mana-cyan"></span>
</div>
<h1 class="font-display-lg text-display-lg bg-clip-text text-transparent bg-gradient-to-b from-error to-[#8A2BE2] drop-shadow-[0_0_25px_rgba(255,180,171,0.4)] mb-2 uppercase tracking-tighter" style="font-family: 'Epilogue', sans-serif;">
                DEFEAT
            </h1>
<p class="font-body-md text-body-md text-outline-variant max-w-md">
                The Warfront lines have been breached. Forces scattered.
            </p>
</header>
<!-- Center Section: Statistics Dashboard (Bento Grid) -->
<section class="w-full grid grid-cols-1 md:grid-cols-2 gap-gutter mb-12">
<!-- (1) Boss Stats (Full Width) -->
<div class="diamond-glass col-span-1 md:col-span-2 p-6 shadow-[0_0_30px_rgba(0,0,0,0.8)]">
<!-- Cyan Energy Leak Underlay -->
<div class="absolute -top-10 -right-10 w-48 h-48 bg-mana-cyan/10 blur-[60px] rounded-full pointer-events-none"></div>
<div class="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4 relative z-10">
<div class="flex items-center gap-4">
<div class="w-12 h-12 rounded-full bg-surface-container-high border-2 border-error/50 flex items-center justify-center shadow-[0_0_15px_rgba(255,180,171,0.2)]">
<span class="material-symbols-outlined text-error text-[28px]">skull</span>
</div>
<div>
<h2 class="font-headline-md text-headline-md text-on-surface">Herald of Void</h2>
<span class="font-label-sm text-label-sm text-outline px-2 py-1 bg-surface-dim rounded border border-white/5 mt-1 inline-block">Level 95</span>
</div>
</div>
<div class="text-right">
<span class="font-display-lg-mobile text-display-lg-mobile text-error drop-shadow-[0_0_10px_rgba(255,180,171,0.5)]">12%</span>
<p class="font-label-caps text-label-caps text-outline-variant">HP REMAINING</p>
</div>
</div>
<!-- Recessed Progress Bar -->
<div class="h-8 bg-surface-lowest rounded shadow-inner border-y border-surface-bright/20 p-1 relative z-10">
<div class="h-full bg-error rounded-sm relative overflow-hidden" style="width: 12%;">
<div class="absolute inset-0 bar-pattern"></div>
<div class="absolute top-0 right-0 bottom-0 w-2 bg-white/50 blur-[2px]"></div>
</div>
</div>
</div>
<!-- (2) Gilden-Statistik -->
<div class="diamond-glass p-6 flex flex-col justify-between">
<div class="flex items-center gap-2 mb-6">
<span class="material-symbols-outlined text-primary text-[20px]">shield</span>
<h3 class="font-label-caps text-label-caps text-primary uppercase">Gilden-Statistik</h3>
</div>
<div class="mb-6">
<h4 class="font-headline-md text-headline-md text-on-surface mb-1">Azure Knights</h4>
<div class="inline-flex items-center gap-1 bg-surface-container-high px-2 py-1 rounded border border-white/10">
<span class="material-symbols-outlined text-energy-amber text-[14px]">star</span>
<span class="font-label-sm text-label-sm text-energy-amber">Rank 3</span>
</div>
</div>
<div class="grid grid-cols-2 gap-4">
<div class="bg-surface-dim/50 rounded-lg p-3 border border-white/5">
<p class="font-label-sm text-label-sm text-outline mb-1">DAMAGE DEALT</p>
<p class="font-body-lg text-body-lg text-error">2.1M</p>
</div>
<div class="bg-surface-dim/50 rounded-lg p-3 border border-white/5">
<p class="font-label-sm text-label-sm text-outline mb-1">HEALING</p>
<p class="font-body-lg text-body-lg text-tertiary-fixed">900K</p>
</div>
</div>
</div>
<!-- (3) Faction State -->
<div class="diamond-glass p-6 relative flex flex-col">
<div class="absolute bottom-0 left-0 w-full h-1/2 bg-gradient-to-t from-mana-cyan/5 to-transparent pointer-events-none"></div>
<div class="flex items-center gap-2 mb-6 relative z-10">
<span class="material-symbols-outlined text-mana-cyan text-[20px]">public</span>
<h3 class="font-label-caps text-label-caps text-mana-cyan uppercase">Faction State</h3>
</div>
<div class="flex-grow flex flex-col justify-center items-center text-center relative z-10">
<div class="w-16 h-16 rounded-full bg-surface-container-high border border-outline-variant flex items-center justify-center mb-4 relative">
<span class="absolute inset-0 rounded-full border border-mana-cyan animate-ping opacity-20"></span>
<span class="material-symbols-outlined text-outline text-[28px]">warning</span>
</div>
<p class="font-body-lg text-body-lg text-on-surface">Sector B4 remains</p>
<p class="font-headline-md text-headline-md text-energy-amber drop-shadow-[0_0_8px_rgba(255,122,0,0.4)] mt-1">CONTESTED</p>
</div>
</div>
</section>
<!-- Bottom Action Area -->
<div class="w-full flex justify-center pb-8 mt-auto z-20">
<!-- High-contrast 'REGROUP' Button (Hexagonal aesthetic via CSS clip-path & styles) -->
<button class="btn-hex bg-energy-amber text-void-black font-headline-md text-headline-md px-16 py-5 border-[3px] border-tertiary-fixed shadow-[0_0_20px_rgba(121,255,91,0.3)] hover:shadow-[0_0_30px_rgba(121,255,91,0.6)] transition-all duration-300 active:scale-95 animate-inner-pulse flex items-center gap-3 group relative overflow-hidden">
<!-- Shimmer effect -->
<div class="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite] skew-x-12"></div>
<span class="relative z-10">REGROUP</span>
<span class="material-symbols-outlined relative z-10">arrow_forward</span>
</button>
</div>
</main>

`;
  
  return (
    <div className={className} dangerouslySetInnerHTML={{ __html: content }} />
  );
}
