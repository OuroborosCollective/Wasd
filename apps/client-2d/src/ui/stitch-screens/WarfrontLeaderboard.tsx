import React from 'react';

interface WarfrontLeaderboardProps {
  className?: string;
}

export function WarfrontLeaderboard({ className = '' }: WarfrontLeaderboardProps) {
  const content = `
<!-- TopAppBar (From JSON) -->
<header class="flex justify-between items-center px-margin-mobile h-16 w-full fixed top-0 z-50 bg-surface/80 dark:bg-surface-dim/80 backdrop-blur-2xl border-b border-outline-variant/30 shadow-[0_4px_30px_rgba(0,0,0,0.1)]">
<button class="text-primary dark:text-primary-fixed-dim hover:text-tertiary-fixed-dim transition-colors duration-300 scale-95 active:duration-75 flex items-center justify-center w-[44px] h-[44px]">
<span class="material-symbols-outlined">language</span>
</button>
<h1 class="font-display-lg-mobile text-display-lg-mobile tracking-widest text-primary-fixed drop-shadow-[0_0_10px_rgba(175,200,240,0.5)]">ARELORIAN</h1>
<button class="text-primary dark:text-primary-fixed-dim hover:text-tertiary-fixed-dim transition-colors duration-300 scale-95 active:duration-75 flex items-center justify-center w-[44px] h-[44px]">
<span class="material-symbols-outlined">settings</span>
</button>
</header>
<!-- Main Content Canvas -->
<main class="pt-24 pb-32 px-margin-mobile flex flex-col gap-6 max-w-2xl mx-auto">
<!-- Section 1: Summary Card -->
<section class="diamond-glass rounded-xl p-6 relative">
<div class="absolute -top-10 -right-10 w-32 h-32 bg-energy-amber/20 rounded-full blur-3xl"></div>
<h2 class="font-label-caps text-label-caps text-on-surface-variant mb-2">FACTION PERFORMANCE</h2>
<div class="flex justify-between items-end mb-4">
<div>
<h3 class="font-headline-md text-headline-md text-primary-fixed">STELLAR VANGUARD</h3>
<p class="font-body-md text-body-md text-energy-amber mt-1 drop-shadow-[0_0_8px_rgba(255,122,0,0.5)]">VICTORY SECURED</p>
</div>
<div class="text-right">
<span class="font-display-lg-mobile text-display-lg-mobile text-white">42K</span>
<p class="font-label-sm text-label-sm text-on-surface-variant">TOTAL SCORE</p>
</div>
</div>
<!-- Mini progress/stat bar -->
<div class="w-full h-2 bg-surface-container-highest rounded-full overflow-hidden relative">
<div class="absolute top-0 left-0 h-full w-[70%] bg-tertiary-fixed shadow-[0_0_10px_#79ff5b]"></div>
</div>
</section>
<!-- Section 2: Leaderboard -->
<section class="flex flex-col gap-4">
<h2 class="font-headline-md text-headline-md tracking-widest text-on-surface text-center opacity-80 mt-4">DAMAGE LEADERBOARD</h2>
<!-- Rank 1 Highlight -->
<div class="diamond-glass rounded-xl p-1 border border-energy-amber/50 shadow-[0_0_20px_rgba(255,122,0,0.2)] relative">
<div class="absolute inset-0 bg-energy-amber/5 blur-xl pointer-events-none"></div>
<div class="bg-surface/60 rounded-lg p-4 flex items-center gap-4 relative z-10">
<div class="flex-shrink-0 w-12 h-12 flex items-center justify-center bg-energy-amber/20 rounded-full border border-energy-amber text-energy-amber font-display-lg-mobile text-display-lg-mobile">
                        1
                    </div>
<div class="flex-grow">
<h4 class="font-headline-md text-headline-md text-white">XenonBlade</h4>
<p class="font-label-caps text-label-caps text-energy-amber">9.8M DAMAGE</p>
</div>
<!-- Reward Preview -->
<div class="w-16 h-16 rounded-md overflow-hidden border border-tertiary-fixed/30 relative">
<img alt="Secret Knuckle Weapon" class="w-full h-full object-cover" data-alt="A glowing, highly detailed 3D render of a futuristic crystalline knuckle duster weapon. The weapon is made of translucent, diamond-like material with bright neon-green and sunset-orange energy pulsing through its core. It floats against a dark marine-blue studio background, illuminated by sharp, dramatic rim lighting that highlights its chamfered edges and high-refractive glassmorphism aesthetic." src="https://lh3.googleusercontent.com/aida-public/AB6AXuDkrucSC0jwXqa0mk07utm7JOwAXOfCFYMjlflkks8hKDY5zZjKjdLgeiFpbZKPA3mV4xovtPGxasQXwfKVt5rUN22SvW9fbDZK_8unOnJFfOdVCQO0y7S4gMzo2iC-rjQnjfBsS9Utt4P_EfjjKBs_u2UAU3AscKuOVdw6sGXgSHbbMvRow-6TEJZCJjD6OsP6Fbe-wT2o7tZXgoOSDXYxwNn9dhWzehwtMVe8L8uYvvIrPc2ZMPA06QUWdDY9U_dysqnH69A6UFo"/>
</div>
</div>
</div>
<!-- Ranks 2-3 (Abbreviated for space) -->
<div class="diamond-glass rounded-xl overflow-hidden flex flex-col">
<div class="flex items-center gap-4 p-4 border-b border-white/5 hover:bg-white/5 transition-colors">
<span class="font-body-md text-body-md text-on-surface-variant w-6 text-center">2</span>
<span class="font-body-md text-body-md text-primary flex-grow">AriaVex</span>
<span class="font-label-caps text-label-caps text-on-surface-variant">8.2M</span>
</div>
<div class="flex items-center gap-4 p-4 border-b border-white/5 hover:bg-white/5 transition-colors">
<span class="font-body-md text-body-md text-on-surface-variant w-6 text-center">3</span>
<span class="font-body-md text-body-md text-primary flex-grow">NovaStrike</span>
<span class="font-label-caps text-label-caps text-on-surface-variant">7.5M</span>
</div>
<div class="flex items-center gap-4 p-4 hover:bg-white/5 transition-colors">
<span class="font-body-md text-body-md text-on-surface-variant w-6 text-center">4</span>
<span class="font-body-md text-body-md text-primary flex-grow">Korlan</span>
<span class="font-label-caps text-label-caps text-on-surface-variant">6.1M</span>
</div>
</div>
</section>
<!-- Section 3: Personal Rewards -->
<section class="mt-4">
<h2 class="font-label-caps text-label-caps text-on-surface-variant mb-4">YOUR REWARDS</h2>
<div class="grid grid-cols-3 gap-4">
<!-- XP -->
<div class="diamond-glass rounded-lg p-3 flex flex-col items-center justify-center text-center gap-2">
<span class="material-symbols-outlined text-tertiary-fixed text-3xl drop-shadow-[0_0_8px_#79ff5b]">bolt</span>
<div>
<p class="font-body-md text-body-md text-white">+2500</p>
<p class="font-label-sm text-label-sm text-tertiary-fixed">WEAPON XP</p>
</div>
</div>
<!-- Gold -->
<div class="diamond-glass rounded-lg p-3 flex flex-col items-center justify-center text-center gap-2">
<span class="material-symbols-outlined text-energy-amber text-3xl drop-shadow-[0_0_8px_#FF7A00]">toll</span>
<div>
<p class="font-body-md text-body-md text-white">15K</p>
<p class="font-label-sm text-label-sm text-energy-amber">CREDITS</p>
</div>
</div>
<!-- Box -->
<div class="diamond-glass rounded-lg p-3 flex flex-col items-center justify-center text-center gap-2 border-primary-fixed/30 border">
<span class="material-symbols-outlined text-primary-fixed text-3xl drop-shadow-[0_0_8px_#afc8f0]">inventory_2</span>
<div>
<p class="font-body-md text-body-md text-white">x2</p>
<p class="font-label-sm text-label-sm text-primary-fixed">WAR SPOILS</p>
</div>
</div>
</div>
</section>
</main>
<!-- Footer Action -->
<div class="fixed bottom-0 left-0 w-full p-margin-mobile bg-gradient-to-t from-background via-background/80 to-transparent z-40 pb-safe">
<button class="hex-btn w-full max-w-2xl mx-auto h-[60px] bg-energy-amber flex items-center justify-center gap-2 border-[2px] border-tertiary-fixed shadow-[0_0_20px_rgba(255,122,0,0.4)] hover:bg-energy-amber/90 transition-all active:scale-95 group relative overflow-hidden">
<div class="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-[100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
<span class="font-headline-md text-headline-md text-white tracking-widest relative z-10">CLAIM REWARDS</span>
<span class="material-symbols-outlined text-white relative z-10">arrow_forward</span>
</button>
</div>
`;
  
  return (
    <div className={className} dangerouslySetInnerHTML={{ __html: content }} />
  );
}
