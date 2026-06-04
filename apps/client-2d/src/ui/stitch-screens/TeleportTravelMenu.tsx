import React from 'react';

interface TeleportTravelMenuProps {
  className?: string;
}

export function TeleportTravelMenu({ className = '' }: TeleportTravelMenuProps) {
  const content = `
<!-- Ambient Background Layer -->
<div class="absolute inset-0 z-0 pointer-events-none opacity-30 mix-blend-screen" data-alt="A deep space nebula rendering with glowing cyan and deep blue cosmic dust clouds. The scene is vast and mysterious, resembling an ancient magical cosmos. Bright stellar phenomena dot the dark void, providing a sense of immense scale. The aesthetic perfectly matches a high-end Fantasy-Science MMORPG universe." style="background-image: url('https://lh3.googleusercontent.com/aida-public/AB6AXuBGaLXsWJGWmgR0pedo40znM0oCN-iLuL5Z8XLvhtxwBkKk492H5eVy13ZD6MQILqMMTNIFY4Ab1LIKbF3zoSyUHgYVDyxzCbrQSkbdaklNu2_aU2lYsNtsxJILJGqF89p_YANtmrI1JVgw9SwPzAoTe3uKiEb7sijgeSa27E4gEjT2gY24YHRuXedhuYK2G2K7Re0UMRpcBQ9y2htjWq9G_6SZiY_brtNSlboWdeYkP6sYPZruIKtnDSPCFibNv3R17taX6f37hVM'); background-size: cover; background-position: center;"></div>
<div class="absolute inset-0 z-0 bg-gradient-to-t from-background via-transparent to-background"></div>
<!-- TopAppBar (Mobile & Desktop) -->
<header class="flex justify-between items-center px-margin-mobile h-16 w-full fixed top-0 z-50 bg-surface/80 dark:bg-surface-dim/80 backdrop-blur-xl border-b border-white/10 shadow-[0_4px_30px_rgba(0,0,0,0.1)]">
<button class="h-touch-min w-touch-min flex items-center justify-center text-primary dark:text-primary-fixed-dim hover:text-tertiary-fixed-dim transition-colors duration-300 scale-95 active:duration-75">
<span class="material-symbols-outlined" style="font-variation-settings: 'FILL' 0;">language</span>
</button>
<h1 class="font-display-lg-mobile text-display-lg-mobile tracking-widest text-primary-fixed drop-shadow-[0_0_10px_rgba(175,200,240,0.5)]">ARELORIAN</h1>
<button class="h-touch-min w-touch-min flex items-center justify-center text-primary dark:text-primary-fixed-dim hover:text-tertiary-fixed-dim transition-colors duration-300 scale-95 active:duration-75">
<span class="material-symbols-outlined" style="font-variation-settings: 'FILL' 0;">settings</span>
</button>
</header>
<!-- Main Content Canvas -->
<main class="flex-1 w-full max-w-7xl mx-auto mt-16 mb-20 md:mb-0 px-margin-mobile py-6 md:py-margin-tablet z-10 relative overflow-hidden flex flex-col md:flex-row gap-gutter">
<!-- Left Column: Map/Current Region Info (Hidden on very small screens, visible on md+) -->
<div class="hidden md:flex flex-col w-1/3 diamond-glass rounded-xl p-6 relative">
<div class="absolute inset-0 rounded-xl opacity-40 mix-blend-overlay" data-alt="A topographical fantasy map glowing with ethereal blue laylines and ancient script. The map shows intricate mountain ranges and vast oceans typical of an MMORPG world map. Subtle glowing nodes indicate magical teleportation towers scattered across the continent. The style is crystalline and high-tech, blending magic and science." style="background-image: url('https://lh3.googleusercontent.com/aida-public/AB6AXuB6NYvnDqUjFA7gPm8AMcUIEFN0jQNxR4omE_Qs4JvzvplIGW-0mnKPUkGRlePqM7g-8g9vRbh5dK15mQSgadQ9LPp3VA2khxG7vB4p2e4OAjCJYpcT3T1TL9Uf6WMRMQe2x_rB4mS-gWgZG7q9BsfXp12CcLyWrh3dTlOUYSiVkhcK6WJIePxaojs45On9v53pmHAdLNsf9_DQvip_vKqeqoj-F0x0W7qIJvbYwofbbGE6XI4keLpR3JC_0lRVBbqnu3JljSR3U80'); background-size: cover; background-position: center;"></div>
<div class="relative z-10 flex flex-col h-full">
<div class="mb-auto">
<h2 class="font-label-caps text-label-caps text-primary tracking-widest mb-2">CURRENT LOCATION</h2>
<h3 class="font-headline-md text-headline-md text-on-surface mb-4">Astral Citadel</h3>
<p class="font-body-md text-body-md text-on-surface-variant">Your resonance is stable. Select a distant Spire to initiate quantum displacement.</p>
</div>
<div class="mt-8 border-t border-white/10 pt-4">
<div class="flex justify-between items-center mb-2">
<span class="font-label-sm text-label-sm text-on-surface-variant">RESONANCE FLUID</span>
<span class="font-label-caps text-label-caps text-mana-cyan">8,450 ML</span>
</div>
<!-- Mana/Resource Bar -->
<div class="w-full h-3 bg-surface-container-highest rounded-full overflow-hidden relative border border-white/5">
<div class="absolute top-0 left-0 h-full bg-gradient-to-r from-mana-cyan/50 to-mana-cyan w-[75%] rounded-full relative">
<!-- Scanning light effect -->
<div class="absolute top-0 left-0 w-full h-full bg-gradient-to-r from-transparent via-white/40 to-transparent -translate-x-full animate-[shimmer_2s_infinite]"></div>
</div>
</div>
</div>
</div>
</div>
<!-- Right Column: Fast Travel List & Boss Timer -->
<div class="flex-1 flex flex-col gap-gutter h-full">
<!-- World Boss Timer Widget -->
<div class="diamond-glass rounded-xl p-4 flex items-center justify-between border-l-4 border-l-energy-amber pulse-glow">
<div class="flex items-center gap-3">
<div class="w-10 h-10 rounded-full bg-error-container/20 flex items-center justify-center border border-error/30">
<span class="material-symbols-outlined text-energy-amber" style="font-variation-settings: 'FILL' 1;">warning</span>
</div>
<div>
<h4 class="font-label-caps text-label-caps text-error mb-1">WORLD EVENT IMMINENT</h4>
<p class="font-body-md text-body-md font-medium">Herald of Void</p>
</div>
</div>
<div class="text-right">
<p class="font-display-lg-mobile text-display-lg-mobile text-energy-amber tracking-tighter" id="bossTimer">02:14:10</p>
<p class="font-label-sm text-label-sm text-on-surface-variant">VOID INCURSION ZONE</p>
</div>
</div>
<!-- Teleport Destination List -->
<div class="flex-1 diamond-glass rounded-xl overflow-hidden flex flex-col">
<div class="p-4 border-b border-white/10 bg-surface/40 flex justify-between items-center backdrop-blur-md sticky top-0 z-20">
<h3 class="font-headline-md text-headline-md text-primary-fixed-dim">Spire Network</h3>
<div class="flex gap-2">
<span class="material-symbols-outlined text-on-surface-variant cursor-pointer hover:text-primary transition-colors" style="font-variation-settings: 'FILL' 0;">filter_list</span>
<span class="material-symbols-outlined text-on-surface-variant cursor-pointer hover:text-primary transition-colors" style="font-variation-settings: 'FILL' 0;">sort</span>
</div>
</div>
<div class="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
<!-- Destination Item 1 -->
<div class="diamond-glass rounded-lg p-3 flex items-center gap-4 hover:bg-surface-bright/20 transition-all cursor-pointer group">
<div class="w-16 h-16 rounded-md bg-surface-container-highest overflow-hidden border border-white/10 relative">
<div class="absolute inset-0 bg-cover bg-center" data-alt="A sprawling, high-tech fantasy metropolis bathed in twilight. Glowing neon signs and magical runes illuminate towering crystalline skyscrapers. The atmosphere is bustling yet serene, capturing a futuristic magical civilization. Deep blues and vibrant cyan accents dominate the color palette." style="background-image: url('https://lh3.googleusercontent.com/aida-public/AB6AXuC49UDkrp8UMldcGrPcwH33UNhejC6m4xUUBqJaWM4GEXNULVuyXXkcVA9vwju_H9G40QLjT-euz9TqE3nD7CXDO8wVr5c762vCAEZDv-aYflKZirjh90jHTQZUlT2sznZw7Tb6Zl6JdL4y5YCmIi1t8aDP3y7doJkyPek-OfJ1Dalq8a-IymtnPwWEe5r3bJ3khuENInV4_s1q91Q1tp9WiwPXTH4l9wAuI6RS33uWSakSZvaBUZgGQFvlXoJWI7R6Zo0SNFUQOl8');"></div>
<div class="absolute inset-0 bg-primary-container/20 group-hover:bg-transparent transition-colors"></div>
</div>
<div class="flex-1">
<div class="flex justify-between items-start mb-1">
<h4 class="font-body-lg text-body-lg text-on-surface group-hover:text-energy-amber transition-colors">Neo-Lumen City</h4>
<div class="flex items-center gap-1 bg-surface-container/80 px-2 py-0.5 rounded text-mana-cyan font-label-caps text-label-caps">
<span class="material-symbols-outlined text-[14px]" style="font-variation-settings: 'FILL' 1;">water_drop</span> 150
                                </div>
</div>
<div class="flex gap-3 text-on-surface-variant font-label-sm text-label-sm">
<span class="flex items-center gap-1"><span class="material-symbols-outlined text-[12px]">straighten</span> 1,240 km</span>
<span class="flex items-center gap-1 text-tertiary-fixed-dim"><span class="material-symbols-outlined text-[12px]">security</span> Safe Zone</span>
</div>
</div>
<button class="hex-btn bg-energy-amber/10 border-2 border-energy-amber text-energy-amber font-label-caps text-label-caps px-4 py-2 opacity-0 group-hover:opacity-100 transition-opacity">WARP</button>
</div>
<!-- Destination Item 2 -->
<div class="diamond-glass rounded-lg p-3 flex items-center gap-4 hover:bg-surface-bright/20 transition-all cursor-pointer group">
<div class="w-16 h-16 rounded-md bg-surface-container-highest overflow-hidden border border-white/10 relative">
<div class="absolute inset-0 bg-cover bg-center" data-alt="A desolate, volcanic wasteland illuminated by glowing magma and ominous red energy. Jagged obsidian rocks pierce the sky, and ancient ruined structures hint at a fallen empire. The lighting is harsh and dramatic, creating a hostile, dangerous atmosphere. Deep reds and stark blacks define the scene." style="background-image: url('https://lh3.googleusercontent.com/aida-public/AB6AXuBcLeIUKHqgI-Ewq7ha7qkAx84ssG8MiQ-ICiLKBZlGgP4aazgzj6c44Ulsn2NQuuKGhKhYA9ybMZW8VU-vN_PxX65AP076Kdb8dIunuMhb-j8SNZPcNQ6d83mPSg9VSiPDrkDL7Ynec-TlVTUZogEQmoMf-LH776jkqd3fFb2s_8G2NovQLyOrn53vHgMoVG4YUcWwFLXzk6R5L2W81r_WGfKxGB6UzBIvmTIZtb1kQtk-dKzKkK-XWO3PzJ8Vq1cTaP9BVB-cJY4');"></div>
<div class="absolute inset-0 bg-error-container/20 group-hover:bg-transparent transition-colors"></div>
</div>
<div class="flex-1">
<div class="flex justify-between items-start mb-1">
<h4 class="font-body-lg text-body-lg text-on-surface group-hover:text-energy-amber transition-colors">Crimson Wastes</h4>
<div class="flex items-center gap-1 bg-surface-container/80 px-2 py-0.5 rounded text-mana-cyan font-label-caps text-label-caps">
<span class="material-symbols-outlined text-[14px]" style="font-variation-settings: 'FILL' 1;">water_drop</span> 450
                                </div>
</div>
<div class="flex gap-3 text-on-surface-variant font-label-sm text-label-sm">
<span class="flex items-center gap-1"><span class="material-symbols-outlined text-[12px]">straighten</span> 3,890 km</span>
<span class="flex items-center gap-1 text-error"><span class="material-symbols-outlined text-[12px]">warning</span> Contested</span>
</div>
</div>
<button class="hex-btn bg-energy-amber/10 border-2 border-energy-amber text-energy-amber font-label-caps text-label-caps px-4 py-2 opacity-0 group-hover:opacity-100 transition-opacity">WARP</button>
</div>
<!-- Destination Item 3 (Inactive/Locked) -->
<div class="diamond-glass rounded-lg p-3 flex items-center gap-4 opacity-50 cursor-not-allowed">
<div class="w-16 h-16 rounded-md bg-surface-container-highest overflow-hidden border border-white/5 relative grayscale">
<div class="absolute inset-0 bg-cover bg-center" data-alt="A majestic, snow-capped mountain peak shrouded in dense, swirling mist. Ancient icy ruins are barely visible through the fog. The mood is freezing, isolated, and mysterious. Pale blues and stark whites create a chilling, uninviting landscape." style="background-image: url('https://lh3.googleusercontent.com/aida-public/AB6AXuBYtUyzIgSiBTiU7TV_RCQJRpCFRwN4HhkThnBG2KC5TyP_mNwtRHcnknN5jFOS2zZ6c1kIP1Pd4Ol2jmznF2tNCEnhEuzYjBRv4jrXcroUlOpBPeb5RK_T9wxTK55arelSNoWpIZMgNDu0_2OFCycgzLxiG3xQfZFl1C5y2AqJHl_12MuCOoT-Kww9gL5lt2c_Coy1uT5Hihh8xi-XsGnYZ8MYLghvFIunQ7vyWvmrqxobizCWw5hcD0to281T7gsjoBSWxKqP0Gs');"></div>
</div>
<div class="flex-1">
<div class="flex justify-between items-start mb-1">
<h4 class="font-body-lg text-body-lg text-on-surface-variant">Frosthold Pinnacle</h4>
<div class="flex items-center gap-1 text-outline font-label-caps text-label-caps">
<span class="material-symbols-outlined text-[14px]">lock</span> Locked
                                </div>
</div>
<div class="flex gap-3 text-outline font-label-sm text-label-sm">
<span>Requires Lv. 45 Resonance</span>
</div>
</div>
</div>
<!-- Destination Item 4 -->
<div class="diamond-glass rounded-lg p-3 flex items-center gap-4 hover:bg-surface-bright/20 transition-all cursor-pointer group">
<div class="w-16 h-16 rounded-md bg-surface-container-highest overflow-hidden border border-white/10 relative">
<div class="absolute inset-0 bg-cover bg-center" data-alt="A lush, dense primordial forest with massive, towering trees. Glowing flora and bioluminescent fungi cast eerie green and purple lights across the forest floor. The scene feels ancient, overgrown, and deeply magical. Rich greens and deep shadows dominate the serene yet wild environment." style="background-image: url('https://lh3.googleusercontent.com/aida-public/AB6AXuDzcSIe-NrelgrhEIjIZaAHAWMKR652j_lG3qlha4RecCkW9fht-DzQ7XeEuAURUDqjjon0bAn4O9Q0pALbUqAPl9TtKp2-2y9KQ8MOAepdmOyl8Wlz5cOGP6BI16T1HHlNOLHb7btn5dC7I4iVYDGcxlPdcCuW2G6w8J5dxYz8OoaznxJW2LZkajr3TRAcrAXLFeOFL_6D2ncGL8jb0JtDD91zZkl25cp17cIxEb8pZDylQA3ElhGBFkDfAb9sdmuzvE9-Fa3SX9s');"></div>
<div class="absolute inset-0 bg-tertiary-container/20 group-hover:bg-transparent transition-colors"></div>
</div>
<div class="flex-1">
<div class="flex justify-between items-start mb-1">
<h4 class="font-body-lg text-body-lg text-on-surface group-hover:text-energy-amber transition-colors">Verdant Sanctuary</h4>
<div class="flex items-center gap-1 bg-surface-container/80 px-2 py-0.5 rounded text-mana-cyan font-label-caps text-label-caps">
<span class="material-symbols-outlined text-[14px]" style="font-variation-settings: 'FILL' 1;">water_drop</span> 200
                                </div>
</div>
<div class="flex gap-3 text-on-surface-variant font-label-sm text-label-sm">
<span class="flex items-center gap-1"><span class="material-symbols-outlined text-[12px]">straighten</span> 890 km</span>
<span class="flex items-center gap-1 text-tertiary-fixed-dim"><span class="material-symbols-outlined text-[12px]">eco</span> Harvest Zone</span>
</div>
</div>
<button class="hex-btn bg-energy-amber/10 border-2 border-energy-amber text-energy-amber font-label-caps text-label-caps px-4 py-2 opacity-0 group-hover:opacity-100 transition-opacity">WARP</button>
</div>
</div>
</div>
</div>
</main>
<!-- BottomNavBar (Mobile Only) -->
<nav class="fixed bottom-0 left-0 w-full h-20 flex justify-around items-center px-4 pb-safe bg-surface-container-low/60 dark:bg-surface-container-lowest/60 backdrop-blur-3xl border-t border-outline-variant/20 rounded-t-xl z-50 shadow-[0_-10px_40px_rgba(0,0,0,0.5)] md:hidden">
<button class="flex flex-col items-center justify-center text-on-surface-variant/70 hover:text-primary-fixed-dim transition-all duration-200 active:scale-90 h-touch-min w-touch-min">
<span class="material-symbols-outlined mb-1" style="font-variation-settings: 'FILL' 0;">explore</span>
<span class="font-label-sm text-label-sm tracking-tighter">QUESTS</span>
</button>
<!-- Active Tab: Map -->
<button class="flex flex-col items-center justify-center text-energy-amber drop-shadow-[0_0_8px_rgba(255,122,0,0.6)] scale-110 transition-all duration-200 active:scale-90 h-touch-min w-touch-min">
<span class="material-symbols-outlined mb-1" style="font-variation-settings: 'FILL' 1;">map</span>
<span class="font-label-sm text-label-sm tracking-tighter font-bold">MAP</span>
</button>
<button class="flex flex-col items-center justify-center text-on-surface-variant/70 hover:text-primary-fixed-dim transition-all duration-200 active:scale-90 h-touch-min w-touch-min">
<span class="material-symbols-outlined mb-1" style="font-variation-settings: 'FILL' 0;">bolt</span>
<span class="font-label-sm text-label-sm tracking-tighter">SKILLS</span>
</button>
<button class="flex flex-col items-center justify-center text-on-surface-variant/70 hover:text-primary-fixed-dim transition-all duration-200 active:scale-90 h-touch-min w-touch-min">
<span class="material-symbols-outlined mb-1" style="font-variation-settings: 'FILL' 0;">work</span>
<span class="font-label-sm text-label-sm tracking-tighter">BAG</span>
</button>
<button class="flex flex-col items-center justify-center text-on-surface-variant/70 hover:text-primary-fixed-dim transition-all duration-200 active:scale-90 h-touch-min w-touch-min">
<span class="material-symbols-outlined mb-1" style="font-variation-settings: 'FILL' 0;">group</span>
<span class="font-label-sm text-label-sm tracking-tighter">SOCIAL</span>
</button>
</nav>

`;
  
  return (
    <div className={className} dangerouslySetInnerHTML={{ __html: content }} />
  );
}
