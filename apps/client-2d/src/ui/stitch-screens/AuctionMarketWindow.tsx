import React from 'react';

interface AuctionMarketWindowProps {
  className?: string;
}

export function AuctionMarketWindow({ className = '' }: AuctionMarketWindowProps) {
  const content = `
<!-- Ambient Background Lighting -->
<div class="fixed inset-0 pointer-events-none z-0 overflow-hidden">
<div class="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-primary-container/20 rounded-full blur-[120px]"></div>
<div class="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] bg-secondary-container/10 rounded-full blur-[150px]"></div>
</div>
<!-- TopAppBar -->
<header class="flex justify-between items-center px-margin-mobile h-16 w-full fixed top-0 z-50 bg-surface/80 dark:bg-surface-dim/80 backdrop-blur-2xl border-b border-outline-variant/30 shadow-[0_4px_30px_rgba(0,0,0,0.1)] transition-transform scale-95 active:duration-75">
<button class="flex items-center justify-center min-w-[44px] min-h-[44px] hover:text-tertiary-fixed-dim transition-colors duration-300">
<span class="material-symbols-outlined text-primary dark:text-primary-fixed-dim">language</span>
</button>
<h1 class="font-display-lg-mobile text-display-lg-mobile tracking-widest text-primary-fixed drop-shadow-[0_0_10px_rgba(175,200,240,0.5)]">ARELORIAN</h1>
<button class="flex items-center justify-center min-w-[44px] min-h-[44px] hover:text-tertiary-fixed-dim transition-colors duration-300">
<span class="material-symbols-outlined text-primary dark:text-primary-fixed-dim">settings</span>
</button>
</header>
<!-- Main Content Canvas -->
<main class="relative z-10 pt-24 pb-28 md:pb-12 px-4 md:px-margin-tablet max-w-[1600px] mx-auto flex flex-col md:flex-row gap-6">
<!-- Sidebar Filters (Diamond Glass) -->
<aside class="w-full md:w-72 flex-shrink-0 flex flex-col gap-6">
<div class="diamond-glass diamond-chamfer rounded-xl p-5 flex flex-col gap-6">
<div>
<h2 class="font-label-caps text-label-caps text-primary-fixed-dim mb-4 tracking-[0.2em] opacity-80">MARKET CATEGORIES</h2>
<ul class="flex flex-col gap-2">
<li>
<button class="w-full flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-colors group">
<div class="flex items-center gap-3">
<span class="material-symbols-outlined text-on-surface-variant group-hover:text-primary">swords</span>
<span class="font-body-md text-body-md">Weapons</span>
</div>
<span class="font-label-caps text-label-caps text-on-surface-variant opacity-50">1.2K</span>
</button>
</li>
<li>
<button class="w-full flex items-center justify-between p-3 rounded-lg bg-primary/10 border border-primary/30 shadow-[inset_0_0_15px_rgba(175,200,240,0.15)] group relative overflow-hidden">
<div class="absolute left-0 top-0 bottom-0 w-1 bg-primary"></div>
<div class="flex items-center gap-3">
<span class="material-symbols-outlined text-primary drop-shadow-[0_0_5px_rgba(175,200,240,0.5)]">shield</span>
<span class="font-body-md text-body-md font-medium text-white">Armor</span>
</div>
<span class="font-label-caps text-label-caps text-primary">854</span>
</button>
</li>
<li>
<button class="w-full flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-colors group">
<div class="flex items-center gap-3">
<span class="material-symbols-outlined text-on-surface-variant group-hover:text-primary">diamond</span>
<span class="font-body-md text-body-md">Materials</span>
</div>
<span class="font-label-caps text-label-caps text-on-surface-variant opacity-50">5.4K</span>
</button>
</li>
<li>
<button class="w-full flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-colors group">
<div class="flex items-center gap-3">
<span class="material-symbols-outlined text-on-surface-variant group-hover:text-primary">science</span>
<span class="font-body-md text-body-md">Consumables</span>
</div>
<span class="font-label-caps text-label-caps text-on-surface-variant opacity-50">320</span>
</button>
</li>
</ul>
</div>
<div class="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>
<!-- Rarity Filter -->
<div>
<h2 class="font-label-caps text-label-caps text-primary-fixed-dim mb-4 tracking-[0.2em] opacity-80">RARITY</h2>
<div class="flex flex-wrap gap-2">
<button class="px-3 py-1.5 rounded-full border border-outline-variant/50 text-on-surface-variant font-label-caps text-label-caps hover:bg-white/5 transition">Common</button>
<button class="px-3 py-1.5 rounded-full border border-tertiary/50 text-tertiary bg-tertiary/10 font-label-caps text-label-caps shadow-[0_0_10px_rgba(42,229,0,0.2)]">Uncommon</button>
<button class="px-3 py-1.5 rounded-full border border-mana-cyan/50 text-mana-cyan font-label-caps text-label-caps hover:bg-mana-cyan/10 transition">Rare</button>
<button class="px-3 py-1.5 rounded-full border border-secondary/50 text-secondary font-label-caps text-label-caps hover:bg-secondary/10 transition">Epic</button>
</div>
</div>
</div>
</aside>
<!-- Main Auction Area -->
<section class="flex-1 flex flex-col gap-6">
<!-- Top Controls (Tabs & Search) -->
<div class="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 diamond-glass diamond-chamfer rounded-xl p-2 pl-4">
<!-- Market Tabs -->
<nav class="flex items-center gap-1">
<button class="px-6 py-2.5 rounded-lg bg-white/10 text-white font-label-caps text-label-caps tracking-widest shadow-[inset_0_0_10px_rgba(255,255,255,0.05)] border border-white/20">BUY</button>
<button class="px-6 py-2.5 rounded-lg text-on-surface-variant hover:text-white font-label-caps text-label-caps tracking-widest hover:bg-white/5 transition-colors">SELL</button>
<button class="px-6 py-2.5 rounded-lg text-on-surface-variant hover:text-white font-label-caps text-label-caps tracking-widest hover:bg-white/5 transition-colors">MY AUCTIONS</button>
</nav>
<!-- Search Input -->
<div class="relative w-full xl:w-64">
<span class="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-sm">search</span>
<input class="w-full bg-surface-container/50 border-b-2 border-transparent focus:border-energy-amber border-t-0 border-l-0 border-r-0 rounded-t-md pl-10 pr-4 py-2 font-body-md text-body-md text-white placeholder-on-surface-variant focus:ring-0 focus:outline-none transition-colors focus:bg-surface-container" placeholder="Search items..." type="text"/>
</div>
</div>
<!-- Active Filters Strip -->
<div class="flex items-center gap-2">
<span class="font-label-caps text-label-caps text-on-surface-variant mr-2">ACTIVE:</span>
<div class="flex items-center gap-1.5 px-3 py-1 rounded bg-primary-container/40 border border-primary/20 text-primary-fixed-dim font-label-caps text-label-caps">
                    Armor <button class="hover:text-white"><span class="material-symbols-outlined text-[14px]">close</span></button>
</div>
<div class="flex items-center gap-1.5 px-3 py-1 rounded bg-tertiary-container/40 border border-tertiary/20 text-tertiary font-label-caps text-label-caps">
                    Uncommon <button class="hover:text-white"><span class="material-symbols-outlined text-[14px]">close</span></button>
</div>
<button class="ml-auto font-label-caps text-label-caps text-outline hover:text-white underline decoration-outline hover:decoration-white transition-colors">CLEAR ALL</button>
</div>
<!-- List Header (Desktop Only) -->
<div class="hidden md:grid grid-cols-[1fr_120px_150px_150px] gap-4 px-6 py-2 border-b border-white/10 text-on-surface-variant font-label-caps text-label-caps tracking-wider opacity-70">
<div>ITEM</div>
<div class="text-center">TIME LEFT</div>
<div class="text-right">PRICE</div>
<div class="text-center">ACTION</div>
</div>
<!-- Auction Items List -->
<div class="flex flex-col gap-3">
<!-- Item Card 1 -->
<article class="diamond-glass rounded-lg p-4 flex flex-col md:flex-row items-start md:items-center gap-4 hover:bg-white/[0.03] transition-colors border-l-2 border-l-tertiary">
<!-- Icon -->
<div class="w-16 h-16 rounded bg-surface-container relative flex-shrink-0 border border-tertiary/30 shadow-[0_0_15px_rgba(42,229,0,0.15)] overflow-hidden">
<div class="absolute inset-0 bg-cover bg-center opacity-80 mix-blend-screen" data-alt="A stylized, glowing crystalline chestplate armor floating in a dark, high-tech void. The armor emits a faint, radioactive neon-green luminescence, highlighting its sharp geometric facets and deep oceanic blue metallic undertones. The lighting is dramatic, emphasizing the Diamond Glass aesthetic of the Arelorian universe." style="background-image: url('https://lh3.googleusercontent.com/aida-public/AB6AXuASyHOWf_OKZdRoa99t3QPokt851fdTtzg2knifvOXtgpdUiv0zpB6VKXgpdTv-VdNLn9A7T0UzpWpGBPlPUY8641u5D4Qu6KVYKhV4llDSxUr7HFSiPogcz_w0vsQjBxSV9M0XbfDjd-DmnZfCwLaXn1BVOKoGADAxp8BThhD7oYDyBlUKPDrfYPq-ybE4zD19po1GNzoGXvwJOO6_c-xJ6uK_vAeBrpXLJws1_L7NHnIO1INkt_pdf1EG_00cOM0E1N7vCjcZs2I');"></div>
</div>
<!-- Details -->
<div class="flex-1 min-w-0">
<div class="flex items-center gap-2 mb-1">
<h3 class="font-headline-md text-headline-md text-white truncate">Nano-Weave Cuirass</h3>
<span class="px-1.5 py-0.5 rounded bg-tertiary/20 text-tertiary font-label-sm text-label-sm border border-tertiary/30">Lvl 45</span>
</div>
<p class="font-body-md text-body-md text-on-surface-variant truncate">Medium Armor • +120 Defense • +15 Agility</p>
</div>
<!-- Stats Row (Mobile layout adaptation) -->
<div class="w-full md:w-auto flex flex-row md:contents items-center justify-between mt-2 md:mt-0 pt-2 md:pt-0 border-t border-white/5 md:border-none">
<!-- Time -->
<div class="w-auto md:w-[120px] flex items-center justify-center gap-1 text-on-surface-variant">
<span class="material-symbols-outlined text-[16px]">schedule</span>
<span class="font-label-caps text-label-caps">2h 14m</span>
</div>
<!-- Price -->
<div class="w-auto md:w-[150px] text-right flex flex-col items-end">
<div class="flex items-center gap-1 text-energy-amber font-headline-md text-headline-md text-glow-amber">
<span class="material-symbols-outlined text-[20px]">monetization_on</span>
                                1,250
                            </div>
<span class="font-label-sm text-label-sm text-on-surface-variant">Credits</span>
</div>
<!-- Action -->
<div class="w-auto md:w-[150px] flex justify-end md:justify-center">
<button class="hex-button bg-energy-amber/10 border-2 border-tertiary-fixed-dim text-tertiary-fixed-dim font-label-caps text-label-caps px-6 py-2.5 min-w-[44px] min-h-[44px] hover:bg-tertiary/20 transition-all shadow-[0_0_10px_rgba(42,229,0,0.3)] flex items-center justify-center">
                                BUYOUT
                            </button>
</div>
</div>
</article>
<!-- Item Card 2 -->
<article class="diamond-glass rounded-lg p-4 flex flex-col md:flex-row items-start md:items-center gap-4 hover:bg-white/[0.03] transition-colors border-l-2 border-l-secondary">
<!-- Icon -->
<div class="w-16 h-16 rounded bg-surface-container relative flex-shrink-0 border border-secondary/30 shadow-[0_0_15px_rgba(255,183,125,0.15)] overflow-hidden">
<div class="absolute inset-0 bg-cover bg-center opacity-80 mix-blend-screen" data-alt="A heavily stylized, angular helmet carved from dark, translucent obsidian-like glass, floating in a deep space environment. The visor area glows with a fierce sunset-orange internal light, casting refractive patterns. The overall aesthetic is a blend of ancient mystical artifacts and futuristic cyber-zen precision." style="background-image: url('https://lh3.googleusercontent.com/aida-public/AB6AXuDCkoFcQabgJqq1QRUgFK8YQiGS6WZHNDrqWPyfEkavQNRs_xHAaeUNKhHBp-44eKCPQUZ9aJRZwbCEWCgR4POB_0jbsFuG08lE4_k4HLhAwU2_AZW5VTvFuOLrk0G35rVDW1ZSl83mUQT2BPnhEhXdFR4ivnHezr4ur8Z8r5Rt6_fHdiR_dzqHDiqTSS1Mhq_4hcjt9tZkU_0ygq2Zz2wwE8PdvjdZt8AcxnzAklCOJgdvxjuGINgVDa3dXjcEd-Z4BjMmjIfNqBY');"></div>
</div>
<!-- Details -->
<div class="flex-1 min-w-0">
<div class="flex items-center gap-2 mb-1">
<h3 class="font-headline-md text-headline-md text-secondary truncate">Obsidian Mind-Cage</h3>
<span class="px-1.5 py-0.5 rounded bg-secondary/20 text-secondary font-label-sm text-label-sm border border-secondary/30">Lvl 50</span>
</div>
<p class="font-body-md text-body-md text-on-surface-variant truncate">Heavy Armor • +210 Defense • +50 Willpower</p>
</div>
<!-- Stats Row -->
<div class="w-full md:w-auto flex flex-row md:contents items-center justify-between mt-2 md:mt-0 pt-2 md:pt-0 border-t border-white/5 md:border-none">
<!-- Time -->
<div class="w-auto md:w-[120px] flex items-center justify-center gap-1 text-error">
<span class="material-symbols-outlined text-[16px]">hourglass_bottom</span>
<span class="font-label-caps text-label-caps">15m</span>
</div>
<!-- Price -->
<div class="w-auto md:w-[150px] text-right flex flex-col items-end">
<div class="flex items-center gap-1 text-energy-amber font-headline-md text-headline-md text-glow-amber">
<span class="material-symbols-outlined text-[20px]">monetization_on</span>
                                8,500
                            </div>
<span class="font-label-sm text-label-sm text-on-surface-variant">Credits</span>
</div>
<!-- Action -->
<div class="w-auto md:w-[150px] flex justify-end md:justify-center">
<button class="hex-button bg-energy-amber/10 border-2 border-tertiary-fixed-dim text-tertiary-fixed-dim font-label-caps text-label-caps px-6 py-2.5 min-w-[44px] min-h-[44px] hover:bg-tertiary/20 transition-all shadow-[0_0_10px_rgba(42,229,0,0.3)] flex items-center justify-center">
                                BUYOUT
                            </button>
</div>
</div>
</article>
<!-- Item Card 3 -->
<article class="diamond-glass rounded-lg p-4 flex flex-col md:flex-row items-start md:items-center gap-4 hover:bg-white/[0.03] transition-colors border-l-2 border-l-mana-cyan">
<!-- Icon -->
<div class="w-16 h-16 rounded bg-surface-container relative flex-shrink-0 border border-mana-cyan/30 shadow-[0_0_15px_rgba(0,229,255,0.15)] overflow-hidden">
<div class="absolute inset-0 bg-cover bg-center opacity-80 mix-blend-screen" data-alt="A pair of sleek, glowing gauntlets made of frosted, translucent diamond glass, hovering over a marine-darkblue void. Intense bright cyan energy pulses through the geometric joints of the armor. The visual style embodies the hyper-refined, crystalline sci-fantasy aesthetic of the Diamond Glass design system." style="background-image: url('https://lh3.googleusercontent.com/aida-public/AB6AXuD5SLA0PRpLavC3df_iCDfDz55CEqaUb2QmQgDk5xdVHV9zcfCLlRE1TEtqT7BlBfpDT1NhK2FgxplZ2GRNdzufOiQZRH_fRB581A6l6aur-e2-0ulqoNBAqyT9Kb8HgCUj3dVKX1dPOXYhBtTF_5dq_3_NBEDITNOGD8nbKwxlXcwPPYZt7ZZ2LAVigD11i-42ltHMpbX-K174kVynvqXsEfCFwG8Nm3EkzCg7MtAutX-LybRbG1fhweaMw8vOaEZdomlwAFX0oqk');"></div>
</div>
<!-- Details -->
<div class="flex-1 min-w-0">
<div class="flex items-center gap-2 mb-1">
<h3 class="font-headline-md text-headline-md text-mana-cyan text-glow-cyan truncate">Phase-Shift Gauntlets</h3>
<span class="px-1.5 py-0.5 rounded bg-mana-cyan/20 text-mana-cyan font-label-sm text-label-sm border border-mana-cyan/30">Lvl 42</span>
</div>
<p class="font-body-md text-body-md text-on-surface-variant truncate">Light Armor • +85 Defense • Active: Dash</p>
</div>
<!-- Stats Row -->
<div class="w-full md:w-auto flex flex-row md:contents items-center justify-between mt-2 md:mt-0 pt-2 md:pt-0 border-t border-white/5 md:border-none">
<!-- Time -->
<div class="w-auto md:w-[120px] flex items-center justify-center gap-1 text-on-surface-variant">
<span class="material-symbols-outlined text-[16px]">schedule</span>
<span class="font-label-caps text-label-caps">12h 4m</span>
</div>
<!-- Price -->
<div class="w-auto md:w-[150px] text-right flex flex-col items-end">
<div class="flex items-center gap-1 text-energy-amber font-headline-md text-headline-md text-glow-amber">
<span class="material-symbols-outlined text-[20px]">monetization_on</span>
                                3,100
                            </div>
<span class="font-label-sm text-label-sm text-on-surface-variant">Credits</span>
</div>
<!-- Action -->
<div class="w-auto md:w-[150px] flex justify-end md:justify-center">
<button class="hex-button bg-energy-amber/10 border-2 border-tertiary-fixed-dim text-tertiary-fixed-dim font-label-caps text-label-caps px-6 py-2.5 min-w-[44px] min-h-[44px] hover:bg-tertiary/20 transition-all shadow-[0_0_10px_rgba(42,229,0,0.3)] flex items-center justify-center">
                                BUYOUT
                            </button>
</div>
</div>
</article>
</div>
<!-- Pagination (Simplified) -->
<div class="flex justify-center items-center gap-4 mt-4">
<button class="p-2 rounded border border-white/10 text-on-surface-variant hover:text-white hover:bg-white/5 disabled:opacity-30"><span class="material-symbols-outlined">chevron_left</span></button>
<span class="font-label-caps text-label-caps text-primary-fixed-dim">PAGE 1 OF 42</span>
<button class="p-2 rounded border border-white/10 text-on-surface-variant hover:text-white hover:bg-white/5"><span class="material-symbols-outlined">chevron_right</span></button>
</div>
</section>
</main>
<!-- BottomNavBar (Mobile Only) -->
<nav class="md:hidden fixed bottom-0 left-0 w-full h-20 flex justify-around items-center px-4 pb-safe bg-surface-container-low/60 dark:bg-surface-container-lowest/60 backdrop-blur-3xl border-t border-outline-variant/20 shadow-[0_-10px_40px_rgba(0,0,0,0.5)] z-50">
<a class="flex flex-col items-center justify-center text-on-surface-variant/70 hover:text-primary-fixed-dim transition-all duration-200 active:scale-90" href="#">
<span class="material-symbols-outlined">explore</span>
<span class="font-label-sm text-label-sm tracking-tighter mt-1">QUESTS</span>
</a>
<a class="flex flex-col items-center justify-center text-on-surface-variant/70 hover:text-primary-fixed-dim transition-all duration-200 active:scale-90" href="#">
<span class="material-symbols-outlined">map</span>
<span class="font-label-sm text-label-sm tracking-tighter mt-1">MAP</span>
</a>
<a class="flex flex-col items-center justify-center text-on-surface-variant/70 hover:text-primary-fixed-dim transition-all duration-200 active:scale-90" href="#">
<span class="material-symbols-outlined">bolt</span>
<span class="font-label-sm text-label-sm tracking-tighter mt-1">SKILLS</span>
</a>
<a class="flex flex-col items-center justify-center text-on-surface-variant/70 hover:text-primary-fixed-dim transition-all duration-200 active:scale-90" href="#">
<span class="material-symbols-outlined">work</span>
<span class="font-label-sm text-label-sm tracking-tighter mt-1">BAG</span>
</a>
<!-- SOCIAL is Semantic active for Market/Trading hub -->
<a class="flex flex-col items-center justify-center text-energy-amber drop-shadow-[0_0_8px_rgba(255,122,0,0.6)] scale-110 active:scale-90 transition-transform" href="#">
<span class="material-symbols-outlined" style="font-variation-settings: 'FILL' 1;">group</span>
<span class="font-label-sm text-label-sm tracking-tighter mt-1 font-bold">SOCIAL</span>
</a>
</nav>
`;
  
  return (
    <div className={className} dangerouslySetInnerHTML={{ __html: content }} />
  );
}
