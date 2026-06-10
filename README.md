# 🛒 Full-Stack Node & React eCommerce Platform

A robust, scalable eCommerce web application featuring a modern React frontend and a powerful Node.js backend. Built with TypeScript end-to-end, it leverages Prisma ORM for PostgreSQL database management, Redis for high-performance caching, and TailwindCSS for a sleek UI.

## ✨ Features

### 💻 Frontend (Client)
- **Modern UI**: Sleek and responsive design built with React 19 and TailwindCSS v4.
- **State Management & Data Fetching**: Optimized data fetching and caching with React Query (`@tanstack/react-query`).
- **Client-Side Routing**: Smooth navigation with React Router DOM.
- **Type Safety**: Fully typed with TypeScript for reliable development.

### ⚙️ Backend (API)
- **User Management**: Registration & Login with JWT Authentication, Role-based Access Control (User & Admin).
- **Ecommerce Core**: 
  - **Product Catalog**: Advanced product management with categories and inventory tracking.
  - **Cart System**: Fully functional shopping cart.
  - **Order Life Cycle**: Complete flow from `PENDING` to `DELIVERED` or `CANCELLED`.
  - **Reviews**: User-generated reviews for products.
- **System Features**:
  - Secure image uploads and resizing using Multer and Sharp.
  - Modern request validation using Zod schemas.
  - Production-ready logging with Winston.
  - Security hardening with Helmet and Rate Limiting.
  - Redis integration for optimized database query caching.

## 🚀 Tech Stack

### Frontend
- **Framework**: [React 19](https://react.dev/) + [Vite](https://vitejs.dev/)
- **Styling**: [TailwindCSS v4](https://tailwindcss.com/)
- **Data Fetching**: [TanStack Query](https://tanstack.com/query)
- **Routing**: [React Router](https://reactrouter.com/)

### Backend
- **Runtime**: [Node.js](https://nodejs.org/)
- **Framework**: [Express.js](https://expressjs.com/)
- **Database**: [PostgreSQL](https://www.postgresql.org/)
- **ORM**: [Prisma](https://www.prisma.io/)
- **Caching**: [Redis](https://redis.io/)
- **Authentication**: JWT & Bcryptjs

## 📁 Project Structure

```text
node-prisma-ecommerce-api/
├── backend/                  # Node.js + Express backend
│   ├── src/                  # API logic (Controllers, Routes, Middlewares)
│   ├── prisma/               # Prisma schema and migrations
│   ├── docker-compose.yml    # Docker setup for Postgres and Redis
│   └── package.json          # Backend dependencies
├── frontend/                 # React + Vite frontend
│   ├── src/                  # Components, Pages, and Hooks
│   ├── vite.config.ts        # Vite build configuration
│   └── package.json          # Frontend dependencies
└── README.md                 # Project documentation
```

## 🛠️ Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (v18+)
- [Docker](https://www.docker.com/) & Docker Compose (for local Postgres & Redis)

### 1. Unified Setup (Recommended)
You can now set up the entire project (backend and frontend) from the root directory:
```bash
# 1. Install all dependencies for both services
npm install

# 2. Spin up local database and redis (in a new terminal)
cd backend && npm run docker:up && cd ..

# 3. Initialize the database (run once)
npm --prefix backend run build # This generates Prisma client
npm --prefix backend run db:seed

# 4. Start both backend and frontend concurrently
npm run dev
```

### 2. Service-Specific Management
If you prefer to manage services separately:

**Backend Setup**
```bash
cd backend
npm install
npx prisma generate
npm run dev
```

**Frontend Setup**
```bash
cd frontend
npm install
npm run dev
```

## 🚢 Deployment

### Vercel (Frontend)
The frontend is pre-configured for Vercel. Ensure you set the `VITE_API_URL` environment variable in Vercel to point to your live API.

### Render (Backend)
The backend is designed for Render. Use the following settings:
- **Root Directory**: `backend`
- **Build Command**: `npm install --include=dev && npm run build && npx prisma db push --accept-data-loss`
- **Start Command**: `npm start`
- **Environment Variables**: `DATABASE_URL`, `REDIS_URL`, `JWT_SECRET`, `NODE_ENV=production`.


## 🛡️ Key API Endpoints

- `POST /api/users/auth` - Register/Login
- `GET /api/products` - Browse catalog
- `POST /api/cart` - Cart operations
- `POST /api/orders` - Checkout and order history
- `POST /api/admin/*` - Protected admin operations (Manage users, products, orders)

## 📄 License

This project is licensed under the [ISC License](LICENSE).
