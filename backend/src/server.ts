import "dotenv/config";
import { connectDB, disconnectDB } from "./config/database";
import { connectRedis } from "./config/redis";
import logger from "./config/logger";
import app from "./app";
import { Server } from "http";

const port = process.env.PORT || 3000;
let server: Server;

const startServer = async () => {
  try {
    logger.info("Connecting to database...");
    await connectDB();

    logger.info("Connecting to Redis...");
    await connectRedis();

    server = app.listen(port, () => {
      logger.info(`Server running on port ${port}`);
    });

    server.on("error", (err) => {
      logger.error("Server error", err);
    });
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    logger.error(`Startup failed: ${errorMessage}`, { stack: err instanceof Error ? err.stack : undefined });
    process.exit(1);
  }
};

startServer().catch((err) => {
  logger.error("Uncaught error during initialization", err);
  process.exit(1);
});

// --- Error Handling ---

const shutdown = async (signal: string) => {
  logger.info(`${signal} received. Starting graceful shutdown...`);

  if (server) {
    server.close(async () => {
      logger.info("⛔ HTTP server closed.");
      await disconnectDB();
      process.exit(0);
    });
  } else {
    process.exit(0);
  }
};

// Handle Asynchronous Errors
process.on("unhandledRejection", (err: Error) => {
  logger.error("💥 UNHANDLED REJECTION! Shutting down...");
  logger.error(err.name, err.message);

  // Close server before exiting
  if (server) {
    server.close(async () => {
      await disconnectDB();
      process.exit(1);
    });
  } else {
    process.exit(1);
  }
});

// Handle Synchronous Errors
process.on("uncaughtException", async (err: Error) => {
  logger.error("💥 UNCAUGHT EXCEPTION! Shutting down...");
  logger.error(err.name, err.message);

  await disconnectDB();
  process.exit(1);
});

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
