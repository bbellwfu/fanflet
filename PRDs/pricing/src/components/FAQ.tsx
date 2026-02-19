import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDownIcon } from 'lucide-react';
interface FAQItem {
  question: string;
  answer: string;
}
const faqs: FAQItem[] = [
{
  question: 'What is Fanflet?',
  answer:
  'Fanflet helps speakers and KOLs create personalized landing pages for every talk. Share resources, collect feedback, and build your email list â€“ all from one branded link.'
},
{
  question: 'Is it really free during Early Access?',
  answer:
  'Yes! During Early Access, you get full access to all features at no cost. No credit card required. When we introduce paid plans, early users will be grandfathered into special pricing.'
},
{
  question: 'What happens when Early Access ends?',
  answer:
  "We'll introduce Pro and Enterprise tiers. Early Access users will receive exclusive pricing and plenty of notice before any changes. You'll never lose access to fanflets you've already created."
},
{
  question: 'Can I use Fanflet for multiple talks?',
  answer:
  'Absolutely. Create a unique fanflet for each talk, workshop, or presentation. Each one gets its own branded URL and analytics.'
},
{
  question: 'How do sponsors work?',
  answer:
  'On Enterprise plans, you can add sponsor logos, links, and visibility to your fanflets â€“ great for sponsored talks and conference partnerships.'
},
{
  question: 'Do I need technical skills?',
  answer:
  'Not at all. Fanflet is designed to be set up in minutes. Just add your content, customize your theme, and share your link.'
}];

function FAQAccordionItem({
  item,
  isOpen,
  onToggle,
  index





}: {item: FAQItem;isOpen: boolean;onToggle: () => void;index: number;}) {
  return (
    <motion.div
      initial={{
        opacity: 0,
        y: 16
      }}
      whileInView={{
        opacity: 1,
        y: 0
      }}
      viewport={{
        once: true,
        margin: '-30px'
      }}
      transition={{
        duration: 0.4,
        delay: index * 0.05
      }}
      className="border-b"
      style={{
        borderColor: 'var(--color-gray-200)'
      }}>

      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between py-5 sm:py-6 text-left group focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 rounded-sm"
        style={
        {
          '--tw-ring-color': 'var(--color-blue)'
        } as React.CSSProperties
        }
        aria-expanded={isOpen}>

        <span
          className="text-base sm:text-lg font-semibold pr-4 transition-colors duration-200"
          style={{
            color: isOpen ? 'var(--color-navy)' : 'var(--color-gray-600)'
          }}>

          {item.question}
        </span>
        <motion.span
          animate={{
            rotate: isOpen ? 180 : 0
          }}
          transition={{
            duration: 0.25,
            ease: 'easeInOut'
          }}
          className="flex-shrink-0">

          <ChevronDownIcon
            className="w-5 h-5"
            style={{
              color: isOpen ? 'var(--color-blue)' : 'var(--color-gray-400)'
            }} />

        </motion.span>
      </button>
      <AnimatePresence initial={false}>
        {isOpen &&
        <motion.div
          initial={{
            height: 0,
            opacity: 0
          }}
          animate={{
            height: 'auto',
            opacity: 1
          }}
          exit={{
            height: 0,
            opacity: 0
          }}
          transition={{
            duration: 0.3,
            ease: [0.4, 0, 0.2, 1]
          }}
          className="overflow-hidden">

            <p
            className="pb-6 text-base leading-relaxed max-w-3xl"
            style={{
              color: 'var(--color-gray-500)'
            }}>

              {
            'Fanflet helps speakers and KOLs create personalized landing pages for every talk. Share resources, collect feedback, and build your email list - all from one branded link.'
            }
            </p>
          </motion.div>
        }
      </AnimatePresence>
    </motion.div>);

}
export function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);
  return (
    <section className="w-full py-20 sm:py-24 px-4 sm:px-6 bg-white">
      <div className="max-w-3xl mx-auto">
        <motion.h2
          initial={{
            opacity: 0,
            y: 20
          }}
          whileInView={{
            opacity: 1,
            y: 0
          }}
          viewport={{
            once: true,
            margin: '-60px'
          }}
          transition={{
            duration: 0.5
          }}
          className="text-3xl sm:text-4xl font-bold text-center mb-12"
          style={{
            color: 'var(--color-navy)'
          }}>

          Frequently asked questions
        </motion.h2>

        <div
          className="border-t"
          style={{
            borderColor: 'var(--color-gray-200)'
          }}>

          {faqs.map((faq, index) =>
          <FAQAccordionItem
            key={index}
            item={faq}
            index={index}
            isOpen={openIndex === index}
            onToggle={() => setOpenIndex(openIndex === index ? null : index)} />

          )}
        </div>
      </div>
    </section>);

}