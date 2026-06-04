import React from 'react';

interface PartyRaidInterfaceProps {
  className?: string;
}

export function PartyRaidInterface({ className = '' }: PartyRaidInterfaceProps) {
  const content = `
<!-- TopAppBar -->
<div class="bg-surface/80 dark:bg-surface-dim/80 backdrop-blur-xl docked full-width top-0 border-b border-white/10 backdrop-blur-2xl border-b border-outline-variant/30 shadow-[0_4px_30px_rgba(0,0,0,0.1)] flex justify-between items-center px-margin-mobile h-16 w-full fixed top-0 z-50 md:flex hidden">
<button class="text-on-surface-variant hover:text-tertiary-fixed-dim transition-colors duration-300 scale-95 active:duration-75 h-touch-min w-touch-min flex items-center justify-center">
<span class="material-symbols-outlined" data-icon="language">language</span>
</button>
<h1 class="font-display-lg text-display-lg tracking-widest text-primary-fixed drop-shadow-[0_0_10px_rgba(175,200,240,0.5)]">ARELORIAN</h1>
<button class="text-on-surface-variant hover:text-tertiary-fixed-dim transition-colors duration-300 scale-95 active:duration-75 h-touch-min w-touch-min flex items-center justify-center">
<span class="material-symbols-outlined" data-icon="settings">settings</span>
</button>
</div>
<!-- Mobile TopAppBar -->
<div class="bg-surface/80 dark:bg-surface-dim/80 backdrop-blur-xl docked full-width top-0 border-b border-white/10 backdrop-blur-2xl border-b border-outline-variant/30 shadow-[0_4px_30px_rgba(0,0,0,0.1)] flex justify-between items-center px-margin-mobile h-16 w-full fixed top-0 z-50 md:hidden flex">
<button class="text-on-surface-variant hover:text-tertiary-fixed-dim transition-colors duration-300 scale-95 active:duration-75 h-touch-min w-touch-min flex items-center justify-center">
<span class="material-symbols-outlined" data-icon="language">language</span>
</button>
<h1 class="font-display-lg-mobile text-display-lg-mobile tracking-widest text-primary-fixed drop-shadow-[0_0_10px_rgba(175,200,240,0.5)]">ARELORIAN</h1>
<button class="text-on-surface-variant hover:text-tertiary-fixed-dim transition-colors duration-300 scale-95 active:duration-75 h-touch-min w-touch-min flex items-center justify-center">
<span class="material-symbols-outlined" data-icon="settings">settings</span>
</button>
</div>
<!-- Main Layout Grid -->
<main class="max-w-7xl mx-auto px-margin-mobile md:px-margin-tablet grid grid-cols-1 md:grid-cols-12 gap-gutter mt-8">
<!-- Left Column: Party/Raid Frames -->
<section class="md:col-span-4 lg:col-span-3 space-y-4">
<div class="flex items-center justify-between mb-2">
<h2 class="font-headline-md text-headline-md text-primary-fixed-dim">Party</h2>
<div class="flex gap-2">
<span class="font-label-caps text-label-caps text-on-surface-variant">5/5</span>
<button class="text-primary hover:text-tertiary-fixed-dim"><span class="material-symbols-outlined text-[18px]">more_horiz</span></button>
</div>
</div>
<!-- Party Member 1 (Self) -->
<div class="glass-panel chamfered-corner p-3 flex flex-col gap-2 relative z-10">
<div class="flex justify-between items-end">
<span class="font-label-caps text-label-caps text-primary">Kaelen <span class="text-on-surface-variant text-[10px] ml-1">Lvl 60</span></span>
<div class="flex gap-1">
<!-- Buff -->
<div class="w-4 h-4 crystal-icon border-mana-cyan shadow-[inset_0_0_8px_rgba(0,229,255,0.5)] flex items-center justify-center bg-mana-cyan/20"></div>
</div>
</div>
<div class="space-y-1">
<!-- HP -->
<div class="resource-bar-container h-4 w-full chamfered-corner">
<div class="health-fill bar-scan-effect h-full w-[85%]"></div>
<span class="absolute inset-0 flex items-center justify-center font-label-sm text-[8px] text-white font-bold drop-shadow-md z-10">8,500 / 10,000</span>
</div>
<!-- MP -->
<div class="resource-bar-container h-2 w-full chamfered-corner">
<div class="mana-fill bar-scan-effect h-full w-[60%]"></div>
</div>
</div>
<div class="absolute right-2 top-2">
<span class="material-symbols-outlined text-energy-amber text-[16px] drop-shadow-[0_0_4px_rgba(255,122,0,0.8)]">star</span> <!-- Leader icon -->
</div>
</div>
<!-- Party Member 2 -->
<div class="glass-panel chamfered-corner p-3 flex flex-col gap-2 relative z-10">
<div class="flex justify-between items-end">
<span class="font-label-caps text-label-caps text-surface-tint">Elara <span class="text-on-surface-variant text-[10px] ml-1">Lvl 59</span></span>
<div class="flex gap-1">
<!-- Debuff -->
<div class="w-4 h-4 crystal-icon flex items-center justify-center">
<span class="material-symbols-outlined text-[10px] text-error">water_drop</span>
</div>
</div>
</div>
<div class="space-y-1">
<div class="resource-bar-container h-4 w-full chamfered-corner">
<div class="health-fill h-full w-[45%] opacity-80"></div>
<span class="absolute inset-0 flex items-center justify-center font-label-sm text-[8px] text-white font-bold drop-shadow-md z-10">4,200 / 9,500</span>
</div>
<div class="resource-bar-container h-2 w-full chamfered-corner">
<div class="mana-fill h-full w-[90%]"></div>
</div>
</div>
</div>
<!-- Party Member 3 -->
<div class="glass-panel chamfered-corner p-3 flex flex-col gap-2 relative z-10">
<div class="flex justify-between items-end">
<span class="font-label-caps text-label-caps text-surface-tint">Thorne <span class="text-on-surface-variant text-[10px] ml-1">Lvl 60</span></span>
</div>
<div class="space-y-1">
<div class="resource-bar-container h-4 w-full chamfered-corner">
<div class="health-fill h-full w-[100%]"></div>
<span class="absolute inset-0 flex items-center justify-center font-label-sm text-[8px] text-white font-bold drop-shadow-md z-10">12,000 / 12,000</span>
</div>
<div class="resource-bar-container h-2 w-full chamfered-corner">
<!-- Rage/Energy proxy color -->
<div class="bg-gradient-to-r from-energy-amber to-secondary-container h-full w-[30%]"></div>
</div>
</div>
</div>
<!-- Party Member 4 -->
<div class="glass-panel chamfered-corner p-3 flex flex-col gap-2 relative z-10 opacity-60"> <!-- Offline/Out of range indicator -->
<div class="flex justify-between items-end">
<span class="font-label-caps text-label-caps text-outline">Vael <span class="text-on-surface-variant text-[10px] ml-1">Lvl 58</span></span>
<span class="font-label-sm text-error">Out of Range</span>
</div>
<div class="space-y-1 grayscale">
<div class="resource-bar-container h-4 w-full chamfered-corner">
<div class="health-fill h-full w-[100%]"></div>
</div>
<div class="resource-bar-container h-2 w-full chamfered-corner">
<div class="mana-fill h-full w-[100%]"></div>
</div>
</div>
</div>
</section>
<!-- Right Column: Dungeon/Raid Browser -->
<section class="md:col-span-8 lg:col-span-9 flex flex-col gap-4">
<div class="flex items-center justify-between">
<h2 class="font-headline-md text-headline-md text-primary-fixed-dim">Instance Browser</h2>
<div class="flex gap-2 bg-surface-container-low rounded-full p-1 border border-outline-variant/30">
<button class="px-4 py-1 rounded-full bg-surface-variant text-primary text-sm font-medium">Dungeons</button>
<button class="px-4 py-1 rounded-full text-on-surface-variant hover:text-primary text-sm font-medium transition-colors">Raids</button>
</div>
</div>
<!-- Main Feature Card -->
<div class="glass-panel rounded-xl overflow-hidden min-h-[300px] flex flex-col justify-end p-6 relative group">
<!-- Background Image (simulated via gradient/pattern for now to avoid large base64, usually an img tag) -->
<div class="absolute inset-0 z-0 bg-[url('https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&amp;w=1000&amp;auto=format&amp;fit=crop')] bg-cover bg-center opacity-30 group-hover:opacity-40 transition-opacity duration-500" data-alt="A dark, atmospheric fantasy dungeon entrance carved into jagged, luminescent teal crystal formations. The scene is illuminated by an eerie, pulsing underwater-like glow against deep marine blues, fitting a hyper-refined sci-fantasy aesthetic. Sharp geometric shadows contrast with the bright, glowing crystalline structures. The mood is mysterious and dangerous."></div>
<div class="absolute inset-0 z-0 bg-gradient-to-t from-background via-background/80 to-transparent"></div>
<div class="relative z-10 flex flex-col md:flex-row justify-between items-end gap-4">
<div>
<div class="flex items-center gap-2 mb-2">
<span class="w-3 h-3 bg-secondary-fixed rotate-45 inline-block"></span>
<span class="font-label-caps text-label-caps text-secondary-fixed tracking-widest">MYTHIC RAID</span>
</div>
<h3 class="font-display-lg text-display-lg text-primary-fixed drop-shadow-md mb-1 leading-tight">The Abyssal Spire</h3>
<p class="font-body-md text-body-md text-on-surface-variant max-w-md">Descend into the submerged ruins to stop the tide-callers before they awaken the leviathan.</p>
<div class="flex gap-4 mt-4">
<div class="flex items-center gap-1 text-on-surface-variant font-label-caps text-label-caps">
<span class="material-symbols-outlined text-[16px] text-tertiary-fixed-dim">swords</span> Lvl 60+
                            </div>
<div class="flex items-center gap-1 text-on-surface-variant font-label-caps text-label-caps">
<span class="material-symbols-outlined text-[16px] text-mana-cyan">group</span> 20 Players
                            </div>
</div>
</div>
<button class="hex-button hex-button-primary pulse-anim px-8 py-3 text-on-secondary-fixed font-bold tracking-wider font-label-caps h-touch-min flex items-center justify-center min-w-[160px]">
                        FIND GROUP
                    </button>
</div>
</div>
<!-- List of available instances -->
<div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
<!-- Instance Item 1 -->
<div class="glass-panel p-4 chamfered-corner flex items-center gap-4 hover:bg-surface-container-high/50 transition-colors cursor-pointer group">
<div class="w-16 h-16 bg-surface-container-highest rounded flex items-center justify-center border border-white/5 relative overflow-hidden">
<div class="absolute inset-0 bg-energy-amber/10 group-hover:bg-energy-amber/20 transition-colors"></div>
<span class="material-symbols-outlined text-primary-fixed text-[32px] drop-shadow-lg z-10">castle</span>
</div>
<div class="flex-1">
<h4 class="font-headline-md text-[18px] text-primary-fixed-dim">Echoing Halls</h4>
<div class="flex items-center gap-3 mt-1">
<span class="font-label-sm text-label-sm text-outline">Lvl 45-50</span>
<span class="font-label-sm text-label-sm text-energy-amber flex items-center gap-1"><span class="w-1.5 h-1.5 rounded-full bg-energy-amber"></span> Normal</span>
</div>
</div>
<button class="w-10 h-10 rounded-full border border-outline-variant/30 flex items-center justify-center text-on-surface-variant hover:text-primary hover:border-primary transition-all">
<span class="material-symbols-outlined text-[20px]">add</span>
</button>
</div>
<!-- Instance Item 2 -->
<div class="glass-panel p-4 chamfered-corner flex items-center gap-4 hover:bg-surface-container-high/50 transition-colors cursor-pointer group">
<div class="w-16 h-16 bg-surface-container-highest rounded flex items-center justify-center border border-white/5 relative overflow-hidden">
<div class="absolute inset-0 bg-mana-cyan/10 group-hover:bg-mana-cyan/20 transition-colors"></div>
<span class="material-symbols-outlined text-primary-fixed text-[32px] drop-shadow-lg z-10">forest</span>
</div>
<div class="flex-1">
<h4 class="font-headline-md text-[18px] text-primary-fixed-dim">Verdant Labyrinth</h4>
<div class="flex items-center gap-3 mt-1">
<span class="font-label-sm text-label-sm text-outline">Lvl 55-60</span>
<span class="font-label-sm text-label-sm text-tertiary-fixed-dim flex items-center gap-1"><span class="w-1.5 h-1.5 rounded-full bg-tertiary-fixed-dim"></span> Heroic</span>
</div>
</div>
<button class="w-10 h-10 rounded-full border border-outline-variant/30 flex items-center justify-center text-on-surface-variant hover:text-primary hover:border-primary transition-all">
<span class="material-symbols-outlined text-[20px]">add</span>
</button>
</div>
</div>
</section>
</main>
<!-- BottomNavBar -->
<nav class="bg-surface-container-low/60 dark:bg-surface-container-lowest/60 backdrop-blur-2xl text-tertiary-fixed-dim font-label-sm text-label-sm tracking-tighter font-display-lg-mobile text-display-lg-mobile text-primary fixed bottom-0 w-full z-50 rounded-t-xl border-t border-white/10 backdrop-blur-3xl border-t border-outline-variant/20 shadow-[0_-10px_40px_rgba(0,0,0,0.5)] fixed bottom-0 left-0 w-full h-20 flex justify-around items-center px-4 pb-safe md:hidden">
<a class="flex flex-col items-center justify-center text-on-surface-variant/70 hover:text-primary-fixed-dim transition-all duration-200 active:scale-90 transition-transform h-touch-min min-w-[touch-min]" href="#">
<span class="material-symbols-outlined" data-icon="explore">explore</span>
<span>QUESTS</span>
</a>
<a class="flex flex-col items-center justify-center text-on-surface-variant/70 hover:text-primary-fixed-dim transition-all duration-200 active:scale-90 transition-transform h-touch-min min-w-[touch-min]" href="#">
<span class="material-symbols-outlined" data-icon="map">map</span>
<span>MAP</span>
</a>
<a class="flex flex-col items-center justify-center text-on-surface-variant/70 hover:text-primary-fixed-dim transition-all duration-200 active:scale-90 transition-transform h-touch-min min-w-[touch-min]" href="#">
<span class="material-symbols-outlined" data-icon="bolt">bolt</span>
<span>SKILLS</span>
</a>
<a class="flex flex-col items-center justify-center text-on-surface-variant/70 hover:text-primary-fixed-dim transition-all duration-200 active:scale-90 transition-transform h-touch-min min-w-[touch-min]" href="#">
<span class="material-symbols-outlined" data-icon="work">work</span>
<span>BAG</span>
</a>
<!-- Active Tab: Social matches Party/Raid intent -->
<a class="flex flex-col items-center justify-center text-energy-amber drop-shadow-[0_0_8px_rgba(255,122,0,0.6)] scale-110 hover:text-primary-fixed-dim transition-all duration-200 active:scale-90 transition-transform h-touch-min min-w-[touch-min]" href="#">
<span class="material-symbols-outlined" data-icon="group" data-weight="fill" style="font-variation-settings: 'FILL' 1;">group</span>
<span>SOCIAL</span>
</a>
</nav>
`;
  
  return (
    <div className={className} dangerouslySetInnerHTML={{ __html: content }} />
  );
}
