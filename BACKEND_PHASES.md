# Northline Backend — Development Phases

> Audit date: 2026-06-18  
> Stack: Node/Express · TypeScript · Prisma · PostgreSQL · Redis · BullMQ · Stripe · Nodemailer

---

## What already exists

Auth (JWT + refresh tokens, 2FA TOTP, email verification, password reset), Products (CRUD, soft-delete, images, variants, price history), Categories, Cart, Orders (create/cancel/update status), Stripe checkout sessions + webhook skeleton, Reviews (verified purchase, helpful votes), Product Q&A, Wishlist (server-side), Newsletter, Contact messages, Coupons (percentage/fixed, expiry, usage cap), Return requests, Back-in-stock subscriptions, Admin analytics dashboard, Audit logs, Address management, Rate limiting (per-route), CSRF, compression, Helmet, request ID middleware, BullMQ email queue.

---

## Phase 1 — Core Commerce Hardening
**Goal:** Make the checkout-to-delivery loop fully end-to-end and reliable. Nothing else matters until this is solid.

### 1.1 Stripe Webhook Completion
- Handle `checkout.session.completed` → mark order `PAID`, decrement stock atomically (Prisma transaction), clear the user's cart
- Handle `payment_intent.payment_failed` → mark order `FAILED`, restore stock
- Handle `charge.refunded` → mark order `REFUNDED`, trigger refund email
- Idempotency: store processed event IDs in Redis, skip duplicates
- Dead-letter logging for unhandled event types

### 1.2 Stock Management
- Decrement stock inside a Prisma transaction when order is placed; reject if any item goes below 0 (prevent oversell)
- Restore stock on order cancellation and on `payment_failed`
- Auto-set `availability = false` when `stock` hits 0; auto-set back to `true` on restock
- Admin: bulk stock update endpoint (`PATCH /admin/products/bulk-stock`)
- Trigger back-in-stock notification job when stock goes from 0 → positive

### 1.3 Transactional Emails (BullMQ jobs)
Currently the email queue exists but these templates/jobs are missing or incomplete:
- **Order confirmed** — send after `PAID` status is set (items, totals, delivery estimate)
- **Order shipped** — send when admin marks `SHIPPED` with tracking number
- **Order delivered** — send when status reaches `DELIVERED`
- **Order cancelled** — send to customer with reason
- **Return approved/rejected** — notify customer of return decision
- **Review request** — schedule 7 days after `DELIVERED` status

### 1.4 Public Order Tracking
The `/track-order` page submits email + order ID but the backend currently has no public endpoint for it (requires auth).
- `GET /api/v1/orders/track?orderId=&email=` — no auth, validates email matches order, returns status + tracking number only (no sensitive data)

### 1.5 Address Defaults
- Add `isDefault Boolean @default(false)` to `Address` model
- `PATCH /api/v1/addresses/:id/default` — sets one address as default, unsets others
- Auto-populate shipping address at checkout from default address

---

## Phase 2 — Search & Discovery
**Goal:** Make it easy for customers to find products. The current search is a simple `name ILIKE` filter.

### 2.1 Full-Text Search
- Add `tsvector` column to `Products` using a Prisma migration + PostgreSQL trigger (or generated column on `name || ' ' || description || ' ' || brand`)
- GIN index on the column
- Replace current `name ILIKE` with `to_tsquery` + `ts_rank` ordering in `productController`
- Support multi-word queries, partial matches, typo tolerance via `pg_trgm`

### 2.2 Product Attributes & Filtering
- New `ProductAttribute` model: `productId`, `key` (e.g. "Color"), `value` (e.g. "Red")
- Admin endpoints to manage attributes
- `GET /api/v1/products?attribute[Color]=Red&attribute[Size]=M`
- Filter by price range, rating minimum, brand, category, availability — all combinable

### 2.3 Product Tags & Collections
- New `Tag` model with `ProductTag` join table
- Admin: create tags, assign to products
- `GET /api/v1/products?tag=summer-sale`
- Powers "Featured", "Staff Picks", "Clearance" collection pages

### 2.4 Product Recommendations
- `GET /api/v1/products/:id/related` — already exists; improve it
- `GET /api/v1/products/:id/frequently-bought-together` — mine `OrderItem` co-occurrences: products bought in the same order, ranked by frequency
- `GET /api/v1/products/trending` — products with most `OrderItem` rows in the last 7 days

---

## Phase 3 — Shipping Integration
**Goal:** Real shipping rates, carrier tracking, and label generation.

