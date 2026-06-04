/**
 * MailInterface - Communications
 * 
 * Stitch design for mail/messaging system
 */

import React from 'react';

interface MailMessage {
  id: string;
  from: string;
  subject: string;
  preview: string;
  timestamp: string;
  read: boolean;
  attachment?: boolean;
}

interface MailInterfaceProps {
  className?: string;
  messages?: MailMessage[];
  onMessageSelect?: (id: string) => void;
}

export function MailInterface({ 
  className = '',
  messages = [],
  onMessageSelect
}: MailInterfaceProps) {
  const defaultMessages: MailMessage[] = [
    { id: '1', from: 'Solar Exiles Guild', subject: 'Guild invitation', preview: 'We would like to invite you to join our guild...', timestamp: '2h ago', read: false, attachment: true },
    { id: '2', from: 'NPC: Merchant Aldric', subject: 'Special Offer!', preview: 'I have rare items available for you...', timestamp: '1d ago', read: true, attachment: false },
    { id: '3', from: 'System', subject: 'Quest Completed', preview: 'Your quest "Dragon\'s Remembrance" has been completed...', timestamp: '2d ago', read: true, attachment: false },
  ];

  const displayMessages = messages.length > 0 ? messages : defaultMessages;

  const content = `
<div class="bg-deep-marine min-h-screen flex flex-col">
  <!-- Header -->
  <div class="px-4 py-3 bg-surface-container border-b border-white/10 flex items-center justify-between">
    <div class="flex items-center gap-3">
      <span class="material-symbols-outlined text-primary text-2xl">mail</span>
      <h2 class="font-headline-md text-headline-md text-primary">Mail</h2>
    </div>
    <button class="w-8 h-8 rounded-full bg-surface-container-low hover:bg-white/10 flex items-center justify-center transition-colors">
      <span class="material-symbols-outlined text-on-surface-variant text-sm">edit</span>
    </button>
  </div>

  <!-- Mail List -->
  <div class="flex-1 overflow-y-auto">
    ${displayMessages.map((msg) => `
    <div 
      class="p-4 border-b border-white/5 hover:bg-white/5 cursor-pointer transition-colors ${!msg.read ? 'bg-primary/5' : ''}"
      ${onMessageSelect ? `onclick="window.dispatchEvent(new CustomEvent('mail-select', {detail: '${msg.id}'}))"` : ''}
    >
      <div class="flex items-start gap-3">
        <!-- Avatar -->
        <div class="w-10 h-10 rounded-full bg-surface-container flex items-center justify-center flex-shrink-0 border ${!msg.read ? 'border-primary' : 'border-outline/30'}">
          ${msg.from.startsWith('NPC:') 
            ? '<span class="material-symbols-outlined text-primary text-sm" style="font-variation-settings:\'FILL\' 1;">store</span>'
            : msg.from === 'System'
            ? '<span class="material-symbols-outlined text-secondary text-sm" style="font-variation-settings:\'FILL\' 1;">settings</span>'
            : '<span class="material-symbols-outlined text-tertiary text-sm" style="font-variation-settings:\'FILL\' 1;">group</span>'
          }
        </div>

        <!-- Content -->
        <div class="flex-1 min-w-0">
          <div class="flex items-center justify-between gap-2 mb-1">
            <span class="font-body-md text-body-md ${!msg.read ? 'text-primary font-semibold' : 'text-on-surface'} truncate">${msg.from}</span>
            <span class="font-label-sm text-label-sm text-on-surface-variant flex-shrink-0">${msg.timestamp}</span>
          </div>
          <div class="flex items-center gap-2 mb-1">
            <span class="font-body-md text-body-md ${!msg.read ? 'text-primary' : 'text-on-surface'} truncate">${msg.subject}</span>
            ${msg.attachment ? '<span class="material-symbols-outlined text-secondary text-xs flex-shrink-0">attach_file</span>' : ''}
          </div>
          <p class="font-label-sm text-label-sm text-on-surface-variant truncate">${msg.preview}</p>
        </div>

        <!-- Unread Indicator -->
        ${!msg.read ? '<div class="w-2 h-2 rounded-full bg-primary flex-shrink-0 mt-2"></div>' : ''}
      </div>
    </div>
    `).join('')}
  </div>

  <!-- Bottom Nav -->
  <div class="bg-surface-container-low/60 backdrop-blur-xl border-t border-white/10 px-4 py-3 flex justify-around">
    <button class="flex flex-col items-center gap-1 text-primary">
      <span class="material-symbols-outlined text-xl" style="font-variation-settings:'FILL' 1;">inbox</span>
      <span class="font-label-sm text-label-sm">Inbox</span>
    </button>
    <button class="flex flex-col items-center gap-1 text-on-surface-variant hover:text-primary transition-colors">
      <span class="material-symbols-outlined text-xl">send</span>
      <span class="font-label-sm text-label-sm">Sent</span>
    </button>
    <button class="flex flex-col items-center gap-1 text-on-surface-variant hover:text-primary transition-colors">
      <span class="material-symbols-outlined text-xl">star</span>
      <span class="font-label-sm text-label-sm">Saved</span>
    </button>
    <button class="flex flex-col items-center gap-1 text-on-surface-variant hover:text-primary transition-colors">
      <span class="material-symbols-outlined text-xl">settings</span>
      <span class="font-label-sm text-label-sm">Settings</span>
    </button>
  </div>
</div>`;

  return (
    <div className={className} dangerouslySetInnerHTML={{ __html: content }} />
  );
}
