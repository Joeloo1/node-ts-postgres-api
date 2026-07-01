import { lazy, Suspense, useEffect } from "react";
import { HelmetProvider } from "react-helmet-async";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { toast, Toaster } from "sonner";
import { Layout } from "./components/Layout";
import { AdminRoute } from "./components/AdminRoute";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { AuthProvider } from "./context/AuthContext";
import { WishlistProvider } from "./context/WishlistContext";
import { ThemeProvider, useTheme } from "./context/ThemeContext";
import { CompareProvider } from "./context/CompareContext";
import { Spinner } from "./components/Spinner";
import { RouteProgressBar } from "./components/RouteProgressBar";
import { AppErrorBoundary, PageErrorBoundary } from "./components/AppErrorBoundary";

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
const AccountLoyaltyPage   = lazy(() => import("./pages/AccountLoyaltyPage").then((m) => ({ default: m.AccountLoyaltyPage })));
const AccountReferralPage  = lazy(() => import("./pages/AccountReferralPage").then((m) => ({ default: m.AccountReferralPage })));
const AccountGiftCardsPage = lazy(() => import("./pages/AccountGiftCardsPage").then((m) => ({ default: m.AccountGiftCardsPage })));
const AdminPage           = lazy(() => import("./pages/AdminPage").then((m) => ({ default: m.AdminPage })));
const AdminProductsPage   = lazy(() => import("./pages/admin/AdminProductsPage").then((m) => ({ default: m.AdminProductsPage })));
const AdminUsersPage      = lazy(() => import("./pages/admin/AdminUsersPage").then((m) => ({ default: m.AdminUsersPage })));
const AdminCategoriesPage = lazy(() => import("./pages/admin/AdminCategoriesPage").then((m) => ({ default: m.AdminCategoriesPage })));
const AdminOrdersPage     = lazy(() => import("./pages/admin/AdminOrdersPage").then((m) => ({ default: m.AdminOrdersPage })));
const AdminCouponsPage    = lazy(() => import("./pages/admin/AdminCouponsPage").then((m) => ({ default: m.AdminCouponsPage })));
const AdminContactPage    = lazy(() => import("./pages/admin/AdminContactPage").then((m) => ({ default: m.AdminContactPage })));
const DealsPage           = lazy(() => import("./pages/DealsPage").then((m) => ({ default: m.DealsPage })));
const FAQPage             = lazy(() => import("./pages/FAQPage").then((m) => ({ default: m.FAQPage })));
const ShippingReturnsPage = lazy(() => import("./pages/ShippingReturnsPage").then((m) => ({ default: m.ShippingReturnsPage })));
const UnsubscribePage     = lazy(() => import("./pages/UnsubscribePage").then((m) => ({ default: m.UnsubscribePage })));
const BestSellersPage     = lazy(() => import("./pages/BestSellersPage").then((m) => ({ default: m.BestSellersPage })));
const NewArrivalsPage     = lazy(() => import("./pages/NewArrivalsPage").then((m) => ({ default: m.NewArrivalsPage })));
const CategoryPage        = lazy(() => import("./pages/CategoryPage").then((m) => ({ default: m.CategoryPage })));
const TrackOrderPage      = lazy(() => import("./pages/TrackOrderPage").then((m) => ({ default: m.TrackOrderPage })));
const ComparisonPage      = lazy(() => import("./pages/ComparisonPage").then((m) => ({ default: m.ComparisonPage })));
const GiftCardsPage       = lazy(() => import("./pages/GiftCardsPage").then((m) => ({ default: m.GiftCardsPage })));
const BlogPage            = lazy(() => import("./pages/BlogPage").then((m) => ({ default: m.BlogPage })));
const BlogPostPage        = lazy(() => import("./pages/BlogPostPage").then((m) => ({ default: m.BlogPostPage })));
const AdminReviewsPage        = lazy(() => import("./pages/admin/AdminReviewsPage").then((m) => ({ default: m.AdminReviewsPage })));
const AdminAnalyticsPage      = lazy(() => import("./pages/admin/AdminAnalyticsPage").then((m) => ({ default: m.AdminAnalyticsPage })));
const AdminReturnsPage        = lazy(() => import("./pages/admin/AdminReturnsPage").then((m) => ({ default: m.AdminReturnsPage })));
const AdminPromotionsPage     = lazy(() => import("./pages/admin/AdminPromotionsPage").then((m) => ({ default: m.AdminPromotionsPage })));
const AdminBannersPage        = lazy(() => import("./pages/admin/AdminBannersPage").then((m) => ({ default: m.AdminBannersPage })));
const AdminNotificationsPage  = lazy(() => import("./pages/admin/AdminNotificationsPage").then((m) => ({ default: m.AdminNotificationsPage })));
const AdminGiftCardsPage      = lazy(() => import("./pages/admin/AdminGiftCardsPage").then((m) => ({ default: m.AdminGiftCardsPage })));
const AdminShippingPage       = lazy(() => import("./pages/admin/AdminShippingPage").then((m) => ({ default: m.AdminShippingPage })));
const LoyaltyPage         = lazy(() => import("./pages/LoyaltyPage").then((m) => ({ default: m.LoyaltyPage })));
const SitemapPage         = lazy(() => import("./pages/SitemapPage").then((m) => ({ default: m.SitemapPage })));
const OfflinePage         = lazy(() => import("./pages/OfflinePage").then((m) => ({ default: m.OfflinePage })));

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

