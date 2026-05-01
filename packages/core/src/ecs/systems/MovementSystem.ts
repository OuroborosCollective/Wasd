export interface Vector3 {
  x: number;
  y: number;
  z: number;
}

export interface TransformComponent {
  type: 'Transform';
  position: Vector3;
  rotation: Vector3;
  scale: Vector3;
}

export interface VelocityComponent {
  type: 'Velocity';
  linear: Vector3;
  angular: Vector3;
}

export interface Entity {
  id: string;
  getComponent<T>(type: string): T | undefined;
  hasComponent(type: string): boolean;
}

/**
 * MovementSystem
 * Engine-agnostic system responsible for updating entity transforms based on their velocity.
 * Works with plain data structures to ensure compatibility between Babylon.js, Three.js or Headless modes.
 */
export class MovementSystem {
  /**
   * Updates the position and rotation of entities based on their velocity.
   * @param entities List of entities to process
   * @param deltaTime Time elapsed since last frame in seconds
   */
  public update(entities: Entity[], deltaTime: number): void {
    for (let i = 0; i < entities.length; i++) {
      const entity = entities[i];
      
      // We only process entities that have both Transform and Velocity
      if (entity.hasComponent('Transform') && entity.hasComponent('Velocity')) {
        const transform = entity.getComponent<TransformComponent>('Transform');
        const velocity = entity.getComponent<VelocityComponent>('Velocity');

        if (transform && velocity) {
          this.applyMovement(transform, velocity, deltaTime);
        }
      }
    }
  }

  /**
   * Performs the actual coordinate calculation
   */
  private applyMovement(
    transform: TransformComponent, 
    velocity: VelocityComponent, 
    dt: number
  ): void {
    // Apply Linear Velocity: P = P + V * dt
    transform.position.x += velocity.linear.x * dt;
    transform.position.y += velocity.linear.y * dt;
    transform.position.z += velocity.linear.z * dt;

    // Apply Angular Velocity (Euler): R = R + AV * dt
    transform.rotation.x += velocity.angular.x * dt;
    transform.rotation.y += velocity.angular.y * dt;
    transform.rotation.z += velocity.angular.z * dt;
  }
}