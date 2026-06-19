# Backend Production Improvements

These are the real gaps between your current backend and a production ecommerce API.
Organised by severity. Each item explains **why** it matters and includes the exact code fix.

---

## 1. CRITICAL BUGS (break real functionality today)

---

### 1.1 Coupon discount is never subtracted from the order total

**File:** `backend/src/controller/orderController.ts`  
**Why it matters:** A user can enter a coupon code, the API validates it and increments the usage count, but the actual order total is still calculated at full price. They pay full price every time.

**Current code (broken):**

```ts
// createOrder / checkoutFromCart
let calculatedTotal = 0;
// ... sums up product prices ...
return tx.order.create({ data: { total: calculatedTotal } });
// THEN after the transaction:
if (couponCode) await applyCoupon(couponCode); // increments usedCount, does nothing to total
```

**Fix:**

```ts
// In createOrder and checkoutFromCart, resolve coupon INSIDE the transaction
export const createOrder = catchAsync(async (req, res, _next) => {
  const userId = req.user!.id;
  const { items, couponCode } = createOrderSchema.parse(req.body);

  const order = await prisma.$transaction(async (tx) => {
    // ... build orderItemsData and calculatedTotal as before ...
    let discountAmount = 0;
    let resolvedCouponCode: string | null = null;

    if (couponCode) {
      const coupon = await tx.coupon.findUnique({
        where: { code: couponCode.toUpperCase() },
      });
      if (
        coupon &&
        coupon.active &&
        (!coupon.expiresAt || coupon.expiresAt > new Date()) &&
        (coupon.maxUses === null || coupon.usedCount < coupon.maxUses) &&
        (coupon.minOrderTotal === null ||
          calculatedTotal >= coupon.minOrderTotal)
      ) {
        discountAmount =
          coupon.type === "PERCENTAGE"
            ? (calculatedTotal * coupon.value) / 100
            : Math.min(coupon.value, calculatedTotal);
        resolvedCouponCode = coupon.code;
        await tx.coupon.update({
          where: { code: coupon.code },
          data: { usedCount: { increment: 1 } },
        });
      }
    }

    const finalTotal = Math.max(0, calculatedTotal - discountAmount);

    return tx.order.create({
      data: {
        userId,
        total: finalTotal,
        discountAmount, // store for receipts — add field to schema (see §3.2)
        couponCode: resolvedCouponCode,
        status: "PENDING",
        items: { create: orderItemsData },
      },
      include: { items: true },
    });
  });
  // Remove the outside applyCoupon() call entirely
  res.status(201).json({ status: "success", data: { order } });
});
```

---

### 1.2 `adminDeleteCoupon` deletes the record twice

**File:** `backend/src/controller/couponController.ts` lines 130–148  
**Why it matters:** The second `prisma.coupon.delete` call will always throw `P2025 Record not found`, crashing the route.

**Current code:**

```ts
export const adminDeleteCoupon = catchAsync(async (req, res, next) => {
  const id = req.params.id;
  const existing = await prisma.coupon.delete({ where: { id } }); // ← already deleted here
  if (!existing) return next(new AppError("Coupon not found", 404));
  await prisma.coupon.delete({ where: { id } }); // ← crashes: P2025
  ...
});
```

**Fix:**

```ts
export const adminDeleteCoupon = catchAsync(async (req, res, next) => {
  const id = req.params.id;
  const existing = await prisma.coupon.findUnique({ where: { id } });
  if (!existing) return next(new AppError("Coupon not found", 404));
  await prisma.coupon.delete({ where: { id } });
  logger.info("Coupon deleted", { id, adminId: req.user!.id });
  res.status(204).json({ status: "success", data: null });
});
```

---

### 1.3 `adminGetCoupon` typo — returns `dat` instead of `data`

**File:** `backend/src/controller/couponController.ts` line 79

**Fix:**

