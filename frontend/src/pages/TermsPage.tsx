import { Helmet } from "react-helmet-async";
import { usePageTitle } from "../hooks/usePageTitle";

const sections = [
  {
    title: "1. Acceptance of terms",
    body: `By accessing or using Northline, you agree to be bound by these Terms of Service and our Privacy Policy. If you do not agree to these terms, please do not use our service.`,
  },
  {
    title: "2. Account registration",
    body: `You must provide accurate, complete, and current information when creating an account. You are responsible for maintaining the confidentiality of your password and for all activities that occur under your account.`,
  },
  {
    title: "3. Orders and payments",
    body: `All orders are subject to acceptance and availability. We reserve the right to refuse or cancel any order at any time. Prices are subject to change without notice. Payment must be received prior to order shipment.`,
  },
  {
    title: "4. Shipping and delivery",
    body: `We offer free shipping on orders over $50. Delivery times are estimates and not guaranteed. Risk of loss and title for items pass to you upon delivery. We are not responsible for delays caused by third-party carriers.`,
  },
  {
    title: "5. Returns and refunds",
    body: `You may return most items within 30 days of delivery for a full refund. Items must be unused and in their original packaging. Certain items are non-returnable. Please contact support to initiate a return.`,
  },
  {
    title: "6. Intellectual property",
    body: `All content on this site, including text, graphics, logos, and images, is the property of Northline and protected by applicable intellectual property laws. You may not reproduce or distribute any content without prior written permission.`,
  },
  {
    title: "7. Limitation of liability",
    body: `To the fullest extent permitted by law, Northline shall not be liable for any indirect, incidental, special, or consequential damages arising from your use of our service or products.`,
  },
  {
    title: "8. Changes to terms",
    body: `We reserve the right to modify these terms at any time. Changes will be effective upon posting to the website. Your continued use of the service constitutes acceptance of the updated terms.`,
  },
  {
    title: "9. Contact",
    body: `If you have questions about these terms, please contact us at support@northline.store.`,
  },
];

export function TermsPage() {
  usePageTitle("Terms of Service");

  return (
    <>
      <Helmet>
        <title>Terms of Service — Northline</title>
        <meta name="description" content="Read Northline's Terms of Service governing your use of our website, products, and services." />
        <meta property="og:title" content="Terms of Service — Northline" />
        <meta property="og:description" content="Read Northline's Terms of Service governing your use of our website, products, and services." />
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="Northline" />
      </Helmet>
      <div className="mx-auto max-w-3xl space-y-10">
      <div>
        <p className="text-xs font-medium text-ink4">Legal</p>
        <h1 className="mt-1 font-display text-3xl font-bold text-ink sm:text-4xl">Terms of Service</h1>
        <p className="mt-3 text-sm text-ink4">Last updated: January 1, 2025</p>
      </div>

      <div className="rounded-xl border border-stroke bg-card p-6 sm:p-8">
        <p className="text-[15px] leading-relaxed text-ink3">
          Please read these Terms of Service ("Terms") carefully before using Northline. These Terms govern your use of our website, mobile applications, and services.
        </p>
      </div>

      <div className="space-y-8">
        {sections.map((s) => (
          <section key={s.title}>
            <h2 className="font-display text-lg font-semibold text-ink">{s.title}</h2>
            <p className="mt-2.5 text-[15px] leading-relaxed text-ink3">{s.body}</p>
          </section>
        ))}
      </div>
    </div>
    </>
  );
}
