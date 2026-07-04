export type ClientIntentAction = "move" | "gather" | "attack" | "interact" | "inventory";

export interface ClientIntentBase<TAction extends ClientIntentAction, TPayload extends Record<string, unknown>> {
  readonly action: TAction;
  readonly payload: TPayload;
  readonly requestId?: string;
}

export interface MoveClientIntentPayload extends Record<string, unknown> {
  readonly target: {
    readonly x: number;
    readonly y: number;
  };
}

export interface GatherClientIntentPayload extends Record<string, unknown> {
  readonly nodeId: string;
  readonly playerPosition: {
    readonly x: number;
    readonly y: number;
  };
}

export interface AttackClientIntentPayload extends Record<string, unknown> {
  readonly targetId: string;
  readonly abilityId?: string;
}

export interface InteractClientIntentPayload extends Record<string, unknown> {
  readonly targetId: string;
  readonly interaction?: string;
}

export interface InventoryClientIntentPayload extends Record<string, unknown> {
  readonly operation: "equip" | "unequip" | "use" | "move" | "drop";
  readonly itemId: string;
  readonly slotId?: string;
}

export type ClientIntentPayloadByAction = {
  readonly move: MoveClientIntentPayload;
  readonly gather: GatherClientIntentPayload;
  readonly attack: AttackClientIntentPayload;
  readonly interact: InteractClientIntentPayload;
  readonly inventory: InventoryClientIntentPayload;
};

export type ClientIntent<TAction extends ClientIntentAction = ClientIntentAction> = {
  readonly [Action in ClientIntentAction]: ClientIntentBase<Action, ClientIntentPayloadByAction[Action]>;
}[TAction];

export function isClientIntentAction(value: unknown): value is ClientIntentAction {
  return value === "move" || value === "gather" || value === "attack" || value === "interact" || value === "inventory";
}