```ts
res.status(200).json({ status: "success", data: { coupon } }); // was `dat:`
```

---

### 1.4 Rate limiter mounted on wrong path

**File:** `backend/src/app.ts` line 169  
**Why it matters:** The contact limiter is mounted on `/api/v1/contract` (typo). The actual `/api/v1/contact` route has no rate limit — spam is unlimited.

**Fix:**

```ts
// was: app.use("/api/v1/contract", contactLimiter);
app.use("/api/v1/contact", contactLimiter);
```

---

### 1.5 Order total ignores product discount

**File:** `backend/src/controller/orderController.ts`  
**Why it matters:** A product with `discount: 20` (20%) is still charged at full price.

**Fix — apply discount when calculating the line price:**

```ts
for (const item of items) {
  const product = productMap.get(item.product_id);
  // ...
  const discountMultiplier = product.discount ? 1 - product.discount / 100 : 1;
  const linePrice = product.price * discountMultiplier;
  calculatedTotal += linePrice * item.quantity;
  orderItemsData.push({
    product_id: item.product_id,
    quantity: item.quantity,
    price: linePrice, // store the actual price paid, not the list price
  });
}
```

---

## 2. SECURITY GAPS

---

### 2.1 No CSRF protection on cookie-based auth

**Why it matters:** You use `httpOnly` cookies for auth. A malicious site can trigger authenticated requests from the user's browser (CSRF). This is the standard attack against cookie auth.

**Fix — install `csrf-csrf` and add to app.ts:**

```bash
npm install csrf-csrf
```

```ts
// backend/src/app.ts
import { doubleCsrf } from "csrf-csrf";

const { generateToken, doubleCsrfProtection } = doubleCsrf({
  getSecret: () => process.env.CSRF_SECRET!,
  cookieName: "x-csrf-token",
  cookieOptions: { sameSite: "lax", secure: isProd, httpOnly: true },
  size: 64,
});

// Expose a GET endpoint the frontend calls once on load
app.get("/api/v1/csrf-token", (req, res) => {
  res.json({ csrfToken: generateToken(req, res) });
});

// Apply after static/health routes, before all state-changing routes
app.use(doubleCsrfProtection);
```

Frontend must include the `x-csrf-token` header on every POST/PATCH/DELETE.

---

### 2.2 JWT secret not validated at startup

**Why it matters:** If `JWT_SECRET` is missing from `.env`, the app starts fine but crashes the first time anyone logs in (uncaught `jwt.sign` error).

**Fix — add to `backend/src/server.ts`:**

```ts
const REQUIRED_ENV = [
  "DATABASE_URL",
  "REDIS_URL",
  "JWT_SECRET",
  "JWT_REFRESH_SECRET",
];
for (const key of REQUIRED_ENV) {
  if (!process.env[key]) {
    console.error(`Missing required environment variable: ${key}`);
    process.exit(1);
  }
}
```

---

### 2.3 Public image directory is completely open

**Why it matters:** Profile images are at `/public/users/user-<uuid>-<timestamp>.jpeg`. Anyone who guesses or discovers a filename can download any user's profile photo without authenticating.

**Fix — serve user images through an authenticated route:**

```ts
// backend/src/Routes/User/userRoutes.ts — add this route
import path from "path";
import fs from "fs";

router.get("/profile-image/:filename", Protect, (req, res, next) => {
  const { filename } = req.params;
  // Prevent path traversal
  if (filename.includes("..") || filename.includes("/")) {
    return next(new AppError("Invalid filename", 400));
  }
  const filePath = path.join(__dirname, "../../../public/users", filename);
  if (!fs.existsSync(filePath))
    return next(new AppError("Image not found", 404));
  res.sendFile(filePath);
});
```

Product images can stay public — that's fine for a shop.

---

### 2.4 `updateReview` has no Zod validation

