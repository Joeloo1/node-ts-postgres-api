# Backend — Advanced Improvements & New Features

This document covers improvements and features **not already in** `BACKEND_IMPROVEMENTS.md`,
`PROFILE_BACKEND_CHANGES.md`, or `BACKEND_PRODUCTION_READY.md`.

Thirteen sections:
- **Part A — Code Cleanup & Architecture**: utilities that remove duplication and enforce consistency across every controller.
- **Part B — Security Hardening**: gaps not yet addressed.
- **Part C — Performance**: caching improvements and query fixes.
- **Part D — New Features**: ecommerce features that increase business value.
- **Part E — DevOps**: containerisation and CI/CD.
- **Part F — Advanced Security**: OAuth, API keys, token family tracking.
- **Part G — Advanced Business Features**: variants in cart, slugs, nested categories, gift cards, bundles, refunds, audit viewer, bulk actions.
- **Part H — Operations & Analytics**: cron housekeeping, abandoned cart, inventory log, shipping tracking, search analytics, conversion funnel.
- **Part I — Authentication & Compliance**: 2FA/TOTP, GDPR data export, account deletion.
- **Part J — Product Enrichment**: image gallery, pre-orders, product comparison, digital downloads.
- **Part K — Payments & Loyalty**: Stripe Billing subscriptions, loyalty points, referral codes.
- **Part L — Observability**: OpenAPI/Swagger docs, Prometheus metrics, OpenTelemetry tracing.
- **Part M — Infrastructure**: PgBouncer, sitemap generation, PDF invoice generation.

---

## Table of Contents

