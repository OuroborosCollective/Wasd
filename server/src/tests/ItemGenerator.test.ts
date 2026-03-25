import { describe, it, expect } from 'vitest';
import { ItemGenerator } from '../modules/items/ItemGenerator';

describe('ItemGenerator', () => {
  it('should instantiate successfully', () => {
    const generator = new ItemGenerator();
    expect(generator).toBeInstanceOf(ItemGenerator);
  });

  it('should have a generate method', () => {
    const generator = new ItemGenerator();
    expect(typeof generator.generate).toBe('function');
  });
});
