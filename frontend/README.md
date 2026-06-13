# Northline Storefront

A premium, dark-themed ecommerce frontend built with React 19 and Vite. Features animated UI, drag-and-drop image uploads, a full admin dashboard, and tight integration with the Northline REST API.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | React 19 |
| Build tool | Vite |
| Styling | Tailwind CSS v4 |
| Data fetching | TanStack Query v5 |
| Routing | React Router 7 |
| Animations | Framer Motion |
| Notifications | Sonner (toast) |
| Icons | Custom SVG icon set (`src/components/Icons.tsx`) |

---

## Features

### Storefront Pages

| Page | Description |
|------|-------------|
| **Home** | Hero, featured products, category grid, testimonials, newsletter signup |
| **Products** | Full catalog with filter panel (category, price, brand, availability), sort, pagination |
| **Product Detail** | Image gallery, variant picker, add-to-cart, reviews list, Q&A section, price history chart |
| **Cart** | Line items, quantity controls, coupon code field, Stripe checkout |
| **Checkout** | Stripe hosted session redirect, success confirmation page with order summary |
| **Order History** | Paginated list of past orders with status badges |
| **Order Detail** | Full order breakdown, items, shipping info |
| **Wishlist** | Saved products with one-click add-to-cart |
| **Account** | Tabbed account page: profile, addresses, security |
| **Account Profile** | Two-column split layout — identity panel (avatar, completion ring, upload) + contact form |
| **Search** | Keyword search across the product catalog |
| **About** | Brand story page |

### Admin Pages (ADMIN role required)

| Page | Description |
|------|-------------|
| **Admin Dashboard** | Revenue totals, order counts, revenue-by-day chart, top 5 products by units sold |
| **Admin Products** | Tabbed "New product" / "Manage" view |
| — New product | Full create form with multi-image drag-and-drop upload; images uploaded immediately after product creation |
| — Manage | Dropdown product selector → edit all fields → gallery manager (existing images with × remove, new image drop zone, upload button) |
| **Admin Orders** | Full order list with status filter, update status, cancel |
| **Admin Users** | User list, role management, account deactivation |

### UI Details

- **Dark theme** with Tailwind CSS custom tokens (`bg-card`, `text-ink`, `border-stroke`, etc.)
- **Framer Motion** page transitions and list animations throughout
- **AnimatePresence** for enter/exit of modals, success banners, and image previews
- **Drag-and-drop image upload** — drop zone, blob URL previews, numbered badges, per-image remove, "Add more" tile, "Clear all"
- **CompletionRing** — SVG donut progress ring on the profile page showing profile completeness
- **Skeleton loaders** on product lists and detail pages
- **Confirm button** component for destructive actions (double-click to confirm)
- **Responsive navigation** with mobile drawer

---

## Project Structure

```
src/
├── components/
│   ├── Icons.tsx              # All SVG icons as typed React components
│   ├── Navbar.tsx             # Responsive navigation with mobile drawer
│   ├── Footer.tsx
│   ├── Layout.tsx             # Shell wrapping Navbar + Footer + Suspense
│   ├── ProductCard.tsx        # Product tile used in grid views
│   ├── ProductSkeleton.tsx    # Skeleton loader for ProductCard
│   ├── FilterPanel.tsx        # Sidebar filter panel for Products page
│   ├── ConfirmButton.tsx      # Two-click confirm for destructive actions
│   ├── Logo.tsx
│   └── AnnouncementBar.tsx
├── pages/
│   ├── HomePage.tsx
│   ├── ProductsPage.tsx
│   ├── ProductDetailPage.tsx
│   ├── CheckoutPage.tsx
│   ├── OrderDetailPage.tsx
│   ├── AccountPage.tsx
│   ├── AccountProfilePage.tsx
│   ├── AboutPage.tsx
│   ├── SearchPage.tsx
│   ├── AdminPage.tsx          # Admin dashboard overview
│   └── admin/
│       └── AdminProductsPage.tsx
├── lib/
│   ├── api.ts                 # apiFetch wrapper with auth + error handling
│   ├── types.ts               # Shared TypeScript types
│   ├── constants.ts
│   └── queryKeys.ts
├── services/
│   ├── products.ts            # Product query/mutation helpers
│   └── orders.ts              # Order query/mutation helpers
├── hooks/
│   └── usePageTitle.ts        # Sets document.title per page
├── context/
│   ├── AuthContext.tsx        # Current user, login/logout
│   └── CartContext.tsx        # Cart item count, invalidation helpers
├── index.css                  # Tailwind directives + custom token overrides
└── App.tsx                    # Route definitions, lazy loading, Suspense boundaries
```

---

## Getting Started

### Prerequisites

- Node.js 18+
- The Northline backend running (see `../backend/README.md`)

### Installation

```bash
cd frontend
npm install
```

### Configuration

Create a `.env` file:

```env
VITE_API_URL=http://localhost:3000
```

This URL is used by `apiFetch` for all API calls and by `getImageUrl` to resolve local product/user images.

### Development

```bash
npm run dev          # starts Vite dev server on port 5173
```

### Build

```bash
npm run build        # outputs to dist/
npm run preview      # preview the production build locally
```

---

## API Integration

All API calls go through `src/lib/api.ts`:

```ts
// Authenticated request example
const res = await apiFetch<OrdersResponse>("/api/v1/order", { auth: true });

// With body
await apiFetch("/api/v1/cart/items", {
  method: "POST",
  auth: true,
  body: JSON.stringify({ product_id, quantity }),
});

// File upload
const fd = new FormData();
files.forEach((f) => fd.append("images", f));
await apiFetch(`/api/v1/admin/products/${id}/images?mode=append`, {
  method: "POST",
  auth: true,
  body: fd,   // do not set Content-Type — browser sets multipart boundary
});
```

`ApiError` is thrown for non-2xx responses and carries the server's `message` field, which Sonner toast surfaces directly.

---

## Image Handling

Product and user images are resolved via `getImageUrl`:

```ts
function getImageUrl(image?: string | null): string | null {
  if (!image) return null;
  if (image.startsWith("http")) return image; // S3 URL
  const base = import.meta.env.VITE_API_URL?.replace(/\/$/, "") || "";
  return `${base}/public/products/${image}`;  // local disk fallback
}
```

The same pattern is used for user profile images (`/public/users/`).

---

## Deployment — Vercel

1. Import the repository into Vercel
2. Set **Root Directory** to `frontend`
3. Set **Build Command** to `npm run build`
4. Set **Output Directory** to `dist`
5. Add environment variable: `VITE_API_URL` → your live backend URL

---

## Part of the Northline Stack

See the root `README.md` for full project setup and the `backend/README.md` for the complete API reference.
