sed -i 's/this.harvestBrain.getHarvestIntensity()/npc.harvestBuffIntensity/' server/src/core/CrimsonHarvestWatchdog.ts
sed -i 's/npc.hasHarvestBuff = true;/npc.hasHarvestBuff = true;\n           npc.harvestBuffIntensity = intensity;/' server/src/core/CrimsonHarvestWatchdog.ts

sed -i 's/this.bordersBrain.getTerritoryInstability()/player.borderPenaltyIntensity/' server/src/core/ShatteredBordersWatchdog.ts
sed -i 's/player.hasBorderPenalty = true;/player.hasBorderPenalty = true;\n          player.borderPenaltyIntensity = instability;/' server/src/core/ShatteredBordersWatchdog.ts

sed -i 's/this.rebellionBrain.getRebellionIntensity()/player.rebelBuffIntensity/' server/src/core/RebellionEchoWatchdog.ts
sed -i 's/player.hasRebelBuff = true;/player.hasRebelBuff = true;\n           player.rebelBuffIntensity = intensity;/' server/src/core/RebellionEchoWatchdog.ts

sed -i 's/this.rebellionBrain.getRebellionIntensity()/guard.rebelBuffIntensity/' server/src/core/RebellionEchoWatchdog.ts
sed -i 's/guard.isHighAlert = true;/guard.isHighAlert = true;\n           guard.rebelBuffIntensity = intensity;/' server/src/core/RebellionEchoWatchdog.ts
