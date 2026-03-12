export class GateController {
  setState(gate: any, state: string) {
    const allowed = ["open", "closed", "locked", "damaged", "destroyed"];
    if (!allowed.includes(state)) throw new Error("Invalid gate state");
    gate.state = state;
    return gate;
  }

  canOpen(actor: any, gate: any) {
    if (gate.state === "destroyed") return false;
    if (gate.state === "locked" && !actor.permissions?.includes("gate_access")) return false;
    return true;
  }
}