import { WeatherMagicBridge } from "../weather/WeatherMagicBridge.js";
import { KAPPA } from "../../core/are/Kappa.js";

export class MagicSystem {
  cast(caster: any, spell: any, target: any, weather: string = "clear") {
    if ((caster.mana ?? 0) < spell.cost) {
      return { success: false, reason: "not_enough_mana" };
    }

    caster.mana -= spell.cost;

    const multiplier = WeatherMagicBridge.getMultiplier(weather, spell.type || "generic");
    const basePotency = spell.potency || 10;
    const potency = Math.floor((basePotency * multiplier) / KAPPA);

    return {
      success: true,
      spell: spell.id,
      target: target?.id ?? null,
      effect: spell.effect ?? "generic_magic_effect",
      potency,
      multiplier
    };
  }
}