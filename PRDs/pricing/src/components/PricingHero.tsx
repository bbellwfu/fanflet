import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRightIcon } from 'lucide-react';
export function PricingHero() {
  return (
    <section
      className="relative w-full overflow-hidden"
      style={{
        background:
        'linear-gradient(180deg, #EFF6FF 0%, #F8FAFC 40%, #FFFFFF 100%)'
      }}>

      {/* Subtle decorative shapes */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div
          className="absolute -top-24 -right-24 w-96 h-96 rounded-full opacity-[0.07]"
          style={{
            background: 'var(--color-blue)'
          }} />

        <div
          className="absolute -bottom-32 -left-32 w-[500px] h-[500px] rounded-full opacity-[0.04]"
          style={{
            background: 'var(--color-navy)'
          }} />

      </div>

      <div className="relative max-w-4xl mx-auto px-4 sm:px-6 py-24 sm:py-32 lg:py-40 text-center">
        {/* Early Access Badge */}
        <motion.div
          initial={{
            opacity: 0,
            y: 16
          }}
          animate={{
            opacity: 1,
            y: 0
          }}
          transition={{
            duration: 0.5
          }}
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border mb-8"
          style={{
            borderColor: 'var(--color-gray-200)',
            background: 'white'
          }}>

          <span
            className="w-2 h-2 rounded-full animate-pulse-dot"
            style={{
              background: 'var(--color-emerald)'
            }} />

          <span
            className="text-sm font-medium"
            style={{
              color: 'var(--color-navy)'
            }}>

            Early Access
          </span>
        </motion.div>

        {/* Headline */}
        <motion.h1
          initial={{
            opacity: 0,
            y: 20
          }}
          animate={{
            opacity: 1,
            y: 0
          }}
          transition={{
            duration: 0.6,
            delay: 0.1
          }}
          className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight mb-6"
          style={{
            color: 'var(--color-navy)'
          }}>

          Free during Early Access
        </motion.h1>

        {/* Subheading */}
        <motion.p
          initial={{
            opacity: 0,
            y: 20
          }}
          animate={{
            opacity: 1,
            y: 0
          }}
          transition={{
            duration: 0.6,
            delay: 0.2
          }}
          className="text-lg sm:text-xl max-w-2xl mx-auto mb-10 leading-relaxed"
          style={{
            color: 'var(--color-gray-600)'
          }}>

          Full access for speakers who want to extend the impact of every talk.
          <br className="hidden sm:block" />
          No credit card required.
        </motion.p>

        {/* CTA */}
        <motion.div
          initial={{
            opacity: 0,
            y: 20
          }}
          animate={{
            opacity: 1,
            y: 0
          }}
          transition={{
            duration: 0.6,
            delay: 0.3
          }}
          className="flex flex-col items-center gap-3">

          <a
            href="#"
            className="inline-flex items-center gap-2 px-8 py-3.5 rounded-lg text-white font-semibold text-base transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg active:translate-y-0"
            style={{
              background: 'var(--color-navy)',
              boxShadow: '0 4px 14px rgba(27, 42, 74, 0.25)'
            }}>

            Get Started Free
            <ArrowRightIcon className="w-4 h-4" />
          </a>
          <span
            className="text-sm"
            style={{
              color: 'var(--color-gray-400)'
            }}>

            No credit card required
          </span>
        </motion.div>
      </div>
    </section>);

}