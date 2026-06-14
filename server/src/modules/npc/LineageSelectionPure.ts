export interface LineageSelectableActor {
  readonly id: string;
  readonly settlementId?: string;
  readonly houseId?: string;
}

export interface LineageSelectableHouse {
  readonly id: string;
  readonly settlementId: string;
  readonly isActive: boolean;
}

export interface LineageSelectableSettlement {
  readonly id: string;
  readonly tick: number;
  readonly population: number;
  readonly capacity: number;
  readonly foodSupply: number;
}

export interface LineageSelectionInput {
  readonly tick: number;
  readonly settlements: readonly LineageSelectableSettlement[];
  readonly houses: readonly LineageSelectableHouse[];
  readonly actors: readonly LineageSelectableActor[];
  readonly maxSelectionsPerSettlement?: number;
}

export interface LineageSelection {
  readonly firstActorId: string;
  readonly secondActorId: string;
  readonly houseId: string;
  readonly settlementId: string;
  readonly tick: number;
}

function safe(value: string | undefined): string {
  return typeof value === 'string' && value.length > 0 ? value : 'none';
}

function actorKey(actor: LineageSelectableActor): string {
  return [safe(actor.settlementId), safe(actor.houseId), actor.id].join(':');
}

function selectableSettlement(settlement: LineageSelectableSettlement): boolean {
  return settlement.population < settlement.capacity && settlement.foodSupply >= 0;
}

export function selectLineageInputs(input: LineageSelectionInput): LineageSelection[] {
  const limit = Math.max(0, Math.floor(input.maxSelectionsPerSettlement ?? 1));
  if (limit <= 0) return [];

  const settlements = [...input.settlements].filter(selectableSettlement).sort((a, b) => a.id.localeCompare(b.id));
  const houses = [...input.houses].filter((house) => house.isActive).sort((a, b) => a.id.localeCompare(b.id));
  const actors = [...input.actors].sort((a, b) => actorKey(a).localeCompare(actorKey(b)));
  const selected: LineageSelection[] = [];

  for (const settlement of settlements) {
    let count = 0;
    for (const house of houses.filter((item) => item.settlementId === settlement.id)) {
      const roster = actors.filter((actor) => actor.settlementId === settlement.id && (actor.houseId ?? house.id) === house.id);
      if (roster.length < 2) continue;
      selected.push({
        firstActorId: roster[0].id,
        secondActorId: roster[1].id,
        houseId: house.id,
        settlementId: settlement.id,
        tick: input.tick,
      });
      count += 1;
      if (count >= limit) break;
    }
  }

  return selected;
}
