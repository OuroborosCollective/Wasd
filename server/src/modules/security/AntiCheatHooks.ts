export class AntiCheatHooks {
  inspectMovement(delta: any) {
    return {
      suspicious: Math.abs(delta?.x || 0) > 100 || Math.abs(delta?.y || 0) > 100
    };
  }
}