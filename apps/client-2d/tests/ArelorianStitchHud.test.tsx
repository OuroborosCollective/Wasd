/** @vitest-environment jsdom */
import { describe, it, expect, afterEach, vi, beforeAll } from 'vitest';
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { ArelorianStitchHud, type PlayerVitalsData } from '../src/ArelorianStitchHud';

// Mock the external hook since it depends on global context we don't fully need for rendering tests
vi.mock('../src/game/useLiveGameplaySnapshot', () => ({
  useLiveGameplaySnapshot: () => ({
    status: 'live',
    quests: [],
    resources: [],
  }),
}));

describe('ArelorianStitchHud UX & Accessibility', () => {
  let container: HTMLDivElement | null = null;

  beforeAll(() => {
    (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
  });

  afterEach(() => {
    if (container) {
      document.body.removeChild(container);
      container = null;
    }
    vi.clearAllMocks();
  });

  const defaultVitals: PlayerVitalsData = {
    hp: 85,
    maxHp: 100,
    mana: 60,
    maxMana: 100,
    stamina: 75,
    maxStamina: 100,
    xp: 30,
    maxXp: 100,
    level: 1,
  };

  const lowVitals: PlayerVitalsData = {
    hp: 15, // Below 20%
    maxHp: 100,
    mana: 60,
    maxMana: 100,
    stamina: 10, // Below 20%
    maxStamina: 100,
    xp: 30,
    maxXp: 100,
    level: 1,
  };

  it('renders vital status bars (Gauges) with proper ARIA attributes', async () => {
    container = document.createElement('div');
    document.body.appendChild(container);

    await act(async () => {
      const root = createRoot(container!);
      root.render(
        <ArelorianStitchHud
          connected={true}
          assetStatus="Loaded"
          weaponCount={1}
          playerName="PaletteTester"
          messages={[]}
          onSkill={() => {}}
          onChat={() => {}}
          onInteract={() => {}}
          vitals={defaultVitals}
        />
      );
    });

    // Check progressbars
    const hpProgressbar = container!.querySelector('[aria-label="HP"]');
    expect(hpProgressbar).toBeTruthy();
    expect(hpProgressbar?.getAttribute('role')).toBe('progressbar');
    expect(hpProgressbar?.getAttribute('aria-valuenow')).toBe('85');
    expect(hpProgressbar?.getAttribute('aria-valuetext')).toBe('85% HP');

    // Default vitals should not have low-pulse class
    expect(hpProgressbar?.classList.contains('low-pulse')).toBe(false);

    const staProgressbar = container!.querySelector('[aria-label="STA"]');
    expect(staProgressbar).toBeTruthy();
    expect(staProgressbar?.getAttribute('aria-valuetext')).toBe('75% STA');
    expect(staProgressbar?.classList.contains('low-pulse')).toBe(false);
  });

  it('applies the conditional low-pulse warning class to low health and stamina', async () => {
    container = document.createElement('div');
    document.body.appendChild(container);

    await act(async () => {
      const root = createRoot(container!);
      root.render(
        <ArelorianStitchHud
          connected={true}
          assetStatus="Loaded"
          weaponCount={1}
          playerName="PaletteTester"
          messages={[]}
          onSkill={() => {}}
          onChat={() => {}}
          onInteract={() => {}}
          vitals={lowVitals}
        />
      );
    });

    const hpProgressbar = container!.querySelector('[aria-label="HP"]');
    expect(hpProgressbar).toBeTruthy();
    expect(hpProgressbar?.getAttribute('aria-valuenow')).toBe('15');
    expect(hpProgressbar?.classList.contains('low-pulse')).toBe(true);

    const staProgressbar = container!.querySelector('[aria-label="STA"]');
    expect(staProgressbar).toBeTruthy();
    expect(staProgressbar?.getAttribute('aria-valuenow')).toBe('10');
    expect(staProgressbar?.classList.contains('low-pulse')).toBe(true);
  });

  it('exposes keyboard shortcuts via aria-keyshortcuts on side menu and skill buttons', async () => {
    container = document.createElement('div');
    document.body.appendChild(container);

    await act(async () => {
      const root = createRoot(container!);
      root.render(
        <ArelorianStitchHud
          connected={true}
          assetStatus="Loaded"
          weaponCount={1}
          playerName="PaletteTester"
          messages={[]}
          onSkill={() => {}}
          onChat={() => {}}
          onInteract={() => {}}
          vitals={defaultVitals}
        />
      );
    });

    // Check menu button shortcuts (e.g. Inventory button has shortcut "i")
    const inventoryBtn = container!.querySelector('[aria-label="Inventory [I]"]');
    expect(inventoryBtn).toBeTruthy();
    expect(inventoryBtn?.getAttribute('aria-keyshortcuts')).toBe('i');

    const chatBtn = container!.querySelector('[aria-label="Chat [T]"]');
    expect(chatBtn).toBeTruthy();
    expect(chatBtn?.getAttribute('aria-keyshortcuts')).toBe('t');

    // Check skill bar button shortcuts (e.g. Talk skill has shortcut "E")
    const talkSkillBtn = container!.querySelector('[aria-label="Talk skill [E]"]');
    expect(talkSkillBtn).toBeTruthy();
    expect(talkSkillBtn?.getAttribute('aria-keyshortcuts')).toBe('E');
  });
});
