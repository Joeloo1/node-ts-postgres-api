# Northline — eCommerce REST API

A production-grade eCommerce backend built with Node.js, TypeScript, and Express. Covers the full stack of concerns: authentication, payments, background jobs, caching, rate limiting, audit logging, image uploads, and admin analytics.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js 18+ |
| Framework | Express 5 |
| Language | TypeScript 5 |
| Database | PostgreSQL |
| ORM | Prisma 6 |
| Cache / Queue store | Redis |
| Background jobs | BullMQ |
| Payments | Stripe |
| Email | Nodemailer + Handlebars templates |
| Image processing | Sharp + Multer (S3 or local disk) |
| Validation | Zod |
| Logging | Winston + Morgan |
| Security | Helmet, express-rate-limit, bcryptjs |
| Auth | JWT — access + refresh tokens, httpOnly cookies |

---

## Features

### Authentication & Users
- Signup / Login / Logout with JWT (httpOnly cookie + Bearer token)
- Access token (15 min) + refresh token (7 days) rotation
- Token blacklisting on logout via Redis
- Account lockout after repeated failed login attempts
- Email verification flow with 24-hour signed token
- Forgot / Reset password with time-limited signed token
- Update profile, change password, upload + resize profile photo
- Soft-delete account (sets `active: false`, preserves order history)
- Role-based access control: `USER` and `ADMIN`

### Product Catalog
- Full CRUD with admin protection
- S3 or local-disk image upload with Sharp resizing (up to 10 images per upload)
- `mode=append|replace` on image uploads
- Filter by category, price range, brand, availability
- Sort by price, rating, newest, name A–Z
- Offset + cursor-based pagination (product feed)
- Price history — recorded on every price change
- Product variants — name, price modifier, stock, availability
- Product Q&A — questions from users, answers from any user
- Redis caching on all list and single-product endpoints

### Shopping Cart
- Add / update / remove items with stock validation
- Availability check on add
- Unique constraint prevents duplicate cart items
- Clear entire cart

### Orders
- Checkout from cart: atomic transaction — validates stock, decrements inventory, creates order, clears cart
- Direct item order (bypasses cart)
- Full status lifecycle: `PENDING` → `PAID` → `PROCESSING` → `SHIPPED` → `DELIVERED` / `CANCELLED` / `REFUNDED`
- Transactional email notification on every status change
- User cancel (PENDING only) with stock restoration
- Admin cancel (PENDING / PAID / PROCESSING) with stock restoration
- Paginated order history for users and admins

### Payments
- Stripe hosted checkout session
- Webhook signature verification (raw body registered before `express.json()`)
- Idempotency check — duplicate webhook deliveries return the existing order
- Session verification endpoint for post-payment confirmation page
- Coupon discount applied to Stripe line items

### Reviews
- Create / update / delete with one-review-per-user-per-product constraint
- Verified purchase check — must have a DELIVERED order for the product
- Helpful / not-helpful vote system (upsert, one vote per user per review)
- Rating auto-synced to `Products.rating` on every create/update/delete

### Wishlists
- Add / remove products
- Get full wishlist with product details

### Coupons
- PERCENTAGE or FIXED discount types
- Min order total enforcement
- Max usage limit
- Expiry date
- Usage count tracked atomically inside the order transaction

### Return Requests
- User submits return reason against a delivered order
- Admin reviews, approves or rejects with a note
- One return per order

### Back-in-Stock Subscriptions
- Guest or authenticated user subscribes by email + product
- On stock increase (stock was 0, now > 0) all subscribers are notified via BullMQ
- Notified flag prevents duplicate emails

### Newsletter & Contact
- Subscribe / unsubscribe to newsletter
- Contact form with rate limiting (5 messages / hour per IP)

### Admin Dashboard
- User management: list (paginated), get, update role, soft-delete
- Product management: create, update, delete, image upload, image removal
- Category management: full CRUD
- Order management: list all (filterable by status), update status, cancel
- Coupon management: create, update, delete
- Return request management: list, approve, reject
- Analytics: total revenue, total orders, orders last 30 days, total users, total products, top 5 products by units sold, revenue-by-day chart data
- Audit log: every admin write action records before/after JSON, admin ID, IP, entity type

