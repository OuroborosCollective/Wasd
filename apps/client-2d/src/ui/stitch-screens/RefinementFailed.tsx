import React from 'react';

interface RefinementFailedProps {
  className?: string;
}

export function RefinementFailed({ className = '' }: RefinementFailedProps) {
  const content = `
<!-- Background Canvas for Particles -->
<div id="particles-js"></div>
<!-- Background Image / Ambience -->
<div class="absolute inset-0 z-[-2] bg-[url('https://images.unsplash.com/photo-1550684848-fac1c5b4e853?q=80&amp;w=2070&amp;auto=format&amp;fit=crop')] bg-cover bg-center opacity-20 mix-blend-luminosity" data-alt="A dark, moody underwater scene or deep space nebula serving as the background. Deep oceanic blues and void blacks dominate, creating a vast, atmospheric abyss. The lighting is dim, suggesting a deep, unexplored region. The overall aesthetic is Cyber-Zen, merging natural mystery with sci-fi vastness."></div>
<!-- Heavy Error Overlay Gradient -->
<div class="absolute inset-0 z-[-1] bg-gradient-to-t from-error-container/40 via-surface/80 to-surface/90"></div>
<!-- Main Content Container -->
<main class="w-full max-w-[500px] p-margin-mobile flex flex-col items-center z-10">
<!-- TopAppBar (Suppressed per Nav Rule: Transactional/Error State) -->
<!-- Central Focus: Shattered Artifact -->
<div class="relative w-48 h-48 mb-8 flex items-center justify-center">
<!-- Glowing aura -->
<div class="absolute inset-0 bg-energy-amber/20 rounded-full filter blur-[40px] pulse-error"></div>
<!-- Fractured Blade Graphic -->
<div class="relative z-10 w-full h-full flex items-center justify-center transform rotate-12">
<img alt="Fractured Weapon Part" class="w-32 h-32 object-cover rounded-lg chamfer-corner shadow-[0_0_30px_rgba(255,122,0,0.5)] border border-energy-amber/50 mix-blend-screen opacity-90" data-alt="A macro shot of a shattered, glowing crystalline artifact resembling a broken sword blade or spearhead. The crystal is primarily vibrant sunset-orange and deep red, with jagged, irregular fracture lines across its surface. It appears highly unstable, emanating a faint, glitchy digital aura against a dark background. The texture is sharp, glassy, and translucent." src="https://lh3.googleusercontent.com/aida-public/AB6AXuDd6BGtrqIx6L9UpfJOcUPDoHImNqfGbds3nRBXPAJMbnuQMr_f3ZkNK3WElKFBCgLYTkgIxo7hSSdxzGdQ7Xk1I4XyMA7v36Ao9U3mdtxW_z-YjaPL7QAcaS4ROSl6E7VoJvhvE0tnUBuvv3HCSKnrKNdyY_gd8nsn65xovSxWZbTNVNo83uAhh0wzViDlQRofg3Ar5jtMGK9LWCSL8BRSUif29GUhL-RPOCvE6SiiykJzuK2O_fwFgMJ8ZNQtPpMgTxRpJy0KGoA">
<!-- Overlay Glitch Elements -->
<div class="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0IiBoZWlnaHQ9IjQiPjxyZWN0IHdpZHRoPSI0IiBoZWlnaHQ9IjQiIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIi8+PC9zdmc+')] mix-blend-overlay opacity-50"></div>
</div>
<!-- Warning Icons orbiting -->
<div class="absolute top-0 right-4 text-error animate-pulse">
<span class="material-symbols-outlined text-[32px] drop-shadow-[0_0_8px_rgba(255,180,171,0.8)]" style="font-variation-settings: 'FILL' 1;">warning</span>
</div>
</div>
<!-- Headline -->
<h1 class="font-display-lg-mobile text-display-lg-mobile text-energy-amber tracking-tighter mb-2 glitch-text uppercase text-center" data-text="CRITICAL FAILURE">
            CRITICAL FAILURE
        </h1>
<p class="font-label-caps text-label-caps text-on-surface-variant mb-8 text-center tracking-[0.2em]">
            REFINEMENT SEQUENCE ABORTED
        </p>
<!-- Stats Breakdown Panel -->
<div class="glass-panel chamfer-corner w-full p-6 mb-8 border-error/20 bg-error-container/10">
<h2 class="font-label-caps text-label-caps text-on-surface/80 mb-4 flex items-center border-b border-white/5 pb-2">
<span class="material-symbols-outlined text-[16px] mr-2">analytics</span>
                LOSS REPORT
            </h2>
<div class="space-y-4">
<!-- Stat Line 1 -->
<div class="flex justify-between items-center">
<span class="font-body-md text-on-surface-variant">Part Stability</span>
<div class="flex items-center gap-2">
<span class="font-label-caps text-label-caps text-error line-through opacity-70">OPTIMAL</span>
<span class="material-symbols-outlined text-[16px] text-error">arrow_right_alt</span>
<span class="font-label-caps text-label-caps text-energy-amber animate-pulse">COMPROMISED</span>
</div>
</div>
<!-- Stat Line 2 -->
<div class="flex justify-between items-center">
<span class="font-body-md text-on-surface-variant">Core Potency</span>
<div class="flex items-center gap-2">
<span class="font-label-caps text-label-caps text-on-surface/60">94%</span>
<span class="material-symbols-outlined text-[16px] text-error">arrow_downward</span>
<span class="font-label-caps text-label-caps text-error font-bold drop-shadow-[0_0_5px_rgba(255,180,171,0.5)]">80%</span>
</div>
</div>
<!-- Stat Line 3 -->
<div class="flex justify-between items-center">
<span class="font-body-md text-on-surface-variant">Flux Resources</span>
<div class="flex items-center gap-2">
<span class="material-symbols-outlined text-[16px] text-error">cancel</span>
<span class="font-label-caps text-label-caps text-error">DEPLETED</span>
</div>
</div>
</div>
</div>
<!-- Action Buttons -->
<div class="w-full flex flex-col gap-4">
<!-- Primary Action -->
<button class="hex-button w-full h-[56px] bg-energy-amber/90 hover:bg-energy-amber flex items-center justify-center gap-2 transition-all duration-300 border border-energy-amber shadow-[0_0_20px_rgba(255,122,0,0.3)] group active:scale-[0.98]">
<span class="material-symbols-outlined text-void-black text-[20px] transition-transform group-hover:-rotate-90">build_circle</span>
<span class="font-headline-md text-[18px] text-void-black font-bold tracking-wider">RECOVER FRAGMENTS</span>
</button>
<!-- Secondary Actions Row -->
<div class="flex gap-4 w-full">
<button class="chamfer-corner-sm flex-1 h-[44px] glass-panel flex items-center justify-center gap-2 border-outline-variant hover:border-mana-cyan/50 hover:bg-surface-bright/50 transition-all text-on-surface-variant hover:text-mana-cyan">
<span class="material-symbols-outlined text-[18px]">refresh</span>
<span class="font-label-caps text-label-caps">RETRY</span>
</button>
<button class="chamfer-corner-sm flex-1 h-[44px] glass-panel flex items-center justify-center border-outline-variant hover:border-on-surface/30 hover:bg-surface-bright/30 transition-all text-on-surface-variant">
<span class="font-label-caps text-label-caps">CLOSE</span>
</button>
</div>
</div>
</main>
<!-- BottomNavBar (Suppressed per Nav Rule: Transactional/Error State) -->
<!-- Lightweight Script for Particle Effects -->

`;
  
  return (
    <div className={className} dangerouslySetInnerHTML={{ __html: content }} />
  );
}
