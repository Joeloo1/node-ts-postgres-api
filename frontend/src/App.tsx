import { lazy, Suspense } from "react";
import { HelmetProvider } from "react-helmet-async";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Toaster } from "sonner";
import { Layout } from "./components/Layout";
import { AdminRoute } from "./components/AdminRoute";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { AuthProvider } from "./context/AuthContext";
import { WishlistProvider } from "./context/WishlistContext";
import { ThemeProvider, useTheme } from "./context/ThemeContext";
import { Spinner } from "./components/Spinner";
import { RouteProgressBar } from "./components/RouteProgressBar";

/* ── Eagerly-loaded (used on first paint) ─────────── */
import { HomePage } from "./pages/HomePage";
import { LoginPage } from "./pages/LoginPage";
import { RegisterPage } from "./pages/RegisterPage";
import { NotFoundPage } from "./pages/NotFoundPage";
import { ForbiddenPage } from "./pages/ForbiddenPage";

/* ── Lazy-loaded routes ──────────────────────────── */
const ProductsPage        = lazy(() => import("./pages/ProductsPage").then((m) => ({ default: m.ProductsPage })));
const ProductDetailPage   = lazy(() => import("./pages/ProductDetailPage").then((m) => ({ default: m.ProductDetailPage })));
const CartPage            = lazy(() => import("./pages/CartPage").then((m) => ({ default: m.CartPage })));
const CheckoutPage        = lazy(() => import("./pages/CheckoutPage").then((m) => ({ default: m.CheckoutPage })));
const OrdersPage          = lazy(() => import("./pages/OrdersPage").then((m) => ({ default: m.OrdersPage })));
const OrderDetailPage     = lazy(() => import("./pages/OrderDetailPage").then((m) => ({ default: m.OrderDetailPage })));
const OrderConfirmationPage = lazy(() => import("./pages/OrderConfirmationPage").then((m) => ({ default: m.OrderConfirmationPage })));
const WishlistPage        = lazy(() => import("./pages/WishlistPage").then((m) => ({ default: m.WishlistPage })));
const SearchPage          = lazy(() => import("./pages/SearchPage").then((m) => ({ default: m.SearchPage })));
const AboutPage           = lazy(() => import("./pages/AboutPage").then((m) => ({ default: m.AboutPage })));
const ContactPage         = lazy(() => import("./pages/ContactPage").then((m) => ({ default: m.ContactPage })));
const TermsPage           = lazy(() => import("./pages/TermsPage").then((m) => ({ default: m.TermsPage })));
const PrivacyPage         = lazy(() => import("./pages/PrivacyPage").then((m) => ({ default: m.PrivacyPage })));
const ForgotPasswordPage  = lazy(() => import("./pages/ForgotPasswordPage").then((m) => ({ default: m.ForgotPasswordPage })));
const ResetPasswordPage   = lazy(() => import("./pages/ResetPasswordPage").then((m) => ({ default: m.ResetPasswordPage })));
const EmailVerificationPage = lazy(() => import("./pages/EmailVerificationPage").then((m) => ({ default: m.EmailVerificationPage })));
const AccountPage         = lazy(() => import("./pages/AccountPage").then((m) => ({ default: m.AccountPage })));
const AccountProfilePage  = lazy(() => import("./pages/AccountProfilePage").then((m) => ({ default: m.AccountProfilePage })));
const AccountAddressesPage = lazy(() => import("./pages/AccountAddressesPage").then((m) => ({ default: m.AccountAddressesPage })));
const AccountSecurityPage  = lazy(() => import("./pages/AccountSecurityPage").then((m) => ({ default: m.AccountSecurityPage })));
const AdminPage           = lazy(() => import("./pages/AdminPage").then((m) => ({ default: m.AdminPage })));
const AdminProductsPage   = lazy(() => import("./pages/admin/AdminProductsPage").then((m) => ({ default: m.AdminProductsPage })));
const AdminUsersPage      = lazy(() => import("./pages/admin/AdminUsersPage").then((m) => ({ default: m.AdminUsersPage })));
const AdminCategoriesPage = lazy(() => import("./pages/admin/AdminCategoriesPage").then((m) => ({ default: m.AdminCategoriesPage })));
const AdminOrdersPage     = lazy(() => import("./pages/admin/AdminOrdersPage").then((m) => ({ default: m.AdminOrdersPage })));
const DealsPage           = lazy(() => import("./pages/DealsPage").then((m) => ({ default: m.DealsPage })));
const FAQPage             = lazy(() => import("./pages/FAQPage").then((m) => ({ default: m.FAQPage })));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 60_000,
      gcTime: 5 * 60_000,
    },
  },
});

function ThemedToaster() {
  const { theme } = useTheme();
  return (
    <Toaster
      position="bottom-right"
      theme={theme as "light" | "dark"}
      toastOptions={{ duration: 3500 }}
    />
  );
}

function PageFallback() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center">
      <Spinner className="size-6 text-ink4" />
    </div>
  );
}

export default function App() {
  return (
    <HelmetProvider>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <WishlistProvider>
            <BrowserRouter>
              <RouteProgressBar />
              <ThemedToaster />
              <Suspense fallback={<PageFallback />}>
                <Routes>
                  <Route path="/" element={<Layout />}>
                    {/* Eagerly loaded */}
                    <Route index element={<HomePage />} />
                    <Route path="login" element={<LoginPage />} />
                    <Route path="register" element={<RegisterPage />} />

                    {/* Lazy — public */}
                    <Route path="products" element={<ProductsPage />} />
                    <Route path="products/:id" element={<ProductDetailPage />} />
                    <Route path="about" element={<AboutPage />} />
                    <Route path="contact" element={<ContactPage />} />
                    <Route path="search" element={<SearchPage />} />
                    <Route path="deals" element={<DealsPage />} />
                    <Route path="faq" element={<FAQPage />} />
                    <Route path="terms" element={<TermsPage />} />
                    <Route path="privacy" element={<PrivacyPage />} />
                    <Route path="wishlist" element={<WishlistPage />} />
                    <Route path="forgot-password" element={<ForgotPasswordPage />} />
                    <Route path="reset-password/:token" element={<ResetPasswordPage />} />
                    <Route path="verify-email" element={<EmailVerificationPage />} />

                    {/* Lazy — protected */}
                    <Route path="cart" element={<ProtectedRoute><CartPage /></ProtectedRoute>} />
                    <Route path="checkout" element={<ProtectedRoute><CheckoutPage /></ProtectedRoute>} />
                    <Route path="orders" element={<ProtectedRoute><OrdersPage /></ProtectedRoute>} />
                    <Route path="orders/confirmation/:sessionId" element={<ProtectedRoute><OrderConfirmationPage /></ProtectedRoute>} />
                    <Route path="orders/:id" element={<ProtectedRoute><OrderDetailPage /></ProtectedRoute>} />

                    <Route path="account/*" element={<ProtectedRoute><AccountPage /></ProtectedRoute>}>
                      <Route path="profile" element={<AccountProfilePage />} />
                      <Route path="security" element={<AccountSecurityPage />} />
                      <Route path="addresses" element={<AccountAddressesPage />} />
                    </Route>

                    {/* Lazy — admin */}
                    <Route path="admin/*" element={<AdminRoute><AdminPage /></AdminRoute>}>
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
              </Suspense>
            </BrowserRouter>
          </WishlistProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
    </HelmetProvider>
  );
}