**File:** `backend/src/controller/reviewsController.ts` line 105  
**Why it matters:** `content` and `rating` are read raw from `req.body`. A user can send `rating: "drop table"` or any malformed value.

**Fix:**

```ts
// Add to reviewsSchema.ts
export const updateReviewSchema = z
  .object({
    content: z.string().min(1).max(2000).optional(),
    rating: z.number().min(1).max(5).optional(),
  })
  .refine((d) => d.content !== undefined || d.rating !== undefined, {
    message: "Provide content or rating",
  });

// In reviewsController.ts updateReview:
const { content, rating } = updateReviewSchema.parse(req.body);
```

---

## 3. MISSING REAL-WORLD FEATURES

---

### 3.1 Orders don't store the shipping address

**Why it matters:** When you ship to someone you need to know where to ship. Right now there is literally nowhere in the database to record where an order should go.

**Step 1 — add fields to Prisma schema:**

```prisma
// In Order model, add:
shippingName    String?
shippingStreet  String?
shippingCity    String?
shippingState   String?
shippingZip     String?
shippingCountry String?

// Also add coupon/discount fields while we're here:
couponCode      String?
discountAmount  Float   @default(0)
```

**Step 2 — run migration:**

```bash
npx prisma migrate dev --name add_order_shipping_and_discount
```

**Step 3 — update `createOrder` and `checkoutFromCart` to accept and store a shipping address:**

```ts
// In orderSchema.ts
export const createOrderSchema = z.object({
  items: z.array(...),
  couponCode: z.string().optional(),
  shippingAddress: z.object({
    name:    z.string().min(1),
    street:  z.string().min(1),
    city:    z.string().min(1),
    state:   z.string().optional(),
    zip:     z.string().optional(),
    country: z.string().min(1),
  }).optional(),
});

// In createOrder, pass the address to order.create:
return tx.order.create({
  data: {
    userId,
    total: finalTotal,
    discountAmount,
    couponCode: resolvedCouponCode,
    shippingName:    shippingAddress?.name,
    shippingStreet:  shippingAddress?.street,
    shippingCity:    shippingAddress?.city,
    shippingState:   shippingAddress?.state,
    shippingZip:     shippingAddress?.zip,
    shippingCountry: shippingAddress?.country,
    status: "PENDING",
    items: { create: orderItemsData },
  },
});
```

---

### 3.2 No tracking number on orders

**Why it matters:** When you ship a package, you need to give the customer a tracking number. There is no field for it.

**Add to Prisma schema:**

```prisma
// In Order model:
trackingNumber  String?
shippedAt       DateTime?
```

**Update `updateOrder` in `adminOrderController` or `orderController.ts` to allow setting it:**

```ts
export const updateOrderStatusSchema = z.object({
  status: z.nativeEnum(OrderStatus),
  trackingNumber: z.string().optional(),
});

// In updateOrder:
const order = await prisma.order.update({
  where: { id: req.params.id },
  data: {
    status,
    ...(trackingNumber ? { trackingNumber } : {}),
    ...(status === "SHIPPED" ? { shippedAt: new Date() } : {}),
  },
  ...
});
```

**Add tracking number to the status email template.**

---

### 3.3 `getMyOrder` loads ALL orders with no pagination

**File:** `backend/src/controller/orderController.ts` line 183  
**Why it matters:** A customer with 500 orders causes a 500-row DB query on every page load.

**Fix:**

```ts
export const getMyOrder = catchAsync(async (req, res, _next) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(20, Math.max(1, Number(req.query.limit) || 10));
  const skip = (page - 1) * limit;

  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where: { userId: req.user!.id },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
      include: {
        items: {
          include: {
            product: { select: { name: true, image: true, images: true } },
          },
        },
      },
    }),
    prisma.order.count({ where: { userId: req.user!.id } }),
  ]);

  res.status(200).json({
    status: "success",
    results: orders.length,
    total,
    totalPages: Math.ceil(total / limit),
    page,
    data: { orders },
  });
});
```

