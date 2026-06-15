import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import { usePageTitle } from "../hooks/usePageTitle";
import { ChevronRightIcon } from "../components/Icons";

interface FAQItem {
  q: string;
  a: string | React.ReactNode;
}
interface FAQSection {
  title: string;
  icon: string;
  items: FAQItem[];
}

const SECTIONS: FAQSection[] = [
  {
    title: "Shipping & Delivery",
    icon: "M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12",
    items: [
      {
        q: "How long does delivery take?",
        a: "Orders placed before 3 pm on a business day are dispatched the same day. Standard delivery is 2–5 business days. You'll receive a tracking number by email once your parcel is on its way.",
      },
      {
        q: "Do you offer free shipping?",
        a: "Yes — free standard shipping on all orders over $50. Orders under $50 ship at a flat rate of $4.99.",
      },
      {
        q: "Can I change my delivery address after ordering?",
        a: "Address changes can only be made before an order is dispatched. Contact us immediately via the Contact page or reply to your order confirmation email and we'll do our best to update it.",
      },
      {
        q: "Do you ship internationally?",
        a: "We currently ship within the United States only. International shipping is on our roadmap — sign up for our newsletter to be the first to know.",
      },
    ],
  },
  {
    title: "Returns & Refunds",
    icon: "M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3",
    items: [
      {
        q: "What is your return policy?",
        a: "You can return any item within 30 days of delivery for a full refund, no questions asked. Items must be in their original condition and packaging. Simply contact us to initiate a return and we'll send a prepaid return label.",
      },
      {
        q: "How long does a refund take?",
        a: "Once we receive your return, refunds are processed within 2 business days. The funds then take 3–5 business days to appear on your original payment method, depending on your bank.",
      },
      {
        q: "What if my item arrived damaged or incorrect?",
        a: "We're sorry to hear that. Please contact us within 7 days of delivery with a photo of the issue and your order number. We'll arrange a replacement or full refund at no cost to you.",
      },
      {
        q: "Can I exchange an item?",
        a: "We don't process direct exchanges. The fastest way to get a different item is to return the original for a refund and place a new order.",
      },
    ],
  },
  {
    title: "Payment & Security",
    icon: "M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z",
    items: [
      {
        q: "What payment methods do you accept?",
        a: "We accept all major credit and debit cards (Visa, Mastercard, American Express), Apple Pay, and Google Pay. All payments are processed securely through Stripe.",
      },
      {
        q: "Is my payment information safe?",
        a: "Yes. All transactions are processed by Stripe, a PCI-DSS Level 1 certified payment provider. Your card details are never stored on our servers — Stripe handles all payment data with bank-grade 256-bit SSL encryption.",
      },
      {
        q: "Why was my payment declined?",
        a: "Payments can be declined for several reasons: insufficient funds, card limits, or your bank flagging an unfamiliar transaction. Try a different card or contact your bank. If the problem persists, reach out to us.",
      },
    ],
  },
  {
    title: "Account & Orders",
    icon: "M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z",
    items: [
      {
        q: "Do I need an account to order?",
        a: "Yes — an account is required to place orders. Creating one is free and takes under a minute. It lets you track orders, manage addresses, save items to your wishlist, and access your order history.",
      },
      {
        q: "How do I track my order?",
        a: "Once your order ships, you'll receive a confirmation email with a tracking number. You can also view live order status anytime from the Orders section in your account.",
      },
      {
        q: "How do I cancel an order?",
        a: "Orders can be cancelled before they are dispatched. Go to your order detail page and use the cancel option, or contact us immediately. Once an order has shipped, it can no longer be cancelled — but you can return it for a full refund.",
      },
      {
        q: "I forgot my password. What do I do?",
        a: (
          <>
            Use the{" "}
            <Link to="/forgot-password" className="font-medium text-emerald-600 underline underline-offset-2 hover:text-emerald-500 dark:text-emerald-400">
              Forgot password
            </Link>{" "}
            link on the sign-in page. We'll email you a secure link to reset your password within a few minutes. Check your spam folder if it doesn't arrive.
          </>
        ),
      },
    ],
  },
];

function AccordionItem({ item, isOpen, onToggle }: { item: FAQItem; isOpen: boolean; onToggle: () => void }) {
  return (
    <div className="border-b border-stroke last:border-0">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-4 py-4 text-left transition-colors hover:text-emerald-600 dark:hover:text-emerald-400"
        aria-expanded={isOpen}
      >
        <span className="text-[14px] font-medium text-ink leading-snug">{item.q}</span>
        <motion.span
          animate={{ rotate: isOpen ? 90 : 0 }}
          transition={{ duration: 0.2 }}
          className="shrink-0 text-ink4"
        >
          <ChevronRightIcon className="size-4" />
        </motion.span>
      </button>
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <p className="pb-5 pr-6 text-[13.5px] leading-[1.75] text-ink3">{item.a}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function FAQPage() {
  usePageTitle("FAQ");
  const [open, setOpen] = useState<string | null>(null);

  function toggle(key: string) {
    setOpen((prev) => (prev === key ? null : key));
  }

  return (
    <div className="mx-auto max-w-3xl space-y-16 py-4">

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="space-y-3"
      >
        <p className="text-[11px] font-semibold uppercase tracking-widest text-emerald-600 dark:text-emerald-400">Help centre</p>
        <h1 className="font-display text-2xl font-bold text-ink sm:text-3xl">Frequently asked<br />questions</h1>
        <p className="text-[15px] leading-relaxed text-ink3">
          Can't find what you're looking for?{" "}
          <Link to="/contact" className="font-medium text-emerald-600 underline underline-offset-2 hover:text-emerald-500 dark:text-emerald-400">
            Contact us
          </Link>{" "}
          and we'll get back to you within one business day.
        </p>
      </motion.div>

      {/* Sections */}
      {SECTIONS.map((section, si) => (
        <motion.div
          key={section.title}
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-40px" }}
          transition={{ duration: 0.4, delay: si * 0.05 }}
        >
          <div className="mb-6 flex items-center gap-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10">
              <svg className="size-4.5 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d={section.icon} />
              </svg>
            </div>
            <h2 className="font-display text-lg font-bold text-ink">{section.title}</h2>
          </div>
          <div className="rounded-2xl border border-stroke bg-card px-5">
            {section.items.map((item, ii) => (
              <AccordionItem
                key={ii}
                item={item}
                isOpen={open === `${si}-${ii}`}
                onToggle={() => toggle(`${si}-${ii}`)}
              />
            ))}
          </div>
        </motion.div>
      ))}

      {/* Bottom CTA */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.4 }}
        className="rounded-2xl border border-stroke bg-card px-8 py-10 text-center"
      >
        <p className="text-[11px] font-semibold uppercase tracking-widest text-ink4">Still need help?</p>
        <h3 className="mt-2 font-display text-xl font-bold text-ink">Talk to a real person</h3>
        <p className="mt-2 text-[13.5px] text-ink3">Our support team responds within one business day.</p>
        <Link
          to="/contact"
          className="mt-6 inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-500/20 transition-all hover:bg-emerald-500"
        >
          Get in touch
        </Link>
      </motion.div>

    </div>
  );
}
