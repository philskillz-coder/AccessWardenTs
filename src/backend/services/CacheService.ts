import Redis, { RedisOptions } from "ioredis";

interface CacheOptions {
    useRedis: boolean;
    maxInMemoryCount?: number;
    redisOptions?: RedisOptions;
}

export class CacheService {
    private useRedis: boolean;
    private maxInMemoryCount: number | undefined;
    private inMemoryCache: Map<string, { value: any; timeout?: number }>;
    private redisClient: Redis | undefined;

    constructor(options: CacheOptions) {
        this.useRedis = options.useRedis;
        this.maxInMemoryCount = options.maxInMemoryCount;
        this.inMemoryCache = new Map<string, { value: any; timeout?: number }>();

        if (this.useRedis) {
            this.redisClient = new Redis(options.redisOptions);
        }
    }

    async set(key: string, value: any, timeout: number = 60): Promise<void> {
        if (this.useRedis && this.redisClient) {
            await this.redisClient.set(key, JSON.stringify(value), "EX", timeout);
        } else {
            this.inMemoryCache.set(key, { value, timeout });

            if (this.maxInMemoryCount && this.inMemoryCache.size > this.maxInMemoryCount) {
                const keysToRemove = Array.from(this.inMemoryCache.keys()).slice(0, this.inMemoryCache.size - this.maxInMemoryCount);
                keysToRemove.forEach(k => this.inMemoryCache.delete(k));
            }

            if (timeout) {
                setTimeout(() => {
                    this.del(key);
                }, timeout * 1000);
            }
        }
    }

    async get(key: string): Promise<any | null> {
        if (this.useRedis && this.redisClient) {
            const result = await this.redisClient.get(key);
            return result ? JSON.parse(result) : null;
        } else {
            return this.inMemoryCache.get(key)?.value || null;
        }
    }

    async del(key: string): Promise<void> {
        if (this.useRedis && this.redisClient) {
            await this.redisClient.del(key);
        } else {
            this.inMemoryCache.delete(key);
        }
    }

    async flush(): Promise<void> {
        if (this.useRedis && this.redisClient) {
            await this.redisClient.flushall();
        } else {
            this.inMemoryCache.clear();
        }
    }

    async quit(): Promise<void> {
        if (this.useRedis && this.redisClient) {
            await this.redisClient.quit();
        }
    }
}

// Example usage:

// const cache = new CacheService({ useRedis: true });
// await cache.set('key1', 'value1');
// const result = await cache.get('key1');
// console.log(result);

// const inMemoryCache = new CacheService({ useRedis: false, maxInMemoryCount: 2 });
// await inMemoryCache.set('key1', 'value1');
// await inMemoryCache.set('key2', 'value2');
// await inMemoryCache.set('key3', 'value3'); // This will evict 'key1' from the in-memory cache
// const resultInMemory = await inMemoryCache.get('key1');
// console.log(resultInMemory); // Output: null

const cacheService = new CacheService({
    useRedis: false,
    maxInMemoryCount: 999_999,
});
export default cacheService;
