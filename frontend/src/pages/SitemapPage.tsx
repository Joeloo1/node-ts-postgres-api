import { useQuery } from "@tanstack/react-query";
import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { usePageTitle } from "../hooks/usePageTitle";
import { queryKeys } from "../lib/queryKeys";
import * as categoryService from "../services/categories";

const STATIC_SECTIONS = [
  {
    title: "Shop",
    links: [
      { label: "All products", to: "/products" },
      { label: "Best sellers", to: "/best-sellers" },
      { label: "New arrivals", to: "/new-arrivals" },
      { label: "Deals & offers", to: "/deals" },
      { label: "Gift cards", to: "/gift-cards" },
      { label: "Compare products", to: "/compare" },
    ],
  },
  {
    title: "Account",
    links: [
      { label: "Sign in", to: "/login" },
      { label: "Create account", to: "/register" },
      { label: "My profile", to: "/account/profile" },
      { label: "My orders", to: "/orders" },
      { label: "Wishlist", to: "/wishlist" },
      { label: "Addresses", to: "/account/addresses" },
      { label: "Security", to: "/account/security" },
      { label: "Track my order", to: "/track-order" },
    ],
  },
  {
    title: "Discover",
    links: [
      { label: "Search", to: "/search" },
      { label: "Blog & guides", to: "/blog" },
      { label: "Rewards program", to: "/loyalty" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About us", to: "/about" },
      { label: "Contact", to: "/contact" },
      { label: "FAQ", to: "/faq" },
      { label: "Shipping & returns", to: "/shipping-returns" },
      { label: "Terms of service", to: "/terms" },
      { label: "Privacy policy", to: "/privacy" },
    ],
  },
];

export function SitemapPage() {
  usePageTitle("Sitemap");

  const { data: categories } = useQuery({
    queryKey: queryKeys.categories(),
    queryFn: categoryService.getCategories,
    staleTime: 10 * 60_000,
  });

  return (
    <>
      <Helmet>
        <title>Sitemap — Northline</title>
        <meta name="description" content="Browse all pages on Northline — shop, account, blog, and company information." />
        <meta property="og:title" content="Sitemap — Northline" />
        <meta property="og:description" content="Browse all pages on Northline." />
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="Northline" />
      </Helmet>

      <div className="space-y-10">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <p className="text-[11px] font-semibold uppercase tracking-widest text-ink4">Navigation</p>
          <h1 className="mt-1 font-display text-3xl font-bold text-ink sm:text-4xl">Sitemap</h1>
          <p className="mt-2 text-[15px] text-ink3">Every page on Northline, organised for easy navigation.</p>
        </motion.div>

        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {STATIC_SECTIONS.map((section, i) => (
            <motion.div
              key={section.title}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: i * 0.07 }}
            >
              <h2 className="mb-3 text-[11px] font-bold uppercase tracking-widest text-ink3">{section.title}</h2>
              <ul className="space-y-2">
                {section.links.map(({ label, to }) => (
                  <li key={to}>
                    <Link
                      to={to}
                      className="text-sm text-ink4 transition-colors hover:text-emerald-600 dark:hover:text-emerald-400"
                    >
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </div>

        {/* Categories */}
        {categories && categories.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.3 }}
          >
            <h2 className="mb-3 text-[11px] font-bold uppercase tracking-widest text-ink3">Categories</h2>
            <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {categories.map((c) => (
                <Link
                  key={c.category_id}
                  to={`/categories/${c.category_id}`}
                  className="rounded-lg border border-stroke bg-card px-3.5 py-2.5 text-sm text-ink3 transition-colors hover:border-edge hover:text-ink"
                >
                  {c.name}
                </Link>
              ))}
            </div>
          </motion.div>
        )}
      </div>
    </>
  );
}
