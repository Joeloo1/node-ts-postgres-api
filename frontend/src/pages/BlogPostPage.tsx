import { useState, useEffect } from "react";
import { useParams, Link, Navigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { motion } from "framer-motion";
import { usePageTitle } from "../hooks/usePageTitle";
import { BLOG_POSTS } from "./BlogPage";
import { ArrowLeftIcon, ClockIcon, ChevronRightIcon, HomeIcon } from "../components/Icons";

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
}

const POST_CONTENT: Record<string, string> = {
  "how-to-choose-the-right-laptop": `
## Understanding Your Use Case

Before looking at specs, ask yourself: *what will I primarily use this laptop for?*

- **Everyday tasks** (browsing, email, documents): Any modern laptop with 8GB RAM will do.
- **Creative work** (photo/video editing): Look for a dedicated GPU and at least 16GB RAM.
- **Gaming**: Dedicated GPU is essential. RTX 4060 or better for modern games.
- **Programming**: Prioritise CPU performance and RAM (16GB minimum).
- **Students**: Balance portability and battery life over raw power.

## Key Specs Explained

### Processor (CPU)
The CPU determines how fast your laptop runs tasks. For most users, an Intel Core i5/i7 (13th/14th gen) or AMD Ryzen 5/7 7000 series provides excellent performance. Apple's M-series chips offer exceptional performance-per-watt.

### RAM
- **8GB**: Good for light use and browsing
- **16GB**: The sweet spot for most users
- **32GB+**: For video editors, 3D artists, and developers

### Storage
Always go SSD over HDD. NVMe SSDs are significantly faster than SATA SSDs. Aim for at least **512GB**.

### Display
- Resolution: 1080p is fine; 1440p+ is great for creatives
- Refresh rate: 60Hz for normal use; 120Hz+ for gaming and smooth scrolling
- Panel: IPS/OLED for colour accuracy; TN for competitive gaming

## Battery Life

Manufacturer claims are often optimistic. Real-world battery life is typically 60–70% of the stated figure under normal workloads. Look for laptops rated at 12+ hours if you need all-day battery.

## Our Top Picks by Category

| Use Case | Recommended Laptop |
|---|---|
| Best overall | MacBook Air M3 |
| Best Windows | Dell XPS 15 |
| Best budget | Acer Swift 3 |
| Best gaming | ASUS ROG Zephyrus G14 |
| Best for students | Lenovo IdeaPad 5 |

## Final Advice

Set a budget before you start shopping. It's easy to get upsold on specs you don't need. For most people, a mid-range laptop with 16GB RAM, an SSD, and a good display will serve them well for 5+ years.
  `,
  "best-wireless-earbuds-2025": `
## How We Tested

We tested 40+ pairs of wireless earbuds across five categories: sound quality, noise cancellation, call quality, battery life, and comfort. Each pair was tested for at least two weeks in real-world conditions.

## Top Picks

### Best Overall: Sony WF-1000XM5
Sony's flagship earbuds deliver industry-leading noise cancellation, exceptional sound quality, and up to 8 hours of battery life (24 hours with case). The comfortable fit and seamless device switching make these the best all-around choice.

### Best Value: Nothing Ear (2)
At half the price of premium earbuds, the Nothing Ear (2) punches well above its weight class. Excellent active noise cancellation, punchy sound, and a distinctive transparent design.

### Best for Sports: Jabra Elite 8 Active
Rated IP68 (fully waterproof), Jabra Elite 8 Active earbuds stay put during intense workouts and deliver superb call quality. The Hear Through mode is the best we've tested.

### Best Apple Integration: AirPods Pro (2nd Gen)
No earbuds integrate more seamlessly with iPhone and Mac. The H2 chip delivers excellent ANC, and the USB-C case now supports Lossless audio with Vision Pro.

## What to Look For

- **ANC quality**: Essential for commuting or open offices
- **Codec support**: aptX Lossless/LDAC for Hi-Fi audio
- **Battery life**: 6+ hours per charge is comfortable
- **Call quality**: Often overlooked but critical for remote workers
- **Fit**: The best earbuds are ones that stay in your ears

## Verdict

For most people, the Sony WF-1000XM5 or AirPods Pro are the right choice. If budget is a concern, the Nothing Ear (2) offers genuinely impressive performance for the price.
  `,
};

