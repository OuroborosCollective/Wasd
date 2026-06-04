import React from 'react';

interface PetMountInterfaceProps {
  className?: string;
}

export function PetMountInterface({ className = '' }: PetMountInterfaceProps) {
  const content = `
<!-- Global Background Scene -->
<div class="fixed inset-0 z-[-1]">
<div class="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&amp;w=1000&amp;auto=format&amp;fit=crop')] bg-cover bg-center opacity-20 mix-blend-luminosity" data-alt="A dense, ancient mystical forest submerged in a twilight cyber-zen atmosphere. Towering alien trees with faintly glowing cyan veins in their bark. The lighting is deep marine-darkblue with soft, high-refractive geometric light shafts piercing through the canopy. The mood is calm, serene, and technologically advanced, fitting a high-end fantasy-science MMO interface.">
</div>
<div class="absolute inset-0 bg-gradient-to-t from-void-black via-void-black/80 to-transparent"></div>
</div>
<!-- TopAppBar -->
<header class="flex justify-between items-center px-margin-mobile h-16 w-full fixed top-0 z-50 bg-surface/80 dark:bg-surface-dim/80 backdrop-blur-xl border-b border-white/10 shadow-[0_4px_30px_rgba(0,0,0,0.1)]">
<button class="h-touch-min w-touch-min flex items-center justify-center text-primary dark:text-primary-fixed-dim hover:text-tertiary-fixed-dim transition-colors duration-300 scale-95 active:duration-75">
<span class="material-symbols-outlined" style="font-variation-settings: 'FILL' 0;">language</span>
</button>
<h1 class="font-display-lg-mobile text-display-lg-mobile tracking-widest text-primary-fixed drop-shadow-[0_0_10px_rgba(175,200,240,0.5)]">
            ARELORIAN
        </h1>
<button class="h-touch-min w-touch-min flex items-center justify-center text-primary dark:text-primary-fixed-dim hover:text-tertiary-fixed-dim transition-colors duration-300 scale-95 active:duration-75">
<span class="material-symbols-outlined" style="font-variation-settings: 'FILL' 0;">settings</span>
</button>
</header>
<!-- Main Content Canvas -->
<main class="pt-24 pb-32 px-4 max-w-2xl mx-auto flex flex-col gap-6 md:hidden">
<!-- Header -->
<div class="flex items-center justify-between">
<h2 class="font-headline-md text-headline-md text-primary-fixed">Companions</h2>
<div class="diamond-glass px-4 py-1 chamfered-panel flex items-center gap-2">
<span class="w-2 h-2 rounded-full bg-tertiary shadow-[0_0_8px_#2ae500]"></span>
<span class="font-label-caps text-label-caps text-primary">MOUNT</span>
</div>
</div>
<!-- 3D Preview Window (Diamond Glass) -->
<div class="diamond-glass chamfered-panel w-full aspect-square relative p-1 group">
<div class="absolute inset-0 refraction-overlay z-10"></div>
<!-- Inner Frame -->
<div class="w-full h-full bg-surface-container-lowest/50 rounded-lg overflow-hidden relative flex items-center justify-center">
<!-- Radiant Backdrop Effect -->
<div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3/4 h-3/4 bg-mana-cyan/20 blur-[50px] rounded-full"></div>
<!-- Mount Image -->
<img alt="Crystalline Mount Preview" class="relative z-10 w-full h-full object-cover opacity-80 mix-blend-screen" data-alt="A 3D rendering of a majestic, crystalline stag mount composed of faceted, highly refractive diamond glass. The creature emits a soft neon-cyan and sunset-orange inner glow, standing proudly in an abstract, dark void with subtle geometric grid lines below it. The aesthetic is hyper-refined, fantasy-science, blending ancient mysticism with sleek cyberpunk elements." src="https://lh3.googleusercontent.com/aida-public/AB6AXuC0nripIMpzOQc__wbmJQCay-KYO9TScXgloEd1mDuTv04Ev6dIWoh4rbIuY4LImZZ9vQnR6c4MotIvU1P7xOe01vMgmoD3RngpzMSY_UrdG-rWd8AM_U-gosc-wStdvbVCe4afwyXAzQcNPbCcXxlE7N4OY3ZUnum7XQr_vDsZzlDlhq-Uqv3uGPxOgv10dLS7V_isrpi-MdRK9iFJcbb0X--fs_yNgS9DgmqRVm0IMXSWbhuucM4QUMfaGWdUFUfr74GB1Pf-6y8"/>
<!-- Holographic scanning line effect -->
<div class="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-mana-cyan to-transparent opacity-50 z-20 animate-[scan_4s_ease-in-out_infinite]"></div>
</div>
<!-- Quick Stats Overlay -->
<div class="absolute bottom-4 left-4 z-20 flex gap-2">
<div class="diamond-glass w-10 h-10 diamond-chip flex items-center justify-center bg-void-black/80 border border-energy-amber/30">
<span class="material-symbols-outlined text-energy-amber text-[20px]">bolt</span>
</div>
<div class="diamond-glass w-10 h-10 diamond-chip flex items-center justify-center bg-void-black/80 border border-mana-cyan/30">
<span class="material-symbols-outlined text-mana-cyan text-[20px]">air</span>
</div>
</div>
</div>
<!-- Stats Panel -->
<div class="diamond-glass rounded-xl p-5 flex flex-col gap-4">
<div class="flex justify-between items-end mb-2">
<div>
<h3 class="font-headline-md text-headline-md text-on-surface">Aetherial Stag</h3>
<p class="font-label-caps text-label-caps text-outline">TIER IV Crystalline</p>
</div>
<span class="font-display-lg-mobile text-display-lg-mobile text-surface-tint">Lv.42</span>
</div>
<!-- Progress Bar: Speed -->
<div class="flex flex-col gap-1">
<div class="flex justify-between text-label-sm font-label-sm text-on-surface-variant">
<span>Speed</span>
<span class="text-mana-cyan">840 / 1000</span>
</div>
<div class="h-3 w-full bg-surface-container-lowest progress-trough rounded-full">
<div class="h-full bg-mana-cyan progress-fill rounded-full" style="width: 84%;"></div>
</div>
</div>
<!-- Progress Bar: Stamina -->
<div class="flex flex-col gap-1">
<div class="flex justify-between text-label-sm font-label-sm text-on-surface-variant">
<span>Stamina</span>
<span class="text-tertiary">92%</span>
</div>
<div class="h-3 w-full bg-surface-container-lowest progress-trough rounded-full">
<div class="h-full bg-tertiary progress-fill rounded-full shadow-[0_0_10px_#2ae500]" style="width: 92%;"></div>
</div>
</div>
</div>
<!-- Action Buttons -->
<div class="flex gap-4 w-full h-14 mt-2">
<button class="flex-1 diamond-glass chamfered-panel text-on-surface font-headline-md text-[18px] flex items-center justify-center gap-2 hover:bg-white/5 active:scale-95 transition-all">
<span class="material-symbols-outlined">swap_horiz</span>
                Equip
            </button>
<button class="flex-1 hex-button bg-energy-amber text-void-black font-headline-md text-[18px] font-bold border-2 border-tertiary shadow-[0_0_20px_rgba(255,122,0,0.4)] hover:shadow-[0_0_30px_rgba(42,229,0,0.6)] active:scale-95 flex items-center justify-center gap-2">
<span class="material-symbols-outlined" style="font-variation-settings: 'FILL' 1;">pets</span>
                Summon
            </button>
</div>
<!-- Collection Grid -->
<div class="mt-4">
<h4 class="font-label-caps text-label-caps text-outline-variant mb-3 px-1">COLLECTION</h4>
<div class="grid grid-cols-4 gap-3">
<!-- Active Item -->
<div class="aspect-square diamond-glass rounded-lg border-energy-amber/50 shadow-[0_0_10px_rgba(255,122,0,0.2)] flex items-center justify-center relative overflow-hidden bg-surface-container-highest/80 cursor-pointer">
<div class="absolute inset-0 bg-energy-amber/10 mix-blend-overlay"></div>
<span class="material-symbols-outlined text-energy-amber text-[32px] drop-shadow-[0_0_5px_#FF7A00]">cruelty_free</span>
</div>
<!-- Inactive Items -->
<div class="aspect-square diamond-glass rounded-lg border-white/5 flex items-center justify-center relative overflow-hidden bg-surface-container-lowest/50 opacity-60 hover:opacity-100 cursor-pointer transition-opacity">
<span class="material-symbols-outlined text-primary-fixed-dim text-[28px]">raven</span>
</div>
<div class="aspect-square diamond-glass rounded-lg border-white/5 flex items-center justify-center relative overflow-hidden bg-surface-container-lowest/50 opacity-60 hover:opacity-100 cursor-pointer transition-opacity">
<span class="material-symbols-outlined text-primary-fixed-dim text-[28px]">bug_report</span>
</div>
<div class="aspect-square diamond-glass rounded-lg border-white/5 flex items-center justify-center relative overflow-hidden bg-surface-container-lowest/50 opacity-60 hover:opacity-100 cursor-pointer transition-opacity">
<span class="material-symbols-outlined text-outline-variant text-[28px]">lock</span>
</div>
</div>
</div>
</main>
<!-- BottomNavBar -->
<nav class="fixed bottom-0 left-0 w-full h-20 flex justify-around items-center px-4 pb-safe bg-surface-container-low/60 dark:bg-surface-container-lowest/60 backdrop-blur-2xl rounded-t-xl z-50 md:hidden">
<button class="flex flex-col items-center justify-center text-on-surface-variant/70 hover:text-primary-fixed-dim transition-all duration-200 active:scale-90 w-touch-min h-touch-min">
<span class="material-symbols-outlined text-[24px]">explore</span>
<span class="font-label-sm text-label-sm tracking-tighter mt-1">QUESTS</span>
</button>
<button class="flex flex-col items-center justify-center text-on-surface-variant/70 hover:text-primary-fixed-dim transition-all duration-200 active:scale-90 w-touch-min h-touch-min">
<span class="material-symbols-outlined text-[24px]">map</span>
<span class="font-label-sm text-label-sm tracking-tighter mt-1">MAP</span>
</button>
<button class="flex flex-col items-center justify-center text-on-surface-variant/70 hover:text-primary-fixed-dim transition-all duration-200 active:scale-90 w-touch-min h-touch-min">
<span class="material-symbols-outlined text-[24px]">bolt</span>
<span class="font-label-sm text-label-sm tracking-tighter mt-1">SKILLS</span>
</button>
<!-- Active Tab: BAG (Inventory/Management) -->
<button class="flex flex-col items-center justify-center text-energy-amber drop-shadow-[0_0_8px_rgba(255,122,0,0.6)] scale-110 active:scale-90 transition-transform w-touch-min h-touch-min">
<span class="material-symbols-outlined text-[24px]" style="font-variation-settings: 'FILL' 1;">work</span>
<span class="font-label-sm text-label-sm tracking-tighter mt-1 font-bold">BAG</span>
</button>
<button class="flex flex-col items-center justify-center text-on-surface-variant/70 hover:text-primary-fixed-dim transition-all duration-200 active:scale-90 w-touch-min h-touch-min">
<span class="material-symbols-outlined text-[24px]">group</span>
<span class="font-label-sm text-label-sm tracking-tighter mt-1">SOCIAL</span>
</button>
</nav>

`;
  
  return (
    <div className={className} dangerouslySetInnerHTML={{ __html: content }} />
  );
}