---

## Security

- **Helmet** — sets security-related HTTP response headers
- **CORS** — locked to `CORS_ORIGIN` in production; open in development
- **Rate limiting** with Redis store:
  - General API: 300 req / 15 min per IP
  - Auth (login, signup): 10 req / 15 min
  - Password reset: 5 req / 1 hr
  - Newsletter subscribe: 5 req / 1 hr
  - Contact form: 5 req / 1 hr
- **Account lockout** — 5 failed logins triggers a 15-minute lockout stored in Redis
- **JWT** — short-lived access tokens + long-lived refresh tokens, `httpOnly` + `secure` + `sameSite=none` in production
- **Bcrypt** — passwords hashed, never logged or returned in responses
- **Token blacklist** — logged-out access tokens stored in Redis until natural expiry
- **Input validation** — every route validates request body and params via Zod before the controller runs
- **`trust proxy 1`** — correct IP detection behind Render / Railway / any reverse proxy

---

## Project Structure

```
src/
├── controller/
│   ├── authController.ts
│   ├── userController.ts
│   ├── adminController.ts
│   ├── adminAnalyticsController.ts
│   ├── productController.ts
│   ├── variantsController.ts
│   ├── cartController.ts
│   ├── orderController.ts
│   ├── paymentController.ts
│   ├── reviewsController.ts
│   ├── questionsController.ts
│   ├── addressController.ts
│   ├── categoryController.ts
│   ├── wishlistController.ts
│   ├── couponController.ts
│   ├── newsletterController.ts
│   ├── contactController.ts
│   ├── returnController.ts
│   ├── stockNotifyController.ts
│   └── priceHistoryController.ts
├── Routes/
│   ├── User/                  # Public + authenticated user routes
│   └── Admin/                 # Admin-only routes
├── Schema/                    # Zod validation schemas
├── middleware/                # Upload (multer + sharp), validation, request ID
├── config/                    # Database, Redis, logger, S3
├── utils/                     # catchAsync, AppError, JWT, password, audit, sanitize
├── jobs/                      # BullMQ email queue + worker
├── emails/templates/          # Handlebars email templates
├── Error/                     # Global error handler
├── types/                     # TypeScript type declarations
├── app.ts                     # Express app, middleware chain, route mounting
└── server.ts                  # Entry point, graceful shutdown
prisma/
├── schema.prisma
├── migrations/
└── seed.ts
public/
├── products/                  # Local image storage (fallback when S3 not configured)
└── users/
```

---

## API Reference

All routes are prefixed with `/api/v1`.

### Auth — `/api/v1/users`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/Signup` | — | Register a new user |
| POST | `/Login` | — | Login, sets JWT cookies |
| POST | `/Logout` | ✓ | Clears cookies, blacklists token |
| GET | `/refresh` | — | Issue new access token from refresh cookie |
| GET | `/verifyEmail/:token` | — | Verify email address |
| POST | `/resendVerificationEmail` | ✓ | Resend verification email (2 min cooldown) |
| POST | `/forgetPassword` | — | Send password reset email |
| PATCH | `/resetPassword/:token` | — | Reset password with signed token |
| PATCH | `/updateMyPassword` | ✓ | Change current password |
| PATCH | `/updateMe` | ✓ | Update profile / upload photo |
| GET | `/me` | ✓ | Get current user |
| DELETE | `/deleteMe` | ✓ | Soft-delete own account |

### Products — `/api/v1/products`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/` | — | List products (filter, sort, paginate) |
| GET | `/feed` | — | Cursor-based product feed |
| GET | `/:id` | — | Get single product |

### Product Variants — `/api/v1/products/:id/variants`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/` | — | List variants for a product |

### Product Q&A — `/api/v1/questions`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/` | — | Get questions for a product (`?product_id=`) |
| POST | `/` | ✓ | Ask a question |
| POST | `/:id/answers` | ✓ | Answer a question |
| DELETE | `/:id` | ✓ | Delete own question |
| DELETE | `/answers/:id` | ✓ | Delete own answer |

