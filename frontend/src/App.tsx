import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Toaster } from "sonner";
import { Layout } from "./components/Layout";
import { AdminRoute } from "./components/AdminRoute";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { AuthProvider } from "./context/AuthContext";
import { WishlistProvider } from "./context/WishlistContext";
import { AccountPage } from "./pages/AccountPage";
import { AccountAddressesPage } from "./pages/AccountAddressesPage";
import { AccountProfilePage } from "./pages/AccountProfilePage";
import { AdminPage } from "./pages/AdminPage";
import { AboutPage } from "./pages/AboutPage";
import { CartPage } from "./pages/CartPage";
import { HomePage } from "./pages/HomePage";
import { LoginPage } from "./pages/LoginPage";
import { OrderDetailPage } from "./pages/OrderDetailPage";
import { OrdersPage } from "./pages/OrdersPage";
import { ProductDetailPage } from "./pages/ProductDetailPage";
import { ProductsPage } from "./pages/ProductsPage";
import { RegisterPage } from "./pages/RegisterPage";
import { ForbiddenPage } from "./pages/ForbiddenPage";
import { ForgotPasswordPage } from "./pages/ForgotPasswordPage";
import { NotFoundPage } from "./pages/NotFoundPage";
import { WishlistPage } from "./pages/WishlistPage";
import { AdminCategoriesPage } from "./pages/admin/AdminCategoriesPage";
import { AdminOrdersPage } from "./pages/admin/AdminOrdersPage";
import { AdminProductsPage } from "./pages/admin/AdminProductsPage";
import { AdminUsersPage } from "./pages/admin/AdminUsersPage";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 60_000,       // serve from memory for 1 min — no spinner on revisit
      gcTime: 5 * 60_000,      // keep unused cache for 5 min
    },
  },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <WishlistProvider>
        <BrowserRouter>
          <Toaster
            position="bottom-right"
            toastOptions={{
              style: {
                background: "#18181b",
                border: "1px solid #27272a",
                color: "#f4f4f5",
              },
            }}
          />
          <Routes>
            <Route path="/" element={<Layout />}>
              <Route index element={<HomePage />} />
              <Route path="products" element={<ProductsPage />} />
              <Route path="about" element={<AboutPage />} />
              <Route path="wishlist" element={<WishlistPage />} />
              <Route path="products/:id" element={<ProductDetailPage />} />
              <Route path="login" element={<LoginPage />} />
              <Route path="register" element={<RegisterPage />} />
              <Route path="forgot-password" element={<ForgotPasswordPage />} />
              <Route
                path="cart"
                element={
                  <ProtectedRoute>
                    <CartPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="orders"
                element={
                  <ProtectedRoute>
                    <OrdersPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="orders/:id"
                element={
                  <ProtectedRoute>
                    <OrderDetailPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="account/*"
                element={
                  <ProtectedRoute>
                    <AccountPage />
                  </ProtectedRoute>
                }
              >
                <Route path="profile" element={<AccountProfilePage />} />
                <Route path="addresses" element={<AccountAddressesPage />} />
              </Route>

              <Route
                path="admin/*"
                element={
                  <AdminRoute>
                    <AdminPage />
                  </AdminRoute>
                }
              >
                <Route path="products" element={<AdminProductsPage />} />
                <Route path="users" element={<AdminUsersPage />} />
                <Route path="categories" element={<AdminCategoriesPage />} />
                <Route path="orders" element={<AdminOrdersPage />} />
              </Route>
              <Route path="403" element={<ForbiddenPage />} />
              <Route path="acount" element={<Navigate to="/account" replace />} />
              <Route path="accout" element={<Navigate to="/account" replace />} />
              <Route path="*" element={<NotFoundPage />} />
            </Route>
          </Routes>
        </BrowserRouter>
        </WishlistProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
