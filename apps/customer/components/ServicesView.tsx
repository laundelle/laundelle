import React, { useState, useEffect } from 'react';
import { Search, Shirt, Sparkles, Filter, Info, ShoppingBag, ChevronDown, Clock, Droplets, ShieldCheck, Star, X, Zap, Award, CheckCircle2, ArrowRight } from 'lucide-react';
import { ServiceItem, ActiveTab } from '@laundelle/types';
import { ScrollReveal } from '@laundelle/ui';

interface ServicesViewProps {
  services: ServiceItem[];
  onAddToCart: (service: ServiceItem, quantity: number, options?: string, instructions?: string) => void;
  onOpenCart: () => void;
  onCustomizeService?: (service: ServiceItem) => void;
  onNavigate?: (tab: ActiveTab) => void;
  targetServiceQuery?: string | null;
  onClearTargetService?: () => void;
}

// Map service names to their corresponding images in public/Images
const SERVICE_NAME_TO_IMAGE: Record<string, string> = {
  'Basic Alterations & Repairs': '/Images/Basic Alterations & Repairs.png',
  'Curtains & Heavy Drapes': '/Images/Curtains & Heavy Drapes.png',
  'Duvets & Bulky Bedding': '/Images/Duvets & Bulky Bedding.png',
  'Express Same-Day Service': '/Images/Express Same-Day Service.png',
  'Leather & Suede Jackets': '/Images/Leather & Suede Jackets.png',
  'Pet Beds & Blankets': '/Images/Pet Beds & Blankets.png',
  'Silk & Delicates Care': '/Images/Silk & Delicates Care.png',
  'Sneaker & Shoe Deep Clean': '/Images/Sneaker & Shoe Deep Clean.png',
  'Sports & Activewear': '/Images/Sports & Activewear.png',
  'Steam Ironing & Pressing': '/Images/Steam Ironing & Pressing.png',
  'Suit & Jacket Dry Cleaning': '/Images/Suit & Jacket Dry Cleaning.png',
  'Wash + Dry + Fold': '/Images/Wash + Dry + Fold.png',
  'Wash + Steam Iron': '/Images/Wash + Steam Iron.png',
  'Wedding Dress Preservation': '/Images/Wedding Dress Preservation.png',
};

