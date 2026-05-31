import { WeatherMagicBridge } from "./WeatherMagicBridge.js";

export class MagicSystem {
  cast(caster: any, spell: any, target: any, weather: string = "clear") {
    if ((caster.mana ?? 0) < spell.cost) {
      return { success: false, reason: "not_enough_mana" };
    }

    caster.mana -= spell.cost;

    const multiplier = WeatherMagicBridge.getPotencyMultiplier(spell.element || "neutral", weather);
    const finalPotency = (spell.potency || 10) * multiplier;

    return {
      success: true,
      spell: spell.id,
      target: target?.id ?? null,
      effect: spell.effect ?? "generic_magic_effect",
      finalPotency,
      weatherApplied: weather
    };
  }
}
