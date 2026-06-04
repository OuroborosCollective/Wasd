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
  // Previously integrated screens
  TradeWindowPlayerExchange,
  GameplayHUDQuestTracker,
  GameplayHUDCollapsiblePanels,
  InventoryMatrixAnimated,
  MailInterfaceCommunications,
  PetMountInterface,
  // Batch integrated screens
  AuctionMarketWindow,
  PartyRaidInterface,
  SocialHubFriends,
  DungeonRaidBrowser,
  TeleportTravelMenu,
  WeatherOverlayRain,
  WeatherOverlaySandstorm,
  WeatherOverlayElectronStorm,
  UpgradeCrystallineForge,
  UpgradeDarkCyberZen,
  RefinementSuccess,
  RefinementFailed,
  SupportTutorialsAchievements,
  WarfrontVictory,
  WarfrontDefeat,
  WarfrontLeaderboard,
  WarfrontRewards,
  WarfrontStrategicMap,
  WorldAtlasPathfinding,
  WorldAtlasTownZoom,
  InteractiveWorldAtlas,
  InteractiveWorldMap,
  ModularItemDetail3Part,
  ModularItemDetailView,
  ModularDaggerDetail,
  ModularSpearDetail,
  ModularAxeDetail,
  ModularStaffDetail,
  ModularWeaponDetail3Part,
  InventoryMatrix30Slot,
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
  // Previously integrated screens
  TradeWindowPlayerExchange,
  GameplayHUDQuestTracker,
  GameplayHUDCollapsiblePanels,
  InventoryMatrixAnimated,
  MailInterfaceCommunications,
  PetMountInterface,
  // Batch integrated screens
  AuctionMarketWindow,
  PartyRaidInterface,
  SocialHubFriends,
  DungeonRaidBrowser,
  TeleportTravelMenu,
  WeatherOverlayRain,
  WeatherOverlaySandstorm,
  WeatherOverlayElectronStorm,
  UpgradeCrystallineForge,
  UpgradeDarkCyberZen,
  RefinementSuccess,
  RefinementFailed,
  SupportTutorialsAchievements,
  WarfrontVictory,
  WarfrontDefeat,
  WarfrontLeaderboard,
  WarfrontRewards,
  WarfrontStrategicMap,
  WorldAtlasPathfinding,
  WorldAtlasTownZoom,
  InteractiveWorldAtlas,
  InteractiveWorldMap,
  ModularItemDetail3Part,
  ModularItemDetailView,
  ModularDaggerDetail,
  ModularSpearDetail,
  ModularAxeDetail,
  ModularStaffDetail,
  ModularWeaponDetail3Part,
  InventoryMatrix30Slot,
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
  // Previously integrated screens
  | 'trade'
  | 'questTracker'
  | 'collapsiblePanels'
  | 'inventory'
  | 'mail'
  | 'petMount'
  // Batch integrated screens
  | 'auctionMarket'
  | 'partyRaid'
  | 'socialHub'
  | 'dungeonRaid'
  | 'teleport'
  | 'weatherRain'
  | 'weatherSandstorm'
  | 'weatherElectronStorm'
  | 'upgradeCrystalline'
  | 'upgradeDarkCyber'
  | 'refinementSuccess'
  | 'refinementFailed'
  | 'support'
  | 'warfrontVictory'
  | 'warfrontDefeat'
  | 'warfrontLeaderboard'
  | 'warfrontRewards'
  | 'warfrontStrategic'
  | 'worldAtlasPathfinding'
  | 'worldAtlasTown'
  | 'worldAtlasInteractive'
  | 'worldMapInteractive'
  | 'modularItemDetail'
  | 'modularItemView'
  | 'modularDagger'
  | 'modularSpear'
  | 'modularAxe'
  | 'modularStaff'
  | 'modularWeapon'
  | 'inventory30Slot';

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
  // Previously integrated screens
  trade: { component: 'TradeWindowPlayerExchange', title: 'Trade', modal: true },
  questTracker: { component: 'GameplayHUDQuestTracker', title: 'Quest Tracker', modal: false },
  collapsiblePanels: { component: 'GameplayHUDCollapsiblePanels', title: 'Panels', modal: false },
  inventory: { component: 'InventoryMatrixAnimated', title: 'Inventory', modal: true },
  mail: { component: 'MailInterfaceCommunications', title: 'Mail', modal: true },
  petMount: { component: 'PetMountInterface', title: 'Pet & Mount', modal: true },
  // Batch integrated screens
  auctionMarket: { component: 'AuctionMarketWindow', title: 'Auction & Market', modal: true },
  partyRaid: { component: 'PartyRaidInterface', title: 'Party & Raid', modal: true },
  socialHub: { component: 'SocialHubFriends', title: 'Social Hub', modal: true },
  dungeonRaid: { component: 'DungeonRaidBrowser', title: 'Dungeons & Raids', modal: true },
  teleport: { component: 'TeleportTravelMenu', title: 'Teleport & Travel', modal: true },
  weatherRain: { component: 'WeatherOverlayRain', title: 'Weather: Rain', modal: false, fullscreen: true },
  weatherSandstorm: { component: 'WeatherOverlaySandstorm', title: 'Weather: Sandstorm', modal: false, fullscreen: true },
  weatherElectronStorm: { component: 'WeatherOverlayElectronStorm', title: 'Weather: Electron Storm', modal: false, fullscreen: true },
  upgradeCrystalline: { component: 'UpgradeCrystallineForge', title: 'Crystalline Forge', modal: true },
  upgradeDarkCyber: { component: 'UpgradeDarkCyberZen', title: 'Upgrade & Refine', modal: true },
  refinementSuccess: { component: 'RefinementSuccess', title: 'Refinement Success', modal: true },
  refinementFailed: { component: 'RefinementFailed', title: 'Refinement Failed', modal: true },
  support: { component: 'SupportTutorialsAchievements', title: 'Support & Achievements', modal: true },
  warfrontVictory: { component: 'WarfrontVictory', title: 'Warfront Victory', modal: true },
  warfrontDefeat: { component: 'WarfrontDefeat', title: 'Warfront Defeat', modal: true },
  warfrontLeaderboard: { component: 'WarfrontLeaderboard', title: 'Warfront Leaderboard', modal: true },
  warfrontRewards: { component: 'WarfrontRewards', title: 'Warfront Rewards', modal: true },
  warfrontStrategic: { component: 'WarfrontStrategicMap', title: 'Warfront Map', modal: true },
  worldAtlasPathfinding: { component: 'WorldAtlasPathfinding', title: 'World Atlas', modal: true },
  worldAtlasTown: { component: 'WorldAtlasTownZoom', title: 'Town & Group Finder', modal: true },
  worldAtlasInteractive: { component: 'InteractiveWorldAtlas', title: 'Interactive Atlas', modal: true },
  worldMapInteractive: { component: 'InteractiveWorldMap', title: 'Interactive Map', modal: true },
  modularItemDetail: { component: 'ModularItemDetail3Part', title: 'Item Detail', modal: true },
  modularItemView: { component: 'ModularItemDetailView', title: 'Item View', modal: true },
  modularDagger: { component: 'ModularDaggerDetail', title: 'Dagger Detail', modal: true },
  modularSpear: { component: 'ModularSpearDetail', title: 'Spear Detail', modal: true },
  modularAxe: { component: 'ModularAxeDetail', title: 'Axe Detail', modal: true },
  modularStaff: { component: 'ModularStaffDetail', title: 'Staff Detail', modal: true },
  modularWeapon: { component: 'ModularWeaponDetail3Part', title: 'Weapon Detail', modal: true },
  inventory30Slot: { component: 'InventoryMatrix30Slot', title: 'Inventory (30)', modal: true },
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

