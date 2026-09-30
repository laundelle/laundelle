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
  ShieldCheck
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

interface ProcessorOrder {
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
  backendOrder?: any;
}

interface ProcessorOrdersViewProps {
  onNavigateTab?: (tab: 'qr_scan' | 'orders' | 'qc' | 'history' | 'profile') => void;
}

// ─── Workflow Steps Config ─────────────────────────────────────────────────────

const WORKFLOW: { value: ProcessorStatus; label: string; emoji: string }[] = [
  { value: 'received', label: 'Received', emoji: '📦' },
  { value: 'sorting', label: 'Sorting', emoji: '🗂️' },
  { value: 'washing', label: 'Washing', emoji: '🔄' },
  { value: 'drying', label: 'Drying', emoji: '💨' },
  { value: 'ironing', label: 'Ironing', emoji: '👔' },
  { value: 'folding', label: 'Folding', emoji: '🧺' },
  { value: 'quality_check', label: 'Quality Check', emoji: '🔍' },
  { value: 'ready_for_delivery', label: 'Ready for Delivery', emoji: '✅' },
];

const normalizeStatus = (s: string): ProcessorStatus => {
  if (!s) return 'received';
  if (s === 'received_at_facility' || s === 'processor_assigned' || s === 'booking_confirmed' || s === 'driver_assigned' || s === 'laundry_collected') return 'received';
  if (s === 'qc_ready' || s === 'ready_for_qc') return 'quality_check';
  if (['received', 'sorting', 'washing', 'drying', 'ironing', 'folding', 'quality_check', 'ready_for_delivery'].includes(s)) {
    return s as ProcessorStatus;
  }
  return 'washing';
};

const statusIndex = (s: ProcessorStatus) => WORKFLOW.findIndex(w => w.value === s);

// ─── Status Badge ──────────────────────────────────────────────────────────────

