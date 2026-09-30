'use client';

import React, { useEffect, useState } from 'react';
import {
  CheckCircle2,
  Calendar,
  Clock,
  MapPin,
  ArrowRight,
  Truck,
  Sparkles,
  Package,
  Navigation,
  X,
  Copy,
  ShieldCheck,
  Droplets,
  AlertTriangle,
  XCircle
} from 'lucide-react';
import { Order } from '@laundelle/types';

interface OrderPlacedAnimationModalProps {
  isOpen: boolean;
  order: Order | null;
  onClose: () => void;
  onTrackOrder: (orderId: string) => void;
  onCancelOrder?: (orderId: string, reason?: string) => void;
}

export const OrderPlacedAnimationModal: React.FC<OrderPlacedAnimationModalProps> = ({
  isOpen,
  order,
  onClose,
  onTrackOrder,
  onCancelOrder,
}) => {
  const [showContent, setShowContent] = useState(false);
  const [copied, setCopied] = useState(false);
  const [confirmCancelOpen, setConfirmCancelOpen] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => setShowContent(true), 100);
      return () => clearTimeout(timer);
    } else {
      setShowContent(false);
    }
  }, [isOpen]);

  if (!isOpen || !order) return null;

  const orderTotal = Number(
    order.total ?? (order as any).total_price ?? (order as any).amount ?? 0
  ).toFixed(2);

  const handleCopyId = () => {
    navigator.clipboard.writeText(order.id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-[9999] w-screen h-screen min-h-screen bg-gradient-to-b from-[#021B4D] via-[#032B70] to-[#011438] text-white flex flex-col justify-between overflow-y-auto select-none animate-in fade-in duration-300">
      <style>{`
        @keyframes truckDrive {
          0% {
            transform: translateX(-110%);
          }
          45% {
            transform: translateX(0%);
          }
          100% {
            transform: translateX(0%);
          }
        }

        @keyframes truckBob {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-4px);
          }
        }

        @keyframes wheelSpin {
          0% {
            transform: rotate(0deg);
          }
          100% {
            transform: rotate(360deg);
          }
        }

        @keyframes roadMove {
          0% {
            background-position: 0 0;
          }
          100% {
            background-position: -80px 0;
          }
        }

        @keyframes exhaustPuff {
          0% {
            opacity: 0.8;
            transform: scale(0.6) translate(0, 0);
          }
          100% {
            opacity: 0;
          }
        }

        @keyframes floatBubble {
          0%, 100% {
            transform: translateY(0) scale(1);
          }
          50% {
            transform: translateY(-12px) scale(1.05);
          }
        }

        .animate-truck-enter {
          animation: truckDrive 1.2s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }

        .animate-truck-bob {
          animation: truckBob 0.6s ease-in-out infinite;
        }

        .animate-wheel-spin {
          animation: wheelSpin 0.7s linear infinite;
        }

        .animated-road {
          background-image: repeating-linear-gradient(
            to right,
            #ffffff 0px,
            #ffffff 28px,
            transparent 28px,
            transparent 60px
          );
          background-size: 60px 4px;
          animation: roadMove 0.75s linear infinite;
        }

        .exhaust-puff-1 {
          animation: exhaustPuff 1s ease-out infinite;
        }
        .exhaust-puff-2 {
          animation: exhaustPuff 1s ease-out 0.4s infinite;
        }
        .bubble-float-1 {
          animation: floatBubble 3s ease-in-out infinite;
        }
        .bubble-float-2 {
          animation: floatBubble 2.5s ease-in-out infinite 0.5s;
        }
      `}</style>

      {/* Ambient background glows */}
      <div className="fixed top-0 left-1/4 w-96 h-96 bg-[#00B4D8]/20 rounded-full blur-3xl pointer-events-none" />
      <div className="fixed bottom-0 right-1/4 w-[30rem] h-[30rem] bg-[#0077B6]/25 rounded-full blur-[100px] pointer-events-none" />

      {/* ── Top Header Navigation Bar ── */}
      <header className="relative z-20 w-full px-6 py-5 flex items-center justify-between max-w-5xl mx-auto">
        <div className="flex flex-col">
          <span className="font-serif text-xl sm:text-2xl font-black tracking-wider text-white">
            LAUNDELLE
          </span>
          <span className="text-[9px] sm:text-[10px] tracking-widest text-sky-200 uppercase font-semibold -mt-0.5">
            CARE THAT SHOWS
          </span>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 bg-white/10 hover:bg-white/20 active:scale-95 text-white/90 font-bold rounded-xl text-xs flex items-center gap-1.5 backdrop-blur-md border border-white/20 transition-all cursor-pointer"
        >
          <span>Skip to Orders</span>
          <X className="w-4 h-4" />
        </button>
      </header>

      {/* ── Main Content Body ── */}
      <main className="relative z-10 w-full max-w-2xl mx-auto px-4 sm:px-6 py-4 flex-1 flex flex-col items-center justify-center text-center">
        {/* Celebration Title & Badge */}
        <div className={`transition-all duration-700 space-y-2 ${showContent ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/20 backdrop-blur-md border border-emerald-400/40 text-xs sm:text-sm font-extrabold text-emerald-300 shadow-lg">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <Sparkles className="w-4 h-4 text-emerald-300" />
            <span>ORDER PLACED & PAYMENT CONFIRMED</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-serif font-black tracking-tight text-white drop-shadow-md pt-1">
            Your Laundry Journey Has Begun! 🎉
          </h1>

          <p className="text-xs sm:text-sm text-sky-100/85 max-w-md mx-auto leading-relaxed">
            Our expert laundry specialists have reserved your slot. A professional driver is being dispatched for collection.
          </p>
        </div>

        {/* ── Grand Centerstage: Animated Delivery Truck on Highway ── */}
        <div className="w-full max-w-lg mt-6 mb-4 relative">
          {/* Floating laundry care bubbles */}
          <div className="absolute -top-4 left-6 text-sky-300/40 bubble-float-1 pointer-events-none">
            <Droplets className="w-6 h-6" />
          </div>
          <div className="absolute -top-6 right-10 text-cyan-300/40 bubble-float-2 pointer-events-none">
            <Sparkles className="w-5 h-5" />
          </div>

          <div className="bg-gradient-to-b from-[#0e245a]/90 to-[#081538]/90 rounded-3xl p-5 shadow-2xl border border-sky-400/30 backdrop-blur-md overflow-hidden">
            {/* Live Telemetry Header */}
            <div className="flex justify-between items-center text-[10px] font-bold text-sky-200/70 uppercase tracking-widest mb-1.5">
              <span className="flex items-center gap-1.5">
                <Truck className="w-3.5 h-3.5 text-sky-300" />
                Laundelle Express Logistics
              </span>
              <span className="flex items-center gap-1.5 text-emerald-400 font-extrabold">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                En Route for Pickup
              </span>
            </div>

            {/* Truck & Road Animation */}
            <div className="relative h-28 sm:h-32 flex flex-col justify-end items-center overflow-hidden">
              <div className="animate-truck-enter w-full flex justify-center">
                <div className="relative animate-truck-bob">
                  {/* Exhaust smoke puffs */}
                  <div className="absolute left-0 bottom-4 w-3.5 h-3.5 bg-white/40 rounded-full exhaust-puff-1 pointer-events-none" />
                  <div className="absolute left-1 bottom-5 w-3 h-3 bg-white/30 rounded-full exhaust-puff-2 pointer-events-none" />

                  {/* SVG Van */}
                  <svg
                    className="w-48 sm:w-56 h-auto drop-shadow-[0_10px_20px_rgba(0,0,0,0.6)]"
                    viewBox="0 0 240 110"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    {/* Headlight beam */}
                    <polygon
                      points="208,68 240,62 240,92 208,82"
                      fill="url(#lightBeamFull)"
                      opacity="0.75"
                    />

                    {/* Main Van Body */}
                    <rect x="25" y="24" width="130" height="58" rx="8" fill="#FFFFFF" />
                    {/* Van Cab */}
                    <path
                      d="M150 36H182C188 36 195 42 199 50L208 68C210 72 210 76 210 82V82H150V36Z"
                      fill="#F1F5F9"
                    />

                    {/* Blue Brand Accent Strip on Van Side */}
                    <rect x="25" y="52" width="130" height="12" fill="#03045E" />
                    <text
                      x="90"
                      y="61"
                      fill="#FFFFFF"
                      fontSize="8"
                      fontWeight="900"
                      textAnchor="middle"
                      letterSpacing="1.5"
                      fontFamily="system-ui, sans-serif"
                    >
                      LAUNDELLE
                    </text>

                    {/* Cab Windshield */}
                    <path
                      d="M158 42H180C183 42 187 45 190 51L197 64H158V42Z"
                      fill="#38BDF8"
                      opacity="0.9"
                    />

                    {/* Headlight lamp */}
                    <rect x="206" y="70" width="4" height="8" rx="2" fill="#FACC15" />
                    {/* Taillight */}
                    <rect x="23" y="68" width="3" height="8" rx="1.5" fill="#EF4444" />

                    {/* Door Line */}
                    <line x1="150" y1="36" x2="150" y2="82" stroke="#CBD5E1" strokeWidth="1.5" />
                    <circle cx="160" cy="62" r="2" fill="#64748B" />

                    {/* Rear Wheel Arch */}
                    <path d="M50 82A16 16 0 0 1 82 82Z" fill="#081538" />
                    {/* Front Wheel Arch */}
                    <path d="M166 82A16 16 0 0 1 198 82Z" fill="#081538" />

                    {/* Rear Wheel */}
                    <g className="animate-wheel-spin" style={{ transformOrigin: '66px 82px' }}>
                      <circle cx="66" cy="82" r="14" fill="#0F172A" />
                      <circle cx="66" cy="82" r="8" fill="#94A3B8" />
                      <circle cx="66" cy="82" r="3" fill="#0F172A" />
                      <line x1="66" y1="70" x2="66" y2="94" stroke="#475569" strokeWidth="1.5" />
                      <line x1="54" y1="82" x2="78" y2="82" stroke="#475569" strokeWidth="1.5" />
                    </g>

                    {/* Front Wheel */}
                    <g className="animate-wheel-spin" style={{ transformOrigin: '182px 82px' }}>
                      <circle cx="182" cy="82" r="14" fill="#0F172A" />
                      <circle cx="182" cy="82" r="8" fill="#94A3B8" />
                      <circle cx="182" cy="82" r="3" fill="#0F172A" />
                      <line x1="182" y1="70" x2="182" y2="94" stroke="#475569" strokeWidth="1.5" />
                      <line x1="170" y1="82" x2="194" y2="82" stroke="#475569" strokeWidth="1.5" />
                    </g>

                    <defs>
                      <linearGradient id="lightBeamFull" x1="208" y1="75" x2="240" y2="75" gradientUnits="userSpaceOnUse">
                        <stop stopColor="#FDE047" stopOpacity="0.85" />
                        <stop offset="1" stopColor="#FDE047" stopOpacity="0" />
                      </linearGradient>
                    </defs>
                  </svg>
                </div>
              </div>

              {/* Animated Asphalt Highway */}
              <div className="w-full relative mt-1.5">
                <div className="w-full h-3.5 bg-slate-900 rounded-full relative overflow-hidden flex items-center shadow-inner">
                  <div className="w-full h-1 animated-road" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── High-Contrast Order Details Card ── */}
        <div className="w-full max-w-lg bg-white/10 backdrop-blur-xl rounded-3xl p-5 sm:p-6 border border-white/20 shadow-2xl space-y-4 text-left">
          {/* Order ID Banner */}
          <div className="flex items-center justify-between p-3.5 bg-white/15 rounded-2xl border border-white/20">
            <div>
              <span className="text-[10px] uppercase font-bold text-sky-200 tracking-wider block">
                Official Order Identifier
              </span>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="font-mono font-black text-xl sm:text-2xl text-white tracking-tight">
                  #{order.id}
                </span>
                <button
                  type="button"
                  onClick={handleCopyId}
                  className="p-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-white/80 transition-colors"
                  title="Copy Order ID"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>
                {copied && <span className="text-[10px] font-bold text-emerald-300">Copied!</span>}
              </div>
            </div>
            <span className="px-3 py-1.5 text-xs font-black bg-emerald-500/30 text-emerald-200 rounded-xl border border-emerald-400/40">
              Paid • £{orderTotal}
            </span>
          </div>

          {/* Logistics Grid: Pickup slot & Address */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="p-3.5 bg-white/10 rounded-2xl border border-white/15 space-y-1">
              <div className="flex items-center gap-1.5 text-sky-200 font-bold">
                <Calendar className="w-3.5 h-3.5 text-cyan-300" />
                <span>Pickup Time Window</span>
              </div>
              <p className="font-extrabold text-white text-sm">{order.pickupDate || 'Today'}</p>
              <p className="text-sky-200/90 font-medium">{order.pickupSlot || '10:00 AM – 12:00 PM'}</p>
            </div>

            <div className="p-3.5 bg-white/10 rounded-2xl border border-white/15 space-y-1">
              <div className="flex items-center gap-1.5 text-sky-200 font-bold">
                <MapPin className="w-3.5 h-3.5 text-cyan-300" />
                <span>Doorstep Collection</span>
              </div>
              <p className="font-bold text-white text-sm truncate" title={order.address}>
                {order.address}
              </p>
              <p className="text-sky-200/90 font-mono text-[11px]">{order.postcode || ''}</p>
            </div>
          </div>
        </div>
      </main>

      {/* ── Bottom Fixed Action Deck ── */}
      <footer className="relative z-20 w-full max-w-lg mx-auto px-4 pb-8 pt-2 space-y-2.5">
        <button
          type="button"
          onClick={() => {
            onTrackOrder(order.id);
            onClose();
          }}
          className="w-full py-4 px-6 bg-gradient-to-r from-[#00B4D8] via-[#48CAE4] to-[#90E0EF] hover:opacity-95 active:scale-98 text-[#03045E] rounded-2xl text-base font-black shadow-xl shadow-cyan-900/40 transition-all flex items-center justify-center gap-2.5 cursor-pointer"
        >
          <Navigation className="w-5 h-5 fill-current" />
          <span>Track Live Journey & Timeline</span>
          <ArrowRight className="w-5 h-5" />
        </button>

        {onCancelOrder && (
          <button
            type="button"
            onClick={() => setConfirmCancelOpen(true)}
            className="w-full py-2.5 px-4 text-red-300 hover:text-white hover:bg-red-500/20 border border-red-400/30 rounded-2xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <XCircle className="w-4 h-4" />
            <span>Cancel This Order</span>
          </button>
        )}

        <div className="flex items-center justify-center gap-1.5 text-[11px] text-sky-200/70 pt-1 font-medium">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span>100% Quality Care Guarantee • Live Timeline Tracking</span>
        </div>
      </footer>

      {/* Confirmation Dialog for Immediate Order Cancellation */}
      {confirmCancelOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white text-gray-900 w-full max-w-sm rounded-3xl p-6 space-y-4 shadow-2xl text-center">
            <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto text-red-600">
              <AlertTriangle className="w-7 h-7" />
            </div>
            <div>
              <h3 className="font-extrabold text-gray-900 text-lg">Cancel Order #{order.id}?</h3>
              <p className="text-xs text-gray-500 mt-1">
                If you do not need this laundry service or placed it by mistake, you can cancel it right now. Your order will be cancelled immediately.
              </p>
            </div>
            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setConfirmCancelOpen(false)}
                className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-2xl text-xs transition-colors cursor-pointer"
              >
                Keep Order
              </button>
              <button
                type="button"
                onClick={() => {
                  setConfirmCancelOpen(false);
                  if (onCancelOrder) {
                    onCancelOrder(order.id, 'Customer cancelled immediately after order placement');
                  }
                  onClose();
                }}
                className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-2xl text-xs transition-colors cursor-pointer"
              >
                Yes, Cancel Order
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
