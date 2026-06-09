import { getItemDefinition } from "./items";

export type EquipmentSlotId = "weapon" | "armor" | "trinket";

export interface EquipmentState {
  slots: Record<EquipmentSlotId, string | null>;
}

export type EquipmentEvent =
  | {
      type: "equipment_set";
      slots: Record<EquipmentSlotId, string | null>;
    }
  | {
      type: "equipment_equip";
      slot: EquipmentSlotId;
      itemId: string;
    }
  | {
      type: "equipment_unequip";
      slot: EquipmentSlotId;
    };

export function createEquipment(): EquipmentState {
  return {
    slots: {
      weapon: null,
      armor: null,
      trinket: null
    }
  };
}

export function applyEquipmentEvent(
  equipment: EquipmentState,
  event: EquipmentEvent
): EquipmentState {
  if (event.type === "equipment_set") {
    return {
      slots: { ...event.slots }
    };
  }

  if (event.type === "equipment_equip") {
    const def = getItemDefinition(event.itemId);

    if (!def) return equipment;

    // Validate item kind matches slot type
    if (event.slot === "weapon" && def.kind !== "weapon") return equipment;
    if (event.slot === "armor" && def.kind !== "armor") return equipment;

    return {
      slots: {
        ...equipment.slots,
        [event.slot]: event.itemId
      }
    };
  }

  if (event.type === "equipment_unequip") {
    return {
      slots: {
        ...equipment.slots,
        [event.slot]: null
      }
    };
  }

  return equipment;
}

// ─── Gathering Tools API ──────────────────────────────────────────────────────

/**
 * Equip a gathering tool from inventory.
 * Server validates inventory ownership.
 */
export async function equipGatheringTool(itemId: string): Promise<{
  ok: boolean;
  result?: {
    ok: boolean;
    playerId: string;
    itemId: string;
    reason?: string;
  };
}> {
  const response = await fetch("/api/equipment/equip", {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({ itemId }),
  });

  return response.json();
}

/**
 * Unequip a gathering tool from a slot.
 * Server validates ownership.
 */
export async function unequipGatheringTool(slotId: string): Promise<{
  ok: boolean;
  result?: {
    ok: boolean;
    playerId: string;
    slotId: string;
    reason?: string;
  };
}> {
  const response = await fetch("/api/equipment/unequip", {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({ slotId }),
  });

  return response.json();
}

/**
 * Get current player equipment state from server.
 */
export async function fetchEquipmentState(): Promise<{
  ok: boolean;
  playerId: string;
  equipment?: {
    playerId: string;
    schemaVersion: number;
    slots: Array<{
      slotId: string;
      itemId: string;
      title: string;
    }>;
  };
}> {
  const response = await fetch("/api/equipment/state");
  return response.json();
}