function StatusBadge({ status, hasPendingCharge }: { status: ProcessorStatus; hasPendingCharge?: boolean }) {
  const step = WORKFLOW.find(w => w.value === status);
  if (!step) return null;

  const colorMap: Record<ProcessorStatus, string> = {
    received: 'bg-slate-100 text-slate-700 border-slate-200',
    sorting: 'bg-blue-50 text-blue-700 border-blue-200',
    washing: 'bg-cyan-50 text-cyan-700 border-cyan-200',
    drying: 'bg-sky-50 text-sky-700 border-sky-200',
    ironing: 'bg-purple-50 text-purple-700 border-purple-200',
    folding: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    quality_check: 'bg-amber-50 text-amber-700 border-amber-200',
    ready_for_delivery: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  };

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-extrabold border ${colorMap[status]}`}>
        <span>{step.emoji}</span> {step.label}
      </span>
      {hasPendingCharge && (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-50 text-amber-700 border border-amber-200">
          <AlertTriangle className="w-3 h-3 text-amber-500" /> Surcharge Review
        </span>
      )}
    </div>
  );
}

// ─── Workflow Progress Bar ─────────────────────────────────────────────────────

function WorkflowProgress({ status }: { status: ProcessorStatus }) {
  const current = statusIndex(status);

  return (
    <div className="w-full space-y-1.5">
      <div className="flex items-center justify-between gap-1 overflow-x-auto pb-1">
        {WORKFLOW.map((step, idx) => {
          const done = idx < current;
          const active = idx === current;
          return (
            <React.Fragment key={step.value}>
              <div
                title={step.label}
                className={`flex items-center justify-center w-6 h-6 rounded-full text-[10px] font-black shrink-0 transition-all ${done
                    ? 'bg-emerald-500 text-white shadow-xs'
                    : active
                      ? 'bg-[#0077B6] text-white ring-2 ring-[#0077B6]/30 shadow-xs'
                      : 'bg-gray-100 text-gray-400'
                  }`}
              >
                {done ? '✓' : idx + 1}
              </div>
              {idx < WORKFLOW.length - 1 && (
                <div
                  className={`flex-1 h-0.5 min-w-[10px] rounded-full transition-all ${idx < current ? 'bg-emerald-400' : 'bg-gray-200'
                    }`}
                />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}

// ─── Main View Component ───────────────────────────────────────────────────────

export const ProcessorOrdersView: React.FC<ProcessorOrdersViewProps> = ({ onNavigateTab }) => {
  const [orders, setOrders] = useState<ProcessorOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterTab, setFilterTab] = useState<'all' | 'active' | 'washing' | 'sorting' | 'qc' | 'ready'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);
  const [lastSyncedAt, setLastSyncedAt] = useState<string>('');
  const [qcNotificationModal, setQcNotificationModal] = useState<{
    orderId: string;
    customerName: string;
    serviceType: string;
  } | null>(null);

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
          customerPhone: o.customerPhone || o.phone || '',
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
          backendOrder: o
        }));
        setOrders(mapped);
        setLastSyncedAt(new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      }
    } catch (e) {
      console.error('Error fetching processor jobs:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
    const interval = setInterval(() => loadOrders(), 8000);
    const handleExternalUpdate = () => loadOrders();

    window.addEventListener('l2u_processor_orders_changed', handleExternalUpdate);
    window.addEventListener('l2u_orders_change', handleExternalUpdate);

    return () => {
      clearInterval(interval);
      window.removeEventListener('l2u_processor_orders_changed', handleExternalUpdate);
      window.removeEventListener('l2u_orders_change', handleExternalUpdate);
    };
  }, []);

  const handleStatusChange = async (orderId: string, newStatus: ProcessorStatus) => {
    const order = orders.find(o => o.id === orderId);
    if (!order) return;

    // When processor completes washing or clicks 'ready_for_delivery', route to Quality page first
    let effectiveStatus = newStatus;
    let isRoutingToQC = false;
    if (newStatus === 'ready_for_delivery' && order.status !== 'ready_for_delivery') {
      effectiveStatus = 'quality_check';
      isRoutingToQC = true;
    }

    setUpdatingOrderId(orderId);
    // Optimistic UI update
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: effectiveStatus } : o));

    try {
      const rawSession = localStorage.getItem('l2u_auth_session');
      const token = rawSession ? JSON.parse(rawSession).token : null;
      const res = await apiFetch(`/api/v1/processor/jobs/${orderId}/stage`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ nextStage: effectiveStatus, qrCode: order.bagQr })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update stage');

      if (isRoutingToQC || data.routedToQC || effectiveStatus === 'quality_check') {
        setQcNotificationModal({
          orderId: order.id,
          customerName: order.customerName,
          serviceType: order.serviceType
        });
      }

      await loadOrders();
    } catch (e: any) {
      alert(e.message || 'Error updating status');
      await loadOrders(); // revert
    } finally {
      setUpdatingOrderId(null);
    }
  };

  // Filtered orders list
  const filteredOrders = useMemo(() => {
    return orders.filter(o => {
      // Search match
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchId = o.id.toLowerCase().includes(q);
        const matchCustomer = o.customerName.toLowerCase().includes(q);
        const matchQr = o.bagQr.toLowerCase().includes(q);
        const matchService = o.serviceType.toLowerCase().includes(q);
        if (!matchId && !matchCustomer && !matchQr && !matchService) return false;
      }

      // Tab filter
      if (filterTab === 'active') return o.status !== 'ready_for_delivery';
      if (filterTab === 'washing') return o.status === 'washing';
      if (filterTab === 'sorting') return o.status === 'sorting';
      if (filterTab === 'qc') return o.status === 'quality_check';
      if (filterTab === 'ready') return o.status === 'ready_for_delivery';
      return true;
    });
  }, [orders, searchQuery, filterTab]);

  const activeOrdersCount = orders.filter(o => o.status !== 'ready_for_delivery').length;
  const inWashingCount = orders.filter(o => o.status === 'washing').length;
  const inSortingCount = orders.filter(o => o.status === 'sorting').length;
  const readyCount = orders.filter(o => o.status === 'ready_for_delivery').length;

  return (
    <div className="w-full min-h-screen bg-[#f8fafc] p-4 pb-28 md:pb-10 space-y-5">

      {/* Metric Quick Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        {[
          { label: 'Active Jobs', value: activeOrdersCount, color: 'text-[#0077B6]', bg: 'bg-[#CAF0F8]/50', icon: ShoppingBag },
          { label: 'In Washing', value: inWashingCount, color: 'text-cyan-700', bg: 'bg-cyan-50', icon: Sparkles },
          { label: 'In Sorting', value: inSortingCount, color: 'text-blue-700', bg: 'bg-blue-50', icon: Layers },
          { label: 'Ready / Sealed', value: readyCount, color: 'text-emerald-700', bg: 'bg-emerald-50', icon: CheckCircle2 },
        ].map(stat => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className={`${stat.bg} rounded-2xl p-3.5 flex items-center justify-between border border-black/5`}>
              <div>
                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">{stat.label}</p>
                <p className={`text-2xl font-black mt-0.5 ${stat.color}`}>{stat.value}</p>
              </div>
              <div className="w-8 h-8 rounded-xl bg-white/70 flex items-center justify-center shadow-2xs">
                <Icon className={`w-4 h-4 ${stat.color}`} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Search & Filter Tabs */}
      <div className="space-y-3">
        {/* Search Bar */}
        <div className="relative">
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by Order #, Customer name, QR Bag tag..."
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-xs font-medium text-gray-800 placeholder-gray-400 focus:ring-2 focus:ring-[#0077B6] focus:border-[#0077B6] focus:outline-hidden shadow-2xs"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-2.5 text-xs text-gray-400 hover:text-gray-600 font-bold"
            >
              Clear
            </button>
          )}
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs font-bold">
          {[
            { id: 'all' as const, label: 'All Jobs', count: orders.length },
            { id: 'active' as const, label: 'Active', count: activeOrdersCount },
            { id: 'washing' as const, label: 'Washing', count: inWashingCount },
            { id: 'sorting' as const, label: 'Sorting', count: inSortingCount },
            { id: 'qc' as const, label: 'QC', count: orders.filter(o => o.status === 'quality_check').length },
            { id: 'ready' as const, label: 'Ready', count: readyCount },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setFilterTab(tab.id)}
              className={`px-3 py-1.5 rounded-xl whitespace-nowrap transition-all cursor-pointer ${filterTab === tab.id
                  ? 'bg-[#03045E] text-white shadow-xs'
                  : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
                }`}
            >
              {tab.label} <span className="text-[10px] opacity-75 font-semibold">({tab.count})</span>
            </button>
          ))}
        </div>
      </div>

      {/* Loading Skeleton */}
      {loading && orders.length === 0 && (
        <div className="space-y-3 py-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-white rounded-3xl p-4 border border-gray-100 shadow-2xs animate-pulse flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gray-200 rounded-xl" />
                <div className="space-y-1.5">
                  <div className="w-24 h-4 bg-gray-200 rounded-md" />
                  <div className="w-40 h-3 bg-gray-100 rounded-md" />
                </div>
              </div>
              <div className="w-16 h-6 bg-gray-100 rounded-full" />
            </div>
          ))}
        </div>
      )}

      {/* Orders List */}
      {!loading && filteredOrders.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-[11px] font-bold text-gray-400 uppercase tracking-wider px-1">
            <span>Orders ({filteredOrders.length})</span>
            {lastSyncedAt && <span>Updated {lastSyncedAt}</span>}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4.5">
            {filteredOrders.map(order => {
              const isExpanded = expandedId === order.id;
              const isUpdating = updatingOrderId === order.id;

              return (
                <div
                  key={order.id}
                  className={`bg-white rounded-3xl shadow-2xs border transition-all overflow-hidden ${order.hasPendingCharge ? 'border-amber-200 ring-1 ring-amber-200/50' : 'border-gray-100 hover:border-gray-200'
                    }`}
                >
                  {/* Header Card Row */}
                  <div
                    className="p-4 flex items-center justify-between cursor-pointer select-none hover:bg-gray-50/60 transition-colors"
                    onClick={() => setExpandedId(isExpanded ? null : order.id)}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-11 h-11 bg-[#CAF0F8] text-[#0077B6] rounded-2xl flex items-center justify-center shrink-0 shadow-2xs">
                        <ShoppingBag className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono font-black text-[#03045E] text-sm tracking-tight">{order.id}</span>
                          <StatusBadge status={order.status} hasPendingCharge={order.hasPendingCharge} />
                        </div>
                        <p className="text-xs text-gray-600 font-semibold truncate mt-0.5">
                          {order.customerName} · <span className="text-gray-400 font-normal">{order.serviceType}</span>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="font-mono font-extrabold text-xs text-gray-900 hidden sm:inline">
                        £{order.total.toFixed(2)}
                      </span>
                      <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center">
                        <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
                      </div>
                    </div>
                  </div>

                  {/* Surcharge Alert Banner */}
                  {order.hasPendingCharge && (
                    <div className="mx-4 mb-2 p-2.5 bg-amber-50 border border-amber-200 rounded-2xl flex items-center justify-between text-xs text-amber-800">
                      <div className="flex items-center gap-2 font-medium">
                        <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                        <span>Additional weight surcharge (+£{order.additionalChargeAmount?.toFixed(2)}) is awaiting customer sign-off.</span>
                      </div>
                    </div>
                  )}

                  {/* Expanded Details */}
                  {isExpanded && (
                    <div className="border-t border-gray-100 p-4 pt-3 space-y-4 bg-slate-50/50">
                      {/* Info Grid */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs bg-white p-3.5 rounded-2xl border border-gray-100 shadow-2xs">
                        <div>
                          <p className="text-gray-400 font-bold uppercase text-[9px] tracking-wider">Customer Contact</p>
                          <p className="font-semibold text-gray-900 truncate mt-0.5">{order.customerName}</p>
                          {order.customerPhone && (
                            <p className="text-[10px] text-gray-500 font-mono flex items-center gap-1 mt-0.5">
                              <Phone className="w-3 h-3 text-gray-400" /> {order.customerPhone}
                            </p>
                          )}
                        </div>

                        <div>
                          <p className="text-gray-400 font-bold uppercase text-[9px] tracking-wider">Bag QR Tag</p>
                          <p className="font-mono font-bold text-gray-900 truncate mt-0.5">{order.bagQr}</p>
                          <p className="text-[10px] text-gray-400 font-medium">Scanned: {order.scannedAt}</p>
                        </div>

                        <div>
                          <p className="text-gray-400 font-bold uppercase text-[9px] tracking-wider">Scale Weight</p>
                          <p className="font-bold text-gray-900 mt-0.5 flex items-center gap-1">
                            <Weight className="w-3.5 h-3.5 text-gray-400" /> {order.weightKg} kg
                          </p>
                          <p className="text-[10px] text-gray-400 font-medium">{order.itemCount} items listed</p>
                        </div>

                        <div>
                          <p className="text-gray-400 font-bold uppercase text-[9px] tracking-wider">Order Amount</p>
                          <p className="font-black text-gray-900 mt-0.5 text-sm text-[#03045E]">£{order.total.toFixed(2)}</p>
                          <p className="text-[10px] text-emerald-600 font-bold">Paid online</p>
                        </div>
                      </div>

                      {/* Progress Bar */}
                      <div className="bg-white p-3 rounded-2xl border border-gray-100 shadow-2xs space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Processing Flow</span>
                          <span className="text-[10px] font-bold text-[#0077B6]">Step {statusIndex(order.status) + 1} of {WORKFLOW.length}</span>
                        </div>
                        <WorkflowProgress status={order.status} />
                      </div>

                      {/* Stage Action Buttons */}
                      <div className="bg-white p-3.5 rounded-2xl border border-gray-100 shadow-2xs space-y-2.5">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                          Update Processing Stage
                        </p>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                          {WORKFLOW.map((step) => {
                            const isActive = order.status === step.value;
                            const isDone = statusIndex(order.status) > statusIndex(step.value);

                            return (
                              <button
                                key={step.value}
                                disabled={isUpdating}
                                onClick={() => handleStatusChange(order.id, step.value)}
                                className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-bold transition-all border cursor-pointer ${isActive
                                    ? 'bg-[#03045E] text-white border-[#03045E] shadow-sm scale-[1.02]'
                                    : isDone
                                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                                      : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100 hover:text-gray-900'
                                  } ${isUpdating ? 'opacity-50 cursor-wait' : ''}`}
                              >
                                {isDone ? (
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                ) : isActive ? (
                                  isUpdating ? (
                                    <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
                                  ) : (
                                    <Sparkles className="w-3.5 h-3.5 text-[#48CAE4] shrink-0" />
                                  )
                                ) : (
                                  <Circle className="w-3.5 h-3.5 text-gray-300 shrink-0" />
                                )}
                                <span className="truncate">{step.emoji} {step.label}</span>
                              </button>
                            );
                          })}
                        </div>

                        {/* Quick Action Handover Bar */}
                        {['washing', 'drying', 'ironing', 'folding'].includes(order.status) && (
                          <div className="pt-2 border-t border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <span className="text-[11px] text-gray-500 font-medium">
                              Washing & processing done? Send garments to Quality Check before customer delivery.
                            </span>
                            <button
                              type="button"
                              disabled={isUpdating}
                              onClick={() => handleStatusChange(order.id, 'quality_check')}
                              className="px-3.5 py-2 bg-gradient-to-r from-[#03045E] to-[#0077B6] hover:from-[#023E8A] hover:to-[#0096C7] text-white rounded-xl text-xs font-black transition-all shadow-xs cursor-pointer flex items-center justify-center gap-1.5 shrink-0 active:scale-95"
                            >
                              <Search className="w-3.5 h-3.5 text-[#48CAE4]" />
                              <span>Send to Quality Check</span>
                              <ArrowRight className="w-3 h-3 text-white/70" />
                            </button>
                          </div>
                        )}

                        {order.status === 'quality_check' && (
                          <div className="pt-2 border-t border-amber-100 bg-amber-50/70 p-2.5 rounded-xl flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                              <span className="text-xs font-bold text-amber-900">In Quality Assurance Inspection</span>
                            </div>
                            {onNavigateTab && (
                              <button
                                type="button"
                                onClick={() => onNavigateTab('qc')}
                                className="px-3 py-1.5 bg-[#03045E] hover:bg-[#023E8A] text-white rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1 shrink-0"
                              >
                                <span>Inspect in Quality Page</span>
                                <ArrowRight className="w-3 h-3 text-white/70" />
                              </button>
                            )}
                          </div>
                        )}

                        {order.status === 'ready_for_delivery' && (
                          <div className="pt-2 border-t border-emerald-100 bg-emerald-50/70 p-2.5 rounded-xl flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                              <span className="text-xs font-bold text-emerald-900">Quality Passed • Ready for Driver Delivery</span>
                            </div>
                            <span className="text-[10px] font-extrabold uppercase px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded-lg shrink-0">
                              Awaiting Driver
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Empty State */}
      {!loading && filteredOrders.length === 0 && (
        <div className="text-center py-16 px-4 bg-white rounded-3xl border border-dashed border-gray-200 shadow-2xs space-y-4">
          <div className="w-14 h-14 bg-slate-50 text-slate-400 rounded-2xl flex items-center justify-center mx-auto">
            <ShoppingBag className="w-7 h-7" />
          </div>
          <div>
            <p className="font-extrabold text-gray-800 text-base">No orders in this view</p>
            <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
              {searchQuery
                ? `No orders matching "${searchQuery}". Try clearing your search.`
                : filterTab !== 'all'
                  ? 'No orders in this specific stage. View all jobs or scan a new bag.'
                  : 'Scan laundry bag QR codes at the intake station to take them for sorting & washing.'}
            </p>
          </div>
          {onNavigateTab && (
            <button
              onClick={() => onNavigateTab('qr_scan')}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#03045E] hover:bg-[#023E8A] text-white rounded-2xl text-xs font-black shadow-md shadow-[#03045E]/10 cursor-pointer transition-all active:scale-95"
            >
              <QrCode className="w-4 h-4 text-[#48CAE4]" />
              <span>Scan Bag QR Now</span>
            </button>
          )}
        </div>
      )}

      {/* ─── Sent to Quality Check Notification Modal ──────────────────────── */}
      {qcNotificationModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={() => setQcNotificationModal(null)}
        >
          <div
            className="relative w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl border border-gray-100 text-center space-y-4 animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-16 h-16 bg-[#CAF0F8] text-[#0077B6] rounded-3xl flex items-center justify-center mx-auto shadow-inner">
              <ShieldCheck className="w-8 h-8 text-[#0077B6]" />
            </div>

            <div>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-blue-50 text-blue-700 border border-blue-200">
                Washing Finished • Mandatory QC
              </span>
              <h3 className="text-lg font-black text-[#03045E] mt-1 tracking-tight">
                Sent to Quality Page
              </h3>
              <p className="text-xs text-gray-500 mt-1.5 leading-relaxed">
                Order <span className="font-mono font-bold text-gray-800">{qcNotificationModal.orderId}</span> ({qcNotificationModal.customerName}) has been sent to the <span className="font-bold text-[#0077B6]">Quality Assurance page</span> to inspect the cleanliness and finish of the clothes before releasing to a delivery driver.
              </p>
            </div>

            <div className="p-3 bg-slate-50 rounded-2xl border border-gray-100 text-left flex items-center justify-between text-xs">
              <span className="text-gray-500">Service Line:</span>
              <span className="font-bold text-gray-800 truncate max-w-[180px]">{qcNotificationModal.serviceType}</span>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => setQcNotificationModal(null)}
                className="flex-1 py-3 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-2xl text-xs font-bold transition-all cursor-pointer"
              >
                Keep Browsing Jobs
              </button>
              {onNavigateTab && (
                <button
                  type="button"
                  onClick={() => {
                    setQcNotificationModal(null);
                    onNavigateTab('qc');
                  }}
                  className="flex-1 py-3 px-4 bg-[#03045E] hover:bg-[#023E8A] text-white rounded-2xl text-xs font-black transition-all shadow-md shadow-[#03045E]/20 cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Search className="w-3.5 h-3.5 text-[#48CAE4]" />
                  <span>Open Quality Page</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
