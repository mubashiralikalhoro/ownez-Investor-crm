import * as redis from 'redis';

const redisClient = redis.createClient();

redisClient.on('connect',        () => console.log('[Redis] Connecting...'));
redisClient.on('ready',          () => console.log('[Redis] Connected and ready.'));
redisClient.on('end',            () => console.log('[Redis] Connection closed.'));
redisClient.on('reconnecting',   () => console.log('[Redis] Reconnecting...'));
redisClient.on('error',      (err) => console.error('[Redis] Error:', err));

const connectIfNotConnected = async () => {
    if (redisClient.isOpen) return;
    await redisClient.connect();
};

const KEY = process.env.REDIS_PREFIX || "ownez-crm";

const apiCache = {
    setJSON: async (key: string, value: any, timeInMinutes: number = 60) => {
        try {
            await connectIfNotConnected();
            await redisClient.set(`${KEY}:${key}`, JSON.stringify(value), {
                EX: timeInMinutes * 60,
            });
        } catch (err) {
            console.error('Error setting cache:', err);
        }
    },
    getJSON: async <T>(key: string): Promise<T | null> => {
        try {
            await connectIfNotConnected();
            const data = await redisClient.get(`${KEY}:${key}`);

            if (!data) return null;
            return JSON.parse(data) as T;
        } catch (err) {
            console.error('Error getting cache:', err);
            return null;
        }
    },
    remove: async (key: string) => {
        try {
            await connectIfNotConnected();
            await redisClient.del(`${KEY}:${key}`);
        } catch (err) {
            console.error('Error removing cache:', err);
        }
    },
};

export const withCache = async (key: string, fn: () => Promise<any>) => {
    try {
        const data = await apiCache.getJSON(key);
        if (data) return data;
        const result = await fn();
        if (result) apiCache.setJSON(key, result, 60);
        return result;
    } catch (err) {
        console.error('Error with cache:', err);
        return fn();
    }
};

export { apiCache };
