import { connectDB, disconnectDB } from "./config/database";
import { connectRedis } from "./config/redis";
import logger from "./config/logger";
import app from "./app";
import dotenv from "dotenv";
import { Server } from "http";

dotenv.config();

const port = process.env.PORT || 3000;
let server: Server;

const startServer = async () => {
  try {
    await connectDB();
    await connectRedis();

    server = app.listen(port, () => {
      logger.info(`🟢 server running on port: ${port}...`);
    });
  } catch (err) {
    logger.error("Startup failed...", err);
    process.exit(1);
  }
};

// Replace startServer(); at the bottom with this:
startServer().catch((err) => {
  console.error("🔥 Fatal error during initialization:", err);
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
