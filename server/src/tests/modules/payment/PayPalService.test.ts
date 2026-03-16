import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import https from 'https';
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
      // Mock https.request
      vi.spyOn(https, 'request').mockImplementation((options, callback) => {
        const res = {
          on: vi.fn((event, handler) => {
            if (event === 'data') {
              handler(JSON.stringify({ access_token: 'mocked_access_token' }));
            } else if (event === 'end') {
              handler();
            }
          }),
        };
        // @ts-ignore
        callback(res);
        return {
          on: vi.fn(),
          write: vi.fn(),
          end: vi.fn(),
        } as any;
      });

      const token = await getPayPalToken();
      expect(token).toBe('mocked_access_token');
    });

    it('should reject when PayPal returns invalid JSON', async () => {
      // Mock https.request
      vi.spyOn(https, 'request').mockImplementation((options, callback) => {
        const res = {
          on: vi.fn((event, handler) => {
            if (event === 'data') {
              handler('Invalid JSON string');
            } else if (event === 'end') {
              handler();
            }
          }),
        };
        // @ts-ignore
        callback(res);
        return {
          on: vi.fn(),
          write: vi.fn(),
          end: vi.fn(),
        } as any;
      });

      await expect(getPayPalToken()).rejects.toThrow(SyntaxError);
    });

    it('should reject when valid JSON has no access_token', async () => {
      // Mock https.request
      vi.spyOn(https, 'request').mockImplementation((options, callback) => {
        const res = {
          on: vi.fn((event, handler) => {
            if (event === 'data') {
              handler(JSON.stringify({ some_other_field: 'no_token' }));
            } else if (event === 'end') {
              handler();
            }
          }),
        };
        // @ts-ignore
        callback(res);
        return {
          on: vi.fn(),
          write: vi.fn(),
          end: vi.fn(),
        } as any;
      });

      await expect(getPayPalToken()).rejects.toThrow('No access_token: {"some_other_field":"no_token"}');
    });

    it('should reject when req.on error is triggered', async () => {
      // Mock https.request
      vi.spyOn(https, 'request').mockImplementation((options, callback) => {
        return {
          on: vi.fn((event, handler) => {
            if (event === 'error') {
               // Schedule error handler to be called to simulate network error
               setTimeout(() => handler(new Error('Network error')), 10);
            }
          }),
          write: vi.fn(),
          end: vi.fn(),
        } as any;
      });

      await expect(getPayPalToken()).rejects.toThrow('Network error');
    });
  });
});
