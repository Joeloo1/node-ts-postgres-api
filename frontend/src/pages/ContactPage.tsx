import { useState, type FormEvent } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { usePageTitle } from "../hooks/usePageTitle";
import { MailIcon } from "../components/Icons";
import { ApiError, apiFetch } from "../lib/api";

const inputClass =
  "w-full rounded-xl border border-stroke bg-input px-4 py-3 text-sm text-ink placeholder:text-ink4 transition focus:border-emerald-500/60 focus:outline-none focus:ring-2 focus:ring-emerald-500/20";

const info = [
  { icon: MailIcon, label: "Email", value: "support@northline.store", href: "mailto:support@northline.store" },
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
    try {
      await apiFetch("/api/v1/contact", {
        method: "POST",
        body: JSON.stringify({ name, email, subject, message }),
      });
      setSent(true);
      toast.success("Message sent! We'll get back to you within 24 hours.");
      setName(""); setEmail(""); setSubject(""); setMessage("");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to send message. Please try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-10">
      {/* Header */}
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-widest text-emerald-600 dark:text-emerald-400">Get in touch</p>
        <h1 className="mt-1.5 font-display text-3xl font-bold text-ink sm:text-4xl">Contact us</h1>
        <p className="mt-2.5 max-w-lg text-[15px] leading-relaxed text-ink3">
          Have a question, feedback, or issue? We're here to help. Fill in the form and we'll respond within 24 hours.
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-[1fr_300px]">
        {/* Form card */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="overflow-hidden rounded-2xl border border-stroke bg-card"
        >
          <div className="border-b border-stroke px-6 py-4">
            <h2 className="text-sm font-semibold text-ink">Send us a message</h2>
            <p className="mt-0.5 text-xs text-ink4">We reply within 24 hours on business days.</p>
          </div>

          <form onSubmit={onSubmit} className="space-y-5 px-6 py-6">
            {sent && (
              <motion.div
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex items-center gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/8 px-4 py-3"
              >
                <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-500">
                  <svg className="size-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                </div>
                <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400">
                  Message sent! We'll be in touch soon.
                </p>
              </motion.div>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold uppercase tracking-widest text-ink4">Full name</label>
                <input required value={name} onChange={(e) => setName(e.target.value)} className={inputClass} placeholder="Jane Smith" autoComplete="name" />
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold uppercase tracking-widest text-ink4">Email address</label>
                <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} placeholder="you@example.com" autoComplete="email" />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold uppercase tracking-widest text-ink4">Subject</label>
              <input required value={subject} onChange={(e) => setSubject(e.target.value)} className={inputClass} placeholder="How can we help?" />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-semibold uppercase tracking-widest text-ink4">Message</label>
                <span className="text-[11px] tabular-nums text-ink4">{message.length}/1000</span>
              </div>
              <textarea
                required
                rows={6}
                maxLength={1000}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className={`${inputClass} resize-none`}
                placeholder="Tell us what's on your mind…"
              />
            </div>

            <div className="flex flex-col-reverse items-start gap-3 border-t border-stroke pt-5 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-ink4">
                By submitting, you agree to our{" "}
                <a href="/privacy" className="underline underline-offset-2 hover:text-ink3">Privacy Policy</a>.
              </p>
              <button
                type="submit"
                disabled={pending}
                className="relative inline-flex shrink-0 items-center gap-2 overflow-hidden rounded-xl bg-emerald-600 px-6 py-2.5 text-sm font-semibold text-white shadow-md shadow-emerald-500/20 transition-all hover:bg-emerald-500 hover:shadow-emerald-500/30 active:scale-[0.98] disabled:opacity-70"
              >
                {!pending && (
                  <span className="absolute inset-0 -translate-x-full animate-[sweep_5s_ease-in-out_2s_infinite] bg-gradient-to-r from-transparent via-white/[0.12] to-transparent" />
                )}
                {pending && (
                  <svg className="size-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                  </svg>
                )}
                {pending ? "Sending…" : "Send message"}
              </button>
            </div>
          </form>
        </motion.div>

        {/* Info sidebar */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="sticky top-24 h-fit space-y-4"
        >
          <div className="overflow-hidden rounded-2xl border border-stroke bg-card">
            <div className="border-b border-stroke px-5 py-4">
              <h2 className="text-sm font-semibold text-ink">Contact information</h2>
            </div>
            <div className="space-y-4 px-5 py-4">
              {info.map(({ icon: Icon, label, value, href }) => (
                <div key={label} className="flex items-start gap-3">
                  <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                    <Icon className="size-6" />
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-ink4">{label}</p>
                    {href ? (
                      <a href={href} className="mt-0.5 block text-sm font-medium text-ink2 transition-colors hover:text-emerald-600 dark:hover:text-emerald-400">
                        {value}
                      </a>
                    ) : (
                      <p className="mt-0.5 text-sm font-medium text-ink2">{value}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl border border-stroke bg-card">
            <div className="border-b border-stroke px-5 py-4">
              <h2 className="text-sm font-semibold text-ink">Business hours</h2>
              <p className="mt-0.5 text-xs text-ink4">Eastern Time (EST)</p>
            </div>
            <div className="space-y-2.5 px-5 py-4">
              {[
                { day: "Mon – Fri",  hours: "9am – 6pm",  open: true },
                { day: "Saturday",   hours: "10am – 4pm", open: true },
                { day: "Sunday",     hours: "Closed",     open: false },
              ].map(({ day, hours, open }) => (
                <div key={day} className="flex items-center justify-between text-sm">
                  <span className="text-ink3">{day}</span>
                  <span className={`font-medium ${open ? "text-ink" : "text-ink4"}`}>{hours}</span>
                </div>
              ))}
              <div className="mt-3 rounded-lg border border-emerald-500/20 bg-emerald-500/8 px-3 py-2.5">
                <p className="text-[12px] text-emerald-700 dark:text-emerald-400">
                  Typically responds within <strong>24 hours</strong>
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