export function usePetMount() {
  return useStitchScreen('petMount');
}

// Batch integrated screen hooks
export function useAuctionMarket() {
  return useStitchScreen('auctionMarket');
}

export function usePartyRaid() {
  return useStitchScreen('partyRaid');
}

export function useSocialHub() {
  return useStitchScreen('socialHub');
}

export function useDungeonRaid() {
  return useStitchScreen('dungeonRaid');
}

export function useTeleport() {
  return useStitchScreen('teleport');
}

export function useWeatherRain() {
  return useStitchScreen('weatherRain');
}

export function useWeatherSandstorm() {
  return useStitchScreen('weatherSandstorm');
}

export function useWeatherElectronStorm() {
  return useStitchScreen('weatherElectronStorm');
}

export function useUpgradeCrystalline() {
  return useStitchScreen('upgradeCrystalline');
}

export function useUpgradeDarkCyber() {
  return useStitchScreen('upgradeDarkCyber');
}

export function useRefinementSuccess() {
  return useStitchScreen('refinementSuccess');
}

export function useRefinementFailed() {
  return useStitchScreen('refinementFailed');
}

export function useSupport() {
  return useStitchScreen('support');
}

export function useWarfrontVictory() {
  return useStitchScreen('warfrontVictory');
}

export function useWarfrontDefeat() {
  return useStitchScreen('warfrontDefeat');
}

export function useWarfrontLeaderboard() {
  return useStitchScreen('warfrontLeaderboard');
}

export function useWarfrontRewards() {
  return useStitchScreen('warfrontRewards');
}

export function useWarfrontStrategic() {
  return useStitchScreen('warfrontStrategic');
}

export function useWorldAtlasPathfinding() {
  return useStitchScreen('worldAtlasPathfinding');
}

export function useWorldAtlasTown() {
  return useStitchScreen('worldAtlasTown');
}

export function useWorldAtlasInteractive() {
  return useStitchScreen('worldAtlasInteractive');
}

export function useWorldMapInteractive() {
  return useStitchScreen('worldMapInteractive');
}

export function useModularItemDetail() {
  return useStitchScreen('modularItemDetail');
}

export function useModularItemView() {
  return useStitchScreen('modularItemView');
}

export function useModularDagger() {
  return useStitchScreen('modularDagger');
}

export function useModularSpear() {
  return useStitchScreen('modularSpear');
}

export function useModularAxe() {
  return useStitchScreen('modularAxe');
}

export function useModularStaff() {
  return useStitchScreen('modularStaff');
}

export function useModularWeapon() {
  return useStitchScreen('modularWeapon');
}

export function useInventory30Slot() {
  return useStitchScreen('inventory30Slot');
}