import express, { NextFunction, Request, Response } from "express";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import cors from "cors";
import path from "path";

import productRoutes from "./Routes/User/productRoutes";
import categoryRoutes from "./Routes/User/categoriesRoutes";
import userRoutes from "./Routes/User/userRoutes";
import adminRoutes from "./Routes/Admin/adminRoutes";
import addressRoutes from "./Routes/User/addressRoutes";
import reviewsRoutes from "./Routes/User/reviewsRoutes";
import orderRoutes from "./Routes/User/orderRoutes";
import cartRoutes from "./Routes/User/cartRoutes";

import logger from "./config/logger";
import AppError from "./utils/AppError";
import { globalErrorHandler } from "./Error/globalErrorHandler";

const app = express();
app.set("trust proxy", 1);

const corsOrigins = process.env.CORS_ORIGIN?.split(",").map((o) => o.trim()).filter(Boolean);
app.use(
  cors({
    origin:
      process.env.NODE_ENV === "production"
        ? corsOrigins && corsOrigins.length > 0
          ? corsOrigins
          : false
        : true,
    credentials: true,
  }),
);

// set seurity HTTP Header
app.use(helmet());

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use("/public", express.static(path.join(__dirname, "../public")));

if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
}

// Request Limiting from the same IP
const Limiter = rateLimit({
  max: 300,
  windowMs: 15 * 60 * 1000,
  message: "Too many requests from this IP, please try again in 15 minutes",
  handler: (req: Request, res: Response) => {
    logger.warn("Rate limit exceeded", {
      ip: req.ip,
      path: req.path,
    });
    res.status(429).json({
      status: "fail",
      message: "Too many requests from this IP, please try again in 15 minutes",
    });
  },
});

app.use("/api", Limiter as any);

// Log all Request
app.use((req: Request, res: Response, next: NextFunction) => {
  logger.http("Incoming request...", {
    method: req.method,
    path: req.path,
    ip: req.ip,
  });
  next();
});

// Health check
app.get("/api/v1/health", (_req, res) => {
  res.status(200).json({ status: "ok", timestamp: new Date().toISOString() });
});

// product Routes
app.use("/api/v1/products", productRoutes);
// category Routes
app.use("/api/v1/categories", categoryRoutes);
// User Routes
app.use("/api/v1/users", userRoutes);
app.use("/api/v1/admin", adminRoutes);
// Address Routes
app.use("/api/v1/addresses", addressRoutes);
// reviews Routes
app.use("/api/v1/reviews", reviewsRoutes);
// cart Routes
app.use("/api/v1/cart", cartRoutes);
// order Routes
app.use("/api/v1/order", orderRoutes);

// HANDLING  unhandled Routes
app.use((req: Request, res: Response, next: NextFunction) => {
  return next(
    new AppError(`Can't find ${req.originalUrl} on this server`, 404),
  );
});

app.use(globalErrorHandler);

export default app;
