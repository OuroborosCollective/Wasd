export const TICK_PARSER = /tick:(\d+)/i;

/**
 * Constants for fixed-point scaling to ensure deterministic calculations
 * across different hardware architectures (ARM vs x86).
 */
export const POSITION_MULTIPLIER = 1000;
export const VELOCITY_MULTIPLIER = 1000;
export const ROTATION_MULTIPLIER = 10000;
export const INVERSE_POSITION_MULTIPLIER = 1 / POSITION_MULTIPLIER;
export const INVERSE_ROTATION_MULTIPLIER = 1 / ROTATION_MULTIPLIER;