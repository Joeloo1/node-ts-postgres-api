# Backend Production-Ready — Remaining Improvements

This document covers everything that still needs to be added, fixed, or hardened on the
backend **that is not already in `BACKEND_IMPROVEMENTS.md` or `PROFILE_BACKEND_CHANGES.md`**.

Three sections:
- **Part A — Bug Fixes**: real defects in the current code that will cause wrong behaviour in production.
- **Part B — Missing Features**: features a production ecommerce backend must have that do not yet exist.
- **Part C — Infrastructure Hardening**: operational improvements that prevent outages and data loss.

Each section has the Why, the exact code change, and (where needed) the Prisma schema change
and migration command. All code uses the same patterns already in this project
(catchAsync, AppError, Zod, prisma, redis, logger).

---

## Table of Contents

**Part A — Bug Fixes**
1. [GET /api/v1/reviews Requires Auth — Should Be Public](#1-get-apiv1reviews-requires-auth--should-be-public)
2. [User Cancel-Order Logs Wrong Audit Action](#2-user-cancel-order-logs-wrong-audit-action)
3. [updateCartItem Has No Stock Validation](#3-updatecartitem-has-no-stock-validation)
4. [Admin updateOrder Has No Zod Validation](#4-admin-updateorder-has-no-zod-validation)
5. [deleteAnswer Controller Exists But Route Is Missing](#5-deleteanswer-controller-exists-but-route-is-missing)

**Part B — Missing Features**
6. [Wishlist / Saved Items](#6-wishlist--saved-items)
7. [Newsletter Subscription](#7-newsletter-subscription)
8. [Contact Form Submission](#8-contact-form-submission)
9. [Coupon / Promo Codes](#9-coupon--promo-codes)
10. [Verified-Purchase Requirement on Reviews](#10-verified-purchase-requirement-on-reviews)
11. [Order Return Request](#11-order-return-request)
12. [Back-in-Stock Notifications](#12-back-in-stock-notifications)

**Part C — Infrastructure Hardening**
13. [Redis Disconnect in Graceful Shutdown](#13-redis-disconnect-in-graceful-shutdown)
14. [Request Timeout Middleware](#14-request-timeout-middleware)
15. [Account Lockout on Repeated Failed Logins](#15-account-lockout-on-repeated-failed-logins)

---

## Part A — Bug Fixes

---

## 1. GET /api/v1/reviews Requires Auth — Should Be Public

### Why

`reviewsRoutes.ts` opens with `router.use(Protect)`, which applies the auth guard to
**every single route including GET**. The product page fetches reviews without a token, so
every unauthenticated user sees a 401 instead of reviews. This is a production-breaking bug.

### How to fix — `backend/src/Routes/User/reviewsRoutes.ts`

Replace the blanket `router.use(Protect)` with per-route guards on the write methods only:

```ts
import express from "express";
import {
  createReview,
  updateReview,
  getProductReview,
  deleteReview,
  voteReview,
  unvoteReview,
} from "../../controller/reviewsController";
import {
  createReviewSchema,
  updateReviewSchema,
  reviewIdShema,
} from "../../Schema/reviewsSchema";
import { validateBody, validateParams } from "../../middleware/validationMiddleware";
import { Protect } from "../../controller/authController";

const router = express.Router();

// ── Public ──────────────────────────────────────────────────────────────────
router.get("/", getProductReview);

// ── Auth required ────────────────────────────────────────────────────────────
router.post("/", Protect, validateBody(createReviewSchema), createReview);

router.patch(
  "/:id",
  Protect,
  validateParams(reviewIdShema),
  validateBody(updateReviewSchema),
  updateReview,
);

router.delete("/:id", Protect, validateParams(reviewIdShema), deleteReview);

router.post("/:id/vote", Protect, validateParams(reviewIdShema), voteReview);
router.delete("/:id/vote", Protect, validateParams(reviewIdShema), unvoteReview);

export default router;
```

No schema changes, no migration needed. One file change.

---

## 2. User Cancel-Order Logs Wrong Audit Action

### Why

In `orderController.ts`, the function `cancelOrder` (the **user-facing** cancel, not the admin
one) correctly sets `cancelledBy: CancelledBy.USER` on the database record, but then
immediately writes the audit log with `action: "ADMIN_CANCEL_ORDER"` and
`cancelledBy: CancelledBy.ADMIN`. The audit trail is therefore false — it looks like an admin
cancelled every order that a user cancelled themselves.

### How to fix — `backend/src/controller/orderController.ts`

Find the `logAudit` call inside the user-facing `cancelOrder` function (around line 356) and
change it:

```ts
// BEFORE (wrong):
await logAudit({
  req,
  action: "ADMIN_CANCEL_ORDER",
  entityType: "Order",
  entityId: orderId,
  before: { status: order.status },
  after: { status: OrderStatus.CANCELLED, cancelledBy: CancelledBy.ADMIN },
});

// AFTER (correct):
await logAudit({
  req,
  action: "USER_CANCEL_ORDER",
  entityType: "Order",
  entityId: orderId,
  before: { status: order.status },
  after: { status: OrderStatus.CANCELLED, cancelledBy: CancelledBy.USER },
});
```

No schema changes, no migration needed. One line change per field.

---

## 3. updateCartItem Has No Stock Validation

### Why

`addItemToCart` correctly validates that the requested quantity does not exceed `product.stock`
before updating. `updateCartItem` (the PATCH endpoint called when the user changes a cart item
quantity via the spinner) does **not** do this check. A user can set a cart item to 9999 even if
only 2 units exist; the cart saves it, and the error surfaces only at checkout — a confusing and
poor UX.

### How to fix — `backend/src/controller/cartController.ts`

Replace the `updateCartItem` export with this version:

```ts
export const updateCartItem = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const { itemId } = req.params;
    const { quantity } = updateCartItemSchema.parse(req.body);

    logger.info("User updating cart items", {
      userId: req.user!.id,
      itemId,
      quantity,
    });

    const item = await prisma.cartItem.findUnique({
      where: { id: itemId },
      include: {
        cart: true,
        product: { select: { stock: true, name: true } },
      },
    });

    if (!item || item.cart.userId !== req.user!.id) {
      logger.warn("Cart item not found or user unauthorized", {
        userId: req.user!.id,
        itemId,
      });
      return next(new AppError("Cart item not found", 404));
    }

    if (item.product.stock < quantity) {
      return next(
        new AppError(
          `Only ${item.product.stock} unit${item.product.stock === 1 ? "" : "s"} of "${item.product.name}" available`,
          400,
        ),
      );
    }

    await prisma.cartItem.update({
      where: { id: itemId },
      data: { quantity },
    });

    logger.info("Cart item updated successfully", {
      userId: req.user!.id,
      itemId,
      quantity,
    });
    res.status(200).json({
      status: "success",
      message: "Cart item updated",
    });
  },
);
```

No schema changes, no migration needed.

---

## 4. Admin updateOrder Has No Zod Validation

### Why

`PATCH /api/v1/admin/orders/:id/status` reads `req.body.status` directly without any Zod
schema or `validateBody` middleware. An admin could send `{ status: "GIBBERISH" }` — Prisma
will throw a generic database error rather than a clean 400, which leaks internal error
details to the client.

### How to fix

**Step 1 — Add schema to `backend/src/Schema/orderSchema.ts`:**

```ts
import { z } from "zod";
import { OrderStatus } from "@prisma/client";

// … existing schemas …

export const updateOrderStatusSchema = z.object({
  status: z.nativeEnum(OrderStatus, {
    errorMap: () => ({
      message: `status must be one of: ${Object.values(OrderStatus).join(", ")}`,
    }),
  }),
});
```

**Step 2 — Wire up validation in `backend/src/Routes/Admin/adminOrderRoutes.ts`:**

```ts
import express from "express";
import { updateOrder, adminCancelOrder, getAllOrders } from "../../controller/orderController";
import { validateBody } from "../../middleware/validationMiddleware";
import { updateOrderStatusSchema } from "../../Schema/orderSchema";

const router = express.Router();

router.route("/").get(getAllOrders);
router.route("/:id/status").patch(validateBody(updateOrderStatusSchema), updateOrder);
router.route("/:id/cancel").patch(adminCancelOrder);

export default router;
```

**Step 3 — Use the parsed value in the controller (`backend/src/controller/orderController.ts`):**

```ts
// Replace:
const { status } = req.body;

// With:
const { status } = updateOrderStatusSchema.parse(req.body);
```

No schema changes, no migration needed.

---

## 5. deleteAnswer Controller Exists But Route Is Missing

### Why

`questionsController.ts` exports a fully-implemented `deleteAnswer` function — it checks
ownership, handles admin override, invalidates cache, and deletes the record. But
`questionsRoutes.ts` never registers a route for it, so the endpoint does not exist.
Users who wrote an answer cannot delete it; admins cannot moderate answers.

### How to fix — `backend/src/Routes/User/questionsRoutes.ts`

Add the import and route:

```ts
import express from "express";
import {
  getProductQuestions,
  createQuestion,
  answerQuestion,
  deleteQuestion,
  deleteAnswer,           // ← ADD
} from "../../controller/questionsController";
import { Protect } from "../../controller/authController";
import { validateBody, validateParams } from "../../middleware/validationMiddleware";
import {
  createQuestionSchema,
  createAnswerSchema,
  questionIdSchema,
  answerIdSchema,         // ← ENSURE THIS IS IMPORTED
} from "../../Schema/questionSchema";

const router = express.Router({ mergeParams: true });

router.get("/", getProductQuestions);
router.post("/", Protect, validateBody(createQuestionSchema), createQuestion);

router.post(
  "/:id/answers",
  Protect,
  validateParams(questionIdSchema),
  validateBody(createAnswerSchema),
  answerQuestion,
);

router.delete("/:id", Protect, validateParams(questionIdSchema), deleteQuestion);

// ── ADD THIS ────────────────────────────────────────────────────────────────
// DELETE /api/v1/products/:productId/questions/:id/answers/:answerId
router.delete(
  "/:id/answers/:answerId",
  Protect,
  validateParams(answerIdSchema),
  deleteAnswer,
);

export default router;
```

Also verify that `answerIdSchema` is exported from `backend/src/Schema/questionSchema.ts`.
If it only exports `questionIdSchema`, add:

```ts
// In backend/src/Schema/questionSchema.ts
export const answerIdSchema = z.object({
  answerId: z.string().uuid({ message: "answerId must be a valid UUID" }),
});
```

And update `deleteAnswer` in the controller to read `req.params.answerId` (not `req.params.id`):

```ts
export const deleteAnswer = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const id = req.params.answerId ?? req.params.id;  // works for both routes
    const userId = req.user!.id;
    const isAdmin = req.user!.roles === "ADMIN";

    const answerRecord = await prisma.productAnswer.findUnique({
      where: { id },
      include: { question: { select: { product_id: true } } },
    });
    if (!answerRecord) return next(new AppError("Answer not found", 404));
    if (answerRecord.userId !== userId && !isAdmin)
      return next(new AppError("Unauthorized", 403));

    await prisma.productAnswer.delete({ where: { id } });
    await scanDel(`questions:${answerRecord.question.product_id}:*`);

    res.status(204).json({ status: "success", data: null });
  },
);
```

No schema changes, no migration needed.

---

## Part B — Missing Features

---

## 6. Wishlist / Saved Items

### Why

The account page has a "Saved items" / wishlist section. There is no Wishlist model, no
controller, and no routes. Users cannot save products. Without this, the wishlist UI is
non-functional.

### Schema change — `backend/prisma/schema.prisma`

Add the model and the relation on `User` and `Products`:

```prisma
model Wishlist {
  id         String   @id @default(uuid())
  userId     String
  user       User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  product_id String   @db.Uuid
  product    Products @relation(fields: [product_id], references: [product_id], onDelete: Cascade)
  createdAt  DateTime @default(now())

  @@unique([userId, product_id])
  @@index([userId])
}
```

On the `User` model add:
```prisma
wishlist  Wishlist[]
```

On the `Products` model add:
```prisma
wishlists Wishlist[]
```

### Migration

```bash
cd backend
npx prisma migrate dev --name add_wishlist
```

### New controller — `backend/src/controller/wishlistController.ts`

```ts
import { Request, Response, NextFunction } from "express";
import catchAsync from "../utils/catchAsync";
import AppError from "../utils/AppError";
import { prisma } from "../config/database";
import logger from "../config/logger";
import { client as redis } from "../config/redis";

const REDIS_TTL = 300; // 5 minutes
const wishlistKey = (userId: string) => `wishlist:${userId}`;

export const getWishlist = catchAsync(
  async (req: Request, res: Response, _next: NextFunction) => {
    const userId = req.user!.id;

    const cached = await redis.get(wishlistKey(userId));
    if (cached) {
      return res.status(200).json({ ...JSON.parse(cached), source: "cached" });
    }

    const wishlist = await prisma.wishlist.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      include: {
        product: {
          select: {
            product_id: true,
            name: true,
            price: true,
            discount: true,
            image: true,
            availability: true,
            stock: true,
            rating: true,
          },
        },
      },
    });

    const response = { status: "success", data: { wishlist } };
    await redis.setEx(wishlistKey(userId), REDIS_TTL, JSON.stringify(response));
    res.status(200).json(response);
  },
);

export const addToWishlist = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const userId = req.user!.id;
    const { product_id } = req.body as { product_id?: string };

    if (!product_id) return next(new AppError("product_id is required", 400));

    const product = await prisma.products.findUnique({
      where: { product_id },
    });
    if (!product) return next(new AppError("Product not found", 404));

    const existing = await prisma.wishlist.findUnique({
      where: { userId_product_id: { userId, product_id } },
    });
    if (existing) {
      return res.status(200).json({
        status: "success",
        message: "Already in wishlist",
      });
    }

    const item = await prisma.wishlist.create({
      data: { userId, product_id },
    });

    await redis.del(wishlistKey(userId));
    logger.info("Product added to wishlist", { userId, product_id });

    res.status(201).json({ status: "success", data: { item } });
  },
);

export const removeFromWishlist = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const userId = req.user!.id;
    const { productId } = req.params;

    const existing = await prisma.wishlist.findUnique({
      where: { userId_product_id: { userId, product_id: productId } },
    });
    if (!existing) return next(new AppError("Item not in wishlist", 404));

    await prisma.wishlist.delete({
      where: { userId_product_id: { userId, product_id: productId } },
    });

    await redis.del(wishlistKey(userId));
    logger.info("Product removed from wishlist", { userId, productId });

    res.status(204).json({ status: "success", data: null });
  },
);

export const clearWishlist = catchAsync(
  async (req: Request, res: Response, _next: NextFunction) => {
    const userId = req.user!.id;

    await prisma.wishlist.deleteMany({ where: { userId } });
    await redis.del(wishlistKey(userId));

    logger.info("Wishlist cleared", { userId });
    res.status(204).json({ status: "success", data: null });
  },
);
```

### New routes file — `backend/src/Routes/User/wishlistRoutes.ts`

```ts
import express from "express";
import {
  getWishlist,
  addToWishlist,
  removeFromWishlist,
  clearWishlist,
} from "../../controller/wishlistController";
import { Protect } from "../../controller/authController";

const router = express.Router();

router.use(Protect);

router.route("/").get(getWishlist).post(addToWishlist).delete(clearWishlist);
router.route("/:productId").delete(removeFromWishlist);

export default router;
```

### Register in `backend/src/app.ts`

```ts
import wishlistRoutes from "./Routes/User/wishlistRoutes";
// …
app.use("/api/v1/wishlist", wishlistRoutes);
```

Endpoints produced:
- `GET    /api/v1/wishlist` — get the user's wishlist
- `POST   /api/v1/wishlist` — add a product `{ product_id }`
- `DELETE /api/v1/wishlist` — clear entire wishlist
- `DELETE /api/v1/wishlist/:productId` — remove one product

---

## 7. Newsletter Subscription

### Why

The homepage has a newsletter sign-up form. There is no backend endpoint to receive the
email address, no storage model, and no admin way to export subscribers. Submitted emails
go nowhere in production.

### Schema change — `backend/prisma/schema.prisma`

```prisma
model NewsletterSubscription {
  id        String   @id @default(uuid())
  email     String   @unique
  active    Boolean  @default(true)
  createdAt DateTime @default(now())

  @@index([createdAt(sort: Desc)])
}
```

### Migration

```bash
cd backend
npx prisma migrate dev --name add_newsletter_subscriptions
```

### New Zod schema — `backend/src/Schema/newsletterSchema.ts`

```ts
import { z } from "zod";

export const subscribeSchema = z.object({
  email: z.string().email({ message: "A valid email address is required" }),
});
```

### New controller — `backend/src/controller/newsletterController.ts`

```ts
import { Request, Response, NextFunction } from "express";
import catchAsync from "../utils/catchAsync";
import { prisma } from "../config/database";
import logger from "../config/logger";
import { subscribeSchema } from "../Schema/newsletterSchema";

export const subscribe = catchAsync(
  async (req: Request, res: Response, _next: NextFunction) => {
    const { email } = subscribeSchema.parse(req.body);

    const existing = await prisma.newsletterSubscription.findUnique({
      where: { email },
    });

    if (existing) {
      if (!existing.active) {
        await prisma.newsletterSubscription.update({
          where: { email },
          data: { active: true },
        });
        logger.info("Newsletter subscription re-activated", { email });
      }
      return res.status(200).json({
        status: "success",
        message: "You're subscribed!",
      });
    }

    await prisma.newsletterSubscription.create({ data: { email } });
    logger.info("New newsletter subscription", { email });

    res.status(201).json({
      status: "success",
      message: "You're subscribed! We'll be in touch.",
    });
  },
);

export const unsubscribe = catchAsync(
  async (req: Request, res: Response, _next: NextFunction) => {
    const { email } = subscribeSchema.parse(req.body);

    await prisma.newsletterSubscription.updateMany({
      where: { email },
      data:  { active: false },
    });

    logger.info("Newsletter unsubscription", { email });
    res.status(200).json({ status: "success", message: "You have been unsubscribed." });
  },
);

// Admin: export active subscribers
export const getSubscribers = catchAsync(
  async (_req: Request, res: Response, _next: NextFunction) => {
    const subscribers = await prisma.newsletterSubscription.findMany({
      where:   { active: true },
      orderBy: { createdAt: "desc" },
      select:  { id: true, email: true, createdAt: true },
    });
    res.status(200).json({
      status: "success",
      results: subscribers.length,
      data: { subscribers },
    });
  },
);
```

### New routes file — `backend/src/Routes/User/newsletterRoutes.ts`

```ts
import express from "express";
import { subscribe, unsubscribe } from "../../controller/newsletterController";
import { validateBody } from "../../middleware/validationMiddleware";
import { subscribeSchema } from "../../Schema/newsletterSchema";

const router = express.Router();

router.post("/subscribe",   validateBody(subscribeSchema), subscribe);
router.post("/unsubscribe", validateBody(subscribeSchema), unsubscribe);

export default router;
```

### Admin route — `backend/src/Routes/Admin/adminRoutes.ts`

```ts
import { getSubscribers } from "../../controller/newsletterController";
// …
router.get("/newsletter/subscribers", getSubscribers);
```

### Register in `backend/src/app.ts`

```ts
import newsletterRoutes from "./Routes/User/newsletterRoutes";
// …
app.use("/api/v1/newsletter", newsletterRoutes);
```

Also add a specific rate limiter so bots cannot spam the subscribe endpoint:

```ts
// In app.ts, alongside authLimiter:
const newsletterLimiter = rateLimit({
  max: 5,
  windowMs: 60 * 60 * 1000, // 1 hour
  store: makeRedisStore("rl:newsletter:"),
  handler: (_req, res) => {
    res.status(429).json({
      status: "fail",
      message: "Too many subscription attempts. Please try again later.",
    });
  },
});
app.use("/api/v1/newsletter/subscribe", newsletterLimiter);
```

---

## 8. Contact Form Submission

### Why

The contact page has a form. There is no backend endpoint. Messages submitted by users
vanish — no email is sent to the store owner and no record is kept.

### Schema change — `backend/prisma/schema.prisma`

```prisma
model ContactMessage {
  id        String   @id @default(uuid())
  name      String
  email     String
  subject   String
  message   String
  read      Boolean  @default(false)
  createdAt DateTime @default(now())

  @@index([createdAt(sort: Desc)])
  @@index([read])
}
```

### Migration

```bash
cd backend
npx prisma migrate dev --name add_contact_messages
```

### New Zod schema — `backend/src/Schema/contactSchema.ts`

```ts
import { z } from "zod";

export const contactSchema = z.object({
  name:    z.string().min(2).max(100),
  email:   z.string().email(),
  subject: z.string().min(3).max(200),
  message: z.string().min(10).max(3000),
});
```

### New controller — `backend/src/controller/contactController.ts`

```ts
import { Request, Response, NextFunction } from "express";
import catchAsync from "../utils/catchAsync";
import { prisma } from "../config/database";
import logger from "../config/logger";
import { contactSchema } from "../Schema/contactSchema";
import { emailQueue } from "../jobs/emailQueue";

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? process.env.EMAIL_FROM ?? "";

export const submitContact = catchAsync(
  async (req: Request, res: Response, _next: NextFunction) => {
    const data = contactSchema.parse(req.body);

    // Persist to DB so admins can review all messages in one place
    await prisma.contactMessage.create({ data });

    // Notify the store owner
    if (ADMIN_EMAIL) {
      await emailQueue.add("send-email", {
        email:   ADMIN_EMAIL,
        subject: `[Contact] ${data.subject}`,
        template: "contactNotification",
        templateData: {
          senderName:  data.name,
          senderEmail: data.email,
          subject:     data.subject,
          message:     data.message,
        },
      }).catch(() => {
        logger.warn("Failed to queue contact notification email");
      });
    }

    logger.info("Contact message received", { email: data.email, subject: data.subject });
    res.status(201).json({
      status: "success",
      message: "Your message has been received. We'll get back to you shortly.",
    });
  },
);

// Admin: list all contact messages
export const getContactMessages = catchAsync(
  async (req: Request, res: Response, _next: NextFunction) => {
    const unreadOnly = req.query.unread === "true";
    const messages = await prisma.contactMessage.findMany({
      where:   unreadOnly ? { read: false } : {},
      orderBy: { createdAt: "desc" },
      take:    50,
    });
    res.status(200).json({
      status: "success",
      results: messages.length,
      data: { messages },
    });
  },
);

// Admin: mark a message as read
export const markRead = catchAsync(
  async (req: Request, res: Response, _next: NextFunction) => {
    await prisma.contactMessage.update({
      where: { id: req.params.id },
      data:  { read: true },
    });
    res.status(200).json({ status: "success", data: null });
  },
);
```

### New email template — add to your HTML templates file (`backend/src/utils/email.ts`)

```ts
// Add inside the templates object:
contactNotification: (data: Record<string, string>) => `
  <h2>New Contact Message</h2>
  <p><strong>From:</strong> ${data.senderName} (${data.senderEmail})</p>
  <p><strong>Subject:</strong> ${data.subject}</p>
  <hr />
  <p>${data.message.replace(/\n/g, "<br>")}</p>
`,
```

### New routes file — `backend/src/Routes/User/contactRoutes.ts`

```ts
import express from "express";
import { submitContact } from "../../controller/contactController";
import { validateBody } from "../../middleware/validationMiddleware";
import { contactSchema } from "../../Schema/contactSchema";

const router = express.Router();

router.post("/", validateBody(contactSchema), submitContact);

export default router;
```

### Admin route — `backend/src/Routes/Admin/adminRoutes.ts`

```ts
import { getContactMessages, markRead } from "../../controller/contactController";
// …
router.get("/contact",          getContactMessages);
router.patch("/contact/:id/read", markRead);
```

### Register in `backend/src/app.ts`

```ts
import contactRoutes from "./Routes/User/contactRoutes";
// …
app.use("/api/v1/contact", contactRoutes);
```

Add a rate limiter to prevent form spam:

```ts
const contactLimiter = rateLimit({
  max: 3,
  windowMs: 60 * 60 * 1000,
  store: makeRedisStore("rl:contact:"),
  handler: (_req, res) => {
    res.status(429).json({
      status: "fail",
      message: "Too many messages sent. Please try again in an hour.",
    });
  },
});
app.use("/api/v1/contact", contactLimiter);
```

Also add `ADMIN_EMAIL` to your `.env`:

```env
ADMIN_EMAIL=your@email.com
```

---

## 9. Coupon / Promo Codes

### Why

There is no discount code system. A production ecommerce store needs to be able to run
promotions. Without this, every discount must be baked into the product's `discount` field,
which means global discounts and campaign-specific codes are impossible.

### Schema change — `backend/prisma/schema.prisma`

```prisma
enum CouponType {
  PERCENTAGE   // e.g. 20% off
  FIXED        // e.g. $10 off
}

model Coupon {
  id            String      @id @default(uuid())
  code          String      @unique @db.VarChar(50)
  type          CouponType
  value         Float        // percent (0–100) or fixed $ amount
  minOrderTotal Float?       // minimum cart total to apply
  maxUses       Int?         // null = unlimited
  usedCount     Int          @default(0)
  expiresAt     DateTime?    // null = no expiry
  active        Boolean      @default(true)
  createdAt     DateTime     @default(now())
  updatedAt     DateTime     @updatedAt

  @@index([code])
  @@index([active, expiresAt])
}
```

### Migration

```bash
cd backend
npx prisma migrate dev --name add_coupons
```

### New Zod schemas — `backend/src/Schema/couponSchema.ts`

```ts
import { z } from "zod";

export const validateCouponSchema = z.object({
  code:        z.string().min(1).max(50),
  orderTotal:  z.number().positive({ message: "orderTotal must be a positive number" }),
});

export const createCouponSchema = z.object({
  code:          z.string().min(2).max(50).toUpperCase(),
  type:          z.enum(["PERCENTAGE", "FIXED"]),
  value:         z.number().positive(),
  minOrderTotal: z.number().positive().optional(),
  maxUses:       z.number().int().positive().optional(),
  expiresAt:     z.string().datetime().optional(),
  active:        z.boolean().optional(),
});

export const updateCouponSchema = createCouponSchema.partial();
```

### New controller — `backend/src/controller/couponController.ts`

```ts
import { Request, Response, NextFunction } from "express";
import catchAsync from "../utils/catchAsync";
import AppError from "../utils/AppError";
import { prisma } from "../config/database";
import logger from "../config/logger";
import {
  validateCouponSchema,
  createCouponSchema,
  updateCouponSchema,
} from "../Schema/couponSchema";

// ── User: validate a code against their cart total ───────────────────────────

export const validateCoupon = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const { code, orderTotal } = validateCouponSchema.parse(req.body);

    const coupon = await prisma.coupon.findUnique({
      where: { code: code.toUpperCase() },
    });

    if (!coupon || !coupon.active) {
      return next(new AppError("Invalid or expired coupon code", 400));
    }

    if (coupon.expiresAt && coupon.expiresAt < new Date()) {
      return next(new AppError("This coupon has expired", 400));
    }

    if (coupon.maxUses !== null && coupon.usedCount >= coupon.maxUses) {
      return next(new AppError("This coupon has reached its usage limit", 400));
    }

    if (coupon.minOrderTotal !== null && orderTotal < coupon.minOrderTotal) {
      return next(
        new AppError(
          `This coupon requires a minimum order of $${coupon.minOrderTotal.toFixed(2)}`,
          400,
        ),
      );
    }

    const discount =
      coupon.type === "PERCENTAGE"
        ? (orderTotal * coupon.value) / 100
        : Math.min(coupon.value, orderTotal);

    logger.info("Coupon validated", { code, userId: req.user?.id });

    res.status(200).json({
      status: "success",
      data: {
        coupon: {
          code:     coupon.code,
          type:     coupon.type,
          value:    coupon.value,
          discount: Math.round(discount * 100) / 100,
          newTotal: Math.round((orderTotal - discount) * 100) / 100,
        },
      },
    });
  },
);

// ── Increment usedCount when an order is placed ──────────────────────────────
// Call this inside your order creation flow when a coupon code was applied.

export const applyCoupon = async (code: string): Promise<void> => {
  await prisma.coupon.update({
    where: { code },
    data:  { usedCount: { increment: 1 } },
  });
};

// ── Admin CRUD ────────────────────────────────────────────────────────────────

export const adminGetCoupons = catchAsync(
  async (_req: Request, res: Response, _next: NextFunction) => {
    const coupons = await prisma.coupon.findMany({
      orderBy: { createdAt: "desc" },
    });
    res.status(200).json({
      status: "success",
      results: coupons.length,
      data: { coupons },
    });
  },
);

export const adminCreateCoupon = catchAsync(
  async (req: Request, res: Response, _next: NextFunction) => {
    const data = createCouponSchema.parse(req.body);

    const coupon = await prisma.coupon.create({
      data: {
        ...data,
        expiresAt: data.expiresAt ? new Date(data.expiresAt) : undefined,
      },
    });

    logger.info("Coupon created", { code: coupon.code, adminId: req.user!.id });
    res.status(201).json({ status: "success", data: { coupon } });
  },
);

export const adminUpdateCoupon = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const data = updateCouponSchema.parse(req.body);

    const existing = await prisma.coupon.findUnique({
      where: { id: req.params.id },
    });
    if (!existing) return next(new AppError("Coupon not found", 404));

    const coupon = await prisma.coupon.update({
      where: { id: req.params.id },
      data:  {
        ...data,
        expiresAt: data.expiresAt ? new Date(data.expiresAt) : undefined,
      },
    });

    logger.info("Coupon updated", { id: coupon.id, adminId: req.user!.id });
    res.status(200).json({ status: "success", data: { coupon } });
  },
);

export const adminDeleteCoupon = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const existing = await prisma.coupon.findUnique({
      where: { id: req.params.id },
    });
    if (!existing) return next(new AppError("Coupon not found", 404));

    await prisma.coupon.delete({ where: { id: req.params.id } });
    logger.info("Coupon deleted", { id: req.params.id, adminId: req.user!.id });
    res.status(204).json({ status: "success", data: null });
  },
);
```

### User routes file — `backend/src/Routes/User/couponRoutes.ts`

```ts
import express from "express";
import { validateCoupon } from "../../controller/couponController";
import { Protect } from "../../controller/authController";
import { validateBody } from "../../middleware/validationMiddleware";
import { validateCouponSchema } from "../../Schema/couponSchema";

const router = express.Router();

// Auth required — prevents bots from scraping valid codes
router.post("/validate", Protect, validateBody(validateCouponSchema), validateCoupon);

export default router;
```

### Admin routes — add to `backend/src/Routes/Admin/adminRoutes.ts`

```ts
import {
  adminGetCoupons,
  adminCreateCoupon,
  adminUpdateCoupon,
  adminDeleteCoupon,
} from "../../controller/couponController";
import { validateBody } from "../../middleware/validationMiddleware";
import { createCouponSchema, updateCouponSchema } from "../../Schema/couponSchema";

// …
router.route("/coupons")
  .get(adminGetCoupons)
  .post(validateBody(createCouponSchema), adminCreateCoupon);

router.route("/coupons/:id")
  .patch(validateBody(updateCouponSchema), adminUpdateCoupon)
  .delete(adminDeleteCoupon);
```

### Register in `backend/src/app.ts`

```ts
import couponRoutes from "./Routes/User/couponRoutes";
// …
app.use("/api/v1/coupons", couponRoutes);
```

### How to use at order time

When the user applies a coupon code before checkout, the frontend sends the code alongside
the order. In the order creation controller, before calculating the total, call `validateCoupon`
logic and subtract the discount. After the order is created, call `applyCoupon(code)`:

```ts
// Inside createOrder / checkout handler:
import { applyCoupon } from "../controller/couponController";

if (couponCode) {
  // discount has already been validated and applied to total client-side,
  // just increment the usage counter
  await applyCoupon(couponCode);
}
```

---

## 10. Verified-Purchase Requirement on Reviews

### Why

Any authenticated user can review any product, even one they have never bought. Fake or
incentivised reviews with no purchase proof undermine trust. Adding a verified-purchase check
ensures only buyers can review, and lets the frontend show a "Verified purchase" badge.

### Schema change — `backend/prisma/schema.prisma`

Add one boolean field to the `Review` model:

```prisma
model Review {
  // … existing fields …
  verifiedPurchase Boolean @default(false)   // ← ADD
}
```

### Migration

```bash
cd backend
npx prisma migrate dev --name add_review_verifiedPurchase
```

### Controller change — `backend/src/controller/reviewsController.ts`

Replace the `createReview` export:

```ts
export const createReview = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const userId = req.user!.id;
    const { product_id, rating, content } = createReviewSchema.parse(req.body);

    // Check for existing review
    const existingReview = await prisma.review.findUnique({
      where: { userId_product_id: { userId, product_id } },
    });
    if (existingReview) {
      return next(new AppError("You already reviewed this product", 400));
    }

    // Check if user has a delivered order containing this product
    const verifiedPurchase = await prisma.orderItem.findFirst({
      where: {
        product_id,
        order: {
          userId,
          status: "DELIVERED",
        },
      },
    });

    if (!verifiedPurchase) {
      return next(
        new AppError(
          "You can only review products you have purchased and received",
          403,
        ),
      );
    }

    logger.info(`Creating review for product ${product_id} by user ${userId}`);
    const review = await prisma.review.create({
      data: {
        userId,
        product_id,
        rating,
        content,
        verifiedPurchase: true,
      },
    });

    await clearReviewCache();
    await syncProductRating(product_id);

    logger.info("Review created successfully");
    res.status(201).json({ status: "success", data: { review } });
  },
);
```

The `verifiedPurchase` field is returned automatically in all `GET /api/v1/reviews` responses
so the frontend can render a "Verified purchase" badge without any extra endpoint.

---

## 11. Order Return Request

### Why

There is no way for a user to formally request a return or refund after receiving an order.
This is a standard ecommerce requirement for legal compliance (especially EU consumer law with
the 14-day right of withdrawal) and for giving customers confidence to buy.

### Schema change — `backend/prisma/schema.prisma`

```prisma
enum ReturnStatus {
  PENDING
  APPROVED
  REJECTED
  COMPLETED
}

model ReturnRequest {
  id        String       @id @default(uuid())
  orderId   String
  order     Order        @relation(fields: [orderId], references: [id])
  userId    String
  user      User         @relation(fields: [userId], references: [id], onDelete: Cascade)
  reason    String
  status    ReturnStatus @default(PENDING)
  adminNote String?
  createdAt DateTime     @default(now())
  updatedAt DateTime     @updatedAt

  @@unique([orderId])     // one return per order
  @@index([userId])
  @@index([status])
}
```

Add the reverse relations:

```prisma
model Order {
  // … existing fields …
  returnRequest ReturnRequest?
}

model User {
  // … existing fields …
  returnRequests ReturnRequest[]
}
```

### Migration

```bash
cd backend
npx prisma migrate dev --name add_return_requests
```

### New Zod schema — `backend/src/Schema/returnSchema.ts`

```ts
import { z } from "zod";

export const createReturnSchema = z.object({
  reason: z.string().min(10, { message: "Please explain why you want to return this order" }).max(1000),
});

export const updateReturnSchema = z.object({
  status:    z.enum(["APPROVED", "REJECTED", "COMPLETED"]),
  adminNote: z.string().max(500).optional(),
});
```

### New controller — `backend/src/controller/returnController.ts`

```ts
import { Request, Response, NextFunction } from "express";
import catchAsync from "../utils/catchAsync";
import AppError from "../utils/AppError";
import { prisma } from "../config/database";
import logger from "../config/logger";
import { createReturnSchema, updateReturnSchema } from "../Schema/returnSchema";
import { logAudit } from "../utils/audit";

const RETURNABLE_WINDOW_DAYS = 30;

// ── User: request a return ───────────────────────────────────────────────────

export const createReturn = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const userId  = req.user!.id;
    const orderId = req.params.orderId;
    const { reason } = createReturnSchema.parse(req.body);

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { returnRequest: true },
    });

    if (!order || order.userId !== userId) {
      return next(new AppError("Order not found", 404));
    }

    if (order.status !== "DELIVERED") {
      return next(new AppError("Only delivered orders can be returned", 400));
    }

    if (order.returnRequest) {
      return next(new AppError("A return request already exists for this order", 400));
    }

    // Enforce the return window
    const deliveredAt = order.updatedAt;
    const deadline    = new Date(deliveredAt);
    deadline.setDate(deadline.getDate() + RETURNABLE_WINDOW_DAYS);

    if (new Date() > deadline) {
      return next(
        new AppError(
          `The ${RETURNABLE_WINDOW_DAYS}-day return window for this order has passed`,
          400,
        ),
      );
    }

    const returnRequest = await prisma.returnRequest.create({
      data: { orderId, userId, reason },
    });

    logger.info("Return request created", { orderId, userId });
    res.status(201).json({ status: "success", data: { returnRequest } });
  },
);

export const getMyReturns = catchAsync(
  async (req: Request, res: Response, _next: NextFunction) => {
    const userId = req.user!.id;

    const returns = await prisma.returnRequest.findMany({
      where:   { userId },
      orderBy: { createdAt: "desc" },
      include: {
        order: {
          select: { id: true, total: true, createdAt: true, items: { take: 1, include: { product: { select: { name: true, image: true } } } } },
        },
      },
    });

    res.status(200).json({
      status: "success",
      results: returns.length,
      data: { returns },
    });
  },
);

// ── Admin: manage returns ────────────────────────────────────────────────────

export const adminGetReturns = catchAsync(
  async (req: Request, res: Response, _next: NextFunction) => {
    const status = req.query.status as string | undefined;

    const returns = await prisma.returnRequest.findMany({
      where:   status ? { status: status as any } : {},
      orderBy: { createdAt: "desc" },
      include: {
        order: { select: { id: true, total: true } },
        user:  { select: { id: true, name: true, email: true } },
      },
    });

    res.status(200).json({
      status: "success",
      results: returns.length,
      data: { returns },
    });
  },
);

export const adminUpdateReturn = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const { status, adminNote } = updateReturnSchema.parse(req.body);

    const existing = await prisma.returnRequest.findUnique({
      where: { id: req.params.id },
    });
    if (!existing) return next(new AppError("Return request not found", 404));

    const updated = await prisma.returnRequest.update({
      where: { id: req.params.id },
      data:  { status, adminNote },
    });

    await logAudit({
      req,
      action: "UPDATE_RETURN_REQUEST",
      entityType: "ReturnRequest",
      entityId:   req.params.id,
      before: { status: existing.status },
      after:  { status, adminNote },
    });

    logger.info("Return request updated", { id: req.params.id, status });
    res.status(200).json({ status: "success", data: { returnRequest: updated } });
  },
);
```

### User routes — `backend/src/Routes/User/orderRoutes.ts`

```ts
import { createReturn, getMyReturns } from "../../controller/returnController";
// Add to existing orderRoutes (after router.use(Protect)):
router.get("/returns",                          getMyReturns);
router.post("/:orderId/return",
  validateBody(createReturnSchema),
  createReturn,
);
```

### Admin routes — add to `backend/src/Routes/Admin/adminRoutes.ts`

```ts
import {
  adminGetReturns,
  adminUpdateReturn,
} from "../../controller/returnController";
import { updateReturnSchema } from "../../Schema/returnSchema";
// …
router.get("/returns",          adminGetReturns);
router.patch("/returns/:id", validateBody(updateReturnSchema), adminUpdateReturn);
```

---

## 12. Back-in-Stock Notifications

### Why

When a product is out of stock, users should be able to subscribe for a notification email
when it is restocked. This recovers lost sales and is a common ecommerce feature. Currently
there is no mechanism for this at all.

### Schema change — `backend/prisma/schema.prisma`

```prisma
model BackInStockSubscription {
  id         String    @id @default(uuid())
  email      String
  product_id String    @db.Uuid
  product    Products  @relation(fields: [product_id], references: [product_id], onDelete: Cascade)
  userId     String?
  user       User?     @relation(fields: [userId], references: [id], onDelete: SetNull)
  notified   Boolean   @default(false)
  createdAt  DateTime  @default(now())

  @@unique([email, product_id])
  @@index([product_id, notified])
}
```

Add on `Products`:
```prisma
backInStockSubscriptions BackInStockSubscription[]
```

Add on `User`:
```prisma
backInStockSubscriptions BackInStockSubscription[]
```

### Migration

```bash
cd backend
npx prisma migrate dev --name add_back_in_stock_subscriptions
```

### New Zod schema — `backend/src/Schema/stockNotifySchema.ts`

```ts
import { z } from "zod";

export const stockNotifySchema = z.object({
  email:      z.string().email(),
  product_id: z.string().uuid(),
});
```

### New controller — `backend/src/controller/stockNotifyController.ts`

```ts
import { Request, Response, NextFunction } from "express";
import catchAsync from "../utils/catchAsync";
import AppError from "../utils/AppError";
import { prisma } from "../config/database";
import logger from "../config/logger";
import { stockNotifySchema } from "../Schema/stockNotifySchema";
import { emailQueue } from "../jobs/emailQueue";

// User subscribes to back-in-stock alerts
export const subscribeStockNotify = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const { email, product_id } = stockNotifySchema.parse(req.body);

    const product = await prisma.products.findUnique({
      where: { product_id },
    });
    if (!product) return next(new AppError("Product not found", 404));

    if (product.stock > 0) {
      return next(new AppError("This product is already in stock", 400));
    }

    const existing = await prisma.backInStockSubscription.findUnique({
      where: { email_product_id: { email, product_id } },
    });
    if (existing) {
      return res.status(200).json({
        status: "success",
        message: "You are already subscribed for this product.",
      });
    }

    await prisma.backInStockSubscription.create({
      data: {
        email,
        product_id,
        userId: req.user?.id ?? null,
      },
    });

    logger.info("Back-in-stock subscription created", { email, product_id });
    res.status(201).json({
      status: "success",
      message: `We'll notify you at ${email} when this product is back in stock.`,
    });
  },
);

// Called internally whenever stock increases above 0
// Trigger this from inside updateProduct when stock goes from 0 → positive
export const triggerStockNotifications = async (productId: string): Promise<void> => {
  const subscribers = await prisma.backInStockSubscription.findMany({
    where:   { product_id: productId, notified: false },
    include: { product: { select: { name: true } } },
  });

  if (subscribers.length === 0) return;

  for (const sub of subscribers) {
    await emailQueue.add("send-email", {
      email:    sub.email,
      subject:  `${sub.product.name} is back in stock!`,
      template: "backInStock",
      templateData: {
        productName: sub.product.name,
        productUrl:  `${process.env.FRONTEND_URL}/products/${productId}`,
      },
    }).catch(() => {
      logger.warn("Failed to queue back-in-stock email", { email: sub.email });
    });
  }

  await prisma.backInStockSubscription.updateMany({
    where: { product_id: productId, notified: false },
    data:  { notified: true },
  });

  logger.info(`Back-in-stock notifications sent`, {
    productId,
    count: subscribers.length,
  });
};
```

### Wire the trigger into `backend/src/controller/productController.ts`

In the `updateProduct` function, after the Prisma update, add:

```ts
import { triggerStockNotifications } from "./stockNotifyController";

// Inside updateProduct, after prisma.products.update:
const stockIncreased =
  data.stock !== undefined &&
  existingProduct.stock === 0 &&
  data.stock > 0;

if (stockIncreased) {
  triggerStockNotifications(productId).catch((err) => {
    logger.warn("Back-in-stock trigger failed", { productId, err });
  });
}
```

### New routes file — `backend/src/Routes/User/stockNotifyRoutes.ts`

```ts
import express from "express";
import { subscribeStockNotify } from "../../controller/stockNotifyController";
import { validateBody } from "../../middleware/validationMiddleware";
import { stockNotifySchema } from "../../Schema/stockNotifySchema";

const router = express.Router();

router.post("/", validateBody(stockNotifySchema), subscribeStockNotify);

export default router;
```

### Register in `backend/src/app.ts`

```ts
import stockNotifyRoutes from "./Routes/User/stockNotifyRoutes";
// …
app.use("/api/v1/stock-notify", stockNotifyRoutes);
```

### Add email template to `backend/src/utils/email.ts`

```ts
backInStock: (data: Record<string, string>) => `
  <h2>Good news — ${data.productName} is back in stock!</h2>
  <p>The product you were waiting for is now available again.</p>
  <a href="${data.productUrl}" style="background:#16a34a;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block;margin-top:16px;">
    Shop now
  </a>
  <p style="margin-top:16px;font-size:12px;color:#888;">
    You received this because you requested a back-in-stock notification.
  </p>
`,
```

---

## Part C — Infrastructure Hardening

---

## 13. Redis Disconnect in Graceful Shutdown

### Why

`backend/src/server.ts` handles `SIGTERM` and `SIGINT` by calling `disconnectDB()` which
closes the Prisma connection. But it **never** closes the Redis connection. On a production
server or in a Docker container, this means:

1. Redis keeps the connection open after the Node process exits, wasting server resources.
2. The Redis client may flush its in-flight commands to `/dev/null`, silently losing work.
3. In Kubernetes, the old pod's lingering connection can block the new pod's connection slot.

### How to fix — `backend/src/config/redis.ts`

First, confirm that your Redis config exports a `disconnectRedis` function. If it doesn't,
add one:

```ts
// At the bottom of backend/src/config/redis.ts
export const disconnectRedis = async (): Promise<void> => {
  try {
    await client.quit();
    logger.info("Redis connection closed.");
  } catch (err) {
    logger.error("Error closing Redis connection", err);
  }
};
```

### Update `backend/src/server.ts`

```ts
import { connectDB, disconnectDB } from "./config/database";
import { connectRedis, disconnectRedis } from "./config/redis";   // ← ADD disconnectRedis

// …

const shutdown = async (signal: string) => {
  logger.info(`${signal} received. Starting graceful shutdown...`);

  if (server) {
    server.close(async () => {
      logger.info("HTTP server closed.");
      await disconnectDB();
      await disconnectRedis();          // ← ADD
      process.exit(0);
    });
  } else {
    await disconnectDB();
    await disconnectRedis();            // ← ADD
    process.exit(0);
  }
};

process.on("unhandledRejection", (err: Error) => {
  logger.error("UNHANDLED REJECTION! Shutting down...", err);

  if (server) {
    server.close(async () => {
      await disconnectDB();
      await disconnectRedis();          // ← ADD
      process.exit(1);
    });
  } else {
    process.exit(1);
  }
});
```

No schema changes, no migration needed. Two files.

---

## 14. Request Timeout Middleware

### Why

If a controller gets stuck — a slow Prisma query, a hung HTTP call to Stripe, an infinite
loop — the request never completes and the Node.js event loop thread for that request is
blocked indefinitely. Under moderate traffic, enough stuck requests will starve the server and
make it unresponsive for everyone. Express has no built-in timeout.

### How to implement

**Step 1 — Install the package:**

```bash
cd backend
npm install connect-timeout
npm install -D @types/connect-timeout
```

**Step 2 — Add timeout middleware to `backend/src/app.ts`:**

```ts
import timeout from "connect-timeout";

// Add BEFORE route definitions, AFTER body parsers
// 30 seconds is generous but prevents indefinite hangs
app.use(timeout("30s"));

// Add a haltOnTimedOut helper that aborts timed-out requests
// before they reach the next middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  if (!req.timedout) next();
});
```

**Step 3 — Handle the timeout in the global error handler (`backend/src/Error/globalErrorHandler.ts`):**

```ts
// At the very top of globalErrorHandler, before any other checks:
if (err.timeout) {
  return res.status(503).json({
    status: "fail",
    message: "Request timed out. Please try again.",
  });
}
```

**Alternative — no new dependency:**

If you prefer not to add a package, use Node's native `setTimeout` pattern inside
long-running controllers. For example, in any controller that calls an external service
(Stripe, email, etc.):

```ts
const controller = catchAsync(async (req, res, next) => {
  const timeoutId = setTimeout(() => {
    next(new AppError("Request timed out", 503));
  }, 25_000);

  try {
    // … your logic …
  } finally {
    clearTimeout(timeoutId);
  }
});
```

---

## 15. Account Lockout on Repeated Failed Logins

### Why

The app already has an **IP-based rate limiter** on `/api/v1/users/login` (10 attempts per
15 minutes per IP). This is good but not sufficient:

- A distributed attack from many IPs would bypass the IP limiter.
- A targeted attack on a specific user account (credential stuffing) would also bypass it,
  because the attacker rotates IPs.

An account-level lockout — tracked in Redis per user email — detects per-account brute-force
regardless of how many IP addresses the attacker uses.

### How to implement — `backend/src/controller/authController.ts`

Add a lockout helper and integrate it into the `login` function:

```ts
import { client as redis } from "../config/redis";

const MAX_FAILED  = 5;          // lock after 5 consecutive failures
const LOCK_TTL    = 15 * 60;    // locked for 15 minutes (seconds)
const FAIL_TTL    = 10 * 60;    // failure counter resets after 10 minutes

const failKey = (email: string) => `login:fail:${email.toLowerCase()}`;
const lockKey = (email: string) => `login:lock:${email.toLowerCase()}`;

async function isAccountLocked(email: string): Promise<boolean> {
  return (await redis.exists(lockKey(email))) === 1;
}

async function recordFailedLogin(email: string): Promise<void> {
  const key     = failKey(email);
  const current = await redis.incr(key);

  if (current === 1) {
    // First failure — start the expiry clock
    await redis.expire(key, FAIL_TTL);
  }

  if (current >= MAX_FAILED) {
    // Lock the account and clear the failure counter
    await redis.setEx(lockKey(email), LOCK_TTL, "1");
    await redis.del(key);
    logger.warn("Account temporarily locked due to repeated login failures", { email });
  }
}

async function clearFailedLogins(email: string): Promise<void> {
  await redis.del(failKey(email));
  await redis.del(lockKey(email));
}
```

Now integrate into your `login` handler:

```ts
export const login = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const { email, password } = loginSchema.parse(req.body);

    // ── Account lockout check ────────────────────────────────────────────────
    if (await isAccountLocked(email)) {
      return next(
        new AppError(
          "Account temporarily locked due to too many failed attempts. Try again in 15 minutes.",
          429,
        ),
      );
    }

    const user = await prisma.user.findUnique({ where: { email } });

    if (!user || !(await bcrypt.compare(password, user.password))) {
      await recordFailedLogin(email);         // ← track the failure
      return next(new AppError("Incorrect email or password", 401));
    }

    // ── Successful login — clear failure counter ─────────────────────────────
    await clearFailedLogins(email);

    // … rest of login logic (issue tokens, record session, respond) …
  },
);
```

No schema changes, no migration needed — everything is stored in Redis which means the
lock automatically expires with no DB cleanup job required.

---

## Implementation Priority

| # | Item | Risk | Effort | Do first? |
|---|------|------|--------|-----------|
| 1 | GET reviews must be public | Critical bug | 5 min | Yes |
| 2 | Cancel order audit log bug | Data corruption | 5 min | Yes |
| 3 | Cart update stock validation | UX bug | 10 min | Yes |
| 4 | Admin updateOrder Zod schema | Security gap | 10 min | Yes |
| 5 | deleteAnswer route | Missing feature | 5 min | Yes |
| 13 | Redis graceful shutdown | Data loss risk | 10 min | Yes |
| 15 | Account lockout | Security | 20 min | Yes |
| 14 | Request timeout | Stability | 15 min | Soon |
| 6 | Wishlist | Feature gap | 45 min | Soon |
| 10 | Verified purchase reviews | Credibility | 15 min | Soon |
| 7 | Newsletter | Feature gap | 30 min | Next sprint |
| 8 | Contact form | Feature gap | 30 min | Next sprint |
| 12 | Back-in-stock notifications | Feature gap | 45 min | Next sprint |
| 9 | Coupon codes | Feature gap | 90 min | Next sprint |
| 11 | Order return requests | Feature gap | 60 min | Next sprint |

**Do items 1–5 and 13–15 in the same session** — they are all small, fix real bugs or
close security gaps, and require no new dependencies.

Items 6–12 require schema migrations. Do each one on its own branch so that if a migration
fails in production it does not take down the whole deploy.

---

## New Environment Variables Needed

```env
# Contact form notifications
ADMIN_EMAIL=store-owner@example.com

# Back-in-stock and newsletter emails (already needed for emailQueue)
FRONTEND_URL=https://your-store.com
```
