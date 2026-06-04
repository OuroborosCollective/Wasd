import React from 'react';

interface WeatherOverlaySandstormProps {
  className?: string;
}

export function WeatherOverlaySandstorm({ className = '' }: WeatherOverlaySandstormProps) {
  const content = `
<!-- Gameplay Environment Background -->
<div class="fixed inset-0 z-0">
<img alt="Desert Sandstorm" class="w-full h-full object-cover opacity-60 mix-blend-luminosity" data-alt="A sprawling, desolate desert landscape during a massive sandstorm in a Fantasy-Science MMORPG setting. Swirling clouds of sunset-orange sand obscure ancient, glowing crystalline ruins jutting from the dunes. The lighting is harsh and atmospheric, filtering through the thick dust to create a dramatic, gritty mood. Deep oceanic depth cues contrast with the vibrant, chaotic energy of the storm. Diamond Glass aesthetic." src="https://lh3.googleusercontent.com/aida-public/AB6AXuD4ZJf2jbOGmIJ7sCoeSD_hmXu0OagLCqzDSQUxOfpfL3qKhyf3qXyzGHur5JSz-fiRC76uqruJtDoGaU4tpNAXgmN-GW4kH1CnNES9lj13Jb_auPDKUPESN9kQXiliLnTnFuBucXcCWA_9QfnYLkqpa3y_rhIcbqWqNOg-lPGz4DVBWLqnVzyfFtBT56hSJNLzGsI2YuObBIxmpxWdk5fxLcq8vWcDDb2O036QpA-8PEai4DSI9aIULCz1k-Ysgjjv4obMQWq-8EA"/>
<div class="absolute inset-0 bg-gradient-to-t from-surface via-transparent to-surface/80"></div>
<div class="absolute inset-0 bg-energy-amber/10 mix-blend-color-burn"></div>
<!-- Simulated Sandstorm Particles -->
<div class="sandstorm-layer z-10"></div>
</div>
<!-- UI LAYER (Z-20+) -->
<div class="relative z-20 flex flex-col h-screen">
<!-- TopAppBar (From JSON) -->
<header class="flex justify-between items-center px-margin-mobile h-16 w-full fixed top-0 z-50 bg-surface/80 dark:bg-surface-dim/80 backdrop-blur-xl docked full-width border-b border-white/10 backdrop-blur-2xl border-outline-variant/30 shadow-[0_4px_30px_rgba(0,0,0,0.1)] hidden md:flex">
<button class="text-primary dark:text-primary-fixed-dim hover:text-tertiary-fixed-dim transition-colors duration-300 scale-95 active:duration-75 flex items-center justify-center w-touch-min h-touch-min">
<span class="material-symbols-outlined" style="font-variation-settings: 'FILL' 0;">language</span>
</button>
<h1 class="font-display-lg-mobile text-display-lg-mobile tracking-widest text-primary-fixed drop-shadow-[0_0_10px_rgba(175,200,240,0.5)]">
                ARELORIAN
            </h1>
<button class="text-primary dark:text-primary-fixed-dim hover:text-tertiary-fixed-dim transition-colors duration-300 scale-95 active:duration-75 flex items-center justify-center w-touch-min h-touch-min">
<span class="material-symbols-outlined" style="font-variation-settings: 'FILL' 0;">settings</span>
</button>
</header>
<!-- Main Content Area (HUD) -->
<main class="flex-1 relative w-full h-full p-margin-mobile md:p-margin-tablet pt-20 md:pt-24 pb-28 md:pb-margin-tablet flex flex-col justify-between pointer-events-none">
<!-- Top HUD: Player Status & Mini-map -->
<div class="flex justify-between items-start w-full pointer-events-auto">
<!-- Player Vitals (Diamond Glass Panel) -->
<div class="diamond-glass diamond-glass-highlight p-4 flex items-center gap-4 w-72">
<!-- Avatar Hex -->
<div class="w-14 h-14 relative" style="clip-path: polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%); background: theme('colors.surface-variant'); border: 1px solid rgba(255,255,255,0.2);">
<img alt="Player Avatar" class="w-full h-full object-cover mix-blend-screen opacity-80" data-alt="A stylized portrait of a female MMORPG character wearing futuristic, glowing armor with crystalline accents. The portrait is set against a dark, moody background with subtle neon green and deep blue highlights, reflecting the Diamond Glass and Cyber-Zen aesthetic of the game. Sharp details and high contrast." src="https://lh3.googleusercontent.com/aida-public/AB6AXuAAjxwaKeLpWpDHrIxaH9z86-Cz1tq6GRIwOQyBne_UArASPI3W95_LFXjKUUdFTI-KUNHRi0TQ1IDqDhOzv0_FrIpSyJl2inebkWlEPj68vtzmvG4iboiy6wgJmCyQn1G-w9GtV35Zi4bQ7uaKHZ9CohqVpcLemGel8d56J6Rw2Pm81i5r8AHwq6Z_AVbAE7Ilm4HD2gE1QhsBajMg9YmO07Tyu64Cwz1DBXKouuP93inEZDgmTdmx2s1G8YS4xCYHV6dziymJbDk"/>
</div>
<div class="flex-1 flex flex-col gap-2">
<div class="flex justify-between items-end">
<span class="font-headline-md text-headline-md text-on-surface">Lyra</span>
<span class="font-label-caps text-label-caps text-primary-fixed-dim">LVL 42</span>
</div>
<!-- Health Bar -->
<div class="stat-bar-container h-3 w-full">
<div class="stat-bar-fill-health h-full w-[85%] relative">
<div class="scanning-light"></div>
</div>
</div>
<!-- Mana Bar -->
<div class="stat-bar-container h-2 w-full mt-1">
<div class="stat-bar-fill-mana h-full w-[60%] relative">
<div class="scanning-light"></div>
</div>
</div>
</div>
</div>
<!-- Mini-map / Objective -->
<div class="diamond-glass diamond-glass-highlight p-3 w-48 h-48 flex flex-col hidden md:flex">
<div class="flex-1 bg-surface/50 border border-white/5 relative overflow-hidden" style="clip-path: polygon(10px 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%, 0 10px);">
<!-- Simplified Radar Grid -->
<div class="absolute inset-0 border border-tertiary-fixed-dim/20 rounded-full m-4"></div>
<div class="absolute inset-0 border border-tertiary-fixed-dim/40 rounded-full m-8"></div>
<!-- Player Blip -->
<div class="absolute top-1/2 left-1/2 w-2 h-2 bg-energy-amber rounded-full -mt-1 -ml-1 shadow-[0_0_8px_theme('colors.energy-amber')] animate-pulse"></div>
<!-- Objective Blip -->
<div class="absolute top-1/4 right-1/4 w-2 h-2 bg-mana-cyan rounded-full shadow-[0_0_8px_theme('colors.mana-cyan')]"></div>
</div>
<div class="mt-2 text-center">
<span class="font-label-caps text-label-caps text-on-surface-variant">SECTOR 7G - THE DUNES</span>
</div>
</div>
</div>
<!-- Environment Hazard Alert -->
<div class="self-center flex flex-col items-center pointer-events-none mt-8">
<div class="bg-error/10 border border-error/30 backdrop-blur-md px-6 py-2 rounded-full flex items-center gap-2">
<span class="material-symbols-outlined text-energy-amber animate-pulse">warning</span>
<span class="font-label-caps text-label-caps text-energy-amber tracking-widest">EXTREME WEATHER: SANDSTORM</span>
</div>
</div>
<!-- Bottom HUD: Action Bar -->
<div class="w-full flex justify-center items-end pb-8 pointer-events-auto hidden md:flex">
<div class="diamond-glass p-2 flex gap-2">
<!-- Action Slots -->
<button class="w-14 h-14 bg-surface/50 border border-white/10 hover:border-tertiary-fixed-dim/50 transition-colors flex items-center justify-center relative group" style="clip-path: polygon(5px 0, 100% 0, 100% calc(100% - 5px), calc(100% - 5px) 100%, 0 100%, 0 5px);">
<span class="material-symbols-outlined text-on-surface group-hover:text-tertiary-fixed-dim text-2xl">swords</span>
<span class="absolute bottom-1 right-1 font-label-sm text-label-sm text-on-surface-variant">1</span>
</button>
<button class="w-14 h-14 bg-surface/50 border border-white/10 hover:border-tertiary-fixed-dim/50 transition-colors flex items-center justify-center relative group" style="clip-path: polygon(5px 0, 100% 0, 100% calc(100% - 5px), calc(100% - 5px) 100%, 0 100%, 0 5px);">
<span class="material-symbols-outlined text-mana-cyan group-hover:text-tertiary-fixed-dim text-2xl">local_fire_department</span>
<span class="absolute bottom-1 right-1 font-label-sm text-label-sm text-on-surface-variant">2</span>
</button>
<button class="w-14 h-14 bg-surface/50 border border-white/10 hover:border-tertiary-fixed-dim/50 transition-colors flex items-center justify-center relative group" style="clip-path: polygon(5px 0, 100% 0, 100% calc(100% - 5px), calc(100% - 5px) 100%, 0 100%, 0 5px);">
<span class="material-symbols-outlined text-energy-amber group-hover:text-tertiary-fixed-dim text-2xl">shield</span>
<span class="absolute bottom-1 right-1 font-label-sm text-label-sm text-on-surface-variant">3</span>
</button>
<!-- Divider -->
<div class="w-px bg-white/10 mx-2 my-1"></div>
<!-- Primary Action -->
<button class="btn-hex-primary w-20 h-20 flex flex-col items-center justify-center text-void-black font-bold group">
<span class="material-symbols-outlined text-3xl">bolt</span>
</button>
</div>
</div>
</main>
<!-- BottomNavBar (From JSON) - Mobile Only -->
<nav class="fixed bottom-0 left-0 w-full h-20 flex justify-around items-center px-4 pb-safe bg-surface-container-low/60 dark:bg-surface-container-lowest/60 backdrop-blur-3xl border-t border-outline-variant/20 shadow-[0_-10px_40px_rgba(0,0,0,0.5)] z-50 md:hidden">
<!-- Explore (Active) -->
<button class="flex flex-col items-center justify-center text-energy-amber drop-shadow-[0_0_8px_rgba(255,122,0,0.6)] scale-110 active:scale-90 transition-transform w-touch-min h-touch-min">
<span class="material-symbols-outlined text-2xl mb-1" style="font-variation-settings: 'FILL' 1;">explore</span>
<span class="font-label-sm text-label-sm tracking-tighter">QUESTS</span>
</button>
<!-- Map -->
<button class="flex flex-col items-center justify-center text-on-surface-variant/70 hover:text-primary-fixed-dim transition-all duration-200 active:scale-90 w-touch-min h-touch-min">
<span class="material-symbols-outlined text-2xl mb-1" style="font-variation-settings: 'FILL' 0;">map</span>
<span class="font-label-sm text-label-sm tracking-tighter">MAP</span>
</button>
<!-- Skills -->
<button class="flex flex-col items-center justify-center text-on-surface-variant/70 hover:text-primary-fixed-dim transition-all duration-200 active:scale-90 w-touch-min h-touch-min">
<span class="material-symbols-outlined text-2xl mb-1" style="font-variation-settings: 'FILL' 0;">bolt</span>
<span class="font-label-sm text-label-sm tracking-tighter">SKILLS</span>
</button>
<!-- Bag -->
<button class="flex flex-col items-center justify-center text-on-surface-variant/70 hover:text-primary-fixed-dim transition-all duration-200 active:scale-90 w-touch-min h-touch-min">
<span class="material-symbols-outlined text-2xl mb-1" style="font-variation-settings: 'FILL' 0;">work</span>
<span class="font-label-sm text-label-sm tracking-tighter">BAG</span>
</button>
<!-- Social -->
<button class="flex flex-col items-center justify-center text-on-surface-variant/70 hover:text-primary-fixed-dim transition-all duration-200 active:scale-90 w-touch-min h-touch-min">
<span class="material-symbols-outlined text-2xl mb-1" style="font-variation-settings: 'FILL' 0;">group</span>
<span class="font-label-sm text-label-sm tracking-tighter">SOCIAL</span>
</button>
</nav>
</div>
`;
  
  return (
    <div className={className} dangerouslySetInnerHTML={{ __html: content }} />
  );
}
