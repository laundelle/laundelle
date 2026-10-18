'use client';

import React from 'react';
import { AlertTriangle, UserPlus, CheckCircle2, Truck, Package, ShieldAlert } from 'lucide-react';

interface ManagerStaffWarningBannerProps {
  activeDriversCount: number;
  activeProcessorsCount: number;
  onOpenAddDriver: () => void;
  onOpenAddProcessor: () => void;
  loading?: boolean;
}

export const ManagerStaffWarningBanner: React.FC<ManagerStaffWarningBannerProps> = ({
  activeDriversCount,
  activeProcessorsCount,
  onOpenAddDriver,
  onOpenAddProcessor,
  loading = false,
}) => {
  if (loading) return null;

  const hasDriver = activeDriversCount >= 1;
  const hasProcessor = activeProcessorsCount >= 1;

  // Once manager creates at least 1 processor and at least 1 driver, remove warning completely!
  if (hasDriver && hasProcessor) {
    return null;
  }

  return (
    <aside
      aria-label="Staffing Alert"
      className="bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 text-white shadow-md border-b border-amber-600/40 px-4 py-3 sm:px-6 sm:py-3.5 shrink-0 transition-all duration-300"
    >
      <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3">
        {/* Left: Icon & Description */}
        <div className="flex items-start gap-3 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-white/20 backdrop-blur-xs flex items-center justify-center shrink-0 mt-0.5 ring-2 ring-white/30 shadow-xs">
            <AlertTriangle className="w-5 h-5 text-amber-100 animate-pulse" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-extrabold text-sm sm:text-base tracking-tight text-white flex items-center gap-1.5">
                <ShieldAlert className="w-4 h-4 text-amber-200" />
                Action Required: Operational Staffing Needed
              </span>
              <span className="text-[11px] font-bold uppercase tracking-wider bg-black/25 text-amber-100 px-2 py-0.5 rounded-full border border-white/20">
                Customer Slots Offline
              </span>
            </div>
            <p className="text-xs sm:text-[13px] text-amber-50/95 mt-0.5 leading-snug font-medium">
              If you don&apos;t create at least <strong className="text-white underline underline-offset-2">1 driver</strong> and <strong className="text-white underline underline-offset-2">1 processor</strong>, orders will get affected and customer booking slots will not be shown (the customer portal will display <span className="font-mono bg-black/20 px-1.5 py-0.5 rounded text-amber-100 font-semibold">&ldquo;There is no plant in the area&rdquo;</span>). Please create at least 1 processor and 1 driver to enable order slots.
            </p>
          </div>
        </div>

        {/* Right: Staffing Status Indicators & Quick Action Buttons */}
        <div className="flex items-center gap-2.5 sm:gap-3 flex-wrap lg:flex-nowrap shrink-0 w-full lg:w-auto pt-1 lg:pt-0 border-t border-white/15 lg:border-t-0">
          {/* Driver Status Pill */}
          <div className="flex items-center gap-1.5">
            {hasDriver ? (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600/90 text-white text-xs font-bold shadow-xs border border-emerald-400/40">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Driver: {activeDriversCount}/1 Active</span>
              </div>
            ) : (
              <button
                type="button"
                onClick={onOpenAddDriver}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-amber-50 text-amber-900 text-xs font-extrabold shadow-sm hover:shadow transition-all cursor-pointer active:scale-97"
                title="Create a Driver now"
              >
                <Truck className="w-3.5 h-3.5 text-amber-700" />
                <span>Create Driver ({activeDriversCount}/1)</span>
                <UserPlus className="w-3 h-3 text-amber-700" />
              </button>
            )}
          </div>

          {/* Processor Status Pill */}
          <div className="flex items-center gap-1.5">
            {hasProcessor ? (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600/90 text-white text-xs font-bold shadow-xs border border-emerald-400/40">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Processor: {activeProcessorsCount}/1 Active</span>
              </div>
            ) : (
              <button
                type="button"
                onClick={onOpenAddProcessor}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-amber-50 text-amber-900 text-xs font-extrabold shadow-sm hover:shadow transition-all cursor-pointer active:scale-97"
                title="Create a Processor now"
              >
                <Package className="w-3.5 h-3.5 text-amber-700" />
                <span>Create Processor ({activeProcessorsCount}/1)</span>
                <UserPlus className="w-3 h-3 text-amber-700" />
              </button>
            )}
          </div>
        </div>
      </div>
    </aside>
  );
};
