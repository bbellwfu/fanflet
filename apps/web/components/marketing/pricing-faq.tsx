"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

// PRD reference copy (PRDs/pricing/src/components/FAQ.tsx)
const FAQ_ITEMS = [
  {
    question: "What is Fanflet?",
    answer:
      "Fanflet helps speakers and KOLs create personalized landing pages for every talk. Share resources, collect feedback, and build your email list — all from one branded link.",
  },
  {
    question: "Is it really free during Early Access?",
    answer:
      "Yes! During Early Access, you get Pro features at no cost — unlimited fanflets, analytics, surveys, and more. No credit card required. When we introduce paid plans, early users will be grandfathered into special pricing.",
  },
  {
    question: "What happens when Early Access ends?",
    answer:
      "We'll introduce Pro and Enterprise tiers. Early Access users will receive exclusive pricing and plenty of notice before any changes. You'll never lose access to fanflets you've already created.",
  },
  {
    question: "Can I use Fanflet for multiple talks?",
    answer:
      "Absolutely. Create a unique fanflet for each talk, workshop, or presentation. Each one gets its own branded URL and analytics.",
  },
  {
    question: "How do sponsors work?",
    answer:
      "On Enterprise plans, you can add sponsor logos, links, and visibility to your fanflets — great for sponsored talks and conference partnerships.",
  },
  {
    question: "Do I need technical skills?",
    answer:
      "Not at all. Fanflet is designed to be set up in minutes. Just add your content, customize your theme, and share your link.",
  },
];

const NAVY = "#1B2A4A";
const BLUE = "#3B82F6";
const GRAY_200 = "#E2E8F0";
const GRAY_500 = "#64748B";
const GRAY_600 = "#475569";

export function PricingFAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section className="w-full py-20 sm:py-24 px-4 sm:px-6 bg-white">
      <div className="max-w-3xl mx-auto">
        <h2
          className="text-3xl sm:text-4xl font-bold text-center mb-12"
          style={{ color: NAVY }}
        >
          Frequently asked questions
        </h2>
        <div className="border-t" style={{ borderColor: GRAY_200 }}>
          {FAQ_ITEMS.map((item, index) => {
            const isOpen = openIndex === index;
            return (
              <div
                key={index}
                className="border-b"
                style={{ borderColor: GRAY_200 }}
              >
                <button
                  type="button"
                  onClick={() => setOpenIndex(isOpen ? null : index)}
                  className="w-full flex items-center justify-between py-5 sm:py-6 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 rounded-sm"
                  style={{ "--tw-ring-color": BLUE } as React.CSSProperties}
                  aria-expanded={isOpen}
                >
                  <span
                    className="text-base sm:text-lg font-semibold pr-4 transition-colors"
                    style={{ color: isOpen ? NAVY : GRAY_600 }}
                  >
                    {item.question}
                  </span>
                  <ChevronDown
                    className="w-5 h-5 flex-shrink-0 transition-transform duration-200"
                    style={{ color: isOpen ? BLUE : GRAY_500 }}
                    aria-hidden
                  />
                </button>
                <div
                  className={`overflow-hidden transition-all duration-300 ease-out ${
                    isOpen ? "max-h-[500px] opacity-100" : "max-h-0 opacity-0"
                  }`}
                >
                  <p
                    className="pb-6 text-base leading-relaxed max-w-3xl"
                    style={{ color: GRAY_500 }}
                  >
                    {item.answer}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
