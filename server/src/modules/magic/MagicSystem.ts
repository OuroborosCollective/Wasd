import { WeatherMagicBridge, type WeatherState } from "./WeatherMagicBridge.js";

export class MagicSystem {
  cast(caster: any, spell: any, target: any, weather: WeatherState = "clear") {
    if ((caster.mana ?? 0) < spell.cost) {
      return { success: false, reason: "not_enough_mana" };
    }

    caster.mana -= spell.cost;

    let finalEffect = spell.effect ?? "generic_magic_effect";
    let intensity = 1.0;

    if (spell.element) {
      intensity = WeatherMagicBridge.getMultiplier(spell.element, weather);
    }

    return {
      success: true,
      spell: spell.id,
      target: target?.id ?? null,
      effect: finalEffect,
      intensity,
      weather
    };
  }
}