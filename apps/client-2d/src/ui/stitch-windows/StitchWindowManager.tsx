/**
 * StitchWindowManager
 * 
 * Manages opening/closing Stitch screen components.
 * Provides a unified interface for the Arelorian 2D client HUD.
 */

import React, { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import {
  LoginScreenNewLogo,
  CharacterSelection,
  IngameHud,
  IngameHudNewActionTriggers,
  WorldMiniMap,
  WorldLoadingScreen10sTimer,
  SkillsMatrix,
  AttributesMatrix,
  QuestJournal,
  QuestRewardPopup,
  GuildPanel,
  FactionReputation,
  NpcDialogueOracleOfTides,
  SettingsMenuDiamondGlass,
  LevelUpCelebration,
  GatheringInterfaceResourceTracking,
  CraftingInterfaceRecipeManagement,
  // New screens
  TradeWindowPlayerExchange,
  GameplayHUDQuestTracker,
  GameplayHUDCollapsiblePanels,
  InventoryMatrixAnimated,
  MailInterfaceCommunications,
  type StitchComponentName,
  STITCH_COMPONENTS,
} from '../stitch-screens';

/**
 * Component map for Stitch screens
 */
const STITCH_COMPONENT_MAP: Record<string, React.ComponentType<any>> = {
  LoginScreenNewLogo,
  CharacterSelection,
  IngameHud,
  IngameHudNewActionTriggers,
  WorldMiniMap,
  WorldLoadingScreen10sTimer,
  SkillsMatrix,
  AttributesMatrix,
  QuestJournal,
  QuestRewardPopup,
  GuildPanel,
  FactionReputation,
  NpcDialogueOracleOfTides,
  SettingsMenuDiamondGlass,
  LevelUpCelebration,
  GatheringInterfaceResourceTracking,
  CraftingInterfaceRecipeManagement,
  // New screens
  TradeWindowPlayerExchange,
  GameplayHUDQuestTracker,
  GameplayHUDCollapsiblePanels,
  InventoryMatrixAnimated,
  MailInterfaceCommunications,
};

export type StitchScreenId =
  | 'login'
  | 'characterSelection'
  | 'ingameHud'
  | 'ingameHudV2'
  | 'worldMap'
  | 'loading'
  | 'skills'
  | 'attributes'
  | 'quests'
  | 'questReward'
  | 'guild'
  | 'factions'
  | 'npcDialogue'
  | 'settings'
  | 'levelUp'
  | 'gathering'
  | 'crafting'
  // New screens
  | 'trade'
  | 'questTracker'
  | 'collapsiblePanels'
  | 'inventory'
  | 'mail';

interface StitchScreenConfig {
  component: string;
  title: string;
  modal?: boolean;
  fullscreen?: boolean;
}

/**
 * Screen configuration registry
 */
export const STITCH_SCREENS: Record<StitchScreenId, StitchScreenConfig> = {
  login: { component: 'LoginScreenNewLogo', title: 'Login', modal: true },
  characterSelection: { component: 'CharacterSelection', title: 'Character Selection', modal: true },
  ingameHud: { component: 'IngameHud', title: 'HUD', modal: false },
  ingameHudV2: { component: 'IngameHudNewActionTriggers', title: 'HUD v2', modal: false },
  worldMap: { component: 'WorldMiniMap', title: 'World Map', modal: true },
  loading: { component: 'WorldLoadingScreen10sTimer', title: 'Loading', fullscreen: true },
  skills: { component: 'SkillsMatrix', title: 'Skills', modal: true },
  attributes: { component: 'AttributesMatrix', title: 'Attributes', modal: true },
  quests: { component: 'QuestJournal', title: 'Quests', modal: true },
  questReward: { component: 'QuestRewardPopup', title: 'Reward', modal: true },
  guild: { component: 'GuildPanel', title: 'Guild', modal: true },
  factions: { component: 'FactionReputation', title: 'Factions', modal: true },
  npcDialogue: { component: 'NpcDialogueOracleOfTides', title: 'Dialogue', modal: true },
  settings: { component: 'SettingsMenuDiamondGlass', title: 'Settings', modal: true },
  levelUp: { component: 'LevelUpCelebration', title: 'Level Up!', modal: true },
  gathering: { component: 'GatheringInterfaceResourceTracking', title: 'Gathering', modal: true },
  crafting: { component: 'CraftingInterfaceRecipeManagement', title: 'Crafting', modal: true },
  // New screens
  trade: { component: 'TradeWindowPlayerExchange', title: 'Trade', modal: true },
  questTracker: { component: 'GameplayHUDQuestTracker', title: 'Quest Tracker', modal: false },
  collapsiblePanels: { component: 'GameplayHUDCollapsiblePanels', title: 'Panels', modal: false },
  inventory: { component: 'InventoryMatrixAnimated', title: 'Inventory', modal: true },
  mail: { component: 'MailInterfaceCommunications', title: 'Mail', modal: true },
};

interface StitchWindowState {
  openScreens: Set<StitchScreenId>;
  zIndex: number;
}

interface StitchWindowContextType {
  openScreen: (screenId: StitchScreenId) => void;
  closeScreen: (screenId: StitchScreenId) => void;
  closeAllScreens: () => void;
  isScreenOpen: (screenId: StitchScreenId) => boolean;
  state: StitchWindowState;
}

const StitchWindowContext = createContext<StitchWindowContextType | null>(null);

interface StitchWindowProviderProps {
  children: ReactNode;
  defaultScreen?: StitchScreenId;
}

export function StitchWindowProvider({ children, defaultScreen }: StitchWindowProviderProps) {
  const [state, setState] = useState<StitchWindowState>(() => ({
    openScreens: defaultScreen ? new Set([defaultScreen]) : new Set(),
    zIndex: 100,
  }));

  const openScreen = useCallback((screenId: StitchScreenId) => {
    setState(prev => ({
      openScreens: new Set([...prev.openScreens, screenId]),
      zIndex: prev.zIndex + 1,
    }));
  }, []);

  const closeScreen = useCallback((screenId: StitchScreenId) => {
    setState(prev => {
      const newScreens = new Set(prev.openScreens);
      newScreens.delete(screenId);
      return { ...prev, openScreens: newScreens };
    });
  }, []);

  const closeAllScreens = useCallback(() => {
    setState(prev => ({ ...prev, openScreens: new Set() }));
  }, []);

  const isScreenOpen = useCallback((screenId: StitchScreenId) => {
    return state.openScreens.has(screenId);
  }, [state.openScreens]);

  return (
    <StitchWindowContext.Provider value={{
      openScreen,
      closeScreen,
      closeAllScreens,
      isScreenOpen,
      state,
    }}>
      {children}
    </StitchWindowContext.Provider>
  );
}

export function useStitchWindow() {
  const context = useContext(StitchWindowContext);
  if (!context) {
    throw new Error('useStitchWindow must be used within StitchWindowProvider');
  }
  return context;
}

/**
 * Render open Stitch screens
 */
export function StitchWindowLayer() {
  const { state, closeScreen, zIndex } = useStitchWindow();

  return (
    <div className="stitch-window-layer" style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 50 }}>
      {Array.from(state.openScreens).map((screenId, index) => {
        const config = STITCH_SCREENS[screenId];
        if (!config) return null;

        const Component = STITCH_COMPONENT_MAP[config.component];
        if (!Component) return null;

        return (
          <div
            key={screenId}
            className="stitch-window"
            style={{
              position: 'absolute',
              inset: 0,
              pointerEvents: 'auto',
              zIndex: zIndex - index,
            }}
          >
            {config.modal && (
              <div 
                className="stitch-modal-backdrop"
                onClick={() => closeScreen(screenId)}
                style={{
                  position: 'fixed',
                  inset: 0,
                  backgroundColor: 'rgba(7, 7, 17, 0.8)',
                  backdropFilter: 'blur(8px)',
                }}
              />
            )}
            <div 
              className="stitch-modal-content"
              style={{
                position: 'relative',
                maxWidth: config.fullscreen ? '100%' : '90vw',
                maxHeight: config.fullscreen ? '100%' : '90vh',
                margin: 'auto',
                top: '50%',
                transform: 'translateY(-50%)',
              }}
            >
              <button
                onClick={() => closeScreen(screenId)}
                className="stitch-close-btn"
                style={{
                  position: 'absolute',
                  top: 8,
                  right: 8,
                  zIndex: 1,
                  background: 'rgba(255,255,255,0.1)',
                  border: 'none',
                  borderRadius: '50%',
                  width: 32,
                  height: 32,
                  cursor: 'pointer',
                  color: '#fff',
                }}
              >
                ✕
              </button>
              <Component />
            </div>
          </div>
        );
      })}
    </div>
  );
}

