export class WarForecast {
  predict(tension:number){
    return tension > 0.7 ? "high_risk_of_war" : "stable_for_now";
  }
}