---

### 3.4 Cart allows adding unavailable products

**File:** `backend/src/controller/cartController.ts`  
**Why it matters:** A product with `availability: false` (explicitly hidden by admin) can still be added to cart, leading to orders that can never ship.

**Fix — add availability check after the product lookup:**

```ts
const product = await prisma.products.findUnique({ where: { product_id } });
if (!product) return next(new AppError("Product not found", 404));

// ADD THIS:
if (!product.availability) {
  return next(new AppError("This product is currently unavailable", 400));
}
```

---

### 3.5 Products are hard-deleted, breaking order history

**Why it matters:** If an admin deletes a product that appears in past orders, those order items lose their product reference. The order history page breaks.

**Option A (Recommended) — Soft delete:**
Add `deletedAt DateTime?` to the `Products` model and filter all public queries by `deletedAt: null`. Admin can see deleted products. `OrderItem` relations still resolve.

```prisma
// In Products model:
deletedAt DateTime?

@@index([deletedAt])
```

```ts
// In productController.ts — replace deleteProduct body:
await prisma.products.update({
  where: { product_id: productId },
  data: { deletedAt: new Date(), availability: false },
});

// In getAllProducts — add to where clause:
const where = buildWhereClause(filters);
(where as any).deletedAt = null; // never return soft-deleted products publicly
```

**Option B** — Leave hard delete but snapshot the product name/price into `OrderItem`. You already store `price` per item, just add `productName` and `productImage` columns to `OrderItem`.

---

### 3.6 Admin analytics are too basic

**Why it matters:** Real merchants need revenue over time by category, conversion rate, average order value, and low-stock alerts.

**Add to `adminAnalyticsController.ts`:**

```ts
// Add these to the Promise.all in getDashboardStats:

// Average Order Value (paid orders only)
prisma.order.aggregate({
  where: { status: { in: PAID_STATUSES } },
  _avg: { total: true },
}),

// Low stock products (stock <= 5)
prisma.products.findMany({
  where: { stock: { lte: 5 }, availability: true, deletedAt: null },
  select: { product_id: true, name: true, stock: true, image: true },
  orderBy: { stock: "asc" },
  take: 10,
}),

// Conversion: pending vs paid
prisma.order.groupBy({
  by: ["status"],
  _count: { id: true },
}),
```

---

## 4. PERFORMANCE & INFRASTRUCTURE

---

### 4.1 `scanDel` uses DEL instead of UNLINK

**File:** `backend/src/config/redis.ts`  
**Why it matters:** `DEL` is synchronous and blocks the Redis event loop while the key is freed. `UNLINK` does the same but asynchronously — zero blocking time. On a busy server with many cached product list keys, `DEL` causes measurable latency spikes.

**Fix — in your `scanDel` utility, change DEL to UNLINK:**

```ts
export const scanDel = async (pattern: string) => {
  let cursor = 0;
  do {
    const result = await client.scan(cursor, { MATCH: pattern, COUNT: 100 });
    cursor = result.cursor;
    if (result.keys.length > 0) {
      await client.unlink(result.keys); // was: client.del(result.keys)
    }
  } while (cursor !== 0);
};
```

---

### 4.2 `CartItem` has no unique constraint — race condition on concurrent adds

**Why it matters:** If a user double-clicks "Add to cart" fast enough, two simultaneous requests can both run `findFirst` before either creates a row, resulting in two `CartItem` rows for the same product. The cart then shows wrong quantities.

**Fix — add unique constraint to schema:**

```prisma
// In CartItem model:
@@unique([cartId, product_id])
```

Then in `cartController.ts`, replace the find-then-insert with `upsert`:

```ts
await tx.cartItem.upsert({
  where: { cartId_product_id: { cartId: cart.id, product_id } },
  create: { cartId: cart.id, product_id, quantity },
  update: { quantity: { increment: quantity } },
});
// Remove the separate findFirst / if-else block
```

