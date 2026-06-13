import express, { NextFunction, Request, Response } from "express";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import cors from "cors";
import cookieParser from "cookie-parser";
import path from "path";
import RedisStore from "rate-limit-redis";
import compression from "compression";
import timeout from "connect-timeout";

import productRoutes from "./Routes/User/productRoutes";
import categoryRoutes from "./Routes/User/categoriesRoutes";
import userRoutes from "./Routes/User/userRoutes";
import adminRoutes from "./Routes/Admin/adminRoutes";
import addressRoutes from "./Routes/User/addressRoutes";
import reviewsRoutes from "./Routes/User/reviewsRoutes";
import orderRoutes from "./Routes/User/orderRoutes";
import cartRoutes from "./Routes/User/cartRoutes";
import paymentRoutes from "./Routes/User/paymentRoutes";
import wishlistRoutes from "./Routes/User/wishlistRoutes";
import newsletterRoutes from "./Routes/User/newsletterRoutes";
import contactRoutes from "./Routes/User/contactRoutes";
import couponRoutes from "./Routes/User/couponRoutes";
import stockNotifyRoutes from "./Routes/User/stockNotifyRoutes";
import { stripeWebhook } from "./controller/paymentController";

import logger from "./config/logger";
import AppError from "./utils/AppError";
import { globalErrorHandler } from "./Error/globalErrorHandler";
import { client as redis } from "./config/redis";
import { requestIdMiddleware } from "./middleware/requestId";
import { prisma } from "./config/database";

const app = express();
app.set("trust proxy", 1);

const corsOrigins = process.env.CORS_ORIGIN?.split(",")
  .map((o) => o.trim())
  .filter(Boolean);
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

const makeRedisStore = (prefix: string) =>
  new RedisStore({
    prefix,
    sendCommand: (...args: string[]) => (redis as any).sendCommand(args),
  });

// set seurity HTTP Header
app.use(helmet());

// Stripe webhook MUST be registered before express.json() so it receives the raw body
// Stripe verifies the signature against the raw request buffer
app.post(
  "/api/v1/webhooks/stripe",
  express.raw({ type: "application/json" }),
  stripeWebhook,
);

app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));
app.use(cookieParser());
app.use("/public", express.static(path.join(__dirname, "../public")));

if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
}

app.use(requestIdMiddleware);

app.use(timeout("30s"));

app.use((req: Request, _res: Response, next: NextFunction) => {
  if (!req.timedout) next();
});

app.use(
  compression({
    threshold: 1024,
    filter: (req: Request, res: Response) => {
      if (req.headers["x-no-compression"]) return false;
      return compression.filter(req, res);
    },
  }),
);

// Request Limiting from the same IP
const Limiter = rateLimit({
  max: 300,
  windowMs: 15 * 60 * 1000,
  message: "Too many requests from this IP, please try again in 15 minutes",
  handler: (req, res) => {
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

const authLimiter = rateLimit({
  max: 10,
  windowMs: 15 * 60 * 1000,
  store: makeRedisStore("rl:auth:"),
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => {
    res.status(429).json({
      status: "fail",
      message: "To many attempts from this IP, Please try again in 15 minutes.",
    });
  },
});

const contactLimiter = rateLimit({
  max: 5,
  windowMs: 60 * 60 * 1000,
  store: makeRedisStore("rl:contact"),
  handler: (_req, res) => {
    res.status(429).json({
      status: "fail",
      message: "Too many messages sent. Please try again in an hour.",
    });
  },
});

const passwordResetLimiter = rateLimit({
  max: 5,
  windowMs: 60 * 60 * 1000,
  store: makeRedisStore("rl:reset:"),
  handler: (_req, res) => {
    res.status(429).json({
      status: "fail",
      message: "Too many password reset requests. Please try again in an hour.",
    });
  },
});

const newsletterLimiter = rateLimit({
  max: 5,
  windowMs: 60 * 60 * 1000,
  store: makeRedisStore("rl:newsletter:"),
  handler: (_req, res) => {
    res.status(429).json({
      status: "fail",
      message: "Too many subscription attempts, Please try again later",
    });
  },
});

app.use("/api/v1/users/login", authLimiter);
app.use("/api/v1/users/signup", authLimiter);
app.use("/api/v1/users/forgotPassword", passwordResetLimiter);
app.use("/api/v1/users/resetPassword", passwordResetLimiter);
app.use("/api/v1/newsletter/subscribe", newsletterLimiter);
app.use("/api/v1/contact", contactLimiter);

app.use("/api", Limiter as any);

// Log all Request
app.use((req: Request, _res: Response, next: NextFunction) => {
  logger.http("Incoming request...", {
    method: req.method,
    path: req.path,
    ip: req.ip,
  });
  next();
});

// Health check
app.get("/api/v1/health", async (_req, res) => {
  const checks = {
    uptime: Math.floor(process.uptime()),
    timeStamp: new Date().toISOString(),
    database: "unknown" as "ok" | "error",
    redis: "unknown" as "ok" | "error",
  };

  await Promise.allSettled([
    prisma.$queryRaw`SELECT 1`
      .then(() => {
        checks.database = "ok";
      })
      .catch(() => {
        checks.database = "error";
      }),
    redis
      .ping()
      .then(() => {
        checks.redis = "ok";
      })
      .catch(() => {
        checks.redis = "error";
      }),
  ]);

  const isHealthy = checks.database === "ok" && checks.redis === "ok";

  res.status(isHealthy ? 200 : 503).json({
    status: isHealthy ? "healthy" : "degraded",
    checks,
  });
});

// product Routes
app.use("/api/v1/products", productRoutes);
// category Routes
app.use("/api/v1/categories", categoryRoutes);
// User Routes
app.use("/api/v1/users", userRoutes);
// admin Routes
app.use("/api/v1/admin", adminRoutes);
// Address Routes
app.use("/api/v1/addresses", addressRoutes);
// reviews Routes
app.use("/api/v1/reviews", reviewsRoutes);
// cart Routes
app.use("/api/v1/cart", cartRoutes);
// order Routes
app.use("/api/v1/order", orderRoutes);
// payment Routes
app.use("/api/v1/payments", paymentRoutes);
// wishlist Routes
app.use("/api/v1/wishlist", wishlistRoutes);
// newsletter Routes
app.use("/api/v1/newsletter", newsletterRoutes);
// contact Routes
app.use("/api/v1/contact", contactRoutes);
// coupon Routes
app.use("/api/v1/coupons", couponRoutes);
// stockNotify Routes
app.use("/api/v1/stock-notify", stockNotifyRoutes);

// HANDLING  unhandled Routes
app.use((req: Request, _res: Response, next: NextFunction) => {
  return next(
    new AppError(`Can't find ${req.originalUrl} on this server`, 404),
  );
});

app.use(globalErrorHandler);

export default app;
