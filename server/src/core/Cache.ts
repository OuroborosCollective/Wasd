// @ARE-GUARD-EXEMPT: core meta
import Redis from 'ioredis';

const cacheUrl = process.env.CACHE_URL;

// @ts-ignore
export const cache = cacheUrl ? new Redis(cacheUrl) : null;

if (cache) {
  cache.on('error', (err: any) => {
    console.error('Valkey/Redis Cache Error:', err);
  });
  
  cache.on('connect', () => {
    console.log('Connected to Valkey/Redis Cache');
  });
}
