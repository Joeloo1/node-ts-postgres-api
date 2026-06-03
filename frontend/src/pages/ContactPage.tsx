import { useState, type FormEvent } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { usePageTitle } from "../hooks/usePageTitle";
import { MailIcon, MapPinIcon, PhoneIcon } from "../components/Icons";

const inputClass =
  "w-full rounded-xl border border-stroke bg-input px-4 py-3 text-sm text-ink placeholder:text-ink4 transition focus:border-emerald-500/60 focus:outline-none focus:ring-2 focus:ring-emerald-500/20";

const info = [
  { icon: MailIcon,   label: "Email",   value: "support@northline.store",   href: "mailto:support@northline.store" },
  { icon: PhoneIcon,  label: "Phone",   value: "+1 (800) 123-4567",          href: "tel:+18001234567" },
  { icon: MapPinIcon, label: "Address", value: "123 Commerce St, New York NY 10001", href: undefined },
];

export function ContactPage() {
  usePageTitle("Contact");
  const [name, setName]       = useState("");
  const [email, setEmail]     = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);
  const [sent, setSent]       = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setPending(true);
    await new Promise((r) => setTimeout(r, 900));
    setPending(false);
    setSent(true);
    toast.success("Message sent! We'll get back to you within 24 hours.");
    setName(""); setEmail(""); setSubject(""); setMessage("");
  }

  return (
    <div className="space-y-12">
      {/* Header */}
      <div>
        <p className="text-xs font-semibold text-ink4">Get in touch</p>
        <h1 className="mt-1 font-display text-3xl font-bold text-ink sm:text-4xl">Contact us</h1>
        <p className="mt-2 max-w-lg text-[15px] text-ink3">
          Have a question, feedback, or issue? We're here to help. Fill in the form and we'll respond within 24 hours.
        </p>
      </div>

      <div className="grid gap-10 lg:grid-cols-[1fr_340px]">
        {/* Form */}
        <motion.form
          onSubmit={onSubmit}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="space-y-5"
        >
          {sent && (
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/8 px-4 py-3">
              <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400">
                ✓ Message sent! We'll be in touch soon.
              </p>
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-ink3">Full name</label>
              <input required value={name} onChange={(e) => setName(e.target.value)} className={inputClass} placeholder="Jane Smith" autoComplete="name" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-ink3">Email address</label>
              <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} placeholder="you@example.com" autoComplete="email" />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-ink3">Subject</label>
            <input required value={subject} onChange={(e) => setSubject(e.target.value)} className={inputClass} placeholder="How can we help?" />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-ink3">Message</label>
            <textarea
              required
              rows={6}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className={`${inputClass} resize-none`}
              placeholder="Tell us what's on your mind…"
            />
          </div>

          <button
            type="submit"
            disabled={pending}
            className="rounded-xl bg-emerald-600 px-7 py-3 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 disabled:opacity-70"
          >
            {pending ? "Sending…" : "Send message"}
          </button>
        </motion.form>

        {/* Info sidebar */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="space-y-6"
        >
          <div className="rounded-xl border border-stroke bg-card p-6 space-y-5">
            <h2 className="font-display text-base font-semibold text-ink">Contact information</h2>
            {info.map(({ icon: Icon, label, value, href }) => (
              <div key={label} className="flex items-start gap-3">
                <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-raised text-ink3">
                  <Icon className="size-4" />
                </div>
                <div>
                  <p className="text-[11px] font-medium text-ink4 uppercase tracking-wide">{label}</p>
                  {href ? (
                    <a href={href} className="text-sm text-ink2 transition-colors hover:text-ink">{value}</a>
                  ) : (
                    <p className="text-sm text-ink2">{value}</p>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="rounded-xl border border-stroke bg-card p-6">
            <h2 className="font-display text-base font-semibold text-ink">Response time</h2>
            <p className="mt-2 text-sm text-ink3 leading-relaxed">
              We typically respond within <span className="font-semibold text-ink">24 hours</span> on business days.
              For urgent issues, please call us directly.
            </p>
            <div className="mt-4 space-y-2 text-sm text-ink3">
              <div className="flex justify-between">
                <span>Mon – Fri</span>
                <span className="font-medium text-ink">9am – 6pm EST</span>
              </div>
              <div className="flex justify-between">
                <span>Saturday</span>
                <span className="font-medium text-ink">10am – 4pm EST</span>
              </div>
              <div className="flex justify-between">
                <span>Sunday</span>
                <span className="text-ink4">Closed</span>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