### 3.1 Shipping Rate Calculation
- Integrate **EasyPost** or **Shippo** SDK
- `POST /api/v1/shipping/rates` — accepts destination address + cart items, returns available rates (standard, express, overnight) with prices and ETAs
- Store selected rate ID on the order so it can be used to purchase the label

### 3.2 Shipping Label Purchase
- `POST /api/v1/admin/orders/:id/ship` — purchase label via EasyPost/Shippo, store `trackingNumber` + `shippingLabel` URL on order, auto-trigger "Order Shipped" email
- Currently admin sets tracking number manually; this automates it

### 3.3 Carrier Tracking Webhooks
- Register webhook with EasyPost/Shippo to receive tracking updates
- On `in_transit` → update order; on `delivered` → set status to `DELIVERED`, trigger "Order Delivered" email + schedule review request job

### 3.4 Shipping Zones & Rules
- `ShippingZone` model: name, countries/states covered, flat rate or free threshold
- Admin CRUD for zones
- Apply correct zone rate at checkout based on destination address
- Free shipping threshold configurable per zone (currently hardcoded `$50` in frontend constants)

---

## Phase 4 — User Engagement & Retention
**Goal:** Give users reasons to return. Most of these have UI placeholders but no backend.

### 4.1 Loyalty / Rewards Points
Schema additions:
```
model LoyaltyAccount {
  userId      String  @unique
  points      Int     @default(0)
  totalEarned Int     @default(0)
  tier        Tier    @default(BRONZE)
}
model LoyaltyTransaction {
  id        String
  userId    String
  points    Int          // positive = earned, negative = redeemed
  reason    String       // "ORDER_PLACED", "REDEEMED", "EXPIRY"
  orderId   String?
  createdAt DateTime
}
enum Tier { BRONZE SILVER GOLD PLATINUM }
```
- Earn 1 point per $1 spent; award on `DELIVERED` status (not on payment — returns are possible)
- Tier upgrades calculated from `totalEarned` annually
- `POST /api/v1/orders/checkout` — accept `pointsToRedeem`, apply discount (100 pts = $1)
- `GET /api/v1/users/me/loyalty` — return balance, tier, history

### 4.2 Gift Cards
Schema additions:
```
model GiftCard {
  id          String
  code        String    @unique
  balance     Float
  initialValue Float
  purchasedByUserId String?
  recipientEmail String?
  message     String?
  expiresAt   DateTime?
  active      Boolean   @default(true)
}
model GiftCardRedemption {
  id          String
  giftCardId  String
  orderId     String
  amount      Float
  createdAt   DateTime
}
```
- `POST /api/v1/gift-cards/purchase` — create gift card, charge via Stripe, send recipient email
- `POST /api/v1/gift-cards/redeem` — at checkout, apply gift card balance to order total
- `GET /api/v1/gift-cards/:code/balance` — public check endpoint

### 4.3 Abandoned Cart Recovery
- BullMQ job: 1 hour after last `CartItem` update, if cart is non-empty and no order placed, send "You left something behind" email with cart contents
- Cancel job if order is placed
- Only trigger once per 24h per user

### 4.4 Price Drop Alerts
- Extend `Wishlist` or add `PriceAlert` model
- When `PriceHistory` records a price decrease for a product, query wishlists for that product and queue alert emails

### 4.5 Review Request Emails
- Already planned in Phase 1.3 — schedule a BullMQ delayed job (7 days after `DELIVERED`)
- Email links directly to the review form for that product
- Don't send if the user already has a review for that product

### 4.6 Referral Program
```
model Referral {
  id            String
  referrerId    String   // who invited
  referredId    String?  // who signed up
  code          String   @unique
  rewardClaimed Boolean  @default(false)
  createdAt     DateTime
}
```
- Generate referral code on signup
- `GET /api/v1/users/me/referral` — return code + link + stats
- On signup with `?ref=CODE`, record referral; on referred user's first order completing, award loyalty points to both

---

## Phase 5 — Admin & Operations
**Goal:** Give the admin panel the tools needed to actually run the business day-to-day.

### 5.1 Enhanced Analytics
Currently `getDashboardStats` returns basic counts. Extend with:
- Revenue over time: daily/weekly/monthly/yearly breakdowns
- Average order value trend
- Top 10 products by revenue, by units sold
- Top customers by lifetime value
- Conversion funnel: sessions → cart adds → checkouts → orders (requires event tracking — see Phase 6.3)
- Cohort retention (% of customers who reorder within 30/60/90 days)
- Stock alert: products with stock ≤ 5

### 5.2 Product Import / Export
- `GET /admin/products/export` — CSV or XLSX of all products with stock/price/category
- `POST /admin/products/import` — multipart CSV upload, validate rows with Zod, upsert (create or update by SKU)
- Background job for large imports with progress tracking via Redis key

