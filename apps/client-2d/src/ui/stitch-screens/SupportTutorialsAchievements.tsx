import React from 'react';

interface SupportTutorialsAchievementsProps {
  className?: string;
}

export function SupportTutorialsAchievements({ className = '' }: SupportTutorialsAchievementsProps) {
  const content = `
<!-- Ambient Background Depth -->
<div class="fixed inset-0 z-0 pointer-events-none bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary-container/40 via-void-black to-void-black"></div>
<!-- TopAppBar (From JSON) -->
<header class="flex justify-between items-center px-margin-mobile h-16 w-full fixed top-0 z-50 bg-surface/80 dark:bg-surface-dim/80 backdrop-blur-xl border-b border-white/10 shadow-[0_4px_30px_rgba(0,0,0,0.1)]">
<button class="h-touch-min w-touch-min flex items-center justify-center text-on-surface-variant hover:text-tertiary-fixed-dim transition-colors duration-300 scale-95 active:duration-75">
<span class="material-symbols-outlined">language</span>
</button>
<h1 class="font-display-lg-mobile text-display-lg-mobile tracking-widest text-primary-fixed drop-shadow-[0_0_10px_rgba(175,200,240,0.5)]">
            ARELORIAN
        </h1>
<button class="h-touch-min w-touch-min flex items-center justify-center text-on-surface-variant hover:text-tertiary-fixed-dim transition-colors duration-300 scale-95 active:duration-75">
<span class="material-symbols-outlined">settings</span>
</button>
</header>
<!-- Main Overlay Content Area -->
<main class="relative z-10 pt-24 pb-32 px-margin-mobile md:px-margin-tablet max-w-7xl mx-auto flex flex-col gap-gutter md:gap-8">
<!-- Header & Search -->
<section class="text-center space-y-6 mb-4">
<h2 class="font-headline-md text-headline-md text-primary">Knowledge Archive</h2>
<p class="font-body-md text-body-md text-on-surface-variant max-w-2xl mx-auto">Access the crystalline records to resolve anomalies and master the interface.</p>
<div class="relative max-w-xl mx-auto group">
<span class="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline group-focus-within:text-energy-amber transition-colors">search</span>
<input class="w-full bg-surface-container/50 border-b-2 border-outline/30 focus:border-energy-amber text-on-surface font-body-md py-4 pl-12 pr-4 rounded-t-lg outline-none transition-all duration-300 backdrop-blur-md placeholder:text-outline-variant focus:shadow-[0_4px_15px_rgba(255,122,0,0.2)]" placeholder="Search the archives..." type="text"/>
</div>
</section>
<!-- Bento Grid Layout for Content -->
<div class="grid grid-cols-1 md:grid-cols-12 gap-gutter md:gap-6">
<!-- Main Knowledge Base Area (Left Col on Desktop) -->
<div class="md:col-span-8 space-y-6">
<!-- Navigation Tabs (Internal) -->
<div class="flex space-x-2 border-b border-white/10 pb-2">
<button class="font-label-caps text-label-caps text-energy-amber border-b-2 border-energy-amber pb-2 px-4 shadow-[0_10px_10px_-10px_rgba(255,122,0,0.5)]">GUIDES</button>
<button class="font-label-caps text-label-caps text-on-surface-variant hover:text-primary transition-colors pb-2 px-4">REPORT ANOMALY</button>
</div>
<!-- Cards Grid -->
<div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
<!-- Card 1 -->
<a class="diamond-glass rounded-xl p-6 flex flex-col gap-4 glow-hover transition-all duration-300 group cursor-pointer" href="#">
<div class="w-10 h-10 rounded-full bg-primary-container/50 flex items-center justify-center border border-primary/20 group-hover:border-energy-amber/50 transition-colors">
<span class="material-symbols-outlined text-primary group-hover:text-energy-amber">explore</span>
</div>
<div>
<h3 class="font-headline-md text-[18px] leading-[24px] text-on-surface mb-1">World Navigation</h3>
<p class="font-body-md text-[14px] text-on-surface-variant">Master movement, map interpretation, and fast travel networks.</p>
</div>
</a>
<!-- Card 2 -->
<a class="diamond-glass rounded-xl p-6 flex flex-col gap-4 glow-hover transition-all duration-300 group cursor-pointer" href="#">
<div class="w-10 h-10 rounded-full bg-primary-container/50 flex items-center justify-center border border-primary/20 group-hover:border-energy-amber/50 transition-colors">
<span class="material-symbols-outlined text-primary group-hover:text-energy-amber">swords</span>
</div>
<div>
<h3 class="font-headline-md text-[18px] leading-[24px] text-on-surface mb-1">Combat Systems</h3>
<p class="font-body-md text-[14px] text-on-surface-variant">Learn elemental combos, defensive parries, and skill rotations.</p>
</div>
</a>
</div>
<!-- Visual Guides Section (Mana-Cyan Focus) -->
<div class="diamond-glass rounded-xl p-6 mt-6">
<h3 class="font-headline-md text-[20px] text-primary mb-4 flex items-center gap-2">
<span class="material-symbols-outlined text-mana-cyan" style="font-variation-settings: 'FILL' 1;">visibility</span>
                        Interface Mastery
                    </h3>
<div class="relative rounded-lg overflow-hidden border border-white/5 bg-surface-container-highest/50 p-4">
<p class="font-body-md text-on-surface-variant mb-4">Hover over interface elements to see detailed tooltips. Key indicators are highlighted below.</p>
<!-- Mock UI representation with Mana-Cyan highlight -->
<div class="flex items-center gap-4 bg-surface-container-lowest p-3 rounded border border-mana-cyan shadow-[0_0_15px_rgba(0,229,255,0.2)]">
<div class="w-8 h-8 rounded bg-mana-cyan/20 border border-mana-cyan flex items-center justify-center">
<span class="material-symbols-outlined text-mana-cyan text-sm">bolt</span>
</div>
<div class="flex-1">
<div class="h-2 bg-surface-bright rounded-full overflow-hidden">
<div class="h-full w-3/4 bg-gradient-to-r from-mana-cyan/50 to-mana-cyan"></div>
</div>
<span class="font-label-caps text-[10px] text-mana-cyan mt-1 block">MANA POOL INDICATOR</span>
</div>
</div>
</div>
</div>
</div>
<!-- Right Sidebar (Achievements & Status) -->
<div class="md:col-span-4 space-y-6">
<!-- Status Panel -->
<div class="diamond-glass rounded-xl p-6">
<h3 class="font-label-caps text-label-caps text-on-surface-variant mb-4 tracking-widest">SYSTEM STATUS</h3>
<div class="flex items-center gap-3 mb-2">
<div class="w-2 h-2 rounded-full bg-tertiary shadow-[0_0_8px_rgba(42,229,0,0.8)] animate-pulse"></div>
<span class="font-body-md text-on-surface">Servers Operational</span>
</div>
<p class="font-body-md text-[12px] text-outline">Ping: 24ms | Version: 2.1.4</p>
</div>
<!-- Achievements/Titles -->
<div class="diamond-glass rounded-xl p-6">
<h3 class="font-label-caps text-label-caps text-on-surface-variant mb-4 tracking-widest">YOUR LEGACY</h3>
<div class="space-y-4">
<!-- Active Title -->
<div>
<span class="font-label-sm text-label-sm text-outline block mb-1">ACTIVE TITLE</span>
<div class="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-energy-amber/10 border border-energy-amber/30 text-energy-amber shadow-[0_0_10px_rgba(255,122,0,0.15)]">
<span class="material-symbols-outlined text-[14px]">local_fire_department</span>
<span class="font-label-caps text-[11px] font-bold">ABYSS WALKER</span>
</div>
</div>
<!-- Badges -->
<div>
<span class="font-label-sm text-label-sm text-outline block mb-2">UNLOCKED BADGES</span>
<div class="flex flex-wrap gap-2">
<div class="w-10 h-10 hexagon bg-primary-container border border-tertiary flex items-center justify-center shadow-[0_0_8px_rgba(42,229,0,0.2)]" style="clip-path: polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%);" title="First Blood">
<span class="material-symbols-outlined text-tertiary text-[18px]">verified</span>
</div>
<div class="w-10 h-10 hexagon bg-primary-container border border-mana-cyan flex items-center justify-center shadow-[0_0_8px_rgba(0,229,255,0.2)]" style="clip-path: polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%);" title="Explorer">
<span class="material-symbols-outlined text-mana-cyan text-[18px]">map</span>
</div>
<div class="w-10 h-10 hexagon bg-surface-bright/50 border border-outline-variant flex items-center justify-center opacity-50" style="clip-path: polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%);" title="Locked">
<span class="material-symbols-outlined text-outline text-[18px]">lock</span>
</div>
</div>
</div>
</div>
</div>
</div>
</div>
</main>
<!-- Floating Action Button (Live Chat) -->
<button class="fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full bg-energy-amber flex items-center justify-center border-2 border-tertiary shadow-[0_0_20px_rgba(255,122,0,0.6)] hover:scale-110 hover:shadow-[0_0_25px_rgba(42,229,0,0.6)] transition-all duration-300 group">
<span class="material-symbols-outlined text-void-black text-[28px] group-hover:animate-pulse" style="font-variation-settings: 'FILL' 1;">chat_bubble</span>
</button>
`;
  
  return (
    <div className={className} dangerouslySetInnerHTML={{ __html: content }} />
  );
}