### Price History — `/api/v1/products/:id/price-history`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/` | — | Get price history for a product |

### Cart — `/api/v1/cart`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/` | ✓ | Get current cart |
| DELETE | `/` | ✓ | Clear cart |
| POST | `/items` | ✓ | Add item |
| PATCH | `/items/:itemId` | ✓ | Update item quantity |
| DELETE | `/items/:itemId` | ✓ | Remove item |

### Orders — `/api/v1/order`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/` | ✓ | Get my orders (paginated) |
| POST | `/` | ✓ | Create order from items |
| POST | `/checkout` | ✓ | Checkout from cart |
| GET | `/:id` | ✓ | Get single order |
| PATCH | `/:id/cancel` | ✓ | Cancel order (PENDING only) |

### Payments — `/api/v1/payments`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/create-checkout-session` | ✓ | Create Stripe checkout session |
| GET | `/verify-session/:sessionId` | ✓ | Verify + fulfill completed payment |
| POST | `/api/v1/webhooks/stripe` | Stripe sig | Stripe webhook (registered before express.json) |

### Reviews — `/api/v1/reviews`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/` | — | Get reviews (`?product_id=`, paginated) |
| POST | `/` | ✓ | Create review (verified purchase required) |
| PATCH | `/:id` | ✓ | Update own review |
| DELETE | `/:id` | ✓ | Delete own review |
| POST | `/:id/vote` | ✓ | Vote helpful / not helpful |
| DELETE | `/:id/vote` | ✓ | Remove vote |

### Addresses — `/api/v1/addresses`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/` | ✓ | List saved addresses |
| POST | `/` | ✓ | Add address |
| PATCH | `/:id` | ✓ | Update address |
| DELETE | `/:id` | ✓ | Delete address |

### Wishlist — `/api/v1/wishlist`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/` | ✓ | Get wishlist |
| POST | `/` | ✓ | Add product to wishlist |
| DELETE | `/:productId` | ✓ | Remove product from wishlist |

### Coupons — `/api/v1/coupons`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/validate` | ✓ | Validate a coupon code and preview discount |

### Return Requests — `/api/v1/orders/:id/return`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/` | ✓ | Submit return request for a delivered order |

### Back-in-Stock — `/api/v1/stock-notify`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/subscribe` | — | Subscribe to back-in-stock notification |
| DELETE | `/unsubscribe` | — | Unsubscribe |

### Newsletter — `/api/v1/newsletter`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/subscribe` | — | Subscribe (rate limited) |
| DELETE | `/unsubscribe` | — | Unsubscribe |

### Contact — `/api/v1/contact`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/` | — | Send contact message (rate limited) |

### Categories — `/api/v1/categories`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/` | — | List all categories |

### Admin — `/api/v1/admin` (ADMIN role required on all)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/users` | List all users (paginated) |
| GET | `/users/:id` | Get single user |
| PATCH | `/users/:id` | Update user name / email / role |
| DELETE | `/users/:id` | Soft-delete user |
| GET | `/audit-log` | Paginated audit log (filter by adminId, entityType, action) |
| GET | `/orders` | List all orders (paginated, filter by status) |
| PATCH | `/orders/:id/status` | Update order status |
| PATCH | `/orders/:id/cancel` | Cancel order |
| POST | `/products` | Create product |
| PATCH | `/products/:id` | Update product |
| DELETE | `/products/:id` | Delete product |
| POST | `/products/:id/images` | Upload product images (`?mode=append\|replace`) |
| GET | `/categories` | List categories |
| POST | `/categories` | Create category |
| PATCH | `/categories/:id` | Update category |
| DELETE | `/categories/:id` | Delete category |
| GET | `/coupons` | List all coupons |
| POST | `/coupons` | Create coupon |
| PATCH | `/coupons/:id` | Update coupon |
| DELETE | `/coupons/:id` | Delete coupon |
| GET | `/returns` | List return requests |
| PATCH | `/returns/:id` | Approve or reject return request |
| GET | `/variants/:id` | Get variant |
| POST | `/products/:id/variants` | Create variant |
| PATCH | `/variants/:id` | Update variant |
| DELETE | `/variants/:id` | Delete variant |
| GET | `/analytics/dashboard` | Revenue, orders, top products, revenue-by-day |

