import { WeatherMagicBridge } from "./WeatherMagicBridge.js";
export class MagicSystem {
  private weatherBridge = new WeatherMagicBridge();
  cast(caster: any, spell: any, target: any, weather: string = "clear") {
    if ((caster.mana ?? 0) < spell.cost) {
      return { success: false, reason: "not_enough_mana" };
    }
    caster.mana -= spell.cost;
    const multiplier = this.weatherBridge.calculatePotency(spell.type || "generic", weather);
    const finalPotency = (spell.potency || 10) * multiplier;
    return {
      success: true,
      spell: spell.id,
      target: target?.id ?? null,
      effect: spell.effect ?? "generic_magic_effect",
      potency: finalPotency,
      multiplier
    };
  }
}
