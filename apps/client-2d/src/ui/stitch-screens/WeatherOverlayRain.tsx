import React from 'react';

interface WeatherOverlayRainProps {
  className?: string;
}

export function WeatherOverlayRain({ className = '' }: WeatherOverlayRainProps) {
  const content = `
<!-- Layer 0: Environment -->
<div class="environment-bg" data-alt="A lush, dense alien forest environment rendered in high-fidelity 3D graphics. The scene is illuminated by ambient, glowing cyan and green flora, creating a mystical, deep marine-like atmosphere. Heavy, dark stylized trees frame the composition, hinting at ancient, undisturbed magic. The lighting is moody and dramatic, perfect for a high-end Fantasy-Science MMORPG setting, merging nature with subtle, otherworldly energy." style="background-image: url('https://lh3.googleusercontent.com/aida-public/AB6AXuANpmbpslf5klbckhgDGANOvoW6Xymvks1A812lymAqfAkkfLn3st1aQ8P-HHDd3xNYLQTxj9lQNDg6AdokG752jBc0ziPfYoMaDbqhaWf0a1TO-kZYKs9QubAxhlMPI83ApRVk0dMVjNcn2GO7hYxMJTa5vvQl3meU-PLgU-JOF8hgJBgU7Fp2FVof95gStK43M4zwXYM1HVlOFzUS6nS6aV0rSjHy1l3LGwvtiCVF5DtyACt4lXl_iEclVNJgtV4dfwJ76oj2I_w');"></div>
<!-- Layer 1: Character (Abstracted as focal point if needed, currently implied by camera view) -->
<!-- Layer 2: Rain Particles -->
<div id="rain-layer"></div>
<!-- Layer 3: UI Shell & HUD -->
<div class="relative z-50 w-full h-full flex flex-col justify-between pointer-events-none">
<!-- TopAppBar (From JSON) -->
<header class="flex justify-between items-center px-margin-mobile h-16 w-full fixed top-0 z-50 bg-surface/80 dark:bg-surface-dim/80 backdrop-blur-xl border-b border-white/10 shadow-[0_4px_30px_rgba(0,0,0,0.1)] pointer-events-auto">
<button class="text-primary dark:text-primary-fixed-dim hover:text-tertiary-fixed-dim transition-colors duration-300 scale-95 active:duration-75 touch-min flex items-center justify-center">
<span class="material-symbols-outlined" style="font-variation-settings: 'FILL' 0;">language</span>
</button>
<h1 class="font-display-lg-mobile text-display-lg-mobile tracking-widest text-primary-fixed drop-shadow-[0_0_10px_rgba(175,200,240,0.5)]">ARELORIAN</h1>
<button class="text-primary dark:text-primary-fixed-dim hover:text-tertiary-fixed-dim transition-colors duration-300 scale-95 active:duration-75 touch-min flex items-center justify-center">
<span class="material-symbols-outlined" style="font-variation-settings: 'FILL' 0;">settings</span>
</button>
</header>
<!-- Main Canvas (HUD Elements) -->
<main class="flex-1 mt-16 mb-20 p-gutter flex flex-col justify-between pointer-events-auto">
<!-- Top HUD: Player Stats -->
<div class="flex justify-between items-start mt-4">
<div class="diamond-glass p-3 rounded-lg w-64">
<div class="flex items-center gap-3 mb-2">
<div class="w-10 h-10 rounded-full bg-surface-container-high border-2 border-primary-fixed-dim flex items-center justify-center overflow-hidden relative">
<img alt="Avatar" class="w-full h-full object-cover" data-alt="A stylized, high-fidelity 3D portrait of a fantasy-sci-fi character face. The character has pale skin and glowing cyan eyes, wearing a dark, sleek collar. The lighting is dramatic, highlighting sharp cheekbones against a dark void background, fitting a premium MMORPG avatar icon." src="https://lh3.googleusercontent.com/aida-public/AB6AXuBKpFwXzKrN7JsOTkOuQwwJtTX1rKdamoJZ2sO4D71OzYwpohVD6ZOODSt526wYT3QED17jXQjENomIbOJGgq6bb4JEfsmbiob0TF-LGJm1rbYCMoYImWVyXPtXkOlFkfL9RPNfoV7fJNSJ-R3JLlpO54WXrh3-2Na0HEAgqLUcXGUm3T-2QXDtQ43OB8k10EwBNW7TySX7cl7sw8JwEykSAjd_TLm0GOGq4TNfR9E3u6UgYHyskzpn9Gb7IzALvvnKCDzpMUpEV6M"/>
<div class="absolute inset-0 border border-white/20 rounded-full pointer-events-none"></div>
</div>
<div>
<div class="font-label-caps text-label-caps text-on-surface">LVL 42</div>
<div class="font-body-md text-body-md text-primary-fixed font-bold leading-none">Aethelgard</div>
</div>
</div>
<!-- HP Bar -->
<div class="progress-trough h-3 w-full mb-1">
<div class="progress-fill-hp h-full w-[75%]">
<div class="progress-scanner"></div>
</div>
</div>
<!-- MP Bar -->
<div class="progress-trough h-2 w-full">
<div class="progress-fill-mp h-full w-[40%]">
<div class="progress-scanner"></div>
</div>
</div>
</div>
<!-- Quest Tracker Mini -->
<div class="diamond-glass p-3 rounded-lg w-48 text-right hidden md:block">
<div class="font-label-caps text-label-caps text-energy-amber mb-1 drop-shadow-[0_0_5px_rgba(255,122,0,0.5)]">ACTIVE QUEST</div>
<div class="font-body-md text-body-md text-primary-fixed leading-snug">Seek the Deep Root</div>
<div class="font-label-sm text-label-sm text-on-surface-variant mt-1">0/3 Mana Crystals</div>
</div>
</div>
<!-- Middle HUD: Crosshair / Action Area (Empty for view) -->
<div class="flex-1 flex items-center justify-center pointer-events-none">
<div class="w-8 h-8 opacity-50 flex items-center justify-center">
<span class="material-symbols-outlined text-white text-opacity-50" style="font-size: 24px; text-shadow: 0 0 10px rgba(0,229,255,0.5);">add</span>
</div>
</div>
<!-- Bottom HUD: Action Bar & Skills -->
<div class="flex justify-between items-end mb-4 gap-4 pointer-events-auto">
<!-- Chat / Log -->
<div class="diamond-glass p-2 rounded-lg w-1/3 h-32 hidden md:flex flex-col justify-end overflow-hidden mask-image: linear-gradient(to bottom, transparent, black 20%);">
<div class="text-label-sm font-label-sm text-on-surface-variant mb-1"><span class="text-mana-cyan">[System]</span> Rain storm approaching.</div>
<div class="text-label-sm font-label-sm text-on-surface-variant mb-1"><span class="text-primary">[Guild] Kael:</span> Need heals at the monolith.</div>
<div class="text-label-sm font-label-sm text-on-surface-variant"><span class="text-tertiary-fixed">[Loot]</span> Obtained <span class="text-secondary">Glowing Spore x2</span></div>
</div>
<!-- Skill Slots (Bento-ish cluster) -->
<div class="flex gap-2">
<button class="diamond-glass w-14 h-14 rounded-xl flex flex-col items-center justify-center hover:scale-105 transition-transform relative group">
<span class="material-symbols-outlined text-primary-fixed-dim group-hover:text-white transition-colors" style="font-variation-settings: 'FILL' 1;">local_fire_department</span>
<div class="absolute bottom-1 right-1 font-label-sm text-label-sm text-on-surface-variant">1</div>
</button>
<button class="diamond-glass w-14 h-14 rounded-xl flex flex-col items-center justify-center hover:scale-105 transition-transform relative group border-mana-cyan/50 shadow-[0_0_15px_rgba(0,229,255,0.2)]">
<span class="material-symbols-outlined text-mana-cyan drop-shadow-[0_0_5px_rgba(0,229,255,0.8)]" style="font-variation-settings: 'FILL' 1;">water_drop</span>
<div class="absolute bottom-1 right-1 font-label-sm text-label-sm text-on-surface-variant">2</div>
<div class="absolute inset-0 bg-mana-cyan/10 rounded-xl animate-pulse"></div>
</button>
<button class="diamond-glass w-14 h-14 rounded-xl flex flex-col items-center justify-center hover:scale-105 transition-transform relative group opacity-50">
<span class="material-symbols-outlined text-on-surface-variant" style="font-variation-settings: 'FILL' 1;">bolt</span>
<div class="absolute inset-0 bg-black/40 rounded-xl flex items-center justify-center">
<span class="font-label-caps text-label-caps text-white">4s</span>
</div>
</button>
<!-- Primary Action -->
<button class="hex-button w-16 h-16 ml-4 flex items-center justify-center touch-min">
<span class="material-symbols-outlined text-white drop-shadow-md text-3xl" style="font-variation-settings: 'FILL' 1;">swords</span>
</button>
</div>
</div>
<!-- Server Sync Indicator -->
<div class="absolute bottom-24 right-4 flex items-center gap-2 pointer-events-none">
<div class="w-2 h-2 rounded-full bg-tertiary shadow-[0_0_8px_rgba(42,229,0,0.8)] animate-pulse"></div>
<span class="font-label-sm text-label-sm text-on-surface-variant/50">24ms • AS-EAST</span>
</div>
</main>
<!-- BottomNavBar (From JSON) -->
<!-- Logic: Screen is Gameplay/Explore. Active tab: EXPLORE -->
<nav class="fixed bottom-0 left-0 w-full h-20 flex justify-around items-center px-4 pb-safe bg-surface-container-low/60 dark:bg-surface-container-lowest/60 backdrop-blur-2xl border-t border-outline-variant/20 shadow-[0_-10px_40px_rgba(0,0,0,0.5)] z-50 pointer-events-auto rounded-t-xl md:hidden">
<!-- QUESTS (Inactive) -->
<button class="flex flex-col items-center justify-center text-on-surface-variant/70 hover:text-primary-fixed-dim transition-all duration-200 active:scale-90 touch-min w-16">
<span class="material-symbols-outlined mb-1" style="font-variation-settings: 'FILL' 0;">explore</span>
<span class="font-label-sm text-label-sm tracking-tighter">QUESTS</span>
</button>
<!-- MAP (Inactive) -->
<button class="flex flex-col items-center justify-center text-on-surface-variant/70 hover:text-primary-fixed-dim transition-all duration-200 active:scale-90 touch-min w-16">
<span class="material-symbols-outlined mb-1" style="font-variation-settings: 'FILL' 0;">map</span>
<span class="font-label-sm text-label-sm tracking-tighter">MAP</span>
</button>
<!-- SKILLS (Active - Assuming Gameplay centers on action/skills, or could be Quests. Based on prompt intent, it's open world, let's highlight SKILLS as combat ready) -->
<!-- Wait, the prompt says "Gameplay screen... lush forest... HUD". The active state from JSON must match exact intent. None perfectly match 'Gameplay'. Let's default to QUESTS (Explore) as it's open world. Actually, let's use SKILLS since the action bar is prominent. Let's look at labels: "QUESTS", "MAP", "SKILLS", "BAG", "SOCIAL". The active intent is exploring the world. "QUESTS" (icon: explore) is the closest semantic match for open world traversal. -->
<button class="flex flex-col items-center justify-center text-energy-amber drop-shadow-[0_0_8px_rgba(255,122,0,0.6)] scale-110 active:scale-90 transition-transform touch-min w-16">
<span class="material-symbols-outlined mb-1" style="font-variation-settings: 'FILL' 1;">explore</span>
<span class="font-label-sm text-label-sm tracking-tighter font-bold">QUESTS</span>
</button>
<!-- BAG (Inactive) -->
<button class="flex flex-col items-center justify-center text-on-surface-variant/70 hover:text-primary-fixed-dim transition-all duration-200 active:scale-90 touch-min w-16">
<span class="material-symbols-outlined mb-1" style="font-variation-settings: 'FILL' 0;">work</span>
<span class="font-label-sm text-label-sm tracking-tighter">BAG</span>
</button>
<!-- SOCIAL (Inactive) -->
<button class="flex flex-col items-center justify-center text-on-surface-variant/70 hover:text-primary-fixed-dim transition-all duration-200 active:scale-90 touch-min w-16">
<span class="material-symbols-outlined mb-1" style="font-variation-settings: 'FILL' 0;">group</span>
<span class="font-label-sm text-label-sm tracking-tighter">SOCIAL</span>
</button>
</nav>
<!-- Web Top Nav Cluster (Hidden on mobile) -->
<nav class="hidden md:flex absolute top-16 left-1/2 -translate-x-1/2 gap-8 px-8 py-2 diamond-glass rounded-b-xl z-40">
<button class="text-energy-amber font-bold font-label-caps text-label-caps tracking-widest drop-shadow-[0_0_5px_rgba(255,122,0,0.5)]">QUESTS</button>
<button class="text-on-surface-variant hover:text-primary-fixed-dim font-label-caps text-label-caps tracking-widest transition-colors">MAP</button>
<button class="text-on-surface-variant hover:text-primary-fixed-dim font-label-caps text-label-caps tracking-widest transition-colors">SKILLS</button>
<button class="text-on-surface-variant hover:text-primary-fixed-dim font-label-caps text-label-caps tracking-widest transition-colors">BAG</button>
<button class="text-on-surface-variant hover:text-primary-fixed-dim font-label-caps text-label-caps tracking-widest transition-colors">SOCIAL</button>
</nav>
</div>

`;
  
  return (
    <div className={className} dangerouslySetInnerHTML={{ __html: content }} />
  );
}
