/**
 * GameplayHUDQuestTracker - Quest Tracker Overlay
 * 
 * Stitch design for in-game quest tracking overlay
 */

import React from 'react';

interface GameplayHUDQuestTrackerProps {
  className?: string;
  quests?: Array<{
    id: string;
    title: string;
    progress: number;
    total: number;
    zone: string;
  }>;
}

export function GameplayHUDQuestTracker({ 
  className = '',
  quests = []
}: GameplayHUDQuestTrackerProps) {
  const defaultQuests = [
    { id: '1', title: 'The Azure Sanctum', progress: 3, total: 5, zone: 'Azure Sanctum' },
    { id: '2', title: 'Dragon\'s Remembrance', progress: 1, total: 3, zone: 'Ethereal Peaks' },
  ];

  const displayQuests = quests.length > 0 ? quests : defaultQuests;

  const content = `
<div class="bg-surface/80 backdrop-blur-xl rounded-xl border border-white/10 shadow-xl overflow-hidden">
  <!-- Header -->
  <div class="px-4 py-2 bg-surface-container border-b border-white/5 flex items-center justify-between">
    <div class="flex items-center gap-2">
      <span class="material-symbols-outlined text-primary text-lg">school</span>
      <span class="font-label-caps text-label-caps text-primary tracking-wider">QUEST TRACKER</span>
    </div>
    <button class="w-6 h-6 rounded-full hover:bg-white/10 flex items-center justify-center transition-colors">
      <span class="material-symbols-outlined text-on-surface-variant text-sm">expand_less</span>
    </button>
  </div>

  <!-- Quest List -->
  <div class="p-3 flex flex-col gap-2">
    ${displayQuests.map((quest, i) => `
    <div class="diamond-glass p-3 border-l-2 ${i === 0 ? 'border-l-primary' : 'border-l-secondary/50'} hover:bg-white/5 transition-colors cursor-pointer">
      <div class="flex items-start justify-between gap-2">
        <div class="flex-1 min-w-0">
          <h4 class="font-body-md text-body-md text-primary truncate">${quest.title}</h4>
          <div class="flex items-center gap-2 mt-1">
            <span class="material-symbols-outlined text-tertiary text-xs">location_on</span>
            <span class="font-label-sm text-label-sm text-on-surface-variant">${quest.zone}</span>
          </div>
        </div>
        <div class="flex flex-col items-end gap-1">
          <span class="font-label-caps text-label-caps ${quest.progress >= quest.total ? 'text-tertiary' : 'text-secondary'}">${quest.progress}/${quest.total}</span>
          <div class="w-16 h-1 bg-surface-container rounded-full overflow-hidden">
            <div class="h-full bg-gradient-to-r from-primary to-secondary rounded-full transition-all" style="width: ${(quest.progress / quest.total) * 100}%"></div>
          </div>
        </div>
      </div>
    </div>
    `).join('')}
  </div>

  <!-- Collapse Handle -->
  <div class="h-2 bg-gradient-to-b from-transparent to-black/20 flex items-center justify-center">
    <div class="w-8 h-1 bg-white/20 rounded-full"></div>
  </div>
</div>`;

  return (
    <div className={className} dangerouslySetInnerHTML={{ __html: content }} />
  );
}