/**
 * Hook to open specific Stitch screens
 */
export function useStitchScreen(screenId: StitchScreenId) {
  const { openScreen, closeScreen, isScreenOpen } = useStitchWindow();

  return {
    open: () => openScreen(screenId),
    close: () => closeScreen(screenId),
    toggle: () => isScreenOpen(screenId) ? closeScreen(screenId) : openScreen(screenId),
    isOpen: isScreenOpen(screenId),
  };
}

// Convenience hooks for common screens
export function useLoginScreen() {
  return useStitchScreen('login');
}

export function useCharacterSelection() {
  return useStitchScreen('characterSelection');
}

export function useWorldMap() {
  return useStitchScreen('worldMap');
}

export function useSettings() {
  return useStitchScreen('settings');
}

export function useGuild() {
  return useStitchScreen('guild');
}

export function useQuests() {
  return useStitchScreen('quests');
}

export function useSkills() {
  return useStitchScreen('skills');
}

export function useLevelUp() {
  return useStitchScreen('levelUp');
}

// New screen hooks
export function useTrade() {
  return useStitchScreen('trade');
}

export function useQuestTracker() {
  return useStitchScreen('questTracker');
}

export function useCollapsiblePanels() {
  return useStitchScreen('collapsiblePanels');
}

export function useInventory() {
  return useStitchScreen('inventory');
}

export function useMail() {
  return useStitchScreen('mail');
}