export const ServicesView: React.FC<ServicesViewProps> = ({
  services,
  onAddToCart: _onAddToCart,
  onOpenCart,
  onCustomizeService,
  onNavigate,
  targetServiceQuery,
  onClearTargetService,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showAiImage, setShowAiImage] = useState<boolean>(false);
  const [isAiMinimized, setIsAiMinimized] = useState<boolean>(false);
  const [highlightedServiceId, setHighlightedServiceId] = useState<string | null>(null);

  useEffect(() => {
    if (!targetServiceQuery) return;

    const q = targetServiceQuery.toLowerCase().trim();

    // Match service by name, id, category, or keywords
    const match = services.find((s) => {
      const name = s.name.toLowerCase();
      const id = s.id.toLowerCase();
      const cat = s.category.toLowerCase();
      if (name === q || id === q) return true;
      if (name.includes(q) || q.includes(name)) return true;
      if (q.includes('shirt') && (name.includes('wash') || cat === 'wash_fold')) return true;
      if ((q.includes('shoe') || q.includes('sneaker')) && (name.includes('shoe') || name.includes('sneaker') || cat === 'shoes')) return true;
      if (q.includes('silk') && name.includes('silk')) return true;
      return false;
    });

    if (match) {
      setSelectedCategory('all');
      setSearchQuery('');
      setHighlightedServiceId(match.id);

      const scrollToMatch = () => {
        const el =
          document.querySelector(`[data-service-id="${match.id}"]`) ||
          document.querySelector(`[data-service-name="${match.name.toLowerCase()}"]`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      };

      const t1 = setTimeout(scrollToMatch, 100);
      const t2 = setTimeout(scrollToMatch, 350);

      const clearTimer = setTimeout(() => {
        setHighlightedServiceId(null);
        if (onClearTargetService) onClearTargetService();
      }, 4000);

      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
        clearTimeout(clearTimer);
      };
    }
  }, [targetServiceQuery, services, onClearTargetService]);

  const categories = [
    { id: 'all', label: 'All Categories' },
    { id: 'wash_fold', label: 'Wash & Fold' },
    { id: 'dry_cleaning', label: 'Dry Cleaning' },
    { id: 'ironing', label: 'Steam Ironing' },
    { id: 'bedding', label: 'Bed & Bath' },
    { id: 'shoes', label: 'Shoe Care' },
  ];

  const filteredServices = services.filter((s) => {
    const matchesCategory = selectedCategory === 'all' || s.category === selectedCategory;
    const matchesSearch =
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.categoryLabel.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  // Scroll listener: Trigger AI image when 3 services scrolled on Mobile (card 2), or 3 rows on PC (card 8)
  useEffect(() => {
    const handleScroll = () => {
      const isMobile = window.innerWidth < 1024;
      // 3 services on Mobile (0-indexed: card 2), 3 rows on PC (3 items/row = card 8)
      const targetCardIndex = isMobile ? 2 : 8;
      const targetCard = document.getElementById(`service-card-${targetCardIndex}`);

      if (targetCard) {
        const rect = targetCard.getBoundingClientRect();
        if (rect.top <= window.innerHeight * 0.85) {
          setShowAiImage(true);
        }
      } else {
        const threshold = isMobile ? 600 : 1000;
        if (window.scrollY >= threshold) {
          setShowAiImage(true);
        }
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();

    return () => window.removeEventListener('scroll', handleScroll);
  }, [filteredServices]);

  return (
    <div className="w-full px-3 sm:px-6 lg:px-8 py-6 space-y-6 pb-24">
      {/* Header (Full Width Blue Box that scrolls up naturally) */}
      <ScrollReveal yOffset={18} className="w-full">
        <div className="w-full bg-[#03045E] text-white rounded-2xl sm:rounded-3xl p-6 sm:p-10 md:p-12 relative overflow-hidden shadow-xl min-h-[170px] sm:min-h-[260px] flex items-center">
          {/* Right Fading Image Container */}
          <div className="absolute top-0 right-0 bottom-0 w-[55%] sm:w-1/2 md:w-1/2 pointer-events-none overflow-hidden select-none z-0">
            <div
              className="w-full h-full bg-cover bg-right sm:bg-center bg-no-repeat opacity-100 transition-all duration-300"
              style={{
                backgroundImage: `url('/assets/services-hero.png')`,
                maskImage: 'linear-gradient(to right, transparent 0%, rgba(0,0,0,0.3) 18%, rgba(0,0,0,1) 50%)',
                WebkitMaskImage: 'linear-gradient(to right, transparent 0%, rgba(0,0,0,0.3) 18%, rgba(0,0,0,1) 50%)',
              }}
            />
            {/* Smooth Soft Left Transition Overlay */}
            <div className="absolute inset-0 bg-gradient-to-r from-[#03045E] via-[#03045E]/15 to-transparent" />
          </div>

          {/* Text Content */}
          <div className="relative z-10 w-full flex justify-start">
            <div className="max-w-[50%] sm:max-w-xl md:max-w-2xl space-y-2 sm:space-y-3">
              <h1 className="text-xl sm:text-4xl md:text-5xl font-heading font-extrabold tracking-tight text-white leading-tight drop-shadow-xs">
                Our Services & Transparent Pricing
              </h1>
              <p className="hidden sm:block text-xs sm:text-sm text-white/85 leading-relaxed max-w-xs sm:max-w-xl">
                Select your required laundry, dry cleaning, or shoe restoration services. Customize wash options and schedule doorstep pickup in seconds.
              </p>
            </div>
          </div>

          {/* Decorative Ambient Background Glow */}
          <div className="absolute right-[-40px] top-[-40px] w-72 h-72 bg-[#00B4D8]/20 rounded-full blur-3xl pointer-events-none z-0" />
        </div>
      </ScrollReveal>

      {/* Floating Glassmorphism Controls (Full Width: Search 80% + Filter 20%) */}
      <div className="sticky top-[84px] sm:top-[88px] z-30 my-4 w-full">
        <div className="w-full bg-white/80 backdrop-blur-xl border border-white/90 rounded-2xl sm:rounded-3xl shadow-lg hover:shadow-xl transition-all duration-300 p-1.5 sm:p-2 flex items-center gap-2 sm:gap-3">
          {/* 80% Search Bar */}
          <div className="relative w-[78%] sm:w-[80%] flex items-center">
            <Search className="w-4 h-4 text-[#1D4ED8] absolute left-3.5 sm:left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search suit, saree, blanket, wash & fold..."
              className="w-full pl-10 sm:pl-11 pr-3 sm:pr-4 py-2.5 sm:py-3 bg-white/60 hover:bg-white/90 focus:bg-white border border-slate-200/60 rounded-xl sm:rounded-2xl text-xs sm:text-sm font-semibold text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-[#1D4ED8]/30 focus:outline-none transition-all shadow-2xs"
            />
          </div>

          {/* 20% Category Filter Dropdown */}
          <div className="relative w-[22%] sm:w-[20%] min-w-[105px] flex items-center">
            <Filter className="w-4 h-4 text-[#1D4ED8] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none hidden sm:block" />
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full pl-3 sm:pl-9 pr-8 py-2.5 sm:py-3 bg-white/60 hover:bg-white/90 focus:bg-white border border-slate-200/60 rounded-xl sm:rounded-2xl text-xs sm:text-sm font-extrabold text-[#0F172A] focus:ring-2 focus:ring-[#1D4ED8]/30 focus:outline-none appearance-none cursor-pointer truncate transition-all shadow-2xs"
            >
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id} className="bg-white text-slate-800 font-semibold">
                  {cat.label}
                </option>
              ))}
            </select>
            <ChevronDown className="w-4 h-4 text-slate-400 absolute right-2.5 sm:right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Service Items Grid (3 Columns on PC Screens) */}
      {filteredServices.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-3xl shadow-xs border border-slate-200/80">
          <Info className="w-10 h-10 text-gray-300 mx-auto mb-2" />
          <p className="text-sm font-bold text-gray-700">No services found matching "{searchQuery}"</p>
          <p className="text-xs text-gray-400 mt-1">Try clearing search filters or selecting another category.</p>
        </div>
      ) : (
        <div className="w-full grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-7">
          {filteredServices.map((service, index) => {
            const fallbackImg = '/Images/Wash + Dry + Fold.png';
            const serviceImg = SERVICE_NAME_TO_IMAGE[service.name] || (service.image && service.image.startsWith('/Images/') ? service.image : `/Images/${service.name}.png`) || fallbackImg;
            const turnaround = 'turnaround' in service ? (service as any).turnaround : '24–48 Hours';
            const isPopular = service.popular || index === 0;

            return (
              <ScrollReveal
                key={service.id}
                yOffset={28}
                delay={(index % 3) * 0.05}
                className="h-full"
              >
                <div
                  id={`service-card-${index}`}
                  data-service-id={service.id}
                  data-service-name={service.name.toLowerCase()}
                  className={`bg-white rounded-3xl p-2.5 sm:p-3 pb-4 sm:pb-5 shadow-sm hover:shadow-xl transition-all duration-500 border group flex flex-col justify-between h-full relative ${
                    highlightedServiceId === service.id
                      ? 'ring-4 ring-[#1D4ED8] shadow-[0_0_40px_rgba(29,78,216,0.4)] border-[#1D4ED8] scale-[1.02]'
                      : 'border-slate-200/90 hover:border-[#1D4ED8]/40'
                  }`}
                >
                  {/* TOP VISUAL SIDE (Reduced Margins for a Bigger Image) */}
                  <div className="w-full shrink-0 bg-white rounded-2xl relative overflow-hidden flex items-center justify-center p-0">
                    {/* Main Product / Service Image (Shown Bigger) */}
                    <img
                      src={serviceImg}
                      alt={service.name}
                      onError={(e) => {
                        const target = e.currentTarget as HTMLImageElement;
                        if (target.src !== fallbackImg) target.src = fallbackImg;
                      }}
                      className="w-full h-52 sm:h-56 lg:h-60 object-cover rounded-2xl group-hover:scale-103 transition-transform duration-500"
                    />

                    {/* Highlighted Selected Service Indicator Badge */}
                    {highlightedServiceId === service.id && (
                      <div className="absolute top-3 right-3 bg-[#1D4ED8] text-white text-[10px] sm:text-xs font-black px-3 py-1 rounded-full shadow-lg flex items-center gap-1.5 z-20 animate-bounce">
                        <Sparkles className="w-3.5 h-3.5 text-yellow-300" />
                        <span>SELECTED SERVICE</span>
                      </div>
                    )}

                    {/* Bottom Popular / Category Pill Tag */}
                    {isPopular ? (
                      <div className="absolute bottom-3 left-3 bg-[#1D4ED8] text-white text-[10px] sm:text-xs font-extrabold px-3 py-1 rounded-full shadow-md flex items-center gap-1.5 z-10 tracking-wide">
                        <Star className="w-3 h-3 fill-white text-white" />
                        <span>MOST POPULAR</span>
                      </div>
                    ) : (
                      <div className="absolute bottom-3 left-3 bg-[#03045E] text-white text-[10px] sm:text-xs font-extrabold px-3 py-1 rounded-full shadow-md flex items-center gap-1 z-10 tracking-wide">
                        <span>{service.categoryLabel || 'POPULAR'}</span>
                      </div>
                    )}
                  </div>

                  {/* DETAILS SIDE (Text, Features & Action) */}
                  <div className="flex-1 flex flex-col justify-between px-2 pt-3 space-y-3.5 min-w-0">
                    <div className="space-y-1.5">
                      {/* Service Name */}
                      <h3 className="text-base sm:text-lg font-extrabold text-[#0F172A] tracking-tight leading-tight group-hover:text-[#1D4ED8] transition-colors line-clamp-1">
                        {service.name}
                      </h3>

                      {/* Turnaround Time */}
                      <div className="flex items-center gap-1.5 text-[#1D4ED8] text-xs font-bold">
                        <Clock className="w-3.5 h-3.5 text-[#1D4ED8] shrink-0" />
                        <span>{turnaround}</span>
                      </div>

                      {/* Service Description */}
                      <p className="text-xs text-slate-500 leading-relaxed font-medium line-clamp-2 pt-1">
                        {service.description}
                      </p>
                    </div>

                    {/* Feature Badges Row (Clear layout without border lines) */}
                    <div className="flex items-center justify-between gap-1 py-1.5 overflow-x-auto scrollbar-none">
                      <div className="flex items-center gap-1.5 shrink-0">
                        <div className="w-7 h-7 rounded-full bg-[#EFF6FF] text-[#1D4ED8] flex items-center justify-center shrink-0">
                          <Droplets className="w-3.5 h-3.5 text-[#1D4ED8]" />
                        </div>
                        <span className="text-[10px] sm:text-[11px] font-bold text-slate-700 leading-tight">
                          Deep Clean
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <div className="w-7 h-7 rounded-full bg-[#EFF6FF] text-[#1D4ED8] flex items-center justify-center shrink-0">
                          <Shirt className="w-3.5 h-3.5 text-[#1D4ED8]" />
                        </div>
                        <span className="text-[10px] sm:text-[11px] font-bold text-slate-700 leading-tight">
                          Neatly Folded
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <div className="w-7 h-7 rounded-full bg-[#EFF6FF] text-[#1D4ED8] flex items-center justify-center shrink-0">
                          <ShieldCheck className="w-3.5 h-3.5 text-[#1D4ED8]" />
                        </div>
                        <span className="text-[10px] sm:text-[11px] font-bold text-slate-700 leading-tight">
                          Hygienic Care
                        </span>
                      </div>
                    </div>

                    {/* Price & ADD Action Row */}
                    <div className="flex items-center justify-between pt-1 gap-2 mt-auto">
                      <div className="flex items-baseline">
                        <span className="text-xl sm:text-2xl font-black text-[#0F172A] tracking-tight">
                          £{typeof service.price === 'number' ? service.price.toFixed(2) : service.price}
                        </span>
                        <span className="text-xs text-slate-400 font-semibold ml-1 whitespace-nowrap">
                          / {service.unit}
                        </span>
                      </div>

                      <button
                        onClick={() => onCustomizeService && onCustomizeService(service)}
                        className="bg-gradient-to-r from-[#1D4ED8] to-[#0284C7] hover:from-[#1E40AF] hover:to-[#0369A1] active:scale-95 text-white px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl text-xs font-extrabold flex items-center gap-1.5 shadow-md hover:shadow-lg transition-all cursor-pointer shrink-0"
                      >
                        <ShoppingBag className="w-3.5 h-3.5 text-white" />
                        <span>ADD</span>
                      </button>
                    </div>
                  </div>
                </div>
              </ScrollReveal>
            );
          })}
        </div>
      )}

      {/* ==================================================== */}
      {/* 🚀 UNRIVALED ADVANTAGES                                */}
      {/* ==================================================== */}
      <div className="w-full space-y-12 mt-16 pt-4">
        {/* SECTION: 4 HOLOGRAPHIC CRAZY ADVANTAGES */}
        <ScrollReveal yOffset={28} className="w-full">
          <div className="space-y-6">
            <div className="text-center space-y-2 max-w-2xl mx-auto">
              <span className="px-3 py-1 rounded-full bg-[#EFF6FF] text-[#1D4ED8] text-xs font-black uppercase tracking-wider inline-block">
                Unrivaled Quality Standard
              </span>
              <h3 className="text-2xl sm:text-3xl font-heading font-black text-[#03045E] tracking-tight">
                Why Normal Laundries Can't Match Us
              </h3>
              <p className="text-xs sm:text-sm text-slate-500 font-medium">
                We transformed the ordinary chore of laundry into a precision garment restoration experience.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {[
                {
                  icon: Droplets,
                  color: 'from-blue-500 to-cyan-500',
                  title: 'Micro-Oxygen Foam',
                  desc: 'Penetrates fabric weave deep at 40,000 micro-oscillations/min without fraying fine fibers.',
                  stat: '0% Fiber Wear',
                },
                {
                  icon: ShieldCheck,
                  color: 'from-emerald-500 to-teal-500',
                  title: 'Hospital-Grade Ozone',
                  desc: 'Destroys bacteria, dust mites, and persistent smoke odors without harsh bleach chemicals.',
                  stat: '99.9% Sanitized',
                },
                {
                  icon: Zap,
                  color: 'from-amber-500 to-orange-500',
                  title: 'Italian Steam Sculpt',
                  desc: 'Laser-guided precision steam tables flatten wrinkles and restore factory garment shape.',
                  stat: 'Runway Ready',
                },
                {
                  icon: Award,
                  color: 'from-purple-500 to-indigo-500',
                  title: 'Perfection Guarantee',
                  desc: 'If any garment isn’t crisp, spotless, and fragrant, we re-wash it instantly free of charge.',
                  stat: '100% Risk Free',
                },
              ].map((card, i) => {
                const Icon = card.icon;
                return (
                  <ScrollReveal
                    key={i}
                    yOffset={24}
                    delay={i * 0.06}
                    className="h-full"
                  >
                    <div
                      className="bg-white rounded-3xl p-5 sm:p-6 shadow-sm hover:shadow-xl transition-all duration-300 border border-slate-200/80 hover:border-[#1D4ED8]/40 group flex flex-col justify-between space-y-4 hover:-translate-y-1 h-full"
                    >
                      <div className="space-y-3">
                        <div className={`w-12 h-12 rounded-2xl bg-gradient-to-tr ${card.color} text-white flex items-center justify-center shadow-md group-hover:scale-110 transition-transform`}>
                          <Icon className="w-6 h-6" />
                        </div>
                        <h4 className="text-base font-extrabold text-[#0F172A] group-hover:text-[#1D4ED8] transition-colors">
                          {card.title}
                        </h4>
                        <p className="text-xs text-slate-500 leading-relaxed font-medium">
                          {card.desc}
                        </p>
                      </div>
                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs font-extrabold text-[#1D4ED8]">
                        <span>{card.stat}</span>
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      </div>
                    </div>
                  </ScrollReveal>
                );
              })}
            </div>
          </div>
        </ScrollReveal>

        {/* SECTION 3: CRAZY FLOATING VIP BANNER */}
        <ScrollReveal yOffset={24} className="w-full">
          <div className="rounded-3xl bg-gradient-to-r from-[#03045E] via-[#023E8A] to-[#0077B6] p-6 sm:p-8 text-white flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl relative overflow-hidden">
            <div className="space-y-2 text-center md:text-left z-10">
              <div className="flex items-center justify-center md:justify-start gap-2">
                <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                <span className="text-xs font-bold text-[#CAF0F8] ml-1">4.97 / 5 across 12,000+ garments</span>
              </div>
              <h4 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                Ready for fresh, crisp, effortless laundry?
              </h4>
              <p className="text-xs text-white/80 font-medium max-w-lg">
                Doorstep pickup in 30 minutes, professional care, and next-day return at your fingertips.
              </p>
            </div>

            <div className="flex items-center gap-3 z-10 w-full md:w-auto">
              <button
                type="button"
                onClick={onOpenCart}
                className="flex-1 md:flex-none bg-white hover:bg-slate-50 text-[#03045E] font-black text-xs sm:text-sm px-6 py-3.5 rounded-2xl shadow-lg hover:shadow-xl transition-all cursor-pointer active:scale-95 flex items-center justify-center gap-2"
              >
                <ShoppingBag className="w-4 h-4 text-[#1D4ED8]" />
                <span>View Cart & Checkout</span>
              </button>
            </div>
          </div>
        </ScrollReveal>
      </div>

      {/* ---------------------------------------------------- */}
      {/* FLOATING AI ASSISTANT PROMPT - BOTTOM RIGHT         */}
      {/* ---------------------------------------------------- */}
      {showAiImage && !isAiMinimized && (
        <div className="fixed bottom-20 md:bottom-6 right-4 md:right-6 z-50 animate-in fade-in slide-in-from-bottom-4 duration-300 max-w-[320px]">
          <div
            onClick={() => onNavigate && onNavigate('assistant')}
            className="group relative bg-white/95 backdrop-blur-md text-gray-900 rounded-2xl shadow-xl hover:shadow-2xl border border-blue-100 p-3.5 pr-9 flex items-center gap-3 cursor-pointer transition-all duration-200 hover:scale-102 active:scale-98"
            title="Ask our AI Assistant"
          >
            {/* Close / Dismiss Button */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsAiMinimized(true);
              }}
              className="absolute top-2 right-2 w-6 h-6 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-400 hover:text-gray-700 flex items-center justify-center cursor-pointer transition-colors"
              title="Dismiss"
              aria-label="Dismiss"
            >
              <X className="w-3.5 h-3.5" />
            </button>

            {/* AI Icon */}
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#03045E] to-[#0077B6] text-white flex items-center justify-center shrink-0 shadow-md shadow-[#0077B6]/20 group-hover:scale-105 transition-transform">
              <Sparkles className="w-5 h-5 text-[#48CAE4] animate-pulse" />
            </div>

            {/* Message */}
            <div className="text-left">
              <p className="text-xs text-gray-500 font-medium leading-tight">
                Can't find what you want?
              </p>
              <p className="text-xs font-bold text-[#03045E] group-hover:text-[#0077B6] transition-colors flex items-center gap-1 mt-0.5">
                <span>Ask AI</span>
                <ArrowRight className="w-3 h-3 text-[#0077B6] group-hover:translate-x-0.5 transition-transform" />
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Reopen Floating Pill if dismissed */}
      {showAiImage && isAiMinimized && (
        <button
          type="button"
          onClick={() => {
            if (onNavigate) onNavigate('assistant');
          }}
          className="fixed bottom-20 md:bottom-6 right-4 md:right-6 z-50 bg-[#03045E] hover:bg-[#023E8A] text-white py-2.5 px-4 rounded-full font-bold text-xs shadow-xl flex items-center gap-2 border border-sky-300/30 cursor-pointer transition-all hover:scale-105 active:scale-95"
          title="Ask AI"
        >
          <Sparkles className="w-4 h-4 text-[#48CAE4] animate-pulse" />
          <span>Ask AI</span>
        </button>
      )}
    </div>
  );
};
