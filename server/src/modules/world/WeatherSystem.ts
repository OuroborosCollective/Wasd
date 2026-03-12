export class WeatherSystem {
  nextWeather(seed:number){
    const states = ["clear","rain","storm","fog","snow","heatwave"];
    return states[Math.abs(seed) % states.length];
  }
}