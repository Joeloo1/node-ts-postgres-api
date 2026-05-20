import { Link } from "react-router-dom";
import { usePageTitle } from "../hooks/usePageTitle";

export function AboutPage() {
  usePageTitle("About");
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold text-white">About Northline</h1>
        <p className="mt-2 text-zinc-400">
          Northline is a modern online store focused on quality essentials for
          everyday life. We blend clean design, trusted products, and a smooth
          shopping experience from discovery to checkout.
        </p>
      </div>

      <section className="rounded-2xl border border-zinc-800 bg-zinc-900/30 p-6">
        <h2 className="text-lg font-semibold text-white">Our story</h2>
        <p className="mt-3 text-zinc-300">
          Northline started with a simple idea: online shopping should feel
          clear, fast, and trustworthy. Instead of endless clutter, we curate a
          practical catalog across electronics, home, fashion, and daily
          essentials, so customers can find what they need without friction.
        </p>
      </section>

      <section className="rounded-2xl border border-zinc-800 bg-zinc-900/30 p-6">
        <h2 className="text-lg font-semibold text-white">What we care about</h2>
        <ul className="mt-3 list-disc space-y-2 pl-6 text-zinc-300">
          <li>Curated products with honest pricing and clear details</li>
          <li>Fast browsing with rich galleries and simple navigation</li>
          <li>Secure accounts, orders, and checkout experience</li>
          <li>Reliable support and transparent order updates</li>
        </ul>
      </section>

      <section className="rounded-2xl border border-zinc-800 bg-zinc-900/30 p-6">
        <h2 className="text-lg font-semibold text-white">Shop with confidence</h2>
        <p className="mt-2 text-zinc-400">
          Whether you are buying your first item or managing repeat orders,
          Northline is built to make every step simple and dependable.
        </p>
        <div className="mt-4 flex gap-3">
          <Link
            to="/products"
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500"
          >
            Browse products
          </Link>
          <Link
            to="/login"
            className="rounded-lg border border-zinc-700 px-4 py-2 text-sm font-semibold text-zinc-200 hover:bg-zinc-900"
          >
            Sign in
          </Link>
        </div>
      </section>

      <section className="rounded-2xl border border-zinc-800 bg-zinc-900/30 p-6">
        <h2 className="text-lg font-semibold text-white">Contact & support</h2>
        <p className="mt-2 text-zinc-400">
          Need help with an order, product question, or account issue? Our team
          is here to help.
        </p>
        <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-zinc-500">Support email</dt>
            <dd className="text-zinc-200">support@northline.store</dd>
          </div>
          <div>
            <dt className="text-zinc-500">Business hours</dt>
            <dd className="text-zinc-200">Mon–Fri, 9:00 AM – 6:00 PM</dd>
          </div>
        </dl>
        <p className="mt-3 text-xs text-zinc-500">
          Typical response time: within 24 hours on business days.
        </p>
      </section>
    </div>
  );
}