**Run migration:**

```bash
npx prisma migrate dev --name add_cartitem_unique
```

---

### 4.3 Product images passed to Stripe are local filenames, not URLs

**File:** `backend/src/controller/paymentController.ts` line 51  
**Why it matters:** You store product images as just a filename (`product-abc.jpeg`) when using local disk. Stripe tries to display that as an image URL and shows nothing.

**Fix:**

```ts
const resolveImageUrl = (image: string | null): string | null => {
  if (!image) return null;
  if (image.startsWith("http")) return image;
  const base = process.env.API_URL?.replace(/\/$/, "") || "";
  return `${base}/public/products/${image}`;
};

// In the lineItems map:
const imageUrl = resolveImageUrl(item.product.image);
product_data: {
  name: item.product.name,
  ...(imageUrl ? { images: [imageUrl] } : {}),
},
```

Add `API_URL=https://your-server.com` to your `.env`.

---

### 4.4 Auth user cache not invalidated when admin changes user role

**Why it matters:** Auth user is cached for 5 minutes in Redis (`auth:user:<id>`). If an admin demotes a user, that user keeps admin access for up to 5 minutes. This is a privilege escalation window.

**Fix — invalidate the target user's auth cache when admin updates their role:**

```ts
// In adminController.ts, wherever user role is updated:
await prisma.user.update({ where: { id: userId }, data: { roles: newRole } });
await redis.del(`auth:user:${userId}`); // immediately invalidate their cached identity
```

---

### 4.5 No database indexes on `CartItem` and `ReviewVote.userId`

**Add to Prisma schema:**

```prisma
// CartItem — for "all items in a cart" queries:
@@index([cartId])

// ReviewVote — for "did this user vote?" queries:
@@index([userId])
```

---

## 5. SCHEMA ADDITIONS SUMMARY

All at once as a single migration:

```prisma
// Order model — add:
shippingName    String?
shippingStreet  String?
shippingCity    String?
shippingState   String?
shippingZip     String?
shippingCountry String?
couponCode      String?
discountAmount  Float     @default(0)
trackingNumber  String?
shippingLabel   String?   // URL to label PDF if you integrate ShipStation etc.
shippedAt       DateTime?

// Products model — add:
deletedAt       DateTime?
@@index([deletedAt])

// CartItem — add:
@@unique([cartId, product_id])
@@index([cartId])

// ReviewVote — add:
@@index([userId])
```

```bash
npx prisma migrate dev --name production_hardening
```

---

## 6. WHAT I MISSED IN THE FIRST PASS

---

### 6.1 Variants are completely disconnected from cart and orders (design flaw)

**Why it matters:** You built a full variant system (`ProductVariant` with stock, price modifier, availability). But `CartItem` and `OrderItem` have no `variantId` field. So when a customer picks "Size L / Black", that choice is invisible to the order. The variant's stock is never decremented. The customer could order a variant that has 0 stock. The whole variant feature does nothing real right now.

**Step 1 — add to Prisma schema:**

```prisma
// CartItem model — add:
variantId  String?
variant    ProductVariant? @relation(fields: [variantId], references: [id])

// OrderItem model — add:
variantId     String?
variantName   String?   // snapshot the variant name at purchase time

// ProductVariant model — add the back-relations:
cartItems  CartItem[]
orderItems OrderItem[]
```

**Step 2 — update `addItemToCart` to accept and validate `variantId`:**

```ts
const { product_id, quantity, variantId } = addToCartSchema.parse(req.body);

if (variantId) {
  const variant = await prisma.productVariant.findUnique({
    where: { id: variantId },
  });
  if (!variant || variant.product_id !== product_id)
    return next(new AppError("Invalid variant for this product", 400));
  if (!variant.availability || variant.stock < quantity)
    return next(
      new AppError(
        `Only ${variant.stock} units of this variant available`,
        400,
      ),
    );
}
```

