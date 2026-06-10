import { Link } from "react-router-dom";
import { motion, type Variants } from "framer-motion";
import { usePageTitle } from "../hooks/usePageTitle";
import { useAuth } from "../context/AuthContext";
import {
  ShieldIcon,
  TruckIcon,
  PackageIcon,
  PhoneIcon,
  StarIcon,
  CheckIcon,
} from "../components/Icons";

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.25, 0.1, 0.25, 1] as [number, number, number, number] } },
};

const stagger: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.09 } },
};

const values = [
  {
    icon: StarIcon,
    title: "Curated quality",
    desc: "Every product is hand-picked for value, durability, and honest pricing — no filler.",
  },
  {
    icon: TruckIcon,
    title: "Fast delivery",
    desc: "Free shipping on orders over $50 with real-time tracking from checkout to door.",
  },
  {
    icon: ShieldIcon,
    title: "Secure & private",
    desc: "256-bit SSL, httpOnly auth cookies, and zero third-party data sharing.",
  },
  {
    icon: PackageIcon,
    title: "Easy returns",
    desc: "30-day no-fuss returns — we process refunds within 3 business days.",
  },
  {
    icon: PhoneIcon,
    title: "24/7 support",
    desc: "Reach us any time by email. Typical response under 24 hours on business days.",
  },
  {
    icon: CheckIcon,
    title: "Transparent pricing",
    desc: "No hidden fees. No dark patterns. The price shown is the price you pay.",
  },
];

const stats = [
  { value: "30 days", label: "Return window" },
  { value: "24h",     label: "Order dispatch" },
  { value: "$50+",    label: "Free shipping" },
  { value: "2025",    label: "Founded" },
];

export function AboutPage() {
  usePageTitle("About");
  const { token } = useAuth();

  return (
    <div className="mx-auto max-w-3xl space-y-20">

      {/* ── Hero ─────────────────────────────────── */}
      <motion.section
        variants={stagger}
        initial="hidden"
        animate="show"
        className="relative overflow-hidden rounded-3xl border border-stroke bg-gradient-to-br from-zinc-900 via-zinc-950 to-zinc-950 px-8 py-16 sm:px-14 sm:py-20"
      >
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_60%_at_50%_-10%,rgba(16,185,129,0.12),transparent)]" />
        <div
          className="absolute inset-0 opacity-[0.025]"
          style={{ backgroundImage: "radial-gradient(circle, #ffffff 1px, transparent 1px)", backgroundSize: "28px 28px" }}
        />
        <div className="relative space-y-5">
          <motion.div variants={fadeUp} className="inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3.5 py-1.5">
            <span className="relative flex size-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-70" />
              <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
            </span>
            <span className="text-xs font-semibold uppercase tracking-widest text-emerald-400">Our story</span>
          </motion.div>

          <motion.h1 variants={fadeUp} className="font-display text-4xl font-bold leading-tight text-ink sm:text-5xl">
            Shopping that feels<br />
            <span className="bg-gradient-to-r from-emerald-400 to-teal-300 bg-clip-text text-transparent">
              honest & effortless.
            </span>
          </motion.h1>

          <motion.p variants={fadeUp} className="max-w-xl text-lg leading-relaxed text-ink3">
            Northline started with a simple idea: online shopping should be clear, fast,
            and trustworthy. We curate quality essentials across electronics, home,
            fashion, and daily life — so you find what you need without the noise.
          </motion.p>

          <motion.div variants={fadeUp} className="flex flex-wrap gap-3 pt-2">
            <Link
              to="/products"
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-6 py-3 text-sm font-semibold text-white transition-all hover:bg-emerald-700 hover:shadow-lg hover:shadow-emerald-500/20"
            >
              Browse catalog
            </Link>
            {!token && (
              <Link
                to="/register"
                className="inline-flex items-center gap-2 rounded-xl border border-edge px-6 py-3 text-sm font-semibold text-ink2 transition-colors hover:border-edge hover:bg-hover"
              >
                Create account
              </Link>
            )}
          </motion.div>
        </div>
      </motion.section>

      {/* ── Stats ────────────────────────────────── */}
      <motion.section
        variants={stagger}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: "-60px" }}
        className="grid grid-cols-2 gap-4 sm:grid-cols-4"
      >
        {stats.map(({ value, label }) => (
          <motion.div
            key={label}
            variants={fadeUp}
            className="flex flex-col items-center justify-center gap-1 rounded-2xl border border-stroke bg-card px-4 py-6 text-center"
          >
            <p className="font-display text-2xl font-bold text-ink sm:text-3xl">{value}</p>
            <p className="text-xs text-ink4">{label}</p>
          </motion.div>
        ))}
      </motion.section>

      {/* ── Values ───────────────────────────────── */}
      <motion.section
        variants={stagger}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: "-60px" }}
        className="space-y-7"
      >
        <motion.div variants={fadeUp}>
          <p className="text-xs font-semibold uppercase tracking-widest text-emerald-400/80">Why Northline</p>
          <h2 className="mt-1 font-display text-2xl font-bold text-ink">What we stand for</h2>
        </motion.div>

        <div className="grid gap-4 sm:grid-cols-2">
          {values.map(({ icon: Icon, title, desc }) => (
            <motion.div
              key={title}
              variants={fadeUp}
              className="group flex gap-4 rounded-2xl border border-stroke bg-card p-5 transition-all hover:border-edge hover:bg-raised"
            >
              <div className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400 transition-colors group-hover:bg-emerald-700/20">
                <Icon className="size-4" />
              </div>
              <div>
                <p className="font-semibold text-ink">{title}</p>
                <p className="mt-1 text-sm leading-relaxed text-ink4">{desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.section>

      {/* ── Contact ──────────────────────────────── */}
      <motion.section
        variants={stagger}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: "-60px" }}
        className="space-y-5"
      >
        <motion.div variants={fadeUp}>
          <p className="text-xs font-semibold uppercase tracking-widest text-emerald-400/80">Get in touch</p>
          <h2 className="mt-1 font-display text-2xl font-bold text-ink">We're here to help</h2>
          <p className="mt-2 text-ink4">
            Have a question about an order, product, or your account? Drop us a message.
          </p>
        </motion.div>

        <motion.div
          variants={fadeUp}
          className="grid gap-4 rounded-2xl border border-stroke bg-card p-6 sm:grid-cols-2"
        >
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-widest text-ink4">Support email</p>
            <a
              href="mailto:support@northline.store"
              className="font-medium text-ink transition-colors hover:text-emerald-400"
            >
              support@northline.store
            </a>
          </div>
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-widest text-ink4">Business hours</p>
            <p className="font-medium text-ink">Mon–Fri, 9:00 AM – 6:00 PM</p>
            <p className="text-xs text-ink4">Response within 24 hours on business days</p>
          </div>
        </motion.div>
      </motion.section>
    </div>
  );
}
