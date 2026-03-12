export function clientCombatAction(type:string){
  return { type: "combat_action", action: type };
}