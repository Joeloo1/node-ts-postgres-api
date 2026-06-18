import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { motion, type Variants, AnimatePresence } from "framer-motion";
import { usePageTitle } from "../hooks/usePageTitle";
import { ArrowRightIcon, ClockIcon } from "../components/Icons";

export type BlogPost = {
  slug: string;
  title: string;
  excerpt: string;
  category: string;
  readTime: number;
  date: string;
  image: string;
  featured?: boolean;
};

export const BLOG_POSTS: BlogPost[] = [
  {
    slug: "how-to-choose-the-right-laptop",
    title: "How to Choose the Right Laptop in 2025",
    excerpt: "With hundreds of options on the market, picking the perfect laptop can be overwhelming. Here's a comprehensive guide to help you narrow down your choices based on use case, budget, and performance needs.",
    category: "Buying Guide",
    readTime: 8,
    date: "2025-12-01",
    image: "https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=800&q=80",
    featured: true,
  },
  {
    slug: "best-wireless-earbuds-2025",
    title: "The Best Wireless Earbuds of 2025",
    excerpt: "We tested over 40 pairs of wireless earbuds to find the best options for sound quality, noise cancellation, battery life, and value.",
    category: "Reviews",
    readTime: 10,
    date: "2025-11-20",
    image: "https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=800&q=80",
    featured: true,
  },
  {
    slug: "smart-home-setup-guide",
    title: "Setting Up Your Smart Home on a Budget",
    excerpt: "Transform your home into a smart home without breaking the bank. We cover affordable devices that work with Alexa and Google Home.",
    category: "How-To",
    readTime: 6,
    date: "2025-11-10",
    image: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=80",
  },
  {
    slug: "home-office-essentials",
    title: "10 Home Office Essentials That Will Boost Your Productivity",
    excerpt: "After reviewing hundreds of products, here are the must-have items for a comfortable and productive home office setup.",
    category: "Buying Guide",
    readTime: 7,
    date: "2025-11-01",
    image: "https://images.unsplash.com/photo-1593642632559-0c6d3fc62b89?w=800&q=80",
  },
  {
    slug: "gaming-monitor-guide",
    title: "Gaming Monitor Buying Guide: Resolution, Refresh Rate & More",
    excerpt: "1080p vs 1440p vs 4K? 144Hz vs 240Hz? We break down every spec that matters for competitive and casual gaming alike.",
    category: "Buying Guide",
    readTime: 9,
    date: "2025-10-22",
    image: "https://images.unsplash.com/photo-1593640408182-31c70c8268f5?w=800&q=80",
  },
  {
    slug: "kitchen-gadgets-that-actually-work",
    title: "Kitchen Gadgets That Actually Work (And Ones to Skip)",
    excerpt: "We put the most popular kitchen gadgets to the test. Here are the ones worth every penny — and the ones that'll collect dust.",
    category: "Reviews",
    readTime: 5,
    date: "2025-10-15",
    image: "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=800&q=80",
  },
];

const CATEGORIES = ["All", "Buying Guide", "Reviews", "How-To"];

const container: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
};
const item: Variants = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.25, 0.1, 0.25, 1] } },
};

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
}

