import React from 'react';
import Link from 'next/link';
import { Phone, Mail, MapPin, Facebook, Instagram, Twitter, Linkedin, WashingMachine, Shield, Building2, Cpu, Truck } from 'lucide-react';
import { ActiveTab } from '@laundelle/types';
import { navigateToRoute } from '@laundelle/utils';

interface FooterProps {
  onNavigate: (tab: ActiveTab) => void;
  onNavigateRoleLogin?: (role: 'admin' | 'manager' | 'processor' | 'driver') => void;
}

export const Footer: React.FC<FooterProps> = ({ onNavigate, onNavigateRoleLogin }) => {
  const handleNavigateRole = (role: 'admin' | 'manager' | 'processor' | 'driver') => {
    if (onNavigateRoleLogin) {
      onNavigateRoleLogin(role);
    } else {
      navigateToRoute(role, 'login');
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleNav = (tab: ActiveTab) => {
    if (onNavigate && typeof window !== 'undefined' && (window.location.pathname === '/' || window.location.pathname === '/home' || window.location.pathname === `/${tab}`)) {
      onNavigate(tab);
    } else if (typeof window !== 'undefined') {
      window.location.href = tab === 'home' ? '/' : `/${tab === 'assistant' ? 'ai' : tab}`;
    }
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <footer className="w-full bg-[#03045E] text-white pb-20 lg:pb-0 shadow-2xl">
      <div className="w-full px-6 sm:px-12 md:px-20 lg:px-28 py-12 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8">
        {/* Brand Column */}
        <div className="space-y-3">
          <div className="flex items-center gap-2.5 text-lg font-extrabold text-white">
            <div className="w-9 h-9 rounded-xl bg-[#CAF0F8] flex items-center justify-center text-[#03045E] shadow-xs">
              <WashingMachine className="w-5 h-5" />
            </div>
            <div>
              <span className="font-heading font-black text-xl block leading-tight tracking-wider uppercase">
                <span className="text-white">LAUN</span><span className="text-[#00B4D8]">DELLE</span>
              </span>
              <span className="text-xs text-[#48CAE4] font-bold block uppercase tracking-wider">gentle organic garment care</span>
            </div>
          </div>

          <p className="text-xs text-[#ADE8F4] leading-relaxed max-w-xs">
            Your trusted doorstep laundry &amp; dry cleaning partner. We clean with organic care and deliver doorstep happiness.
          </p>

          <div className="flex items-center gap-2 pt-2">
            <a href="#" className="w-7 h-7 bg-white/15 hover:bg-white/30 rounded-full flex items-center justify-center text-white transition-colors">
              <Facebook className="w-3.5 h-3.5" />
            </a>
            <a href="#" className="w-7 h-7 bg-white/15 hover:bg-white/30 rounded-full flex items-center justify-center text-white transition-colors">
              <Instagram className="w-3.5 h-3.5" />
            </a>
            <a href="#" className="w-7 h-7 bg-white/15 hover:bg-white/30 rounded-full flex items-center justify-center text-white transition-colors">
              <Twitter className="w-3.5 h-3.5" />
            </a>
            <a href="#" className="w-7 h-7 bg-white/15 hover:bg-white/30 rounded-full flex items-center justify-center text-white transition-colors">
              <Linkedin className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>

        {/* Quick Links */}
        <div className="space-y-2.5 text-xs">
          <h3 className="font-bold text-white text-xs uppercase tracking-wider">Quick Navigation</h3>
          <ul className="space-y-2 text-[#ADE8F4]">
            <li>
              <button onClick={() => handleNav('home')} className="hover:text-white transition-colors cursor-pointer text-left">
                Home Page
              </button>
            </li>
            <li>
              <button onClick={() => handleNav('services')} className="hover:text-white transition-colors cursor-pointer text-left">
                Services &amp; Pricing
              </button>
            </li>
            <li>
              <button onClick={() => handleNav('assistant')} className="hover:text-white transition-colors flex items-center gap-1 cursor-pointer text-left">
                <span>AI Stain Assistant</span>
                <span className="text-[9px] bg-[#00B4D8] text-white px-1.5 py-0.2 rounded-full font-bold">NEW</span>
              </button>
            </li>
            <li>
              <button onClick={() => handleNav('orders')} className="hover:text-white transition-colors cursor-pointer text-left">
                Live Order Tracking
              </button>
            </li>
            <li>
              <button onClick={() => handleNav('account')} className="hover:text-white transition-colors cursor-pointer text-left">
                My Account
              </button>
            </li>
          </ul>
        </div>

        {/* Customer Support */}
        <div className="space-y-2.5 text-xs">
          <h3 className="font-bold text-white text-xs uppercase tracking-wider">Support &amp; Help</h3>
          <ul className="space-y-2 text-[#ADE8F4]">
            <li>
              <button onClick={() => handleNav('orders')} className="hover:text-white transition-colors cursor-pointer text-left">
                Track Active Order
              </button>
            </li>
            <li>
              <button onClick={() => handleNav('support')} className="hover:text-white transition-colors cursor-pointer text-left">
                Help &amp; FAQs
              </button>
            </li>
            <li>
              <Link href="/termsandconditions" className="hover:text-white transition-colors block">
                Terms &amp; Conditions
              </Link>
            </li>
            <li>
              <Link href="/privacypolicy" className="hover:text-white transition-colors block">
                Privacy Policy
              </Link>
            </li>
            <li>
              <Link href="/cancellationandrefund" className="hover:text-white transition-colors block">
                Cancellation &amp; Refund
              </Link>
            </li>
          </ul>
        </div>

        {/* Contact Info */}
        <div className="space-y-2.5 text-xs">
          <h3 className="font-bold text-white text-xs uppercase tracking-wider">Contact Us</h3>
          <div className="space-y-2 text-[#ADE8F4]">
            <p className="flex items-center gap-2">
              <Phone className="w-3.5 h-3.5 text-[#48CAE4]" />
              <span>+44 20 1234 5678</span>
            </p>
            <p className="flex items-center gap-2">
              <Mail className="w-3.5 h-3.5 text-[#48CAE4]" />
              <span>care@laundelle.co.uk</span>
            </p>
            <p className="flex items-start gap-2">
              <MapPin className="w-3.5 h-3.5 text-[#48CAE4] shrink-0 mt-0.5" />
              <span>123, Clean Street, London, UK - 500001</span>
            </p>
          </div>
        </div>
      </div>

      <div className="py-3 text-center text-[11px] text-[#ADE8F4]">
        © 2026 LAUNDELLE. All Rights Reserved. Fresh Clothes. Happy You.
      </div>
    </footer>
  );
};
