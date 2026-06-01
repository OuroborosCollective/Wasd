/**
 * PlayerInterestSignals model
 * Captures player profile signals for targeted tester recruitment
 */
export interface PlayerInterestSignals {
  /** Interest in MMORPG games */
  likes_mmorpg: boolean;
  /** Interest in Player vs Player content */
  likes_pvp: boolean;
  /** Interest in crafting and economy systems */
  likes_crafting: boolean;
  /** Interest in roleplay and lore */
  likes_roleplay: boolean;
  /** Interest in browser-based games */
  likes_browser_games: boolean;
  /** Interest in mobile Android games */
  likes_mobile_android: boolean;
  /** Interest in indie games */
  likes_indie_games: boolean;
  /** Interest in testing/giving feedback */
  likes_testing: boolean;
}

/**
 * Create default player interest signals
 */
export function createDefaultInterestSignals(): PlayerInterestSignals {
  return {
    likes_mmorpg: false,
    likes_pvp: false,
    likes_crafting: false,
    likes_roleplay: false,
    likes_browser_games: false,
    likes_mobile_android: false,
    likes_indie_games: false,
    likes_testing: false,
  };
}

/**
 * Calculate interest match score for specific profile types
 */
export function calculateInterestMatchScore(
  signals: PlayerInterestSignals,
  profile: Partial<PlayerInterestSignals>
): number {
  let score = 0;
  let total = 0;

  for (const key of Object.keys(profile) as Array<keyof PlayerInterestSignals>) {
    if (profile[key] === true) {
      total++;
      if (signals[key] === true) {
        score++;
      }
    }
  }

  return total > 0 ? (score / total) * 100 : 0;
}

/**
 * Example profiles for common recruitment targets
 */
export const RECRUITMENT_PROFILES = {
  ANDROID_BROWSER_TESTER: {
    likes_mmorpg: true,
    likes_browser_games: true,
    likes_mobile_android: true,
    likes_testing: true,
  },
  PVP_ENDGAME_TESTER: {
    likes_mmorpg: true,
    likes_pvp: true,
    likes_testing: true,
  },
  CRAFTING_ECONOMY_TESTER: {
    likes_mmorpg: true,
    likes_crafting: true,
    likes_indie_games: true,
    likes_testing: true,
  },
  CONTENT_CREATOR: {
    likes_mmorpg: true,
    likes_roleplay: true,
  },
} as const;