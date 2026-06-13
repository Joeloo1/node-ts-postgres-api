import { motion } from "framer-motion";
import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { TruckIcon, PackageIcon, ShieldIcon } from "../components/Icons";

const SECTIONS = [
  {
    id: "shipping",
    icon: TruckIcon,
    title: "Shipping policy",
    color: "text-sky-500",
    bg: "bg-sky-500/10",
    items: [
      {
        q: "How long does shipping take?",
        a: "Standard shipping takes 3–7 business days within the US. Express shipping (1–2 business days) is available at checkout for an additional fee.",
      },
      {
        q: "How much does shipping cost?",
        a: "We offer free standard shipping on all orders over $50. Orders under $50 are charged a flat rate of $4.99. Express shipping is calculated at checkout based on your location and order weight.",
      },
      {
        q: "Do you ship internationally?",
        a: "We currently ship to the United States, Canada, and the United Kingdom. International orders may be subject to customs duties and import taxes, which are the responsibility of the recipient.",
      },
      {
        q: "How do I track my order?",
        a: "Once your order ships, you'll receive a confirmation email with a tracking number. You can also view your tracking information in your account under Orders.",
      },
      {
        q: "What if my package is lost or damaged?",
        a: "If your package is lost or arrives damaged, please contact us within 7 days of the expected delivery date. We'll open a carrier investigation and either reship the item or issue a full refund.",
      },
    ],
  },
  {
    id: "returns",
    icon: PackageIcon,
    title: "Returns policy",
    color: "text-emerald-500",
    bg: "bg-emerald-500/10",
    items: [
      {
        q: "What is your return window?",
        a: "You have 30 days from the date of delivery to initiate a return. Items must be unused, in their original packaging, and in the same condition you received them.",
      },
      {
        q: "How do I start a return?",
        a: "Log in to your account, go to Orders, and select the order you'd like to return. Click 'Request return' and follow the prompts. Once approved, we'll email you a prepaid return shipping label.",
      },
      {
        q: "Which items cannot be returned?",
        a: "The following items are non-returnable: perishable goods, digital downloads, gift cards, items marked as 'Final Sale', and hygiene products (e.g., personal care items) once opened.",
      },
      {
        q: "How long does a refund take?",
        a: "Once we receive and inspect your return (usually within 2–3 business days of receipt), we'll process your refund to the original payment method. Allow 5–10 business days for the refund to appear on your statement.",
      },
      {
        q: "Are return shipping costs covered?",
        a: "Returns due to a defect or our error are 100% covered — we'll email a prepaid label at no cost to you. For change-of-mind returns, a $4.99 return label fee is deducted from your refund.",
      },
    ],
  },
  {
    id: "exchanges",
    icon: ShieldIcon,
    title: "Exchanges",
    color: "text-violet-500",
    bg: "bg-violet-500/10",
    items: [
      {
        q: "Can I exchange an item?",
        a: "Yes. To exchange an item for a different size or colour, initiate a return request and select 'Exchange' as the reason. Note that exchanges are subject to stock availability.",
      },
      {
        q: "What if the item I want for an exchange is out of stock?",
        a: "If the exchange item is unavailable, we'll issue a full refund to your original payment method instead.",
      },
    ],
  },
];

export function ShippingReturnsPage() {
  return (
    <>
      <Helmet>
        <title>Shipping & Returns — Northline</title>
        <meta name="description" content="Free shipping over $50. 30-day hassle-free returns. Learn about Northline's shipping and returns policy." />
      </Helmet>

      <motion.div
        className="mx-auto max-w-3xl space-y-10"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        {/* Hero */}
        <div className="overflow-hidden rounded-2xl border border-stroke bg-card px-6 py-8 text-center sm:px-10 sm:py-12">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-emerald-600 dark:text-emerald-400">
            Shipping & Returns
          </p>
          <h1 className="mt-2 font-display text-3xl font-bold text-ink sm:text-4xl">
            We make it easy
          </h1>
          <p className="mx-auto mt-3 max-w-lg text-sm leading-relaxed text-ink3">
            Free shipping on orders over $50. 30-day hassle-free returns. If anything goes wrong, we'll make it right.
          </p>

          <div className="mx-auto mt-7 grid max-w-md grid-cols-3 divide-x divide-stroke overflow-hidden rounded-xl border border-stroke bg-raised">
            {[
              { value: "Free", label: "Over $50" },
              { value: "30 days", label: "Easy returns" },
              { value: "3–7", label: "Days delivery" },
            ].map(({ value, label }) => (
              <div key={label} className="py-4 text-center">
                <p className="text-base font-bold text-ink">{value}</p>
                <p className="mt-0.5 text-[11px] text-ink4">{label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Sections */}
        {SECTIONS.map(({ id, icon: Icon, title, color, bg, items }) => (
          <section key={id} className="space-y-4">
            <div className="flex items-center gap-3">
              <div className={`flex size-9 items-center justify-center rounded-xl ${bg}`}>
                <Icon className={`size-4.5 ${color}`} />
              </div>
              <h2 className="font-display text-xl font-bold text-ink">{title}</h2>
            </div>

            <div className="space-y-2">
              {items.map(({ q, a }) => (
                <div key={q} className="rounded-xl border border-stroke bg-card px-5 py-4">
                  <p className="text-sm font-semibold text-ink">{q}</p>
                  <p className="mt-1.5 text-sm leading-relaxed text-ink3">{a}</p>
                </div>
              ))}
            </div>
          </section>
        ))}

        {/* CTA */}
        <div className="rounded-2xl border border-stroke bg-card px-6 py-8 text-center">
          <p className="text-sm font-medium text-ink">Still have questions?</p>
          <p className="mt-1 text-sm text-ink4">Our support team is happy to help.</p>
          <Link
            to="/contact"
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-700"
          >
            Contact us
          </Link>
        </div>
      </motion.div>
    </>
  );
}
