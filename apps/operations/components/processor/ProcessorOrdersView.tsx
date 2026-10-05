'use client';
import { apiFetch } from '@laundelle/api-client';
import React, { useState, useEffect, useMemo } from 'react';
import {
  ShoppingBag,
  ChevronDown,
  CheckCircle2,
  Circle,
  Loader2,
  ArrowRight,
  Search,
  AlertTriangle,
  QrCode,
  Sparkles,
  Weight,
  Layers,
  Phone,
  ShieldCheck,
  RotateCcw,
  Check,
  Eye,
  X,
  Kanban,
  LayoutGrid,
  Clock,
  ExternalLink,
  ChevronRight,
  Filter,
  Flame,
  Truck
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

export type ProcessorStatus =
  | 'received'
  | 'sorting'
  | 'washing'
  | 'drying'
  | 'ironing'
  | 'folding'
  | 'quality_check'
  | 'ready_for_delivery';

export interface ProcessorOrder {
  id: string;
  customerName: string;
  customerPhone?: string;
  serviceType: string;
  status: ProcessorStatus;
  scannedAt: string;
  bagQr: string;
  weightKg: number;
  itemCount: number;
  total: number;
  hasPendingCharge?: boolean;
  additionalChargeAmount?: number;
  specialInstructions?: string;
  rawItems?: Array<{ name: string; quantity: number; description?: string }>;
  backendOrder?: any;
}

interface ProcessorOrdersViewProps {
  onNavigateTab?: (tab: 'qr_scan' | 'orders' | 'qc' | 'history' | 'profile') => void;
}

// ─── Workflow Steps Configuration ─────────────────────────────────────────────

interface WorkflowStep {
  value: ProcessorStatus;
  label: string;
  shortLabel: string;
  emoji: string;
  nextStepLabel: string;
  color: string;
  badgeBg: string;
  badgeText: string;
}

const WORKFLOW: WorkflowStep[] = [
  {
    value: 'received',
    label: 'Intake Received',
    shortLabel: 'Received',
    emoji: '📦',
    nextStepLabel: 'Start Sorting',
    color: 'slate',
    badgeBg: 'bg-slate-100',
    badgeText: 'text-slate-700'
  },
  {
    value: 'sorting',
    label: 'Sorting & Grading',
    shortLabel: 'Sorting',
    emoji: '🗂️',
    nextStepLabel: 'Move to Washer',
    color: 'blue',
    badgeBg: 'bg-blue-50 border-blue-200',
    badgeText: 'text-blue-700'
  },
  {
    value: 'washing',
    label: 'Washing Cycle',
    shortLabel: 'Washing',
    emoji: '🔄',
    nextStepLabel: 'Move to Dryer',
    color: 'cyan',
    badgeBg: 'bg-cyan-50 border-cyan-200',
    badgeText: 'text-cyan-800'
  },
  {
    value: 'drying',
    label: 'Thermal Drying',
    shortLabel: 'Drying',
    emoji: '💨',
    nextStepLabel: 'Move to Finishing',
    color: 'sky',
    badgeBg: 'bg-sky-50 border-sky-200',
    badgeText: 'text-sky-800'
  },
  {
    value: 'ironing',
    label: 'Steam Press & Ironing',
    shortLabel: 'Ironing',
    emoji: '👔',
    nextStepLabel: 'Move to Folding',
    color: 'purple',
    badgeBg: 'bg-purple-50 border-purple-200',
    badgeText: 'text-purple-700'
  },
  {
    value: 'folding',
    label: 'Packaging & Folding',
    shortLabel: 'Folding',
    emoji: '🧺',
    nextStepLabel: 'Send to Quality Check',
    color: 'indigo',
    badgeBg: 'bg-indigo-50 border-indigo-200',
    badgeText: 'text-indigo-700'
  },
  {
    value: 'quality_check',
    label: 'Quality Inspection',
    shortLabel: 'QC Check',
    emoji: '🔍',
    nextStepLabel: 'Inspect in Quality Page',
    color: 'amber',
    badgeBg: 'bg-amber-50 border-amber-200',
    badgeText: 'text-amber-800'
  },
  {
    value: 'ready_for_delivery',
    label: 'Ready for Delivery',
    shortLabel: 'Ready',
    emoji: '✅',
    nextStepLabel: 'Sealed for Driver Handover',
    color: 'emerald',
    badgeBg: 'bg-emerald-50 border-emerald-200',
    badgeText: 'text-emerald-800'
  },
];

const normalizeStatus = (s: string): ProcessorStatus => {
  if (!s) return 'received';
  if (
    s === 'received_at_facility' ||
    s === 'processor_assigned' ||
    s === 'booking_confirmed' ||
    s === 'driver_assigned' ||
    s === 'laundry_collected'
  ) return 'received';
  if (s === 'qc_ready' || s === 'ready_for_qc') return 'quality_check';
  if (['received', 'sorting', 'washing', 'drying', 'ironing', 'folding', 'quality_check', 'ready_for_delivery'].includes(s)) {
    return s as ProcessorStatus;
  }
  return 'washing';
};

const getStepConfig = (status: ProcessorStatus) => {
  return WORKFLOW.find(w => w.value === status) || WORKFLOW[0];
};

const getNextStatus = (currentStatus: ProcessorStatus): ProcessorStatus | null => {
  const currentIndex = WORKFLOW.findIndex(w => w.value === currentStatus);
  if (currentIndex === -1 || currentIndex >= WORKFLOW.length - 1) return null;
  return WORKFLOW[currentIndex + 1].value;
};

export const ProcessorOrdersView: React.FC<ProcessorOrdersViewProps> = ({ onNavigateTab }) => {
  const [orders, setOrders] = useState<ProcessorOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilters, setSelectedFilters] = useState<string[]>([]);
  const [isFilterDropdownOpen, setIsFilterDropdownOpen] = useState(false);
  const filterDropdownRef = React.useRef<HTMLDivElement>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'kanban'>('grid');

  // Active side sheet drawer for order details
  const [detailOrder, setDetailOrder] = useState<ProcessorOrder | null>(null);
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);
  const [stageMenuOpenOrderId, setStageMenuOpenOrderId] = useState<string | null>(null);
  const [lastSyncedAt, setLastSyncedAt] = useState<string>('');

  // Toast notifications
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (filterDropdownRef.current && !filterDropdownRef.current.contains(e.target as Node)) {
        setIsFilterDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadOrders = async () => {
    try {
      const rawSession = localStorage.getItem('l2u_auth_session');
      const token = rawSession ? JSON.parse(rawSession).token : null;
      const res = await apiFetch('/api/v1/processor/jobs', {
        headers: { ...(token ? { 'Authorization': `Bearer ${token}` } : {}) }
      });
      const data = await res.json();
      if (data.assigned) {
        const mapped: ProcessorOrder[] = data.assigned.map((o: any) => ({
          id: o.publicId || o.orderNumber || o.id || o._id?.toString(),
          customerName: o.customerName || o.customer_name || 'Valued Customer',
          customerPhone: o.customerPhone || o.phone || o.customer?.phone || o.customer_phone || '',
          serviceType: o.items?.[0]?.name || o.service || 'Laundry Garments',
          status: normalizeStatus(o.status),
          scannedAt: o.intake_at
            ? new Date(o.intake_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
            : o.updatedAt
              ? new Date(o.updatedAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
              : 'Recently',
          bagQr: o.package?.qr_code || o.qr_code || o.qr_tracking?.qrTagId || (o.publicId ? `BAG-${o.publicId}` : `BAG-${o.id}`),
          weightKg: o.actualWeightKg || o.weightKg || 5.0,
          itemCount: o.items?.length || 1,
          total: o.total || o.total_price || 0,
          hasPendingCharge: o.surcharge?.pendingCustomerApproval || false,
          additionalChargeAmount: o.surcharge?.amount || 0,
          specialInstructions: o.specialInstructions || '',
          rawItems: o.orderItems || o.items || [],
          backendOrder: o
        }));
        setOrders(mapped);
        setLastSyncedAt(new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }));
      }
    } catch (e) {
      console.error('Error fetching processor jobs:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
    const interval = setInterval(loadOrders, 8000);
    const handleOrdersChanged = () => loadOrders();
    window.addEventListener('l2u_processor_orders_changed', handleOrdersChanged);
    window.addEventListener('l2u_orders_change', handleOrdersChanged);

    return () => {
      clearInterval(interval);
      window.removeEventListener('l2u_processor_orders_changed', handleOrdersChanged);
      window.removeEventListener('l2u_orders_change', handleOrdersChanged);
    };
  }, []);

  const handleAdvanceStatus = async (order: ProcessorOrder) => {
    // If order is at QC stage, navigate user directly to QC tab
    if (order.status === 'quality_check') {
      if (onNavigateTab) {
        onNavigateTab('qc');
      }
      return;
    }

    const next = getNextStatus(order.status);
    if (!next) return;

    await executeStageTransition(order.id, next, order.bagQr);
  };

  const executeStageTransition = async (orderId: string, targetStatus: ProcessorStatus, bagQr: string) => {
    setUpdatingOrderId(orderId);
    setStageMenuOpenOrderId(null);

    // Optimistic update
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: targetStatus } : o));

    try {
      const rawSession = localStorage.getItem('l2u_auth_session');
      const token = rawSession ? JSON.parse(rawSession).token : null;
      const res = await apiFetch(`/api/v1/processor/jobs/${orderId}/stage`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ nextStage: targetStatus, qrCode: bagQr })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update processing stage');

      const step = getStepConfig(targetStatus);
      showToast(`Order #${orderId} moved to ${step.label}!`);

      if (targetStatus === 'quality_check') {
        showToast(`Order #${orderId} sent to Quality Inspection! Tap QC Tab to verify.`);
      }

      await loadOrders();
    } catch (e: any) {
      showToast(e.message || 'Error updating stage');
      await loadOrders(); // Revert
    } finally {
      setUpdatingOrderId(null);
    }
  };

  // Counts for KPIs
  const activeCount = orders.filter(o => o.status !== 'ready_for_delivery').length;
  const inWashDryCount = orders.filter(o => o.status === 'washing' || o.status === 'drying').length;
  const inFinishingCount = orders.filter(o => o.status === 'ironing' || o.status === 'folding').length;
  const inQcCount = orders.filter(o => o.status === 'quality_check').length;
  const readyCount = orders.filter(o => o.status === 'ready_for_delivery').length;

  const FILTER_OPTIONS = useMemo(() => [
    {
      id: 'sorting',
      label: 'Intake & Sorting',
      count: orders.filter(o => o.status === 'received' || o.status === 'sorting').length,
      statuses: ['received', 'sorting'] as ProcessorStatus[]
    },
    {
      id: 'washing',
      label: 'Wash & Dry',
      count: inWashDryCount,
      statuses: ['washing', 'drying'] as ProcessorStatus[]
    },
    {
      id: 'finishing',
      label: 'Press & Fold',
      count: inFinishingCount,
      statuses: ['ironing', 'folding'] as ProcessorStatus[]
    },
    {
      id: 'qc',
      label: 'Quality Check',
      count: inQcCount,
      statuses: ['quality_check'] as ProcessorStatus[]
    },
    {
      id: 'ready',
      label: 'Dispatched / Ready',
      count: readyCount,
      statuses: ['ready_for_delivery'] as ProcessorStatus[]
    }
  ], [orders, inWashDryCount, inFinishingCount, inQcCount, readyCount]);

  const toggleFilter = (filterId: string) => {
    setSelectedFilters(prev =>
      prev.includes(filterId) ? prev.filter(id => id !== filterId) : [...prev, filterId]
    );
  };

  // Filtered orders list
  const filteredOrders = useMemo(() => {
    return orders.filter(o => {
      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const qDigits = q.replace(/\D/g, '');
        const phoneDigits = (o.customerPhone || '').replace(/\D/g, '');
        const matchPhone = Boolean(
          (o.customerPhone && o.customerPhone.toLowerCase().includes(q)) ||
          (qDigits.length >= 3 && phoneDigits.includes(qDigits))
        );
        const matchId = o.id.toLowerCase().includes(q);
        const matchCustomer = o.customerName.toLowerCase().includes(q);
        const matchQr = o.bagQr.toLowerCase().includes(q);
        const matchService = o.serviceType.toLowerCase().includes(q);
        if (!matchId && !matchCustomer && !matchPhone && !matchQr && !matchService) return false;
      }

      // Filter dropdown selections
      if (selectedFilters.length > 0) {
        const activeStatuses = selectedFilters.flatMap(fId => {
          const opt = FILTER_OPTIONS.find(f => f.id === fId);
          return opt ? opt.statuses : [];
        });
        if (!activeStatuses.includes(o.status)) return false;
      }

      return true;
    });
  }, [orders, searchQuery, selectedFilters, FILTER_OPTIONS]);

  // Pipeline columns for Kanban view
  const KANBAN_COLUMNS: { id: string; title: string; subtitle: string; statuses: ProcessorStatus[]; badgeColor: string }[] = [
    {
      id: 'intake',
      title: 'Intake & Sorting',
      subtitle: 'Incoming bags & grading',
      statuses: ['received', 'sorting'],
      badgeColor: 'bg-blue-50 text-blue-700 border-blue-200'
    },
    {
      id: 'wash_dry',
      title: 'Wash & Dry',
      subtitle: 'In machines & thermal cycles',
      statuses: ['washing', 'drying'],
      badgeColor: 'bg-cyan-50 text-cyan-800 border-cyan-200'
    },
    {
      id: 'finishing',
      title: 'Finishing & Press',
      subtitle: 'Steam press, fold & packing',
      statuses: ['ironing', 'folding'],
      badgeColor: 'bg-purple-50 text-purple-700 border-purple-200'
    },
    {
      id: 'qc_release',
      title: 'QC & Dispatch',
      subtitle: 'Quality check & driver rack',
      statuses: ['quality_check', 'ready_for_delivery'],
      badgeColor: 'bg-emerald-50 text-emerald-800 border-emerald-200'
    }
  ];

  return (
    <div className="w-full space-y-6 pb-28 md:pb-12">

      {/* ── Toast Notification ── */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 px-4 py-3 rounded-2xl shadow-xl bg-slate-900 text-white border border-slate-700 text-xs font-bold transition-all animate-in slide-in-from-top-4 duration-200 flex items-center gap-2.5">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>{toastMessage}</span>
          <button onClick={() => setToastMessage(null)} className="ml-2 hover:opacity-75 cursor-pointer">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}


      {/* ── Toolbar: Search & Filter Dropdown (Sticky on scroll) ── */}
      <div className="sticky top-16 md:top-[68px] z-10 py-2.5 -my-2.5 bg-[#f8fafc]/95 backdrop-blur-md">
        <div className="bg-white rounded-2xl md:rounded-3xl p-3 sm:p-3.5 border border-slate-200/80 shadow-xs">
          <div className="flex items-center gap-2.5">
            {/* Search Box */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by Order ID, Name, Mobile Number..."
                className="w-full pl-10 pr-9 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-[#0077B6] focus:bg-white transition-all"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 text-xs font-bold cursor-pointer"
                >
                  Clear
                </button>
              )}
            </div>

            {/* Filter Dropdown beside Search Bar */}
            <div className="relative" ref={filterDropdownRef}>
              <button
                type="button"
                onClick={() => setIsFilterDropdownOpen(prev => !prev)}
                className={`flex items-center gap-2 px-3.5 py-2.5 rounded-2xl text-xs font-bold transition-all border cursor-pointer select-none ${selectedFilters.length > 0
                  ? 'bg-[#03045E] text-white border-[#03045E] shadow-xs'
                  : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                  }`}
              >
                <Filter className="w-4 h-4 shrink-0" />
                <span className="hidden sm:inline">Filters</span>
                {selectedFilters.length > 0 && (
                  <span className="w-5 h-5 rounded-full bg-[#48CAE4] text-[#03045E] font-black text-[10px] flex items-center justify-center">
                    {selectedFilters.length}
                  </span>
                )}
                <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isFilterDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* Dropdown Menu */}
              {isFilterDropdownOpen && (
                <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-2xl shadow-xl border border-slate-200 p-2 z-40 animate-in fade-in zoom-in-95 duration-150">
                  <div className="flex items-center justify-between px-3 py-2 border-b border-slate-100">
                    <span className="text-xs font-black text-slate-800 uppercase tracking-wider">Filter by Stage</span>
                    {selectedFilters.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setSelectedFilters([])}
                        className="text-[11px] font-bold text-[#0077B6] hover:underline cursor-pointer"
                      >
                        Clear all
                      </button>
                    )}
                  </div>

                  <div className="py-1.5 space-y-1">
                    {FILTER_OPTIONS.map(opt => {
                      const isChecked = selectedFilters.includes(opt.id);
                      return (
                        <label
                          key={opt.id}
                          className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold cursor-pointer transition-colors ${isChecked ? 'bg-blue-50 text-[#03045E]' : 'hover:bg-slate-50 text-slate-700'
                            }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => toggleFilter(opt.id)}
                              className="w-4 h-4 rounded-md border-slate-300 text-[#03045E] focus:ring-[#0077B6] cursor-pointer"
                            />
                            <span>{opt.label}</span>
                          </div>
                          <span className="text-[11px] font-mono text-slate-400">
                            ({opt.count})
                          </span>
                        </label>
                      );
                    })}
                  </div>

                  {selectedFilters.length > 0 && (
                    <div className="pt-2 border-t border-slate-100 px-1">
                      <button
                        type="button"
                        onClick={() => setIsFilterDropdownOpen(false)}
                        className="w-full py-1.5 bg-[#03045E] text-white text-xs font-bold rounded-xl hover:bg-[#023E8A] transition-colors cursor-pointer"
                      >
                        Apply ({filteredOrders.length} {filteredOrders.length === 1 ? 'job' : 'jobs'})
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Sync Status */}
            {lastSyncedAt && (
              <span className="text-[11px] text-slate-400 font-mono hidden lg:inline shrink-0">
                Synced {lastSyncedAt}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ── Loading Skeleton ── */}
      {loading && orders.length === 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="bg-white rounded-3xl p-5 border border-slate-100 shadow-2xs animate-pulse space-y-4">
              <div className="flex justify-between items-center">
                <div className="w-24 h-4 bg-slate-200 rounded-md" />
                <div className="w-20 h-6 bg-slate-100 rounded-full" />
              </div>
              <div className="w-40 h-5 bg-slate-200 rounded-md" />
              <div className="w-full h-10 bg-slate-100 rounded-2xl" />
            </div>
          ))}
        </div>
      )}

      {/* ── Empty State ── */}
      {!loading && filteredOrders.length === 0 && (
        <div className="text-center mt-5 h-full p-4 bg-white rounded-3xl border-2 border-dashed border-slate-200 shadow-2xs space-y-4">
          <div className="w-14 h-14 bg-slate-50 text-slate-400 rounded-2xl flex items-center justify-center mx-auto">
            <ShoppingBag className="w-7 h-7" />
          </div>
          <div>
            <h3 className="font-extrabold text-slate-800 text-base">No Laundry Jobs in this View</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              {searchQuery
                ? `No orders matching "${searchQuery}". Clear your search query to see active jobs.`
                : 'No laundry batches currently in this processing stage. Scan a new bag at intake to start.'}
            </p>
          </div>
          {onNavigateTab && (
            <button
              type="button"
              onClick={() => onNavigateTab('qr_scan')}
              className="px-5 py-2.5 bg-[#03045E] text-white rounded-xl text-xs font-bold hover:bg-[#023E8A] transition-colors shadow-xs cursor-pointer"
            >
              Open QR Intake Terminal
            </button>
          )}
        </div>
      )}

      {/* ── VIEW 1: SMART JOB CARDS (High-Action Cards) ── */}
      {!loading && viewMode === 'grid' && filteredOrders.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {filteredOrders.map(order => {
            const step = getStepConfig(order.status);
            const nextStatus = getNextStatus(order.status);
            const isUpdating = updatingOrderId === order.id;
            const isMenuOpen = stageMenuOpenOrderId === order.id;
            const stepIndex = WORKFLOW.findIndex(w => w.value === order.status);

            return (
              <div
                key={order.id}
                className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs hover:shadow-md transition-all flex flex-col justify-between space-y-4 relative group"
              >
                {/* Top Row: Order ID, QR Tag & Status */}
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-black text-sm text-[#03045E] tracking-tight">{order.id}</span>
                      <span className="font-mono text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200/50">
                        {order.bagQr}
                      </span>
                    </div>

                    <span className={`px-2.5 py-1 rounded-full text-[11px] font-extrabold border flex items-center gap-1 ${step.badgeBg} ${step.badgeText}`}>
                      <span>{step.emoji}</span>
                      <span>{step.shortLabel}</span>
                    </span>
                  </div>

                  {/* Customer & Service Info */}
                  <div>
                    <div className="flex items-center justify-between gap-1">
                      <h3 className="font-extrabold text-sm text-slate-900 truncate">{order.customerName}</h3>
                      {order.customerPhone && (
                        <span className="text-[11px] font-mono text-slate-400 font-medium shrink-0">{order.customerPhone}</span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 font-medium truncate mt-0.5">
                      {order.serviceType} • <span className="font-bold text-slate-700">{order.weightKg} kg</span> • {order.itemCount} piece(s)
                    </p>
                  </div>

                  {/* Surcharge alert chip if any */}
                  {order.hasPendingCharge && (
                    <div className="p-2 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-1.5 text-[11px] font-bold text-amber-800">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                      <span>Additional weight surcharge (+£{order.additionalChargeAmount?.toFixed(2)}) pending sign-off.</span>
                    </div>
                  )}

                  {/* Customer special instructions alert */}
                  {order.specialInstructions && (
                    <div className="p-2 bg-blue-50/70 border border-blue-200/60 rounded-xl text-[11px] text-blue-900 font-medium line-clamp-1">
                      <span className="font-bold">Note: </span>{order.specialInstructions}
                    </div>
                  )}

                  {/* Visual Step Progress Strip */}
                  <div className="space-y-1 pt-1">
                    <div className="flex items-center justify-between text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                      <span>Workflow Progression</span>
                      <span className="text-[#0077B6] font-mono">Step {stepIndex + 1} of {WORKFLOW.length}</span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden flex gap-0.5">
                      {WORKFLOW.map((w, idx) => (
                        <div
                          key={w.value}
                          className={`flex-1 h-full rounded-full transition-all ${idx <= stepIndex ? 'bg-[#0077B6]' : 'bg-slate-200'
                            }`}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                {/* Bottom Row: The Big Action Button + Utility Controls */}
                <div className="pt-3 border-t border-slate-100 flex items-center gap-2">
                  {/* View Details Button */}
                  <button
                    type="button"
                    onClick={() => setDetailOrder(order)}
                    className="p-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
                    title="View Garment Manifest & Job Sheet"
                  >
                    <Eye className="w-4 h-4" />
                  </button>

                  {/* The Single Big Next Action Button */}
                  {order.status === 'ready_for_delivery' ? (
                    <div className="flex-1 py-3 px-4 bg-emerald-50 text-emerald-800 rounded-2xl text-xs font-black flex items-center justify-center gap-2 border border-emerald-200">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>Ready for Driver Handover</span>
                    </div>
                  ) : order.status === 'quality_check' ? (
                    <button
                      type="button"
                      onClick={() => onNavigateTab && onNavigateTab('qc')}
                      className="flex-1 py-3 px-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white rounded-2xl text-xs font-black shadow-md shadow-amber-500/20 transition-all cursor-pointer flex items-center justify-center gap-1.5 active:scale-98"
                    >
                      <ShieldCheck className="w-4 h-4" />
                      <span>Open in Quality Station</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={isUpdating}
                      onClick={() => handleAdvanceStatus(order)}
                      className="flex-1 py-3 px-4 bg-[#03045E] hover:bg-[#023E8A] disabled:opacity-50 text-white rounded-2xl text-xs font-black shadow-md shadow-[#03045E]/15 transition-all cursor-pointer flex items-center justify-center gap-2 active:scale-98"
                    >
                      {isUpdating ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin text-[#48CAE4]" />
                          <span>Advancing...</span>
                        </>
                      ) : (
                        <>
                          <span>{step.nextStepLabel}</span>
                          <ArrowRight className="w-4 h-4 text-[#48CAE4]" />
                        </>
                      )}
                    </button>
                  )}

                  {/* Quick Stage Dropdown Menu */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setStageMenuOpenOrderId(isMenuOpen ? null : order.id)}
                      className="p-2.5 rounded-2xl border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors cursor-pointer"
                      title="Jump or Override Stage"
                    >
                      <ChevronDown className="w-4 h-4" />
                    </button>

                    {isMenuOpen && (
                      <div className="absolute right-0 bottom-full mb-2 w-48 bg-white rounded-2xl shadow-xl border border-slate-100 p-1.5 z-30 space-y-0.5 animate-in fade-in zoom-in-95 duration-100 text-left">
                        <div className="px-2.5 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                          Select Specific Stage:
                        </div>
                        {WORKFLOW.map(w => (
                          <button
                            key={w.value}
                            type="button"
                            onClick={() => executeStageTransition(order.id, w.value, order.bagQr)}
                            className={`w-full text-left px-2.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-colors cursor-pointer ${order.status === w.value ? 'bg-[#03045E] text-white' : 'text-slate-700 hover:bg-slate-100'
                              }`}
                          >
                            <span>{w.emoji}</span>
                            <span className="truncate">{w.label}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── VIEW 2: KANBAN PIPELINE BOARD ── */}
      {!loading && viewMode === 'kanban' && filteredOrders.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5 items-start">
          {KANBAN_COLUMNS.map(col => {
            const columnOrders = filteredOrders.filter(o => col.statuses.includes(o.status));
            return (
              <div key={col.id} className="bg-slate-100/70 rounded-3xl p-4 border border-slate-200/80 space-y-3 min-h-[500px]">
                <div className="flex items-center justify-between pb-1">
                  <div>
                    <h3 className="font-extrabold text-xs text-slate-900">{col.title}</h3>
                    <p className="text-[10px] text-slate-400">{col.subtitle}</p>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-[11px] font-mono font-black border ${col.badgeColor}`}>
                    {columnOrders.length}
                  </span>
                </div>

                <div className="space-y-3">
                  {columnOrders.length === 0 ? (
                    <div className="py-12 text-center text-slate-400 text-xs border-2 border-dashed border-slate-200 rounded-2xl">
                      Empty Lane
                    </div>
                  ) : (
                    columnOrders.map(order => {
                      const step = getStepConfig(order.status);
                      const isUpdating = updatingOrderId === order.id;

                      return (
                        <div
                          key={order.id}
                          className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs space-y-3 hover:shadow-sm transition-all"
                        >
                          <div className="flex items-center justify-between gap-1">
                            <span className="font-mono font-black text-xs text-[#03045E]">{order.id}</span>
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${step.badgeBg} ${step.badgeText}`}>
                              {step.emoji} {step.shortLabel}
                            </span>
                          </div>

                          <div>
                            <p className="font-extrabold text-xs text-slate-900 truncate">{order.customerName}</p>
                            <p className="text-[11px] text-slate-500 truncate">{order.serviceType} · {order.weightKg} kg</p>
                          </div>

                          <div className="flex items-center gap-1.5 pt-1 border-t border-slate-100">
                            <button
                              type="button"
                              onClick={() => setDetailOrder(order)}
                              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold cursor-pointer"
                              title="Details"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>

                            {order.status === 'quality_check' ? (
                              <button
                                type="button"
                                onClick={() => onNavigateTab && onNavigateTab('qc')}
                                className="flex-1 py-2 px-3 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-1"
                              >
                                <ShieldCheck className="w-3.5 h-3.5" />
                                <span>Inspect QC</span>
                              </button>
                            ) : order.status === 'ready_for_delivery' ? (
                              <div className="flex-1 py-2 px-2 bg-emerald-50 text-emerald-800 rounded-xl text-[11px] font-bold text-center border border-emerald-200">
                                Dispatched
                              </div>
                            ) : (
                              <button
                                type="button"
                                disabled={isUpdating}
                                onClick={() => handleAdvanceStatus(order)}
                                className="flex-1 py-2 px-3 bg-[#03045E] hover:bg-[#023E8A] text-white rounded-xl text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-1"
                              >
                                {isUpdating ? (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                  <>
                                    <span>Advance</span>
                                    <ArrowRight className="w-3.5 h-3.5 text-[#48CAE4]" />
                                  </>
                                )}
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── SLIDE-OVER DRAWER: Comprehensive Job Manifest & Sheet ── */}
      {detailOrder && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-end bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={() => setDetailOrder(null)}
        >
          <div
            className="w-full max-w-lg h-full bg-white shadow-2xl p-6 sm:p-7 space-y-6 overflow-y-auto animate-in slide-in-from-right duration-200 flex flex-col justify-between"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="space-y-5">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-black text-lg text-[#03045E]">{detailOrder.id}</span>
                    <span className="font-mono text-xs font-bold text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-lg border border-slate-200">
                      {detailOrder.bagQr}
                    </span>
                  </div>
                  <h3 className="font-extrabold text-base text-slate-900 mt-1">{detailOrder.customerName}</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setDetailOrder(null)}
                  className="p-2 rounded-xl text-slate-400 hover:text-slate-600 bg-slate-100 hover:bg-slate-200 cursor-pointer transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Status Banner */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Current Processing Stage</span>
                  <span className="font-black text-sm text-[#03045E] mt-0.5 block">{getStepConfig(detailOrder.status).label}</span>
                </div>
                <span className="text-2xl">{getStepConfig(detailOrder.status).emoji}</span>
              </div>

              {/* Garment Details & Weight */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100">
                  <span className="text-slate-400 font-bold uppercase text-[9px] block">Scale Weight</span>
                  <span className="font-black text-sm text-slate-900 mt-0.5 block flex items-center gap-1">
                    <Weight className="w-4 h-4 text-slate-500" /> {detailOrder.weightKg} kg
                  </span>
                </div>
                <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100">
                  <span className="text-slate-400 font-bold uppercase text-[9px] block">Total Order Amount</span>
                  <span className="font-black text-sm text-[#03045E] mt-0.5 block">£{detailOrder.total.toFixed(2)}</span>
                </div>
              </div>

              {/* Customer Contact */}
              {detailOrder.customerPhone && (
                <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between text-xs">
                  <div>
                    <span className="text-slate-400 font-bold uppercase text-[9px] block">Customer Phone</span>
                    <span className="font-bold text-slate-900 mt-0.5 block">{detailOrder.customerPhone}</span>
                  </div>
                  <a
                    href={`tel:${detailOrder.customerPhone}`}
                    className="p-2 rounded-xl bg-white hover:bg-slate-100 text-[#0077B6] border border-slate-200 cursor-pointer transition-colors"
                  >
                    <Phone className="w-4 h-4" />
                  </a>
                </div>
              )}

              {/* Customer Special Care Instructions */}
              {detailOrder.specialInstructions && (
                <div className="p-4 bg-blue-50/70 border border-blue-200 rounded-2xl space-y-1 text-xs text-blue-900">
                  <span className="font-bold uppercase text-[10px] tracking-wider block text-blue-700">Special Instructions</span>
                  <p className="italic leading-relaxed">{detailOrder.specialInstructions}</p>
                </div>
              )}

              {/* Item Manifest Breakdown */}
              <div className="space-y-2">
                <span className="text-xs font-black uppercase tracking-wider text-slate-900 block">
                  Garment Manifest Pieces ({detailOrder.rawItems?.length || detailOrder.itemCount})
                </span>
                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                  {detailOrder.rawItems && detailOrder.rawItems.length > 0 ? (
                    detailOrder.rawItems.map((it, idx) => (
                      <div key={idx} className="p-2.5 bg-slate-50 rounded-xl border border-slate-200/80 flex items-center justify-between text-xs">
                        <span className="font-bold text-slate-800">{it.name || it.description || 'Garment Item'}</span>
                        <span className="font-mono text-slate-500 font-bold">x{it.quantity || 1}</span>
                      </div>
                    ))
                  ) : (
                    <div className="p-3 bg-slate-50 rounded-xl text-xs text-slate-500">
                      Standard Laundry Bundle ({detailOrder.serviceType})
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Drawer Bottom Actions */}
            <div className="pt-4 border-t border-slate-100 flex items-center gap-3">
              <button
                type="button"
                onClick={() => setDetailOrder(null)}
                className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-2xl text-xs transition-colors cursor-pointer"
              >
                Close Drawer
              </button>
              {detailOrder.status !== 'ready_for_delivery' && (
                <button
                  type="button"
                  onClick={() => {
                    handleAdvanceStatus(detailOrder);
                    setDetailOrder(null);
                  }}
                  className="flex-1 py-3 bg-[#03045E] hover:bg-[#023E8A] text-white font-black rounded-2xl text-xs transition-all shadow-md cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <span>{getStepConfig(detailOrder.status).nextStepLabel}</span>
                  <ArrowRight className="w-3.5 h-3.5 text-[#48CAE4]" />
                </button>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
