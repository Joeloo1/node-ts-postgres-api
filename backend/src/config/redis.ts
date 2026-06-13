import { createClient, RedisClientType } from "redis";
import logger from "./logger";

const redisUrl = process.env.REDIS_URL;

let clientInstance: RedisClientType | null = null;

const initializeClient = (): RedisClientType => {
  if (!clientInstance) {
    clientInstance = createClient({
      url: redisUrl,
      socket: {
        reconnectStrategy: (retries) => Math.min(retries * 50, 500),
      },
    }) as RedisClientType;

    clientInstance.on("error", (err) => {
      logger.error("Redis client error", err);
    });

    clientInstance.on("connect", () => {
      logger.info("Redis connected");
    });

    clientInstance.on("ready", () => {
      logger.info("Redis ready");
    });
  }
  return clientInstance;
};

export const client = new Proxy({} as RedisClientType, {
  get: (_target, prop) => {
    return initializeClient()[prop as keyof RedisClientType];
  },
});

export const getClient = initializeClient;

// SCAN-safe cache invalidation — avoids blocking KEYS command in production
export const scanDel = async (pattern: string): Promise<void> => {
  const rc = initializeClient();
  const keys: string[] = [];
  for await (const page of rc.scanIterator({ MATCH: pattern, COUNT: 100 })) {
    const pageKeys = Array.isArray(page) ? page : [page];
    keys.push(...pageKeys);
  }
  if (keys.length > 0) await Promise.all(keys.map((k) => rc.del(k)));
};

export const connectRedis = async () => {
  try {
    const redisClient = initializeClient();
    if (!redisClient.isOpen) {
      await redisClient.connect();
      logger.info("Redis connected successfully");
    }
  } catch (err) {
    logger.error("Redis connection error", err);
    throw err;
  }
};

export const disconnectRedis = async (): Promise<void> => {
  try {
    await client.quit();
    logger.info("Redis connection closed");
  } catch (err) {
    logger.error("Error closing Redis connection", err);
  }
};
