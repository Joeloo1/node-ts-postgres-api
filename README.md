# Northline — Full-Stack eCommerce Platform

A production-grade, full-stack ecommerce application built end-to-end with TypeScript. The backend is a hardened Node.js/Express REST API with PostgreSQL, Redis caching, Stripe payments, and BullMQ background jobs. The frontend is a fast, dark-themed React storefront with drag-and-drop image management, animated UI, and a full admin dashboard.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, Vite, Tailwind CSS v4, TanStack Query v5, Framer Motion, React Router 7 |
| Backend | Node.js, Express 5, TypeScript 5 |
| Database | PostgreSQL (Prisma ORM) |
| Cache | Redis |
| Payments | Stripe (hosted checkout + webhook) |
| Background jobs | BullMQ |
| Email | Nodemailer + Handlebars templates |
| Image processing | Sharp + Multer (S3 or local disk) |
| Validation | Zod |
| Auth | JWT — access + refresh tokens, httpOnly cookies |

---

## Feature Overview

### Storefront
- Product catalog with filtering, sorting, and pagination
- Product detail pages with image gallery, reviews, Q&A, price history, and variants
- Shopping cart with real-time stock validation
- Stripe hosted checkout with post-payment order confirmation
- Coupon code validation and application at checkout
- Wishlist
- Back-in-stock email subscriptions
- Order history with full lifecycle tracking
- User account: profile, addresses, password management, email verification

### Admin Dashboard
- Product management: create with multi-image drag-and-drop upload, edit, soft-delete
- Gallery management: view existing images, remove individual images, upload new batches
- Order management: update status, assign tracking number, cancel orders
- User management: view, update roles, deactivate accounts
- Category management
- Coupon management: create, update, deactivate
- Return request management
- Analytics dashboard: revenue, orders, top products, revenue-by-day chart
- Audit log: every admin action records before/after state, admin ID, IP

### Backend Features
- Access token + refresh token rotation with token blacklisting on logout
- Account lockout after repeated failed login attempts
- Email verification, forgot/reset password flows
- Role-based access control (USER / ADMIN)
- Redis caching on products, reviews, users, and auth lookups
- Idempotent Stripe webhook — handles duplicate deliveries safely
- BullMQ email queue with retries (fire-and-forget from request path)
- Audit logging on every admin mutation
- Graceful shutdown (SIGTERM/SIGINT) — drains HTTP, closes DB and Redis

---

## Project Structure

```
node-prisma-ecommerce-api/
├── backend/                   # Node.js + Express API
│   ├── src/
│   │   ├── controller/        # Route handlers and business logic
│   │   ├── Routes/            # Express routers (User/ and Admin/)
│   │   ├── Schema/            # Zod validation schemas
│   │   ├── middleware/        # Upload, validation, request ID
│   │   ├── config/            # Database, Redis, logger, S3
│   │   ├── utils/             # Shared utilities
│   │   ├── jobs/              # BullMQ email queue
│   │   ├── emails/templates/  # Handlebars email templates
│   │   ├── Error/             # Global error handler
│   │   ├── types/             # TypeScript declarations
│   │   ├── app.ts             # Express app setup
│   │   └── server.ts          # Entry point, graceful shutdown
│   ├── prisma/
│   │   ├── schema.prisma      # Data models
│   │   └── migrations/        # Migration history
│   └── public/                # Local image storage (fallback when S3 not configured)
│       ├── products/
│       └── users/
├── frontend/                  # React + Vite storefront
│   ├── src/
│   │   ├── components/        # Shared UI components
│   │   ├── pages/             # Route-level page components
│   │   │   └── admin/         # Admin-only pages
│   │   ├── lib/               # API client, types, constants
│   │   ├── hooks/             # Custom React hooks
│   │   ├── services/          # Data-fetching helpers
│   │   └── context/           # Auth and Cart context providers
│   └── public/
└── README.md
```

---

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL database
- Redis instance
- Stripe account (for payments)
- SMTP credentials (Mailtrap works for dev)

### Quick Start

```bash
# 1. Clone and install all dependencies
git clone <repository-url>
cd node-prisma-ecommerce-api
npm install                        # installs root workspace deps

# 2. Configure environment variables
cp backend/.env.example backend/.env   # fill in your values
cp frontend/.env.example frontend/.env

# 3. Set up the database
cd backend
npx prisma migrate dev
npx prisma db seed                 # seeds sample products and categories

# 4. Start both services
cd ..
npm run dev                        # runs backend + frontend concurrently
```

Or run separately:

```bash
# Backend (port 3000)
cd backend && npm run dev

# Frontend (port 5173)
cd frontend && npm run dev
```

---

## Environment Variables

### Backend (`backend/.env`)

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

# Optional — omit to use local disk storage
AWS_S3_BUCKET=your-bucket
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_REGION=us-east-1
```

### Frontend (`frontend/.env`)

```env
VITE_API_URL=http://localhost:3000
```

---

## Image Storage

Product and user images are processed by Sharp (resized + converted to JPEG) then stored:

- **S3** — when `AWS_S3_BUCKET`, `AWS_ACCESS_KEY_ID`, and `AWS_SECRET_ACCESS_KEY` are all set
- **Local disk** — falls back to `backend/public/products/` and `backend/public/users/` when any S3 variable is missing. The backend serves these via `express.static` at `/public/`.

No code change is needed to switch between modes — set or unset the AWS variables.

---

## Deployment

### Frontend — Vercel

- **Build command**: `npm run build`
- **Output directory**: `dist`
- **Environment variable**: `VITE_API_URL` → your live backend URL

### Backend — Render / Railway

- **Root directory**: `backend`
- **Build command**: `npm install --include=dev && npm run build && npx prisma db push`
- **Start command**: `npm start`
- **Environment variables**: all variables from the backend `.env` section above

---

## License

ISC
