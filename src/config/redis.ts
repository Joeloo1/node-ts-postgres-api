import * as redis from "redis";
import logger from "./logger";

const redisUrl = process.env.REDIS_URL;

export const client = redis.createClient({
  url: redisUrl,
});

client.on("error", (err) => {
  console.error("❌ Redis Error:", err.message);
  logger.error("Redis client error", err);
});

export const connectRedis = async () => {
  try {
    if (!client.isOpen) {
      console.log("⏳ Connecting to Redis...");
      await client.connect();
      console.log("🟢 Redis Connected");
    }
  } catch (err) {
    console.error("❌ Failed to connect to Redis during startup");
    throw err;
  }
};
