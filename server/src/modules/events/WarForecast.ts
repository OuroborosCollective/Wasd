export class WarForecast {
  evaluate(tension:number){ return { warRisk: Math.min(1, Math.max(0, tension)) }; }
}