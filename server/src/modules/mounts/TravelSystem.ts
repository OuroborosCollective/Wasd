export class TravelSystem {
  moveWithMount(position:any, direction:any, speed:number){
    return {
      x: position.x + direction.x * speed,
      y: position.y + direction.y * speed,
      z: position.z + direction.z * speed
    };
  }
}