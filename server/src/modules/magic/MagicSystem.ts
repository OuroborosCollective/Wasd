import { WeatherMagicBridge, type MagicElement } from "./WeatherMagicBridge.js";

export class MagicSystem {
  cast(caster: any, spell: any, target: any, weather?: string) {
    if ((caster.mana ?? 0) < spell.cost) {
      return { success: false, reason: "not_enough_mana" };
    }

    caster.mana -= spell.cost;

    const element = (spell.element ?? "fire") as MagicElement;
    const multiplier = WeatherMagicBridge.getMultiplier(element, weather);
    const baseEffect = spell.effectValue ?? 10;
    const finalEffect = Math.floor(baseEffect * multiplier);

    return {
      success: true,
      spell: spell.id,
      target: target?.id ?? null,
      element,
      multiplier,
      baseEffect,
      finalEffect,
      effect: spell.effect ?? "generic_magic_effect"
    };
  }
}