### 5.3 Bulk Operations
- `PATCH /admin/products/bulk` — body: `{ ids: string[], update: { discount?: number, availability?: boolean } }`
- `PATCH /admin/orders/bulk-status` — batch order status update
- `DELETE /admin/products/bulk` — soft-delete many

### 5.4 Promotions & Flash Sales
```
model Promotion {
  id          String
  name        String
  type        PromotionType  // FLASH_SALE, BUY_X_GET_Y, PERCENTAGE_OFF_CATEGORY
  value       Float
  categoryId  Int?
  startsAt    DateTime
  endsAt      DateTime
  active      Boolean
}
```
- BullMQ scheduled job: activate promotion at `startsAt`, deactivate at `endsAt`
- Apply promotions to applicable products/categories at checkout
- Admin: create/edit/preview promotions

### 5.5 Content & Banner Management
```
model Banner {
  id       String
  title    String
  subtitle String?
  imageUrl String
  linkUrl  String?
  position String   // HOME_HERO, DEALS_PAGE, etc.
  active   Boolean
  order    Int
  startsAt DateTime?
  endsAt   DateTime?
}
```
- `GET /api/v1/banners?position=HOME_HERO` — frontend fetches instead of hardcoding
- Admin: CRUD for banners with image upload

### 5.6 Admin Notification Center
- `AdminNotification` model: type, message, read, metadata
- Auto-create notifications for: new order, low stock, new return request, new contact message, new review
- `GET /admin/notifications` — unread count + list
- `PATCH /admin/notifications/:id/read`

---

## Phase 6 — Performance & Infrastructure
**Goal:** Make the API fast and scalable before traffic grows.

### 6.1 Redis Caching Layer
- Cache `GET /products` responses (keyed by query string hash) with 2-minute TTL
- Cache `GET /categories` with 10-minute TTL
- Cache individual product pages with 5-minute TTL
- Invalidate product cache on any admin write to that product
- Cache analytics dashboard with 5-minute TTL
- Use cache-aside pattern with a generic `cacheMiddleware(key, ttl)` helper

### 6.2 Image CDN (Cloudinary or S3 + CloudFront)
- Replace local disk storage in `uploadMiddleware.ts` with Cloudinary/S3 upload
- Store public URL in DB instead of local filename
- On-the-fly image resizing via Cloudinary transforms or CloudFront Lambda@Edge
- Migrate existing local images via a one-off script

### 6.3 Event Tracking
- `AnalyticsEvent` model: `userId?`, `sessionId`, `event` (PAGE_VIEW, PRODUCT_VIEW, ADD_TO_CART, CHECKOUT_START, ORDER_COMPLETE), `productId?`, `metadata Json`, `createdAt`
- `POST /api/v1/events` — lightweight, unauthenticated endpoint, logs events
- Powers conversion funnel analytics in Phase 5.1
- Can also feed into A/B testing later

### 6.4 Background Job Expansion
Extend the BullMQ setup to add queues for:
- `abandoned-cart` (Phase 4.3)
- `price-drop-alert` (Phase 4.4)
- `review-request` (Phase 4.5)
- `promotion-activate` / `promotion-deactivate` (Phase 5.4)
- `back-in-stock` (already partially done — harden it)
- `stock-alert-admin` (notify admin when stock ≤ 5)
- Add a Bull Board UI route (`/admin/queues`) behind admin auth for visibility

### 6.5 Cursor-Based Pagination
Current `OFFSET/LIMIT` pagination degrades on large tables.
- Add cursor-based option to `queryBuilder.ts`: `?cursor=<lastId>&limit=24`
- Apply to `GET /products`, `GET /orders`, `GET /admin/orders`
- Keep offset pagination as fallback for admin exports

---

## Phase 7 — Advanced Features
**Goal:** Feature-parity with established ecommerce platforms.

### 7.1 Social Login (Google & GitHub OAuth)
- Passport.js with `passport-google-oauth20` and `passport-github2`
- On first OAuth login: create user if not exists, mark `isVerified = true` (OAuth implies email is valid)
- On subsequent logins: find by email, return JWT same as regular login
- `GET /api/v1/users/auth/google` and `/callback` routes
- Store `oauthProvider` and `oauthId` on User model

### 7.2 Guest Checkout
- Allow cart and checkout without an account
- `guestSessionId` cookie (UUID) ties a guest cart to a session
- On account creation, merge guest cart into user cart
- Guest orders stored with `guestEmail` field; order confirmation sent to that email