### Health

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/health` | Returns DB + Redis status, uptime |

---

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL database
- Redis instance
- Stripe account
- SMTP credentials (Mailtrap for dev)

### Installation

```bash
git clone <repository-url>
cd node-prisma-ecommerce-api/backend
npm install
```

### Environment Variables

Create a `.env` file in the `backend/` directory:

```env
PORT=3000
NODE_ENV=development

DATABASE_URL=postgresql://user:password@host/dbname

JWT_SECRET=your-secret-min-32-chars
JWT_EXPIRES_IN=15m
JWT_REFRESH_SECRET=your-refresh-secret

REDIS_URL=redis://127.0.0.1:6379

EMAIL_HOST=sandbox.smtp.mailtrap.io
EMAIL_PORT=2525
EMAIL_USERNAME=your_mailtrap_user
EMAIL_PASSWORD=your_mailtrap_pass
EMAIL_FROM=noreply@northline.store

STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
CLIENT_URL=http://localhost:5173

CORS_ORIGIN=http://localhost:5173

# Optional — omit entirely to use local disk storage
AWS_S3_BUCKET=your-bucket-name
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_REGION=us-east-1
```

### Database Setup

```bash
npx prisma migrate dev
npx prisma db seed        # seeds sample products and categories
```

### Running

```bash
npm run dev       # development with hot reload
npm run build     # compile TypeScript
npm start         # production
```

---

## Image Storage

Images are processed by Sharp (resized, converted to JPEG) then stored in one of two places:

- **AWS S3** — when `AWS_S3_BUCKET`, `AWS_ACCESS_KEY_ID`, and `AWS_SECRET_ACCESS_KEY` are all present
- **Local disk** — falls back to `backend/public/products/` and `backend/public/users/` otherwise

Served at runtime via `express.static` at `/public/`. The frontend resolves local images as `${VITE_API_URL}/public/products/<filename>`.

---

## Background Jobs

Emails are processed asynchronously via BullMQ backed by Redis. The queue (`emails`) handles:

- Email verification links
- Password reset links
- Order status change notifications
- Back-in-stock alerts

Jobs have 3 retry attempts with exponential backoff (5 s, 10 s, 20 s). A failed email never fails the HTTP response.

---

## Error Handling

All errors flow through a single global handler that normalises:

- **Prisma** — P2002 (unique), P2003 (foreign key), P2025 (not found), P2014 (validation)
- **PostgreSQL** — 23505 (unique), 23503 (foreign key), 23502 (not null)
- **JWT** — TokenExpiredError, JsonWebTokenError, NotBeforeError → 401
- **Zod** — validation errors → 400 with the first failing message
- **Request timeout** — 30-second timeout → 503
- **Operational errors** — `AppError` instances returned as-is
- **Unknown errors** — logged, returned as generic 500 in production

Stack traces are included in development responses and suppressed in production.

---

## Database Models

| Model | Description |
|-------|-------------|
| `User` | Accounts with role, soft-delete, verification, lockout fields |
| `Products` | Catalog items with stock, images array, discount, rating |
| `ProductVariant` | Size / color / option variants per product, own stock |
| `Category` | Product categories |
| `Cart` / `CartItem` | Per-user cart, unique constraint on (cartId, product_id) |
| `Order` / `OrderItem` | Full order lifecycle, price snapshot per item |
| `Review` / `ReviewVote` | One review per user per product, helpful vote system |
| `ProductQuestion` / `ProductAnswer` | Community Q&A per product |
| `PriceHistory` | Append-only price change log per product |
| `Address` | Saved shipping addresses per user |
| `Wishlist` | Many-to-many user ↔ product |
| `Coupon` | Discount codes with type, value, expiry, usage cap |
| `ReturnRequest` | One return per order, admin review workflow |
| `BackInStockSubscription` | Email subscriptions, notified flag |
| `NewsletterSubscription` | Email-based newsletter opt-in |
| `ContactMessage` | Inbound contact form submissions |
| `AuditLog` | Admin action trail with before/after JSON |

---

## License

ISC
