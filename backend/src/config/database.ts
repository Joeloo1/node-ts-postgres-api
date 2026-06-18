import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import logger from "./logger";

function buildDbUrl(): string {
  const base = process.env.DATABASE_URL ?? "";
  if (!base) return base;
  // Neon serverless pooler requires pgbouncer=true so Prisma uses simple query
  // protocol (no persistent prepared statements). Longer timeouts handle cold starts.
  const params: Record<string, string> = {
    pgbouncer: "true",
    connection_limit: "5",
    pool_timeout: "30",
    connect_timeout: "30",
  };
  const url = new URL(base);
  for (const [k, v] of Object.entries(params)) {
    if (!url.searchParams.has(k)) url.searchParams.set(k, v);
  }
  return url.toString();
}

export const prisma = new PrismaClient({
  log:
    process.env.NODE_ENV === "development"
      ? ["error", "warn"]
      : ["error"],
  datasources: { db: { url: buildDbUrl() } },
});

let keepaliveTimer: ReturnType<typeof setInterval> | null = null;

export const connectDB = async () => {
  try {
    await prisma.$connect();
    logger.info("Database connected via Prisma");

    // Neon suspends idle computes after ~5 min, which kills the TCP connection.
    // Pinging every 4 minutes keeps the compute warm and avoids "Error { kind: Closed }".
    keepaliveTimer = setInterval(async () => {
      try {
        await prisma.$queryRaw`SELECT 1`;
      } catch {
        // Swallow — the next real query will surface the error if things are truly broken.
      }
    }, 4 * 60 * 1000);

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
  if (keepaliveTimer) {
    clearInterval(keepaliveTimer);
    keepaliveTimer = null;
  }
  await prisma.$disconnect();
};