**Step 3 — decrement variant stock on order, not just product stock:**

```ts
// In createOrder / checkoutFromCart transaction loop:
if (item.variantId) {
  await tx.productVariant.update({
    where: { id: item.variantId },
    data: { stock: { decrement: item.quantity } },
  });
} else {
  await tx.products.update({
    where: { product_id: item.product_id },
    data: { stock: { decrement: item.quantity } },
  });
}
```

---

### 6.2 `getAllUsers` has no pagination — full table scan on every call

**File:** `backend/src/controller/adminController.ts` line 44  
**Why it matters:** `prisma.user.findMany({ where })` with no `take`/`skip` returns every user in the database. At 10,000 users this causes serious memory pressure and a slow query, and the entire result is serialized into Redis.

**Fix:**

```ts
export const getAllUsers = catchAsync(async (req, res, _next) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
  const skip = (page - 1) * limit;
  const includeInactive = req.query.includeInactive === "true";
  const where = includeInactive ? {} : { active: true };

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
    }),
    prisma.user.count({ where }),
  ]);

  res.status(200).json({
    status: "success",
    results: users.length,
    total,
    totalPages: Math.ceil(total / limit),
    page,
    data: { users: users.map(sanitizeUser) },
  });
});
// Remove the Redis cache from this endpoint entirely — paginated results
// cached by full query string are rarely reused and waste Redis memory.
```

---

### 6.3 Product cache is polluted by arbitrary query parameters

**File:** `backend/src/controller/productController.ts` — `getProductsQueryKey`  
**Why it matters:** The cache key is `JSON.stringify(req.query)` over ALL query params. If a client sends `?limit=10&_tracking=abc123&session=xyz`, that creates a unique cache entry that will never be hit again. Over time Redis fills up with thousands of useless one-hit cache entries.

**Fix — whitelist the params you actually use:**

```ts
const ALLOWED_CACHE_PARAMS = new Set([
  "page",
  "limit",
  "sort",
  "order",
  "category_id",
  "minPrice",
  "maxPrice",
  "availability",
  "fields",
  "includeImages",
  "brand",
  "search",
]);

const getProductsQueryKey = (query: Record<string, unknown>) => {
  const filtered = Object.keys(query)
    .filter((k) => ALLOWED_CACHE_PARAMS.has(k))
    .sort()
    .reduce<Record<string, unknown>>((acc, k) => {
      acc[k] = query[k];
      return acc;
    }, {});
  return `products:list:${JSON.stringify(filtered)}`;
};
```

---

### 6.4 `adminController.updateUser` does NOT invalidate the auth cache

**File:** `backend/src/controller/adminController.ts` lines 131–137  
**Why it matters:** When an admin changes a user's role (e.g., promotes or demotes), the `auth:user:<id>` Redis key still holds the old role for up to 5 minutes. The user keeps their old permissions until the TTL expires.

The first document mentioned this but gave a vague location. The specific missing line is here:

**Fix — add one line after the update:**

```ts
const updatedUser = await prisma.user.update({
  where: { id: req.params.id },
  data: { name, email, roles },
});

await redis.del(getUserKey(updatedUser.id));
await redis.del(`auth:user:${updatedUser.id}`); // ← ADD THIS — roles take effect immediately
await clearUserCache();
```

---

### 6.5 Password strength is too weak

**File:** `backend/src/Schema/userSchema.ts`  
**Why it matters:** The only requirement is 8 characters. `password12345678` passes. Real ecommerce handles payments — a weak password policy is a liability.

**Fix:**

```ts
password: z
  .string()
  .min(8, "Password must be at least 8 characters")
  .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
  .regex(/[0-9]/, "Password must contain at least one number")
  .regex(/[^A-Za-z0-9]/, "Password must contain at least one special character"),
```

---

### 6.6 Email enumeration on signup

