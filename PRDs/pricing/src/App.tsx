import React from 'react';
import { PricingHero } from './components/PricingHero';
import { PricingTiers } from './components/PricingTiers';
import { FeatureComparison } from './components/FeatureComparison';
import { FAQ } from './components/FAQ';
import { BottomCTA } from './components/BottomCTA';
export function App() {
  return (
    <div className="w-full min-h-screen bg-white">
      <PricingHero />
      <PricingTiers />
      <FeatureComparison />
      <FAQ />
      <BottomCTA />
    </div>);

}