import React from 'react';

interface WarfrontVictoryProps {
  className?: string;
}

export function WarfrontVictory({ className = '' }: WarfrontVictoryProps) {
  const content = `
<!-- Background Layer: Blurred Battlefield with Mana Particles -->
<div class="fixed inset-0 z-0">
<div class="absolute inset-0 bg-cover bg-center opacity-40 mix-blend-screen filter blur-[8px]" data-alt="A dark, intense fantasy science battlefield scene blurred heavily in the background. Glowing mana-cyan particles drift through the air like magical embers. The environment suggests an epic MMORPG victory, with deep oceanic depths and neon energy highlights piercing through frosted atmospheric haze, adhering to a Diamond Glass aesthetic." style="background-image: url('https://lh3.googleusercontent.com/aida-public/AB6AXuBYA4XJWaYk-ryIv9VjsLQlBfKf9N-a4jDx_sIwbAo_vLp3K9fvIXefnNpQBABAAwcpR2hKrK4QdIL-n1VQvnlVWZPZdsG2_AdkobvIc1SiXTfmo3W0BisuGtX0A9_jn8l5N3bAUZMKllyDMd2Aqm5IC6hhW8K9roOMTb-Sze4s2xbpixVjgWFxSKEcGmif1daQh0XfsdSP6X1JuHDQio6bEIj5jpvFveikb06yey3g4funFY6fnwshggmOG3i1uYQS66vBruF1Z2Y');">
</div>
<!-- Particle Overlay Simulation -->
<div class="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-mana-cyan/10 via-background/80 to-background z-10"></div>
</div>
<!-- Main Canvas (Transactional/End-State: Nav Suppressed) -->
<main class="relative z-20 flex flex-col items-center justify-center min-h-screen px-margin-mobile py-margin-tablet">
<!-- Victory Header Anchor -->
<header class="text-center mb-12">
<h1 class="font-display-lg text-display-lg-mobile md:text-display-lg victory-text tracking-widest uppercase mb-2">
                VICTORY
            </h1>
<p class="font-label-caps text-label-caps text-mana-cyan tracking-[0.3em] opacity-80">
                ARELORIAN SECTOR SECURED
            </p>
</header>
<!-- Bento Grid Layout for Stats -->
<div class="w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 gap-gutter mb-12">
<!-- (1) Boss Stats Panel -->
<section class="glass-panel p-6 relative overflow-hidden">
<!-- Inner Refraction Layer -->
<div class="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none"></div>
<div class="flex items-start justify-between mb-4">
<div>
<h2 class="font-headline-md text-headline-md-mobile text-on-surface">Herald of Void</h2>
<span class="font-label-sm text-label-sm text-outline uppercase">Level 95 Boss</span>
</div>
<span class="material-symbols-outlined text-mana-cyan" style="font-variation-settings: 'FILL' 1;">skull</span>
</div>
<!-- Defeated Health Bar -->
<div class="mt-6">
<div class="flex justify-between font-label-caps text-label-caps mb-2 text-on-surface-variant">
<span>HP STATUS</span>
<span class="text-error">0% (DEFEATED)</span>
</div>
<div class="h-3 bg-surface-dim rounded-sm border border-white/5 overflow-hidden relative">
<!-- Empty Bar, subtle red glow to indicate death -->
<div class="absolute inset-0 shadow-[inset_0_0_10px_rgba(255,180,171,0.1)]"></div>
</div>
</div>
</section>
<!-- (2) Guild Statistics Panel -->
<section class="glass-panel p-6 relative overflow-hidden">
<div class="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none"></div>
<div class="flex items-center gap-3 mb-6">
<span class="material-symbols-outlined text-energy-amber text-3xl" style="font-variation-settings: 'FILL' 1;">workspace_premium</span>
<div>
<h2 class="font-headline-md text-headline-md-mobile text-on-surface">Azure Knights</h2>
<span class="font-label-sm text-label-sm text-energy-amber tracking-widest uppercase">Rank 1 Contributor</span>
</div>
</div>
<div class="grid grid-cols-2 gap-4">
<!-- Stat Block: Damage -->
<div class="bg-surface-dim/50 border border-white/5 p-3 rounded-sm relative">
<span class="font-label-caps text-label-caps text-outline block mb-1">TOTAL DMG</span>
<span class="font-body-lg text-body-lg text-tertiary-fixed-dim">4.2M</span>
<!-- Subtle progress accent -->
<div class="absolute bottom-0 left-0 h-[2px] bg-tertiary-fixed-dim w-full progress-scan"></div>
</div>
<!-- Stat Block: Healing -->
<div class="bg-surface-dim/50 border border-white/5 p-3 rounded-sm relative">
<span class="font-label-caps text-label-caps text-outline block mb-1">HEALING</span>
<span class="font-body-lg text-body-lg text-mana-cyan">1.8M</span>
<div class="absolute bottom-0 left-0 h-[2px] bg-mana-cyan w-[60%] progress-scan"></div>
</div>
</div>
</section>
<!-- (3) Faction State Panel (Spans full width on mobile) -->
<section class="glass-panel p-6 md:col-span-2 flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden border-mana-cyan/30">
<div class="absolute inset-0 bg-gradient-to-br from-mana-cyan/5 to-transparent pointer-events-none"></div>
<div class="flex items-center gap-4">
<!-- Faction Emblem Placeholder -->
<div class="w-16 h-16 rounded-full bg-surface-dim border-2 border-mana-cyan flex items-center justify-center shadow-[0_0_15px_rgba(0,229,255,0.2)]">
<span class="material-symbols-outlined text-mana-cyan text-3xl" style="font-variation-settings: 'FILL' 1;">security</span>
</div>
<div>
<span class="font-label-caps text-label-caps text-mana-cyan block mb-1">FACTION STATE UPDATED</span>
<h3 class="font-headline-md text-headline-md-mobile text-on-surface">'Azure Sanctum' now controls Sector B4</h3>
</div>
</div>
<!-- Diamond Tag indicating active status -->
<div class="rotate-45 w-12 h-12 border border-mana-cyan/50 flex items-center justify-center bg-mana-cyan/10 shadow-[0_0_10px_rgba(0,229,255,0.3)]">
<span class="-rotate-45 material-symbols-outlined text-mana-cyan text-sm">verified</span>
</div>
</section>
</div>
<!-- Primary Action -->
<button class="hex-btn px-12 py-4 h-touch-min flex items-center justify-center gap-2 group cursor-pointer focus:outline-none focus:ring-2 focus:ring-energy-amber/50">
<span class="font-label-caps text-label-caps text-surface-dim font-bold tracking-widest uppercase">
                RETURN TO WORLD
            </span>
<span class="material-symbols-outlined text-surface-dim group-hover:translate-x-1 transition-transform">arrow_forward</span>
</button>
</main>
<!-- Navigation Suppressed intentionally per rules for 'End-State/Victory' screens -->
`;
  
  return (
    <div className={className} dangerouslySetInnerHTML={{ __html: content }} />
  );
}
