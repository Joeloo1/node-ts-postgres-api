import { usePageTitle } from "../hooks/usePageTitle";

const sections = [
  {
    title: "1. Information we collect",
    body: `We collect information you provide directly, such as your name, email address, shipping address, and payment information when you create an account or place an order. We also collect usage data such as pages visited, search queries, and device information.`,
  },
  {
    title: "2. How we use your information",
    body: `We use your information to process orders, send transactional emails, provide customer support, improve our services, personalise your experience, and comply with legal obligations. We do not sell your personal data to third parties.`,
  },
  {
    title: "3. Cookies",
    body: `We use cookies and similar technologies to remember your preferences, analyse site traffic, and provide a personalised experience. You can control cookie settings through your browser. Disabling cookies may affect some site functionality.`,
  },
  {
    title: "4. Data sharing",
    body: `We may share your data with trusted service providers who assist in operating our website (e.g., payment processors, shipping carriers, email services). These parties are contractually obligated to protect your data and use it only for the specified purpose.`,
  },
  {
    title: "5. Data security",
    body: `We implement industry-standard security measures including SSL encryption, secure password hashing, and access controls to protect your data. However, no method of transmission over the internet is 100% secure.`,
  },
  {
    title: "6. Data retention",
    body: `We retain your data for as long as your account is active or as needed to provide services and comply with legal obligations. You may request deletion of your account and associated data at any time.`,
  },
  {
    title: "7. Your rights",
    body: `Depending on your location, you may have rights to access, correct, delete, or port your personal data. You may also have the right to object to or restrict processing. To exercise these rights, contact us at support@northline.store.`,
  },
  {
    title: "8. Children's privacy",
    body: `Our service is not directed to children under 13. We do not knowingly collect personal information from children. If you believe a child has provided us with personal data, please contact us immediately.`,
  },
  {
    title: "9. Changes to this policy",
    body: `We may update this Privacy Policy periodically. We will notify you of significant changes by email or a prominent notice on our website. Continued use of the service after changes constitutes acceptance.`,
  },
];

export function PrivacyPage() {
  usePageTitle("Privacy Policy");

  return (
    <div className="mx-auto max-w-3xl space-y-10">
      <div>
        <p className="text-xs font-medium text-ink4">Legal</p>
        <h1 className="mt-1 font-display text-3xl font-bold text-ink sm:text-4xl">Privacy Policy</h1>
        <p className="mt-3 text-sm text-ink4">Last updated: January 1, 2025</p>
      </div>

      <div className="rounded-xl border border-stroke bg-card p-6 sm:p-8">
        <p className="text-[15px] leading-relaxed text-ink3">
          Your privacy matters to us. This Privacy Policy explains how Northline collects, uses, and protects your personal information when you use our website and services.
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
  );
}
