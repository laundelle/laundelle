'use client';
import { apiFetch } from '@laundelle/api-client';
import React, { useState, useEffect } from 'react';
import {
  LogOut,
  QrCode,
  ShoppingBag,
  ClipboardCheck,
  History,
  User,
  Clock,
  ChevronRight,
  Building2,
  RefreshCw,
  Menu,
  X
} from 'lucide-react';
import { ProcessorQRScanView } from './ProcessorQRScanView';
import { ProcessorOrdersView } from './ProcessorOrdersView';
import { ProcessorQCView } from './ProcessorQCView';
import { ProcessorHistoryView } from './ProcessorHistoryView';
import { ProcessorProfileView } from './ProcessorProfileView';

export type ProcessorViewTab = 'qr_scan' | 'orders' | 'qc' | 'history' | 'profile';

interface ProcessorLayoutProps {
  userName?: string;
  onSignOut: () => void;
  onSwitchRole?: () => void;
}

export const ProcessorLayout: React.FC<ProcessorLayoutProps> = ({ userName, onSignOut, onSwitchRole }) => {
  const [activeTab, setActiveTab] = useState<ProcessorViewTab>('orders');
  const [currentTime, setCurrentTime] = useState<string>('');
  const [activeCount, setActiveCount] = useState<number>(0);
  const [qcCount, setQcCount] = useState<number>(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Digital plant clock
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  // Sync count badges from backend
  const fetchCounts = async () => {
    try {
      const rawSession = localStorage.getItem('l2u_auth_session');
      const token = rawSession ? JSON.parse(rawSession).token : null;
      const res = await apiFetch('/api/v1/processor/jobs', {
        headers: { ...(token ? { 'Authorization': `Bearer ${token}` } : {}) }
      });
      if (res.ok) {
        const data = await res.json();
        if (data.assigned) {
          const active = data.assigned.filter((o: any) => o.status !== 'ready_for_delivery' && o.status !== 'delivered').length;
          const qc = data.assigned.filter((o: any) => o.status === 'qc_ready' || o.status === 'ready_for_qc' || o.status === 'quality_check').length;
          setActiveCount(active);
          setQcCount(qc);
        }
      }
    } catch { }
  };

  useEffect(() => {
    fetchCounts();
    const interval = setInterval(fetchCounts, 12000);
    window.addEventListener('l2u_processor_orders_changed', fetchCounts);
    return () => {
      clearInterval(interval);
      window.removeEventListener('l2u_processor_orders_changed', fetchCounts);
    };
  }, []);

  const navItems = [
    {
      id: 'qr_scan' as ProcessorViewTab,
      label: 'QR Intake Terminal',
      shortLabel: 'Intake',
      icon: QrCode,
      badge: 'SCAN',
      badgeColor: 'bg-[#0077B6] text-white',
      description: 'Bag scan & intake console'
    },
    {
      id: 'orders' as ProcessorViewTab,
      label: 'Processing Board',
      shortLabel: 'Jobs',
      icon: ShoppingBag,
      count: activeCount,
      countColor: 'bg-[#CAF0F8] text-[#03045E]',
      description: 'Active laundry workflows'
    },
    {
      id: 'qc' as ProcessorViewTab,
      label: 'Quality Inspection',
      shortLabel: 'Quality',
      icon: ClipboardCheck,
      count: qcCount,
      countColor: 'bg-amber-100 text-amber-900',
      description: 'Checklist & package sealing'
    },
    {
      id: 'history' as ProcessorViewTab,
      label: 'Completed Archive',
      shortLabel: 'History',
      icon: History,
      description: 'Dispatched & sealed jobs'
    },
    {
      id: 'profile' as ProcessorViewTab,
      label: 'Station Settings',
      shortLabel: 'Station',
      icon: User,
      description: 'Operator shift & machinery'
    },
  ];

  const currentNav = navItems.find(n => n.id === activeTab) || navItems[1];

  return (
    <div className="w-full min-h-screen bg-[#f8fafc] font-sans text-gray-900 flex flex-col md:flex-row antialiased">
      {/* ─── Desktop Left Sidebar (PC View) ─────────────────────────────────── */}
      <aside className="hidden md:flex flex-col w-64 lg:w-72 bg-[#03045E] text-white shrink-0 border-r border-[#023E8A] shadow-xl select-none z-30 sticky top-0 h-screen">
        {/* Brand Header */}
        <div className="p-5 pb-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-[#00B4D8] to-[#0077B6] rounded-2xl flex items-center justify-center shadow-md shadow-[#00B4D8]/20">
              <span className="text-white text-sm font-black tracking-wider">L2</span>
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-black text-white tracking-wide">LAUNDELLE</span>
                <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded-md bg-[#48CAE4]/20 text-[#48CAE4] border border-[#48CAE4]/30">
                  PLANT
                </span>
              </div>
              <p className="text-[11px] text-[#CAF0F8]/70 font-medium truncate flex items-center gap-1.5 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>Station Online · Term 01</span>
              </p>
            </div>
          </div>

          {/* Plant Unit Badge */}
          <div className="mt-4 p-2.5 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <Building2 className="w-3.5 h-3.5 text-[#48CAE4]" />
              <span className="text-white/80 font-semibold text-[11px]">Preston Plant 1</span>
            </div>
            <span className="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-500/20 px-1.5 py-0.5 rounded-sm">
              PLANT-A
            </span>
          </div>
        </div>

        {/* Navigation Section */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          <p className="px-3 pb-2 text-[10px] font-black uppercase tracking-widest text-[#48CAE4]/60">
            Operations Workspace
          </p>

          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center justify-between px-3.5 py-3 rounded-2xl transition-all text-left cursor-pointer group relative ${isActive
                    ? 'bg-gradient-to-r from-[#0077B6] to-[#0096C7] text-white shadow-lg shadow-[#0077B6]/30 font-bold'
                    : 'text-white/70 hover:bg-white/5 hover:text-white font-medium'
                  }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-colors ${isActive ? 'bg-white/20 text-white' : 'bg-white/5 text-white/60 group-hover:text-white'
                    }`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs truncate">{item.label}</p>
                    <p className="text-[10px] text-white/40 truncate hidden lg:block font-normal">
                      {item.description}
                    </p>
                  </div>
                </div>

                {/* Badge/Count */}
                {item.count !== undefined && item.count > 0 ? (
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${isActive ? 'bg-white text-[#03045E]' : item.countColor
                    }`}>
                    {item.count}
                  </span>
                ) : item.badge ? (
                  <span className={`px-1.5 py-0.5 rounded-md text-[9px] font-black tracking-wider ${item.badgeColor}`}>
                    {item.badge}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>

        {/* Bottom Station Operator Footer */}
        <div className="p-3 border-t border-white/10 bg-black/10">
          <div className="p-2.5 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#48CAE4] to-[#0077B6] text-[#03045E] flex items-center justify-center font-black text-xs shrink-0">
                {(userName || 'P').charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-white truncate">{userName || 'Plant Operator'}</p>
                <p className="text-[10px] text-white/50 truncate">Processor Station</p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              {onSwitchRole && (
                <button
                  onClick={onSwitchRole}
                  title="Switch Role"
                  className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white/80 transition-colors cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
              )}
              <button
                onClick={onSignOut}
                title="Sign Out"
                className="p-1.5 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-300 transition-colors cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* ─── Main Content Column ───────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        {/* Desktop Topbar Header */}
        <header className="sticky top-0 z-20 h-16 md:h-[68px] bg-white/95 backdrop-blur-md border-b border-gray-200/80 px-4 lg:px-8 py-3 flex items-center justify-between shadow-2xs">
          {/* Breadcrumbs & Title */}
          <div className="flex items-center gap-3">
            {/* Mobile menu trigger */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-xl bg-gray-100 text-gray-700 hover:bg-gray-200 cursor-pointer"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>

            <div className="min-w-0">
              <div className="flex items-center gap-2 text-xs text-gray-400 font-bold uppercase tracking-wider">
                <span>Processor Station</span>
                <ChevronRight className="w-3 h-3 text-gray-300" />
                <span className="text-[#0077B6]">{currentNav.shortLabel}</span>
              </div>
              <h2 className="text-lg lg:text-xl font-black text-[#03045E] tracking-tight truncate">
                {currentNav.label}
              </h2>
            </div>
          </div>

          {/* Plant Clock & Station Live Indicators */}
          <div className="flex items-center gap-3">
            {/* Digital Clock Widget */}
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100 border border-slate-200/80 text-slate-700">
              <Clock className="w-3.5 h-3.5 text-[#0077B6]" />
              <span className="font-mono text-xs font-extrabold tracking-wider">{currentTime || '--:--:--'}</span>
              <span className="text-[10px] font-bold text-emerald-600 bg-emerald-100 px-1.5 py-0.2 rounded-sm">LIVE</span>
            </div>

            {/* Quick Intake Button */}
            {activeTab !== 'qr_scan' && (
              <button
                onClick={() => setActiveTab('qr_scan')}
                className="flex items-center gap-2 px-3.5 py-2 bg-[#03045E] hover:bg-[#023E8A] text-white rounded-xl text-xs font-black transition-all shadow-sm shadow-[#03045E]/20 cursor-pointer active:scale-95"
              >
                <QrCode className="w-3.5 h-3.5 text-[#48CAE4]" />
                <span className="hidden sm:inline">Intake QR</span>
              </button>
            )}

            {/* Sign Out (Mobile) */}
            <button
              onClick={onSignOut}
              className="md:hidden flex items-center gap-1.5 px-3 py-2 bg-red-50 text-red-600 rounded-xl text-xs font-bold"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Mobile Dropdown Menu if open */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-[#03045E] text-white p-3 space-y-1 border-b border-white/10 animate-in slide-in-from-top-2 duration-150">
            {navItems.map(item => (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  setMobileMenuOpen(false);
                }}
                className={`w-full flex items-center justify-between p-3 rounded-xl text-xs font-bold ${activeTab === item.id ? 'bg-[#0077B6] text-white' : 'text-white/70 hover:bg-white/5'
                  }`}
              >
                <div className="flex items-center gap-2.5">
                  <item.icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </div>
                {item.count ? (
                  <span className="px-2 py-0.5 rounded-full text-[10px] bg-white text-[#03045E]">
                    {item.count}
                  </span>
                ) : null}
              </button>
            ))}
          </div>
        )}

        {/* Workspace Canvas Container */}
        <main className="flex-1 w-full max-w-7xl mx-auto p-4 lg:p-8">
          {activeTab === 'qr_scan' && <ProcessorQRScanView onNavigateTab={setActiveTab} />}
          {activeTab === 'orders' && <ProcessorOrdersView onNavigateTab={setActiveTab} />}
          {activeTab === 'qc' && <ProcessorQCView onNavigateTab={setActiveTab} />}
          {activeTab === 'history' && <ProcessorHistoryView />}
          {activeTab === 'profile' && <ProcessorProfileView onExitAdmin={onSignOut} userName={userName} />}
        </main>
      </div>

      {/* ─── Mobile Bottom Navigation (Only visible on small phones < md) ─── */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-40 px-2 py-1.5 flex justify-between shadow-lg">
        {navItems.map(({ id, shortLabel, icon: Icon, count }) => {
          const isActive = activeTab === id;
          return (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className="flex-1 flex flex-col items-center justify-center py-1 cursor-pointer transition-all relative"
            >
              <div className={`p-1.5 rounded-xl transition-all ${isActive ? 'bg-[#CAF0F8] text-[#03045E]' : 'text-gray-400 hover:text-gray-600'
                }`}>
                <Icon className="w-5 h-5" />
              </div>
              <span className={`text-[9px] mt-0.5 font-extrabold ${isActive ? 'text-[#03045E]' : 'text-gray-400'}`}>
                {shortLabel}
              </span>
              {count && count > 0 ? (
                <span className="absolute top-1 right-3 w-4 h-4 bg-red-500 text-white rounded-full text-[9px] font-black flex items-center justify-center">
                  {count}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
};
