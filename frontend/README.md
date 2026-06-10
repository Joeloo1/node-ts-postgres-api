# Northline Storefront 🛍️

A premium, high-performance e-commerce frontend built with React 19, Vite, and Tailwind CSS. This storefront provides a sleek, modern shopping experience with smooth animations and robust state management.

## 🚀 Technology Stack

- **Framework**: [React 19](https://react.dev/)
- **Build Tool**: [Vite](https://vitejs.dev/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **State Management**: [TanStack Query v5](https://tanstack.com/query/latest)
- **Animations**: [Framer Motion](https://www.framer.com/motion/)
- **Icons**: [Lucide React](https://lucide.dev/)
- **Routing**: [React Router 7](https://reactrouter.com/)

## ✨ Key Features

- **Modern UI/UX**: Dark-themed, glassmorphic design with premium aesthetics.
- **Product Discovery**: Fast catalog browsing with filtering and sorting.
- **Dynamic Cart**: Real-time cart management with persistence.
- **Responsive Design**: Optimized for all screen sizes (Mobile, Tablet, Desktop).
- **Fast Loading**: Optimized asset delivery and efficient API fetching.

## 🛠️ Getting Started

### Prerequisites
- Node.js (v18 or higher)
- A running backend API (see the root README for instructions)

### Installation
1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install --legacy-peer-deps
   ```

### Configuration
Create a `.env` file in the `frontend` directory:
```env
VITE_API_URL="http://localhost:3000"
```

### Development
Start the development server:
```bash
npm run dev
```

### Build
Generate a production bundle:
```bash
npm run build
```

## 📂 Project Structure

- `src/components`: Reusable UI components.
- `src/pages`: Main application pages (Home, Products, Auth, etc.).
- `src/lib`: Core logic, API utilities, and type definitions.
- `src/context`: React context providers (Cart, Auth).
- `src/hooks`: Custom React hooks for business logic.

## 🚢 Deployment (Vercel)

This frontend is optimized for deployment on Vercel. 
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Required Environment Variables**: `VITE_API_URL` pointing to your live backend.

---
Part of the **Northline E-commerce** stack.
