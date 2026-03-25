import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getPayPalToken } from '../../../modules/payment/PayPalService.js';

describe('PayPalService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getPayPalToken', () => {
    it('should resolve with access_token when valid JSON is returned', async () => {
      // Mock global fetch
      const mockFetch = vi.spyOn(global, 'fetch').mockResolvedValue({
        text: vi.fn().mockResolvedValue(JSON.stringify({ access_token: 'mocked_access_token' })),
        status: 200,
      } as any);

      const token = await getPayPalToken();
      expect(token).toBe('mocked_access_token');
      expect(mockFetch).toHaveBeenCalled();
    });

    it('should reject when PayPal returns invalid JSON', async () => {
      // Mock global fetch
      vi.spyOn(global, 'fetch').mockResolvedValue({
        text: vi.fn().mockResolvedValue('Invalid JSON string'),
        status: 200,
      } as any);

      await expect(getPayPalToken()).rejects.toThrow(SyntaxError);
    });

    it('should reject when valid JSON has no access_token', async () => {
      // Mock global fetch
      vi.spyOn(global, 'fetch').mockResolvedValue({
        text: vi.fn().mockResolvedValue(JSON.stringify({ some_other_field: 'no_token' })),
        status: 200,
      } as any);

      await expect(getPayPalToken()).rejects.toThrow('No access_token: {"some_other_field":"no_token"}');
    });

    it('should reject when fetch throws an error', async () => {
      // Mock global fetch
      vi.spyOn(global, 'fetch').mockRejectedValue(new Error('Network error'));

      await expect(getPayPalToken()).rejects.toThrow('Network error');
    });
  });
});
