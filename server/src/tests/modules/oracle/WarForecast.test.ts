import { describe, it, expect } from 'vitest';
import { WarForecast } from '../../../modules/oracle/WarForecast';

describe('WarForecast', () => {
  it('should calculate risk correctly with normal inputs', () => {
    const forecast = new WarForecast();
    const result = forecast.evaluate(0.5, 0.5);
    // (0.5 * 0.7) + (0.5 * 0.3) = 0.35 + 0.15 = 0.5
    expect(result.risk).toBeCloseTo(0.5);
  });

  it('should cap risk at 1.0', () => {
    const forecast = new WarForecast();
    const result = forecast.evaluate(10, 10);
    expect(result.risk).toBe(1);
  });

  it('should handle zero inputs', () => {
    const forecast = new WarForecast();
    const result = forecast.evaluate(0, 0);
    expect(result.risk).toBe(0);
  });

  it('should weigh tension more heavily than resources', () => {
    const forecast = new WarForecast();
    const highTension = forecast.evaluate(0.8, 0.2); // (0.8 * 0.7) + (0.2 * 0.3) = 0.56 + 0.06 = 0.62
    const highResources = forecast.evaluate(0.2, 0.8); // (0.2 * 0.7) + (0.8 * 0.3) = 0.14 + 0.24 = 0.38
    expect(highTension.risk).toBeGreaterThan(highResources.risk);
  });
});
