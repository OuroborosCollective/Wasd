import Redis from 'ioredis';

const cacheUrl = process.env.CACHE_URL;

export const cache = cacheUrl ? new Redis(cacheUrl) : null;

if (cache) {
  cache.on('error', (err) => {
    console.error('Valkey/Redis Cache Error:', err);
  });
  
  cache.on('connect', () => {
    console.log('Connected to Valkey/Redis Cache');
  });
}