**File:** `backend/src/controller/authController.ts` line 80  
**Why it matters:** The signup response says "User with this email already exists". An attacker can harvest which emails are registered by trying signups in bulk. This is standard practice to avoid.

**Fix — always return success, send a "you already have an account" email instead:**

```ts
if (exitingUser) {
  // Don't reveal the account exists — queue a "looks like you have an account" email
  await emailQueue.add("send-email", {
    email: user.email,
    subject: "Sign-in attempt to Northline",
    template: "alreadyRegistered",
    templateData: { loginUrl: `${process.env.CLIENT_URL}/login` },
  });
  // Return the same shape as a successful signup — no info leak
  return res.status(201).json({
    status: "success",
    message: "If this email is new, your account has been created.",
  });
}
```

---

### 6.7 `scanDel` sends N individual Redis commands instead of one batch

**File:** `backend/src/config/redis.ts` line 48  
**Why it matters:** `Promise.all(keys.map(k => rc.del(k)))` sends one network round-trip per key. On a product update that invalidates 50 cached list entries, that's 50 sequential Redis commands on the pipeline. `del([...keys])` (passing an array) sends a single command with all keys.

**Current code:**

```ts
if (keys.length > 0) await Promise.all(keys.map((k) => rc.del(k)));
```

**Fix:**

```ts
if (keys.length > 0) await rc.unlink(keys); // unlink = async DEL, array = single command
```

---

### 6.8 Stripe checkout ignores coupons entirely

**File:** `backend/src/controller/paymentController.ts`  
**Why it matters:** The Stripe checkout path (`createCheckoutSession`) has no coupon parameter. So any user who pays via Stripe (the real payment flow) never gets a discount. Coupons only work on the manual `createOrder` path which isn't used for real payments.

**Fix — accept `couponCode` in the checkout session, apply discount via Stripe's built-in coupon API or a manual price adjustment:**

Option A (simplest) — manually reduce line item prices:

```ts
export const createCheckoutSession = catchAsync(async (req, res, next) => {
  const { couponCode } = req.body as { couponCode?: string };
  // ...existing cart fetch and validation...

  // Resolve coupon discount
  let discountMultiplier = 1;
  let resolvedCouponCode: string | null = null;
  if (couponCode) {
    const coupon = await prisma.coupon.findUnique({
      where: { code: couponCode.toUpperCase() },
    });
    if (
      coupon &&
      coupon.active &&
      (!coupon.expiresAt || coupon.expiresAt > new Date()) &&
      (coupon.maxUses === null || coupon.usedCount < coupon.maxUses)
    ) {
      const subtotal = cart.items.reduce(
        (s, i) => s + i.product.price * i.quantity,
        0,
      );
      const discount =
        coupon.type === "PERCENTAGE"
          ? (subtotal * coupon.value) / 100
          : Math.min(coupon.value, subtotal);
      discountMultiplier = Math.max(0, (subtotal - discount) / subtotal);
      resolvedCouponCode = coupon.code;
    }
  }

  const lineItems = cart.items.map((item) => ({
    price_data: {
      currency: "usd",
      product_data: { name: item.product.name },
      unit_amount: Math.round(item.product.price * discountMultiplier * 100),
    },
    quantity: item.quantity,
  }));

  const session = await getStripe().checkout.sessions.create({
    mode: "payment",
    line_items: lineItems,
    metadata: { userId, couponCode: resolvedCouponCode ?? "" },
    success_url: `${clientUrl}/orders/confirmation/{CHECKOUT_SESSION_ID}`,
    cancel_url: `${clientUrl}/cart`,
  });
  // ...
});
```

Then in `fulfillCartOrder`, read `session.metadata.couponCode` and call `applyCoupon` + set `discountAmount` on the order.

---

### 6.9 No HTTP access logs in production

