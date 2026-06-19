# Backend Production-Readiness Improvements

> **Note on raw SQL:** This document uses Prisma ORM throughout. There are two places where `prisma.$queryRaw` is used — full-text search (PostgreSQL `tsvector @@` operator has no Prisma equivalent) and revenue-by-day analytics (`DATE_TRUNC` grouping has no Prisma equivalent). Every other query is written with the standard Prisma client API. Each `$queryRaw` usage is clearly labelled and explained.

---

## Table of Contents

1. [Refresh Token Rotation](#1-refresh-token-rotation)
2. [JWT Blacklist on Logout](#2-jwt-blacklist-on-logout)
3. [Per-Route Rate Limiting](#3-per-route-rate-limiting)
4. [Environment Variable Validation at Startup](#4-environment-variable-validation-at-startup)
5. [Request Correlation ID Middleware](#5-request-correlation-id-middleware)
6. [Response Compression](#6-response-compression)
7. [Async Email Queue with BullMQ](#7-async-email-queue-with-bullmq)
8. [HTML Email Templates](#8-html-email-templates)
9. [Stripe Payment Integration](#9-stripe-payment-integration)
10. [Missing Database Indexes on Order Table](#10-missing-database-indexes-on-order-table)
11. [Improved Health Check Endpoint](#11-improved-health-check-endpoint)
12. [Full-Text Product Search](#12-full-text-product-search)
13. [Order Status Email Notifications](#13-order-status-email-notifications)
14. [Admin Audit Log](#14-admin-audit-log)
15. [XSS Input Sanitization](#15-xss-input-sanitization)
16. [Cloud Image Storage](#16-cloud-image-storage)
17. [Cursor-Based Pagination](#17-cursor-based-pagination)
18. [Swagger / OpenAPI Documentation](#18-swagger--openapi-documentation)
19. [Admin Analytics Endpoints](#19-admin-analytics-endpoints)
20. [Automated Tests](#20-automated-tests)

---

## 1. Refresh Token Rotation

### What it is

Your JWTs currently live for 90 days (`JWT_EXPIRES_IN`). If a token leaks — from a network intercept, a compromised device, or a log file — the attacker has 90 days of full access. Clearing the cookie on logout does nothing if the attacker has the raw token and sends it via the `Authorization: Bearer` header.

**Refresh token rotation** replaces the single long-lived token with two tokens:

- **Access token** — short-lived (15 minutes), used on every request.
- **Refresh token** — long-lived (7 days), stored server-side in Redis, used only to obtain a new access token.

### What it improves

- Stolen access token is only valid for 15 minutes.
- Refresh token is bound to a Redis key — deleting that key on logout truly ends the session.
- Rotation means each refresh issues a new refresh token and revokes the old one, detecting token theft via reuse.

### How to implement

**Install nothing new** — Redis is already running.

**Step 1 — Add two new token signing functions in `src/utils/jwt.ts`:**

```typescript
export const signAccessToken = (payload: object): string =>
  jwt.sign(payload, process.env.JWT_SECRET as string, { expiresIn: "15m" });

export const signRefreshToken = (payload: object): string =>
  jwt.sign(payload, process.env.JWT_REFRESH_SECRET as string, {
    expiresIn: "7d",
  });
```

**Step 2 — On login and signup, issue both tokens and store the refresh token in Redis:**

```typescript
// In authController.ts — replace signToken usage

const accessToken = signAccessToken({ id: user.id });
const refreshToken = signRefreshToken({ id: user.id });

// Store refresh token in Redis — TTL matches token expiry (7 days = 604800 seconds)
await redis.setEx(`refresh:${user.id}`, 604800, refreshToken);

// Access token cookie — short-lived
res.cookie("jwt", accessToken, {
  httpOnly: true,
  secure: isProd,
  sameSite: isProd ? "none" : "lax",
  maxAge: 15 * 60 * 1000, // 15 minutes
  path: "/",
});

// Refresh token cookie — long-lived, scoped to only the refresh endpoint
res.cookie("refreshToken", refreshToken, {
  httpOnly: true,
  secure: isProd,
  sameSite: isProd ? "none" : "lax",
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  path: "/api/v1/users/refresh",
});
```

**Step 3 — Add a refresh endpoint in `src/controller/authController.ts`:**

```typescript
export const refreshAccessToken = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const incomingRefreshToken = req.cookies.refreshToken;
    if (!incomingRefreshToken)
      return next(new AppError("No refresh token provided", 401));

    // Verify the token signature
    const decoded = JWT.verify(
      incomingRefreshToken,
      process.env.JWT_REFRESH_SECRET as string,
    ) as JwtPayload;

    // Verify this exact token is still stored in Redis (not already rotated or revoked)
    const storedToken = await redis.get(`refresh:${decoded.id}`);
    if (!storedToken || storedToken !== incomingRefreshToken)
      return next(
        new AppError("Refresh token is invalid or has been revoked", 401),
      );

    // Rotate: delete old token, issue a new pair
    await redis.del(`refresh:${decoded.id}`);
    const newAccessToken = signAccessToken({ id: decoded.id });
    const newRefreshToken = signRefreshToken({ id: decoded.id });
    await redis.setEx(`refresh:${decoded.id}`, 604800, newRefreshToken);

    const isProd = process.env.NODE_ENV === "production";
    res.cookie("jwt", newAccessToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? "none" : "lax",
      maxAge: 15 * 60 * 1000,
      path: "/",
    });
    res.cookie("refreshToken", newRefreshToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? "none" : "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: "/api/v1/users/refresh",
    });

    res.status(200).json({ status: "success", token: newAccessToken });
  },
);
```

**Step 4 — Mount the refresh route in the user router:**

```typescript
router.get("/refresh", refreshAccessToken);
```

**Step 5 — Add to your `.env`:**

```
JWT_REFRESH_SECRET=<a different secret from JWT_SECRET, at least 32 characters>
```

---

## 2. JWT Blacklist on Logout

### What it is

Even after adding refresh tokens, the short-lived access token (15 min) remains cryptographically valid after logout. An attacker who grabbed it before logout can keep using it for up to 15 minutes. Blacklisting explicitly invalidates a token in Redis before its natural expiry.

### What it improves

True session invalidation — logout means logout, immediately.

### How to implement

**Update the `Protect` middleware in `authController.ts` — check the blacklist after verifying the signature:**

```typescript
// Inside the Protect function, after JWT.verify():
const isBlacklisted = await redis.get(`blacklist:${token}`);
if (isBlacklisted)
  return next(
    new AppError(
      "Your session has been invalidated. Please log in again.",
      401,
    ),
  );
```

**Update the `logout` function to blacklist the current access token:**

```typescript
export const logout = catchAsync(
  async (req: Request, res: Response, _next: NextFunction) => {
    const token =
      req.cookies.jwt ||
      (req.headers.authorization?.startsWith("Bearer")
        ? req.headers.authorization.split(" ")[1]
        : undefined);

    if (token) {
      const decoded = JWT.decode(token) as JwtPayload;
      if (decoded?.exp) {
        const remainingSeconds = decoded.exp - Math.floor(Date.now() / 1000);
        if (remainingSeconds > 0) {
          // Store blacklisted token — TTL matches remaining valid time so it auto-cleans
          await redis.setEx(`blacklist:${token}`, remainingSeconds, "1");
        }
      }
    }

    // Revoke refresh token
    if (req.user) await redis.del(`refresh:${req.user.id}`);

    clearAuthCookie(res);
    res.clearCookie("refreshToken", { path: "/api/v1/users/refresh" });

    res
      .status(200)
      .json({ status: "success", message: "Logged out successfully" });
  },
);
```

> **Storage note:** Redis keys expire automatically (same TTL as the remaining token life), so there's no cleanup overhead. With 15-minute access tokens, each blacklist entry is gone within 15 minutes.

---

## 3. Per-Route Rate Limiting

### What it is

Your current limiter allows 300 requests per 15 minutes from one IP across all `/api` routes. That permits 300 login attempts — more than enough for a credential stuffing attack. Login, signup, and password reset endpoints need much tighter limits independent of the general API limit.

### What it improves

Prevents brute-force and credential stuffing attacks on auth endpoints without impacting normal API usage.

### How to implement

```
npm install rate-limit-redis
```

**In `src/app.ts`, add targeted limiters before mounting routes:**

```typescript
import { RedisStore } from "rate-limit-redis";
import { client as redis } from "./config/redis";

// Shared Redis store so limits are enforced across all server instances, not per-process
const makeRedisStore = (prefix: string) =>
  new RedisStore({
    prefix,
    sendCommand: (...args: string[]) => (redis as any).sendCommand(args),
  });

// 10 attempts per 15 minutes on login and signup
const authLimiter = rateLimit({
  max: 10,
  windowMs: 15 * 60 * 1000,
  store: makeRedisStore("rl:auth:"),
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => {
    res.status(429).json({
      status: "fail",
      message:
        "Too many attempts from this IP. Please try again in 15 minutes.",
    });
  },
});

// 5 requests per hour on password reset (prevent email bombing)
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

// Apply before mounting user routes
app.use("/api/v1/users/login", authLimiter);
app.use("/api/v1/users/signup", authLimiter);
app.use("/api/v1/users/forgotPassword", passwordResetLimiter);
app.use("/api/v1/users/resetPassword", passwordResetLimiter);

// Existing global limiter stays for all other /api routes
app.use("/api", Limiter);
```

---

## 4. Environment Variable Validation at Startup

### What it is

If `JWT_SECRET` is undefined, `jwt.sign(payload, undefined)` still runs — it just signs with no secret, making every token trivially forgeable. If `DATABASE_URL` is missing, the app starts but crashes on the first DB call with a cryptic error. There's no guard at boot.

### What it improves

**Fail fast** with a clear, actionable error if any required environment variable is missing or malformed. Prevents silent misconfiguration in staging/production deployments.

### How to implement

**Create `src/config/env.ts`** (uses Zod, which is already a dependency):

```typescript
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  PORT: z.string().default("3000"),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  REDIS_URL: z.string().min(1, "REDIS_URL is required"),
  JWT_SECRET: z.string().min(32, "JWT_SECRET must be at least 32 characters"),
  JWT_REFRESH_SECRET: z
    .string()
    .min(32, "JWT_REFRESH_SECRET must be at least 32 characters"),
  JWT_EXPIRES_IN: z.string().default("15m"),
  JWT_COOKIE_EXPIRES_DAYS: z.string().default("7"),
  EMAIL_HOST: z.string().min(1, "EMAIL_HOST is required"),
  EMAIL_PORT: z.string().min(1, "EMAIL_PORT is required"),
  EMAIL_USERNAME: z.string().min(1, "EMAIL_USERNAME is required"),
  EMAIL_PASSWORD: z.string().min(1, "EMAIL_PASSWORD is required"),
  CORS_ORIGIN: z.string().optional(),
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  CLOUDINARY_CLOUD_NAME: z.string().optional(),
  CLOUDINARY_API_KEY: z.string().optional(),
  CLOUDINARY_API_SECRET: z.string().optional(),
});

const result = envSchema.safeParse(process.env);

if (!result.success) {
  console.error("\n❌ Invalid or missing environment variables:\n");
  const errors = result.error.flatten().fieldErrors;
  Object.entries(errors).forEach(([key, messages]) => {
    console.error(`  ${key}: ${messages?.join(", ")}`);
  });
  console.error("\nFix the above issues and restart the server.\n");
  process.exit(1);
}

export const env = result.data;
```

**Import it as the very first line of `src/server.ts`**, before any other import:

```typescript
import "dotenv/config";
import "./config/env"; // validates env vars — exits with a clear message if invalid

// ... rest of imports
```

After this, replace all `process.env.XXX` references with `env.XXX` from this module for full type safety throughout the codebase.

---

## 5. Request Correlation ID Middleware

### What it is

Every request currently goes through the system with no unique identifier. When you look at production logs and see `"Fetching product..."`, `"Redis connected"`, `"Order created"` — there's no way to know which log lines belong to which user's request. This makes debugging production incidents very slow.

A **correlation ID** is a UUID generated per request and attached to every log entry for that request's lifetime, surviving async boundaries.

### What it improves

In production, you can search `requestId: "abc-123"` in your log aggregator and see the full timeline of a single request — what the user called, what DB queries ran, what failed.

### How to implement

No new packages — Node's built-in `async_hooks` module is used.

**Create `src/middleware/requestId.ts`:**

```typescript
import { Request, Response, NextFunction } from "express";
import { AsyncLocalStorage } from "async_hooks";
import crypto from "crypto";

interface RequestContext {
  requestId: string;
  userId?: string;
}

// AsyncLocalStorage persists context across async/await boundaries
// without needing to pass it as a function parameter
export const requestContext = new AsyncLocalStorage<RequestContext>();

export const requestIdMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  // Honour an existing request ID from upstream (load balancer, API gateway)
  const requestId =
    (req.headers["x-request-id"] as string) || crypto.randomUUID();
  res.setHeader("X-Request-Id", requestId);
  requestContext.run({ requestId }, next);
};
```

**Update `src/config/logger.ts` to inject the request ID into every log entry:**

```typescript
import winston from "winston";
import { requestContext } from "../middleware/requestId";

const injectRequestId = winston.format((info) => {
  const ctx = requestContext.getStore();
  if (ctx?.requestId) info.requestId = ctx.requestId;
  if (ctx?.userId) info.userId = ctx.userId;
  return info;
});

const logger = winston.createLogger({
  format: winston.format.combine(
    injectRequestId(),
    winston.format.timestamp(),
    winston.format.json(),
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: "logs/error.log", level: "error" }),
    new winston.transports.File({ filename: "logs/combined.log" }),
  ],
});

export default logger;
```

**Mount in `src/app.ts` as the very first middleware:**

```typescript
import { requestIdMiddleware } from "./middleware/requestId";
app.use(requestIdMiddleware); // must be first
```

**Optionally, set userId on the context inside `Protect`** so authenticated request logs include the user:

```typescript
// Inside Protect middleware, after setting req.user:
const ctx = requestContext.getStore();
if (ctx) ctx.userId = currentUser.id;
```

---

## 6. Response Compression

### What it is

API responses are sent as raw, uncompressed JSON. Product listing responses with pagination, images arrays, and category objects can be several KB each. HTTP compression (gzip) can reduce response sizes by 60–80%.

### What it improves

Faster responses on slow connections, lower egress bandwidth costs, better Lighthouse/performance scores for the frontend.

### How to implement

```
npm install compression
npm install @types/compression --save-dev
```

**In `src/app.ts`**, add before routes but after `helmet`:

```typescript
import compression from "compression";

app.use(
  compression({
    // Only compress responses larger than 1KB — small responses cost more to compress than to send raw
    threshold: 1024,
    filter: (req, res) => {
      // Allow clients to opt out (useful for streaming responses)
      if (req.headers["x-no-compression"]) return false;
      return compression.filter(req, res);
    },
  }),
);
```

No other changes needed — compression is transparent to your controllers.

---

## 7. Async Email Queue with BullMQ

### What it is

Every email (verification, password reset) is sent synchronously inside the request handler. If your SMTP server is slow or temporarily down, the user's HTTP request hangs until the email call times out. This is a hidden single point of failure.

**BullMQ** is a Redis-backed job queue. Emails are pushed to a queue instantly, the HTTP request returns, and a background worker processes them asynchronously. Redis is already running in your project.

### What it improves

- Email delivery failures no longer cause HTTP request failures.
- Failed email jobs are automatically retried with exponential backoff.
- You get a queue dashboard to monitor pending/failed jobs.

### How to implement

```
npm install bullmq
```

**Create `src/jobs/emailQueue.ts`:**

```typescript
import { Queue, Worker, Job } from "bullmq";
import sendMail from "../utils/email";
import logger from "../config/logger";

// BullMQ needs an ioredis-compatible connection config, not the node-redis client
// Parse REDIS_URL into host/port/password components
const parseRedisUrl = (url: string) => {
  const parsed = new URL(url);
  return {
    host: parsed.hostname,
    port: Number(parsed.port) || 6379,
    password: parsed.password || undefined,
    tls: parsed.protocol === "rediss:" ? {} : undefined,
  };
};

const connection = parseRedisUrl(
  process.env.REDIS_URL || "redis://localhost:6379",
);

interface EmailJob {
  email: string;
  subject: string;
  message?: string;
  template?: string;
  templateData?: Record<string, unknown>;
}

export const emailQueue = new Queue<EmailJob>("emails", {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: "exponential", delay: 5000 }, // 5s, 10s, 20s retries
    removeOnComplete: 100, // keep last 100 completed jobs for inspection
    removeOnFail: 500,
  },
});

// Worker — processes jobs from the queue
const emailWorker = new Worker<EmailJob>(
  "emails",
  async (job: Job<EmailJob>) => {
    await sendMail(job.data);
    logger.info("Email job completed", { jobId: job.id, to: job.data.email });
  },
  { connection, concurrency: 5 },
);

emailWorker.on("failed", (job, err) => {
  logger.error("Email job failed", {
    jobId: job?.id,
    to: job?.data.email,
    attempt: job?.attemptsMade,
    error: err.message,
  });
});

emailWorker.on("error", (err) => {
  logger.error("Email worker error", { error: err.message });
});
```

**Start the worker in `src/server.ts`:**

```typescript
import "./jobs/emailQueue"; // registers and starts the worker
```

**Replace all `await sendMail(...)` calls with queue pushes:**

```typescript
import { emailQueue } from "../jobs/emailQueue";

// Before: await sendMail({ email, subject, message })
// After:
await emailQueue.add("send-email", { email, subject, message });
```

The `add` call is near-instant (a Redis write) — no more waiting for SMTP inside request handlers.

---

## 8. HTML Email Templates

### What it is

All emails are plain text strings constructed inline. Professional transactional emails use HTML with branding, styled buttons, and clear calls to action. They also score better with spam filters than plain text.

### What it improves

User trust, brand recognition, and email deliverability.

### How to implement

```
npm install handlebars
```

**Create email templates in `src/emails/templates/`:**

`src/emails/templates/verifyEmail.hbs`:

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Verify your email</title>
  </head>
  <body
    style="margin:0; padding:0; background:#f4f4f4; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;"
  >
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td align="center" style="padding: 40px 0;">
          <table
            width="600"
            cellpadding="0"
            cellspacing="0"
            style="background:#fff; border-radius:8px; overflow:hidden;"
          >
            <tr>
              <td style="background:#000; padding:24px 32px;">
                <h1 style="color:#fff; margin:0; font-size:24px;">Northline</h1>
              </td>
            </tr>
            <tr>
              <td style="padding:32px;">
                <h2 style="color:#111; margin:0 0 16px;">Welcome, {{name}}!</h2>
                <p style="color:#555; line-height:1.6;">
                  Please verify your email address to activate your account.
                </p>
                <a
                  href="{{verifyURL}}"
                  style="display:inline-block; margin:24px 0; padding:14px 28px; background:#000; color:#fff; text-decoration:none; border-radius:6px; font-weight:600;"
                >
                  Verify Email Address
                </a>
                <p style="color:#999; font-size:13px;">
                  This link expires in 24 hours. If you didn't create an
                  account, ignore this email.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
```

`src/emails/templates/resetPassword.hbs`:

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>Reset your password</title>
  </head>
  <body
    style="margin:0; padding:0; background:#f4f4f4; font-family: -apple-system, sans-serif;"
  >
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td align="center" style="padding:40px 0;">
          <table
            width="600"
            cellpadding="0"
            cellspacing="0"
            style="background:#fff; border-radius:8px;"
          >
            <tr>
              <td style="background:#000; padding:24px 32px;">
                <h1 style="color:#fff; margin:0; font-size:24px;">Northline</h1>
              </td>
            </tr>
            <tr>
              <td style="padding:32px;">
                <h2 style="color:#111; margin:0 0 16px;">
                  Reset your password
                </h2>
                <p style="color:#555; line-height:1.6;">
                  You requested a password reset. Click the button below. This
                  link expires in 10 minutes.
                </p>
                <a
                  href="{{resetURL}}"
                  style="display:inline-block; margin:24px 0; padding:14px 28px; background:#000; color:#fff; text-decoration:none; border-radius:6px; font-weight:600;"
                >
                  Reset Password
                </a>
                <p style="color:#999; font-size:13px;">
                  If you didn't request this, you can safely ignore this email.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
```

**Update `src/utils/email.ts` to support templates:**

```typescript
import nodemailer from "nodemailer";
import fs from "fs";
import path from "path";
import Handlebars from "handlebars";
import logger from "../config/logger";

interface EmailOptions {
  email: string;
  subject: string;
  message?: string; // plain text fallback
  template?: string; // template filename without .hbs
  templateData?: Record<string, unknown>;
}

const compileTemplate = (
  templateName: string,
  data: Record<string, unknown>,
): string => {
  const templatePath = path.join(
    __dirname,
    "../emails/templates",
    `${templateName}.hbs`,
  );
  const source = fs.readFileSync(templatePath, "utf8");
  return Handlebars.compile(source)(data);
};

const sendMail = async (options: EmailOptions): Promise<void> => {
  const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: Number(process.env.EMAIL_PORT),
    auth: {
      user: process.env.EMAIL_USERNAME,
      pass: process.env.EMAIL_PASSWORD,
    },
  });

  const html = options.template
    ? compileTemplate(options.template, options.templateData ?? {})
    : undefined;

  await transporter.sendMail({
    from: '"Northline" <noreply@northline.com>',
    to: options.email,
    subject: options.subject,
    text: options.message ?? "",
    html,
  });

  logger.info(`Email sent to ${options.email}`);
};

export default sendMail;
```

**Update queue calls to pass template data:**

```typescript
// Verification email
await emailQueue.add("send-email", {
  email: newUser.email,
  subject: "Verify your email address",
  template: "verifyEmail",
  templateData: { name: newUser.name, verifyURL },
});

// Password reset email
await emailQueue.add("send-email", {
  email: user.email,
  subject: "Your password reset link (valid for 10 minutes)",
  template: "resetPassword",
  templateData: { resetURL },
});
```

---

## 9. Stripe Payment Integration

### What it is

Orders are created as `PENDING` with no actual payment step — a user can create an order and receive stock decrements without any money changing hands. Production ecommerce requires a real payment gateway before an order is confirmed.

### What it improves

Ties revenue to order creation. Payment is confirmed by Stripe's webhook before stock is decremented or the order is persisted.

### How to implement

```
npm install stripe
```

**Add to `.env`:**

```
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

**New two-step checkout flow:**

**Step 1 — User creates a Payment Intent (gets a `clientSecret` back):**

Create `src/controller/paymentController.ts`:

```typescript
import Stripe from "stripe";
import { Request, Response, NextFunction } from "express";
import { prisma } from "../config/database";
import catchAsync from "../utils/catchAsync";
import AppError from "../utils/AppError";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
});

export const createPaymentIntent = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const userId = req.user!.id;

    const cart = await prisma.cart.findUnique({
      where: { userId },
      include: { items: { include: { product: true } } },
    });

    if (!cart || cart.items.length === 0)
      return next(new AppError("Your cart is empty", 400));

    // Validate stock before creating payment intent
    for (const item of cart.items) {
      if (item.product.stock < item.quantity) {
        return next(
          new AppError(
            `Insufficient stock for "${item.product.name}". Available: ${item.product.stock}`,
            400,
          ),
        );
      }
    }

    const total = cart.items.reduce(
      (sum, item) => sum + item.product.price * item.quantity,
      0,
    );

    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(total * 100), // Stripe uses the smallest currency unit (cents)
      currency: "usd",
      metadata: { userId },
      automatic_payment_methods: { enabled: true },
    });

    res.status(200).json({
      status: "success",
      data: {
        clientSecret: paymentIntent.client_secret,
        total,
      },
    });
  },
);
```

**Step 2 — Stripe webhook confirms payment and creates the order:**

The webhook must receive the raw request body (not parsed JSON) for signature verification. Mount it **before** `express.json()` in `app.ts`.

```typescript
// In paymentController.ts — add webhook handler

// Helper: create order from cart (extracted from checkoutFromCart)
const fulfillCartOrder = async (userId: string) => {
  return prisma.$transaction(async (tx) => {
    const cart = await tx.cart.findUnique({
      where: { userId },
      include: { items: { include: { product: true } } },
    });

    if (!cart || cart.items.length === 0) return null;

    let calculatedTotal = 0;
    const orderItemsData: {
      product_id: string;
      quantity: number;
      price: number;
    }[] = [];

    for (const item of cart.items) {
      if (item.product.stock < item.quantity)
        throw new Error(`Insufficient stock for "${item.product.name}"`);

      await tx.products.update({
        where: { product_id: item.product_id },
        data: { stock: { decrement: item.quantity } },
      });

      calculatedTotal += item.product.price * item.quantity;
      orderItemsData.push({
        product_id: item.product_id,
        quantity: item.quantity,
        price: item.product.price,
      });
    }

    const order = await tx.order.create({
      data: {
        userId,
        total: calculatedTotal,
        status: "PAID", // payment already confirmed by Stripe
        items: { create: orderItemsData },
      },
      include: { items: true },
    });

    await tx.cartItem.deleteMany({ where: { cartId: cart.id } });

    return order;
  });
};

export const stripeWebhook = async (req: Request, res: Response) => {
  const sig = req.headers["stripe-signature"] as string;
  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body, // must be raw Buffer — see app.ts setup below
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!,
    );
  } catch {
    return res.status(400).send("Webhook signature verification failed");
  }

  if (event.type === "payment_intent.succeeded") {
    const intent = event.data.object as Stripe.PaymentIntent;
    const userId = intent.metadata.userId;

    try {
      await fulfillCartOrder(userId);
      logger.info(`Order fulfilled for user ${userId} via Stripe webhook`);
    } catch (err) {
      logger.error("Order fulfillment failed after payment", {
        userId,
        error: err,
      });
      // Do NOT return 4xx — Stripe will retry. Handle failed fulfillment separately.
    }
  }

  res.status(200).json({ received: true });
};
```

**In `app.ts` — mount the webhook route BEFORE `express.json()`:**

```typescript
import { stripeWebhook } from "./controller/paymentController";

// Webhook must receive raw body for signature verification
app.post(
  "/api/v1/webhooks/stripe",
  express.raw({ type: "application/json" }),
  stripeWebhook,
);

// THEN the standard JSON middleware
app.use(express.json({ limit: "10mb" }));
```

**Mount the payment intent route:**

```typescript
// In a new paymentRoutes.ts, protected route
router.post("/create-payment-intent", Protect, createPaymentIntent);
app.use("/api/v1/payments", paymentRoutes);
```

---

## 10. Missing Database Indexes on Order Table

### What it is

Your `Order` model has no `@@index` declarations in the Prisma schema. The `Products` model has well-defined indexes, but `Order` and `OrderItem` do not. Every call to `getMyOrder` (filters by `userId`), `getAllOrders` (filters by `status`, sorted by `createdAt`), and order detail lookups does a full sequential table scan.

### What it improves

Queries that are instant at 100 orders become multi-second at 100,000 orders. Adding indexes is the single highest-leverage performance improvement for any table that grows over time.

### How to implement

**Update the Prisma schema (`backend/prisma/schema.prisma`):**

```prisma
model Order {
  // ... all existing fields unchanged ...

  @@index([userId])
  @@index([status])
  @@index([createdAt(sort: Desc)])
  @@index([userId, status])                   // for "my orders filtered by status"
  @@index([userId, createdAt(sort: Desc)])    // for "my orders sorted newest first"
}

model OrderItem {
  // ... all existing fields unchanged ...

  @@index([orderId])
  @@index([product_id])
}
```

**Run the migration:**

```
npx prisma migrate dev --name add_order_orderitem_indexes
```

---

## 11. Improved Health Check Endpoint

### What it is

The current `/api/v1/health` returns `{ status: "ok" }` unconditionally — it doesn't verify that the database or Redis are actually reachable. Load balancers, Kubernetes liveness probes, and monitoring tools use this endpoint to decide whether to route traffic to an instance. If your DB connection pool is exhausted but the health check returns 200, traffic keeps routing to a broken server.

### What it improves

Load balancers stop routing to unhealthy instances. Monitoring alerts trigger on real dependency failures rather than on process crash alone.

### How to implement

**Replace the existing health check in `app.ts`:**

```typescript
import { prisma } from "./config/database";
import { client as redis } from "./config/redis";

app.get("/api/v1/health", async (_req, res) => {
  const checks = {
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
    database: "unknown" as "ok" | "error",
    redis: "unknown" as "ok" | "error",
  };

  // Test actual connectivity — don't just check if the client object exists
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
```

> The `prisma.$queryRaw\`SELECT 1\`` here is a 1-byte connectivity ping — not a data query. It is the standard way to test a database connection with Prisma and has no Prisma-API equivalent.

---

## 12. Full-Text Product Search

### What it is

Product search currently uses Prisma's `contains` with `mode: 'insensitive'`, which maps to `ILIKE '%term%'`. This does a full table scan on every search, ignores word stemming (searching "shoes" won't match "shoe"), and returns results with no relevance ranking.

PostgreSQL has built-in full-text search using `tsvector` columns with GIN indexes, which are dramatically faster and support relevance ranking.

### What it improves

Fast, relevant search that scales with the product catalog. Searching "running shoe" can match "shoes for running" even when word order differs.

### Why `prisma.$queryRaw` is needed here

Prisma's query builder has no support for PostgreSQL's `@@` (text search match) operator or `ts_rank` function. The raw query is the only way to use native PostgreSQL FTS. This is a well-known Prisma limitation for advanced PostgreSQL features.

### How to implement

**Step 1 — Create a Prisma migration to add the `tsvector` column and trigger:**

Create a new migration file manually (e.g., `prisma/migrations/YYYYMMDD_add_product_fts/migration.sql`):

```sql
-- Add the search vector column
ALTER TABLE "Products" ADD COLUMN IF NOT EXISTS search_vector tsvector;

-- Populate it for all existing rows
UPDATE "Products"
SET search_vector = to_tsvector(
  'english',
  coalesce(name, '') || ' ' || coalesce(description, '') || ' ' || coalesce(brand, '')
);

-- Create a GIN index for fast FTS queries
CREATE INDEX IF NOT EXISTS products_fts_idx ON "Products" USING GIN (search_vector);

-- Auto-update the search vector whenever name/description/brand changes
CREATE OR REPLACE FUNCTION update_product_search_vector()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector := to_tsvector(
    'english',
    coalesce(NEW.name, '') || ' ' ||
    coalesce(NEW.description, '') || ' ' ||
    coalesce(NEW.brand, '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER product_search_vector_update
BEFORE INSERT OR UPDATE OF name, description, brand ON "Products"
FOR EACH ROW EXECUTE FUNCTION update_product_search_vector();
```

**Step 2 — Add a dedicated search endpoint in `productController.ts`:**

```typescript
// GET /api/v1/products/search?q=running+shoes&limit=20&page=1
export const searchProducts = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const query = typeof req.query.q === "string" ? req.query.q.trim() : "";
    if (!query) return next(new AppError("Search query (q) is required", 400));

    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 20));
    const offset = (page - 1) * limit;

    // prisma.$queryRaw is used here because Prisma has no support for the PostgreSQL
    // tsvector @@ tsquery operator or ts_rank. This is unavoidable for native FTS.
    const results = await prisma.$queryRaw<
      Array<{
        product_id: string;
        name: string;
        price: number;
        image: string | null;
        brand: string | null;
        rating: number | null;
        rank: number;
      }>
    >`
      SELECT
        product_id,
        name,
        price,
        image,
        brand,
        rating,
        ts_rank(search_vector, plainto_tsquery('english', ${query})) AS rank
      FROM "Products"
      WHERE search_vector @@ plainto_tsquery('english', ${query})
      ORDER BY rank DESC
      LIMIT ${limit} OFFSET ${offset}
    `;

    const countResult = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*) as count
      FROM "Products"
      WHERE search_vector @@ plainto_tsquery('english', ${query})
    `;

    const total = Number(countResult[0]?.count ?? 0);

    res.status(200).json({
      status: "success",
      results: results.length,
      data: { products: results },
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1,
      },
    });
  },
);
```

**Mount in product routes:**

```typescript
// productRoutes.ts — add before /:id routes to avoid conflict
router.get("/search", searchProducts);
```

---

## 13. Order Status Email Notifications

### What it is

When an admin updates an order from `PROCESSING` to `SHIPPED`, the customer gets no notification. They have to manually check the app to know if their order shipped.

### What it improves

Standard ecommerce UX. Customers are informed at each key milestone automatically.

### How to implement

**Create `src/emails/templates/orderStatus.hbs`:**

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>Order Update</title>
  </head>
  <body
    style="margin:0; padding:0; background:#f4f4f4; font-family: -apple-system, sans-serif;"
  >
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td align="center" style="padding:40px 0;">
          <table
            width="600"
            cellpadding="0"
            cellspacing="0"
            style="background:#fff; border-radius:8px;"
          >
            <tr>
              <td style="background:#000; padding:24px 32px;">
                <h1 style="color:#fff; margin:0; font-size:24px;">Northline</h1>
              </td>
            </tr>
            <tr>
              <td style="padding:32px;">
                <h2 style="color:#111; margin:0 0 16px;">
                  Order Update, {{name}}
                </h2>
                <p style="color:#555; line-height:1.6;">
                  Your order <strong>#{{orderId}}</strong> status has been
                  updated to:
                </p>
                <p
                  style="font-size:20px; font-weight:700; color:#000; margin:16px 0;"
                >
                  {{statusLabel}}
                </p>
                <p style="color:#555; line-height:1.6;">{{statusMessage}}</p>
                <p style="color:#999; font-size:13px; margin-top:32px;">
                  Log in to your account to view full order details.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
```

**Update `updateOrder` in `orderController.ts`:**

```typescript
import { emailQueue } from "../jobs/emailQueue";
import { OrderStatus } from "@prisma/client";

const ORDER_STATUS_COPY: Partial<
  Record<OrderStatus, { label: string; message: string }>
> = {
  PAID: {
    label: "Payment Confirmed",
    message: "We have received your payment and your order is now confirmed.",
  },
  PROCESSING: {
    label: "Processing",
    message: "Your order is being prepared and will ship soon.",
  },
  SHIPPED: {
    label: "Shipped",
    message:
      "Your order is on its way. You will receive it within the estimated delivery window.",
  },
  DELIVERED: {
    label: "Delivered",
    message: "Your order has been delivered. We hope you enjoy your purchase!",
  },
  CANCELLED: {
    label: "Cancelled",
    message:
      "Your order has been cancelled. If you have questions, please contact support.",
  },
};

export const updateOrder = catchAsync(
  async (req: Request, res: Response, _next: NextFunction) => {
    const { status } = req.body;

    const order = await prisma.order.update({
      where: { id: req.params.id },
      data: { status },
      include: {
        user: { select: { email: true, name: true } },
      },
    });

    const copy = ORDER_STATUS_COPY[status as OrderStatus];
    if (copy) {
      await emailQueue.add("send-email", {
        email: order.user.email,
        subject: `Your Northline order has been ${copy.label.toLowerCase()}`,
        template: "orderStatus",
        templateData: {
          name: order.user.name,
          orderId: order.id.slice(0, 8).toUpperCase(),
          statusLabel: copy.label,
          statusMessage: copy.message,
        },
      });
    }

    logger.info(`Order ${order.id} status updated to ${status}`);
    res.status(200).json({
      status: "success",
      message: "Order status updated successfully",
      data: { order },
    });
  },
);
```

---

## 14. Admin Audit Log

### What it is

Admin actions (deleting products, updating order status, modifying users) are written to Winston log files but not to the database. You have no structured, queryable record of who did what and when. If an admin makes a mistake or acts maliciously, there's no audit trail.

### What it improves

Compliance, accountability, and the ability to reconstruct what happened and who was responsible.

### How to implement

**Step 1 — Add a Prisma model:**

```prisma
model AuditLog {
  id         String   @id @default(uuid())
  adminId    String
  action     String       // e.g. "UPDATE_ORDER_STATUS", "DELETE_PRODUCT"
  entityType String       // e.g. "Order", "Product", "User"
  entityId   String
  before     Json?        // state before the change
  after      Json?        // state after the change
  ip         String?
  createdAt  DateTime @default(now())

  @@index([adminId])
  @@index([entityType, entityId])
  @@index([createdAt(sort: Desc)])
}
```

Run: `npx prisma migrate dev --name add_audit_log`

**Step 2 — Create `src/utils/audit.ts`:**

```typescript
import { Request } from "express";
import { prisma } from "../config/database";
import logger from "../config/logger";

interface AuditParams {
  req: Request;
  action: string;
  entityType: string;
  entityId: string;
  before?: unknown;
  after?: unknown;
}

export const logAudit = async (params: AuditParams): Promise<void> => {
  try {
    await prisma.auditLog.create({
      data: {
        adminId: params.req.user!.id,
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId,
        before: (params.before as any) ?? undefined,
        after: (params.after as any) ?? undefined,
        ip: params.req.ip,
      },
    });
  } catch (err) {
    // Audit log failure should never crash the main operation
    logger.error("Failed to write audit log", { error: err, ...params });
  }
};
```

**Step 3 — Use it in admin controllers:**

```typescript
// In deleteProduct:
const existingProduct = await prisma.products.findUnique({
  where: { product_id: productId },
});
await prisma.products.delete({ where: { product_id: productId } });
await logAudit({
  req,
  action: "DELETE_PRODUCT",
  entityType: "Product",
  entityId: productId,
  before: existingProduct,
});

// In updateOrder:
const before = await prisma.order.findUnique({ where: { id: req.params.id } });
const order = await prisma.order.update({
  where: { id: req.params.id },
  data: { status },
});
await logAudit({
  req,
  action: "UPDATE_ORDER_STATUS",
  entityType: "Order",
  entityId: order.id,
  before: { status: before?.status },
  after: { status: order.status },
});
```

**Step 4 — Add a query endpoint for admins:**

```typescript
// controller/adminController.ts
export const getAuditLogs = catchAsync(async (req: Request, res: Response) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = 50;
  const skip = (page - 1) * limit;

  const where = {
    ...(req.query.adminId ? { adminId: req.query.adminId as string } : {}),
    ...(req.query.entityType
      ? { entityType: req.query.entityType as string }
      : {}),
    ...(req.query.action ? { action: req.query.action as string } : {}),
  };

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
    }),
    prisma.auditLog.count({ where }),
  ]);

  res.status(200).json({
    status: "success",
    data: { logs },
    total,
    page,
    totalPages: Math.ceil(total / limit),
  });
});
```

Mount at `GET /api/v1/admin/audit-logs`.

---

## 15. XSS Input Sanitization

### What it is

Zod validates structure (is this a string? max length?) but does not strip HTML or script tags from content. A user could submit `<script>alert(document.cookie)</script>` as a review comment. It gets stored in your database and served back to other users' browsers — a stored XSS attack.

### What it improves

Prevents stored XSS across all user-supplied text fields.

### How to implement

```
npm install xss
```

**Create `src/utils/sanitize.ts`:**

```typescript
import xss from "xss";
import { z } from "zod";

// Wraps any Zod string schema with an XSS sanitization transform
// Usage: sanitizedString(z.string().max(2000))
export const sanitizedString = (schema: z.ZodString) =>
  schema.transform((val) =>
    xss(val, {
      whiteList: {}, // allow NO HTML tags
      stripIgnoreTag: true, // strip disallowed tags (don't escape them)
      stripIgnoreTagBody: ["script", "style"], // remove script/style content entirely
    }),
  );
```

**Apply to all free-text user input fields in your schemas:**

```typescript
// Schema/reviewsSchema.ts
import { sanitizedString } from "../utils/sanitize";

export const createReviewSchema = z.object({
  product_id: z.string().uuid(),
  rating: z.number().min(1).max(5),
  content: sanitizedString(z.string().max(2000)).optional(),
});

// Schema/userSchema.ts — apply to name field on update
export const updateUserSchema = z.object({
  name: sanitizedString(z.string().min(1).max(100)).optional(),
  phoneNumber: z.string().optional(),
});
```

Apply `sanitizedString` to any field where a user can type arbitrary text: review content, product descriptions (admin input), user names, addresses.

---

## 16. Cloud Image Storage

### What it is

Product images are uploaded to the local `/public` directory via Multer. Any PaaS deployment (Railway, Render, Fly.io, Heroku) runs ephemeral containers — the filesystem is wiped on every redeploy. All uploaded images are permanently lost on each deployment.

### What it improves

Images survive deployments. They're served via CDN (fast globally). Your Node server stops serving static files (removes unnecessary load).

### How to implement

```
npm install cloudinary multer-storage-cloudinary
npm install @types/multer-storage-cloudinary --save-dev
```

**Add to `.env`:**

```
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

**Rewrite `src/middleware/uploadMiddleware.ts`:**

```typescript
import { v2 as cloudinary } from "cloudinary";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import multer from "multer";
import { Request, Response, NextFunction } from "express";
import AppError from "../utils/AppError";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const storage = new CloudinaryStorage({
  cloudinary,
  params: async (_req, _file) => ({
    folder: "northline/products",
    format: "webp", // auto-convert all uploads to WebP
    transformation: [
      { width: 1200, height: 1200, crop: "limit" }, // cap resolution
      { quality: "auto:good" }, // Cloudinary auto quality optimisation
    ],
    public_id: `product-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
  }),
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB per file
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype.startsWith("image/")) {
      return cb(new Error("Only image files are allowed"));
    }
    cb(null, true);
  },
});

export const uploadProductImagesMiddleware = upload.array("images", 10);

// Attach uploaded Cloudinary URLs to req for use in controllers
export const processUploadedImages = (
  req: Request,
  _res: Response,
  next: NextFunction,
) => {
  const files = req.files as Express.Multer.File[];
  if (files?.length) {
    // Cloudinary storage puts the CDN URL in file.path
    (req as any).uploadedProductImages = files.map((f) => f.path);
  }
  next();
};
```

The URLs stored in the database are now permanent Cloudinary CDN URLs like `https://res.cloudinary.com/your-cloud/image/upload/...`.

---

## 17. Cursor-Based Pagination

### What it is

Offset pagination (`skip: (page - 1) * limit`) requires PostgreSQL to scan and discard all rows up to the offset. Page 1 with limit 20 scans 20 rows. Page 500 with limit 20 scans 10,000 rows just to skip them. This gets proportionally slower as data grows.

**Cursor-based pagination** uses the last item's ID as a bookmark. Each query says "give me 20 items after this specific item" — PostgreSQL uses the primary key index and is equally fast at any depth.

### What it improves

Consistent query performance regardless of how deep into the product catalog the user navigates.

### How to implement

**Add a cursor endpoint alongside the existing offset endpoint in `productController.ts`:**

```typescript
// GET /api/v1/products/feed?cursor=<product_id>&limit=20
export const getProductsFeed = catchAsync(
  async (req: Request, res: Response, _next: NextFunction) => {
    const cursor =
      typeof req.query.cursor === "string" ? req.query.cursor : undefined;
    const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 20));

    // Fetch one extra item to determine if there's a next page
    const products = await prisma.products.findMany({
      take: limit + 1,
      ...(cursor
        ? {
            cursor: { product_id: cursor },
            skip: 1, // skip the cursor item itself
          }
        : {}),
      orderBy: { createdAt: "desc" },
      select: {
        product_id: true,
        name: true,
        price: true,
        image: true,
        brand: true,
        rating: true,
        availability: true,
        discount: true,
        category: { select: { category_id: true, name: true } },
      },
    });

    const hasNextPage = products.length > limit;
    if (hasNextPage) products.pop(); // remove the extra item used for lookahead

    res.status(200).json({
      status: "success",
      results: products.length,
      data: { products },
      pagination: {
        hasNextPage,
        nextCursor: hasNextPage
          ? products[products.length - 1].product_id
          : null,
      },
    });
  },
);
```

**Mount in product routes:**

```typescript
router.get("/feed", getProductsFeed); // before /:id
```

The frontend calls `/feed` without a cursor on first load, then passes `nextCursor` as `cursor` on each subsequent call to load more.

---

## 18. Swagger / OpenAPI Documentation

### What it is

There is no API documentation. Frontend developers, mobile teams, or third-party integrators have to read the source code to understand what endpoints exist, what body they expect, and what they return.

### What it improves

Every endpoint is documented, explorable via a browser UI, and testable without writing any code. Documentation stays in sync with your Zod schemas.

### How to implement

```
npm install @asteasolutions/zod-to-openapi swagger-ui-express
npm install @types/swagger-ui-express --save-dev
```

**Create `src/docs/openapi.ts`:**

```typescript
import {
  OpenAPIRegistry,
  OpenApiGeneratorV3,
  extendZodWithOpenApi,
} from "@asteasolutions/zod-to-openapi";
import { z } from "zod";
import { loginSchema, signupSchema } from "../Schema/userSchema";

extendZodWithOpenApi(z);

export const registry = new OpenAPIRegistry();

// Register reusable schemas
registry.register("LoginBody", loginSchema);
registry.register("SignupBody", signupSchema);

// Register paths
registry.registerPath({
  method: "post",
  path: "/users/login",
  summary: "Login a user",
  tags: ["Auth"],
  request: {
    body: {
      content: { "application/json": { schema: loginSchema } },
    },
  },
  responses: {
    200: {
      description: "Login successful — returns JWT token and user object",
    },
    400: { description: "Validation error" },
    401: { description: "Incorrect email or password" },
  },
});

registry.registerPath({
  method: "get",
  path: "/products",
  summary: "Get all products with filtering, sorting, and pagination",
  tags: ["Products"],
  request: {
    query: z.object({
      page: z.number().optional(),
      limit: z.number().optional(),
      search: z.string().optional(),
      category: z.string().optional(),
      minPrice: z.number().optional(),
      maxPrice: z.number().optional(),
      sortBy: z.string().optional(),
    }),
  },
  responses: {
    200: { description: "Paginated product list" },
  },
});

// Add remaining routes following the same pattern ...

export const generateOpenApiSpec = () => {
  const generator = new OpenApiGeneratorV3(registry.definitions);
  return generator.generateDocument({
    openapi: "3.0.0",
    info: {
      title: "Northline API",
      version: "1.0.0",
      description: "Northline ecommerce backend API",
    },
    servers: [
      { url: "http://localhost:3000/api/v1", description: "Development" },
      {
        url: "https://your-production-domain.com/api/v1",
        description: "Production",
      },
    ],
  });
};
```

**Mount in `app.ts`:**

```typescript
import swaggerUi from "swagger-ui-express";
import { generateOpenApiSpec } from "./docs/openapi";

// Only expose in development — or protect with admin auth in production
if (process.env.NODE_ENV !== "production") {
  app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(generateOpenApiSpec()));
}
```

The UI is then accessible at `http://localhost:3000/api-docs`.

---

## 19. Admin Analytics Endpoints

### What it is

There are no analytics endpoints. Admins cannot see total revenue, order volume, top-selling products, or user growth without querying the database directly.

### What it improves

Data-driven decisions — see what's selling, identify revenue trends, track user growth.

### Why `prisma.$queryRaw` is used for revenue-by-day

Prisma's `groupBy` supports grouping by exact field values but does **not** support `DATE_TRUNC` (truncating a timestamp to day/week/month boundaries). This is a known Prisma limitation. The daily revenue bucketing uses `$queryRaw` only for this reason. All other queries use the standard Prisma API.

### How to implement

**Create `src/controller/adminAnalyticsController.ts`:**

```typescript
import { Request, Response } from "express";
import { prisma } from "../config/database";
import catchAsync from "../utils/catchAsync";
import logger from "../config/logger";

const PAID_STATUSES = ["PAID", "PROCESSING", "SHIPPED", "DELIVERED"] as const;

export const getDashboardStats = catchAsync(
  async (_req: Request, res: Response) => {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const [
      revenueResult,
      totalOrders,
      totalUsers,
      totalProducts,
      recentOrders,
      topProducts,
      revenueByDay,
    ] = await Promise.all([
      // Total revenue — Prisma aggregate
      prisma.order.aggregate({
        _sum: { total: true },
        where: { status: { in: PAID_STATUSES } },
      }),

      // Total orders — Prisma count
      prisma.order.count(),

      // Total users — Prisma count
      prisma.user.count(),

      // Total products — Prisma count
      prisma.products.count(),

      // Orders in the last 30 days — Prisma findMany
      prisma.order.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),

      // Top 5 products by units sold — Prisma groupBy (no raw SQL needed)
      prisma.orderItem.groupBy({
        by: ["product_id"],
        _sum: { quantity: true },
        orderBy: { _sum: { quantity: "desc" } },
        take: 5,
        where: {
          order: { status: { in: PAID_STATUSES } },
        },
      }),

      // Revenue per day for last 30 days — requires prisma.$queryRaw
      // Reason: Prisma groupBy does not support DATE_TRUNC for time-bucketing.
      // This is the only raw SQL in this controller.
      prisma.$queryRaw<Array<{ date: string; revenue: number }>>`
      SELECT
        TO_CHAR(DATE_TRUNC('day', "createdAt"), 'YYYY-MM-DD') AS date,
        SUM(total)::float AS revenue
      FROM "Order"
      WHERE "createdAt" >= ${thirtyDaysAgo}
        AND status = ANY(ARRAY['PAID','PROCESSING','SHIPPED','DELIVERED'])
      GROUP BY DATE_TRUNC('day', "createdAt")
      ORDER BY DATE_TRUNC('day', "createdAt") ASC
    `,
    ]);

    // Enrich top products with names using a single Prisma query
    const productIds = topProducts.map((p) => p.product_id);
    const productNames = await prisma.products.findMany({
      where: { product_id: { in: productIds } },
      select: { product_id: true, name: true, image: true },
    });
    const nameMap = new Map(productNames.map((p) => [p.product_id, p]));

    const enrichedTopProducts = topProducts.map((p) => ({
      ...nameMap.get(p.product_id),
      unitsSold: p._sum.quantity ?? 0,
    }));

    logger.info("Admin fetched dashboard analytics");
    res.status(200).json({
      status: "success",
      data: {
        totals: {
          revenue: revenueResult._sum.total ?? 0,
          orders: totalOrders,
          recentOrders,
          users: totalUsers,
          products: totalProducts,
        },
        revenueByDay,
        topProducts: enrichedTopProducts,
      },
    });
  },
);
```

**Mount in admin routes:**

```typescript
router.get(
  "/analytics/dashboard",
  Protect,
  restrictTo("ADMIN"),
  getDashboardStats,
);
```

---

## 20. Automated Tests

### What it is

Jest is a devDependency but there are zero test files in the project. The entire backend is tested manually. There is no protection against regressions — changing the auth flow or the order controller could silently break things with no automated feedback.

### What it improves

Catch regressions on every commit before they reach production. Prove that auth, order creation, stock management, and payment flows work correctly via repeatable automated tests.

### How to implement

```
npm install --save-dev jest ts-jest @types/jest supertest @types/supertest
```

**`jest.config.ts` at the backend root:**

```typescript
import type { Config } from "jest";

const config: Config = {
  preset: "ts-jest",
  testEnvironment: "node",
  roots: ["<rootDir>/src"],
  testMatch: ["**/*.test.ts"],
  setupFilesAfterFramework: ["<rootDir>/src/test/setup.ts"],
  testTimeout: 30000,
  // Use a separate test database
  globals: {
    "ts-jest": { tsconfig: { strict: false } },
  },
};

export default config;
```

**`src/test/setup.ts` — runs before and after each test:**

```typescript
import { prisma } from "../config/database";
import { connectRedis, getClient } from "../config/redis";

beforeAll(async () => {
  await connectRedis();
});

afterEach(async () => {
  // Clean in dependency order to avoid FK violations
  await prisma.auditLog.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.cartItem.deleteMany();
  await prisma.cart.deleteMany();
  await prisma.review.deleteMany();
  await prisma.address.deleteMany();
  await prisma.user.deleteMany();
  await prisma.products.deleteMany();
  await prisma.category.deleteMany();
  await getClient().flushDb();
});

afterAll(async () => {
  await prisma.$disconnect();
  await getClient().disconnect();
});
```

**`src/test/auth.test.ts`:**

```typescript
import request from "supertest";
import app from "../app";

describe("Auth — POST /api/v1/users/signup", () => {
  it("creates a user and returns a JWT token", async () => {
    const res = await request(app)
      .post("/api/v1/users/signup")
      .send({
        name: "Test User",
        email: "test@example.com",
        password: "password123",
      });

    expect(res.status).toBe(201);
    expect(res.body.token).toBeDefined();
    expect(res.body.data.user.email).toBe("test@example.com");
    expect(res.body.data.user.password).toBeUndefined(); // password must never be exposed
  });

  it("rejects duplicate email addresses", async () => {
    const payload = {
      name: "A",
      email: "dup@example.com",
      password: "password123",
    };
    await request(app).post("/api/v1/users/signup").send(payload);
    const res = await request(app).post("/api/v1/users/signup").send(payload);

    expect(res.status).toBe(400);
  });
});

describe("Auth — POST /api/v1/users/login", () => {
  it("returns a token for valid credentials", async () => {
    await request(app)
      .post("/api/v1/users/signup")
      .send({
        name: "Login Test",
        email: "login@example.com",
        password: "password123",
      });

    const res = await request(app)
      .post("/api/v1/users/login")
      .send({ email: "login@example.com", password: "password123" });

    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
  });

  it("rejects incorrect passwords", async () => {
    await request(app)
      .post("/api/v1/users/signup")
      .send({ name: "X", email: "x@example.com", password: "correct" });

    const res = await request(app)
      .post("/api/v1/users/login")
      .send({ email: "x@example.com", password: "wrong" });

    expect(res.status).toBe(401);
  });
});
```

**`src/test/orders.test.ts`:**

```typescript
import request from "supertest";
import app from "../app";
import { prisma } from "../config/database";

const createUserAndLogin = async () => {
  await request(app)
    .post("/api/v1/users/signup")
    .send({
      name: "Order User",
      email: "order@example.com",
      password: "password123",
    });
  const res = await request(app)
    .post("/api/v1/users/login")
    .send({ email: "order@example.com", password: "password123" });
  return res.body.token as string;
};

describe("Orders", () => {
  it("creates an order and decrements stock", async () => {
    const token = await createUserAndLogin();

    const category = await prisma.category.create({
      data: { name: "Test Cat" },
    });
    const product = await prisma.products.create({
      data: {
        name: "Widget",
        price: 29.99,
        stock: 10,
        category_id: category.category_id,
      },
    });

    const res = await request(app)
      .post("/api/v1/order")
      .set("Authorization", `Bearer ${token}`)
      .send({ items: [{ product_id: product.product_id, quantity: 3 }] });

    expect(res.status).toBe(201);
    expect(res.body.data.order.items).toHaveLength(1);

    const updated = await prisma.products.findUnique({
      where: { product_id: product.product_id },
    });
    expect(updated?.stock).toBe(7); // 10 - 3
  });

  it("rejects orders with insufficient stock", async () => {
    const token = await createUserAndLogin();

    const category = await prisma.category.create({ data: { name: "Cat 2" } });
    const product = await prisma.products.create({
      data: {
        name: "Rare Item",
        price: 99.99,
        stock: 2,
        category_id: category.category_id,
      },
    });

    const res = await request(app)
      .post("/api/v1/order")
      .set("Authorization", `Bearer ${token}`)
      .send({ items: [{ product_id: product.product_id, quantity: 5 }] });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/insufficient stock/i);
  });
});
```

**Add test scripts to `package.json`:**

```json
"scripts": {
  "test": "jest",
  "test:watch": "jest --watch",
  "test:coverage": "jest --coverage"
}
```

**Add a `.env.test` file** for the test database:

```
DATABASE_URL=postgresql://user:password@localhost:5432/northline_test
REDIS_URL=redis://localhost:6379/1
JWT_SECRET=test-secret-minimum-32-characters-long
JWT_REFRESH_SECRET=test-refresh-secret-minimum-32-chars
```

---

## Quick Reference — Priority Order

| #   | Improvement                      | Priority                        | Complexity |
| --- | -------------------------------- | ------------------------------- | ---------- |
| 4   | Env var validation at startup    | Critical                        | Low        |
| 3   | Per-route rate limiting          | Critical                        | Low        |
| 1   | Refresh token rotation           | Critical                        | Medium     |
| 2   | JWT blacklist on logout          | High                            | Low        |
| 10  | Order table DB indexes           | High                            | Low        |
| 15  | XSS input sanitization           | High                            | Low        |
| 16  | Cloud image storage              | High (blocks production deploy) | Medium     |
| 9   | Stripe payment integration       | High                            | High       |
| 7   | Async email queue (BullMQ)       | Medium                          | Medium     |
| 11  | Improved health check            | Medium                          | Low        |
| 5   | Request correlation ID           | Medium                          | Low        |
| 6   | Response compression             | Medium                          | Low        |
| 13  | Order status email notifications | Medium                          | Low        |
| 14  | Admin audit log                  | Medium                          | Medium     |
| 8   | HTML email templates             | Low-Medium                      | Low        |
| 12  | Full-text product search         | Medium                          | Medium     |
| 17  | Cursor-based pagination          | Medium                          | Medium     |
| 19  | Admin analytics endpoints        | Low-Medium                      | Medium     |
| 18  | Swagger / OpenAPI docs           | Medium                          | Medium     |
| 20  | Automated tests                  | High (ongoing)                  | High       |
