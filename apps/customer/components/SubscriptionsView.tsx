import React, { useState } from 'react';
import {
  ShoppingBag,
  Crown,
  RotateCcw,
  Calendar,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  Scale,
  Sparkles,
  Clock
} from 'lucide-react';

interface SubscriptionsViewProps {
  onOpenAuth: () => void;
  onNavigate?: (tab: string) => void;
}

export const SubscriptionsView: React.FC<SubscriptionsViewProps> = ({
  onOpenAuth,
  onNavigate: _onNavigate
}) => {
  // FAQ accordion state
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const toggleFaq = (index: number) => {
    setOpenFaq((prev) => (prev === index ? null : index));
  };

  const handleSelectPlan = (_planName: string) => {
    onOpenAuth();
  };

  const faqs = [
    {
      icon: Calendar,
      question: 'How are collections scheduled?',
      answer:
        'Upon choosing a plan, you can select customized automated weekly pickup timings. Our driver arrives automatically with a fresh bag.'
    },
    {
      icon: Scale,
      question: 'What if I overshoot the weight allowance?',
      answer:
        'Overage is billed smoothly at a flat discounted customer tier rate of only £2.00 per kilo, added directly to your monthly invoice statement.'
    },
    {
      icon: Clock,
      question: 'Can I pause my subscription when going on holiday?',
      answer:
        'Yes, you can pause, skip, or resume anytime with one simple click from your account dashboard with zero hidden fees or penalty charges.'
    },
    {
      icon: Sparkles,
      question: 'Are dry cleaning and delicate items included?',
      answer:
        'All subscription bags cover wash, tumble dry, and flat folding. Dry cleaning and delicate alterations receive an exclusive 10% to 15% discount as an active subscriber.'
    }
  ];

  return (
    <div className="w-full min-h-screen bg-[#f8fafc] text-navy font-sans pb-24">
      {/* =========================================================================
          HERO SECTION: PLANS & PRICING
      ========================================================================= */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 sm:pt-16 pb-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          {/* Left Column: Headlines & Trust badges */}
          <div className="lg:col-span-6 space-y-6">
            <span className="inline-block bg-[#e0f0ff] text-[#1d5bd8] text-[11px] font-extrabold uppercase tracking-wider px-3.5 py-1 rounded-full">
              PLANS & PRICING
            </span>

            <h1 className="text-4xl sm:text-5xl font-black text-navy tracking-tight leading-[1.15]">
              Subscription plans <br />
              designed for you
            </h1>

            <p className="text-gray-500 text-sm sm:text-base leading-relaxed max-w-lg">
              Simple, flexible and value-packed plans that make premium laundry care effortless.
            </p>

            {/* 3 Trust micro-badges */}
            <div className="pt-2 flex flex-wrap items-center gap-4 sm:gap-6 text-xs text-gray-700 font-semibold">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-[#eff6ff] text-[#1d5bd8] flex items-center justify-center shrink-0">
                  <RotateCcw className="w-3.5 h-3.5" />
                </div>
                <span>Cancel or swap anytime</span>
              </div>

              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-[#eff6ff] text-[#1d5bd8] flex items-center justify-center shrink-0">
                  <Calendar className="w-3.5 h-3.5" />
                </div>
                <span>Rollover collections</span>
              </div>

              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-[#eff6ff] text-[#1d5bd8] flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-3.5 h-3.5" />
                </div>
                <span>Fabric insurance included</span>
              </div>
            </div>
          </div>

          {/* Right Column: Towels & Drawstring Bag Product Image */}
          <div className="lg:col-span-6 flex justify-center lg:justify-end">
            <div className="relative w-full max-w-lg rounded-3xl overflow-hidden shadow-xl border border-gray-100/80 bg-white group">
              <img
                src="/assets/subscription-hero-towels.jpg"
                alt="Neatly folded luxury cotton towels and Laundelle drawstring laundry sack bag"
                className="w-full h-auto object-cover object-center group-hover:scale-102 transition-transform duration-500"
              />
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          PRICING TIERS SECTION (3 CARDS)
      ========================================================================= */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch">
          {/* =====================================================================
              CARD 1: BRONZE STARTER
          ===================================================================== */}
          <div className="bg-white rounded-3xl p-7 sm:p-8 border border-gray-100 shadow-xs flex flex-col justify-between hover:shadow-md transition-shadow">
            <div className="space-y-5">
              {/* Icon */}
              <div className="w-14 h-14 rounded-2xl bg-[#eff6ff] text-[#1d5bd8] flex items-center justify-center">
                <ShoppingBag className="w-6 h-6" />
              </div>

              {/* Title & Tagline */}
              <div>
                <h3 className="text-xl font-extrabold text-navy">Bronze Starter</h3>
                <p className="text-xs font-bold text-gray-400 mt-0.5">starter pack</p>
                <p className="text-xs text-gray-500 mt-2 leading-relaxed">
                  Perfect for busy singles and students needing periodic washes.
                </p>
              </div>

              {/* Price */}
              <div className="pt-1">
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-extrabold text-[#082b78] tracking-tight">£39</span>
                  <span className="text-xs text-gray-500 font-semibold">/month</span>
                </div>
              </div>

              {/* What's Included Header */}
              <div className="pt-2">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-extrabold text-navy uppercase tracking-wider whitespace-nowrap">
                    What's Included
                  </span>
                  <div className="h-px bg-gray-100 flex-1" />
                </div>
              </div>

              {/* Bullet Features */}
              <ul className="space-y-3 text-xs text-gray-700">
                {[
                  '2 collection bags per month',
                  'Up to 10kg clean load capacity',
                  'Standard organic eco-wash & press',
                  'Next-day doorstep delivery',
                  'Basic priority support ticket access'
                ].map((feature, idx) => (
                  <li key={idx} className="flex items-start gap-3">
                    <div className="w-5 h-5 rounded-full bg-[#eff6ff] text-[#1d5bd8] flex items-center justify-center shrink-0 mt-0.5">
                      <ShoppingBag className="w-2.5 h-2.5" />
                    </div>
                    <span className="leading-tight">{feature}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Action Button */}
            <div className="pt-8">
              <button
                type="button"
                onClick={() => handleSelectPlan('Bronze Starter')}
                className="w-full py-3.5 rounded-2xl border-2 border-[#1d5bd8] text-[#1d5bd8] hover:bg-[#eff6ff] font-bold text-xs sm:text-sm transition-colors cursor-pointer active:scale-98 shadow-2xs"
              >
                Choose Bronze Starter
              </button>
            </div>
          </div>

          {/* =====================================================================
              CARD 2: SILVER ESSENTIAL (MOST POPULAR / HIGHLIGHTED)
          ===================================================================== */}
          <div className="bg-white rounded-3xl p-7 sm:p-8 border-2 border-[#1d5bd8] shadow-xl flex flex-col justify-between relative hover:shadow-2xl transition-shadow">
            {/* Top Floating Badge */}
            <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
              <span className="bg-[#082b78] text-white text-[11px] font-black uppercase tracking-wider px-5 py-1 rounded-full shadow-sm">
                MOST POPULAR
              </span>
            </div>

            <div className="space-y-5">
              {/* Icon */}
              <div className="w-14 h-14 rounded-2xl bg-[#eff6ff] text-[#1d5bd8] flex items-center justify-center">
                <ShoppingBag className="w-6 h-6" />
              </div>

              {/* Title & Tagline */}
              <div>
                <h3 className="text-xl font-extrabold text-navy">Silver Essential</h3>
                <p className="text-xs text-gray-500 mt-2 leading-relaxed">
                  The ideal schedule for couples and small families.
                </p>
              </div>

              {/* Price */}
              <div className="pt-1">
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-extrabold text-[#082b78] tracking-tight">£69</span>
                  <span className="text-xs text-gray-500 font-semibold">/month</span>
                </div>
              </div>

              {/* What's Included Header */}
              <div className="pt-2">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-extrabold text-navy uppercase tracking-wider whitespace-nowrap">
                    What's Included
                  </span>
                  <div className="h-px bg-gray-100 flex-1" />
                </div>
              </div>

              {/* Bullet Features */}
              <ul className="space-y-3 text-xs text-gray-700">
                {[
                  '4 regular bag collections per month',
                  'Up to 24kg clean load capacity',
                  'Custom fabric softener & fragrance choices',
                  'Free 12h express turnaround upgrades',
                  '10% direct discount on individual item bookings',
                  'Ozone anti-bacterial garment sanitation',
                  'Priority live chat client support'
                ].map((feature, idx) => (
                  <li key={idx} className="flex items-start gap-3">
                    <div className="w-5 h-5 rounded-full bg-[#eff6ff] text-[#1d5bd8] flex items-center justify-center shrink-0 mt-0.5">
                      <ShoppingBag className="w-2.5 h-2.5" />
                    </div>
                    <span className="leading-tight">{feature}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Action Button */}
            <div className="pt-8">
              <button
                type="button"
                onClick={() => handleSelectPlan('Silver Essential')}
                className="w-full py-3.5 rounded-2xl bg-[#082b78] hover:bg-[#06205c] text-white font-bold text-xs sm:text-sm shadow-md transition-all cursor-pointer active:scale-98"
              >
                Choose Silver Essential
              </button>
            </div>
          </div>

          {/* =====================================================================
              CARD 3: GOLD PREMIUM ELITE
          ===================================================================== */}
          <div className="bg-white rounded-3xl p-7 sm:p-8 border border-gray-100 shadow-xs flex flex-col justify-between hover:shadow-md transition-shadow relative">
            {/* Top Right Badge */}
            <div className="absolute top-7 right-7">
              <span className="bg-[#e0f0ff] text-[#1d5bd8] text-[10px] font-extrabold uppercase px-3 py-1 rounded-lg">
                PREMIUM CARE
              </span>
            </div>

            <div className="space-y-5">
              {/* Icon */}
              <div className="w-14 h-14 rounded-2xl bg-[#eff6ff] text-[#1d5bd8] flex items-center justify-center">
                <Crown className="w-6 h-6" />
              </div>

              {/* Title & Tagline */}
              <div>
                <h3 className="text-xl font-extrabold text-navy">Gold Premium Elite</h3>
                <p className="text-xs text-gray-500 mt-2 leading-relaxed">
                  Comprehensive luxury wardrobe management.
                </p>
              </div>

              {/* Price */}
              <div className="pt-1">
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-extrabold text-[#082b78] tracking-tight">£129</span>
                  <span className="text-xs text-gray-500 font-semibold">/month</span>
                </div>
              </div>

              {/* What's Included Header */}
              <div className="pt-2">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-extrabold text-navy uppercase tracking-wider whitespace-nowrap">
                    What's Included
                  </span>
                  <div className="h-px bg-gray-100 flex-1" />
                </div>
              </div>

              {/* Bullet Features */}
              <ul className="space-y-3 text-xs text-gray-700">
                {[
                  '8 regular bag collections per month',
                  'Up to 50kg combined weight allowance',
                  'Full premium garment sanitisation & wash',
                  'Ultra 8-hour super-express turnaround',
                  'Starch preferences & custom packaging',
                  'Zero collection or delivery fees worldwide',
                  'Free standard laundry bag setup kit',
                  'Dedicated direct phone care line'
                ].map((feature, idx) => (
                  <li key={idx} className="flex items-start gap-3">
                    <div className="w-5 h-5 rounded-full bg-[#eff6ff] text-[#1d5bd8] flex items-center justify-center shrink-0 mt-0.5">
                      <ShoppingBag className="w-2.5 h-2.5" />
                    </div>
                    <span className="leading-tight">{feature}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Action Button */}
            <div className="pt-8">
              <button
                type="button"
                onClick={() => handleSelectPlan('Gold Premium Elite')}
                className="w-full py-3.5 rounded-2xl border-2 border-[#1d5bd8] text-[#1d5bd8] hover:bg-[#eff6ff] font-bold text-xs sm:text-sm transition-colors cursor-pointer active:scale-98 shadow-2xs"
              >
                Choose Gold Premium Elite
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          VALUE PROPOSITION 3-PILLARS BANNER
      ========================================================================= */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-3xl p-6 sm:p-9 border border-gray-100 shadow-xs grid grid-cols-1 md:grid-cols-3 gap-8 items-start divide-y md:divide-y-0 md:divide-x divide-gray-100">
          {/* Pillar 1 */}
          <div className="flex items-start gap-4 pt-4 md:pt-0">
            <div className="w-12 h-12 rounded-2xl bg-[#eff6ff] text-[#1d5bd8] flex items-center justify-center shrink-0">
              <RotateCcw className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h4 className="text-sm font-extrabold text-navy">Cancel & Swap Anytime</h4>
              <p className="text-xs text-gray-500 leading-relaxed">
                Swap plans, skip collections, or pause your monthly subscription with one simple click inside your account.
              </p>
            </div>
          </div>

          {/* Pillar 2 */}
          <div className="flex items-start gap-4 pt-6 md:pt-0 md:pl-8">
            <div className="w-12 h-12 rounded-2xl bg-[#eff6ff] text-[#1d5bd8] flex items-center justify-center shrink-0">
              <Calendar className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h4 className="text-sm font-extrabold text-navy">Rollover Collections</h4>
              <p className="text-xs text-gray-500 leading-relaxed">
                Didn't use all your pickups? No worries. Unused operations bags automatically rollover to next month's allowance.
              </p>
            </div>
          </div>

          {/* Pillar 3 */}
          <div className="flex items-start gap-4 pt-6 md:pt-0 md:pl-8">
            <div className="w-12 h-12 rounded-2xl bg-[#eff6ff] text-[#1d5bd8] flex items-center justify-center shrink-0">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h4 className="text-sm font-extrabold text-navy">Complete Fabric Insurance</h4>
              <p className="text-xs text-gray-500 leading-relaxed">
                Enjoy peace of mind. Every single garment is inspected, logged with RFID tracking, and protected under warranty.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          FAQ SECTION
      ========================================================================= */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-6">
        <div className="text-center space-y-2">
          <span className="inline-block bg-[#e0f0ff] text-[#1d5bd8] text-[10px] font-extrabold uppercase tracking-wider px-3.5 py-1 rounded-full">
            FAQ
          </span>
          <h2 className="text-2xl sm:text-3xl font-black text-navy tracking-tight">
            Subscription Frequently Asked Questions
          </h2>
        </div>

        <div className="space-y-3.5 pt-4">
          {faqs.map((faq, index) => {
            const isOpen = openFaq === index;
            const Icon = faq.icon;
            return (
              <div
                key={index}
                className="bg-white rounded-2xl border border-gray-100 shadow-xs overflow-hidden transition-all"
              >
                <button
                  type="button"
                  onClick={() => toggleFaq(index)}
                  className="w-full p-4 sm:p-5 flex items-center justify-between gap-4 text-left cursor-pointer hover:bg-gray-50/50 transition-colors"
                >
                  <div className="flex items-center gap-3.5">
                    <div className="w-10 h-10 rounded-xl bg-[#eff6ff] text-[#1d5bd8] flex items-center justify-center shrink-0">
                      <Icon className="w-5 h-5" />
                    </div>
                    <h3 className="text-xs sm:text-sm font-bold text-navy">{faq.question}</h3>
                  </div>

                  <div className="w-7 h-7 rounded-full bg-gray-50 flex items-center justify-center text-gray-500 shrink-0">
                    {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </div>
                </button>

                {isOpen && (
                  <div className="px-5 pb-5 pt-0 pl-16 text-xs text-gray-500 leading-relaxed animate-in fade-in-50">
                    <p>{faq.answer}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
};
