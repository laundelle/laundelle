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
      label: 'Scan Intake',
      shortLabel: 'Intake',
      icon: QrCode,
    },
    {
      id: 'orders' as ProcessorViewTab,
      label: 'Orders Board',
      shortLabel: 'Orders',
      icon: ShoppingBag,
      count: activeCount,
    },
    {
      id: 'qc' as ProcessorViewTab,
      label: 'Quality Check',
      shortLabel: 'Quality',
      icon: ClipboardCheck,
      count: qcCount,
    },
    {
      id: 'history' as ProcessorViewTab,
      label: 'Completed Jobs',
      shortLabel: 'History',
      icon: History,
    },
    {
      id: 'profile' as ProcessorViewTab,
      label: 'Station Profile',
      shortLabel: 'Profile',
      icon: User,
    },
  ];

  const currentNav = navItems.find(n => n.id === activeTab) || navItems[1];

  return (
    <div className="w-full min-h-screen bg-slate-50 font-sans text-slate-800 flex flex-col md:flex-row antialiased">
      {/* ─── Desktop Left Sidebar (PC View) ─────────────────────────────────── */}
      <aside className="hidden md:flex flex-col w-64 bg-white text-slate-800 shrink-0 border-r border-slate-100 select-none z-30 sticky top-0 h-screen justify-between">
        <div className="flex flex-col h-full overflow-hidden">
          {/* Brand Header */}
          <div className="h-16 px-5 flex items-center justify-between border-b border-slate-100 shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100/60 shadow-2xs">
                <QrCode className="w-4 h-4 text-blue-600" />
              </div>
              <div className="flex items-center gap-1.5">
                <span className="font-heading font-bold text-base tracking-tight text-slate-900">
                  Laundelle
                </span>
                <span className="text-[10px] font-semibold text-blue-600 bg-blue-50/80 px-1.5 py-0.5 rounded-md border border-blue-100/50">
                  Processor
                </span>
              </div>
            </div>
          </div>

          {/* Plant Unit Pill Card */}
          <div className="px-3.5 pt-4 pb-2 shrink-0">
            <div className="p-2.5 rounded-2xl bg-slate-50/80 border border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0">
                <Building2 className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                <span className="text-xs font-semibold text-slate-900 truncate">Preston Plant 1</span>
              </div>
              <span className="text-[10px] font-mono font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200/50">
                Online
              </span>
            </div>
          </div>

          {/* Navigation Section */}
          <nav className="p-3 space-y-1 overflow-y-auto flex-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition-all cursor-pointer group relative ${isActive
                      ? 'bg-blue-50/80 text-blue-600 font-semibold shadow-2xs'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                    }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Icon className={`w-4 h-4 shrink-0 transition-colors ${isActive ? 'text-blue-600' : 'text-slate-400 group-hover:text-slate-600'}`} />
                    <span className="truncate">{item.label}</span>
                  </div>

                  {/* Count Badge */}
                  {item.count !== undefined && item.count > 0 ? (
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${isActive
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-100 text-slate-700'
                      }`}>
                      {item.count}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </nav>

          {/* Bottom Station Operator Footer */}
          <div className="p-3 border-t border-slate-100 shrink-0">
            <div className="p-2.5 rounded-2xl bg-slate-50/80 border border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-blue-100/70 text-blue-700 flex items-center justify-center font-bold text-xs shrink-0">
                  {(userName || 'P').charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-slate-900 truncate">{userName || 'Plant Operator'}</p>
                  <p className="text-[10px] text-slate-500 truncate">Station Operator</p>
                </div>
              </div>

              <div className="flex items-center gap-1">
                {onSwitchRole && (
                  <button
                    onClick={onSwitchRole}
                    title="Switch Portal"
                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                  </button>
                )}
                <button
                  onClick={onSignOut}
                  title="Sign Out"
                  className="p-1.5 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-50 transition-colors cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* ─── Main Content Column ───────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        {/* Desktop Topbar Header */}
        <header className="sticky top-0 z-20 h-16 bg-white border-b border-slate-100 px-4 lg:px-8 py-3 flex items-center justify-between">
          {/* Breadcrumbs & Title */}
          <div className="flex items-center gap-3">
            {/* Mobile menu trigger */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 cursor-pointer"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>

            <div className="min-w-0">
              <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium">
                <span>Processor</span>
                <ChevronRight className="w-3 h-3 text-slate-300" />
                <span className="text-blue-600 font-semibold">{currentNav.label}</span>
              </div>
              <h2 className="text-base lg:text-lg font-bold text-slate-900 tracking-tight truncate">
                {currentNav.label}
              </h2>
            </div>
          </div>

          {/* Plant Clock & Quick Actions */}
          <div className="flex items-center gap-3">
            {/* Digital Clock Widget */}
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200/60 text-slate-700">
              <Clock className="w-3.5 h-3.5 text-blue-600" />
              <span className="font-mono text-xs font-bold tracking-wider">{currentTime || '--:--:--'}</span>
            </div>

            {/* Quick Intake Button */}
            {activeTab !== 'qr_scan' && (
              <button
                onClick={() => setActiveTab('qr_scan')}
                className="flex items-center gap-2 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold transition-all shadow-2xs cursor-pointer active:scale-95"
              >
                <QrCode className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Scan Intake</span>
              </button>
            )}

            {/* Sign Out (Mobile) */}
            <button
              onClick={onSignOut}
              className="md:hidden flex items-center gap-1.5 px-3 py-2 bg-rose-50 text-rose-600 rounded-xl text-xs font-semibold"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Mobile Dropdown Menu if open */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-white text-slate-800 p-3 space-y-1 border-b border-slate-200 shadow-lg animate-in slide-in-from-top-2 duration-150">
            {navItems.map(item => (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  setMobileMenuOpen(false);
                }}
                className={`w-full flex items-center justify-between p-3 rounded-xl text-xs font-semibold ${activeTab === item.id ? 'bg-blue-50 text-blue-600' : 'text-slate-600 hover:bg-slate-50'
                  }`}
              >
                <div className="flex items-center gap-2.5">
                  <item.icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </div>
                {item.count ? (
                  <span className="px-2 py-0.5 rounded-full text-[10px] bg-blue-600 text-white">
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
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 z-40 px-2 py-1.5 flex justify-between shadow-lg">
        {navItems.map(({ id, shortLabel, icon: Icon, count }) => {
          const isActive = activeTab === id;
          return (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className="flex-1 flex flex-col items-center justify-center py-1 cursor-pointer transition-all relative"
            >
              <div className={`p-1.5 rounded-xl transition-all ${isActive ? 'bg-blue-50 text-blue-600' : 'text-slate-400 hover:text-slate-600'
                }`}>
                <Icon className="w-5 h-5" />
              </div>
              <span className={`text-[10px] mt-0.5 font-semibold ${isActive ? 'text-blue-600' : 'text-slate-400'}`}>
                {shortLabel}
              </span>
              {count && count > 0 ? (
                <span className="absolute top-1 right-3 w-4 h-4 bg-blue-600 text-white rounded-full text-[9px] font-bold flex items-center justify-center">
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