**Part A — Code Cleanup & Architecture**
1. [Centralised API Response Helper](#1-centralised-api-response-helper)
2. [Pagination Utility](#2-pagination-utility)
3. [Cache Key Registry](#3-cache-key-registry)

**Part B — Security Hardening**
4. [CSRF Token Protection](#4-csrf-token-protection)
5. [Log Sanitisation Middleware](#5-log-sanitisation-middleware)
6. [Helmet Content Security Policy for Production](#6-helmet-content-security-policy-for-production)
7. [Admin IP Allowlist](#7-admin-ip-allowlist)

**Part C — Performance**
8. [ETag Conditional Response Caching](#8-etag-conditional-response-caching)
9. [Fix N+1 Query Patterns](#9-fix-n1-query-patterns)

**Part D — New Features**
10. [Recently Viewed Products](#10-recently-viewed-products)
11. [Product Recommendations](#11-product-recommendations)
12. [Flash Sales — Scheduled Discounts](#12-flash-sales--scheduled-discounts)
13. [Low Stock Admin Alerts](#13-low-stock-admin-alerts)
14. [Bulk Product CSV Import](#14-bulk-product-csv-import)

**Part E — DevOps**
15. [Dockerfile + docker-compose](#15-dockerfile--docker-compose)
16. [GitHub Actions CI Pipeline](#16-github-actions-ci-pipeline)

**Part F — Advanced Security**
17. [Social Auth — Google & GitHub OAuth](#17-social-auth--google--github-oauth)
18. [API Key Authentication](#18-api-key-authentication)
19. [Refresh Token Family Tracking](#19-refresh-token-family-tracking)

**Part G — Advanced Business Features**
20. [Variants in Cart](#20-variants-in-cart)
21. [Order Delivery Notes](#21-order-delivery-notes)
22. [Product Slug for SEO URLs](#22-product-slug-for-seo-urls)
23. [Nested Categories](#23-nested-categories)
24. [Gift Cards](#24-gift-cards)
25. [Product Bundles](#25-product-bundles)
26. [Stripe Refund Processing on Return Approval](#26-stripe-refund-processing-on-return-approval)
27. [Admin Audit Log Viewer](#27-admin-audit-log-viewer)
28. [Admin Bulk Actions](#28-admin-bulk-actions)

**Part H — Operations & Analytics**
29. [Cron Jobs for Housekeeping](#29-cron-jobs-for-housekeeping)
30. [Abandoned Cart Recovery](#30-abandoned-cart-recovery)
31. [Inventory Movement Log](#31-inventory-movement-log)
32. [Shipping Carrier Tracking Integration](#32-shipping-carrier-tracking-integration)
33. [Search Term Analytics](#33-search-term-analytics)
34. [Conversion Funnel Tracking](#34-conversion-funnel-tracking)

**Part I — Authentication & Compliance**
35. [Two-Factor Authentication (TOTP)](#35-two-factor-authentication-totp)
36. [GDPR — User Data Export & Account Deletion](#36-gdpr--user-data-export--account-deletion)
37. [Account Deletion Cascade Cleanup](#37-account-deletion-cascade-cleanup)

**Part J — Product Enrichment**
38. [Product Image Gallery](#38-product-image-gallery)
39. [Pre-Orders](#39-pre-orders)
40. [Product Comparison Endpoint](#40-product-comparison-endpoint)
41. [Digital & Downloadable Products](#41-digital--downloadable-products)

**Part K — Payments & Loyalty**
42. [Subscription Products via Stripe Billing](#42-subscription-products-via-stripe-billing)
43. [Loyalty Points System](#43-loyalty-points-system)
44. [Referral Codes & Commission Tracking](#44-referral-codes--commission-tracking)

**Part L — Observability**
45. [OpenAPI / Swagger Documentation](#45-openapi--swagger-documentation)
46. [Prometheus Metrics Endpoint](#46-prometheus-metrics-endpoint)
47. [Distributed Tracing with OpenTelemetry](#47-distributed-tracing-with-opentelemetry)

**Part M — Infrastructure**
48. [PgBouncer Connection Pooling](#48-pgbouncer-connection-pooling)
49. [Sitemap Generation](#49-sitemap-generation)
50. [Order Invoice PDF Generation](#50-order-invoice-pdf-generation)

---

## Part A — Code Cleanup & Architecture

---

## 1. Centralised API Response Helper

### Why

Every controller manually constructs the same JSON shape:

```ts
res.status(200).json({ status: "success", data: { product } });
res.status(201).json({ status: "Success", data: { product } }); // capital S — inconsistent
res.status(200).json({ status: "success", results: orders.length, data: { orders } });
```

There is no single source of truth for the response shape. "Success" vs "success" is already
inconsistent in the codebase. A helper function enforces the shape everywhere in one line and
makes it trivial to add fields like `requestId` to every response later.

### New file — `backend/src/utils/response.ts`

```ts
import { Response } from "express";

interface SuccessOptions {
  statusCode?: number;
  message?: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export const sendSuccess = (
  res: Response,
  data: Record<string, unknown> | null,
  options: SuccessOptions = {},
): void => {
  const { statusCode = 200, message, pagination } = options;

  const body: Record<string, unknown> = { status: "success" };
  if (message)    body.message    = message;
  if (pagination) body.pagination = pagination;
  body.data = data;

  res.status(statusCode).json(body);
};

export const buildPaginationMeta = (
  page: number,
  limit: number,
  total: number,
) => ({
  page,
  limit,
  total,
  totalPages: Math.ceil(total / limit),
  hasNext: page < Math.ceil(total / limit),
  hasPrev: page > 1,
});
```

### How to use in a controller

```ts
import { sendSuccess, buildPaginationMeta } from "../utils/response";

// Before:
res.status(200).json({ status: "success", data: { product } });

// After:
sendSuccess(res, { product });

// With pagination:
sendSuccess(res, { products }, {
  pagination: buildPaginationMeta(page, limit, total),
});

// With a message and 201:
sendSuccess(res, { order }, { statusCode: 201, message: "Order placed successfully" });
```

No migration needed. Adopt incrementally — replace one controller at a time.

---

## 2. Pagination Utility

### Why

Every controller that lists resources repeats this exact block:

```ts
const page  = Math.max(1, Number(req.query.page)  || 1);
const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 20));
const skip  = (page - 1) * limit;
```

It is copy-pasted in at least `orderController`, `adminController`, `questionsController`,
`reviewsController`, and `adminAnalyticsController`. Centralising it means you change the
default limit cap in one place, not six.

### Add to `backend/src/utils/pagination.ts`

```ts
import { Request } from "express";

export interface PaginationParams {
  page:  number;
  limit: number;
  skip:  number;
}

export const getPagination = (
  query: Request["query"],
  defaults: { limit?: number; maxLimit?: number } = {},
): PaginationParams => {
  const defaultLimit = defaults.limit    ?? 20;
  const maxLimit     = defaults.maxLimit ?? 50;

  const page  = Math.max(1, Number(query.page)  || 1);
  const limit = Math.min(maxLimit, Math.max(1, Number(query.limit) || defaultLimit));
  const skip  = (page - 1) * limit;

  return { page, limit, skip };
};
```

### How to use

```ts
import { getPagination } from "../utils/pagination";

// Before (repeated in every controller):
const page  = Math.max(1, Number(req.query.page)  || 1);
const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 20));
const skip  = (page - 1) * limit;

// After:
const { page, limit, skip } = getPagination(req.query);

// With custom defaults:
const { page, limit, skip } = getPagination(req.query, { limit: 10, maxLimit: 100 });
```

---

## 3. Cache Key Registry

### Why

Cache keys are magic strings scattered across every controller file:

```ts
// productController.ts
const getProductKey     = (id: string) => `product:${id}`;
const getProductsQueryKey = ...         => `products:list:${...}`;

// reviewsController.ts
const getReviewKey      = (id: string) => `review:${id}`;
const getReviewQueryKey = ...           => `reviews:list:${...}`;

// cartController.ts — no cache at all
// wishlistController.ts
const wishlistKey = (userId: string)   => `wishlist:${userId}`;
```

If you ever need to nuke all cache for a user (e.g. account deletion), you have to hunt
through every controller. A central registry makes invalidation patterns obvious and
prevents typos in key names.

### New file — `backend/src/config/cacheKeys.ts`

```ts
export const CacheKeys = {
  // Products
  product:       (id: string)                     => `product:${id}`,
  productsList:  (query: Record<string, unknown>)  => {
    const sorted = Object.keys(query).sort().reduce<Record<string, unknown>>((a, k) => {
      a[k] = query[k]; return a;
    }, {});
    return `products:list:${JSON.stringify(sorted)}`;
  },
  productVariants: (productId: string)            => `variants:${productId}`,
  priceHistory:    (productId: string)            => `price_history:${productId}`,

  // Reviews
  review:          (id: string)                   => `review:${id}`,
  reviewsList:     (query: Record<string, unknown>) => {
    const sorted = Object.keys(query).sort().reduce<Record<string, unknown>>((a, k) => {
      a[k] = query[k]; return a;
    }, {});
    return `reviews:list:${JSON.stringify(sorted)}`;
  },

  // Questions
  questionsList: (productId: string, page: number, limit: number) =>
    `questions:${productId}:${page}:${limit}`,

  // User
  authUser:   (userId: string)  => `auth:user:${userId}`,
  wishlist:   (userId: string)  => `wishlist:${userId}`,
  recentlyViewed: (userId: string) => `recently_viewed:${userId}`,

  // Categories
  categories: ()                => `categories:all`,

  // Admin
  adminUsers: (query: Record<string, unknown>) => `admin:users:${JSON.stringify(query)}`,
} as const;

// Pattern globs for scanDel invalidation
export const CachePatterns = {
  allProducts:  "products:list:*",
  allReviews:   "reviews:list:*",
  allQuestions: (productId: string) => `questions:${productId}:*`,
} as const;
```

### How to use

```ts
import { CacheKeys, CachePatterns } from "../config/cacheKeys";
import { client as redis, scanDel } from "../config/redis";

// Instead of:
const cached = await redis.get(`product:${id}`);
await redis.del(`product:${id}`);
await scanDel("products:list:*");

// Use:
const cached = await redis.get(CacheKeys.product(id));
await redis.del(CacheKeys.product(id));
await scanDel(CachePatterns.allProducts);
```

---

## Part B — Security Hardening

---

## 4. CSRF Token Protection

### Why

Your frontend stores the JWT in `localStorage` and sends it via `Authorization: Bearer`.
This is NOT vulnerable to CSRF attacks by default because browsers never auto-attach
`Authorization` headers to cross-origin requests.

However, if you ever switch to `httpOnly` cookies for tokens (which is more secure),
CSRF becomes a real attack vector. Any malicious site could trick a logged-in user's browser
into making a request with their cookie attached.

The simplest production-safe approach is the **double-submit cookie** pattern:
- On login, set a random `csrf-token` cookie (readable by JS, not httpOnly).
- The frontend reads it and sends it as a request header `X-CSRF-Token`.
- The server validates the header matches the cookie on all state-changing requests.

### Install

```bash
cd backend
npm install csrf-tokens
npm install -D @types/csrf
```

### New middleware — `backend/src/middleware/csrf.ts`

```ts
import { Request, Response, NextFunction } from "express";
import crypto from "crypto";
import AppError from "../utils/AppError";

const CSRF_HEADER = "x-csrf-token";
const CSRF_COOKIE = "csrf-token";

// Call this after login to issue a CSRF token
export const issueCsrfToken = (res: Response): void => {
  const token = crypto.randomBytes(32).toString("hex");
  res.cookie(CSRF_COOKIE, token, {
    httpOnly: false,   // must be readable by frontend JS
    secure:   process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge:   7 * 24 * 60 * 60 * 1000,
  });
};

// Apply on all state-changing routes
export const verifyCsrfToken = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  // Skip for safe methods
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) {
    return next();
  }

  const headerToken = req.headers[CSRF_HEADER] as string | undefined;
  const cookieToken = req.cookies?.[CSRF_COOKIE] as string | undefined;

  if (!headerToken || !cookieToken || headerToken !== cookieToken) {
    return next(new AppError("Invalid or missing CSRF token", 403));
  }

  next();
};
```

### Wire up in `backend/src/app.ts`

```ts
import { verifyCsrfToken } from "./middleware/csrf";

// Add after cookieParser(), before route definitions:
// Only enable when using cookie-based auth
if (process.env.AUTH_MODE === "cookie") {
  app.use(verifyCsrfToken);
}
```

### Call `issueCsrfToken` in `authController.ts`

```ts
import { issueCsrfToken } from "../middleware/csrf";

// In login and signup handlers, right before sending the response:
issueCsrfToken(res);
res.status(200).json({ status: "success", accessToken });
```

### Frontend change

```ts
// Read the cookie after login:
const csrfToken = document.cookie
  .split("; ")
  .find(row => row.startsWith("csrf-token="))
  ?.split("=")[1];

// Add to every mutating request:
headers: { "X-CSRF-Token": csrfToken }
```

---

## 5. Log Sanitisation Middleware

### Why

Winston (your logger) logs `req.body` in several places via `logger.info("...", { ...req.body })`.
If a developer accidentally logs a login request body, `password` and `passwordConfirm` end up
in your log files in plain text. In a production incident, logs are shared with third parties
(Datadog, Sentry, the on-call team) — a plaintext password in a log is a serious breach.

### New utility — `backend/src/utils/sanitizeLog.ts`

```ts
const SENSITIVE_KEYS = new Set([
  "password",
  "passwordConfirm",
  "newPassword",
  "currentPassword",
  "token",
  "accessToken",
  "refreshToken",
  "resetToken",
  "verifyToken",
  "twoFactorSecret",
  "cardNumber",
  "cvv",
  "ssn",
]);

export const sanitizeLog = (
  obj: Record<string, unknown>,
  depth = 0,
): Record<string, unknown> => {
  if (depth > 5) return obj; // prevent infinite recursion on circular structures

  return Object.fromEntries(
    Object.entries(obj).map(([key, value]) => {
      if (SENSITIVE_KEYS.has(key)) return [key, "[REDACTED]"];
      if (value && typeof value === "object" && !Array.isArray(value)) {
        return [key, sanitizeLog(value as Record<string, unknown>, depth + 1)];
      }
      return [key, value];
    }),
  );
};
```

### How to use

```ts
import { sanitizeLog } from "../utils/sanitizeLog";

// Instead of:
logger.info("Login attempt", { email, password });   // DANGEROUS

// Use:
logger.info("Login attempt", sanitizeLog({ email, password }));
// Logs: { email: "user@example.com", password: "[REDACTED]" }

// For req.body logs:
logger.info("Request body", sanitizeLog(req.body));
```

### Add as a Winston transform so it's automatic

In `backend/src/config/logger.ts`, add a format transform so every log entry is
automatically sanitised, without having to call `sanitizeLog` manually everywhere:

```ts
import { sanitizeLog } from "../utils/sanitizeLog";
import winston from "winston";

const sanitiseTransform = winston.format((info) => {
  if (info && typeof info === "object") {
    const { level, message, ...meta } = info as Record<string, unknown>;
    return { level, message, ...sanitizeLog(meta as Record<string, unknown>) };
  }
  return info;
});

// Add sanitiseTransform() to your winston.createLogger formats array,
// BEFORE the json() or combine() format:
const logger = winston.createLogger({
  format: winston.format.combine(
    sanitiseTransform(),   // ← ADD
    winston.format.timestamp(),
    winston.format.json(),
  ),
  // … rest of your config
});
```

---

## 6. Helmet Content Security Policy for Production

### Why

Your app uses `helmet()` with all defaults. The default Helmet CSP is either very permissive
or completely absent depending on the Helmet version. In production, a properly configured
CSP prevents:
- Cross-site scripting (XSS) via script injection
- Clickjacking via `frame-ancestors`
- Data exfiltration via `connect-src`

### How to configure in `backend/src/app.ts`

Replace `app.use(helmet())` with:

```ts
const isProd = process.env.NODE_ENV === "production";

app.use(
  helmet({
    contentSecurityPolicy: isProd
      ? {
          directives: {
            defaultSrc:     ["'self'"],
            scriptSrc:      ["'self'"],
            styleSrc:       ["'self'", "'unsafe-inline'"],  // remove unsafe-inline if you can
            imgSrc:         ["'self'", "data:", "https://res.cloudinary.com"],
            connectSrc:     ["'self'", process.env.FRONTEND_URL ?? ""],
            fontSrc:        ["'self'"],
            objectSrc:      ["'none'"],
            frameAncestors: ["'none'"],  // prevents clickjacking
            upgradeInsecureRequests: [],
          },
        }
      : false,  // disable CSP in dev (avoids blocking hot reload etc.)

    // Strict transport security — only on prod (HTTPS)
    hsts: isProd
      ? { maxAge: 31536000, includeSubDomains: true, preload: true }
      : false,

    // Prevent browsers from sniffing MIME types
    noSniff: true,

    // Disable X-Powered-By: Express
    hidePoweredBy: true,

    // Referrer policy
    referrerPolicy: { policy: "strict-origin-when-cross-origin" },
  }),
);
```

---

## 7. Admin IP Allowlist

### Why

The admin API (`/api/v1/admin/*`) is currently accessible from any IP in the world, as long
as the caller has a valid admin JWT. If an admin token is stolen, the attacker can call the
admin API from anywhere. An IP allowlist adds a second factor at the network level — even
with a valid token, the request is blocked if it does not come from an approved IP.

### New middleware — `backend/src/middleware/ipAllowlist.ts`

```ts
import { Request, Response, NextFunction } from "express";
import AppError from "../utils/AppError";
import logger from "../config/logger";

const parseAllowlist = (): string[] => {
  const raw = process.env.ADMIN_IP_ALLOWLIST ?? "";
  return raw
    .split(",")
    .map((ip) => ip.trim())
    .filter(Boolean);
};

export const adminIpAllowlist = (
  req: Request,
  _res: Response,
  next: NextFunction,
): void => {
  const allowlist = parseAllowlist();

  // If no allowlist configured, skip the check (allows easy local dev)
  if (allowlist.length === 0) return next();

  const clientIp =
    (req.headers["x-forwarded-for"] as string)?.split(",")[0].trim() ??
    req.socket.remoteAddress ??
    "";

  if (!allowlist.includes(clientIp)) {
    logger.warn("Admin access blocked — IP not in allowlist", {
      ip: clientIp,
      path: req.path,
    });
    return next(new AppError("Access denied", 403));
  }

  next();
};
```

### Wire up in `backend/src/Routes/Admin/adminRoutes.ts`

```ts
import { adminIpAllowlist } from "../../middleware/ipAllowlist";

// Add before Protect:
router.use(adminIpAllowlist, Protect, restrictTo(Role.ADMIN));
```

### Add to `.env`

```env
# Comma-separated list of allowed IPs for admin routes
# Leave empty to disable the check (useful for local development)
ADMIN_IP_ALLOWLIST=203.0.113.10,198.51.100.42
```

---

## Part C — Performance

---

## 8. ETag Conditional Response Caching

### Why

Your product and category endpoints already cache responses in Redis. But the response is
still sent over the network in full on every cache hit. ETag headers let the browser and
CDN skip the network transfer entirely when the data has not changed — the server returns
`304 Not Modified` with no body, saving bandwidth and reducing perceived latency.

### How to implement in `backend/src/app.ts`

```bash
npm install etag
npm install -D @types/etag
```

```ts
import etag from "etag";

// Add a global ETag middleware after compression:
app.use((req: Request, res: Response, next: NextFunction) => {
  const originalJson = res.json.bind(res);

  res.json = (body: unknown): Response => {
    // Only apply ETag to GET responses with a 200 status
    if (req.method === "GET" && res.statusCode === 200) {
      const bodyStr  = JSON.stringify(body);
      const etagVal  = etag(bodyStr);

      res.setHeader("ETag", etagVal);

      if (req.headers["if-none-match"] === etagVal) {
        res.status(304).end();
        return res;
      }
    }
    return originalJson(body);
  };

  next();
});
```

This automatically applies to **all** GET endpoints with no changes to controllers.
A browser that already has the product list cached will send `If-None-Match: "abc123"` —
if the data is unchanged, the server responds with 304 and no body.

---

## 9. Fix N+1 Query Patterns

### Why

An N+1 query is when you fetch a list of N records, then run an additional query **for each
record** to fetch related data. This turns 1 query into N+1 queries. Under load, this is the
most common cause of database slowdowns in Prisma-based apps.

The current codebase has a confirmed N+1 in `getAllOrders` (admin). It fetches orders then
each order separately checks items. Here are the specific fixes:

### Fix 1 — `adminController.ts`: getAllUsers already includes `_count` (covered in PROFILE doc)

### Fix 2 — `orderController.ts`: getMyOrders should include items in one query

```ts
// BEFORE — causes N+1 if items are loaded separately elsewhere:
const orders = await prisma.order.findMany({
  where: { userId },
  orderBy: { createdAt: "desc" },
});
// Then frontend has to call getOrder(id) for each to get items

// AFTER — one query returns everything:
const orders = await prisma.order.findMany({
  where:   { userId },
  orderBy: { createdAt: "desc" },
  include: {
    items: {
      include: {
        product: {
          select: { product_id: true, name: true, image: true, price: true },
        },
      },
    },
  },
});
```

### Fix 3 — Add a `select` to every admin list query to avoid fetching unused columns

```ts
// When listing users for admin, you don't need every column.
// BEFORE:
const users = await prisma.user.findMany({ where });

// AFTER — only fetch what the table actually displays:
const users = await prisma.user.findMany({
  where,
  select: {
    id:           true,
    name:         true,
    email:        true,
    roles:        true,
    isVerified:   true,
    active:       true,
    createdAt:    true,
    phoneNumber:  true,
    profileImage: true,
    _count: { select: { orders: true } },
    // password, resetToken, verifyToken — never fetched
  },
});
```

### Fix 4 — Add missing database index for newsletter queries

```prisma
// In schema.prisma, add to NewsletterSubscription:
@@index([active])
@@index([email])
```

---

## Part D — New Features

---

## 10. Recently Viewed Products

### Why

"Recently viewed" is one of the highest-converting UX features in ecommerce. It requires
zero new database tables — a Redis sorted set is perfect: each member is a product ID,
the score is the Unix timestamp of when it was viewed. The list auto-sorts by most recent,
and you can cap it at 10 items cheaply.

### New controller — `backend/src/controller/recentlyViewedController.ts`

```ts
import { Request, Response } from "express";
import catchAsync from "../utils/catchAsync";
import { prisma } from "../config/database";
import { client as redis } from "../config/redis";
import { CacheKeys } from "../config/cacheKeys";

const MAX_ITEMS = 10;

export const trackView = async (userId: string, productId: string): Promise<void> => {
  const key   = CacheKeys.recentlyViewed(userId);
  const score = Date.now();

  await redis.zAdd(key, [{ score, value: productId }]);

  // Keep only the 10 most recent
  const count = await redis.zCard(key);
  if (count > MAX_ITEMS) {
    await redis.zRemRangeByRank(key, 0, count - MAX_ITEMS - 1);
  }

  await redis.expire(key, 30 * 24 * 60 * 60); // 30 days
};

export const getRecentlyViewed = catchAsync(
  async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const key    = CacheKeys.recentlyViewed(userId);

    // Get IDs sorted by most recent first (highest score = most recent)
    const productIds = await redis.zRange(key, 0, -1, { REV: true });

    if (productIds.length === 0) {
      return res.status(200).json({ status: "success", data: { products: [] } });
    }

    // Fetch the actual products in one query, preserving order
    const products = await prisma.products.findMany({
      where: { product_id: { in: productIds } },
      select: {
        product_id:   true,
        name:         true,
        price:        true,
        discount:     true,
        image:        true,
        rating:       true,
        availability: true,
        stock:        true,
      },
    });

    // Re-sort to match Redis order (findMany doesn't guarantee order)
    const sorted = productIds
      .map((id) => products.find((p) => p.product_id === id))
      .filter(Boolean);

    res.status(200).json({ status: "success", data: { products: sorted } });
  },
);
```

### Wire `trackView` into the existing `getProduct` controller

In `backend/src/controller/productController.ts`, inside `getProduct`, after sending the
response:

```ts
import { trackView } from "./recentlyViewedController";

// At the end of getProduct, after res.status(200).json(...):
if (req.user?.id) {
  trackView(req.user.id, productId).catch(() => {
    // non-fatal — never block the product response
  });
}
```

### Route — add to `backend/src/Routes/User/userRoutes.ts`

```ts
import { getRecentlyViewed } from "../../controller/recentlyViewedController";

// After router.use(Protect):
router.get("/recently-viewed", getRecentlyViewed);
```

Endpoints:
- `GET /api/v1/users/recently-viewed` — returns the user's last 10 viewed products

---

## 11. Product Recommendations

### Why

"Customers who bought this also bought" is the single most effective upsell mechanism in
ecommerce. The implementation does not need a machine-learning model — a simple co-purchase
query ("which other products appear alongside this one in completed orders?") gives results
that feel personalised and are entirely accurate to your real data.

### New controller function — add to `backend/src/controller/productController.ts`

```ts
export const getProductRecommendations = catchAsync(
  async (req: Request, res: Response) => {
    const { id: productId } = req.params;
    const LIMIT = 8;

    const cacheKey = `recommendations:${productId}`;
    const cached = await redis.get(cacheKey);
    if (cached) {
      return res.status(200).json({ ...JSON.parse(cached), source: "cached" });
    }

    // Find orders that contain this product
    const orderIds = await prisma.orderItem.findMany({
      where:  { product_id: productId },
      select: { orderId: true },
      take:   500, // cap for performance
    });

    if (orderIds.length === 0) {
      return res.status(200).json({ status: "success", data: { products: [] } });
    }

    // Find other products that appear in those same orders
    const coProducts = await prisma.orderItem.groupBy({
      by:      ["product_id"],
      where:   {
        orderId:    { in: orderIds.map((o) => o.orderId) },
        product_id: { not: productId },
      },
      _count:  { product_id: true },
      orderBy: { _count: { product_id: "desc" } },
      take:    LIMIT,
    });

    if (coProducts.length === 0) {
      return res.status(200).json({ status: "success", data: { products: [] } });
    }

    const products = await prisma.products.findMany({
      where:  { product_id: { in: coProducts.map((p) => p.product_id) } },
      select: {
        product_id:   true,
        name:         true,
        price:        true,
        discount:     true,
        image:        true,
        rating:       true,
        availability: true,
      },
    });

    const response = { status: "success", data: { products } };
    // Cache for 1 hour — recommendations don't change that fast
    await redis.setEx(cacheKey, 3600, JSON.stringify(response));

    res.status(200).json(response);
  },
);
```

### Route — add to `backend/src/Routes/User/productRoutes.ts`

```ts
import { getProductRecommendations } from "../../controller/productController";

router.get("/:id/recommendations", validateParams(productIdSchema), getProductRecommendations);
```

Endpoint: `GET /api/v1/products/:id/recommendations`

---

## 12. Flash Sales — Scheduled Discounts

### Why

A flash sale is a time-limited discount that activates at a specific time and reverts
automatically when it expires. Currently, discounts are permanent — an admin has to manually
edit the product twice (to start and end the sale). BullMQ (already in the project) is the
right tool to automate this.

### Schema change — `backend/prisma/schema.prisma`

```prisma
model FlashSale {
  id         String   @id @default(uuid())
  product_id String   @db.Uuid
  product    Products @relation(fields: [product_id], references: [product_id], onDelete: Cascade)
  discount   Float    // percentage 0–100
  startAt    DateTime
  endAt      DateTime
  active     Boolean  @default(false)
  jobId      String?  // BullMQ job ID for cancellation
  createdAt  DateTime @default(now())

  @@index([product_id])
  @@index([active])
  @@index([startAt, endAt])
}
```

Add to `Products`:
```prisma
flashSales FlashSale[]
```

### Migration

```bash
npx prisma migrate dev --name add_flash_sales
```

### New Zod schema — `backend/src/Schema/flashSaleSchema.ts`

```ts
import { z } from "zod";

export const createFlashSaleSchema = z.object({
  product_id: z.string().uuid(),
  discount:   z.number().min(1).max(99),
  startAt:    z.string().datetime(),
  endAt:      z.string().datetime(),
}).refine(
  (data) => new Date(data.endAt) > new Date(data.startAt),
  { message: "endAt must be after startAt", path: ["endAt"] },
);
```

### New controller — `backend/src/controller/flashSaleController.ts`

```ts
import { Request, Response, NextFunction } from "express";
import catchAsync from "../utils/catchAsync";
import AppError from "../utils/AppError";
import { prisma } from "../config/database";
import { client as redis, scanDel } from "../config/redis";
import logger from "../config/logger";
import { Queue } from "bullmq";
import { createFlashSaleSchema } from "../Schema/flashSaleSchema";

const flashQueue = new Queue("flash-sales", {
  connection: redis as any,
});

// Activate a flash sale — set product discount and schedule revert
export const createFlashSale = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const data = createFlashSaleSchema.parse(req.body);

    const product = await prisma.products.findUnique({
      where: { product_id: data.product_id },
    });
    if (!product) return next(new AppError("Product not found", 404));

    const startAt = new Date(data.startAt);
    const endAt   = new Date(data.endAt);
    const now     = new Date();

    // Store the flash sale record
    const sale = await prisma.flashSale.create({
      data: {
        product_id: data.product_id,
        discount:   data.discount,
        startAt,
        endAt,
      },
    });

    // Schedule activation job
    const activateDelay = Math.max(0, startAt.getTime() - now.getTime());
    await flashQueue.add(
      "activate",
      { saleId: sale.id, product_id: data.product_id, discount: data.discount },
      { delay: activateDelay, jobId: `activate:${sale.id}` },
    );

    // Schedule revert job
    const revertDelay = Math.max(0, endAt.getTime() - now.getTime());
    await flashQueue.add(
      "revert",
      { saleId: sale.id, product_id: data.product_id },
      { delay: revertDelay, jobId: `revert:${sale.id}` },
    );

    logger.info("Flash sale scheduled", { saleId: sale.id, product_id: data.product_id });
    res.status(201).json({ status: "success", data: { sale } });
  },
);

// Cancel a pending flash sale
export const cancelFlashSale = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;

    const sale = await prisma.flashSale.findUnique({ where: { id } });
    if (!sale) return next(new AppError("Flash sale not found", 404));

    // Remove scheduled BullMQ jobs
    await flashQueue.remove(`activate:${id}`);
    await flashQueue.remove(`revert:${id}`);

    await prisma.flashSale.delete({ where: { id } });

    logger.info("Flash sale cancelled", { saleId: id });
    res.status(204).json({ status: "success", data: null });
  },
);
```

### Flash sale worker — `backend/src/jobs/flashSaleWorker.ts`

```ts
import { Worker } from "bullmq";
import { prisma } from "../config/database";
import { client as redis, scanDel } from "../config/redis";
import logger from "../config/logger";

new Worker(
  "flash-sales",
  async (job) => {
    if (job.name === "activate") {
      const { saleId, product_id, discount } = job.data as {
        saleId: string; product_id: string; discount: number;
      };

      await prisma.$transaction([
        prisma.products.update({
          where: { product_id },
          data:  { discount },
        }),
        prisma.flashSale.update({
          where: { id: saleId },
          data:  { active: true },
        }),
      ]);

      await redis.del(`product:${product_id}`);
      await scanDel("products:list:*");
      logger.info("Flash sale activated", { saleId, product_id, discount });
    }

    if (job.name === "revert") {
      const { saleId, product_id } = job.data as {
        saleId: string; product_id: string;
      };

      await prisma.$transaction([
        prisma.products.update({
          where: { product_id },
          data:  { discount: 0 },
        }),
        prisma.flashSale.update({
          where: { id: saleId },
          data:  { active: false },
        }),
      ]);

      await redis.del(`product:${product_id}`);
      await scanDel("products:list:*");
      logger.info("Flash sale ended — discount reverted", { saleId, product_id });
    }
  },
  { connection: redis as any },
);
```

### Start the worker in `backend/src/server.ts`

```ts
import "./jobs/flashSaleWorker";
```

### Admin routes — add to `backend/src/Routes/Admin/adminRoutes.ts`

```ts
import { createFlashSale, cancelFlashSale } from "../../controller/flashSaleController";
import { createFlashSaleSchema } from "../../Schema/flashSaleSchema";

router.post("/flash-sales",     validateBody(createFlashSaleSchema), createFlashSale);
router.delete("/flash-sales/:id", cancelFlashSale);
```

---

## 13. Low Stock Admin Alerts

### Why

When a product runs low, an admin needs to know before it goes out of stock entirely. There
is currently no mechanism to alert anyone. This is a simple background check that runs after
every stock decrement (order placed or cart-related) and sends an email when stock drops below
a configurable threshold.

### New utility — `backend/src/utils/stockAlert.ts`

```ts
import { prisma } from "../config/database";
import { emailQueue } from "../jobs/emailQueue";
import logger from "../config/logger";

const LOW_STOCK_THRESHOLD = Number(process.env.LOW_STOCK_THRESHOLD ?? "5");
const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? "";

export const checkAndAlertLowStock = async (productId: string): Promise<void> => {
  if (!ADMIN_EMAIL) return;

  try {
    const product = await prisma.products.findUnique({
      where:  { product_id: productId },
      select: { name: true, stock: true },
    });

    if (!product || product.stock > LOW_STOCK_THRESHOLD) return;

    await emailQueue.add("send-email", {
      email:   ADMIN_EMAIL,
      subject: `Low stock alert: ${product.name}`,
      template: "lowStock",
      templateData: {
        productName: product.name,
        stock:       String(product.stock),
        threshold:   String(LOW_STOCK_THRESHOLD),
        productId,
      },
    });

    logger.warn("Low stock alert sent", { productId, stock: product.stock });
  } catch {
    // Never block the main flow for a non-critical alert
    logger.warn("Failed to check/send low stock alert", { productId });
  }
};
```

### Wire into order creation

In whatever controller creates an `Order` and decrements stock, call it after the transaction:

```ts
import { checkAndAlertLowStock } from "../utils/stockAlert";

// After the order is created and stock is decremented:
for (const item of orderItems) {
  checkAndAlertLowStock(item.product_id); // fire and forget
}
```

### Email template — `backend/src/emails/templates/lowStock.hbs`

```html
<html lang="en">
  <head><meta charset="utf-8" /><title>Low Stock Alert</title></head>
  <body style="margin:0; padding:0; background:#f4f4f4; font-family: -apple-system, sans-serif;">
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td align="center" style="padding:40px 0;">
          <table width="600" cellpadding="0" cellspacing="0" style="background:#fff; border-radius:8px;">
            <tr>
              <td style="background:#dc2626; padding:24px 32px;">
                <h1 style="color:#fff; margin:0; font-size:20px;">⚠ Low Stock Alert — Northline</h1>
              </td>
            </tr>
            <tr>
              <td style="padding:32px;">
                <h2 style="color:#111; margin:0 0 16px;">{{productName}}</h2>
                <p style="color:#555;">
                  Only <strong>{{stock}} unit(s)</strong> remaining
                  (threshold: {{threshold}}).
                </p>
                <p style="color:#999; font-size:13px; margin-top:32px;">
                  Log in to the admin panel to restock this product.
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

### Add to `.env`

```env
LOW_STOCK_THRESHOLD=5
```

---

## 14. Bulk Product CSV Import

### Why

Adding 200 products one at a time via the admin UI is unusable. A CSV upload lets an admin
populate or update the entire catalogue in one operation. This is a standard requirement for
any store with more than a handful of products.

### Install

```bash
cd backend
npm install csv-parse
npm install -D @types/csv-parse
```

### New Zod schema — `backend/src/Schema/csvImportSchema.ts`

```ts
import { z } from "zod";

// Validates each row in the CSV after parsing
export const csvProductRowSchema = z.object({
  name:         z.string().min(1).max(255),
  description:  z.string().optional(),
  price:        z.coerce.number().positive(),
  stock:        z.coerce.number().int().min(0).default(0),
  discount:     z.coerce.number().min(0).max(100).optional(),
  brand:        z.string().optional(),
  unit:         z.string().optional(),
  availability: z.coerce.boolean().default(true),
  category_id:  z.coerce.number().int().positive().optional(),
});

export type CsvProductRow = z.infer<typeof csvProductRowSchema>;
```

### New controller — `backend/src/controller/csvImportController.ts`

```ts
import { Request, Response, NextFunction } from "express";
import { parse } from "csv-parse/sync";
import catchAsync from "../utils/catchAsync";
import AppError from "../utils/AppError";
import { prisma } from "../config/database";
import logger from "../config/logger";
import { csvProductRowSchema } from "../Schema/csvImportSchema";
import { scanDel } from "../config/redis";

export const importProductsCsv = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    if (!req.file) return next(new AppError("CSV file is required", 400));

    const MAX_ROWS = 500;
    let rows: unknown[];

    try {
      rows = parse(req.file.buffer, {
        columns:          true,   // use first row as headers
        skip_empty_lines: true,
        trim:             true,
      });
    } catch {
      return next(new AppError("Could not parse CSV — check file format", 400));
    }

    if (rows.length > MAX_ROWS) {
      return next(new AppError(`CSV must not exceed ${MAX_ROWS} rows`, 400));
    }

    const created: unknown[] = [];
    const errors:  { row: number; message: string }[] = [];

    for (let i = 0; i < rows.length; i++) {
      const result = csvProductRowSchema.safeParse(rows[i]);

      if (!result.success) {
        errors.push({ row: i + 2, message: result.error.issues[0].message });
        continue;
      }

      try {
        const product = await prisma.products.create({ data: result.data });
        created.push(product);
      } catch (err: any) {
        errors.push({ row: i + 2, message: err?.message ?? "Database error" });
      }
    }

    // Invalidate the product list cache
    await scanDel("products:list:*");

    logger.info("CSV import complete", {
      adminId: req.user!.id,
      created: created.length,
      errors:  errors.length,
    });

    res.status(200).json({
      status:  "success",
      data: {
        imported: created.length,
        failed:   errors.length,
        errors,
      },
    });
  },
);
```

### Admin route — add to `backend/src/Routes/Admin/adminProductRoutes.ts`

```ts
import multer from "multer";
import { importProductsCsv } from "../../controller/csvImportController";

// Use memory storage — we parse the buffer, not write to disk
const csvUpload = multer({
  storage: multer.memoryStorage(),
  limits:  { fileSize: 2 * 1024 * 1024 }, // 2 MB max
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === "text/csv" || file.originalname.endsWith(".csv")) {
      cb(null, true);
    } else {
      cb(new Error("Only .csv files are allowed") as any, false);
    }
  },
});

router.post("/import/csv", csvUpload.single("file"), importProductsCsv);
```

### Expected CSV format

```
name,description,price,stock,discount,brand,unit,availability,category_id
"Running Shoes","Lightweight running shoes",89.99,50,10,"Nike","pair",true,3
"Water Bottle","BPA-free 1L bottle",19.99,200,0,"Hydro Flask","unit",true,5
```

---

## Part E — DevOps

---

## 15. Dockerfile + docker-compose

### Why

Without a Dockerfile, deployment means manually installing Node, PostgreSQL, and Redis on a
server, running migrations, and hoping environment parity with development. Docker eliminates
all of that. One command spins up the entire stack anywhere.

### `backend/Dockerfile`

```dockerfile
# ── Stage 1: Build ──────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma/

RUN npm ci

COPY . .

RUN npx prisma generate
RUN npm run build

# ── Stage 2: Production image ────────────────────────────────────────────────
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

COPY package*.json ./
RUN npm ci --omit=dev

# Copy compiled output and generated Prisma client
COPY --from=builder /app/dist         ./dist
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY prisma ./prisma/

EXPOSE 3000

# Run migrations then start the server
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/server.js"]
```

### `docker-compose.yml` (root of the project)

```yaml
version: "3.9"

services:
  api:
    build:
      context: ./backend
      dockerfile: Dockerfile
    ports:
      - "3000:3000"
    environment:
      NODE_ENV:       production
      DATABASE_URL:   postgres://postgres:password@db:5432/northline
      REDIS_URL:      redis://redis:6379
      JWT_SECRET:     ${JWT_SECRET}
      JWT_REFRESH_SECRET: ${JWT_REFRESH_SECRET}
      EMAIL_HOST:     ${EMAIL_HOST}
      EMAIL_PORT:     ${EMAIL_PORT}
      EMAIL_USERNAME: ${EMAIL_USERNAME}
      EMAIL_PASSWORD: ${EMAIL_PASSWORD}
      EMAIL_FROM:     ${EMAIL_FROM}
      FRONTEND_URL:   ${FRONTEND_URL}
    depends_on:
      db:
        condition: service_healthy
      redis:
        condition: service_healthy
    restart: unless-stopped

  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER:     postgres
      POSTGRES_PASSWORD: password
      POSTGRES_DB:       northline
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test:     ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 10s
      timeout:  5s
      retries:  5

  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/data
    healthcheck:
      test:     ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout:  5s
      retries:  5

volumes:
  postgres_data:
  redis_data:
```

### `.dockerignore`

```
node_modules
dist
.env
*.log
coverage
.git
```

### Commands

```bash
# Start everything:
docker compose up -d

# View logs:
docker compose logs -f api

# Run a migration manually:
docker compose exec api npx prisma migrate deploy

# Stop everything:
docker compose down
```

---

## 16. GitHub Actions CI Pipeline

### Why

Without CI, every pull request is merged on trust. A CI pipeline runs your TypeScript
compiler and tests automatically on every push, catching broken builds and regressions before
they reach production.

### `.github/workflows/ci.yml`

```yaml
name: CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  build-and-test:
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:16-alpine
        env:
          POSTGRES_USER:     postgres
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB:       northline_test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432

      redis:
        image: redis:7-alpine
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 6379:6379

    env:
      DATABASE_URL:        postgres://postgres:postgres@localhost:5432/northline_test
      REDIS_URL:           redis://localhost:6379
      JWT_SECRET:          ci-jwt-secret-not-for-production
      JWT_REFRESH_SECRET:  ci-refresh-secret-not-for-production
      NODE_ENV:            test

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
          cache-dependency-path: backend/package-lock.json

      - name: Install dependencies
        working-directory: backend
        run: npm ci

      - name: Generate Prisma client
        working-directory: backend
        run: npx prisma generate

      - name: Run database migrations
        working-directory: backend
        run: npx prisma migrate deploy

      - name: TypeScript type check
        working-directory: backend
        run: npx tsc --noEmit

      - name: Run tests
        working-directory: backend
        run: npm test

      - name: Build
        working-directory: backend
        run: npm run build
```

### Add `test` script to `backend/package.json`

```json
{
  "scripts": {
    "test":  "jest --forceExit --detectOpenHandles",
    "build": "tsc"
  }
}
```

---

## Part F — Advanced Security

---

## 17. Social Auth — Google & GitHub OAuth

### Why

A large portion of users abandon registration forms. Offering "Continue with Google" or
"Continue with GitHub" removes that friction entirely — one click and they are signed in.
Passport.js is the standard library for this in Express.

### Install

```bash
cd backend
npm install passport passport-google-oauth20 passport-github2
npm install -D @types/passport @types/passport-google-oauth20 @types/passport-github2
```

### Schema change — `backend/prisma/schema.prisma`

```prisma
model User {
  // … existing fields …
  googleId   String?  @unique
  githubId   String?  @unique
  authMethod String   @default("local")  // "local" | "google" | "github"
}
```

### Migration

```bash
npx prisma migrate dev --name add_oauth_fields
```

### New config — `backend/src/config/passport.ts`

```ts
import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { Strategy as GitHubStrategy } from "passport-github2";
import { prisma } from "./database";
import logger from "./logger";

passport.use(
  new GoogleStrategy(
    {
      clientID:     process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      callbackURL:  `${process.env.API_URL}/api/v1/auth/google/callback`,
    },
    async (_accessToken, _refreshToken, profile, done) => {
      try {
        const email = profile.emails?.[0]?.value;
        if (!email) return done(new Error("No email from Google"), undefined);

        let user = await prisma.user.findFirst({
          where: { OR: [{ googleId: profile.id }, { email }] },
        });

        if (!user) {
          user = await prisma.user.create({
            data: {
              name:       profile.displayName,
              email,
              password:   "",           // no password for OAuth users
              googleId:   profile.id,
              authMethod: "google",
              isVerified: true,         // Google email is already verified
            },
          });
          logger.info("New user via Google OAuth", { userId: user.id });
        } else if (!user.googleId) {
          // Existing local account — link Google to it
          user = await prisma.user.update({
            where: { id: user.id },
            data:  { googleId: profile.id, authMethod: "google" },
          });
        }

        return done(null, user);
      } catch (err) {
        return done(err as Error, undefined);
      }
    },
  ),
);

passport.use(
  new GitHubStrategy(
    {
      clientID:     process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
      callbackURL:  `${process.env.API_URL}/api/v1/auth/github/callback`,
      scope:        ["user:email"],
    },
    async (_accessToken, _refreshToken, profile, done) => {
      try {
        const email = profile.emails?.[0]?.value;
        if (!email) return done(new Error("No email from GitHub"), undefined);

        let user = await prisma.user.findFirst({
          where: { OR: [{ githubId: String(profile.id) }, { email }] },
        });

        if (!user) {
          user = await prisma.user.create({
            data: {
              name:       profile.displayName ?? profile.username ?? "GitHub User",
              email,
              password:   "",
              githubId:   String(profile.id),
              authMethod: "github",
              isVerified: true,
            },
          });
        } else if (!user.githubId) {
          user = await prisma.user.update({
            where: { id: user.id },
            data:  { githubId: String(profile.id) },
          });
        }

        return done(null, user);
      } catch (err) {
        return done(err as Error, undefined);
      }
    },
  ),
);

export default passport;
```

### New routes file — `backend/src/Routes/User/oauthRoutes.ts`

```ts
import express from "express";
import passport from "../../config/passport";
import { signAccessToken, signRefreshToken } from "../../utils/jwt";
import { client as redis } from "../../config/redis";

const router = express.Router();
const FRONTEND_URL = process.env.FRONTEND_URL ?? "http://localhost:5173";

const handleOAuthCallback = async (req: express.Request, res: express.Response) => {
  const user = req.user as any;
  if (!user) return res.redirect(`${FRONTEND_URL}/login?error=oauth_failed`);

  const accessToken  = signAccessToken({ id: user.id });
  const refreshToken = signRefreshToken({ id: user.id });
  await redis.setEx(`refresh:${user.id}`, 7 * 24 * 60 * 60, refreshToken);

  // Redirect to frontend with token in query param — frontend stores it in localStorage
  res.redirect(`${FRONTEND_URL}/oauth/callback?token=${accessToken}`);
};

// Google
router.get("/google",
  passport.authenticate("google", { scope: ["profile", "email"], session: false }),
);
router.get("/google/callback",
  passport.authenticate("google", { failureRedirect: `${FRONTEND_URL}/login`, session: false }),
  handleOAuthCallback,
);

// GitHub
router.get("/github",
  passport.authenticate("github", { scope: ["user:email"], session: false }),
);
router.get("/github/callback",
  passport.authenticate("github", { failureRedirect: `${FRONTEND_URL}/login`, session: false }),
  handleOAuthCallback,
);

export default router;
```

### Register in `backend/src/app.ts`

```ts
import passport from "./config/passport";
import oauthRoutes from "./Routes/User/oauthRoutes";

app.use(passport.initialize());
app.use("/api/v1/auth", oauthRoutes);
```

### Add to `.env`

```env
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
API_URL=https://api.yourstore.com
```

---

## 18. API Key Authentication

### Why

If you ever expose a public API for merchants, mobile apps, or third-party integrations,
JWT tokens (which expire) are awkward for machine-to-machine use. API keys are long-lived,
prefixed for easy identification, and can be scoped to specific permissions (read-only, orders
only, etc.). They also let you revoke access per-key without logging out the user.

### Schema change — `backend/prisma/schema.prisma`

```prisma
model ApiKey {
  id          String    @id @default(uuid())
  userId      String
  user        User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  keyHash     String    @unique          // SHA-256 hash — never store the raw key
  prefix      String                     // first 8 chars — for display/identification
  name        String                     // "Mobile App", "Shopify Integration"
  lastUsedAt  DateTime?
  expiresAt   DateTime?
  active      Boolean   @default(true)
  createdAt   DateTime  @default(now())

  @@index([userId])
  @@index([keyHash])
}
```

Add on `User`:
```prisma
apiKeys ApiKey[]
```

### Migration

```bash
npx prisma migrate dev --name add_api_keys
```

### New controller — `backend/src/controller/apiKeyController.ts`

```ts
import { Request, Response, NextFunction } from "express";
import crypto from "crypto";
import catchAsync from "../utils/catchAsync";
import AppError from "../utils/AppError";
import { prisma } from "../config/database";
import logger from "../config/logger";

const hashKey = (raw: string): string =>
  crypto.createHash("sha256").update(raw).digest("hex");

const generateApiKey = (): string => {
  const random = crypto.randomBytes(32).toString("hex");
  return `nl_${random}`;  // nl_ prefix identifies Northline keys
};

export const createApiKey = catchAsync(
  async (req: Request, res: Response, _next: NextFunction) => {
    const userId = req.user!.id;
    const name   = (req.body.name as string) ?? "My API Key";

    const raw    = generateApiKey();
    const hash   = hashKey(raw);
    const prefix = raw.slice(0, 10);

    await prisma.apiKey.create({
      data: { userId, keyHash: hash, prefix, name },
    });

    logger.info("API key created", { userId, prefix });

    // Return the raw key ONCE — it is never retrievable again
    res.status(201).json({
      status: "success",
      message: "Store this key — it will not be shown again.",
      data: { key: raw, prefix, name },
    });
  },
);

export const listApiKeys = catchAsync(
  async (req: Request, res: Response, _next: NextFunction) => {
    const keys = await prisma.apiKey.findMany({
      where:  { userId: req.user!.id, active: true },
      select: { id: true, prefix: true, name: true, lastUsedAt: true, createdAt: true },
    });
    res.status(200).json({ status: "success", data: { keys } });
  },
);

export const revokeApiKey = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const userId = req.user!.id;
    const key = await prisma.apiKey.findUnique({ where: { id: req.params.id } });

    if (!key || key.userId !== userId)
      return next(new AppError("API key not found", 404));

    await prisma.apiKey.update({ where: { id: req.params.id }, data: { active: false } });
    logger.info("API key revoked", { userId, keyId: req.params.id });

    res.status(204).json({ status: "success", data: null });
  },
);
```

### API Key authentication middleware — `backend/src/middleware/apiKeyAuth.ts`

```ts
import { Request, Response, NextFunction } from "express";
import crypto from "crypto";
import { prisma } from "../config/database";

const hashKey = (raw: string): string =>
  crypto.createHash("sha256").update(raw).digest("hex");

// Use this instead of Protect on routes that accept API keys
export const apiKeyAuth = async (
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> => {
  const raw =
    (req.headers["x-api-key"] as string) ??
    (req.query.api_key as string);

  if (!raw) return next();  // fall through to JWT auth

  const hash = hashKey(raw);
  const key  = await prisma.apiKey.findUnique({
    where:   { keyHash: hash },
    include: { user: true },
  });

  if (!key || !key.active) return next();
  if (key.expiresAt && key.expiresAt < new Date()) return next();

  // Attach user to request (same interface as Protect)
  req.user = key.user as any;

  // Fire-and-forget usage tracking
  prisma.apiKey.update({
    where: { id: key.id },
    data:  { lastUsedAt: new Date() },
  }).catch(() => {});

  next();
};
```

### Routes — add to `backend/src/Routes/User/userRoutes.ts`

```ts
import { createApiKey, listApiKeys, revokeApiKey } from "../../controller/apiKeyController";

router.get("/api-keys",          Protect, listApiKeys);
router.post("/api-keys",         Protect, createApiKey);
router.delete("/api-keys/:id",   Protect, revokeApiKey);
```

---

## 19. Refresh Token Family Tracking

### Why

The refresh token rotation in `BACKEND_IMPROVEMENTS.md` replaces the old token on every
refresh. But if an attacker steals a refresh token **before** it is rotated, both the
attacker and the real user hold valid tokens — the server has no way to tell which is
legitimate.

**Token family tracking** solves this: every token belongs to a family (issued at login).
If a token that has already been rotated is presented (i.e. the old one), it proves
**someone** has a stolen token. The server immediately invalidates the entire family —
kicking out both the attacker and the real user, who then must log in again.

### New data structure in Redis

```
refresh:family:{familyId}  →  currentRefreshToken (string, TTL 7d)
```

On login: create a new family ID, store the token.
On refresh: verify the token matches `refresh:family:{familyId}`, then rotate.
On reuse detected: delete `refresh:family:{familyId}` entirely.

### Implementation — `backend/src/controller/authController.ts`

```ts
import { v4 as uuidv4 } from "uuid";

// On login — replace the simple redis.set with a family:
const familyId     = uuidv4();
const refreshToken = signRefreshToken({ id: user.id, familyId });
await redis.setEx(`refresh:family:${familyId}`, 7 * 24 * 60 * 60, refreshToken);

// Include familyId in the access token response so the client can pass it on refresh:
res.status(200).json({ status: "success", accessToken, familyId });
```

```ts
// On refresh — extract familyId from the incoming refresh token payload:
export const refreshTokens = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const { refreshToken } = req.body as { refreshToken?: string };
    if (!refreshToken) return next(new AppError("Refresh token required", 401));

    let decoded: { id: string; familyId: string };
    try {
      decoded = JWT.verify(refreshToken, process.env.JWT_REFRESH_SECRET!) as typeof decoded;
    } catch {
      return next(new AppError("Invalid or expired refresh token", 401));
    }

    const familyKey   = `refresh:family:${decoded.familyId}`;
    const storedToken = await redis.get(familyKey);

    if (!storedToken) {
      return next(new AppError("Session expired. Please log in again.", 401));
    }

    if (storedToken !== refreshToken) {
      // Token reuse detected — nuke the whole family
      await redis.del(familyKey);
      logger.warn("Refresh token reuse detected — family invalidated", {
        userId:   decoded.id,
        familyId: decoded.familyId,
      });
      return next(new AppError("Security violation detected. Please log in again.", 401));
    }

    // Rotate — issue new tokens, same family
    const newAccessToken  = signAccessToken({ id: decoded.id });
    const newRefreshToken = signRefreshToken({ id: decoded.id, familyId: decoded.familyId });
    await redis.setEx(familyKey, 7 * 24 * 60 * 60, newRefreshToken);

    res.status(200).json({
      status:       "success",
      accessToken:  newAccessToken,
      refreshToken: newRefreshToken,
    });
  },
);
```

---

## Part G — Advanced Business Features

---

## 20. Variants in Cart

### Why

The `CartItem` model only stores `product_id` and `quantity`. If a product has variants
(size, colour) the cart has no way to record which specific variant was added. Two items of
the same product with different variants are indistinguishable, which causes wrong fulfilment.

### Schema change — `backend/prisma/schema.prisma`

```prisma
model CartItem {
  // … existing fields …
  variantId  String?  // ← ADD — null means base product, no variant
  variant    ProductVariant? @relation(fields: [variantId], references: [id], onDelete: SetNull)
}
```

Add on `ProductVariant`:
```prisma
cartItems CartItem[]
```

### Migration

```bash
npx prisma migrate dev --name add_cartitem_variant
```

### Schema update — `backend/src/Schema/cartSchema.ts`

```ts
export const addToCartSchema = z.object({
  product_id: z.string().uuid(),
  quantity:   z.number().int().positive(),
  variantId:  z.string().uuid().optional(),  // ← ADD
});
```

### Controller change — `backend/src/controller/cartController.ts`

In `addItemToCart`, after looking up the product, also look up the variant if provided,
and use its stock instead of the base product stock:

```ts
const { product_id, quantity, variantId } = addToCartSchema.parse(req.body);

// If a variant is specified, validate it belongs to this product
if (variantId) {
  const variant = await prisma.productVariant.findUnique({ where: { id: variantId } });
  if (!variant || variant.product_id !== product_id) {
    return next(new AppError("Variant not found for this product", 404));
  }
  if (variant.stock < quantity) {
    return next(new AppError(`Only ${variant.stock} unit(s) available for this variant`, 400));
  }
}

// Inside the transaction, include variantId when creating/updating CartItem:
await tx.cartItem.upsert({
  where: {
    // Add a @@unique([cartId, product_id, variantId]) to schema for proper upsert
    cartId_product_id_variantId: { cartId: cart.id, product_id, variantId: variantId ?? null },
  },
  update: { quantity: { increment: quantity } },
  create: { cartId: cart.id, product_id, quantity, variantId: variantId ?? null },
});
```

Also add the compound unique to the schema:
```prisma
model CartItem {
  // …
  @@unique([cartId, product_id, variantId])
}
```

---

## 21. Order Delivery Notes

### Why

Customers frequently need to add delivery instructions ("Leave at door", "Ring bell twice",
"Call on arrival"). Without this field, they have no way to communicate this to the store
and you have no way to pass it to the courier.

### Schema change — `backend/prisma/schema.prisma`

```prisma
model Order {
  // … existing fields …
  deliveryNote String?   // ← ADD
}
```

### Migration

```bash
npx prisma migrate dev --name add_order_delivery_note
```

### Controller change — `backend/src/controller/orderController.ts`

In the order creation handler, accept and save the note:

```ts
// In createOrderSchema (orderSchema.ts):
export const createOrderSchema = z.object({
  items:        z.array(orderItemSchema).min(1),
  deliveryNote: z.string().max(500).optional(),  // ← ADD
});

// In createOrder controller, pass it to prisma.order.create:
const order = await prisma.order.create({
  data: {
    userId,
    total,
    status:      "PENDING",
    deliveryNote: data.deliveryNote ?? null,  // ← ADD
    items: { create: orderItems },
  },
});
```

The note is returned automatically in all existing `GET /api/v1/orders/:id` responses.

---

## 22. Product Slug for SEO URLs

### Why

Product URLs currently look like `/products/3f4a8b2c-1234-...`. Search engines and humans
both struggle with UUIDs. A slug (`/products/nike-air-max-270`) is indexable, shareable,
and readable. Slugs must be unique and auto-generated from the product name.

### Install

```bash
npm install slugify
```

### Schema change — `backend/prisma/schema.prisma`

```prisma
model Products {
  // … existing fields …
  slug String? @unique @db.VarChar(300)   // ← ADD

  @@index([slug])
}
```

### Migration

```bash
npx prisma migrate dev --name add_product_slug
```

### New utility — `backend/src/utils/slug.ts`

```ts
import slugify from "slugify";
import { prisma } from "../config/database";

export const generateUniqueSlug = async (name: string, excludeId?: string): Promise<string> => {
  const base = slugify(name, { lower: true, strict: true, trim: true });
  let slug    = base;
  let suffix  = 1;

  while (true) {
    const existing = await prisma.products.findUnique({
      where: { slug },
      select: { product_id: true },
    });

    if (!existing || existing.product_id === excludeId) break;

    slug = `${base}-${suffix}`;
    suffix++;
  }

  return slug;
};
```

### Controller change — `backend/src/controller/productController.ts`

```ts
import { generateUniqueSlug } from "../utils/slug";

// In createProduct, before prisma.products.create:
const slug = await generateUniqueSlug(data.name);
const product = await prisma.products.create({ data: { ...data, slug } });

// In updateProduct, if name changes, regenerate slug:
if (data.name && data.name !== existingProduct.name) {
  data.slug = await generateUniqueSlug(data.name, productId);
}

// Add a GET by slug endpoint:
export const getProductBySlug = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const product = await prisma.products.findUnique({
      where:   { slug: req.params.slug },
      include: productCategoryInclude,
    });
    if (!product) return next(new AppError("Product not found", 404));
    res.status(200).json({ status: "success", data: { product } });
  },
);
```

### Route — add to `backend/src/Routes/User/productRoutes.ts`

```ts
router.get("/slug/:slug", getProductBySlug);
```

---

## 23. Nested Categories

### Why

Currently all categories are flat (no parent/child). A real store has a hierarchy:
"Electronics" → "Phones" → "Android". Without nesting, your navigation is limited to
a flat list and you cannot filter by category group.

### Schema change — `backend/prisma/schema.prisma`

```prisma
model Category {
  category_id Int        @id @default(autoincrement())
  name        String     @unique @db.VarChar(100)
  parentId    Int?                          // ← ADD
  parent      Category?  @relation("CategoryTree", fields: [parentId], references: [category_id])
  children    Category[] @relation("CategoryTree")
  createdAt   DateTime   @default(now()) @db.Timestamp(6)
  updatedAt   DateTime   @updatedAt @db.Timestamp(6)
  products    Products[]

  @@index([parentId])
}
```

### Migration

```bash
npx prisma migrate dev --name add_category_parent
```

### Controller change — `backend/src/controller/categoryController.ts`

```ts
// Update getCategories to return a tree structure:
export const getCategories = catchAsync(
  async (_req: Request, res: Response) => {
    const all = await prisma.category.findMany({
      include: { children: true },
      orderBy: { name: "asc" },
    });

    // Return only root categories; children are nested inside
    const roots = all.filter((c) => c.parentId === null);

    res.status(200).json({ status: "success", data: { categories: roots } });
  },
);

// Update createCategorySchema to accept parentId:
export const createCategorySchema = z.object({
  name:     z.string().min(1).max(100),
  parentId: z.number().int().positive().optional(),
});
```

---

## 24. Gift Cards

### Why

Gift cards are among the highest-margin products in ecommerce — the buyer pays full price up
front and some percentage are never redeemed. They also drive new customer acquisition when
given as gifts.

### Schema change — `backend/prisma/schema.prisma`

```prisma
model GiftCard {
  id          String    @id @default(uuid())
  code        String    @unique @db.VarChar(20)
  initialValue  Float
  balance     Float
  purchasedBy String?
  purchaser   User?     @relation("PurchasedGiftCards", fields: [purchasedBy], references: [id], onDelete: SetNull)
  usedBy      String?
  recipient   User?     @relation("UsedGiftCards", fields: [usedBy], references: [id], onDelete: SetNull)
  expiresAt   DateTime?
  active      Boolean   @default(true)
  createdAt   DateTime  @default(now())

  @@index([code])
}
```

Add on `User`:
```prisma
purchasedGiftCards GiftCard[] @relation("PurchasedGiftCards")
usedGiftCards      GiftCard[] @relation("UsedGiftCards")
```

### Migration

```bash
npx prisma migrate dev --name add_gift_cards
```

### New controller — `backend/src/controller/giftCardController.ts`

```ts
import { Request, Response, NextFunction } from "express";
import crypto from "crypto";
import catchAsync from "../utils/catchAsync";
import AppError from "../utils/AppError";
import { prisma } from "../config/database";
import logger from "../config/logger";
import { z } from "zod";

const generateCode = (): string =>
  crypto.randomBytes(8).toString("hex").toUpperCase().match(/.{4}/g)!.join("-");
// Produces format: "A1B2-C3D4-E5F6-G7H8"

const purchaseSchema = z.object({ value: z.number().positive().min(5).max(500) });
const redeemSchema   = z.object({ code: z.string().min(1) });

// User purchases a gift card (charged via Stripe separately)
export const purchaseGiftCard = catchAsync(
  async (req: Request, res: Response, _next: NextFunction) => {
    const { value } = purchaseSchema.parse(req.body);
    const code = generateCode();

    const card = await prisma.giftCard.create({
      data: {
        code,
        initialValue: value,
        balance:      value,
        purchasedBy:  req.user!.id,
      },
    });

    logger.info("Gift card purchased", { userId: req.user!.id, code, value });
    res.status(201).json({ status: "success", data: { card } });
  },
);

// User checks a gift card balance
export const checkGiftCard = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const { code } = redeemSchema.parse(req.body);

    const card = await prisma.giftCard.findUnique({
      where: { code: code.toUpperCase() },
      select: { balance: true, expiresAt: true, active: true, initialValue: true },
    });

    if (!card || !card.active) return next(new AppError("Invalid gift card code", 400));
    if (card.expiresAt && card.expiresAt < new Date())
      return next(new AppError("This gift card has expired", 400));

    res.status(200).json({ status: "success", data: { balance: card.balance } });
  },
);

// Apply a gift card at checkout — call inside order creation
export const applyGiftCard = async (
  code: string,
  orderTotal: number,
): Promise<{ discount: number; newBalance: number }> => {
  const card = await prisma.giftCard.findUnique({ where: { code } });
  if (!card || !card.active || card.balance <= 0) throw new AppError("Invalid gift card", 400);
  if (card.expiresAt && card.expiresAt < new Date()) throw new AppError("Gift card expired", 400);

  const discount   = Math.min(card.balance, orderTotal);
  const newBalance = card.balance - discount;

  await prisma.giftCard.update({
    where: { code },
    data:  { balance: newBalance, active: newBalance > 0 },
  });

  return { discount, newBalance };
};
```

### Routes — `backend/src/Routes/User/giftCardRoutes.ts`

```ts
import express from "express";
import { purchaseGiftCard, checkGiftCard } from "../../controller/giftCardController";
import { Protect } from "../../controller/authController";

const router = express.Router();

router.post("/purchase", Protect, purchaseGiftCard);
router.post("/check",    Protect, checkGiftCard);

export default router;
```

---

## 25. Product Bundles

### Why

Bundles ("buy A + B together for $X") increase average order value, clear slow-moving
inventory, and create perceived value. Currently each product is priced independently
with no mechanism to group them.

### Schema change — `backend/prisma/schema.prisma`

```prisma
model Bundle {
  id           String         @id @default(uuid())
  name         String
  description  String?
  price        Float           // total bundle price (usually cheaper than sum of parts)
  active       Boolean         @default(true)
  items        BundleItem[]
  createdAt    DateTime        @default(now())
  updatedAt    DateTime        @updatedAt
}

model BundleItem {
  id         String   @id @default(uuid())
  bundleId   String
  bundle     Bundle   @relation(fields: [bundleId], references: [id], onDelete: Cascade)
  product_id String   @db.Uuid
  product    Products @relation(fields: [product_id], references: [product_id])
  quantity   Int      @default(1)

  @@index([bundleId])
}
```

Add on `Products`:
```prisma
bundleItems BundleItem[]
```

### Migration

```bash
npx prisma migrate dev --name add_bundles
```

### New controller — `backend/src/controller/bundleController.ts`

```ts
import { Request, Response, NextFunction } from "express";
import catchAsync from "../utils/catchAsync";
import AppError from "../utils/AppError";
import { prisma } from "../config/database";
import { z } from "zod";

const bundleItemSchema = z.object({
  product_id: z.string().uuid(),
  quantity:   z.number().int().positive().default(1),
});

const createBundleSchema = z.object({
  name:        z.string().min(1).max(200),
  description: z.string().optional(),
  price:       z.number().positive(),
  items:       z.array(bundleItemSchema).min(2, "A bundle needs at least 2 products"),
});

export const getBundles = catchAsync(async (_req: Request, res: Response) => {
  const bundles = await prisma.bundle.findMany({
    where:   { active: true },
    include: {
      items: {
        include: {
          product: {
            select: { product_id: true, name: true, image: true, price: true },
          },
        },
      },
    },
  });
  res.status(200).json({ status: "success", data: { bundles } });
});

export const adminCreateBundle = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const data = createBundleSchema.parse(req.body);

    // Validate all products exist
    const productIds = data.items.map((i) => i.product_id);
    const products   = await prisma.products.findMany({
      where: { product_id: { in: productIds } },
    });
    if (products.length !== productIds.length)
      return next(new AppError("One or more products not found", 404));

    const bundle = await prisma.bundle.create({
      data: {
        name:        data.name,
        description: data.description,
        price:       data.price,
        items:       { create: data.items },
      },
      include: { items: true },
    });

    res.status(201).json({ status: "success", data: { bundle } });
  },
);

export const adminDeleteBundle = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const existing = await prisma.bundle.findUnique({ where: { id: req.params.id } });
    if (!existing) return next(new AppError("Bundle not found", 404));

    await prisma.bundle.delete({ where: { id: req.params.id } });
    res.status(204).json({ status: "success", data: null });
  },
);
```

### Routes

```ts
// Public: GET /api/v1/bundles
// Admin:  POST /api/v1/admin/bundles, DELETE /api/v1/admin/bundles/:id
```

---

## 26. Stripe Refund Processing on Return Approval

### Why

The `ReturnRequest` model (in `BACKEND_PRODUCTION_READY.md`) lets an admin approve a return,
but it never actually moves any money. Marking a return `APPROVED` without calling
`stripe.refunds.create` means the customer never gets their money back — a serious trust
and legal issue.

### How to implement — `backend/src/controller/returnController.ts`

Add to the top of the file:

```ts
import Stripe from "stripe";
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
```

Update `adminUpdateReturn` to trigger a refund when status changes to `APPROVED`:

```ts
export const adminUpdateReturn = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const { status, adminNote } = updateReturnSchema.parse(req.body);

    const existing = await prisma.returnRequest.findUnique({
      where:   { id: req.params.id },
      include: {
        order: {
          select: { stripeSessionId: true, total: true, status: true },
        },
      },
    });
    if (!existing) return next(new AppError("Return request not found", 404));

    // Process Stripe refund when approving
    if (status === "APPROVED" && existing.status === "PENDING") {
      const { stripeSessionId, total } = existing.order;

      if (!stripeSessionId) {
        return next(new AppError("No Stripe session found for this order — refund manually", 400));
      }

      try {
        // Retrieve the payment intent from the checkout session
        const session = await stripe.checkout.sessions.retrieve(stripeSessionId);
        const paymentIntentId = session.payment_intent as string;

        if (paymentIntentId) {
          await stripe.refunds.create({
            payment_intent: paymentIntentId,
            amount:         Math.round(total * 100),  // Stripe uses cents
            reason:         "requested_by_customer",
          });
        }
      } catch (err: any) {
        return next(new AppError(`Stripe refund failed: ${err.message}`, 502));
      }

      // Update order status to REFUNDED
      await prisma.order.update({
        where: { stripeSessionId },
        data:  { status: "REFUNDED" },
      });
    }

    const updated = await prisma.returnRequest.update({
      where: { id: req.params.id },
      data:  { status, adminNote },
    });

    res.status(200).json({ status: "success", data: { returnRequest: updated } });
  },
);
```

---

## 27. Admin Audit Log Viewer

### Why

The `AuditLog` table is written to by every admin action. There is currently no endpoint to
read it. Without a viewer, the audit log is completely invisible — it exists in the database
but no one can query it or investigate incidents through it.

### New controller — `backend/src/controller/auditLogController.ts`

```ts
import { Request, Response } from "express";
import catchAsync from "../utils/catchAsync";
import { prisma } from "../config/database";
import { getPagination } from "../utils/pagination";

export const getAuditLogs = catchAsync(
  async (req: Request, res: Response) => {
    const { page, limit, skip } = getPagination(req.query, { limit: 50, maxLimit: 100 });
    const { action, entityType, adminId } = req.query as Record<string, string>;

    const where: any = {};
    if (action)     where.action     = { contains: action,     mode: "insensitive" };
    if (entityType) where.entityType = { contains: entityType, mode: "insensitive" };
    if (adminId)    where.adminId    = adminId;

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take:    limit,
      }),
      prisma.auditLog.count({ where }),
    ]);

    res.status(200).json({
      status: "success",
      pagination: {
        page, limit, total,
        totalPages: Math.ceil(total / limit),
        hasNext:    page < Math.ceil(total / limit),
        hasPrev:    page > 1,
      },
      data: { logs },
    });
  },
);
```

### Route — add to `backend/src/Routes/Admin/adminRoutes.ts`

```ts
import { getAuditLogs } from "../../controller/auditLogController";

router.get("/audit-logs", getAuditLogs);
```

Endpoint: `GET /api/v1/admin/audit-logs?action=UPDATE_PRODUCT&page=1&limit=50`

---

## 28. Admin Bulk Actions

### Why

Managing 200+ products or orders one at a time through the API is impractical. Bulk
endpoints let the admin dashboard perform operations on a selection of records in one
request — delete multiple products, update multiple order statuses, export a filtered set.

### Bulk delete products — add to `backend/src/controller/productController.ts`

```ts
const bulkDeleteSchema = z.object({
  ids: z.array(z.string().uuid()).min(1).max(100),
});

export const bulkDeleteProducts = catchAsync(
  async (req: Request, res: Response, _next: NextFunction) => {
    const { ids } = bulkDeleteSchema.parse(req.body);

    const { count } = await prisma.products.deleteMany({
      where: { product_id: { in: ids } },
    });

    await scanDel("products:list:*");
    for (const id of ids) await redis.del(`product:${id}`);

    await logAudit({
      req, action: "BULK_DELETE_PRODUCTS",
      entityType: "Product", entityId: ids.join(","),
      after: { count },
    });

    res.status(200).json({ status: "success", data: { deleted: count } });
  },
);
```

### Bulk update order status — add to `backend/src/controller/orderController.ts`

```ts
const bulkUpdateOrderSchema = z.object({
  ids:    z.array(z.string().uuid()).min(1).max(50),
  status: z.nativeEnum(OrderStatus),
});

export const bulkUpdateOrders = catchAsync(
  async (req: Request, res: Response, _next: NextFunction) => {
    const { ids, status } = bulkUpdateOrderSchema.parse(req.body);

    const { count } = await prisma.order.updateMany({
      where: { id: { in: ids } },
      data:  { status },
    });

    res.status(200).json({ status: "success", data: { updated: count } });
  },
);
```

### Bulk export orders to CSV — add to `backend/src/controller/orderController.ts`

```ts
import { stringify } from "csv-stringify/sync";

export const exportOrdersCsv = catchAsync(
  async (req: Request, res: Response) => {
    const status = req.query.status as string | undefined;

    const orders = await prisma.order.findMany({
      where:   status ? { status: status as OrderStatus } : {},
      include: { user: { select: { name: true, email: true } } },
      orderBy: { createdAt: "desc" },
      take:    1000,
    });

    const rows = orders.map((o) => ({
      id:         o.id,
      customer:   o.user.name,
      email:      o.user.email,
      status:     o.status,
      total:      o.total,
      created_at: o.createdAt.toISOString(),
    }));

    const csv = stringify(rows, { header: true });

    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="orders-${Date.now()}.csv"`);
    res.status(200).send(csv);
  },
);
```

Install `csv-stringify`:
```bash
npm install csv-stringify
```

### Routes — add to `backend/src/Routes/Admin/adminRoutes.ts`

```ts
router.delete("/products/bulk",      bulkDeleteProducts);
router.patch("/orders/bulk-status",  bulkUpdateOrders);
router.get("/orders/export",         exportOrdersCsv);
```

---

## Part H — Operations & Analytics

---

## 29. Cron Jobs for Housekeeping

### Why

Several tables accumulate stale data over time with no cleanup:
- `resetToken` / `verifyToken` — expired tokens left on user rows forever
- `LoginSession` — old sessions pile up
- Abandoned carts — users who never returned
- Expired flash sales rows

BullMQ supports repeatable jobs (cron syntax). Since BullMQ is already in the project,
no new dependency is needed.

### New jobs file — `backend/src/jobs/housekeepingWorker.ts`

```ts
import { Queue, Worker } from "bullmq";
import { prisma } from "../config/database";
import { client as redis } from "../config/redis";
import logger from "../config/logger";

const housekeepingQueue = new Queue("housekeeping", { connection: redis as any });

// Schedule jobs on startup
export const scheduleHousekeeping = async (): Promise<void> => {
  // Purge expired tokens — run every day at 2 AM
  await housekeepingQueue.add(
    "purge-expired-tokens",
    {},
    { repeat: { pattern: "0 2 * * *" }, jobId: "purge-tokens" },
  );

  // Delete abandoned carts older than 30 days — run every Sunday at 3 AM
  await housekeepingQueue.add(
    "purge-abandoned-carts",
    {},
    { repeat: { pattern: "0 3 * * 0" }, jobId: "purge-carts" },
  );

  // Purge old login sessions (keep last 20 per user) — run daily at 4 AM
  await housekeepingQueue.add(
    "purge-old-sessions",
    {},
    { repeat: { pattern: "0 4 * * *" }, jobId: "purge-sessions" },
  );

  logger.info("Housekeeping jobs scheduled");
};

new Worker(
  "housekeeping",
  async (job) => {
    if (job.name === "purge-expired-tokens") {
      const now = new Date();
      const { count } = await prisma.user.updateMany({
        where: {
          OR: [
            { resetTokenExpiry:  { lt: now }, resetToken:  { not: null } },
            { verifyTokenExpiry: { lt: now }, verifyToken: { not: null } },
          ],
        },
        data: {
          resetToken:       null,
          resetTokenExpiry:  null,
          verifyToken:      null,
          verifyTokenExpiry: null,
        },
      });
      logger.info("Purged expired tokens", { count });
    }

    if (job.name === "purge-abandoned-carts") {
      const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const abandoned = await prisma.cart.findMany({
        where:  { updatedAt: { lt: cutoff } },
        select: { id: true },
      });
      await prisma.cartItem.deleteMany({
        where: { cartId: { in: abandoned.map((c) => c.id) } },
      });
      logger.info("Purged abandoned cart items", { carts: abandoned.length });
    }

    if (job.name === "purge-old-sessions") {
      // Keep only the 20 most recent sessions per user
      const users = await prisma.loginSession.groupBy({
        by: ["userId"],
        _count: { id: true },
        having: { id: { _count: { gt: 20 } } },
      });

      for (const u of users) {
        const sessions = await prisma.loginSession.findMany({
          where:   { userId: u.userId },
          orderBy: { createdAt: "desc" },
          skip:    20,
          select:  { id: true },
        });
        await prisma.loginSession.deleteMany({
          where: { id: { in: sessions.map((s) => s.id) } },
        });
      }
      logger.info("Purged old login sessions", { users: users.length });
    }
  },
  { connection: redis as any },
);
```

### Start in `backend/src/server.ts`

```ts
import { scheduleHousekeeping } from "./jobs/housekeepingWorker";

// Inside startServer(), after connectRedis():
await scheduleHousekeeping();
```

---

## 30. Abandoned Cart Recovery

### Why

On average 70% of ecommerce carts are abandoned. Sending a reminder email 24 hours later
with the cart contents recovers a meaningful percentage of those sales. BullMQ is already
in the project and is the right tool — schedule a delayed job when items are added to a cart
and cancel it if the user checks out.

### New jobs file — `backend/src/jobs/cartRecoveryWorker.ts`

```ts
import { Queue, Worker } from "bullmq";
import { prisma } from "../config/database";
import { client as redis } from "../config/redis";
import { emailQueue } from "./emailQueue";
import logger from "../config/logger";

export const cartRecoveryQueue = new Queue("cart-recovery", { connection: redis as any });

const JOB_DELAY_MS = 24 * 60 * 60 * 1000; // 24 hours

// Call this whenever a user adds an item to their cart
export const scheduleCartRecovery = async (userId: string): Promise<void> => {
  const jobId = `cart-recovery:${userId}`;

  // Remove any existing job for this user (reset the 24h window)
  await cartRecoveryQueue.remove(jobId);

  await cartRecoveryQueue.add(
    "send-recovery",
    { userId },
    { delay: JOB_DELAY_MS, jobId },
  );
};

// Call this when a user successfully checks out — cancel the recovery email
export const cancelCartRecovery = async (userId: string): Promise<void> => {
  await cartRecoveryQueue.remove(`cart-recovery:${userId}`);
};

new Worker(
  "cart-recovery",
  async (job) => {
    const { userId } = job.data as { userId: string };

    const cart = await prisma.cart.findUnique({
      where:   { userId },
      include: {
        items: {
          include: { product: { select: { name: true, image: true, price: true } } },
        },
      },
    });

    // Only send if cart still has items
    if (!cart || cart.items.length === 0) return;

    const user = await prisma.user.findUnique({
      where:  { id: userId },
      select: { email: true, name: true },
    });
    if (!user) return;

    await emailQueue.add("send-email", {
      email:    user.email,
      subject:  "You left something behind…",
      template: "cartRecovery",
      templateData: {
        name:      user.name,
        cartUrl:   `${process.env.FRONTEND_URL}/cart`,
        itemCount: String(cart.items.length),
        items:     cart.items.map((i) => ({
          name:  i.product.name,
          price: `$${i.product.price.toFixed(2)}`,
          qty:   String(i.quantity),
        })),
      },
    });

    logger.info("Cart recovery email sent", { userId });
  },
  { connection: redis as any },
);
```

### Wire into `backend/src/controller/cartController.ts`

```ts
import { scheduleCartRecovery } from "../jobs/cartRecoveryWorker";

// At the end of addItemToCart, after the transaction succeeds:
scheduleCartRecovery(userId).catch(() => {});
```

### Wire into order creation — cancel the recovery after checkout

```ts
import { cancelCartRecovery } from "../jobs/cartRecoveryWorker";

// After order is created:
cancelCartRecovery(userId).catch(() => {});
```

---

## 31. Inventory Movement Log

### Why

Currently there is no record of why stock changed. When you notice a product has 3 units
and expected 50, there is no way to trace whether it was sold, a correction, a return, or
an admin edit. An inventory log is essential for reconciliation and fraud detection.

### Schema change — `backend/prisma/schema.prisma`

```prisma
enum InventoryMovementType {
  SALE          // stock decremented by an order
  RETURN        // stock restored by a return
  ADJUSTMENT    // manual admin correction
  RESTOCK       // stock added by admin
  INITIAL       // first stock set on product creation
}

model InventoryMovement {
  id         String                @id @default(uuid())
  product_id String                @db.Uuid
  product    Products              @relation(fields: [product_id], references: [product_id], onDelete: Cascade)
  type       InventoryMovementType
  delta      Int                   // positive = stock added, negative = stock removed
  before     Int
  after      Int
  note       String?               // "Order #abc123", "Manual correction"
  userId     String?               // who triggered it (null = system)
  createdAt  DateTime              @default(now())

  @@index([product_id])
  @@index([product_id, createdAt(sort: Desc)])
}
```

Add on `Products`:
```prisma
inventoryMovements InventoryMovement[]
```

### Migration

```bash
npx prisma migrate dev --name add_inventory_movements
```

### New utility — `backend/src/utils/inventoryLog.ts`

```ts
import { prisma } from "../config/database";
import { InventoryMovementType } from "@prisma/client";
import logger from "../config/logger";

export const logInventoryMovement = async (
  product_id: string,
  delta:       number,
  type:        InventoryMovementType,
  options:     { note?: string; userId?: string } = {},
): Promise<void> => {
  try {
    const product = await prisma.products.findUnique({
      where:  { product_id },
      select: { stock: true },
    });
    if (!product) return;

    await prisma.inventoryMovement.create({
      data: {
        product_id,
        type,
        delta,
        before: product.stock,
        after:  product.stock + delta,
        note:   options.note,
        userId: options.userId,
      },
    });
  } catch {
    logger.warn("Failed to log inventory movement", { product_id, delta, type });
  }
};
```

### Wire into controllers

```ts
import { logInventoryMovement } from "../utils/inventoryLog";

// In order creation (when stock is decremented per order item):
await logInventoryMovement(item.product_id, -item.quantity, "SALE", {
  note:   `Order #${orderId}`,
  userId: userId,
});

// In updateProduct (when admin manually changes stock):
if (data.stock !== undefined && data.stock !== existingProduct.stock) {
  const delta = data.stock - existingProduct.stock;
  await logInventoryMovement(productId, delta, "ADJUSTMENT", {
    note:   "Admin manual adjustment",
    userId: req.user!.id,
  });
}
```

### Admin endpoint — add to `backend/src/Routes/Admin/adminRoutes.ts`

```ts
// GET /api/v1/admin/products/:id/inventory
router.get("/products/:id/inventory", async (req, res) => {
  const movements = await prisma.inventoryMovement.findMany({
    where:   { product_id: req.params.id },
    orderBy: { createdAt: "desc" },
    take:    100,
  });
  res.status(200).json({ status: "success", data: { movements } });
});
```

---

## 32. Shipping Carrier Tracking Integration

### Why

Once an order is marked `SHIPPED`, the customer has no way to track their package unless
you manually email them. Attaching a tracking number and carrier to the order and sending
an automated tracking email is a minimum expectation for any ecommerce store.

### Schema change — `backend/prisma/schema.prisma`

```prisma
model Order {
  // … existing fields …
  trackingNumber  String?
  trackingCarrier String?   // "DHL", "FedEx", "UPS", "USPS", "Royal Mail"
  trackingUrl     String?
}
```

### Migration

```bash
npx prisma migrate dev --name add_order_tracking
```

### Update admin order schema — `backend/src/Schema/orderSchema.ts`

```ts
export const updateOrderStatusSchema = z.object({
  status:          z.nativeEnum(OrderStatus, {
    message: `status must be one of: ${Object.values(OrderStatus).join(", ")}`,
  }),
  trackingNumber:  z.string().max(100).optional(),
  trackingCarrier: z.string().max(50).optional(),
  trackingUrl:     z.string().url().optional(),
});
```

### Update `updateOrder` controller — `backend/src/controller/orderController.ts`

```ts
export const updateOrder = catchAsync(
  async (req: Request, res: Response, _next: NextFunction) => {
    const { status, trackingNumber, trackingCarrier, trackingUrl } =
      updateOrderStatusSchema.parse(req.body);

    const updateData: any = { status };
    if (trackingNumber)  updateData.trackingNumber  = trackingNumber;
    if (trackingCarrier) updateData.trackingCarrier = trackingCarrier;
    if (trackingUrl)     updateData.trackingUrl     = trackingUrl;

    const order = await prisma.order.update({
      where:   { id: req.params.id },
      data:    updateData,
      include: { user: { select: { email: true, name: true } } },
    });

    // Send tracking email when marked as SHIPPED and tracking info is provided
    if (status === "SHIPPED" && trackingNumber) {
      await emailQueue.add("send-email", {
        email:    order.user.email,
        subject:  "Your Northline order has shipped!",
        template: "orderShipped",
        templateData: {
          name:           order.user.name,
          orderId:        order.id.slice(0, 8).toUpperCase(),
          trackingNumber,
          trackingCarrier: trackingCarrier ?? "your carrier",
          trackingUrl:     trackingUrl ?? "#",
        },
      }).catch(() => {});
    }

    res.status(200).json({ status: "success", data: { order } });
  },
);
```

### Email template — `backend/src/emails/templates/orderShipped.hbs`

```html
<html lang="en">
  <head><meta charset="utf-8" /><title>Your Order Has Shipped</title></head>
  <body style="margin:0; padding:0; background:#f4f4f4; font-family: -apple-system, sans-serif;">
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td align="center" style="padding:40px 0;">
          <table width="600" cellpadding="0" cellspacing="0"
            style="background:#fff; border-radius:8px;">
            <tr>
              <td style="background:#000; padding:24px 32px;">
                <h1 style="color:#fff; margin:0; font-size:24px;">Northline</h1>
              </td>
            </tr>
            <tr>
              <td style="padding:32px;">
                <h2 style="color:#111; margin:0 0 8px;">Your order is on its way, {{name}}!</h2>
                <p style="color:#555;">Order <strong>#{{orderId}}</strong> has been shipped.</p>
                <p style="color:#555;">
                  Carrier: <strong>{{trackingCarrier}}</strong><br>
                  Tracking: <strong>{{trackingNumber}}</strong>
                </p>
                <a href="{{trackingUrl}}"
                  style="display:inline-block; margin-top:16px; background:#16a34a;
                         color:#fff; padding:12px 24px; border-radius:8px;
                         text-decoration:none; font-weight:600;">
                  Track your package
                </a>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
```

---

## 33. Search Term Analytics

### Why

Knowing what your customers search for is one of the most valuable datasets you can collect.
It tells you what to stock, what to name products, and what categories are missing. Currently
searches happen but nothing is tracked.

### Schema change — `backend/prisma/schema.prisma`

```prisma
model SearchLog {
  id         String   @id @default(uuid())
  query      String
  userId     String?
  results    Int      // how many products were returned
  createdAt  DateTime @default(now())

  @@index([query])
  @@index([createdAt(sort: Desc)])
}
```

### Migration

```bash
npx prisma migrate dev --name add_search_logs
```

### Wire into `backend/src/controller/productController.ts`

At the end of `getAllProducts`, after building the response, fire-and-forget a log entry
when a search query is present:

```ts
// After building responseData, before res.status(200).json(...):
if (filters.search) {
  prisma.searchLog.create({
    data: {
      query:   filters.search,
      userId:  req.user?.id ?? null,
      results: total,
    },
  }).catch(() => {});
}
```

### Admin analytics endpoint — add to `backend/src/controller/adminAnalyticsController.ts`

```ts
export const getTopSearchTerms = catchAsync(
  async (req: Request, res: Response) => {
    const days = Number(req.query.days) || 30;
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const terms = await prisma.searchLog.groupBy({
      by:      ["query"],
      where:   { createdAt: { gte: since }, results: { gt: 0 } },
      _count:  { query: true },
      orderBy: { _count: { query: "desc" } },
      take:    50,
    });

    const zeroResults = await prisma.searchLog.groupBy({
      by:      ["query"],
      where:   { createdAt: { gte: since }, results: 0 },
      _count:  { query: true },
      orderBy: { _count: { query: "desc" } },
      take:    20,
    });

    res.status(200).json({
      status: "success",
      data: {
        topTerms:         terms.map((t) => ({ query: t.query, count: t._count.query })),
        zeroResultTerms:  zeroResults.map((t) => ({ query: t.query, count: t._count.query })),
      },
    });
  },
);
```

### Route — add to `backend/src/Routes/Admin/adminAnalyticsRoutes.ts`

```ts
router.get("/search-terms", getTopSearchTerms);
```

---

## 34. Conversion Funnel Tracking

### Why

You need to know where customers drop off: how many viewed a product, how many added it to
cart, how many started checkout, how many completed the purchase. Without this data you are
guessing at what to fix. This is tracked entirely in Redis — no DB schema needed.

### New utility — `backend/src/utils/funnel.ts`

```ts
import { client as redis } from "../config/redis";

type FunnelEvent = "product_view" | "add_to_cart" | "checkout_start" | "purchase";

const funnelKey = (event: FunnelEvent, date: string) =>
  `funnel:${event}:${date}`;

const today = () => new Date().toISOString().slice(0, 10); // "2026-06-11"

export const trackFunnelEvent = async (event: FunnelEvent): Promise<void> => {
  try {
    const key = funnelKey(event, today());
    await redis.incr(key);
    await redis.expire(key, 90 * 24 * 60 * 60); // keep 90 days of data
  } catch {
    // non-fatal
  }
};

export const getFunnelData = async (days = 7): Promise<Record<string, unknown>[]> => {
  const results = [];
  const events: FunnelEvent[] = ["product_view", "add_to_cart", "checkout_start", "purchase"];

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);

    const values = await Promise.all(
      events.map((e) => redis.get(funnelKey(e, date)).then(Number)),
    );

    results.push({
      date,
      product_view:    values[0],
      add_to_cart:     values[1],
      checkout_start:  values[2],
      purchase:        values[3],
    });
  }

  return results;
};
```

### Wire events into controllers

```ts
import { trackFunnelEvent } from "../utils/funnel";

// In getProduct (productController.ts):
trackFunnelEvent("product_view").catch(() => {});

// In addItemToCart (cartController.ts):
trackFunnelEvent("add_to_cart").catch(() => {});

// In createCheckoutSession (paymentController.ts):
trackFunnelEvent("checkout_start").catch(() => {});

// In the Stripe webhook on checkout.session.completed:
trackFunnelEvent("purchase").catch(() => {});
```

### Admin endpoint — add to `backend/src/Routes/Admin/adminAnalyticsRoutes.ts`

```ts
import { getFunnelData } from "../../utils/funnel";

router.get("/funnel", async (req, res) => {
  const days = Number(req.query.days) || 7;
  const data = await getFunnelData(days);
  res.status(200).json({ status: "success", data: { funnel: data } });
});
```

---

## Part I — Authentication & Compliance

---

## 35. Two-Factor Authentication (TOTP)

### Why

A username + password alone is not enough for accounts that hold payment methods, order
history, and personal addresses. TOTP (Time-based One-Time Password) is the most widely
supported second factor — it works with Google Authenticator, Authy, and any TOTP app,
requires no SMS infrastructure, and cannot be intercepted like SMS codes can.

### Install

```bash
npm install otplib qrcode
npm install -D @types/qrcode
```

### Schema change — `backend/prisma/schema.prisma`

```prisma
model User {
  // … existing fields …
  totpSecret    String?   // encrypted TOTP secret
  totpEnabled   Boolean   @default(false)
  totpVerified  Boolean   @default(false)  // true after user scans + confirms code
}
```

### Migration

```bash
npx prisma migrate dev --name add_totp
```

### New controller — `backend/src/controller/totpController.ts`

```ts
import { Request, Response, NextFunction } from "express";
import { authenticator } from "otplib";
import QRCode from "qrcode";
import catchAsync from "../utils/catchAsync";
import AppError from "../utils/AppError";
import { prisma } from "../config/database";
import logger from "../config/logger";
import { z } from "zod";

const verifySchema = z.object({ code: z.string().length(6) });

// Step 1 — generate secret and QR code for the user to scan
export const setupTotp = catchAsync(
  async (req: Request, res: Response) => {
    const user = req.user!;
    const secret = authenticator.generateSecret();

    const otpauth = authenticator.keyuri(user.email, "Northline", secret);
    const qrCode  = await QRCode.toDataURL(otpauth);

    // Store secret temporarily (unverified) until the user confirms a code
    await prisma.user.update({
      where: { id: user.id },
      data:  { totpSecret: secret, totpEnabled: false, totpVerified: false },
    });

    res.status(200).json({ status: "success", data: { qrCode, secret } });
  },
);

// Step 2 — user scans the QR and submits their first code to confirm it works
export const verifyTotpSetup = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const { code } = verifySchema.parse(req.body);
    const user = await prisma.user.findUnique({ where: { id: req.user!.id } });

    if (!user?.totpSecret) return next(new AppError("TOTP not set up", 400));

    const valid = authenticator.check(code, user.totpSecret);
    if (!valid) return next(new AppError("Invalid code", 400));

    await prisma.user.update({
      where: { id: user.id },
      data:  { totpEnabled: true, totpVerified: true },
    });

    logger.info("TOTP enabled", { userId: user.id });
    res.status(200).json({ status: "success", message: "2FA enabled" });
  },
);

// Step 3 — called during login when totpEnabled is true
export const validateTotpLogin = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const { code, userId } = req.body as { code: string; userId: string };

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user?.totpSecret || !user.totpEnabled)
      return next(new AppError("2FA not enabled for this account", 400));

    const valid = authenticator.check(code, user.totpSecret);
    if (!valid) return next(new AppError("Invalid 2FA code", 401));

    // Issue tokens — same as end of regular login flow
    res.status(200).json({ status: "success", message: "2FA verified" });
  },
);

// Disable TOTP
export const disableTotp = catchAsync(
  async (req: Request, res: Response) => {
    await prisma.user.update({
      where: { id: req.user!.id },
      data:  { totpSecret: null, totpEnabled: false, totpVerified: false },
    });
    logger.info("TOTP disabled", { userId: req.user!.id });
    res.status(200).json({ status: "success", message: "2FA disabled" });
  },
);
```

### Login flow change — `backend/src/controller/authController.ts`

After validating password and before issuing tokens, check if TOTP is enabled:

```ts
// After password check:
if (user.totpEnabled) {
  // Return a partial token or a temp flag instead of the full access token
  // The client must then POST /api/v1/auth/2fa/verify with the TOTP code
  return res.status(200).json({
    status:      "2fa_required",
    userId:      user.id,
    message:     "2FA code required",
  });
}
// Otherwise proceed with normal token issuance
```

### Routes — add to `backend/src/Routes/User/userRoutes.ts`

```ts
import { setupTotp, verifyTotpSetup, disableTotp } from "../../controller/totpController";
import { validateTotpLogin } from "../../controller/totpController";

router.post("/totp/setup",    Protect, setupTotp);
router.post("/totp/verify",   Protect, verifyTotpSetup);
router.delete("/totp",        Protect, disableTotp);
```

Add to `backend/src/Routes/User/authRoutes.ts`:

```ts
router.post("/2fa/verify", validateTotpLogin);
```

---

## 36. GDPR — User Data Export & Account Deletion

### Why

GDPR (and CCPA, LGPD) requires that any user can request all data held about them (right
to access) and request that their data be deleted (right to erasure). Ignoring this is a
legal liability. Building it properly — a JSON export of all related records — takes less
than an hour and protects the business.

### New controller — `backend/src/controller/gdprController.ts`

```ts
import { Request, Response } from "express";
import catchAsync from "../utils/catchAsync";
import { prisma } from "../config/database";
import logger from "../config/logger";

// Right to access — returns a JSON export of all user data
export const exportMyData = catchAsync(
  async (req: Request, res: Response) => {
    const userId = req.user!.id;

    const [user, orders, reviews, questions, wishlist, cart, sessions] =
      await Promise.all([
        prisma.user.findUnique({
          where:  { id: userId },
          select: {
            id: true, name: true, email: true, createdAt: true,
            // Omit password, tokens
          },
        }),
        prisma.order.findMany({
          where:   { userId },
          include: { items: true },
        }),
        prisma.review.findMany({ where: { userId } }),
        prisma.question.findMany({ where: { userId } }),
        prisma.wishlist.findMany({ where: { userId } }),
        prisma.cart.findUnique({
          where:   { userId },
          include: { items: true },
        }),
        prisma.loginSession.findMany({
          where:  { userId },
          select: { createdAt: true, ip: true, userAgent: true },
        }),
      ]);

    const export_ = {
      exportedAt:   new Date().toISOString(),
      profile:      user,
      orders,
      reviews,
      questions,
      wishlist,
      cart,
      loginSessions: sessions,
    };

    logger.info("GDPR data export requested", { userId });

    res.setHeader("Content-Type", "application/json");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="northline-data-${userId.slice(0, 8)}.json"`,
    );
    res.status(200).json(export_);
  },
);

// Right to erasure — deletes the account and all associated data
export const deleteMyAccount = catchAsync(
  async (req: Request, res: Response) => {
    const userId = req.user!.id;

    // Prisma cascade deletes handle related records (set up via onDelete: Cascade)
    await prisma.user.delete({ where: { id: userId } });

    logger.info("Account deleted (GDPR erasure)", { userId });
    res.status(204).json({ status: "success", data: null });
  },
);
```

### Routes — add to `backend/src/Routes/User/userRoutes.ts`

```ts
import { exportMyData, deleteMyAccount } from "../../controller/gdprController";

router.get("/me/export",   Protect, exportMyData);
router.delete("/me",       Protect, deleteMyAccount);
```

---

## 37. Account Deletion Cascade Cleanup

### Why

When a user deletes their account (item 36), Prisma's `onDelete: Cascade` handles most
related records automatically. But some things need explicit cleanup: Redis keys, BullMQ
jobs, cloud images. Without this, stale data persists in Redis and queued emails fire for
users who no longer exist.

### Cleanup utility — `backend/src/utils/accountCleanup.ts`

```ts
import { client as redis } from "../config/redis";
import { cartRecoveryQueue } from "../jobs/cartRecoveryWorker";
import logger from "../config/logger";

export const cleanupUserData = async (userId: string): Promise<void> => {
  try {
    // Remove Redis keys
    await Promise.all([
      redis.del(`refresh:${userId}`),
      redis.del(`refresh:family:*`),          // family keys contain familyId, not userId
      redis.del(`cart:recovery:${userId}`),
      redis.del(`recently_viewed:${userId}`),
    ]);

    // Cancel pending BullMQ recovery job
    await cartRecoveryQueue.remove(`cart-recovery:${userId}`);

    logger.info("Account data cleaned up from Redis and queues", { userId });
  } catch (err) {
    logger.warn("Partial failure during account cleanup", { userId, err });
  }
};
```

### Wire into `deleteMyAccount` controller

```ts
import { cleanupUserData } from "../utils/accountCleanup";

// In deleteMyAccount, before prisma.user.delete:
await cleanupUserData(userId);
await prisma.user.delete({ where: { id: userId } });
```

---

## Part J — Product Enrichment

---

## 38. Product Image Gallery

### Why

The `Products` model has a single `image` field. A real product typically needs 4–8 images
(front, back, detail shots, lifestyle). A gallery table solves this: one primary image on
the product row (for backwards compatibility with lists), and additional images in a child
table.

### Schema change — `backend/prisma/schema.prisma`

```prisma
model ProductImage {
  id         String   @id @default(uuid())
  product_id String   @db.Uuid
  product    Products @relation(fields: [product_id], references: [product_id], onDelete: Cascade)
  url        String
  altText    String?
  sortOrder  Int      @default(0)  // 0 = primary / first shown
  createdAt  DateTime @default(now())

  @@index([product_id, sortOrder])
}
```

Add on `Products`:
```prisma
images ProductImage[]
```

### Migration

```bash
npx prisma migrate dev --name add_product_images
```

### New controller — `backend/src/controller/productImageController.ts`

```ts
import { Request, Response, NextFunction } from "express";
import catchAsync from "../utils/catchAsync";
import AppError from "../utils/AppError";
import { prisma } from "../config/database";
import { z } from "zod";
import { uploadImage } from "../utils/cloudinary";  // your existing upload util

const addImageSchema = z.object({
  url:       z.string().url(),
  altText:   z.string().optional(),
  sortOrder: z.number().int().min(0).optional(),
});

export const getProductImages = catchAsync(
  async (req: Request, res: Response) => {
    const images = await prisma.productImage.findMany({
      where:   { product_id: req.params.id },
      orderBy: { sortOrder: "asc" },
    });
    res.status(200).json({ status: "success", data: { images } });
  },
);

export const adminAddProductImage = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const product = await prisma.products.findUnique({ where: { product_id: req.params.id } });
    if (!product) return next(new AppError("Product not found", 404));

    let url = req.body.url;

    // If a file is uploaded instead of a URL, upload to Cloudinary
    if (req.file) {
      url = await uploadImage(req.file.buffer);
    }

    if (!url) return next(new AppError("Image URL or file required", 400));

    const { altText, sortOrder } = addImageSchema.partial().parse(req.body);

    const image = await prisma.productImage.create({
      data: { product_id: req.params.id, url, altText, sortOrder: sortOrder ?? 0 },
    });

    res.status(201).json({ status: "success", data: { image } });
  },
);

export const adminDeleteProductImage = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const image = await prisma.productImage.findUnique({ where: { id: req.params.imageId } });
    if (!image) return next(new AppError("Image not found", 404));

    await prisma.productImage.delete({ where: { id: req.params.imageId } });
    res.status(204).json({ status: "success", data: null });
  },
);

export const adminReorderImages = catchAsync(
  async (req: Request, res: Response) => {
    // Accepts: [{ id: "uuid", sortOrder: 0 }, ...]
    const items = z.array(z.object({
      id:        z.string().uuid(),
      sortOrder: z.number().int().min(0),
    })).parse(req.body.order);

    await prisma.$transaction(
      items.map((item) =>
        prisma.productImage.update({
          where: { id: item.id },
          data:  { sortOrder: item.sortOrder },
        }),
      ),
    );

    res.status(200).json({ status: "success", message: "Images reordered" });
  },
);
```

### Routes

```ts
// Public: GET /api/v1/products/:id/images
// Admin: POST/DELETE/PATCH /api/v1/admin/products/:id/images
```

Add to `backend/src/Routes/User/productRoutes.ts`:
```ts
router.get("/:id/images", getProductImages);
```

Add to `backend/src/Routes/Admin/adminProductRoutes.ts`:
```ts
import { adminAddProductImage, adminDeleteProductImage, adminReorderImages }
  from "../../controller/productImageController";

router.post("/:id/images",                  upload.single("image"), adminAddProductImage);
router.delete("/:id/images/:imageId",       adminDeleteProductImage);
router.patch("/:id/images/reorder",         adminReorderImages);
```

---

## 39. Pre-Orders

### Why

When a popular product sells out, customers leave. Pre-orders let them commit to a purchase
before the stock arrives, guarantee revenue, and help you plan restocking quantities.
Implementation: add a `preOrder` flag to the product and allow orders when `stock = 0` if
the flag is set.

### Schema change — `backend/prisma/schema.prisma`

```prisma
model Products {
  // … existing fields …
  preOrder           Boolean   @default(false)
  preOrderEstimatedDate DateTime?  // when the customer can expect delivery
}

model Order {
  // … existing fields …
  isPreOrder Boolean @default(false)
}
```

### Migration

```bash
npx prisma migrate dev --name add_pre_orders
```

### Controller change — `backend/src/controller/orderController.ts`

Update the stock check in `createOrder` to allow pre-orders:

```ts
// When checking stock per item:
const product = await prisma.products.findUnique({ where: { product_id: item.product_id } });

if (!product) return next(new AppError(`Product not found: ${item.product_id}`, 404));

if (product.stock < item.quantity) {
  if (!product.preOrder) {
    return next(new AppError(`Insufficient stock for ${product.name}`, 400));
  }
  // Pre-order is allowed — continue, mark the order
  isPreOrder = true;
}
```

```ts
// In prisma.order.create:
const order = await prisma.order.create({
  data: {
    userId,
    total,
    status:     "PENDING",
    isPreOrder,  // ← ADD
    items: { create: orderItems },
  },
});
```

Send a pre-order confirmation email if `isPreOrder` is true (use the `orderStatus.hbs`
template with a note about estimated delivery).

---

## 40. Product Comparison Endpoint

### Why

Customers comparing two or three similar products (different sizes, brands, specs) currently
have to open multiple browser tabs and switch between them. A comparison endpoint returns the
data for N products in one response, structured for side-by-side display. It requires no
schema change — just a new controller and route.

### New controller — add to `backend/src/controller/productController.ts`

```ts
const compareSchema = z.object({
  ids: z.array(z.string().uuid()).min(2).max(4),
});

export const compareProducts = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const { ids } = compareSchema.parse(req.query.ids
      ? { ids: (req.query.ids as string).split(",") }
      : req.body,
    );

    const products = await prisma.products.findMany({
      where:   { product_id: { in: ids } },
      include: {
        category:  { select: { name: true } },
        variants:  true,
        images:    { orderBy: { sortOrder: "asc" }, take: 1 },
      },
    });

    if (products.length !== ids.length)
      return next(new AppError("One or more products not found", 404));

    // Return in the same order the caller requested
    const ordered = ids.map((id) =>
      products.find((p) => p.product_id === id),
    );

    res.status(200).json({ status: "success", data: { products: ordered } });
  },
);
```

### Route — add to `backend/src/Routes/User/productRoutes.ts`

```ts
router.get("/compare", compareProducts);
// Usage: GET /api/v1/products/compare?ids=uuid1,uuid2,uuid3
```

---

## 41. Digital & Downloadable Products

### Why

Physical products require inventory and shipping. Digital products (ebooks, templates,
software licences) have zero marginal cost and instant delivery. Adding support for digital
products means you can sell them alongside physical products without a separate system.

### Schema change — `backend/prisma/schema.prisma`

```prisma
model Products {
  // … existing fields …
  isDigital    Boolean @default(false)
  downloadFile String?   // Cloudinary URL or S3 key for the file
}

model DigitalDownload {
  id         String   @id @default(uuid())
  orderId    String
  order      Order    @relation(fields: [orderId], references: [id], onDelete: Cascade)
  product_id String   @db.Uuid
  product    Products @relation(fields: [product_id], references: [product_id])
  token      String   @unique  // secure random token for the download URL
  expiresAt  DateTime
  downloads  Int      @default(0)
  maxDownloads Int    @default(3)
  createdAt  DateTime @default(now())

  @@index([token])
  @@index([orderId])
}
```

Add on `Order`:
```prisma
digitalDownloads DigitalDownload[]
```

Add on `Products`:
```prisma
digitalDownloads DigitalDownload[]
```

### Migration

```bash
npx prisma migrate dev --name add_digital_products
```

### New controller — `backend/src/controller/digitalDownloadController.ts`

```ts
import { Request, Response, NextFunction } from "express";
import crypto from "crypto";
import catchAsync from "../utils/catchAsync";
import AppError from "../utils/AppError";
import { prisma } from "../config/database";
import logger from "../config/logger";

// Called internally after a digital order is paid (inside Stripe webhook)
export const createDownloadLinks = async (orderId: string): Promise<void> => {
  const order = await prisma.order.findUnique({
    where:   { id: orderId },
    include: { items: { include: { product: true } } },
  });
  if (!order) return;

  const digitalItems = order.items.filter((i) => i.product.isDigital);

  for (const item of digitalItems) {
    const token     = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    await prisma.digitalDownload.create({
      data: {
        orderId:      order.id,
        product_id:   item.product_id,
        token,
        expiresAt,
        maxDownloads: 3,
      },
    });

    logger.info("Download link created", { orderId, productId: item.product_id });
  }
};

// Public download endpoint — validates token, streams the file
export const downloadFile = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const { token } = req.params;

    const link = await prisma.digitalDownload.findUnique({
      where:   { token },
      include: { product: { select: { name: true, downloadFile: true } } },
    });

    if (!link) return next(new AppError("Download link not found", 404));
    if (link.expiresAt < new Date())
      return next(new AppError("This download link has expired", 410));
    if (link.downloads >= link.maxDownloads)
      return next(new AppError("Download limit reached for this link", 403));

    await prisma.digitalDownload.update({
      where: { id: link.id },
      data:  { downloads: { increment: 1 } },
    });

    // Redirect to the signed file URL (Cloudinary/S3)
    const fileUrl = link.product.downloadFile!;
    logger.info("File downloaded", { token, productName: link.product.name });
    res.redirect(302, fileUrl);
  },
);
```

### Route — add to `backend/src/app.ts`

```ts
import { downloadFile } from "./controller/digitalDownloadController";

// Public, no auth — the token is the auth
app.get("/download/:token", downloadFile);
```

---

## Part K — Payments & Loyalty

---

## 42. Subscription Products via Stripe Billing

### Why

Consumables (coffee, supplements, razors) and services are natural candidates for recurring
orders — "subscribe and save" is standard in ecommerce. Stripe Billing handles the recurring
charge, dunning (failed payment retries), and proration automatically. You only need to
store the subscription reference and handle the webhook events.

### Install

```bash
npm install stripe  # already installed if you use Stripe for checkout
```

### Schema change — `backend/prisma/schema.prisma`

```prisma
model Products {
  // … existing fields …
  isSubscription      Boolean  @default(false)
  stripePriceId       String?  // Stripe Price ID for the subscription (created in Stripe dashboard)
  subscriptionInterval String? // "month" | "week" | "year"
}

model Subscription {
  id                   String    @id @default(uuid())
  userId               String
  user                 User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  product_id           String    @db.Uuid
  product              Products  @relation(fields: [product_id], references: [product_id])
  stripeSubscriptionId String    @unique
  stripeCustomerId     String
  status               String    // "active" | "past_due" | "canceled" | "trialing"
  currentPeriodEnd     DateTime
  createdAt            DateTime  @default(now())
  updatedAt            DateTime  @updatedAt

  @@index([userId])
  @@index([stripeSubscriptionId])
}
```

Add on `User`:
```prisma
subscriptions Subscription[]
```

Add on `Products`:
```prisma
subscriptions Subscription[]
```

### Migration

```bash
npx prisma migrate dev --name add_subscriptions
```

### New controller — `backend/src/controller/subscriptionController.ts`

```ts
import { Request, Response, NextFunction } from "express";
import Stripe from "stripe";
import catchAsync from "../utils/catchAsync";
import AppError from "../utils/AppError";
import { prisma } from "../config/database";
import logger from "../config/logger";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export const createSubscription = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const { productId } = req.body as { productId: string };
    const userId = req.user!.id;

    const product = await prisma.products.findUnique({ where: { product_id: productId } });
    if (!product?.isSubscription || !product.stripePriceId)
      return next(new AppError("Product is not available as a subscription", 400));

    const user = await prisma.user.findUnique({
      where:  { id: userId },
      select: { email: true, name: true },
    });

    // Create or retrieve Stripe customer
    let stripeCustomer = await stripe.customers.list({ email: user!.email, limit: 1 });
    let customerId: string;

    if (stripeCustomer.data.length > 0) {
      customerId = stripeCustomer.data[0].id;
    } else {
      const customer = await stripe.customers.create({ email: user!.email, name: user!.name });
      customerId = customer.id;
    }

    // Create a Stripe Checkout Session for the subscription
    const session = await stripe.checkout.sessions.create({
      mode:       "subscription",
      customer:   customerId,
      line_items: [{ price: product.stripePriceId, quantity: 1 }],
      success_url: `${process.env.FRONTEND_URL}/subscription/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url:  `${process.env.FRONTEND_URL}/products/${productId}`,
      metadata:    { userId, productId },
    });

    res.status(200).json({ status: "success", data: { url: session.url } });
  },
);

export const cancelSubscription = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const sub = await prisma.subscription.findUnique({
      where: { id: req.params.id },
    });

    if (!sub || sub.userId !== req.user!.id)
      return next(new AppError("Subscription not found", 404));

    // Cancel at period end (not immediately) — customer keeps access until billing date
    await stripe.subscriptions.update(sub.stripeSubscriptionId, {
      cancel_at_period_end: true,
    });

    await prisma.subscription.update({
      where: { id: sub.id },
      data:  { status: "canceled" },
    });

    logger.info("Subscription cancelled", { userId: req.user!.id, subId: sub.id });
    res.status(200).json({ status: "success", message: "Subscription will cancel at period end" });
  },
);

// Handle Stripe webhook — add to existing webhook handler
export const handleSubscriptionWebhook = async (event: Stripe.Event): Promise<void> => {
  if (event.type === "customer.subscription.updated" ||
      event.type === "customer.subscription.deleted") {
    const stripeSub = event.data.object as Stripe.Subscription;

    await prisma.subscription.updateMany({
      where: { stripeSubscriptionId: stripeSub.id },
      data:  {
        status:          stripeSub.status,
        currentPeriodEnd: new Date(stripeSub.current_period_end * 1000),
      },
    });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.CheckoutSession;
    if (session.mode !== "subscription") return;

    const { userId, productId } = session.metadata ?? {};
    if (!userId || !productId) return;

    const stripeSub = await stripe.subscriptions.retrieve(
      session.subscription as string,
    );

    await prisma.subscription.create({
      data: {
        userId,
        product_id:          productId,
        stripeSubscriptionId: stripeSub.id,
        stripeCustomerId:    session.customer as string,
        status:              stripeSub.status,
        currentPeriodEnd:    new Date(stripeSub.current_period_end * 1000),
      },
    });

    logger.info("Subscription created via webhook", { userId, productId });
  }
};
```

### Routes — add to `backend/src/Routes/User/userRoutes.ts`

```ts
import { createSubscription, cancelSubscription } from "../../controller/subscriptionController";

router.post("/subscriptions",           Protect, createSubscription);
router.delete("/subscriptions/:id",     Protect, cancelSubscription);
router.get("/subscriptions",            Protect, async (req, res) => {
  const subs = await prisma.subscription.findMany({
    where:   { userId: req.user!.id },
    include: { product: { select: { name: true, image: true } } },
  });
  res.status(200).json({ status: "success", data: { subscriptions: subs } });
});
```

---

## 43. Loyalty Points System

### Why

Loyalty points are one of the most cost-effective retention tools in ecommerce. Customers
who earn points come back to spend them, and the cost is a small fraction of their lifetime
value. Points are earned on purchases and redeemed at checkout as a discount.

### Schema change — `backend/prisma/schema.prisma`

```prisma
model LoyaltyPoints {
  id        String   @id @default(uuid())
  userId    String   @unique
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  balance   Int      @default(0)
  lifetime  Int      @default(0)  // total ever earned (for tier status)
  updatedAt DateTime @updatedAt
}

model PointsTransaction {
  id        String   @id @default(uuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  delta     Int      // positive = earned, negative = redeemed
  reason    String   // "Purchase #abc123", "Redemption for order #xyz"
  orderId   String?
  createdAt DateTime @default(now())

  @@index([userId])
}
```

Add on `User`:
```prisma
loyalty           LoyaltyPoints?
pointsTransactions PointsTransaction[]
```

### Migration

```bash
npx prisma migrate dev --name add_loyalty_points
```

### New utility — `backend/src/utils/loyaltyPoints.ts`

```ts
import { prisma } from "../config/database";
import logger from "../config/logger";

const POINTS_PER_DOLLAR = 10;      // earn 10 points per $1 spent
const POINTS_TO_DOLLAR  = 100;     // 100 points = $1 discount

export const earnPoints = async (
  userId: string,
  orderTotal: number,
  orderId: string,
): Promise<void> => {
  const delta = Math.floor(orderTotal * POINTS_PER_DOLLAR);
  if (delta <= 0) return;

  await prisma.$transaction([
    prisma.loyaltyPoints.upsert({
      where:  { userId },
      create: { userId, balance: delta, lifetime: delta },
      update: { balance: { increment: delta }, lifetime: { increment: delta } },
    }),
    prisma.pointsTransaction.create({
      data: { userId, delta, reason: `Purchase #${orderId.slice(0, 8)}`, orderId },
    }),
  ]);

  logger.info("Loyalty points earned", { userId, delta, orderId });
};

export const redeemPoints = async (
  userId: string,
  points: number,
  orderId: string,
): Promise<number> => {
  const wallet = await prisma.loyaltyPoints.findUnique({ where: { userId } });
  if (!wallet || wallet.balance < points) {
    throw new Error("Insufficient loyalty points");
  }

  const discount = points / POINTS_TO_DOLLAR;

  await prisma.$transaction([
    prisma.loyaltyPoints.update({
      where: { userId },
      data:  { balance: { decrement: points } },
    }),
    prisma.pointsTransaction.create({
      data: { userId, delta: -points, reason: `Redemption for order #${orderId.slice(0, 8)}`, orderId },
    }),
  ]);

  return discount;
};
```

### Wire into controllers

```ts
import { earnPoints } from "../utils/loyaltyPoints";

// In createOrder, after the order is successfully created:
earnPoints(userId, total, order.id).catch(() => {});
```

### Routes — add to `backend/src/Routes/User/userRoutes.ts`

```ts
router.get("/me/loyalty", Protect, async (req, res) => {
  const wallet = await prisma.loyaltyPoints.findUnique({
    where: { userId: req.user!.id },
  });
  res.status(200).json({ status: "success", data: { wallet } });
});

router.get("/me/loyalty/history", Protect, async (req, res) => {
  const transactions = await prisma.pointsTransaction.findMany({
    where:   { userId: req.user!.id },
    orderBy: { createdAt: "desc" },
    take:    50,
  });
  res.status(200).json({ status: "success", data: { transactions } });
});
```

---

## 44. Referral Codes & Commission Tracking

### Why

Word-of-mouth is the cheapest customer acquisition channel. A referral system gives every
user a unique code they share with friends. When a friend signs up using that code, the
referrer earns a reward (store credit, points, or a coupon). This is a flywheel: each new
customer can become a recruiter.

### Schema change — `backend/prisma/schema.prisma`

```prisma
model Referral {
  id           String   @id @default(uuid())
  referrerId   String
  referrer     User     @relation("ReferralsSent", fields: [referrerId], references: [id], onDelete: Cascade)
  referredId   String   @unique
  referred     User     @relation("ReferralReceived", fields: [referredId], references: [id], onDelete: Cascade)
  code         String
  rewardIssued Boolean  @default(false)
  createdAt    DateTime @default(now())

  @@index([referrerId])
  @@index([code])
}

model User {
  // … existing fields …
  referralCode  String  @unique @default(cuid())  // auto-generated on user creation
  referralsSent Referral[] @relation("ReferralsSent")
  referralReceivedBy Referral? @relation("ReferralReceived")
}
```

### Migration

```bash
npx prisma migrate dev --name add_referrals
```

### New controller — `backend/src/controller/referralController.ts`

```ts
import { Request, Response, NextFunction } from "express";
import catchAsync from "../utils/catchAsync";
import { prisma } from "../config/database";
import { earnPoints } from "../utils/loyaltyPoints";
import logger from "../config/logger";

const REFERRAL_REWARD_POINTS = 500;  // reward when referred user places first order

export const getMyReferralCode = catchAsync(
  async (req: Request, res: Response) => {
    const user = await prisma.user.findUnique({
      where:  { id: req.user!.id },
      select: { referralCode: true },
    });
    const referralUrl = `${process.env.FRONTEND_URL}/register?ref=${user!.referralCode}`;
    res.status(200).json({ status: "success", data: { referralCode: user!.referralCode, referralUrl } });
  },
);

// Called during registration when ?ref= is present
export const applyReferralCode = async (
  newUserId: string,
  code: string,
): Promise<void> => {
  const referrer = await prisma.user.findUnique({ where: { referralCode: code } });
  if (!referrer || referrer.id === newUserId) return;

  await prisma.referral.create({
    data: { referrerId: referrer.id, referredId: newUserId, code },
  });

  logger.info("Referral tracked", { referrerId: referrer.id, referredId: newUserId });
};

// Called after referred user's first completed order
export const issueReferralReward = async (userId: string): Promise<void> => {
  const referral = await prisma.referral.findFirst({
    where: { referredId: userId, rewardIssued: false },
  });
  if (!referral) return;

  await earnPoints(referral.referrerId, 0, "referral");  // direct points grant
  // Alternatively use prisma.$transaction to grant exact points:
  await prisma.$transaction([
    prisma.loyaltyPoints.upsert({
      where:  { userId: referral.referrerId },
      create: { userId: referral.referrerId, balance: REFERRAL_REWARD_POINTS, lifetime: REFERRAL_REWARD_POINTS },
      update: { balance: { increment: REFERRAL_REWARD_POINTS }, lifetime: { increment: REFERRAL_REWARD_POINTS } },
    }),
    prisma.referral.update({
      where: { id: referral.id },
      data:  { rewardIssued: true },
    }),
  ]);

  logger.info("Referral reward issued", { referrerId: referral.referrerId, points: REFERRAL_REWARD_POINTS });
};
```

### Routes — add to `backend/src/Routes/User/userRoutes.ts`

```ts
import { getMyReferralCode } from "../../controller/referralController";

router.get("/me/referral", Protect, getMyReferralCode);
```

---

## Part L — Observability

---

## 45. OpenAPI / Swagger Documentation

### Why

Without API documentation, every frontend developer must read the Express source code to
understand what endpoints exist, what parameters they accept, and what they return.
Swagger UI gives you an interactive browser-based documentation page generated from your
code — no manual maintenance.

### Install

```bash
npm install swagger-ui-express swagger-jsdoc
npm install -D @types/swagger-ui-express @types/swagger-jsdoc
```

### New config — `backend/src/config/swagger.ts`

```ts
import swaggerJsdoc from "swagger-jsdoc";

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title:       "Northline API",
      version:     "1.0.0",
      description: "Northline Ecommerce REST API",
    },
    servers: [
      { url: process.env.API_URL ?? "http://localhost:3000", description: "API server" },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type:   "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
    },
    security: [{ bearerAuth: [] }],
  },
  apis: ["./src/Routes/**/*.ts", "./src/controller/**/*.ts"],
};

export const swaggerSpec = swaggerJsdoc(options);
```

### Register in `backend/src/app.ts`

```ts
import swaggerUi from "swagger-ui-express";
import { swaggerSpec } from "./config/swagger";

// Only expose in non-production, or protect it behind admin auth
if (process.env.NODE_ENV !== "production") {
  app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
  app.get("/api-docs.json", (_req, res) => res.json(swaggerSpec));
}
```

### Example JSDoc annotation on a route

```ts
/**
 * @swagger
 * /api/v1/products:
 *   get:
 *     summary: Get all products
 *     tags: [Products]
 *     parameters:
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *         description: Search by product name
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *     responses:
 *       200:
 *         description: List of products
 */
router.get("/", getAllProducts);
```

---

## 46. Prometheus Metrics Endpoint

### Why

Without metrics, you have no insight into how the API performs under load. Prometheus
scrapes a `/metrics` endpoint and stores time-series data. Grafana reads from Prometheus
and displays dashboards. This is the standard observability stack for production Node.js
APIs.

### Install

```bash
npm install prom-client
```

### New config — `backend/src/config/metrics.ts`

```ts
import client from "prom-client";

// Enable default metrics (CPU, memory, event loop lag, GC)
client.collectDefaultMetrics({ prefix: "northline_" });

// Custom metrics
export const httpRequestDuration = new client.Histogram({
  name:       "northline_http_request_duration_seconds",
  help:       "Duration of HTTP requests in seconds",
  labelNames: ["method", "route", "status_code"],
  buckets:    [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5],
});

export const httpRequestsTotal = new client.Counter({
  name:       "northline_http_requests_total",
  help:       "Total number of HTTP requests",
  labelNames: ["method", "route", "status_code"],
});

export const activeConnections = new client.Gauge({
  name: "northline_active_connections",
  help: "Number of active HTTP connections",
});

export const register = client.register;
```

### Metrics middleware — `backend/src/middleware/metricsMiddleware.ts`

```ts
import { Request, Response, NextFunction } from "express";
import { httpRequestDuration, httpRequestsTotal } from "../config/metrics";

export const metricsMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  const start = Date.now();

  res.on("finish", () => {
    const duration = (Date.now() - start) / 1000;
    const route    = req.route?.path ?? req.path;
    const labels   = {
      method:      req.method,
      route,
      status_code: String(res.statusCode),
    };

    httpRequestDuration.observe(labels, duration);
    httpRequestsTotal.inc(labels);
  });

  next();
};
```

### Register in `backend/src/app.ts`

```ts
import { register } from "./config/metrics";
import { metricsMiddleware } from "./middleware/metricsMiddleware";

app.use(metricsMiddleware);

// Prometheus scrape endpoint — restrict to internal network in production
app.get("/metrics", async (_req, res) => {
  res.set("Content-Type", register.contentType);
  res.end(await register.metrics());
});
```

---

## 47. Distributed Tracing with OpenTelemetry

### Why

When a request touches 5+ services (Express → Prisma → Redis → BullMQ → Email), logs from
each are disconnected. Distributed tracing attaches a trace ID to every request, links all
spans across systems, and lets you visualise the full request lifecycle — including which
database query caused a slow response.

### Install

```bash
npm install @opentelemetry/sdk-node @opentelemetry/auto-instrumentations-node
npm install @opentelemetry/exporter-trace-otlp-http
```

### New file — `backend/src/tracing.ts`

This **must** be imported before any other module, so it instruments from the start.

```ts
import { NodeSDK } from "@opentelemetry/sdk-node";
import { getNodeAutoInstrumentations } from "@opentelemetry/auto-instrumentations-node";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";

const traceExporter = new OTLPTraceExporter({
  url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT ?? "http://localhost:4318/v1/traces",
});

const sdk = new NodeSDK({
  traceExporter,
  instrumentations: [
    getNodeAutoInstrumentations({
      // Instrument Express, Prisma (via pg), Redis, HTTP outbound
      "@opentelemetry/instrumentation-fs": { enabled: false }, // too noisy
    }),
  ],
  serviceName: "northline-api",
});

sdk.start();

process.on("SIGTERM", () => {
  sdk.shutdown().catch(console.error);
});
```

### Import in `backend/src/server.ts` — **first line**

```ts
import "./tracing";  // must be first
import app from "./app";
// … rest of server.ts
```

### Add to `.env`

```env
# Jaeger, Tempo, or any OTLP-compatible backend
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318/v1/traces
```

### Run Jaeger locally for development

```bash
docker run -d --name jaeger \
  -p 16686:16686 \
  -p 4318:4318 \
  jaegertracing/all-in-one:latest
# Open http://localhost:16686 to view traces
```

---

## Part M — Infrastructure

---

## 48. PgBouncer Connection Pooling

### Why

Prisma opens a new PostgreSQL connection for every application process. A typical Node.js
app with 4 workers and 10 concurrent requests can exhaust PostgreSQL's default
`max_connections = 100` in seconds. PgBouncer sits between your app and Postgres and pools
connections, allowing thousands of application connections to share a small number of
actual database connections.

### Setup with Docker Compose — add to `docker-compose.yml`

```yaml
  pgbouncer:
    image: bitnami/pgbouncer:latest
    environment:
      POSTGRESQL_HOST:         db
      POSTGRESQL_PORT:         5432
      POSTGRESQL_USERNAME:     postgres
      POSTGRESQL_PASSWORD:     password
      POSTGRESQL_DATABASE:     northline
      PGBOUNCER_PORT:          6432
      PGBOUNCER_POOL_MODE:     transaction   # best for Prisma
      PGBOUNCER_MAX_CLIENT_CONN: 1000
      PGBOUNCER_DEFAULT_POOL_SIZE: 25
    ports:
      - "6432:6432"
    depends_on:
      - db
```

### Update `DATABASE_URL` to point to PgBouncer

```env
DATABASE_URL=postgres://postgres:password@pgbouncer:6432/northline
```

### Prisma config change — `backend/prisma/schema.prisma`

```prisma
datasource db {
  provider          = "postgresql"
  url               = env("DATABASE_URL")
  directUrl         = env("DIRECT_DATABASE_URL")  // used for migrations only
}
```

Add to `.env`:
```env
# PgBouncer (application traffic)
DATABASE_URL=postgres://postgres:password@pgbouncer:6432/northline

# Direct Postgres connection (migrations, introspection — bypasses PgBouncer)
DIRECT_DATABASE_URL=postgres://postgres:password@db:5432/northline
```

The `directUrl` is critical: Prisma migrations use `DIRECT_DATABASE_URL` to connect
directly (not through PgBouncer) since `pgbouncer=true` mode does not support `SET`
statements that migrations rely on.

---

## 49. Sitemap Generation

### Why

Search engines discover your pages through sitemaps. Without one, Google only crawls pages
it finds via links. For a store with 500 products, a sitemap guarantees all product pages
are indexed. It requires no schema change — it reads your existing product data and
generates XML on the fly.

### Install

```bash
npm install sitemap
```

### New controller — `backend/src/controller/sitemapController.ts`

```ts
import { Request, Response } from "express";
import { SitemapStream, streamToPromise } from "sitemap";
import { Readable } from "stream";
import catchAsync from "../utils/catchAsync";
import { prisma } from "../config/database";

const BASE_URL = process.env.FRONTEND_URL ?? "https://northline.store";

export const getSitemap = catchAsync(async (_req: Request, res: Response) => {
  const [products, categories] = await Promise.all([
    prisma.products.findMany({
      where:   { availability: true },
      select:  { product_id: true, slug: true, updatedAt: true },
    }),
    prisma.category.findMany({
      select: { category_id: true, name: true },
    }),
  ]);

  const links = [
    // Static pages
    { url: "/",            changefreq: "daily",   priority: 1.0 },
    { url: "/products",    changefreq: "daily",   priority: 0.9 },
    { url: "/about",       changefreq: "monthly", priority: 0.5 },
    { url: "/contact",     changefreq: "monthly", priority: 0.5 },

    // Product pages
    ...products.map((p) => ({
      url:        `/products/${p.slug ?? p.product_id}`,
      lastmod:    p.updatedAt.toISOString(),
      changefreq: "weekly" as const,
      priority:   0.8,
    })),

    // Category pages
    ...categories.map((c) => ({
      url:        `/products?category=${c.category_id}`,
      changefreq: "weekly" as const,
      priority:   0.7,
    })),
  ];

  const stream = new SitemapStream({ hostname: BASE_URL });
  const xml    = await streamToPromise(Readable.from(links).pipe(stream));

  res.header("Content-Type", "application/xml");
  res.status(200).send(xml.toString());
});
```

### Register in `backend/src/app.ts`

```ts
import { getSitemap } from "./controller/sitemapController";

app.get("/sitemap.xml", getSitemap);
```

---

## 50. Order Invoice PDF Generation

### Why

Customers need invoices for expense claims, VAT reclaim, and personal records. Emailing a
PDF invoice after purchase is standard ecommerce behaviour and reduces support requests
("can you send me my receipt?"). `pdfkit` is a lightweight pure-Node PDF library — no
headless browser needed.

### Install

```bash
npm install pdfkit
npm install -D @types/pdfkit
```

### New controller — `backend/src/controller/invoiceController.ts`

```ts
import { Request, Response, NextFunction } from "express";
import PDFDocument from "pdfkit";
import catchAsync from "../utils/catchAsync";
import AppError from "../utils/AppError";
import { prisma } from "../config/database";

export const downloadInvoice = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const order = await prisma.order.findUnique({
      where:   { id: req.params.id },
      include: {
        user:  { select: { name: true, email: true } },
        items: { include: { product: { select: { name: true, price: true } } } },
      },
    });

    if (!order) return next(new AppError("Order not found", 404));

    // Only the order owner or an admin can download the invoice
    if (order.userId !== req.user!.id && req.user!.role !== "ADMIN")
      return next(new AppError("Not authorised", 403));

    const doc = new PDFDocument({ margin: 50 });
    const filename = `northline-invoice-${order.id.slice(0, 8).toUpperCase()}.pdf`;

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    doc.pipe(res);

    // Header
    doc.fontSize(20).text("Northline", 50, 50);
    doc.fontSize(10).text("northline.store", 50, 75).moveDown();

    // Invoice details
    doc.fontSize(14).text("Invoice", { align: "right" });
    doc.fontSize(10)
      .text(`Order ID: #${order.id.slice(0, 8).toUpperCase()}`, { align: "right" })
      .text(`Date: ${order.createdAt.toLocaleDateString("en-GB")}`,  { align: "right" })
      .text(`Status: ${order.status}`, { align: "right" })
      .moveDown();

    // Bill to
    doc.fontSize(12).text("Bill To:");
    doc.fontSize(10)
      .text(order.user.name)
      .text(order.user.email)
      .moveDown();

    // Line items table
    doc.fontSize(12).text("Items");
    doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
    doc.moveDown(0.5);

    for (const item of order.items) {
      const lineTotal = (item.product.price * item.quantity).toFixed(2);
      doc.fontSize(10)
        .text(item.product.name, 50, doc.y, { width: 300 })
        .text(`x${item.quantity}`, 360, doc.y - doc.currentLineHeight(), { width: 60 })
        .text(`$${lineTotal}`, 440, doc.y - doc.currentLineHeight(), { width: 80, align: "right" });
    }

    doc.moveDown();
    doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
    doc.moveDown(0.5);
    doc.fontSize(12).text(`Total: $${order.total.toFixed(2)}`, { align: "right" });

    doc.end();
  },
);
```

### Route — add to `backend/src/Routes/User/orderRoutes.ts`

```ts
import { downloadInvoice } from "../../controller/invoiceController";

router.get("/:id/invoice", Protect, downloadInvoice);
// GET /api/v1/orders/:id/invoice
```

---

## Implementation Priority

| # | Item | Category | Effort | Do first? |
|---|------|----------|--------|-----------|
| 2 | Pagination utility | Cleanup | 15 min | Yes |
| 1 | API response helper | Cleanup | 20 min | Yes |
| 3 | Cache key registry | Cleanup | 20 min | Yes |
| 5 | Log sanitisation | Security | 20 min | Yes |
| 6 | Helmet CSP | Security | 15 min | Yes |
| 9 | Fix N+1 queries | Performance | 30 min | Yes |
| 27 | Admin audit log viewer | Feature | 15 min | Yes — table already exists |
| 34 | Conversion funnel | Analytics | 20 min | Yes — Redis only, no migration |
| 33 | Search term analytics | Analytics | 25 min | Yes — small migration |
| 40 | Product comparison | Feature | 20 min | Yes — no migration, no new dep |
| 50 | PDF invoice | Feature | 30 min | Yes — high customer value, quick |
| 10 | Recently viewed | Feature | 30 min | Yes — no migration |
| 11 | Recommendations | Feature | 20 min | Yes — no migration |
| 8 | ETag caching | Performance | 20 min | Soon |
| 13 | Low stock alerts | Operations | 25 min | Soon |
| 21 | Order delivery notes | Feature | 20 min | Soon — small migration |
| 22 | Product slug | Feature | 30 min | Soon — migration + backfill |
| 29 | Cron housekeeping | Operations | 30 min | Soon |
| 30 | Abandoned cart | Feature | 40 min | Soon |
| 36 | GDPR data export | Compliance | 30 min | Soon — legal requirement |
| 37 | Account deletion cleanup | Compliance | 20 min | Soon — pair with #36 |
| 45 | Swagger docs | Observability | 30 min | Soon — helps frontend devs |
| 46 | Prometheus metrics | Observability | 30 min | Soon |
| 49 | Sitemap generation | SEO | 25 min | Soon |
| 31 | Inventory log | Operations | 40 min | Next sprint |
| 32 | Shipping tracking | Feature | 45 min | Next sprint |
| 38 | Product image gallery | Feature | 45 min | Next sprint |
| 39 | Pre-orders | Feature | 30 min | Next sprint |
| 43 | Loyalty points | Feature | 45 min | Next sprint |
| 12 | Flash sales | Feature | 60 min | Next sprint |
| 14 | CSV import | Feature | 45 min | Next sprint |
| 28 | Admin bulk actions | Feature | 50 min | Next sprint |
| 26 | Stripe refunds | Feature | 30 min | Next sprint |
| 23 | Nested categories | Feature | 40 min | Next sprint |
| 20 | Variants in cart | Feature | 60 min | Next sprint |
| 24 | Gift cards | Feature | 60 min | Future |
| 25 | Product bundles | Feature | 60 min | Future |
| 41 | Digital products | Feature | 60 min | Future |
| 42 | Stripe Billing subs | Feature | 90 min | Future |
| 44 | Referral codes | Feature | 60 min | Future |
| 35 | TOTP 2FA | Security | 60 min | Future |
| 17 | Google/GitHub OAuth | Security | 90 min | Future |
| 18 | API key auth | Security | 60 min | Future |
| 19 | Token family tracking | Security | 45 min | Future |
| 47 | OpenTelemetry tracing | Observability | 45 min | Future |
| 48 | PgBouncer | Infrastructure | 30 min | Before first deployment |
| 4 | CSRF protection | Security | 45 min | Only if switching to cookie auth |
| 7 | Admin IP allowlist | Security | 20 min | Only if you have static admin IPs |
| 15 | Docker | DevOps | 30 min | Before first deployment |
| 16 | GitHub Actions | DevOps | 30 min | Before first deployment |

---

## New Environment Variables Needed

```env
# Low stock alerts
LOW_STOCK_THRESHOLD=5

# Admin IP allowlist (comma-separated, leave empty to disable)
ADMIN_IP_ALLOWLIST=

# OAuth (item 17)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
API_URL=https://api.yourstore.com

# Database (item 48 — PgBouncer)
DATABASE_URL=postgres://postgres:password@pgbouncer:6432/northline
DIRECT_DATABASE_URL=postgres://postgres:password@db:5432/northline

# OpenTelemetry tracing (item 47)
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318/v1/traces

# Docker compose (set in .env at project root)
JWT_SECRET=
JWT_REFRESH_SECRET=
EMAIL_HOST=
EMAIL_PORT=
EMAIL_USERNAME=
EMAIL_PASSWORD=
EMAIL_FROM=
FRONTEND_URL=
```
```
