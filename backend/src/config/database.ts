import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import logger from "./logger";

export const prisma = new PrismaClient({
  log:
    process.env.NODE_ENV === "development"
      ? ["query", "error", "warn"]
      : ["error"],
  datasources: {
    db: {
      url: (() => {
        const base = process.env.DATABASE_URL || "";
        if (base.includes("connection_limit")) return base;
        const sep = base.includes("?") ? "&" : "?";
        return `${base}${sep}connection_limit=5&pool_timeout=10&connect_timeout=10`;
      })(),
    },
  },
});

export const connectDB = async () => {
  try {
    await prisma.$connect();
    logger.info("Database connected via Prisma");
    return true;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error(`Database connection failed: ${message}`, {
      stack: error instanceof Error ? error.stack : undefined,
    });
    throw new Error(`Database connection failed: ${message}`);
  }
};

export const disconnectDB = async () => {
  await prisma.$disconnect();
};
