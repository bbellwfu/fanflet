import type { Metadata } from "next";
import { ContactForm } from "./contact-form";

export const metadata: Metadata = {
  title: "Contact Us — Fanflet",
  description:
    "Get in touch with the Fanflet team. Whether you're a speaker, sponsor, or have general questions, we'd love to hear from you.",
  openGraph: {
    title: "Contact Us — Fanflet",
    description:
      "Get in touch with the Fanflet team. Whether you're a speaker, sponsor, or have general questions, we'd love to hear from you.",
  },
};

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-white py-16 sm:py-24">
      <div className="max-w-xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-900 mb-4">
            Get in Touch
          </h1>
          <p className="text-lg text-slate-600">
            Whether you&apos;re a speaker exploring Fanflet, a sponsor interested in
            partnership, or just curious — we&apos;d love to hear from you.
          </p>
        </div>

        <ContactForm />

        <p className="mt-8 text-center text-sm text-slate-500">
          You can also reach us directly at{" "}
          <a
            href="mailto:support@fanflet.com"
            className="text-primary hover:underline"
          >
            support@fanflet.com
          </a>
        </p>
      </div>
    </div>
  );
}
