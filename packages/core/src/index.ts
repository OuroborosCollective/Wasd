import {
  createWorld,
  addEntity,
  removeEntity,
  addComponent,
  removeComponent,
  hasComponent,
  defineComponent,
  Types,
  defineQuery,
  defineSystem,
  IWorld,
  Component,
  Query,
  System
} from 'bitecs';

export {
  createWorld,
  addEntity,
  removeEntity,
  addComponent,
  removeComponent,
  hasComponent,
  defineComponent,
  Types,
  defineQuery,
  defineSystem
};

export type { IWorld, Component, Query, System };

/**
 * Basis-Komponente für die Position im 3D-Raum.
 */
export const Position = defineComponent({
  x: Types.f32,
  y: Types.f32,
  z: Types.f32,
});

/**
 * Basis-Komponente für die Rotation (Euler-Winkel).
 */
export const Rotation = defineComponent({
  x: Types.f32,
  y: Types.f32,
  z: Types.f32,
});

/**
 * Basis-Komponente für die physikalische Geschwindigkeit.
 */
export const Velocity = defineComponent({
  x: Types.f32,
  y: Types.f32,
  z: Types.f32,
});