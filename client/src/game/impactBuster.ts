import { sendUseSkill } from "../networking/websocketClient";
import { IMPACT_BUSTER_SKILL_ID } from "./impactBusterConfig";
import { isImpactBusterUnlocked } from "../state/playerState";
import { notifyWarn } from "../ui/notifications";

export function triggerImpactBusterClientGuard(): boolean {
  if (!isImpactBusterUnlocked()) {
    notifyWarn("Impact Buster ist gesperrt. Schließe zuerst einen Worldboss-Dungeon ab.", {
      title: "Skill locked",
    });
    return false;
  }
  sendUseSkill(IMPACT_BUSTER_SKILL_ID);
  return true;
}
