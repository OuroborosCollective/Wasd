/**
 * Paperdoll Panel — Character Equipment View
 *
 * Shows character profile and equipped slots from the server-backed gameplay snapshot.
 * Follows the Panzerschrank brutalist design aesthetic.
 *
 * Determinism rule:
 * - Client displays server-authoritative snapshot data only.
 * - No direct mutation of character or equipment.
 */

import React from "react";
import type { PaperdollSnapshot } from "../../game/liveGameplaySnapshot";

interface Props {
  paperdoll: PaperdollSnapshot;
}

export function PaperdollPanel({ paperdoll }: Props) {
  const character = paperdoll.character;

  return (
    <section data-testid="paperdoll-panel-live" className="are-window paperdoll-panel">
      <h2>Character</h2>

      {character ? (
        <div className="paperdoll-character">
          <strong>{character.displayName}</strong>
          <span className="paperdoll-archetype">{character.archetype}</span>
        </div>
      ) : (
        <p className="paperdoll-empty">No character selected.</p>
      )}

      <h3>Paperdoll</h3>

      <div className="paperdoll-slots">
        {(paperdoll.slots ?? []).map((slot) => (
          <article
            key={slot.slotId}
            className="paperdoll-slot"
            data-slot-id={slot.slotId}
            data-item-id={slot.itemId ?? "empty"}
          >
            <span className="paperdoll-slot-label">{formatSlotLabel(slot.slotId)}</span>
            <strong className="paperdoll-slot-title">{slot.title}</strong>
          </article>
        ))}
      </div>
    </section>
  );
}

function formatSlotLabel(slotId: string): string {
  const labels: Record<string, string> = {
    weapon: "Weapon",
    helmet: "Helmet",
    armor: "Armor",
    boots: "Boots",
    ring: "Ring",
    amulet: "Amulet",
    woodcutting_tool: "Woodcutting",
    mining_tool: "Mining",
    fishing_tool: "Fishing",
  };
  return labels[slotId] ?? slotId;
}
