import { type WorldEmergenceCollapsePayload } from './WorldEmergenceEvent';

export type WorldEvent = WorldEmergenceCollapsePayload;

export class WorldEventBus {
  private readonly events: WorldEvent[] = [];

  public publish(event: WorldEvent): void {
    this.events.push(Object.freeze({ ...event }));
  }

  public drain<TEvent extends WorldEvent = WorldEvent>(eventType?: TEvent['eventType']): TEvent[] {
    const drained: TEvent[] = [];
    const remaining: WorldEvent[] = [];

    for (const event of this.events) {
      if (eventType == null || event.eventType === eventType) {
        drained.push(event as TEvent);
      } else {
        remaining.push(event);
      }
    }

    this.events.length = 0;
    this.events.push(...remaining);
    return drained;
  }

  public peek(): readonly WorldEvent[] {
    return this.events;
  }
}
