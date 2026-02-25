import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRightIcon } from 'lucide-react';
export function BottomCTA() {
  return (
    <section
      className="w-full py-20 sm:py-28 px-4 sm:px-6 relative overflow-hidden"
      style={{
        background: 'var(--color-navy)'
      }}>

      {/* Decorative elements */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div
          className="absolute top-0 right-0 w-[600px] h-[600px] rounded-full opacity-[0.06]"
          style={{
            background:
            'radial-gradient(circle, var(--color-blue) 0%, transparent 70%)',
            transform: 'translate(30%, -40%)'
          }} />

        <div
          className="absolute bottom-0 left-0 w-[400px] h-[400px] rounded-full opacity-[0.04]"
          style={{
            background:
            'radial-gradient(circle, var(--color-blue) 0%, transparent 70%)',
            transform: 'translate(-30%, 40%)'
          }} />

      </div>

      <div className="relative max-w-3xl mx-auto text-center">
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
          className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-5">

          Start engaging your audience today
        </motion.h2>

        <motion.p
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
            duration: 0.5,
            delay: 0.1
          }}
          className="text-lg sm:text-xl mb-10 leading-relaxed"
          style={{
            color: 'rgba(255, 255, 255, 0.7)'
          }}>

          Join speakers who are extending the impact of every talk.
        </motion.p>

        <motion.div
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
            duration: 0.5,
            delay: 0.2
          }}
          className="flex flex-col items-center gap-4">

          <a
            href="#"
            className="inline-flex items-center gap-2 px-8 py-3.5 rounded-lg font-semibold text-base transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl active:translate-y-0"
            style={{
              background: 'white',
              color: 'var(--color-navy)',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)'
            }}>

            Get Started Free
            <ArrowRightIcon className="w-4 h-4" />
          </a>
          <span
            className="text-sm"
            style={{
              color: 'rgba(255, 255, 255, 0.45)'
            }}>

            Free during Early Access · No credit card required
          </span>
        </motion.div>
      </div>
    </section>);

}