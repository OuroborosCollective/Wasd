import Redis from "ioredis";

export class Cache {
  private static instance: Cache;
  private client: Redis;

  private constructor() {
    const host = process.env.REDIS_HOST || "localhost";
    const port = parseInt(process.env.REDIS_PORT || "6379", 10);

    this.client = new Redis({
      host,
      port,
      retryStrategy(times: number) {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
    });

    this.client.on("error", (err: Error) => {
      console.error("Redis Client Error", err);
    });
  }

  public static getInstance(): Cache {
    if (!Cache.instance) {
      Cache.instance = new Cache();
    }
    return Cache.instance;
  }

  public async get(key: string): Promise<string | null> {
    return await this.client.get(key);
  }

  public async set(key: string, value: string, ttlSeconds?: number): Promise<string> {
    if (ttlSeconds) {
      return await this.client.set(key, value, "EX", ttlSeconds);
    }
    return await this.client.set(key, value);
  }

  public async del(key: string): Promise<number> {
    return await this.client.del(key);
  }

  public async flush(): Promise<"OK"> {
    return await this.client.flushall();
  }

  public async disconnect(): Promise<void> {
    await this.client.quit();
  }
}