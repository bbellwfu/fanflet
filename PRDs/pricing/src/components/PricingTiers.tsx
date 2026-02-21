import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckIcon, ArrowRightIcon } from 'lucide-react';
type BillingPeriod = 'monthly' | 'annual';
interface TierFeature {
  text: string;
  included: boolean;
}
interface PricingTierProps {
  name: string;
  badge?: string;
  badgeColor?: string;
  price: string;
  originalPrice?: string;
  priceSuffix?: string;
  priceNote?: string;
  description: string;
  features: TierFeature[];
  ctaText: string;
  ctaStyle: 'primary' | 'secondary' | 'outline';
  highlighted?: boolean;
  delay: number;
  accentColor: string;
  accentColorLight: string;
  checkColor: string;
  topBorderColor?: string;
}
function PricingCard({
  name,
  badge,
  badgeColor,
  price,
  originalPrice,
  priceSuffix,
  priceNote,
  description,
  features,
  ctaText,
  ctaStyle,
  highlighted,
  delay,
  accentColor,
  accentColorLight,
  checkColor,
  topBorderColor
}: PricingTierProps) {
  const ctaStyles: Record<
    string,
    {
      className: string;
      style: React.CSSProperties;
    }> =
  {
    primary: {
      className: 'text-white hover:-translate-y-0.5 hover:shadow-lg',
      style: {
        background: 'var(--color-blue)',
        boxShadow: '0 4px 14px rgba(59, 130, 246, 0.3)'
      }
    },
    secondary: {
      className: 'text-white hover:-translate-y-0.5 hover:shadow-lg',
      style: {
        background: 'var(--color-navy)',
        boxShadow: `0 4px 14px rgba(124, 58, 237, 0.15), 0 2px 8px rgba(27, 42, 74, 0.2)`
      }
    },
    outline: {
      className: 'border-2 hover:-translate-y-0.5',
      style: {
        borderColor: accentColor,
        color: accentColor,
        background: 'white'
      }
    }
  };
  return (
    <motion.div
      initial={{
        opacity: 0,
        y: 30
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
        delay
      }}
      className={`relative flex flex-col rounded-2xl ${highlighted ? 'p-1' : ''} ${highlighted ? 'md:-mt-4 md:mb-4' : ''}`}
      style={
      highlighted ?
      {
        background:
        'linear-gradient(135deg, var(--color-blue), var(--color-navy))',
        boxShadow:
        '0 8px 40px rgba(59, 130, 246, 0.2), 0 0 0 1px rgba(59, 130, 246, 0.1)'
      } :
      {}
      }>

      <div
        className={`flex flex-col flex-1 rounded-xl p-6 sm:p-8 ${highlighted ? 'bg-white' : ''}`}
        style={{
          ...(!highlighted ?
          {
            background: 'white',
            border: '1px solid var(--color-gray-200)',
            borderTop: `3px solid ${topBorderColor || accentColor}`
          } :
          {})
        }}>

        {/* Badge */}
        <div className="mb-4 h-7 flex items-center">
          {badge &&
          <span
            className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold"
            style={{
              background: accentColorLight,
              color: accentColor
            }}>

              {badge}
            </span>
          }
        </div>

        {/* Tier Name */}
        <h3
          className="text-xl font-bold mb-2"
          style={{
            color: 'var(--color-navy)'
          }}>

          {name}
        </h3>

        {/* Price */}
        <div className="flex items-baseline gap-1.5 mb-1">
          <AnimatePresence mode="wait">
            <motion.span
              key={price}
              initial={{
                opacity: 0,
                scale: 0.9,
                y: 4
              }}
              animate={{
                opacity: 1,
                scale: 1,
                y: 0
              }}
              exit={{
                opacity: 0,
                scale: 0.9,
                y: -4
              }}
              transition={{
                duration: 0.25,
                ease: 'easeOut'
              }}
              className="text-5xl font-extrabold tracking-tight"
              style={{
                color: 'var(--color-gray-900)'
              }}>

              {price}
            </motion.span>
          </AnimatePresence>
          {priceSuffix &&
          <span
            className="text-base font-medium"
            style={{
              color: 'var(--color-gray-400)'
            }}>

              {priceSuffix}
            </span>
          }
          {originalPrice &&
          <span
            className="text-lg font-medium line-through ml-1"
            style={{
              color: 'var(--color-gray-400)'
            }}>

              {originalPrice}
            </span>
          }
        </div>

        {/* Price Note */}
        <div className="h-5 mb-6">
          <AnimatePresence mode="wait">
            {priceNote &&
            <motion.p
              key={priceNote}
              initial={{
                opacity: 0
              }}
              animate={{
                opacity: 1
              }}
              exit={{
                opacity: 0
              }}
              transition={{
                duration: 0.2
              }}
              className="text-xs font-medium"
              style={{
                color: accentColor
              }}>

                {priceNote}
              </motion.p>
            }
          </AnimatePresence>
        </div>

        {/* Description */}
        <p
          className="text-sm mb-8"
          style={{
            color: 'var(--color-gray-500)'
          }}>

          {description}
        </p>

        {/* Features */}
        <ul className="space-y-3 mb-8 flex-1" role="list">
          {features.map((feature, i) =>
          <li key={i} className="flex items-start gap-3">
              <CheckIcon
              className="w-4.5 h-4.5 mt-0.5 flex-shrink-0"
              style={{
                color: feature.included ?
                checkColor :
                'var(--color-gray-200)'
              }}
              aria-hidden="true" />

              <span
              className="text-sm leading-snug"
              style={{
                color: feature.included ?
                'var(--color-gray-600)' :
                'var(--color-gray-400)'
              }}>

                {feature.text}
              </span>
            </li>
          )}
        </ul>

        {/* CTA */}
        <a
          href="#"
          className={`inline-flex items-center justify-center gap-2 w-full px-6 py-3 rounded-lg font-semibold text-sm transition-all duration-200 active:translate-y-0 ${ctaStyles[ctaStyle].className}`}
          style={ctaStyles[ctaStyle].style}>

          {ctaText.includes('\n') ?
          <span className="flex flex-col items-center leading-tight">
              {ctaText.split('\n').map((line, i) =>
            <span
              key={i}
              className={
              i === 0 ?
              'text-xs font-bold opacity-80' :
              'text-sm font-semibold'
              }>

                  {line}
                </span>
            )}
            </span> :

          <>
              {ctaText}
              {ctaStyle === 'primary' && <ArrowRightIcon className="w-4 h-4" />}
            </>
          }
        </a>
      </div>
    </motion.div>);

}
function BillingToggle({
  billingPeriod,
  onChange



}: {billingPeriod: BillingPeriod;onChange: (period: BillingPeriod) => void;}) {
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
        once: true
      }}
      transition={{
        duration: 0.4
      }}
      className="flex justify-center mb-12">

      <div
        className="relative inline-flex items-center rounded-full p-1"
        style={{
          background: 'var(--color-gray-100)',
          border: '1px solid var(--color-gray-200)'
        }}>

        {/* Sliding indicator */}
        <motion.div
          className="absolute top-1 bottom-1 rounded-full"
          style={{
            background: 'white',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1), 0 1px 2px rgba(0,0,0,0.06)'
          }}
          animate={{
            left: billingPeriod === 'monthly' ? 4 : '50%',
            right: billingPeriod === 'annual' ? 4 : '50%'
          }}
          transition={{
            type: 'spring',
            stiffness: 400,
            damping: 30
          }}
          layout />


        <button
          onClick={() => onChange('monthly')}
          className="relative z-10 px-5 py-2 text-sm font-semibold rounded-full transition-colors duration-200 flex items-center justify-center"
          style={{
            color:
            billingPeriod === 'monthly' ?
            'var(--color-navy)' :
            'var(--color-gray-400)'
          }}>

          Monthly
        </button>
        <button
          onClick={() => onChange('annual')}
          className="relative z-10 px-5 py-2 text-sm font-semibold rounded-full transition-colors duration-200 flex items-center justify-center gap-2"
          style={{
            color:
            billingPeriod === 'annual' ?
            'var(--color-navy)' :
            'var(--color-gray-400)'
          }}>

          Annual
          <span
            className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider"
            style={{
              background:
              billingPeriod === 'annual' ?
              'var(--color-emerald-light)' :
              'var(--color-gray-200)',
              color:
              billingPeriod === 'annual' ?
              'var(--color-emerald)' :
              'var(--color-gray-400)',
              transition: 'background 0.2s, color 0.2s'
            }}>

            Save 12%
          </span>
        </button>
      </div>
    </motion.div>);

}
export function PricingTiers() {
  const [billingPeriod, setBillingPeriod] = useState<BillingPeriod>('monthly');
  const proPrice = billingPeriod === 'monthly' ? '$12' : '$10.50';
  const proOriginalPrice = billingPeriod === 'annual' ? '$12' : undefined;
  const proPriceNote =
  billingPeriod === 'annual' ? 'Billed annually at $126/year' : undefined;
  return (
    <section className="w-full py-20 sm:py-24 px-4 sm:px-6 bg-white">
      <div className="max-w-6xl mx-auto">
        <BillingToggle
          billingPeriod={billingPeriod}
          onChange={setBillingPeriod} />


        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-5 items-start">
          {/* Free Tier */}
          <PricingCard
            name="Free"
            badge="Current Plan"
            price="$0"
            priceSuffix="/month"
            description="Everything you need to get started"
            features={[
            {
              text: 'Up to 5 fanflets',
              included: true
            },
            {
              text: '14-day expiration on active fanflets',
              included: true
            },
            {
              text: 'Personalized branded URLs',
              included: true
            },
            {
              text: 'Profile and bio with photo',
              included: true
            },
            {
              text: 'Custom resources and links',
              included: true
            },
            {
              text: '1 theme color',
              included: true
            },
            {
              text: 'Basic engagement stats',
              included: true
            }]
            }
            ctaText="Get Started Free"
            ctaStyle="outline"
            accentColor="var(--color-emerald)"
            accentColorLight="var(--color-emerald-light)"
            checkColor="var(--color-emerald)"
            topBorderColor="var(--color-emerald)"
            delay={0} />


          {/* Pro Tier — Highlighted */}
          <PricingCard
            name="Pro"
            badge="Coming Soon"
            badgeColor="blue"
            price={proPrice}
            originalPrice={proOriginalPrice}
            priceSuffix="/mo"
            priceNote={proPriceNote}
            description="For speakers who want deeper engagement"
            features={[
            {
              text: 'Unlimited fanflets',
              included: true
            },
            {
              text: 'Everything in Free',
              included: true
            },
            {
              text: 'Multiple theme colors for your brand',
              included: true
            },
            {
              text: 'Surveys and session feedback',
              included: true
            },
            {
              text: 'Full engagement & click-through analytics',
              included: true
            },
            {
              text: 'Opt-in email list building',
              included: true
            },
            {
              text: 'Custom expiration dates (30, 60, 90 days)',
              included: true
            },
            {
              text: 'Priority support',
              included: true
            }]
            }
            ctaText="Join Waitlist"
            ctaStyle="primary"
            highlighted
            accentColor="var(--color-blue)"
            accentColorLight="var(--color-blue-light)"
            checkColor="var(--color-blue)"
            delay={0.1} />


          {/* Enterprise Tier */}
          <PricingCard
            name="Enterprise"
            badge="Custom Pricing"
            price="Custom"
            description="For organizations and event teams"
            features={[
            {
              text: 'Everything in Pro',
              included: true
            },
            {
              text: 'Sponsor visibility and links',
              included: true
            },
            {
              text: 'Custom branding and white-label',
              included: true
            },
            {
              text: 'API access',
              included: true
            },
            {
              text: 'Dedicated account manager',
              included: true
            },
            {
              text: 'SSO and team management',
              included: true
            },
            {
              text: 'Custom integrations',
              included: true
            }]
            }
            ctaText={'Coming Soon!\nJoin the Waitlist'}
            ctaStyle="secondary"
            accentColor="var(--color-violet)"
            accentColorLight="var(--color-violet-light)"
            checkColor="var(--color-violet)"
            topBorderColor="var(--color-violet)"
            delay={0.2} />

        </div>
      </div>
    </section>);

}