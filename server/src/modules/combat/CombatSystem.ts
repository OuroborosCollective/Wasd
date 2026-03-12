/**
 * CombatSystem — server-authoritative melee combat resolution.
 *
 * Provides the core formulae for hit-chance and damage calculation used
 * during player-initiated attacks against NPC targets.  All arithmetic is
 * executed on the server to prevent client-side cheating.
 *
 * Combat stats are read from each combatant's `skills.combat.level` field
 * (defaulting to `1` when absent), giving players a way to improve
 * performance over time through the skill system.
 *
 * ### Combat flow (per attack attempt)
 * 1. Check attacker stamina; reject if exhausted.
 * 2. Deduct 10 stamina from the attacker.
 * 3. Roll hit chance via {@link hitChance} — miss if `Math.random() > chance`.
 * 4. On hit, apply damage via {@link calculateDamage} to the defender.
 *
 * Note: {@link WorldTick} performs its own simplified inline attack calculation
 * for NPC targets, adding weapon-bonus damage on top of a fixed base.  This
 * class is intended for future direct integration as the canonical combat path.
 */
export class CombatSystem {
  /**
   * Executes a single attack from `attacker` against `defender`.
   *
   * Mutates both objects: `attacker.stamina` is decremented by 10 and
   * `defender.health` is clamped to ≥ 0 on a successful hit.
   *
   * @param attacker - The entity initiating the attack.  Must have a
   *                   `stamina` field and optionally `skills.combat.level`.
   * @param defender - The entity receiving the attack.  Must have `health`
   *                   and optionally `skills.combat.level`.
   * @returns A result object describing the outcome:
   *   - `success: false` with `reason: "no_stamina"` when the attacker is
   *     out of stamina.
   *   - `success: true, hit: false, damage: 0` on a miss.
   *   - `success: true, hit: true, damage, defenderHealth` on a hit.
   */
  attack(attacker: any, defender: any) {
    if (attacker.stamina <= 0) return { success: false, reason: "no_stamina" };

    attacker.stamina -= 10;

    const hitChance = this.hitChance(attacker, defender);
    if (Math.random() > hitChance) {
      return { success: true, hit: false, damage: 0 };
    }

    const damage = this.calculateDamage(attacker, defender);
    defender.health = Math.max(0, defender.health - damage);

    return {
      success: true,
      hit: true,
      damage,
      defenderHealth: defender.health
    };
  }

  /**
   * Computes the probability that an attack will connect.
   *
   * Uses a skill-ratio formula:
   * ```
   * hitChance = clamp(atk / (atk + def), 0.10, 0.95)
   * ```
   * where `atk` and `def` are the respective `skills.combat.level` values
   * (default `1`).  The result is always in the range [0.10, 0.95].
   *
   * @param attacker - Entity with an optional `skills.combat.level`.
   * @param defender - Entity with an optional `skills.combat.level`.
   * @returns Hit probability in the range [0.10, 0.95].
   */
  hitChance(attacker: any, defender: any) {
    const atk = attacker.skills?.combat?.level ?? 1;
    const def = defender.skills?.combat?.level ?? 1;
    return Math.min(0.95, Math.max(0.1, atk / (atk + def)));
  }

  /**
   * Computes the damage dealt on a confirmed hit.
   *
   * Formula:
   * ```
   * damage = max(1, (5 + atk) - floor(def * 0.3) + random[0,3])
   * ```
   * The random term adds slight variance to each hit.  Damage is always
   * at least 1.
   *
   * @param attacker - Entity with an optional `skills.combat.level`.
   * @param defender - Entity with an optional `skills.combat.level`.
   * @returns Integer damage value ≥ 1.
   */
  calculateDamage(attacker: any, defender: any) {
    const atk = attacker.skills?.combat?.level ?? 1;
    const def = defender.skills?.combat?.level ?? 1;
    const base = 5 + atk;
    const mitigation = Math.floor(def * 0.3);
    return Math.max(1, base - mitigation + Math.floor(Math.random() * 4));
  }
}
