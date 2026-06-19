# Profile & Account Backend Changes

All 8 changes needed to fully back the profile, security, and admin pages.
Each section contains: what to add to `schema.prisma`, the migration command, and
the full controller/route code using the same patterns (catchAsync, AppError,
Zod, Redis, logger) already used in this project.

---

## Table of Contents

1. [Default Address](#1-default-address)
2. [Shipping Address Snapshot on Order](#2-shipping-address-snapshot-on-order)
3. [Payment Method on Order](#3-payment-method-on-order)
4. [Email Re-verification on Email Change](#4-email-re-verification-on-email-change)
5. [Login Session History](#5-login-session-history)
6. [Two-Factor Authentication (TOTP)](#6-two-factor-authentication-totp)
7. [Admin: Filter Orders by User](#7-admin-filter-orders-by-user)
8. [Admin: Order Count per User](#8-admin-order-count-per-user)

---

## 1. Default Address

### Why
The frontend "Addresses" page needs to mark one address as the default so the
checkout flow can pre-select it. Currently there is no `isDefault` field.

### Schema change — `backend/prisma/schema.prisma`

Inside the `Address` model, add one field:

```prisma
model Address {
  id        String   @id @default(uuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  street    String
  city      String
  state     String?
  zipCode   String?
  country   String?
  isDefault Boolean  @default(false)   // ← ADD THIS
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([userId])                    // ← ADD THIS (optional but cheap)
}
```

### Migration

```bash
cd backend
npx prisma migrate dev --name add_address_isDefault
```

### Schema update — `backend/src/Schema/addressSchema.ts`

Add `isDefault` to both schemas:

```ts
export const updateAddressSchema = z.object({
  street:    z.string().min(2).optional(),
  city:      z.string().min(2).optional(),
  state:     z.string().optional(),
  zipCode:   z.string().optional(),
  country:   z.string().optional(),
  isDefault: z.boolean().optional(),  // ← ADD
});
```

### New controller — `backend/src/controller/addressController.ts`

Add this function at the bottom of the existing file:

```ts
// Set an address as the default — unsets all others for this user first
export const setDefaultAddress = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const addressId = req.params.id;
    const userId    = req.user!.id;

    const address = await prisma.address.findUnique({ where: { id: addressId } });
    if (!address || address.userId !== userId) {
      return next(new AppError("Address not found or unauthorized", 404));
    }

    // Unset every existing default for this user, then set the chosen one
    await prisma.$transaction([
      prisma.address.updateMany({
        where: { userId, isDefault: true },
        data:  { isDefault: false },
      }),
      prisma.address.update({
        where: { id: addressId },
        data:  { isDefault: true },
      }),
    ]);

    await clearAddressListCache(userId);

    logger.info("Default address set", { userId, addressId });
    res.status(200).json({ status: "success", data: null });
  },
);
```

Also update `updateAddress` to handle `isDefault` in the PATCH body — if the
incoming `updateData` contains `isDefault: true`, run the same unset-all-then-set
transaction instead of a plain `update`:

```ts
export const updateAddress = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const addressId = req.params.id;
    const userId    = req.user!.id;
    const updateData = updateAddressSchema.parse(req.body);

    const address = await prisma.address.findUnique({ where: { id: addressId } });
    if (!address || address.userId !== userId) {
      return next(new AppError("Address not found or unauthorized", 404));
    }

    let updatedAddress;

    if (updateData.isDefault === true) {
      // Atomic default-swap
      const [, updated] = await prisma.$transaction([
        prisma.address.updateMany({
          where: { userId, isDefault: true },
          data:  { isDefault: false },
        }),
        prisma.address.update({
          where: { id: addressId },
          data:  updateData,
        }),
      ]);
      updatedAddress = updated;
    } else {
      updatedAddress = await prisma.address.update({
        where: { id: addressId },
        data:  updateData,
      });
    }

    await redis.del(getAddressKey(addressId));
    await clearAddressListCache(userId);

    logger.info("Address updated successfully");
    res.status(200).json({ status: "success", data: { address: updatedAddress } });
  },
);
```

### Route — `backend/src/Routes/User/addressRoutes.ts`

Export `setDefaultAddress` and add the route:

```ts
import { createAddress, updateAddress, getAllAddresses,
         getAddress, deleteAddress, setDefaultAddress } from "../../controller/addressController";

// existing routes …
router.patch("/:id/default", validateParams(addressIdSchema), setDefaultAddress);
```

---

## 2. Shipping Address Snapshot on Order

### Why
If a user edits or deletes an address after placing an order, the historical
order details become wrong. Storing a JSON snapshot at order-creation time
freezes the address forever.

### Schema change

```prisma
model Order {
  // … existing fields …
  shippingAddress Json?   // ← ADD: { street, city, state, zipCode, country }
}
```

```bash
npx prisma migrate dev --name add_order_shippingAddress
```

### Where to set it

The order is created in the **Stripe webhook** handler (or wherever your
`paymentController` creates the `Order` row after a successful payment).
Look in `backend/src/controller/paymentController.ts` for `prisma.order.create`.
Add `shippingAddress` there:

```ts
// Inside your checkout/webhook handler, after you have the addressId:
const address = await prisma.address.findUnique({ where: { id: addressId } });

const order = await prisma.order.create({
  data: {
    userId,
    total,
    status: "PENDING",
    stripeSessionId,
    shippingAddress: address
      ? {
          street:  address.street,
          city:    address.city,
          state:   address.state  ?? null,
          zipCode: address.zipCode ?? null,
          country: address.country ?? null,
        }
      : undefined,
    items: { create: orderItems },
  },
});
```

No new endpoint required — the snapshot is returned as part of the existing
`GET /api/v1/orders/:id` response automatically once the field exists.

---

## 3. Payment Method on Order

### Why
The "Orders" page should show "Visa ending 4242" or "PayPal" next to each order.
Stripe returns this data in the checkout session; we just need to persist it.

### Schema change

```prisma
model Order {
  // … existing fields …
  paymentMethod Json?   // ← ADD: { type, brand, last4 } or { type: "paypal", email }
}
```

```bash
npx prisma migrate dev --name add_order_paymentMethod
```

### Where to set it

In your Stripe webhook handler (`checkout.session.completed` event), retrieve
the payment method details and save them:

```ts
import Stripe from "stripe";
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

// Inside your webhook handler:
case "checkout.session.completed": {
  const session = event.data.object as Stripe.Checkout.Session;

  // Retrieve full session with payment intent expanded
  const fullSession = await stripe.checkout.sessions.retrieve(session.id, {
    expand: ["payment_intent.payment_method"],
  });

  const pi = fullSession.payment_intent as Stripe.PaymentIntent | null;
  const pm = pi?.payment_method as Stripe.PaymentMethod | null;

  let paymentMethod: Record<string, unknown> | undefined;
  if (pm?.type === "card" && pm.card) {
    paymentMethod = {
      type:  "card",
      brand: pm.card.brand,   // "visa", "mastercard", etc.
      last4: pm.card.last4,
    };
  } else if (pm?.type === "paypal" && pm.paypal) {
    paymentMethod = {
      type:  "paypal",
      email: pm.paypal.payer_email,
    };
  }

  await prisma.order.update({
    where: { stripeSessionId: session.id },
    data:  { paymentMethod },
  });
  break;
}
```

No new endpoint — included automatically in order responses.

---

## 4. Email Re-verification on Email Change

### Why
If a user changes their email, the old verified status should not carry over.
The new address must be verified and the user should be signed out so they
re-authenticate with the new email.

### Controller change — `backend/src/controller/userController.ts`

Replace the existing `updateMe` export with this version:

```ts
export const updateMe = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    if (req.body.password || req.body.passwordConfirm) {
      return next(new AppError("Use /updateMyPassword to change your password", 400));
    }

    const userData    = updateUserSchema.parse(req.body);
    const filteredBody = filterObj(userData, "name", "email", "phoneNumber");
    if (req.file) filteredBody.profileImage = req.file.filename;

    if (Object.keys(filteredBody).length === 0) {
      return next(new AppError("Provide at least one valid field to update", 400));
    }

    const emailChanging =
      filteredBody.email &&
      filteredBody.email !== req.user!.email;

    if (emailChanging) {
      // Check no other account already uses the new email
      const taken = await prisma.user.findUnique({
        where: { email: filteredBody.email as string },
      });
      if (taken) return next(new AppError("Email already in use", 400));

      // Generate a verification token for the new address
      const rawToken    = crypto.randomBytes(32).toString("hex");
      const hashedToken = crypto.createHash("sha256").update(rawToken).digest("hex");

      Object.assign(filteredBody, {
        isVerified:       false,
        verifyToken:      hashedToken,
        verifyTokenExpiry: new Date(Date.now() + 24 * 60 * 60 * 1000),
      });

      // Send verification email to the NEW address
      const verifyURL = `${req.protocol}://${req.get("host")}/api/v1/users/verifyEmail/${rawToken}`;
      try {
        await emailQueue.add("send-email", {
          email:        filteredBody.email as string,
          subject:      "Verify your new email address",
          template:     "verifyEmail",
          templateData: { name: req.user!.name, verifyURL },
        });
      } catch {
        logger.warn("Failed to send re-verification email", { email: filteredBody.email });
      }
    }

    const updatedUser = await prisma.user.update({
      where: { id: req.user!.id },
      data:  filteredBody,
    });

    // Invalidate auth cache
    await redis.del(`auth:user:${req.user!.id}`);

    // If email changed, revoke tokens so the user is signed out
    if (emailChanging) {
      await redis.del(`refresh:${req.user!.id}`);
      logger.info("Email changed — tokens revoked, re-verification required", {
        userId: req.user!.id,
      });
      return res.status(200).json({
        status:  "success",
        message: "Email updated. Please check your new inbox to re-verify, then sign in again.",
        requiresReauth: true,
        user:    sanitizeUser(updatedUser),
      });
    }

    logger.info(`User ${req.user!.id} updated profile`);
    res.status(200).json({
      status:  "success",
      message: "Profile updated successfully",
      user:    sanitizeUser(updatedUser),
    });
  },
);
```

You need to add these imports at the top of `userController.ts`:

```ts
import crypto from "crypto";
import { emailQueue } from "../jobs/emailQueue";
```

### Frontend note

The frontend `AccountProfilePage.tsx` already shows a warning and the mutation
already checks for `requiresReauth: true` in the response — when it receives
that flag it should call `logout()`. Wire that up:

```ts
// In the onSuccess of updateProfile mutation (AccountProfilePage.tsx):
onSuccess: (data) => {
  if (data.requiresReauth) {
    toast.success("Email updated — please check your inbox and sign in again.");
    logout();
    return;
  }
  // … normal success flow
},
```

---

## 5. Login Session History

### Why
The security page has a "Sessions" section ready to list recent sign-ins with
device, browser, and location info. The backend needs to record each login.

### Install dependency

```bash
cd backend
npm install ua-parser-js
npm install -D @types/ua-parser-js
```

### Schema change

```prisma
model LoginSession {
  id        String   @id @default(uuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  ipAddress String?
  userAgent String?
  device    String?   // "Desktop", "Mobile", "Tablet"
  browser   String?   // "Chrome 124", "Safari 17"
  os        String?   // "Windows 10", "macOS 14"
  createdAt DateTime @default(now())

  @@index([userId])
  @@index([userId, createdAt(sort: Desc)])
}
```

Add the reverse relation to `User`:

```prisma
model User {
  // … existing fields …
  loginSessions  LoginSession[]
}
```

```bash
npx prisma migrate dev --name add_login_sessions
```

### Controller addition — `backend/src/controller/authController.ts`

Add a helper near the top:

```ts
import { UAParser } from "ua-parser-js";

async function recordLoginSession(
  userId:    string,
  req:       Request,
) {
  try {
    const ua     = new UAParser(req.headers["user-agent"] ?? "");
    const result = ua.getResult();
    await prisma.loginSession.create({
      data: {
        userId,
        ipAddress: (req.headers["x-forwarded-for"] as string)?.split(",")[0].trim()
                   ?? req.socket.remoteAddress
                   ?? null,
        userAgent: req.headers["user-agent"] ?? null,
        device:    result.device.type ?? "Desktop",
        browser:   result.browser.name
                   ? `${result.browser.name} ${result.browser.major ?? ""}`.trim()
                   : null,
        os:        result.os.name
                   ? `${result.os.name} ${result.os.version ?? ""}`.trim()
                   : null,
      },
    });
  } catch {
    // Non-fatal — never block the login response
    logger.warn("Failed to record login session", { userId });
  }
}
```

Call it at the end of both `login` and `signup` (right before `res.status(200/201)`):

```ts
// In the login handler, after building sanitizedUser:
await recordLoginSession(user.id, req);
res.status(200).json({ … });

// In the signup handler:
await recordLoginSession(newUser.id, req);
res.status(201).json({ … });
```

### New endpoint — `GET /api/v1/users/sessions`

Add to `backend/src/controller/userController.ts`:

```ts
export const getMySessions = catchAsync(
  async (req: Request, res: Response, _next: NextFunction) => {
    const sessions = await prisma.loginSession.findMany({
      where:   { userId: req.user!.id },
      orderBy: { createdAt: "desc" },
      take:    20,
      select:  {
        id:        true,
        ipAddress: true,
        device:    true,
        browser:   true,
        os:        true,
        createdAt: true,
      },
    });
    res.status(200).json({ status: "success", data: { sessions } });
  },
);
```

### Route — `backend/src/Routes/User/userRoutes.ts`

```ts
import { updateMe, getMe, deleteMe, getMySessions } from "../../controller/userController";

// After router.use(Protect):
router.get("/sessions", getMySessions);
```

---

## 6. Two-Factor Authentication (TOTP)

### Why
The security page has a locked 2FA section. TOTP (Google Authenticator / Authy)
is the standard implementation.

### Install dependencies

```bash
cd backend
npm install speakeasy qrcode
npm install -D @types/speakeasy @types/qrcode
```

### Schema change

```prisma
model User {
  // … existing fields …
  twoFactorSecret  String?
  twoFactorEnabled Boolean @default(false)
}
```

```bash
npx prisma migrate dev --name add_2fa
```

### New controller — `backend/src/controller/twoFactorController.ts`

```ts
import { Request, Response, NextFunction } from "express";
import speakeasy from "speakeasy";
import QRCode    from "qrcode";
import catchAsync from "../utils/catchAsync";
import AppError   from "../utils/AppError";
import { prisma } from "../config/database";
import { client as redis } from "../config/redis";
import logger from "../config/logger";

const APP_NAME = "Northline";

// Step 1 — generate a secret and return a QR code URI
// The secret is stored temporarily in Redis; only saved to the DB after
// the user verifies it successfully (step 2).
export const setup2FA = catchAsync(
  async (req: Request, res: Response, _next: NextFunction) => {
    const userId = req.user!.id;
    const email  = req.user!.email;

    const secret = speakeasy.generateSecret({
      name:   `${APP_NAME} (${email})`,
      length: 20,
    });

    // Store the raw base32 secret in Redis for 10 minutes while the user scans
    await redis.set(`2fa:setup:${userId}`, secret.base32, { EX: 600 });

    const otpauthUrl = secret.otpauth_url!;
    const qrCodeDataUrl = await QRCode.toDataURL(otpauthUrl);

    logger.info("2FA setup initiated", { userId });
    res.status(200).json({
      status: "success",
      data: {
        secret:     secret.base32,   // show this as the manual-entry fallback
        qrCode:     qrCodeDataUrl,   // base64 PNG — render as <img src={qrCode} />
      },
    });
  },
);

// Step 2 — verify the first TOTP code, then enable 2FA permanently
export const verify2FA = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const userId = req.user!.id;
    const { token } = req.body as { token?: string };

    if (!token) return next(new AppError("TOTP code is required", 400));

    const pendingSecret = await redis.get(`2fa:setup:${userId}`);
    if (!pendingSecret) {
      return next(new AppError("2FA setup session expired. Please restart setup.", 400));
    }

    const valid = speakeasy.totp.verify({
      secret:   pendingSecret,
      encoding: "base32",
      token,
      window:   1,   // allow 30 s clock drift
    });

    if (!valid) return next(new AppError("Invalid code — try again", 400));

    await prisma.user.update({
      where: { id: userId },
      data:  { twoFactorSecret: pendingSecret, twoFactorEnabled: true },
    });

    await redis.del(`2fa:setup:${userId}`);
    await redis.del(`auth:user:${userId}`);

    logger.info("2FA enabled", { userId });
    res.status(200).json({ status: "success", message: "Two-factor authentication enabled." });
  },
);

// Disable 2FA
export const disable2FA = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const userId = req.user!.id;
    const { token } = req.body as { token?: string };

    if (!token) return next(new AppError("TOTP code is required to disable 2FA", 400));

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user?.twoFactorEnabled || !user.twoFactorSecret) {
      return next(new AppError("2FA is not enabled on this account", 400));
    }

    const valid = speakeasy.totp.verify({
      secret:   user.twoFactorSecret,
      encoding: "base32",
      token,
      window:   1,
    });

    if (!valid) return next(new AppError("Invalid code — try again", 400));

    await prisma.user.update({
      where: { id: userId },
      data:  { twoFactorSecret: null, twoFactorEnabled: false },
    });

    await redis.del(`auth:user:${userId}`);

    logger.info("2FA disabled", { userId });
    res.status(200).json({ status: "success", message: "Two-factor authentication disabled." });
  },
);

// Check current 2FA status (for page load)
export const get2FAStatus = catchAsync(
  async (req: Request, res: Response, _next: NextFunction) => {
    const user = await prisma.user.findUnique({
      where:  { id: req.user!.id },
      select: { twoFactorEnabled: true },
    });
    res.status(200).json({
      status: "success",
      data:   { enabled: user?.twoFactorEnabled ?? false },
    });
  },
);
```

### Routes — `backend/src/Routes/User/userRoutes.ts`

```ts
import { setup2FA, verify2FA, disable2FA, get2FAStatus }
  from "../../controller/twoFactorController";

// After router.use(Protect):
router.get( "/2fa/status",  get2FAStatus);
router.get( "/2fa/setup",   setup2FA);
router.post("/2fa/verify",  verify2FA);
router.post("/2fa/disable", disable2FA);
```

### Using 2FA at login

Once enabled, the login flow becomes two-step. The simplest implementation
is to return a short-lived "pending" token after the password check passes,
then require a `/2fa/confirm` call with the TOTP code to get the real access token:

```ts
// In the login handler, after password is verified:
if (user.twoFactorEnabled) {
  // Issue a short-lived "pending" JWT (15 min), no access yet
  const pendingToken = JWT.sign(
    { id: user.id, pending2fa: true },
    process.env.JWT_SECRET!,
    { expiresIn: "15m" },
  );
  return res.status(200).json({
    status:       "success",
    requires2FA:  true,
    pendingToken,
  });
}
// … rest of normal login (issue real tokens)
```

Add a `/2fa/confirm` endpoint:

```ts
export const confirm2FALogin = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const { pendingToken, code } = req.body as { pendingToken?: string; code?: string };
    if (!pendingToken || !code) return next(new AppError("pendingToken and code required", 400));

    let decoded: { id: string; pending2fa: boolean };
    try {
      decoded = JWT.verify(pendingToken, process.env.JWT_SECRET!) as typeof decoded;
    } catch {
      return next(new AppError("Token expired or invalid", 401));
    }

    if (!decoded.pending2fa) return next(new AppError("Invalid token type", 401));

    const user = await prisma.user.findUnique({ where: { id: decoded.id } });
    if (!user?.twoFactorSecret) return next(new AppError("2FA not configured", 400));

    const valid = speakeasy.totp.verify({
      secret: user.twoFactorSecret, encoding: "base32", token: code, window: 1,
    });
    if (!valid) return next(new AppError("Invalid code", 400));

    // Issue real tokens (same as normal login)
    const accessToken  = signAccessToken({ id: user.id });
    const refreshToken = signRefreshToken({ id: user.id });
    await redis.set(`refresh:${user.id}`, refreshToken, { EX: 7 * 24 * 60 * 60 });

    res.status(200).json({ status: "success", accessToken });
  },
);
```

---

## 7. Admin: Filter Orders by User

### Why
The admin panel needs to click a user row and see that user's orders.

### Controller change — `backend/src/controller/adminController.ts`

Find the existing `getAllOrders` (or equivalent) in the admin order controller
(`adminOrderRoutes.ts` → its controller). Add a `userId` query filter:

```ts
// In the admin orders controller (wherever prisma.order.findMany is called):
export const adminGetOrders = catchAsync(
  async (req: Request, res: Response, _next: NextFunction) => {
    const {
      limit = "50",
      sortBy = "createdAt",
      order  = "desc",
      status,
      userId,           // ← NEW
    } = req.query as Record<string, string>;

    const where: Prisma.OrderWhereInput = {};
    if (status) where.status = status as OrderStatus;
    if (userId) where.userId = userId;           // ← NEW

    const orders = await prisma.order.findMany({
      where,
      orderBy: { [sortBy]: order },
      take:    Number(limit),
      include: {
        user:  { select: { id: true, name: true, email: true } },
        items: { include: { product: { select: { name: true, image: true } } } },
      },
    });

    res.status(200).json({
      status: "success",
      results: orders.length,
      data: { orders },
    });
  },
);
```

No schema change needed — just a `where` clause addition.

---

## 8. Admin: Order Count per User

### Why
The admin users table should show how many orders each user has placed without
a separate request per user.

### Controller change — `backend/src/controller/adminController.ts`

In `getAllUsers`, include `_count`:

```ts
export const getAllUsers = catchAsync(
  async (req: Request, res: Response, _next: NextFunction) => {
    const includeInactive = req.query.includeInactive === "true";
    const cacheKey = getUserQueryKey(req.query);

    const cachedUsers = await redis.get(cacheKey);
    if (cachedUsers) {
      return res.status(200).json({
        status: "success",
        source: "cache",
        data: { users: JSON.parse(cachedUsers) },
      });
    }

    const where = includeInactive ? {} : { active: true };
    const users = await prisma.user.findMany({
      where,
      include: {
        _count: { select: { orders: true } },   // ← ADD
      },
    });

    const safeUsers = users.map((u) => {
      const { password, resetToken, resetTokenExpiry,
              verifyToken, verifyTokenExpiry, ...safe } = u;
      return {
        ...safe,
        orderCount: u._count.orders,            // ← ADD
      };
    });

    await redis.setEx(cacheKey, REDIS_TTL, JSON.stringify(safeUsers));

    res.status(200).json({
      status: "success",
      results: safeUsers.length,
      data: { users: safeUsers },
    });
  },
);
```

`_count.orders` uses the existing `Order` relation on `User` — no migration needed.

---

## Implementation Order (recommended)

Do these first — they need migrations and no new dependencies:

1. **Default address** — isolated, low risk
2. **Shipping address snapshot** — requires finding where `Order` is created
3. **Payment method snapshot** — requires Stripe webhook work
4. **Email re-verification** — modifies existing `updateMe`, test carefully
5. **Order count per user** — trivial one-liner change
6. **Admin userId filter** — trivial one-liner change

Then these (new dependencies / more complexity):

7. **Login session history** — needs `ua-parser-js` and a new model
8. **2FA** — needs `speakeasy` + `qrcode`, two-step login flow, frontend wiring

---

## Env Variables to add for 2FA

No new env variables needed — 2FA uses the existing `JWT_SECRET`.

If you later add SMS-based 2FA via Twilio, you'd add:
```
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_PHONE_NUMBER=
```
