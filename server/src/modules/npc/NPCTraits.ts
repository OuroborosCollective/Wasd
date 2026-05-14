/**
 * NPC personality / trait bag used by chat + memory weighting.
 */
export interface NPCTraits {
  interests: string[];
  personality: string[];
  aggression?: number;
  curiosity?: number;
  courage?: number;
}