/** Shows a persistent "You're offline" toast while navigator.onLine is false. */
function OfflineDetector() {
  useEffect(() => {
    let toastId: string | number | undefined;

    function handleOffline() {
      toastId = toast.error("You're offline. Check your connection.", {
        id: "offline",
        duration: Infinity,
      });
    }

    function handleOnline() {
      toast.dismiss("offline");
      toast.success("Back online!", { id: "back-online", duration: 3000 });
      toastId = undefined;
    }

    window.addEventListener("offline", handleOffline);
    window.addEventListener("online", handleOnline);

    // Fire immediately if already offline on mount
    if (!navigator.onLine) handleOffline();

    return () => {
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online", handleOnline);
      if (toastId !== undefined) toast.dismiss(toastId);
    };
  }, []);

  return null;
}

export default function App() {
  return (
    <HelmetProvider>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <WishlistProvider>
            <CompareProvider>
            <BrowserRouter>
              <OfflineDetector />
              <RouteProgressBar />
              <ThemedToaster />
              <AppErrorBoundary fullPage>
              <Suspense fallback={<PageFallback />}>
                <Routes>
                  <Route path="/" element={<Layout />}>
                    {/* Eagerly loaded */}
                    <Route index element={<PageErrorBoundary><HomePage /></PageErrorBoundary>} />
                    <Route path="login" element={<LoginPage />} />
                    <Route path="register" element={<RegisterPage />} />

                    {/* Lazy — public */}
                    <Route path="products" element={<PageErrorBoundary><ProductsPage /></PageErrorBoundary>} />
                    <Route path="products/:id" element={<PageErrorBoundary><ProductDetailPage /></PageErrorBoundary>} />
                    <Route path="about" element={<PageErrorBoundary><AboutPage /></PageErrorBoundary>} />
                    <Route path="contact" element={<PageErrorBoundary><ContactPage /></PageErrorBoundary>} />
                    <Route path="search" element={<PageErrorBoundary><SearchPage /></PageErrorBoundary>} />
                    <Route path="deals" element={<PageErrorBoundary><DealsPage /></PageErrorBoundary>} />
                    <Route path="faq" element={<PageErrorBoundary><FAQPage /></PageErrorBoundary>} />
                    <Route path="terms" element={<TermsPage />} />
                    <Route path="privacy" element={<PrivacyPage />} />
                    <Route path="shipping-returns" element={<ShippingReturnsPage />} />
                    <Route path="unsubscribe" element={<UnsubscribePage />} />
                    <Route path="wishlist" element={<PageErrorBoundary><WishlistPage /></PageErrorBoundary>} />
                    <Route path="best-sellers" element={<PageErrorBoundary><BestSellersPage /></PageErrorBoundary>} />
                    <Route path="new-arrivals" element={<PageErrorBoundary><NewArrivalsPage /></PageErrorBoundary>} />
                    <Route path="categories/:id" element={<PageErrorBoundary><CategoryPage /></PageErrorBoundary>} />
                    <Route path="track-order" element={<PageErrorBoundary><TrackOrderPage /></PageErrorBoundary>} />
                    <Route path="compare" element={<PageErrorBoundary><ComparisonPage /></PageErrorBoundary>} />
                    <Route path="gift-cards" element={<PageErrorBoundary><GiftCardsPage /></PageErrorBoundary>} />
                    <Route path="blog" element={<PageErrorBoundary><BlogPage /></PageErrorBoundary>} />
                    <Route path="blog/:slug" element={<PageErrorBoundary><BlogPostPage /></PageErrorBoundary>} />
                    <Route path="loyalty" element={<PageErrorBoundary><LoyaltyPage /></PageErrorBoundary>} />
                    <Route path="sitemap" element={<SitemapPage />} />
                    <Route path="offline" element={<OfflinePage />} />
                    <Route path="forgot-password" element={<ForgotPasswordPage />} />
                    <Route path="reset-password/:token" element={<ResetPasswordPage />} />
                    <Route path="verify-email" element={<EmailVerificationPage />} />

                    {/* Lazy — protected */}
                    <Route path="cart" element={<ProtectedRoute><PageErrorBoundary><CartPage /></PageErrorBoundary></ProtectedRoute>} />
                    <Route path="checkout" element={<ProtectedRoute><PageErrorBoundary><CheckoutPage /></PageErrorBoundary></ProtectedRoute>} />
                    <Route path="orders" element={<ProtectedRoute><PageErrorBoundary><OrdersPage /></PageErrorBoundary></ProtectedRoute>} />
                    <Route path="orders/confirmation/:sessionId" element={<ProtectedRoute><PageErrorBoundary><OrderConfirmationPage /></PageErrorBoundary></ProtectedRoute>} />
                    <Route path="orders/:id" element={<ProtectedRoute><PageErrorBoundary><OrderDetailPage /></PageErrorBoundary></ProtectedRoute>} />

                    <Route path="account/*" element={<ProtectedRoute><PageErrorBoundary><AccountPage /></PageErrorBoundary></ProtectedRoute>}>
                      <Route path="profile" element={<AccountProfilePage />} />
                      <Route path="security" element={<AccountSecurityPage />} />
                      <Route path="addresses" element={<AccountAddressesPage />} />
                      <Route path="loyalty" element={<AccountLoyaltyPage />} />
                      <Route path="gift-cards" element={<AccountGiftCardsPage />} />
                      <Route path="referrals" element={<AccountReferralPage />} />
                    </Route>

                    {/* Lazy — admin */}
                    <Route path="admin/*" element={<AdminRoute><PageErrorBoundary><AdminPage /></PageErrorBoundary></AdminRoute>}>
                      <Route path="products" element={<AdminProductsPage />} />
                      <Route path="users" element={<AdminUsersPage />} />
                      <Route path="categories" element={<AdminCategoriesPage />} />
                      <Route path="orders" element={<AdminOrdersPage />} />
                      <Route path="coupons" element={<AdminCouponsPage />} />
                      <Route path="contact" element={<AdminContactPage />} />
                      <Route path="reviews" element={<AdminReviewsPage />} />
                      <Route path="analytics" element={<AdminAnalyticsPage />} />
                      <Route path="returns" element={<AdminReturnsPage />} />
                      <Route path="promotions" element={<AdminPromotionsPage />} />
                      <Route path="banners" element={<AdminBannersPage />} />
                      <Route path="notifications" element={<AdminNotificationsPage />} />
                      <Route path="gift-cards" element={<AdminGiftCardsPage />} />
                      <Route path="shipping" element={<AdminShippingPage />} />
                    </Route>

                    <Route path="403" element={<ForbiddenPage />} />
                    <Route path="acount" element={<Navigate to="/account" replace />} />
                    <Route path="accout" element={<Navigate to="/account" replace />} />
                    <Route path="*" element={<NotFoundPage />} />
                  </Route>
                </Routes>
              </Suspense>
              </AppErrorBoundary>
            </BrowserRouter>
            </CompareProvider>
          </WishlistProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
    </HelmetProvider>
  );
}
