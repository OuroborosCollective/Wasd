export type Entity = number;

export interface Component {}

export type ComponentConstructor<T extends Component> = new (...args: any[]) => T;

export abstract class System {
  public abstract update(dt: number, world: World): void;
}

export class World {
  private entities: Set<Entity> = new Set();
  private nextEntityId: Entity = 0;
  private components: Map<string, Map<Entity, any>> = new Map();
  private systems: System[] = [];

  /**
   * Creates a new unique entity.
   */
  public createEntity(): Entity {
    const entity = this.nextEntityId++;
    this.entities.add(entity);
    return entity;
  }

  /**
   * Destroys an entity and removes all its associated components.
   */
  public destroyEntity(entity: Entity): void {
    if (!this.entities.has(entity)) return;
    
    this.entities.delete(entity);
    for (const store of this.components.values()) {
      store.delete(entity);
    }
  }

  /**
   * Adds a component instance to an entity.
   */
  public addComponent<T extends Component>(entity: Entity, component: T): void {
    if (!this.entities.has(entity)) return;

    const type = component.constructor.name;
    if (!this.components.has(type)) {
      this.components.set(type, new Map());
    }
    this.components.get(type)!.set(entity, component);
  }

  /**
   * Retrieves a component instance for a specific entity.
   */
  public getComponent<T extends Component>(entity: Entity, componentClass: ComponentConstructor<T>): T | undefined {
    const type = componentClass.name;
    return this.components.get(type)?.get(entity);
  }

  /**
   * Removes a specific component type from an entity.
   */
  public removeComponent<T extends Component>(entity: Entity, componentClass: ComponentConstructor<T>): void {
    const type = componentClass.name;
    this.components.get(type)?.delete(entity);
  }

  /**
   * Checks if an entity has a specific component.
   */
  public hasComponent<T extends Component>(entity: Entity, componentClass: ComponentConstructor<T>): boolean {
    const type = componentClass.name;
    return this.components.get(type)?.has(entity) ?? false;
  }

  /**
   * Returns all entities that possess all of the specified component types.
   */
  public query(...componentClasses: ComponentConstructor<any>[]): Entity[] {
    if (componentClasses.length === 0) return Array.from(this.entities);

    const types = componentClasses.map(c => c.name);
    return Array.from(this.entities).filter(entity =>
      types.every(type => this.components.get(type)?.has(entity))
    );
  }

  /**
   * Registers a logic system to be executed during update.
   */
  public addSystem(system: System): void {
    this.systems.push(system);
  }

  /**
   * Executes all registered systems.
   */
  public update(dt: number): void {
    for (const system of this.systems) {
      system.update(dt, this);
    }
  }

  /**
   * Clears the entire world state.
   */
  public clear(): void {
    this.entities.clear();
    this.components.clear();
    this.systems = [];
    this.nextEntityId = 0;
  }
}