### 7.3 Multi-Currency
- `Currency` config: code, symbol, exchange rate (fetched daily from an FX API)
- `GET /api/v1/products` returns prices in requested currency via `?currency=EUR` header
- Stripe charges in the correct currency
- Store original price + currency on `OrderItem` to avoid conversion drift

### 7.4 Tax Calculation (TaxJar or Avalara)
- On checkout, call TaxJar API with destination address + line items to get tax amount
- Store `taxAmount Float` on `Order`
- Display tax line in cart summary and order emails
- Required for US sales tax compliance

### 7.5 Subscription / Recurring Products
```
model Subscription {
  id            String
  userId        String
  productId     String
  variantId     String?
  interval      SubscriptionInterval  // WEEKLY, MONTHLY, QUARTERLY
  nextBillingAt DateTime
  stripePriceId String
  status        SubscriptionStatus    // ACTIVE, PAUSED, CANCELLED
}
```
- Stripe Billing integration (Price objects, subscriptions)
- Admin: mark products as "subscribable" with interval options and subscription discount
- Customer: manage/cancel subscriptions from account page

### 7.6 Real-Time Notifications (WebSocket / SSE)
- Server-Sent Events endpoint: `GET /api/v1/sse` (authenticated)
- Push events to connected clients: `order_status_changed`, `stock_alert`, `admin_notification`
- Frontend connects on account pages, shows toast on event receipt
- Simpler and more scalable than WebSockets for one-direction server→client flow

---

## Phase 8 — Compliance & Security
**Goal:** Make the platform trustworthy, auditable, and legally compliant.

### 8.1 GDPR Compliance
- `GET /api/v1/users/me/export` — return all user data as JSON (orders, reviews, addresses, wishlist)
- `DELETE /api/v1/users/me` — already exists (`deleteMe`); ensure it hard-deletes or anonymises all PII
- Add `consentGiven Boolean` + `consentAt DateTime?` to User model
- Show consent banner on signup; only process marketing emails if `consentGiven = true`

### 8.2 Fraud Detection
- Flag orders where billing country ≠ card country
- Flag multiple failed payment attempts from same IP within 1h
- `riskScore` field on Order (0–100) computed at checkout from velocity checks
- Auto-cancel orders above a risk threshold; notify admin for manual review
- Integrate `stripe-fraud-radar` rules for card testing attacks

### 8.3 Admin 2FA Enforcement
- Admin routes check `user.twoFaEnabled` and reject if not set up
- Grace period of 7 days on first admin role assignment
- Admin panel shows banner prompting 2FA setup if not enabled

### 8.4 Enhanced Audit Trail
- Current `AuditLog` only captures admin actions; extend to:
  - Customer: login, password change, address change, order cancelled
  - System: stock decremented, email sent, coupon used, price changed
- Add `severity` field (INFO, WARN, CRITICAL) for filtering
- `GET /admin/audit-logs` with date range + entity type filter

### 8.5 API Key / Webhook Security
- `ApiKey` model for headless/third-party integrations: `prefix`, `hashedKey`, `scopes`, `lastUsedAt`
- `POST /admin/api-keys` to issue keys
- Key-auth middleware as alternative to JWT for server-to-server calls
- Signed webhook delivery to third parties (HMAC-SHA256)

---

## Recommended Execution Order

| Priority | Phase | Effort | Business Value |
|---|---|---|---|
| 1 | Phase 1 — Core Commerce Hardening | Medium | Critical — revenue depends on it |
| 2 | Phase 2 — Search & Discovery | Medium | High — directly affects conversion |
| 3 | Phase 5 — Admin & Operations | Medium | High — needed to run the business |
| 4 | Phase 4 — User Engagement | Medium | High — retention and LTV |
| 5 | Phase 6 — Performance & Infrastructure | Medium | High — needed before scaling |
| 6 | Phase 3 — Shipping Integration | High | Medium — can use manual tracking short-term |
| 7 | Phase 7 — Advanced Features | High | Medium — nice-to-have differentiators |
| 8 | Phase 8 — Compliance & Security | Low-Medium | Required before public launch |

---

## Quick Wins (can be done in any phase, low effort)

- `GET /api/v1/orders/track` — public tracking endpoint (Phase 1.4, ~1h)
- Address default flag (Phase 1.5, ~1h)
- `product.availability` auto-toggle on stock changes (Phase 1.2, ~30min)
- Cache `/categories` in Redis (Phase 6.1, ~30min)
- `GET /admin/notifications` unread count (Phase 5.6, ~2h)
- Bull Board behind admin auth (Phase 6.4, ~30min)