function renderMarkdown(content: string) {
  const lines = content.trim().split("\n");
  const elements: React.ReactNode[] = [];
  let inTable = false;
  let tableRows: string[][] = [];

  function flushTable() {
    if (tableRows.length < 2) return;
    const [header, , ...rows] = tableRows;
    elements.push(
      <div key={`table-${elements.length}`} className="overflow-x-auto rounded-xl border border-stroke">
        <table className="w-full text-sm">
          <thead className="bg-raised">
            <tr>
              {header.filter(Boolean).map((h, i) => (
                <th key={i} className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-ink3">{h.trim()}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} className="border-t border-stroke">
                {row.filter(Boolean).map((cell, j) => (
                  <td key={j} className="px-4 py-2.5 text-ink3">{cell.trim()}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
    tableRows = [];
    inTable = false;
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.startsWith("|")) {
      inTable = true;
      tableRows.push(line.split("|").slice(1, -1));
      continue;
    }

    if (inTable) flushTable();

    if (line.startsWith("## ")) {
      elements.push(<h2 key={i} className="mt-8 mb-3 font-display text-xl font-bold text-ink">{line.slice(3)}</h2>);
    } else if (line.startsWith("### ")) {
      elements.push(<h3 key={i} className="mt-6 mb-2 font-display text-base font-bold text-ink">{line.slice(4)}</h3>);
    } else if (line.startsWith("- **")) {
      const match = line.match(/^- \*\*(.+?)\*\*:? ?(.*)/);
      if (match) {
        elements.push(
          <li key={i} className="ml-4 text-[15px] leading-relaxed text-ink3">
            <span className="font-semibold text-ink">{match[1]}</span>{match[2] ? `: ${match[2]}` : ""}
          </li>
        );
      }
    } else if (line.startsWith("- ")) {
      elements.push(<li key={i} className="ml-4 text-[15px] leading-relaxed text-ink3">{line.slice(2)}</li>);
    } else if (line.trim() === "") {
      elements.push(<div key={i} className="h-2" />);
    } else {
      const processed = line
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.+?)\*/g, '<em>$1</em>');
      elements.push(
        <p key={i} className="text-[15px] leading-relaxed text-ink3" dangerouslySetInnerHTML={{ __html: processed }} />
      );
    }
  }

  if (inTable) flushTable();

  return elements;
}

export function BlogPostPage() {
  const { slug } = useParams<{ slug: string }>();
  const post = BLOG_POSTS.find((p) => p.slug === slug);
  const [progress, setProgress] = useState(0);

  usePageTitle(post?.title ?? "Blog");

  useEffect(() => {
    function onScroll() {
      const total = document.documentElement.scrollHeight - window.innerHeight;
      setProgress(total > 0 ? Math.min(window.scrollY / total, 1) : 0);
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  if (!post) return <Navigate to="/blog" replace />;

  const content = POST_CONTENT[post.slug];
  const relatedPosts = BLOG_POSTS.filter((p) => p.slug !== post.slug && p.category === post.category).slice(0, 2);

  return (
    <>
      {/* Reading progress bar */}
      <div
        className="fixed left-0 top-0 z-[60] h-0.5 bg-emerald-500 shadow-[0_0_8px_0_rgb(16,185,129,0.5)] transition-[width] duration-75 ease-linear"
        style={{ width: `${progress * 100}%` }}
      />

      <Helmet>
        <title>{post.title} — Northline Blog</title>
        <meta name="description" content={post.excerpt} />
        <meta property="og:title" content={`${post.title} — Northline Blog`} />
        <meta property="og:description" content={post.excerpt} />
        <meta property="og:type" content="article" />
        <meta property="og:site_name" content="Northline" />
        <meta property="og:image" content={post.image} />
      </Helmet>

      <div className="mx-auto max-w-3xl space-y-8">
        {/* Breadcrumbs */}
        <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-[12px] text-ink4">
          <Link to="/" className="flex items-center gap-1 hover:text-ink transition-colors">
            <HomeIcon className="size-3.5" />
            Home
          </Link>
          <ChevronRightIcon className="size-3" />
          <Link to="/blog" className="hover:text-ink transition-colors">Blog</Link>
          <ChevronRightIcon className="size-3" />
          <span className="line-clamp-1 text-ink">{post.title}</span>
        </nav>

        {/* Article */}
        <motion.article
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="space-y-6"
        >
          {/* Meta */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                {post.category}
              </span>
              <span className="flex items-center gap-1 text-[12px] text-ink4">
                <ClockIcon className="size-3.5" />
                {post.readTime} min read
              </span>
              <span className="text-[12px] text-ink4">·</span>
              <time className="text-[12px] text-ink4">{formatDate(post.date)}</time>
            </div>
            <h1 className="font-display text-3xl font-bold text-ink leading-tight sm:text-4xl">
              {post.title}
            </h1>
            <p className="text-[15px] leading-relaxed text-ink3">{post.excerpt}</p>
          </div>

          {/* Hero image */}
          <div className="aspect-[2/1] overflow-hidden rounded-2xl">
            <img src={post.image} alt={post.title} className="h-full w-full object-cover" />
          </div>

          {/* Content */}
          <div className="prose-northline space-y-2">
            {content ? renderMarkdown(content) : (
              <p className="text-[15px] leading-relaxed text-ink3">Full article content coming soon.</p>
            )}
          </div>
        </motion.article>

        {/* Back + Related */}
        <div className="space-y-6 border-t border-stroke pt-8">
          <Link
            to="/blog"
            className="inline-flex items-center gap-2 rounded-full border border-stroke bg-card px-4 py-2 text-sm font-medium text-ink3 transition-all hover:border-edge hover:text-ink hover:shadow-sm"
          >
            <ArrowLeftIcon className="size-4" />
            Back to blog
          </Link>

          {relatedPosts.length > 0 && (
            <div>
              <p className="mb-4 text-sm font-semibold text-ink">Related articles</p>
              <div className="grid gap-4 sm:grid-cols-2">
                {relatedPosts.map((p) => (
                  <Link
                    key={p.slug}
                    to={`/blog/${p.slug}`}
                    className="group flex gap-3 rounded-xl border border-stroke bg-card p-3 transition-all hover:border-edge hover:shadow-md hover:shadow-black/5"
                  >
                    <img
                      src={p.image}
                      alt={p.title}
                      className="size-16 shrink-0 rounded-lg object-cover"
                    />
                    <div className="min-w-0">
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-ink4">{p.category}</p>
                      <p className="mt-0.5 text-sm font-semibold text-ink line-clamp-2 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                        {p.title}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
