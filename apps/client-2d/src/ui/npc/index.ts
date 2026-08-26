// NPC UI Components for Areloria 2D Client
// Diamond Glass Design System

export * from "./NpcUI.types";
export { NpcSpeechBubble } from "./NpcSpeechBubble";
export { NpcContextWindow } from "./NpcContextWindow";
export { NpcInteractionMenu } from "./NpcInteractionMenu";
export { NpcPortrait, generateVisualTraits, generatePortraitSVG, type NpcPortraitProps } from "./NpcPortrait";
export { WorldLoadingScreen, type WorldLoadingScreenProps, type LoadingStatus } from "./WorldLoadingScreen";
export { GameChatWindow, useChat, type ChatChannel, type ChatMessage, type ChatState, type GameChatWindowProps, type UseChatReturn } from "./GameChatWindow";