export function BlogPage() {
  usePageTitle("Blog");
  const [activeCategory, setActiveCategory] = useState("All");

  const allPosts = activeCategory === "All"
    ? BLOG_POSTS
    : BLOG_POSTS.filter((p) => p.category === activeCategory);

  const featured = allPosts.filter((p) => p.featured).slice(0, 2);
  const rest = allPosts.filter((p) => !p.featured);

  return (
    <>
      <Helmet>
        <title>Blog — Northline</title>
        <meta name="description" content="Buying guides, product reviews, and how-to articles from the Northline team to help you shop smarter." />
        <meta property="og:title" content="Blog — Northline" />
        <meta property="og:description" content="Buying guides and product reviews from the Northline team." />
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="Northline" />
      </Helmet>

      <div className="space-y-12">
        {/* Breadcrumb */}
        <nav aria-label="Breadcrumb">
          <ol className="flex items-center gap-1.5 text-[12px] text-ink4">
            <li><Link to="/" className="transition-colors hover:text-ink">Home</Link></li>
            <li>/</li>
            <li className="font-medium text-ink">Blog</li>
          </ol>
        </nav>

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="space-y-4"
        >
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-widest text-emerald-600 dark:text-emerald-400">Northline Blog</p>
            <h1 className="mt-1 font-display text-3xl font-bold text-ink sm:text-4xl">
              Guides & Reviews
            </h1>
          </div>
          <p className="max-w-xl text-[15px] leading-relaxed text-ink3">
            Expert buying guides, in-depth reviews, and tips to help you make smarter
            purchasing decisions.
          </p>

          {/* Category filter */}
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setActiveCategory(cat)}
                className={`rounded-full border px-4 py-1.5 text-xs font-semibold transition-all ${
                  activeCategory === cat
                    ? "border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                    : "border-stroke bg-card text-ink3 hover:border-edge hover:text-ink"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </motion.div>

        <AnimatePresence mode="wait">
          <motion.div
            key={activeCategory}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.2 }}
            className="space-y-12"
          >
            {allPosts.length === 0 ? (
              <p className="py-20 text-center text-[14px] text-ink4">
                No articles in this category yet.
              </p>
            ) : (
              <>
                {/* Featured posts */}
                {featured.length > 0 && (
                  <section>
                    <h2 className="mb-5 text-xs font-bold uppercase tracking-widest text-ink4">Featured</h2>
                    <div className="grid gap-6 md:grid-cols-2">
                      {featured.map((post) => (
                        <Link
                          key={post.slug}
                          to={`/blog/${post.slug}`}
                          className="group overflow-hidden rounded-2xl border border-stroke bg-card transition-all hover:border-edge hover:shadow-lg hover:shadow-black/10"
                        >
                          <div className="aspect-[2/1] overflow-hidden">
                            <img
                              src={post.image}
                              alt={post.title}
                              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                            />
                          </div>
                          <div className="p-5 space-y-2">
                            <div className="flex items-center gap-2">
                              <span className="rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                                {post.category}
                              </span>
                              <span className="flex items-center gap-1 text-[11px] text-ink4">
                                <ClockIcon className="size-3" />
                                {post.readTime} min read
                              </span>
                            </div>
                            <h3 className="font-display text-lg font-bold text-ink leading-snug group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                              {post.title}
                            </h3>
                            <p className="text-sm text-ink3 line-clamp-2">{post.excerpt}</p>
                            <div className="flex items-center justify-between pt-1">
                              <time className="text-[11px] text-ink4">{formatDate(post.date)}</time>
                              <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                                Read more <ArrowRightIcon className="size-3" />
                              </span>
                            </div>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </section>
                )}

                {/* All / remaining posts */}
                {rest.length > 0 && (
                  <section>
                    <h2 className="mb-5 text-xs font-bold uppercase tracking-widest text-ink4">
                      {activeCategory === "All" ? "Latest articles" : activeCategory}
                    </h2>
                    <motion.div
                      variants={container}
                      initial="hidden"
                      animate="show"
                      className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3"
                    >
                      {rest.map((post) => (
                        <motion.div key={post.slug} variants={item}>
                          <Link
                            to={`/blog/${post.slug}`}
                            className="group flex h-full flex-col overflow-hidden rounded-2xl border border-stroke bg-card transition-all hover:border-edge hover:shadow-lg hover:shadow-black/10"
                          >
                            <div className="aspect-[16/9] overflow-hidden">
                              <img
                                src={post.image}
                                alt={post.title}
                                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                              />
                            </div>
                            <div className="flex flex-1 flex-col justify-between p-4 space-y-2">
                              <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                  <span className="rounded-full bg-raised px-2 py-0.5 text-[10px] font-semibold text-ink3">
                                    {post.category}
                                  </span>
                                  <span className="flex items-center gap-1 text-[10px] text-ink4">
                                    <ClockIcon className="size-3" />
                                    {post.readTime} min
                                  </span>
                                </div>
                                <h3 className="font-display text-base font-bold text-ink leading-snug group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors line-clamp-2">
                                  {post.title}
                                </h3>
                                <p className="text-[13px] text-ink3 line-clamp-2">{post.excerpt}</p>
                              </div>
                              <div className="flex items-center justify-between pt-1">
                                <time className="text-[11px] text-ink4">{formatDate(post.date)}</time>
                                <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                                  Read <ArrowRightIcon className="size-3" />
                                </span>
                              </div>
                            </div>
                          </Link>
                        </motion.div>
                      ))}
                    </motion.div>
                  </section>
                )}
              </>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </>
  );
}
