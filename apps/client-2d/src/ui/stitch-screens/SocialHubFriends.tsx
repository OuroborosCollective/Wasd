import React from 'react';

interface SocialHubFriendsProps {
  className?: string;
}

export function SocialHubFriends({ className = '' }: SocialHubFriendsProps) {
  const content = `
<div class="absolute inset-0 bg-background/80 backdrop-blur-sm z-0"></div>
<!-- TopAppBar -->
<header class="fixed top-0 w-full rounded-b-xl border-b border-white/10 shadow-[0_0_15px_rgba(0,229,255,0.2)] bg-surface/60 backdrop-blur-xl flex items-center justify-between px-margin-mobile h-touch-min z-50">
<button class="text-on-surface-variant hover:bg-white/5 transition-all duration-300 active:scale-95 flex items-center justify-center w-touch-min h-touch-min">
<span class="material-symbols-outlined" data-icon="blur_on">blur_on</span>
</button>
<h1 class="font-display-lg-mobile text-display-lg-mobile tracking-tighter text-mana-cyan">OUROBOROS</h1>
<button class="text-on-surface-variant hover:bg-white/5 transition-all duration-300 active:scale-95 flex items-center justify-center w-touch-min h-touch-min">
<span class="material-symbols-outlined" data-icon="account_circle">account_circle</span>
</button>
</header>
<main class="relative z-10 pt-[80px] pb-[100px] px-gutter h-screen overflow-y-auto flex flex-col gap-unit">
<!-- Tabs -->
<div class="flex gap-4 mb-4 justify-center">
<button class="px-6 py-2 rounded-t-lg diamond-glass border-b-0 text-mana-cyan font-headline-md shadow-[0_0_15px_rgba(0,229,255,0.3)]">Party</button>
<button class="px-6 py-2 rounded-t-lg diamond-glass border-b-0 text-on-surface-variant font-headline-md opacity-60">Friends</button>
</div>
<!-- Party Panel Content -->
<div class="flex-1 flex flex-col gap-4">
<!-- Member 1 -->
<div class="diamond-glass rounded-xl p-4 flex items-center gap-4">
<div class="w-12 h-12 rounded-full bg-surface-container-highest flex items-center justify-center border border-tertiary shadow-[0_0_10px_rgba(42,229,0,0.5)]">
<span class="material-symbols-outlined text-tertiary" data-icon="shield">shield</span>
</div>
<div class="flex-1">
<div class="flex justify-between items-end mb-1">
<span class="font-headline-md text-on-surface">Kaelen</span>
<span class="font-label-caps text-tertiary">LVL 45</span>
</div>
<div class="h-2 bg-surface-container-lowest rounded-full overflow-hidden mb-1 border border-white/5">
<div class="h-full health-bar-fill w-3/4"></div>
</div>
<div class="h-1.5 bg-surface-container-lowest rounded-full overflow-hidden border border-white/5">
<div class="h-full mana-bar-fill w-1/2"></div>
</div>
</div>
</div>
<!-- Member 2 -->
<div class="diamond-glass rounded-xl p-4 flex items-center gap-4">
<div class="w-12 h-12 rounded-full bg-surface-container-highest flex items-center justify-center border border-energy-amber shadow-[0_0_10px_rgba(255,122,0,0.5)]">
<span class="material-symbols-outlined text-energy-amber" data-icon="swords">swords</span>
</div>
<div class="flex-1">
<div class="flex justify-between items-end mb-1">
<span class="font-headline-md text-on-surface">Lyra</span>
<span class="font-label-caps text-energy-amber">LVL 44</span>
</div>
<div class="h-2 bg-surface-container-lowest rounded-full overflow-hidden mb-1 border border-white/5">
<div class="h-full health-bar-fill w-full"></div>
</div>
<div class="h-1.5 bg-surface-container-lowest rounded-full overflow-hidden border border-white/5">
<div class="h-full mana-bar-fill w-1/4"></div>
</div>
</div>
</div>
<!-- Member 3 -->
<div class="diamond-glass rounded-xl p-4 flex items-center gap-4">
<div class="w-12 h-12 rounded-full bg-surface-container-highest flex items-center justify-center border border-mana-cyan shadow-[0_0_10px_rgba(0,229,255,0.5)]">
<span class="material-symbols-outlined text-mana-cyan" data-icon="magic_button">magic_button</span>
</div>
<div class="flex-1">
<div class="flex justify-between items-end mb-1">
<span class="font-headline-md text-on-surface">Sylas</span>
<span class="font-label-caps text-mana-cyan">LVL 46</span>
</div>
<div class="h-2 bg-surface-container-lowest rounded-full overflow-hidden mb-1 border border-white/5">
<div class="h-full health-bar-fill w-1/2"></div>
</div>
<div class="h-1.5 bg-surface-container-lowest rounded-full overflow-hidden border border-white/5">
<div class="h-full mana-bar-fill w-3/4"></div>
</div>
</div>
</div>
<button class="mt-auto mx-auto w-48 h-12 hex-button flex items-center justify-center text-on-tertiary font-label-caps font-bold">
                READY
            </button>
</div>
</main>
<!-- BottomNavBar -->
<nav class="fixed bottom-0 w-full rounded-t-xl border-t border-white/5 shadow-[0_-4px_20px_rgba(0,0,0,0.5)] bg-surface-container-lowest/40 backdrop-blur-2xl z-50 flex justify-around items-center h-16 px-gutter pb-safe md:hidden">
<button class="flex flex-col items-center justify-center text-on-surface-variant/70 hover:text-tertiary-fixed-dim transition-transform duration-200 w-touch-min h-touch-min">
<span class="material-symbols-outlined" data-icon="assignment">assignment</span>
</button>
<button class="flex flex-col items-center justify-center text-on-surface-variant/70 hover:text-tertiary-fixed-dim transition-transform duration-200 w-touch-min h-touch-min">
<span class="material-symbols-outlined" data-icon="explore">explore</span>
</button>
<button class="flex flex-col items-center justify-center text-on-surface-variant/70 hover:text-tertiary-fixed-dim transition-transform duration-200 w-touch-min h-touch-min">
<span class="material-symbols-outlined" data-icon="bolt">bolt</span>
</button>
<button class="flex flex-col items-center justify-center text-on-surface-variant/70 hover:text-tertiary-fixed-dim transition-transform duration-200 w-touch-min h-touch-min">
<span class="material-symbols-outlined" data-icon="work">work</span>
</button>
<!-- Active Tab: Social (Group) -->
<button class="flex flex-col items-center justify-center text-energy-amber drop-shadow-[0_0_8px_rgba(255,122,0,0.6)] scale-110 animate-pulse-subtle transition-transform duration-200 w-touch-min h-touch-min">
<span class="material-symbols-outlined" data-icon="group">group</span>
</button>
</nav>
`;
  
  return (
    <div className={className} dangerouslySetInnerHTML={{ __html: content }} />
  );
}
