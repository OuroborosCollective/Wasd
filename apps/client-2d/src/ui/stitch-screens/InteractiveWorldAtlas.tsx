import React from 'react';

interface InteractiveWorldAtlasProps {
  className?: string;
}

export function InteractiveWorldAtlas({ className = '' }: InteractiveWorldAtlasProps) {
  const content = `
<!-- Background Map Layer - Fullscreen -->
<div class="absolute inset-0 z-0 bg-cover bg-center" data-alt="A detailed, hand-painted digital atlas world map featuring deep marine blue oceans, glowing neon-green forests, and sunset-orange desert and volcanic areas." style="background-image: url('https://lh3.googleusercontent.com/aida-public/AB6AXuA5NILCmtQ1FuUn783FEKMJaEV3uM821NekIi7nKZy3r0bAMwcJiBurlzdeA89ZC-kGl65NYs850_pvRak-e7DSSrX8t63_6bzj_DaQ4U1mD3_cA0Z09L5jon5KifrD1KBqK5LNm8CS4SclZX3P8z3eV8mFvpGo3uvtJYbRzd0KXjMLfCJSXoV-hhUHw0xetT5hz4LqA1fwZiDiY0DuPViOu3ezwaTLzpJCym2oY77wnMS5e2Z4-jOX4gDqezvtMYaOMPEZk0jrH7Y');">
<!-- Technical Grid Overlay -->
<div class="absolute inset-0 map-grid mix-blend-screen"></div>
</div>
<!-- Map Markers Layer -->
<div class="absolute inset-0 z-10 pointer-events-none">
<!-- Faction Frontline -->
<div class="frontline"></div>
<!-- City Marker: Azure Sanctum -->
<div class="absolute top-[25%] left-[30%] pointer-events-auto group cursor-pointer">
<div class="relative flex flex-col items-center">
<div class="w-8 h-8 rounded-full bg-surface-container-low/90 border-2 border-mana-cyan flex items-center justify-center shadow-[0_0_15px_rgba(0,229,255,0.6)] z-10 marker-pulse">
<span class="material-symbols-outlined text-mana-cyan" data-icon="fort" style="font-size: 18px;">fort</span>
</div>
<div class="mt-2 px-3 py-1 bg-surface-container-low/90 backdrop-blur-md rounded border border-white/10 font-label-caps text-label-caps text-mana-cyan shadow-lg whitespace-nowrap">
                    Azure Sanctum
                </div>
</div>
</div>
<!-- City Marker: Solar Exiles -->
<div class="absolute top-[65%] left-[20%] pointer-events-auto group cursor-pointer">
<div class="relative flex flex-col items-center">
<div class="w-8 h-8 rounded-full bg-surface-container-low/90 border-2 border-energy-amber flex items-center justify-center shadow-[0_0_15px_rgba(255,122,0,0.6)] z-10 marker-pulse-amber">
<span class="material-symbols-outlined text-energy-amber" data-icon="local_fire_department" style="font-size: 18px;">local_fire_department</span>
</div>
<div class="mt-2 px-3 py-1 bg-surface-container-low/90 backdrop-blur-md rounded border border-white/10 font-label-caps text-label-caps text-energy-amber shadow-lg whitespace-nowrap">
                    Solar Exiles
                </div>
</div>
</div>
<!-- City Marker: Lumen City -->
<div class="absolute top-[45%] left-[75%] pointer-events-auto group cursor-pointer">
<div class="relative flex flex-col items-center">
<div class="w-8 h-8 rounded-full bg-surface-container-low/90 border-2 border-tertiary flex items-center justify-center shadow-[0_0_15px_rgba(42,229,0,0.6)] z-10">
<span class="material-symbols-outlined text-tertiary" data-icon="location_city" style="font-size: 18px;">location_city</span>
</div>
<div class="mt-2 px-3 py-1 bg-surface-container-low/90 backdrop-blur-md rounded border border-white/10 font-label-caps text-label-caps text-tertiary shadow-lg whitespace-nowrap">
                    Lumen City
                </div>
</div>
</div>
<!-- Resource Marker: Mithril -->
<div class="absolute top-[35%] left-[55%] pointer-events-auto group cursor-pointer">
<div class="relative flex flex-col items-center">
<div class="w-6 h-6 rounded bg-surface-container-lowest/80 border border-mana-cyan flex items-center justify-center shadow-[0_0_10px_rgba(0,229,255,0.4)] z-10 overflow-hidden">
<img alt="Mithril" class="w-full h-full object-cover mix-blend-screen opacity-80" src="https://lh3.googleusercontent.com/aida/AP1WRLt6SeQahg4gq2674VDKEX0rRPuFpyH1vBUAeBAyiI561X4w_KocNnb-0LdIeX2Sy9p_kxClhfZClp1jkNgrwglnlzxb_hJMJkrety9rtn42lrWjPx_Evfgs360D4vx8WIy_XCzNFoMPXEvv6UrR5XEfsLr2IE7XXQPfjbdwkWbhAtzxpve_Sm3Rk2f0a_P5mYoJXlA76iJ66BeBpzvawCLN4EV-oBjbwI0_P7bbXUri-v66OJnCANMDA2Y"/>
</div>
<div class="mt-1 px-2 py-0.5 bg-surface-container-low/90 backdrop-blur-md rounded border border-white/10 font-label-sm text-label-sm text-mana-cyan opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                    Mithril Deposit
                </div>
</div>
</div>
<!-- Resource Marker: Mana Crystals -->
<div class="absolute top-[75%] left-[60%] pointer-events-auto group cursor-pointer">
<div class="relative flex flex-col items-center">
<div class="w-6 h-6 rounded bg-surface-container-lowest/80 border border-mana-cyan flex items-center justify-center shadow-[0_0_10px_rgba(0,229,255,0.4)] z-10 overflow-hidden">
<img alt="Mana Crystals" class="w-full h-full object-cover mix-blend-screen opacity-80 hue-rotate-90" src="https://lh3.googleusercontent.com/aida/AP1WRLt6SeQahg4gq2674VDKEX0rRPuFpyH1vBUAeBAyiI561X4w_KocNnb-0LdIeX2Sy9p_kxClhfZClp1jkNgrwglnlzxb_hJMJkrety9rtn42lrWjPx_Evfgs360D4vx8WIy_XCzNFoMPXEvv6UrR5XEfsLr2IE7XXQPfjbdwkWbhAtzxpve_Sm3Rk2f0a_P5mYoJXlA76iJ66BeBpzvawCLN4EV-oBjbwI0_P7bbXUri-v66OJnCANMDA2Y"/>
</div>
<div class="mt-1 px-2 py-0.5 bg-surface-container-low/90 backdrop-blur-md rounded border border-white/10 font-label-sm text-label-sm text-mana-cyan opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                    Mana Crystals
                </div>
</div>
</div>
<!-- Quest Marker -->
<div class="absolute top-[50%] left-[45%] pointer-events-auto group cursor-pointer">
<div class="relative flex flex-col items-center">
<span class="material-symbols-outlined fill text-energy-amber drop-shadow-[0_0_8px_rgba(255,122,0,0.8)] z-10 text-[32px] -mt-4 animate-bounce" data-icon="location_on" data-weight="fill">location_on</span>
<div class="px-2 py-1 bg-surface-container-low/90 backdrop-blur-md rounded border border-white/10 font-label-sm text-label-sm text-energy-amber opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap -mt-1">
                    Main Quest
                </div>
</div>
</div>
</div>
<!-- Top App Bar -->
<header class="bg-surface-container-low/60 backdrop-blur-xl border-b border-white/10 shadow-[0_0_15px_rgba(175,200,240,0.3)] fixed top-0 w-full flex justify-between items-center px-margin-mobile h-16 z-50">
<button class="w-touch-min h-touch-min flex items-center justify-center text-primary hover:bg-white/5 transition-colors active:scale-95 transition-transform rounded-full">
<span class="material-symbols-outlined" data-icon="menu">menu</span>
</button>
<h1 class="font-headline-md text-headline-md-mobile tracking-widest text-primary uppercase drop-shadow-[0_0_8px_rgba(175,200,240,0.8)]">
            ARELORIAN
        </h1>
<button class="w-touch-min h-touch-min flex items-center justify-center text-primary hover:bg-white/5 transition-colors active:scale-95 transition-transform rounded-full">
<span class="material-symbols-outlined" data-icon="layers">layers</span>
</button>
</header>
<!-- Floating UI - Zoom Controls (Bottom Right, above nav) -->
<div class="absolute bottom-28 right-4 z-40 flex flex-col gap-1 bg-surface-container-low/50 backdrop-blur-md rounded-lg p-1 border border-white/10 shadow-lg">
<button class="w-10 h-10 rounded text-primary hover:bg-white/10 transition-colors flex items-center justify-center active:scale-95" title="Zoom In">
<span class="material-symbols-outlined" data-icon="add">add</span>
</button>
<div class="w-6 h-[1px] bg-white/20 mx-auto"></div>
<button class="w-10 h-10 rounded text-primary hover:bg-white/10 transition-colors flex items-center justify-center active:scale-95" title="Zoom Out">
<span class="material-symbols-outlined" data-icon="remove">remove</span>
</button>
</div>
<!-- Bottom Nav Bar -->
<nav class="bg-surface-container-highest/40 backdrop-blur-2xl border-t border-white/10 shadow-[0_-4px_20px_rgba(0,0,0,0.5)] fixed bottom-0 left-0 w-full z-50 flex justify-around items-center px-4 pb-4 h-20 rounded-t-xl">
<!-- Active Tab: MAP -->
<button class="flex flex-col items-center justify-center text-energy-amber drop-shadow-[0_0_10px_rgba(255,122,0,0.6)] w-touch-min h-touch-min active:scale-90 duration-150">
<span class="material-symbols-outlined fill text-[28px]" data-icon="map" data-weight="fill">map</span>
<span class="font-label-caps text-label-caps mt-1">MAP</span>
</button>
<button class="flex flex-col items-center justify-center text-on-surface-variant/70 hover:text-primary transition-all w-touch-min h-touch-min active:scale-90 duration-150">
<span class="material-symbols-outlined text-[24px]" data-icon="scroll">school</span>
<span class="font-label-caps text-label-caps mt-1">QUESTS</span>
</button>
<button class="flex flex-col items-center justify-center text-on-surface-variant/70 hover:text-primary transition-all w-touch-min h-touch-min active:scale-90 duration-150">
<span class="material-symbols-outlined text-[24px]" data-icon="person">person</span>
<span class="font-label-caps text-label-caps mt-1">HERO</span>
</button>
<button class="flex flex-col items-center justify-center text-on-surface-variant/70 hover:text-primary transition-all w-touch-min h-touch-min active:scale-90 duration-150">
<span class="material-symbols-outlined text-[24px]" data-icon="shield">shield</span>
<span class="font-label-caps text-label-caps mt-1">GUILD</span>
</button>
<button class="flex flex-col items-center justify-center text-on-surface-variant/70 hover:text-primary transition-all w-touch-min h-touch-min active:scale-90 duration-150">
<span class="material-symbols-outlined text-[24px]" data-icon="storefront">storefront</span>
<span class="font-label-caps text-label-caps mt-1">SHOP</span>
</button>
</nav>

`;
  
  return (
    <div className={className} dangerouslySetInnerHTML={{ __html: content }} />
  );
}
