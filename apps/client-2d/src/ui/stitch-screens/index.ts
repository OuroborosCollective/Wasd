/**
 * Stitch Design System - Arelorian 2D Client
 * 
 * Auto-generated from Google Stitch project: projects/5320982353793182486
 * 
 * These components are auto-converted from Stitch HTML designs.
 * They use dangerouslySetInnerHTML and should be refined over time
 * to become proper React components with typed props.
 */

export { LoginScreenNewLogo } from './LoginScreenNewLogo';
export { CharacterSelection } from './CharacterSelection';
export { IngameHud } from './IngameHud';
export { IngameHudNewActionTriggers } from './IngameHudNewActionTriggers';
export { WorldMiniMap } from './WorldMiniMap';
export { WorldLoadingScreen10sTimer } from './WorldLoadingScreen10sTimer';
export { SkillsMatrix } from './SkillsMatrix';
export { AttributesMatrix } from './AttributesMatrix';
export { QuestJournal } from './QuestJournal';
export { QuestRewardPopup } from './QuestRewardPopup';
export { GuildPanel } from './GuildPanel';
export { FactionReputation } from './FactionReputation';
export { NpcDialogueOracleOfTides } from './NpcDialogueOracleOfTides';
export { SettingsMenuDiamondGlass } from './SettingsMenuDiamondGlass';
export { LevelUpCelebration } from './LevelUpCelebration';
export { GatheringInterfaceResourceTracking } from './GatheringInterfaceResourceTracking';
export { CraftingInterfaceRecipeManagement } from './CraftingInterfaceRecipeManagement';
export { ArelorianProjectBrief } from './ArelorianProjectBrief';

// New screens from Stitch (integrated 2026-06-04)
export { TradeWindowPlayerExchange } from './TradeWindowPlayerExchange';
export { GameplayHUDQuestTracker } from './GameplayHUDQuestTracker';
export { GameplayHUDCollapsiblePanels } from './GameplayHUDCollapsiblePanels';
export { InventoryMatrixAnimated } from './InventoryMatrixAnimated';
export { MailInterfaceCommunications } from './MailInterfaceCommunications';
export { PetMountInterface } from './PetMountInterface';

// Screens integrated 2026-06-04 (batch)
export { AuctionMarketWindow } from './AuctionMarketWindow';
export { PartyRaidInterface } from './PartyRaidInterface';
export { SocialHubFriends } from './SocialHubFriends';
export { DungeonRaidBrowser } from './DungeonRaidBrowser';
export { TeleportTravelMenu } from './TeleportTravelMenu';
export { WeatherOverlayRain } from './WeatherOverlayRain';
export { WeatherOverlaySandstorm } from './WeatherOverlaySandstorm';
export { WeatherOverlayElectronStorm } from './WeatherOverlayElectronStorm';
export { UpgradeCrystallineForge } from './UpgradeCrystallineForge';
export { UpgradeDarkCyberZen } from './UpgradeDarkCyberZen';
export { RefinementSuccess } from './RefinementSuccess';
export { RefinementFailed } from './RefinementFailed';
export { SupportTutorialsAchievements } from './SupportTutorialsAchievements';
export { WarfrontVictory } from './WarfrontVictory';
export { WarfrontDefeat } from './WarfrontDefeat';
export { WarfrontLeaderboard } from './WarfrontLeaderboard';
export { WarfrontRewards } from './WarfrontRewards';
export { WarfrontStrategicMap } from './WarfrontStrategicMap';
export { WorldAtlasPathfinding } from './WorldAtlasPathfinding';
export { WorldAtlasTownZoom } from './WorldAtlasTownZoom';
export { InteractiveWorldAtlas } from './InteractiveWorldAtlas';
export { InteractiveWorldMap } from './InteractiveWorldMap';
export { ModularItemDetail3Part } from './ModularItemDetail3Part';
export { ModularItemDetailView } from './ModularItemDetailView';
export { ModularDaggerDetail } from './ModularDaggerDetail';
export { ModularSpearDetail } from './ModularSpearDetail';
export { ModularAxeDetail } from './ModularAxeDetail';
export { ModularStaffDetail } from './ModularStaffDetail';
export { ModularWeaponDetail3Part } from './ModularWeaponDetail3Part';
export { InventoryMatrix30Slot } from './InventoryMatrix30Slot';

/**
 * Type definitions for Stitch screen components
 */
export interface StitchScreenProps {
  className?: string;
  onClose?: () => void;
  isOpen?: boolean;
}

/**
 * Component metadata for the registry
 */
export const STITCH_COMPONENTS = {
  login: ['LoginScreenNewLogo'],
  character: ['CharacterSelection', 'AttributesMatrix', 'SkillsMatrix'],
  hud: ['IngameHud', 'IngameHudNewActionTriggers', 'GameplayHUDQuestTracker', 'GameplayHUDCollapsiblePanels'],
  map: ['WorldMiniMap'],
  quests: ['QuestJournal', 'QuestRewardPopup'],
  social: ['GuildPanel', 'FactionReputation'],
  dialogue: ['NpcDialogueOracleOfTides'],
  settings: ['SettingsMenuDiamondGlass'],
  celebration: ['LevelUpCelebration'],
  gathering: ['GatheringInterfaceResourceTracking'],
  crafting: ['CraftingInterfaceRecipeManagement'],
  inventory: ['InventoryMatrixAnimated'],
  mail: ['MailInterfaceCommunications'],
  trade: ['TradeWindowPlayerExchange'],
} as const;

export type StitchComponentName = keyof typeof STITCH_COMPONENTS;