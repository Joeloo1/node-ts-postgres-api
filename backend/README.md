# Northline — eCommerce REST API

A production-grade eCommerce backend built with Node.js, TypeScript, and Express. Covers the full stack of concerns: authentication, payments, background jobs, caching, rate limiting, audit logging, and admin analytics.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js 18+ |
| Framework | Express 5 |
| Language | TypeScript 5 |
| Database | PostgreSQL via [Neon](https://neon.tech) |
| ORM | Prisma 6 |
| Cache / Queue store | Redis 5 |
| Background jobs | BullMQ |
| Payments | Stripe |
| Email | Nodemailer + Handlebars templates |
| Image processing | Sharp + Multer |
| Validation | Zod 4 |
| Logging | Winston + Morgan |
| Security | Helmet, express-rate-limit, bcryptjs, xss |
| Auth | JWT (access + refresh tokens, httpOnly cookies) |

---

## Features

### Authentication & Users
- Signup / Login / Logout with JWT (httpOnly cookie + Bearer token)
- Access token + refresh token rotation
- Email verification flow
- Forgot / Reset password with signed token
- Update profile, change password, upload + resize profile photo
- Soft-delete account (preserves order history)
- Role-based access control: `USER` and `ADMIN`

### Product Catalog
- Full CRUD (admin)
- Multiple image upload with Sharp resizing
- Filter by category, price range, brand, availability
- Sort by price, rating, newest, name A–Z
- Cursor-based infinite pagination
- Product feed (deals, related, suggestions)

### Shopping Cart
- Add / update / remove items
- Stock validation on every mutation
- Clear entire cart

### Orders
- Checkout from cart (atomic transaction — decrements stock, creates order, clears cart)
- Full status lifecycle: `PENDING` → `PAID` → `PROCESSING` → `SHIPPED` → `DELIVERED` / `CANCELLED` / `REFUNDED`
- Transactional email notification on every status change
- User cancel (PENDING only) with stock restoration
- Admin cancel (PENDING / PAID / PROCESSING) with stock restoration

### Payments
- Stripe hosted checkout session
- Webhook signature verification (raw body, registered before `express.json()`)
- Session verification endpoint for post-payment confirmation

### Reviews
- Create / update / delete with one-review-per-user-per-product constraint
- XSS-sanitised content

### Addresses
- Full CRUD for saved shipping addresses per user

### Admin
- User management (list, get, update role, soft-delete)
- Product management (create, update, delete, image upload)
- Category management
- Order management (list all, update status, cancel)
- Audit log — every admin action records before/after state, admin ID, IP
- Analytics dashboard — revenue, order counts, top products by units sold, revenue-by-day chart data

---

## Security

- **Helmet** — sets 11 security-related HTTP headers
- **CORS** — locked to `CORS_ORIGIN` env var in production; open in development
- **Rate limiting** with Redis store:
  - General API: 300 req / 15 min
  - Auth routes (login, signup): 10 req / 15 min
  - Password reset: 5 req / 1 hr
- **JWT** — short-lived access tokens + long-lived refresh tokens, `httpOnly` + `secure` + `sameSite=none` in production
- **Bcrypt** — passwords hashed before storage, never logged or returned
- **XSS sanitisation** — user-generated text fields stripped of HTML before persistence
- **Input validation** — every route validates request body and params with Zod before the controller runs
- **trust proxy 1** — correct IP detection behind a load balancer / Render / Railway

---

## Project Structure

```
src/
├── controller/          # Route handlers and business logic
│   ├── authController.ts
│   ├── userController.ts
│   ├── productController.ts
│   ├── cartController.ts
│   ├── orderController.ts
│   ├── paymentController.ts
│   ├── reviewsController.ts
│   ├── addressController.ts
│   ├── categoryController.ts
│   ├── adminController.ts
│   └── adminAnalyticsController.ts
├── Routes/
│   ├── User/            # Public + authenticated user routes
│   └── Admin/           # Admin-only routes (Protect + restrictTo(ADMIN))
├── Schema/              # Zod validation schemas
├── middleware/          # Validation, upload, request ID
├── config/              # Database, Redis, logger
├── utils/               # catchAsync, AppError, JWT, password, audit, sanitize
├── jobs/                # BullMQ email queue
├── emails/templates/    # Handlebars email templates
├── Error/               # Global error handler
├── types/               # TypeScript type declarations
├── app.ts               # Express app setup
└── server.ts            # Entry point, graceful shutdown
prisma/
├── schema.prisma        # Data models and relations
├── migrations/          # Migration history
└── seed.ts              # 72 products across 10 categories
```

---

## API Reference

All routes are prefixed with `/api/v1`.

### Auth — `/api/v1/users`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/Signup` | — | Register a new user |
| POST | `/Login` | — | Login, returns JWT cookie |
| POST | `/Logout` | — | Clears JWT cookie |
| GET | `/refresh` | — | Issue new access token from refresh token |
| GET | `/verifyEmail/:token` | — | Verify email address |
| POST | `/forgetPassword` | — | Send password reset email |
| PATCH | `/resetPassword/:token` | — | Reset password with signed token |
| POST | `/resendVerificationEmail` | ✓ | Resend verification email |
| PATCH | `/updateMyPassword` | ✓ | Change current password |
| PATCH | `/updateMe` | ✓ | Update profile / upload photo |
| GET | `/me` | ✓ | Get current user |
| DELETE | `/deleteMe` | ✓ | Soft-delete own account |

### Products — `/api/v1/products`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/` | — | List products (filter, sort, paginate) |
| GET | `/feed` | — | Product feed (deals, suggestions) |
| GET | `/:id` | — | Get single product |

### Cart — `/api/v1/cart`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/` | ✓ | Get current cart |
| DELETE | `/` | ✓ | Clear cart |
| POST | `/items` | ✓ | Add item to cart |
| PATCH | `/items/:itemId` | ✓ | Update item quantity |
| DELETE | `/items/:itemId` | ✓ | Remove item |

### Orders — `/api/v1/order`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/` | ✓ | Get my orders |
| POST | `/` | ✓ | Create order from items |
| POST | `/checkout` | ✓ | Checkout from cart |
| GET | `/:id` | ✓ | Get single order |
| PATCH | `/:id` | ✓ | Cancel order (PENDING only) |

### Payments — `/api/v1/payments`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/create-checkout-session` | ✓ | Create Stripe checkout session |
| GET | `/verify-session/:sessionId` | ✓ | Verify completed payment |
| POST | `/api/v1/webhooks/stripe` | Stripe sig | Stripe webhook handler |

### Reviews — `/api/v1/reviews`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/` | ✓ | Get reviews (by product) |
| POST | `/` | ✓ | Create review |
| PATCH | `/:id` | ✓ | Update own review |
| DELETE | `/:id` | ✓ | Delete own review |

### Addresses — `/api/v1/addresses`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/` | ✓ | List saved addresses |
| POST | `/` | ✓ | Add address |
| PATCH | `/:id` | ✓ | Update address |
| DELETE | `/:id` | ✓ | Delete address |

### Categories — `/api/v1/categories`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/` | — | List all categories |

### Admin — `/api/v1/admin` (ADMIN role required)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/users` | List all users |
| GET | `/users/:id` | Get single user |
| PATCH | `/users/:id` | Update user name / email / role |
| DELETE | `/users/:id` | Soft-delete user |
| GET | `/users/audit-log` | Paginated audit log |
| GET | `/orders` | List all orders (paginated, filterable) |
| PATCH | `/orders/:id/status` | Update order status |
| PATCH | `/orders/:id/cancel` | Cancel order |
| GET | `/products` | — (inherits from product routes) |
| POST | `/products` | Create product |
| PATCH | `/products/:id` | Update product |
| DELETE | `/products/:id` | Delete product |
| POST | `/products/:id/images` | Upload product images |
| GET | `/categories` | List categories |
| POST | `/categories` | Create category |
| PATCH | `/categories/:id` | Update category |
| DELETE | `/categories/:id` | Delete category |
| GET | `/analytics/dashboard` | Revenue, orders, users, top products, revenue-by-day |

### Health

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/health` | Returns DB + Redis status, uptime |

---

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL database (Neon recommended)
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

Create a `.env` file:

```env
PORT=3000
NODE_ENV=development

# Database
DATABASE_URL=postgresql://user:password@host/dbname

# JWT
JWT_SECRET=your-secret-key-min-32-chars
JWT_EXPIRES_IN=15m
JWT_REFRESH_SECRET=your-refresh-secret
JWT_REFRESH_EXPIRES_IN=7d
JWT_COOKIE_EXPIRES_DAYS=7

# Redis
REDIS_URL=redis://127.0.0.1:6379

# Email (Mailtrap for dev)
EMAIL_HOST=sandbox.smtp.mailtrap.io
EMAIL_PORT=2525
EMAIL_USERNAME=your_mailtrap_username
EMAIL_PASSWORD=your_mailtrap_password
EMAIL_FROM=noreply@northline.store

# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_SUCCESS_URL=http://localhost:5173/orders/confirmation/{CHECKOUT_SESSION_ID}
STRIPE_CANCEL_URL=http://localhost:5173/cart

# CORS (comma-separated in production)
CORS_ORIGIN=http://localhost:5173
```

### Database Setup

```bash
npx prisma migrate dev
npx prisma db seed        # seeds 72 products across 10 categories
```

### Running

```bash
# Development (hot reload)
npm run dev

# Build
npm run build

# Production
npm run start:prod
```

---

## Background Jobs

Emails are processed asynchronously via BullMQ backed by Redis. The queue (`email-queue`) handles:

- Order status change notifications
- Password reset links
- Email verification links

Jobs are fire-and-forget from the request path — a failed email does not fail the HTTP response.

---

## Error Handling

All errors flow through a single global handler that normalises:

- **Prisma** — P2002 (unique), P2003 (foreign key), P2025 (not found), P2014 (validation)
- **PostgreSQL** — 23505 (unique), 23503 (foreign key), 23502 (not null)
- **JWT** — TokenExpiredError, JsonWebTokenError, NotBeforeError → 401
- **Zod** — validation errors → 400 with the first failing message
- **Operational errors** — `AppError` instances returned as-is
- **Unknown errors** — logged, returned as generic 500 in production

Stack traces are included in development responses and suppressed in production.

---

## Database Models

| Model | Description |
|-------|-------------|
| `User` | Accounts with role, verification, soft-delete |
| `Products` | Catalog items with stock, images, discount |
| `Category` | Product categories |
| `Cart` / `CartItem` | Per-user cart |
| `Order` / `OrderItem` | Order lifecycle with cancellation tracking |
| `Review` | One per user per product |
| `Address` | Saved shipping addresses |
| `AuditLog` | Admin action trail with before/after JSON |

---

## License

ISC
