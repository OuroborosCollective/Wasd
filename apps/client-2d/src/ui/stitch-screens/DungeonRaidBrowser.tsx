import React from 'react';

interface DungeonRaidBrowserProps {
  className?: string;
}

export function DungeonRaidBrowser({ className = '' }: DungeonRaidBrowserProps) {
  const content = `
<!-- Dark overlay for readability -->
<div class="absolute inset-0 bg-void-black/80 z-0"></div>
<!-- TopAppBar -->
<header class="bg-surface-container-low/80 backdrop-blur-xl fixed top-0 w-full z-50 border-b border-white/10 shadow-[0_0_15px_rgba(0,229,255,0.2)]">
<div class="flex justify-between items-center px-margin-mobile h-14 w-full">
<button class="h-touch-min w-touch-min flex items-center justify-center text-primary hover:bg-white/5 transition-colors active:scale-95 transition-transform rounded-full">
<span class="material-symbols-outlined">menu</span>
</button>
<h1 class="font-headline-md text-headline-md font-bold tracking-widest text-primary font-display-lg-mobile text-display-lg-mobile text-mana-cyan uppercase italic">QUEST BROWSER</h1>
<button class="h-touch-min w-touch-min flex items-center justify-center text-primary hover:bg-white/5 transition-colors active:scale-95 transition-transform rounded-full">
<span class="material-symbols-outlined">stay_primary_portrait</span>
</button>
</div>
</header>
<!-- Main Content Area -->
<main class="flex-1 z-10 pt-20 pb-28 px-margin-mobile overflow-y-auto w-full max-w-4xl mx-auto flex flex-col gap-6">
<!-- Category Switcher -->
<div class="flex gap-4 w-full">
<button class="flex-1 glass-panel bg-mana-cyan/10 border-mana-cyan/30 rounded-xl py-3 flex items-center justify-center gap-2 glow-active group relative overflow-hidden transition-all duration-300">
<div class="absolute inset-0 refraction-overlay"></div>
<span class="material-symbols-outlined text-mana-cyan relative z-10" style="font-variation-settings: 'FILL' 1;">swords</span>
<span class="font-headline-md text-headline-md text-mana-cyan tracking-wider relative z-10 text-sm">Dungeons</span>
</button>
<button class="flex-1 glass-panel bg-surface-container-high/40 border-white/10 rounded-xl py-3 flex items-center justify-center gap-2 hover:bg-white/5 transition-all duration-300">
<span class="material-symbols-outlined text-on-surface-variant">skull</span>
<span class="font-headline-md text-headline-md text-on-surface-variant tracking-wider text-sm">Raids</span>
</button>
</div>
<!-- Instance List -->
<div class="flex flex-col gap-6">
<!-- Card 1: The Abyssal Spire -->
<article class="glass-panel rounded-xl overflow-hidden relative group">
<div class="absolute inset-0 bg-cover bg-center opacity-40 mix-blend-luminosity group-hover:opacity-60 transition-opacity duration-500" data-alt="A dark, cinematic 2.5D view of a massive sunken temple deep underwater. Bioluminescent coral glows with eerie cyan and purple light against the obsidian stone structures. The water is murky and atmospheric, filled with floating particles and ancient energy. High-fantasy mystical aesthetic, dark moody lighting." style="background-image: url('https://lh3.googleusercontent.com/aida-public/AB6AXuCXQ8lc4Mt02Pt3viMzD-FnI6XJbXMdQWp5-P1mMGDCl-5dCjm81OnRLkD3yqc0pnIsMF3RGH1gKhvvtKWfuuAu8Lk7NVFLIL0q70LZnaBWJNvM6uuORJs9inpuVvYa2ADdx8eFFvtu7L_MreDGTShow30XdxdTlkQI2yjtTl-W-bBmBfqcJNcSB7JjFPmMm9pNe-olJmlQlOXJZ8yWJmnJny4TQxytpjmBYw06BefLh4dKNuTt6D7XQXS5kXHr4ScgFliCDFO7f2Y');"></div>
<div class="absolute inset-0 refraction-overlay z-0"></div>
<div class="relative z-10 p-5 flex flex-col gap-4">
<!-- Header -->
<div class="flex justify-between items-start">
<div>
<div class="flex items-center gap-2 mb-1">
<span class="material-symbols-outlined text-energy-amber text-sm" style="font-variation-settings: 'FILL' 1;">local_fire_department</span>
<span class="font-label-caps text-label-caps text-energy-amber">MYTHIC RAID</span>
</div>
<h2 class="font-headline-md text-headline-md text-white tracking-wide">The Abyssal Spire</h2>
</div>
<div class="bg-mana-cyan/20 border border-mana-cyan/50 rounded px-2 py-1 flex items-center gap-1">
<span class="w-2 h-2 rounded-full bg-mana-cyan shadow-[0_0_8px_#00E5FF]"></span>
<span class="font-label-caps text-label-caps text-mana-cyan">OPEN</span>
</div>
</div>
<!-- Requirements & Rewards -->
<div class="flex justify-between items-end mt-2">
<div class="flex flex-col gap-2">
<div class="flex items-center gap-2 text-on-surface-variant">
<span class="material-symbols-outlined text-sm">stat_3</span>
<span class="font-label-sm text-label-sm">Req: Lvl 99 | 450 Res</span>
</div>
<div class="flex items-center gap-2">
<span class="font-label-sm text-label-sm text-on-surface-variant">Rewards:</span>
<div class="w-6 h-6 diamond-chip bg-purple-500/20 border border-purple-500/50 flex items-center justify-center">
<span class="material-symbols-outlined text-purple-400" style="font-size: 14px;">sports_mma</span>
</div>
<div class="w-6 h-6 diamond-chip bg-tertiary/20 border border-tertiary/50 flex items-center justify-center">
<span class="material-symbols-outlined text-tertiary" style="font-size: 14px;">payments</span>
</div>
</div>
</div>
<button class="hex-btn bg-energy-amber text-void-black font-headline-md text-headline-md text-sm px-6 py-2 border-2 border-tertiary glow-accent hover:bg-energy-amber/90 transition-colors flex items-center gap-2">
                            ENTER <span class="material-symbols-outlined text-sm">login</span>
</button>
</div>
</div>
</article>
<!-- Card 2: Verdant Labyrinth -->
<article class="glass-panel rounded-xl overflow-hidden relative group">
<div class="absolute inset-0 bg-cover bg-center opacity-30 mix-blend-luminosity" data-alt="A lush, dense mystical forest viewed from a slight isometric angle. Huge ancient trees with glowing green moss and vibrant neon flora. Sunbeams pierce through the thick canopy, illuminating a winding dirt path scattered with crystalline rocks. High-fantasy aesthetic, ethereal lighting." style="background-image: url('https://lh3.googleusercontent.com/aida-public/AB6AXuCru1XCM1DJGiC6RRb6t68hzLLvfxVCnDGiPaJHkIb2PMcGB1cAw08aJ45Hf8PdzAgJYcCdNMcaSTiUGLNaejU_2AN1ItBP10Kh2EzmgQDpjCPaOD02P4nQUyz4u8eHFHLXQuBdM9lEy4vgQnL91UBJD_nlI1ndqxvvERoIzRxDcwfpD6y8FZZGn5OCVb9RdIUBGHUEQzPnF00FvtVnUDMxw1t-88uhRD8SAUhi_4kI5JH8lRWS5PVWRPXNLTiG46BzDbfX62Q4TUk');"></div>
<div class="absolute inset-0 refraction-overlay z-0"></div>
<div class="relative z-10 p-5 flex flex-col gap-4">
<div class="flex justify-between items-start">
<div>
<div class="flex items-center gap-2 mb-1">
<span class="material-symbols-outlined text-purple-400 text-sm">swords</span>
<span class="font-label-caps text-label-caps text-purple-400">HEROIC DUNGEON</span>
</div>
<h2 class="font-headline-md text-headline-md text-white tracking-wide">Verdant Labyrinth</h2>
</div>
<div class="bg-tertiary/10 border border-tertiary/30 rounded px-2 py-1 flex items-center gap-1">
<span class="material-symbols-outlined text-tertiary text-sm animate-pulse">sync</span>
<span class="font-label-caps text-label-caps text-tertiary">IN PROGRESS (3/5)</span>
</div>
</div>
<!-- Progress Bar -->
<div class="w-full h-2 bg-surface-container-highest rounded-full overflow-hidden border border-white/5 mt-2">
<div class="h-full bg-tertiary shadow-[0_0_10px_#2AE500]" style="width: 60%;"></div>
</div>
<div class="flex justify-between items-end mt-2">
<div class="flex items-center gap-2 text-on-surface-variant">
<span class="material-symbols-outlined text-sm">group</span>
<span class="font-label-sm text-label-sm">Party: 4/5</span>
</div>
<button class="hex-btn bg-transparent text-mana-cyan font-headline-md text-headline-md text-sm px-6 py-2 border border-mana-cyan hover:bg-mana-cyan/10 transition-colors flex items-center gap-2">
                            REJOIN
                        </button>
</div>
</div>
</article>
<!-- Card 3: Frosthold Pinnacle -->
<article class="glass-panel bg-surface-container-low/40 rounded-xl overflow-hidden relative opacity-75 grayscale-[50%]">
<div class="absolute inset-0 bg-cover bg-center opacity-20" data-alt="A frozen, jagged mountain peak bathed in pale moonlight. Massive shards of ice jut out from the rocky surface, reflecting a cold, sterile blue light. Snow blows across the screen. Harsh, desolate, and imposing high-fantasy landscape." style="background-image: url('https://lh3.googleusercontent.com/aida-public/AB6AXuDpVVEMvxKy0hDa6tHbZDVMTgiU0MeOhArnGnMeWWMva01_Eai7dVaQMj_Hw5dU7hS_hhRlrR6SlMpDxqYs9Wh7DJqBb3bA664PS5TN_cf2aPRy0BlsXkSuoHV3uBF9VkvcMBFvDtKXB8roBFHkAMw7gsreWpD_qXTbtOYMKq7i6wsM4zzZ7SjmOxtAMvju6yvFM62ErvlDk2TM_cyyOaJ07RTBHOsqzXJ8pkOCqSjXGsfIbBUz1KWnJvNqpNB4T9BOuHMeVBWceGA');"></div>
<div class="relative z-10 p-5 flex flex-col gap-4">
<div class="flex justify-between items-start">
<div>
<div class="flex items-center gap-2 mb-1">
<span class="material-symbols-outlined text-primary text-sm">ac_unit</span>
<span class="font-label-caps text-label-caps text-primary">NORMAL DUNGEON</span>
</div>
<h2 class="font-headline-md text-headline-md text-on-surface-variant tracking-wide">Frosthold Pinnacle</h2>
</div>
<div class="bg-surface-container-highest border border-white/10 rounded px-2 py-1 flex items-center gap-1">
<span class="material-symbols-outlined text-outline-variant text-sm">lock</span>
<span class="font-label-caps text-label-caps text-outline-variant">LOCKED</span>
</div>
</div>
<div class="flex items-center gap-2 mt-4 text-error">
<span class="material-symbols-outlined text-sm">warning</span>
<span class="font-label-sm text-label-sm">Requires Lv. 45</span>
</div>
</div>
</article>
</div>
</main>
<!-- BottomNavBar -->
<nav class="bg-deep-space/90 backdrop-blur-2xl fixed bottom-0 w-full z-50 rounded-t-xl border-t border-white/10 shadow-[0_-4px_20px_rgba(0,0,0,0.5)] md:hidden">
<div class="flex justify-around items-center w-full h-20 pb-safe px-4">
<button class="h-touch-min flex flex-col items-center justify-center text-on-surface-variant/60 hover:text-tertiary transition-all active:scale-90 duration-150">
<span class="material-symbols-outlined">hub</span>
<span class="font-label-caps text-label-caps">Nexus</span>
</button>
<button class="h-touch-min flex flex-col items-center justify-center text-mana-cyan drop-shadow-[0_0_8px_rgba(0,229,255,0.6)] hover:text-tertiary transition-all active:scale-90 duration-150">
<span class="material-symbols-outlined" style="font-variation-settings: 'FILL' 1;">swords</span>
<span class="font-label-caps text-label-caps">Dungeons</span>
</button>
<button class="h-touch-min flex flex-col items-center justify-center text-on-surface-variant/60 hover:text-tertiary transition-all active:scale-90 duration-150">
<span class="material-symbols-outlined">shield</span>
<span class="font-label-caps text-label-caps">Arsenal</span>
</button>
<button class="h-touch-min flex flex-col items-center justify-center text-on-surface-variant/60 hover:text-tertiary transition-all active:scale-90 duration-150">
<span class="material-symbols-outlined">group</span>
<span class="font-label-caps text-label-caps">Social</span>
</button>
<button class="h-touch-min flex flex-col items-center justify-center text-on-surface-variant/60 hover:text-tertiary transition-all active:scale-90 duration-150">
<span class="material-symbols-outlined">person_pin_circle</span>
<span class="font-label-caps text-label-caps">Profile</span>
</button>
</div>
</nav>
<!-- Tablet/Desktop Side Nav (Hidden on Mobile) -->
<nav class="hidden md:flex flex-col bg-deep-space/90 backdrop-blur-2xl fixed left-0 top-14 bottom-0 w-20 border-r border-white/10 shadow-[4px_0_20px_rgba(0,0,0,0.5)] z-40 py-6 items-center gap-8">
<button class="h-touch-min w-touch-min flex flex-col items-center justify-center text-on-surface-variant/60 hover:text-tertiary transition-all active:scale-90 duration-150" title="Nexus">
<span class="material-symbols-outlined text-2xl">hub</span>
</button>
<button class="h-touch-min w-touch-min flex flex-col items-center justify-center text-mana-cyan drop-shadow-[0_0_8px_rgba(0,229,255,0.6)] hover:text-tertiary transition-all active:scale-90 duration-150" title="Dungeons">
<span class="material-symbols-outlined text-2xl" style="font-variation-settings: 'FILL' 1;">swords</span>
</button>
<button class="h-touch-min w-touch-min flex flex-col items-center justify-center text-on-surface-variant/60 hover:text-tertiary transition-all active:scale-90 duration-150" title="Arsenal">
<span class="material-symbols-outlined text-2xl">shield</span>
</button>
<button class="h-touch-min w-touch-min flex flex-col items-center justify-center text-on-surface-variant/60 hover:text-tertiary transition-all active:scale-90 duration-150" title="Social">
<span class="material-symbols-outlined text-2xl">group</span>
</button>
<button class="h-touch-min w-touch-min flex flex-col items-center justify-center text-on-surface-variant/60 hover:text-tertiary transition-all active:scale-90 duration-150" title="Profile">
<span class="material-symbols-outlined text-2xl">person_pin_circle</span>
</button>
</nav>
`;
  
  return (
    <div className={className} dangerouslySetInnerHTML={{ __html: content }} />
  );
}
