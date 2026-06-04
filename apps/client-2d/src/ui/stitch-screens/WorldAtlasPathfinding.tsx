import React from 'react';

interface WorldAtlasPathfindingProps {
  className?: string;
}

export function WorldAtlasPathfinding({ className = '' }: WorldAtlasPathfindingProps) {
  const content = `
<!-- TopAppBar -->
<header class="fixed top-0 w-full z-50 bg-surface-container-low/80 backdrop-blur-xl border-b border-white/10 shadow-[0_0_15px_rgba(0,229,255,0.2)] hidden md:flex">
<div class="flex justify-between items-center px-margin-mobile h-[64px] w-full max-w-7xl mx-auto">
<button class="text-on-surface-variant hover:text-mana-cyan transition-colors duration-300 active:scale-95 flex items-center justify-center w-[44px] h-[44px]">
<span class="material-symbols-outlined" data-icon="menu">menu</span>
</button>
<h1 class="font-display-lg-mobile text-display-lg-mobile tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-primary to-mana-cyan">
                Arelorian
            </h1>
<!-- Desktop Nav Links -->
<nav class="hidden md:flex items-center space-x-gutter">
<a class="text-on-surface-variant hover:text-mana-cyan transition-colors duration-300 font-label-caps text-label-caps uppercase" href="#">Quests</a>
<a class="text-primary font-label-caps text-label-caps uppercase drop-shadow-[0_0_8px_rgba(0,229,255,0.5)]" href="#">Map</a>
<a class="text-on-surface-variant hover:text-mana-cyan transition-colors duration-300 font-label-caps text-label-caps uppercase" href="#">Hero</a>
<a class="text-on-surface-variant hover:text-mana-cyan transition-colors duration-300 font-label-caps text-label-caps uppercase" href="#">Guild</a>
<a class="text-on-surface-variant hover:text-mana-cyan transition-colors duration-300 font-label-caps text-label-caps uppercase" href="#">Shop</a>
</nav>
<button class="text-on-surface-variant hover:text-mana-cyan transition-colors duration-300 active:scale-95 flex items-center justify-center w-[44px] h-[44px]">
<span class="material-symbols-outlined" data-icon="account_circle">account_circle</span>
</button>
</div>
</header>
<!-- Mobile Header (Simplified for Map) -->
<header class="md:hidden fixed top-0 w-full z-40 diamond-glass border-b-0 h-[60px] flex items-center justify-between px-margin-mobile">
<div class="flex items-center space-x-unit">
<span class="material-symbols-outlined text-mana-cyan" data-icon="explore">explore</span>
<h1 class="font-headline-md text-headline-md-mobile text-primary tracking-wide">World Atlas</h1>
</div>
<button class="w-[44px] h-[44px] flex items-center justify-center rounded-full bg-surface-container/50 border border-white/5 active:scale-95 transition-transform">
<span class="material-symbols-outlined text-on-surface-variant" data-icon="filter_list">filter_list</span>
</button>
</header>
<!-- Main Atlas Canvas -->
<main class="relative w-full h-full map-container map-grid cursor-grab active:cursor-grabbing overflow-hidden">
<!-- Draggable Map Content (Simulated with absolute positioning for demo) -->
<div class="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[2000px] h-[2000px] pointer-events-none" id="mapLayer">
<!-- SVG Pathfinding Line -->
<svg class="absolute top-0 left-0 w-full h-full pointer-events-none z-10">
<defs>
<filter height="140%" id="glow-cyan" width="140%" x="-20%" y="-20%">
<fegaussianblur result="blur" stddeviation="4"></fegaussianblur>
<fecomposite in="SourceGraphic" in2="blur" operator="over"></fecomposite>
</filter>
</defs>
<!-- Path from Point A to Point B -->
<path class="path-line" d="M 800 1200 Q 1000 1000, 1200 800" fill="none" filter="url(#glow-cyan)" stroke="#00E5FF" stroke-width="3"></path>
</svg>
<!-- Travel Time Tooltip -->
<div class="absolute left-[1000px] top-[950px] diamond-glass rounded-lg px-3 py-2 z-20 flex items-center space-x-2 transform -translate-x-1/2 shadow-[0_0_15px_rgba(0,229,255,0.15)] pointer-events-auto cursor-pointer hover:bg-surface-container-highest transition-colors">
<span class="material-symbols-outlined text-mana-cyan text-[16px]" data-icon="schedule">schedule</span>
<span class="font-label-caps text-label-caps text-on-surface tracking-widest uppercase">14:20 Remaining</span>
</div>
<!-- Start Node: Solar Exiles -->
<div class="absolute left-[800px] top-[1200px] transform -translate-x-1/2 -translate-y-1/2 z-20 pointer-events-auto group">
<div class="relative flex flex-col items-center">
<div class="w-12 h-12 diamond-glass rounded-full flex items-center justify-center border-mana-cyan/50 shadow-[0_0_20px_rgba(0,229,255,0.3)] group-hover:scale-110 transition-transform cursor-pointer">
<span class="material-symbols-outlined text-mana-cyan pulse-cyan text-2xl" data-icon="location_on" data-weight="fill" style="font-variation-settings: 'FILL' 1;">location_on</span>
</div>
<div class="mt-2 diamond-glass px-2 py-1 rounded text-center opacity-0 group-hover:opacity-100 transition-opacity">
<span class="font-label-sm text-label-sm text-primary uppercase tracking-widest">Solar Exiles</span>
</div>
</div>
</div>
<!-- End Node: Azure Sanctum -->
<div class="absolute left-[1200px] top-[800px] transform -translate-x-1/2 -translate-y-1/2 z-20 pointer-events-auto group">
<div class="relative flex flex-col items-center">
<div class="w-16 h-16 diamond-glass chamfered-45 flex items-center justify-center border-energy-amber/50 pulse-amber group-hover:scale-110 transition-transform cursor-pointer bg-secondary-container/20">
<span class="material-symbols-outlined text-energy-amber text-3xl drop-shadow-[0_0_8px_rgba(255,122,0,0.8)]" data-icon="cell_tower" data-weight="fill" style="font-variation-settings: 'FILL' 1;">cell_tower</span>
</div>
<div class="mt-2 diamond-glass px-3 py-1 rounded text-center">
<span class="font-label-caps text-label-caps text-energy-amber uppercase tracking-widest drop-shadow-[0_0_5px_rgba(255,122,0,0.5)]">Azure Sanctum</span>
</div>
</div>
</div>
<!-- Random Map Elements -->
<!-- Travelpoint Tower 1 -->
<div class="absolute left-[600px] top-[700px] transform -translate-x-1/2 -translate-y-1/2 z-10 pointer-events-auto">
<div class="w-10 h-10 diamond-glass chamfered-45 flex items-center justify-center border-energy-amber/30 pulse-amber cursor-pointer hover:border-energy-amber/80 transition-colors">
<span class="material-symbols-outlined text-energy-amber/80" data-icon="cell_tower">cell_tower</span>
</div>
</div>
<!-- Warfront -->
<div class="absolute left-[1400px] top-[1100px] transform -translate-x-1/2 -translate-y-1/2 z-10 pointer-events-auto group">
<div class="w-12 h-12 rounded-full flex items-center justify-center bg-error-container/20 border border-error/30 cursor-pointer group-hover:bg-error-container/40 transition-colors">
<span class="material-symbols-outlined text-error" data-icon="swords">swords</span>
</div>
</div>
<!-- Quest Objective -->
<div class="absolute left-[900px] top-[1400px] transform -translate-x-1/2 -translate-y-1/2 z-10 pointer-events-auto">
<div class="w-8 h-8 rotate-45 bg-energy-amber/20 border border-energy-amber shadow-[0_0_10px_rgba(255,122,0,0.4)] flex items-center justify-center cursor-pointer hover:bg-energy-amber/40 transition-colors">
<span class="material-symbols-outlined -rotate-45 text-energy-amber text-sm" data-icon="priority_high">priority_high</span>
</div>
</div>
</div>
</main>
<!-- Floating Interactive Legend (Desktop Right, Mobile Bottom Sheet Style) -->
<aside class="fixed right-margin-tablet top-[100px] w-[280px] diamond-glass rounded-xl z-30 hidden md:block border-l border-t border-white/5 shadow-[0_8px_32px_rgba(0,0,0,0.5)]">
<div class="p-4 border-b border-white/5">
<h2 class="font-headline-md text-headline-md-mobile text-primary tracking-wide flex items-center space-x-2">
<span class="material-symbols-outlined text-mana-cyan" data-icon="map">map</span>
<span>Atlas Glossary</span>
</h2>
</div>
<div class="p-4 space-y-4">
<!-- Legend Item -->
<div class="flex items-center space-x-3 group cursor-default">
<div class="w-8 h-8 diamond-glass chamfered-45 flex items-center justify-center border-energy-amber/30 group-hover:border-energy-amber/60 transition-colors">
<span class="material-symbols-outlined text-energy-amber text-[18px]" data-icon="cell_tower">cell_tower</span>
</div>
<span class="font-body-md text-body-md text-on-surface-variant group-hover:text-on-surface transition-colors">Travelpoint Tower</span>
</div>
<div class="flex items-center space-x-3 group cursor-default">
<div class="w-8 h-8 rounded-full flex items-center justify-center bg-error-container/20 border border-error/30">
<span class="material-symbols-outlined text-error text-[18px]" data-icon="swords">swords</span>
</div>
<span class="font-body-md text-body-md text-on-surface-variant group-hover:text-on-surface transition-colors">Active Warfront</span>
</div>
<div class="flex items-center space-x-3 group cursor-default">
<div class="w-8 h-8 diamond-glass rounded-full flex items-center justify-center border-primary/30">
<span class="material-symbols-outlined text-primary text-[18px]" data-icon="account_balance">account_balance</span>
</div>
<span class="font-body-md text-body-md text-on-surface-variant group-hover:text-on-surface transition-colors">City / Sanctuary</span>
</div>
<div class="flex items-center space-x-3 group cursor-default">
<div class="w-6 h-6 rotate-45 bg-energy-amber/10 border border-energy-amber/50 flex items-center justify-center ml-1">
<span class="material-symbols-outlined -rotate-45 text-energy-amber text-[14px]" data-icon="priority_high">priority_high</span>
</div>
<span class="font-body-md text-body-md text-on-surface-variant group-hover:text-on-surface transition-colors ml-2">Quest Objective</span>
</div>
<div class="flex items-center space-x-3 group cursor-default pt-2 border-t border-white/5">
<div class="flex space-x-1">
<span class="material-symbols-outlined text-tertiary text-[20px]" data-icon="eco">eco</span>
<span class="material-symbols-outlined text-secondary-container text-[20px]" data-icon="diamond">diamond</span>
</div>
<span class="font-body-md text-body-md text-on-surface-variant group-hover:text-on-surface transition-colors">Resource Spots</span>
</div>
</div>
</aside>
<!-- BottomNavBar (Mobile Only) -->
<nav class="md:hidden fixed bottom-0 w-full z-50 rounded-t-xl bg-surface-container-lowest/90 backdrop-blur-2xl border-t border-white/10 shadow-[0_-4px_20px_rgba(0,0,0,0.5)] flex justify-around items-center h-[72px] px-2 pb-safe">
<a class="flex flex-col items-center justify-center text-on-surface-variant opacity-70 hover:text-mana-cyan transition-all w-[64px] h-[64px]" href="#">
<span class="material-symbols-outlined mb-1" data-icon="assignment">assignment</span>
<span class="font-label-caps text-label-caps uppercase text-[10px]">Quests</span>
</a>
<a class="flex flex-col items-center justify-center text-energy-amber drop-shadow-[0_0_8px_rgba(255,122,0,0.6)] active:scale-90 duration-150 w-[64px] h-[64px]" href="#">
<span class="material-symbols-outlined mb-1" data-icon="map" data-weight="fill" style="font-variation-settings: 'FILL' 1;">map</span>
<span class="font-label-caps text-label-caps uppercase text-[10px]">Map</span>
</a>
<a class="flex flex-col items-center justify-center text-on-surface-variant opacity-70 hover:text-mana-cyan transition-all w-[64px] h-[64px]" href="#">
<span class="material-symbols-outlined mb-1" data-icon="person">person</span>
<span class="font-label-caps text-label-caps uppercase text-[10px]">Hero</span>
</a>
<a class="flex flex-col items-center justify-center text-on-surface-variant opacity-70 hover:text-mana-cyan transition-all w-[64px] h-[64px]" href="#">
<span class="material-symbols-outlined mb-1" data-icon="group">group</span>
<span class="font-label-caps text-label-caps uppercase text-[10px]">Guild</span>
</a>
<a class="flex flex-col items-center justify-center text-on-surface-variant opacity-70 hover:text-mana-cyan transition-all w-[64px] h-[64px]" href="#">
<span class="material-symbols-outlined mb-1" data-icon="shopping_cart">shopping_cart</span>
<span class="font-label-caps text-label-caps uppercase text-[10px]">Shop</span>
</a>
</nav>
<!-- Map Interaction Script (Simple drag simulation) -->

`;
  
  return (
    <div className={className} dangerouslySetInnerHTML={{ __html: content }} />
  );
}