**File:** `backend/src/app.ts` lines 75–77  
**Why it matters:** Morgan is only enabled in development. In production you have zero HTTP access logs — no record of who called what endpoint, when, with what status code. When something goes wrong in production you have no data to debug with.

**Fix — always log HTTP, just change the format:**

```ts
// Replace the current conditional morgan block:
const morganFormat =
  process.env.NODE_ENV === "production"
    ? ":remote-addr - :method :url :status :res[content-length] - :response-time ms"
    : "dev";
app.use(
  morgan(morganFormat, {
    stream: { write: (msg) => logger.http(msg.trim()) }, // route through Winston
  }),
);
```

---

### 6.10 No tests

**Why it matters:** You have no test files at all — not a single unit or integration test. This means every change you make could silently break existing behaviour and you won't know until a user reports it.

**The minimum for ecommerce:**

```
backend/
  src/
    __tests__/
      auth.test.ts         ← signup, login, token refresh, password reset
      products.test.ts     ← CRUD, filtering, caching
      cart.test.ts         ← add/update/remove, stock enforcement
      orders.test.ts       ← create, cancel, stock decrement
      coupons.test.ts      ← validate, apply, edge cases
      payment.test.ts      ← webhook idempotency, fulfillment
```

**Recommended stack:**

```bash
npm install --save-dev vitest supertest @types/supertest
```

Start with just the coupon and order tests — those are where your bugs are.

---

## 7. COMPLETE PRIORITY ORDER

| Priority    | Item                                           | Effort  |
| ----------- | ---------------------------------------------- | ------- |
| 🔴 Critical | 1.1 Coupon discount never applied to total     | 30 min  |
| 🔴 Critical | 1.2 Double-delete coupon crash                 | 5 min   |
| 🔴 Critical | 1.3 Coupon `dat` typo                          | 2 min   |
| 🔴 Critical | 1.4 Contact limiter wrong path                 | 2 min   |
| 🔴 Critical | 1.5 Order ignores product discount             | 20 min  |
| 🔴 Critical | 6.1 Variants disconnected from cart/orders     | 2 hours |
| 🔴 Critical | 6.8 Stripe checkout ignores coupons entirely   | 45 min  |
| 🟠 High     | 3.1 Shipping address on order                  | 45 min  |
| 🟠 High     | 3.5 Soft delete products                       | 30 min  |
| 🟠 High     | 4.2 Cart race condition + unique constraint    | 20 min  |
| 🟠 High     | 6.2 Paginate `getAllUsers`                     | 20 min  |
| 🟠 High     | 6.4 Role change doesn't invalidate auth cache  | 2 min   |
| 🟠 High     | 2.4 Zod validate `updateReview`                | 10 min  |
| 🟡 Medium   | 3.2 Tracking number on orders                  | 20 min  |
| 🟡 Medium   | 3.3 Paginate `getMyOrder`                      | 15 min  |
| 🟡 Medium   | 3.4 Block unavailable products in cart         | 5 min   |
| 🟡 Medium   | 4.3 Fix Stripe image URL (local filenames)     | 10 min  |
| 🟡 Medium   | 6.3 Cache key pollution from arbitrary params  | 15 min  |
| 🟡 Medium   | 6.5 Strengthen password policy                 | 5 min   |
| 🟡 Medium   | 6.6 Email enumeration on signup                | 20 min  |
| 🟡 Medium   | 6.9 HTTP access logs missing in production     | 10 min  |
| 🟢 Low      | 2.1 CSRF protection                            | 1 hour  |
| 🟢 Low      | 2.2 Env var validation at startup              | 10 min  |
| 🟢 Low      | 2.3 Authenticated user image route             | 30 min  |
| 🟢 Low      | 6.7 scanDel bulk UNLINK                        | 5 min   |
| 🟢 Low      | 3.6 Better analytics                           | 45 min  |
| 🟢 Low      | 6.10 Write tests (start with orders + coupons) | ongoing |
