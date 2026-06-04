import React from 'react';

interface WeatherOverlayElectronStormProps {
  className?: string;
}

export function WeatherOverlayElectronStorm({ className = '' }: WeatherOverlayElectronStormProps) {
  const content = `
<!-- 3D Environment Layer -->
<div class="absolute inset-0 z-0 env-bg" data-alt="A dark mountainous terrain during an Electron Storm. Intense neon-green lightning arcs strike the jagged, rocky ground. The atmosphere is filled with static energy pulses and glowing atmospheric particles. The scene is rendered in a high-fidelity, hyper-realistic style typical of modern MMORPGs, emphasizing a cyber-zen aesthetic with deep oceanic blues and vibrant neon greens. The lighting is dramatic, high contrast, and immersive.">
<div class="absolute inset-0 storm-overlay"></div>
<!-- Simulated Lightning Flashes -->
<div class="absolute inset-0 bg-tertiary/10 mix-blend-color-dodge animate-pulse" style="animation-duration: 4s;"></div>
</div>
<!-- TopAppBar -->
<header class="flex justify-between items-center px-margin-mobile h-16 w-full fixed top-0 z-50 bg-surface/80 dark:bg-surface-dim/80 backdrop-blur-xl docked full-width top-0 border-b border-white/10 backdrop-blur-2xl border-b border-outline-variant/30 shadow-[0_4px_30px_rgba(0,0,0,0.1)]">
<button class="w-touch-min h-touch-min flex items-center justify-center text-primary dark:text-primary-fixed-dim hover:text-tertiary-fixed-dim transition-colors duration-300 scale-95 active:duration-75">
<span class="material-symbols-outlined" data-icon="language">language</span>
</button>
<h1 class="font-display-lg-mobile text-display-lg-mobile tracking-widest text-primary-fixed drop-shadow-[0_0_10px_rgba(175,200,240,0.5)] uppercase">
            ARELORIAN
        </h1>
<button class="w-touch-min h-touch-min flex items-center justify-center text-primary dark:text-primary-fixed-dim hover:text-tertiary-fixed-dim transition-colors duration-300 scale-95 active:duration-75">
<span class="material-symbols-outlined" data-icon="settings">settings</span>
</button>
</header>
<!-- Main Canvas Area -->
<main class="relative z-10 w-full h-full pt-16 pb-24 px-margin-mobile flex flex-col justify-between pointer-events-none">
<!-- Top HUD Elements -->
<div class="flex justify-between items-start mt-unit pointer-events-auto">
<!-- Player Stats Panel -->
<div class="glass-panel chamfered p-3 w-64 flex flex-col gap-2 rounded-lg">
<div class="flex items-center gap-3">
<div class="w-12 h-12 rounded-full border-2 border-primary-fixed-dim overflow-hidden shadow-[0_0_10px_rgba(175,200,240,0.3)]">
<img alt="Player Avatar" class="w-full h-full object-cover" data-alt="A portrait of a mysterious, futuristic character in a high-tech dark suit, suitable for an MMORPG player avatar. The lighting is dramatic, highlighting the character's focused expression against a dark background, fitting the cyber-zen, diamond glass aesthetic of the UI." src="https://lh3.googleusercontent.com/aida-public/AB6AXuCmOZuaUgFYnvACpaAXta9dRufC4WeqX8OBBsYyIHsCO1pQvV2daZtU0nUBHEJF7JgMYRB5hV8zOuYBburgTI9IupnpTeqQ-TMrwvU5R4RB4cKTbnOQZ3gu0xCTg0idfMUyaxIStWvS5AdmWpJ1Gw_n59t50faOrATOUfvUgqE5cTeDQafspqQU1K15aDacKaVPTpdLwAwmnW6sHws0SvqAh73gR0XQ_5wNX4CNd23KwdXNDn3Z0R2j0zMNWeJ6DZaHCs9IzNsleZE"/>
</div>
<div>
<div class="font-headline-md text-headline-md-mobile text-on-surface">Lv. 42</div>
<div class="font-label-caps text-label-caps text-primary-fixed-dim">Cyber-Monk</div>
</div>
</div>
<!-- Health Bar -->
<div class="w-full bg-surface-container-highest h-4 rounded-full overflow-hidden relative border border-white/5">
<div class="h-full bg-tertiary-fixed-dim w-3/4 relative">
<div class="progress-scan"></div>
</div>
</div>
<!-- Mana Bar -->
<div class="w-full bg-surface-container-highest h-3 rounded-full overflow-hidden relative border border-white/5">
<div class="h-full bg-mana-cyan w-1/2 relative">
<div class="progress-scan"></div>
</div>
</div>
</div>
<!-- Environmental Alert Chip -->
<div class="glass-panel chamfered px-4 py-2 flex items-center gap-2 border-tertiary-fixed-dim/50 shadow-[0_0_15px_rgba(42,229,0,0.3)] glow-effect">
<span class="material-symbols-outlined text-tertiary-fixed-dim animate-pulse" data-icon="bolt" data-weight="fill">bolt</span>
<span class="font-label-caps text-label-caps text-tertiary-fixed-dim tracking-wider">ELEMENTAL SURGE: ACTIVE</span>
</div>
</div>
<!-- Center Action Area (Empty for world view, but contains target reticle or similar) -->
<div class="flex-grow flex items-center justify-center">
<!-- Reticle / Focus indicator -->
<div class="w-32 h-32 border border-primary-fixed/20 rounded-full flex items-center justify-center relative">
<div class="absolute w-2 h-2 bg-energy-amber rounded-full shadow-[0_0_8px_rgba(255,122,0,0.8)]"></div>
<!-- Corner ticks -->
<div class="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-primary-fixed/50"></div>
<div class="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-primary-fixed/50"></div>
<div class="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-primary-fixed/50"></div>
<div class="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-primary-fixed/50"></div>
</div>
</div>
<!-- Bottom HUD Elements -->
<div class="flex justify-between items-end mb-unit pointer-events-auto">
<!-- Quick Items -->
<div class="flex gap-2">
<button class="glass-panel w-touch-min h-touch-min rounded-lg flex items-center justify-center hover:bg-white/10 transition-colors border-white/20">
<span class="material-symbols-outlined text-secondary-fixed-dim" data-icon="healing">healing</span>
</button>
<button class="glass-panel w-touch-min h-touch-min rounded-lg flex items-center justify-center hover:bg-white/10 transition-colors border-white/20">
<span class="material-symbols-outlined text-mana-cyan" data-icon="water_drop">water_drop</span>
</button>
</div>
<!-- Primary Action Button -->
<button class="btn-hex w-24 h-24 flex flex-col items-center justify-center text-on-surface">
<span class="material-symbols-outlined text-3xl" data-icon="swords">swords</span>
<span class="font-label-caps text-[10px] mt-1 font-bold">ATTACK</span>
</button>
</div>
</main>
<!-- BottomNavBar -->
<nav class="fixed bottom-0 left-0 w-full h-20 flex justify-around items-center px-4 pb-safe bg-surface-container-low/60 dark:bg-surface-container-lowest/60 backdrop-blur-2xl z-50 rounded-t-xl border-t border-white/10 backdrop-blur-3xl border-t border-outline-variant/20 shadow-[0_-10px_40px_rgba(0,0,0,0.5)] md:hidden">
<button class="flex flex-col items-center justify-center text-on-surface-variant/70 hover:text-primary-fixed-dim transition-all duration-200 active:scale-90 w-touch-min h-touch-min">
<span class="material-symbols-outlined mb-1" data-icon="explore">explore</span>
<span class="font-label-sm text-label-sm tracking-tighter uppercase">QUESTS</span>
</button>
<button class="flex flex-col items-center justify-center text-energy-amber drop-shadow-[0_0_8px_rgba(255,122,0,0.6)] scale-110 active:scale-90 transition-transform w-touch-min h-touch-min">
<span class="material-symbols-outlined mb-1" data-icon="map" data-weight="fill">map</span>
<span class="font-label-sm text-label-sm tracking-tighter uppercase font-bold">MAP</span>
</button>
<button class="flex flex-col items-center justify-center text-on-surface-variant/70 hover:text-primary-fixed-dim transition-all duration-200 active:scale-90 w-touch-min h-touch-min">
<span class="material-symbols-outlined mb-1" data-icon="bolt">bolt</span>
<span class="font-label-sm text-label-sm tracking-tighter uppercase">SKILLS</span>
</button>
<button class="flex flex-col items-center justify-center text-on-surface-variant/70 hover:text-primary-fixed-dim transition-all duration-200 active:scale-90 w-touch-min h-touch-min">
<span class="material-symbols-outlined mb-1" data-icon="work">work</span>
<span class="font-label-sm text-label-sm tracking-tighter uppercase">BAG</span>
</button>
<button class="flex flex-col items-center justify-center text-on-surface-variant/70 hover:text-primary-fixed-dim transition-all duration-200 active:scale-90 w-touch-min h-touch-min">
<span class="material-symbols-outlined mb-1" data-icon="group">group</span>
<span class="font-label-sm text-label-sm tracking-tighter uppercase">SOCIAL</span>
</button>
</nav>
<!-- Script for subtle interactive effects -->

`;
  
  return (
    <div className={className} dangerouslySetInnerHTML={{ __html: content }} />
  );
}
