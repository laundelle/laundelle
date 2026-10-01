'use client';
import { apiFetch } from '@laundelle/api-client';
import React, { useState, useEffect, useMemo } from 'react';
import {
  ClipboardCheck,
  CheckCircle2,
  AlertTriangle,
  X,
  ScanSearch,
  ShieldCheck,
  ArrowRight,
  Search,
  Check,
  Truck,
  ShoppingBag,
  Sparkles,
  RotateCcw,
  Clock,
  ChevronRight,
  Flame,
  CheckSquare,
  Wrench,
  Layers,
  HelpCircle,
  Copy,
  Info
} from 'lucide-react';

export interface QCItem {
  id?: string;
  name: string;
  qty: number;
  cleaning: 'pass' | 'fail';
  damage: 'none' | 'minor' | 'major';
  status: 'pass' | 'review' | 'fail';
  qcStatus?: 'PASSED' | 'REWASH';
  rewashReason?: string;
}

export interface QCOrder {
  id: string;
  customerName: string;
  customerPhone?: string;
  serviceType: string;
  itemCount: number;
  processorName: string;
  completionTime: string;
  bagQr: string;
  plantId?: string;
  specialInstructions?: string;
  items: QCItem[];
  hasRewash?: boolean;
}

interface ProcessorQCViewProps {
  onNavigateTab?: (tab: 'qr_scan' | 'orders' | 'qc' | 'history' | 'profile') => void;
}

// 9 Standardized QC Checkpoints grouped into 3 operational pillars
const QC_SECTIONS = [
  {
    title: '1. Cleanliness & Hygiene',
    icon: Sparkles,
    color: 'text-cyan-600 bg-cyan-50 border-cyan-200',
    items: [
      { id: 0, label: 'No remaining surface stains or blemishes', desc: 'Check collars, cuffs, and underarms' },
      { id: 1, label: 'Items completely dry — zero residual moisture', desc: 'Thermal dry test passed' },
      { id: 2, label: 'Garments thoroughly freshened & deodorized', desc: 'No damp odor or detergent residue' }
    ]
  },
  {
    title: '2. Finishing & Fabric Care',
    icon: Flame,
    color: 'text-purple-600 bg-purple-50 border-purple-200',
    items: [
      { id: 3, label: 'Steam ironing & crisp flat fold standards met', desc: 'Creases aligned, no wrinkle clusters' },
      { id: 4, label: 'Zero fabric tears, snags, shrinkage or damage', desc: 'Buttons, zippers & seams intact' },
      { id: 5, label: 'Customer special instructions verified', desc: 'Temperature, detergent or folding notes followed' }
    ]
  },
  {
    title: '3. Packaging & Tag Handover',
    icon: Layers,
    color: 'text-emerald-600 bg-emerald-50 border-emerald-200',
    items: [
      { id: 6, label: 'Manifest count exact match', desc: 'All itemized pieces present in bundle' },
      { id: 7, label: 'Package ID & Bag QR label confirmed', desc: 'Barcode / QR scanned & tag affixed' },
      { id: 8, label: 'Anti-static protective packaging sealed', desc: 'Awaiting driver collection rack' }
    ]
  }
];

const TOTAL_CHECKLIST_COUNT = 9;

const COMMON_REWASH_REASONS = [
  'Collar / Cuff Grease',
  'Food / Wine Stains',
  'Damp / Moisture',
  'Wrinkles / Pressing',
  'Lint / Pet Hair',
  'Fabric Odour'
];

export const ProcessorQCView: React.FC<ProcessorQCViewProps> = ({ onNavigateTab }) => {
  const [pendingOrders, setPendingOrders] = useState<QCOrder[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<QCOrder | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [queueFilter, setQueueFilter] = useState<'all' | 'ready' | 'rewash'>('all');
  const [loading, setLoading] = useState(true);

  // Checkpoints State (9 boolean flags)
  const [checklist, setChecklist] = useState<boolean[]>(Array(TOTAL_CHECKLIST_COUNT).fill(false));
  const [copiedId, setCopiedId] = useState(false);

  // General Issue & Notes
  const [issueType, setIssueType] = useState('');
  const [issueNotes, setIssueNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notificationToast, setNotificationToast] = useState<{ message: string; type: 'success' | 'warning' | 'error' } | null>(null);

  // Inline Item Rewash Reason Selector Modal
  const [rewashTargetItemIdx, setRewashTargetItemIdx] = useState<number | null>(null);
  const [customRewashReason, setCustomRewashReason] = useState('');

  // Machine Run Drawer / Dialog
  const [isMachineDrawerOpen, setIsMachineDrawerOpen] = useState(false);
  const [selectedMachineId, setSelectedMachineId] = useState('WASHER-01');
  const [cycleType, setCycleType] = useState('Intensive Stain Removal 60°C');
  const [temperature, setTemperature] = useState('60°C');
  const [durationMinutes, setDurationMinutes] = useState(45);
  const [machineRunSubmitting, setMachineRunSubmitting] = useState(false);

  // Machine Fault Dialog
  const [isFaultModalOpen, setIsFaultModalOpen] = useState(false);
  const [faultReason, setFaultReason] = useState('');

  // Driver Handover Success Screen
  const [deliverySuccessModal, setDeliverySuccessModal] = useState<{
    orderId: string;
    customerName: string;
    serviceType: string;
    bagQr: string;
    driverName?: string;
  } | null>(null);

  const showToast = (message: string, type: 'success' | 'warning' | 'error' = 'success') => {
    setNotificationToast({ message, type });
    setTimeout(() => {
      setNotificationToast(null);
    }, 4000);
  };

  const loadQCOrders = async () => {
    try {
      const rawSession = localStorage.getItem('l2u_auth_session');
      const token = rawSession ? JSON.parse(rawSession).token : null;
      const res = await apiFetch('/api/v1/processor/jobs', {
        headers: { ...(token ? { 'Authorization': `Bearer ${token}` } : {}) }
      });
      const data = await res.json();
      if (data.assigned) {
        const qcReady = data.assigned.filter((o: any) =>
          o.status === 'qc_ready' ||
          o.status === 'ready_for_qc' ||
          o.status === 'quality_check' ||
          o.status === 'folding' ||
          o.status === 'rewash_required'
        );

        const mapped: QCOrder[] = qcReady.map((o: any) => {
          const rawItems = o.orderItems && o.orderItems.length > 0
            ? o.orderItems
            : (o.items && o.items.length > 0 ? o.items : [{ name: o.service || 'Laundry Garments', quantity: 1 }]);
          return {
            id: o.publicId || o.orderNumber || o.id || o._id?.toString(),
            customerName: o.customerName || o.customer_name || 'Valued Customer',
            customerPhone: o.customerPhone || o.phone || '',
            serviceType: o.items?.[0]?.name || o.service || 'Laundry Service',
            itemCount: rawItems.length,
            processorName: o.processor?.name || 'Processing Line',
            completionTime: o.updated_at ? new Date(o.updated_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : '--:--',
            bagQr: o.package?.qr_code || o.qr_code || o.qr_tracking?.qrTagId || (o.publicId ? `BAG-${o.publicId}` : `BAG-${o.id}`),
            plantId: o.plant_id || o.plantId || 'PLANT-LON-01',
            specialInstructions: o.specialInstructions || '',
            hasRewash: o.status === 'rewash_required',
            items: rawItems.map((it: any, itIdx: number) => ({
              id: it.publicId || it.id || it._id?.toString() || `${o.publicId || o.id}-item-${itIdx}`,
              name: it.description || it.name || it.category || 'Garment Item',
              qty: it.quantity || 1,
              cleaning: it.qcStatus === 'REWASH' ? 'fail' : 'pass',
              damage: 'none',
              status: it.qcStatus === 'REWASH' ? 'fail' : 'pass',
              qcStatus: it.qcStatus === 'REWASH' ? 'REWASH' : 'PASSED',
              rewashReason: it.rewashReason || ''
            }))
          };
        });

        setPendingOrders(mapped);
        setSelectedOrder(prev => {
          if (!prev) return mapped[0] || null;
          const found = mapped.find(m => m.id === prev.id);
          return found || mapped[0] || null;
        });
      }
    } catch (e) {
      console.error('Error loading QC jobs:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadQCOrders();
    const interval = setInterval(loadQCOrders, 8000);
    return () => clearInterval(interval);
  }, []);

  // Reset verification checklist whenever active order changes
  useEffect(() => {
    if (selectedOrder) {
      setChecklist(Array(TOTAL_CHECKLIST_COUNT).fill(false));
      setIssueType('');
      setIssueNotes('');
    }
  }, [selectedOrder?.id]);

  const toggleChecklistItem = (index: number) => {
    setChecklist(prev => {
      const copy = [...prev];
      copy[index] = !copy[index];
      return copy;
    });
  };

  const handleSelectAllChecks = (value: boolean) => {
    setChecklist(Array(TOTAL_CHECKLIST_COUNT).fill(value));
  };

  // Flag Item for Rewash
  const handleConfirmItemRewash = (reason: string) => {
    if (rewashTargetItemIdx === null || !selectedOrder) return;
    const updatedItems = [...selectedOrder.items];
    updatedItems[rewashTargetItemIdx] = {
      ...updatedItems[rewashTargetItemIdx],
      qcStatus: 'REWASH',
      rewashReason: reason
    };
    setSelectedOrder({ ...selectedOrder, items: updatedItems });
    setRewashTargetItemIdx(null);
    setCustomRewashReason('');
    showToast(`Marked "${updatedItems[rewashTargetItemIdx].name}" for rewash.`, 'warning');
  };

  const handleClearItemRewash = (idx: number) => {
    if (!selectedOrder) return;
    const updatedItems = [...selectedOrder.items];
    updatedItems[idx] = {
      ...updatedItems[idx],
      qcStatus: 'PASSED',
      rewashReason: undefined
    };
    setSelectedOrder({ ...selectedOrder, items: updatedItems });
    showToast(`Cleared rewash flag on "${updatedItems[idx].name}".`, 'success');
  };

  // Submit QC Decision
  const submitQC = async (status: 'passed' | 'reprocess') => {
    if (!selectedOrder) return;
    setIsSubmitting(true);
    try {
      const rawSession = localStorage.getItem('l2u_auth_session');
      const token = rawSession ? JSON.parse(rawSession).token : null;

      const hasItemRewash = selectedOrder.items.some(it => it.qcStatus === 'REWASH');
      const effectiveStatus = (status === 'passed' && hasItemRewash) ? 'rewash' : (status === 'reprocess' ? 'rewash' : status);

      const checklistObj: Record<string, boolean> = {};
      let itemPointer = 0;
      QC_SECTIONS.forEach(sec => {
        sec.items.forEach(it => {
          checklistObj[it.label] = checklist[itemPointer];
          itemPointer++;
        });
      });

      const itemChecks = selectedOrder.items.map((it, idx) => ({
        itemId: it.id || `${selectedOrder.id}-item-${idx}`,
        passed: it.qcStatus !== 'REWASH',
        rewashRequired: it.qcStatus === 'REWASH',
        notes: it.rewashReason || issueNotes,
        reason: it.rewashReason || issueType || issueNotes
      }));

      const res = await apiFetch(`/api/v1/processor/jobs/${selectedOrder.id}/qc`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          status: effectiveStatus,
          notes: issueNotes || (effectiveStatus === 'passed' ? 'All 9 QC checkpoints verified' : 'Rewash requested by QC operator'),
          reason: issueType || issueNotes || 'Quality standard check',
          checklist: checklistObj,
          itemChecks
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'QC update failed');

      // Dispatch global listeners
      window.dispatchEvent(new CustomEvent('l2u_processor_orders_changed', { detail: { orderId: selectedOrder.id } }));
      window.dispatchEvent(new Event('l2u_orders_change'));

      if (effectiveStatus === 'passed') {
        setDeliverySuccessModal({
          orderId: selectedOrder.id,
          customerName: selectedOrder.customerName,
          serviceType: selectedOrder.serviceType,
          bagQr: selectedOrder.bagQr,
          driverName: data.driver?.name || data.assigned_driver_name
        });
        await loadQCOrders();
      } else {
        showToast(`Order #${selectedOrder.id} routed to rewash queue. Assign a machine below.`, 'warning');
        setIsMachineDrawerOpen(true);
        await loadQCOrders();
      }
    } catch (e: any) {
      showToast(e.message || 'Error recording QC status', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Start Machine Run for Rewash
  const handleStartMachineRun = async () => {
    if (!selectedOrder) return;
    setMachineRunSubmitting(true);
    try {
      const rawSession = localStorage.getItem('l2u_auth_session');
      const token = rawSession ? JSON.parse(rawSession).token : null;
      const res = await apiFetch('/api/v1/machines/runs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          machineId: selectedMachineId,
          plantId: selectedOrder.plantId || 'PLANT-LON-01',
          orderIds: [selectedOrder.id],
          cycleType,
          temperature,
          durationMinutes,
          notes: `QC Rewash batch for order #${selectedOrder.id}`
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to start machine run');

      showToast(`Machine run launched on ${selectedMachineId} for order #${selectedOrder.id}!`, 'success');
      setIsMachineDrawerOpen(false);
    } catch (e: any) {
      showToast(e.message || 'Error starting machine run', 'error');
    } finally {
      setMachineRunSubmitting(false);
    }
  };

  // Report Breakdown
  const handleReportMachineFault = async () => {
    if (!faultReason.trim()) return;
    try {
      const rawSession = localStorage.getItem('l2u_auth_session');
      const token = rawSession ? JSON.parse(rawSession).token : null;
      await apiFetch(`/api/v1/machines/${selectedMachineId}/fail`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ reason: faultReason })
      });
      showToast(`Machine #${selectedMachineId} logged under fault maintenance.`, 'warning');
      setIsFaultModalOpen(false);
      setIsMachineDrawerOpen(false);
      setFaultReason('');
    } catch {
      showToast('Machine failure alert dispatched to manager.', 'warning');
      setIsFaultModalOpen(false);
    }
  };

  const filteredOrders = useMemo(() => {
    return pendingOrders.filter(o => {
      if (queueFilter === 'ready' && o.hasRewash) return false;
      if (queueFilter === 'rewash' && !o.hasRewash) return false;
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        o.id.toLowerCase().includes(q) ||
        o.customerName.toLowerCase().includes(q) ||
        o.bagQr.toLowerCase().includes(q)
      );
    });
  }, [pendingOrders, queueFilter, searchQuery]);

  const checkedCount = checklist.filter(Boolean).length;
  const progressPercent = Math.round((checkedCount / TOTAL_CHECKLIST_COUNT) * 100);
  const allChecksPassed = checkedCount === TOTAL_CHECKLIST_COUNT;
  const anyItemRewash = selectedOrder?.items.some(it => it.qcStatus === 'REWASH');

  return (
    <div className="w-full space-y-6">

      {/* ── Toast Notification ── */}
      {notificationToast && (
        <div className={`fixed top-5 right-5 z-50 px-4 py-3 rounded-2xl shadow-xl flex items-center gap-3 border text-xs font-bold transition-all animate-in slide-in-from-top-4 duration-200 ${
          notificationToast.type === 'success'
            ? 'bg-emerald-900 text-white border-emerald-700'
            : notificationToast.type === 'warning'
              ? 'bg-amber-900 text-white border-amber-700'
              : 'bg-rose-900 text-white border-rose-700'
        }`}>
          <span>{notificationToast.type === 'success' ? '✓' : '⚠️'}</span>
          <span>{notificationToast.message}</span>
          <button onClick={() => setNotificationToast(null)} className="ml-2 hover:opacity-75 cursor-pointer">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* ── Main Workspace: 2-Column High-Efficiency Workstation ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

        {/* ── LEFT PANEL: Inspection Queue (4 Cols) ── */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs space-y-3.5">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-[#0077B6]/10 text-[#0077B6] flex items-center justify-center">
                  <ScanSearch className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">QC Queue</h3>
                  <p className="text-[10px] text-slate-500 font-semibold">{filteredOrders.length} order(s) pending check</p>
                </div>
              </div>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-50 text-amber-800 border border-amber-200">
                Awaiting QC
              </span>
            </div>

            {/* Filter Pills */}
            <div className="grid grid-cols-3 gap-1 p-1 bg-slate-100 rounded-xl text-[11px] font-bold">
              <button
                type="button"
                onClick={() => setQueueFilter('all')}
                className={`py-1.5 rounded-lg transition-all cursor-pointer ${queueFilter === 'all' ? 'bg-white text-slate-900 shadow-2xs font-extrabold' : 'text-slate-500 hover:text-slate-800'}`}
              >
                All ({pendingOrders.length})
              </button>
              <button
                type="button"
                onClick={() => setQueueFilter('ready')}
                className={`py-1.5 rounded-lg transition-all cursor-pointer ${queueFilter === 'ready' ? 'bg-white text-slate-900 shadow-2xs font-extrabold' : 'text-slate-500 hover:text-slate-800'}`}
              >
                Normal
              </button>
              <button
                type="button"
                onClick={() => setQueueFilter('rewash')}
                className={`py-1.5 rounded-lg transition-all cursor-pointer ${queueFilter === 'rewash' ? 'bg-white text-purple-700 shadow-2xs font-extrabold' : 'text-slate-500 hover:text-slate-800'}`}
              >
                Rewash ({pendingOrders.filter(o => o.hasRewash).length})
              </button>
            </div>

            {/* Search Box */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search order #, customer or bag QR..."
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-hidden focus:ring-2 focus:ring-[#0077B6] focus:bg-white transition-all"
              />
            </div>

            {/* Queue Cards Scroll Area */}
            <div className="space-y-2.5 max-h-[580px] overflow-y-auto pr-1">
              {loading ? (
                <div className="py-12 text-center text-slate-400 space-y-2">
                  <div className="w-6 h-6 border-2 border-[#0077B6] border-t-transparent rounded-full animate-spin mx-auto" />
                  <p className="text-xs font-semibold">Loading inspection jobs...</p>
                </div>
              ) : filteredOrders.length === 0 ? (
                <div className="text-center py-12 px-4 space-y-2.5">
                  <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto border border-emerald-100">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <h4 className="font-extrabold text-xs text-slate-800">Queue Clear!</h4>
                  <p className="text-[11px] text-slate-400">All current wash batches have been inspected & approved.</p>
                </div>
              ) : (
                filteredOrders.map(order => {
                  const isSelected = selectedOrder?.id === order.id;
                  return (
                    <div
                      key={order.id}
                      onClick={() => setSelectedOrder(order)}
                      className={`p-3.5 rounded-2xl border transition-all cursor-pointer text-left relative overflow-hidden group ${
                        isSelected
                          ? 'bg-[#03045E] text-white border-[#03045E] shadow-md shadow-[#03045E]/20 ring-2 ring-[#00B4D8]'
                          : 'bg-white hover:bg-slate-50/80 border-slate-200/80 text-slate-800'
                      }`}
                    >
                      {/* Active indicator bar */}
                      {isSelected && (
                        <div className="absolute top-0 left-0 bottom-0 w-1.5 bg-[#00B4D8]" />
                      )}

                      <div className="flex items-center justify-between gap-2">
                        <span className={`font-mono font-black text-xs tracking-tight ${isSelected ? 'text-white' : 'text-[#03045E]'}`}>
                          {order.id}
                        </span>
                        <div className="flex items-center gap-1.5">
                          {order.hasRewash && (
                            <span className="px-1.5 py-0.5 rounded-md text-[9px] font-black uppercase bg-purple-100 text-purple-800">
                              Rewash
                            </span>
                          )}
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            isSelected ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                          }`}>
                            {order.itemCount} item(s)
                          </span>
                        </div>
                      </div>

                      <p className={`text-xs font-extrabold truncate mt-1 ${isSelected ? 'text-white' : 'text-slate-900'}`}>
                        {order.customerName}
                      </p>

                      <div className={`flex items-center justify-between text-[10px] mt-1.5 ${isSelected ? 'text-white/70' : 'text-slate-500'}`}>
                        <span className="truncate">{order.serviceType}</span>
                        <span className="font-mono shrink-0">{order.completionTime}</span>
                      </div>

                      <div className={`mt-2 pt-2 border-t flex items-center justify-between text-[10px] ${
                        isSelected ? 'border-white/10 text-[#CAF0F8]' : 'border-slate-100 text-slate-400'
                      }`}>
                        <span className="font-mono">{order.bagQr}</span>
                        <span className="font-bold flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform">
                          <span>Inspect</span>
                          <ArrowRight className="w-3 h-3" />
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* ── RIGHT PANEL: Inspection Workbench (8 Cols) ── */}
        <div className="lg:col-span-8">
          {selectedOrder ? (
            <div className="bg-white rounded-3xl p-6 lg:p-8 shadow-sm border border-slate-200/90 space-y-6 relative overflow-hidden">
              {/* Header Gradient Stripe */}
              <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-amber-400 via-[#00B4D8] to-emerald-500" />

              {/* ── Station Top Bar: Order Metadata & Actions ── */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-100">
                <div className="flex items-start gap-3.5 min-w-0">
                  <div className="w-13 h-13 rounded-2xl bg-[#0077B6]/10 text-[#0077B6] border border-[#0077B6]/20 flex items-center justify-center shrink-0 shadow-2xs">
                    <ClipboardCheck className="w-6 h-6" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="font-mono font-black text-xl text-[#03045E] tracking-tight">{selectedOrder.id}</h2>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(selectedOrder.id);
                          setCopiedId(true);
                          setTimeout(() => setCopiedId(false), 2000);
                        }}
                        className="text-slate-400 hover:text-slate-600 transition-colors p-1"
                        title="Copy Order ID"
                      >
                        {copiedId ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                      <span className="font-mono text-xs font-bold text-slate-600 bg-slate-100 px-2.5 py-0.5 rounded-lg border border-slate-200/60">
                        {selectedOrder.bagQr}
                      </span>
                      {selectedOrder.hasRewash && (
                        <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-purple-100 text-purple-900 border border-purple-200">
                          Rewash Priority
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-1 text-xs">
                      <span className="font-extrabold text-slate-900">{selectedOrder.customerName}</span>
                      <span className="text-slate-300">•</span>
                      <span className="text-slate-500 font-medium truncate">{selectedOrder.serviceType}</span>
                    </div>
                  </div>
                </div>

                {/* Progress Mini Badge */}
                <div className="text-right sm:border-l sm:border-slate-100 sm:pl-4 shrink-0">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Inspection Gauge</div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <div className="w-24 h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-300 ${allChecksPassed ? 'bg-emerald-500' : 'bg-gradient-to-r from-amber-400 to-[#0077B6]'}`}
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>
                    <span className={`font-mono font-black text-sm ${allChecksPassed ? 'text-emerald-600' : 'text-[#0077B6]'}`}>
                      {checkedCount}/{TOTAL_CHECKLIST_COUNT}
                    </span>
                  </div>
                </div>
              </div>

              {/* Customer Special Note Banner (if any) */}
              {selectedOrder.specialInstructions && (
                <div className="p-3.5 bg-blue-50/70 border border-blue-200 rounded-2xl flex items-start gap-2.5 text-xs text-blue-900">
                  <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">Customer Special Care Note: </span>
                    <span className="italic">{selectedOrder.specialInstructions}</span>
                  </div>
                </div>
              )}

              {/* ── 9-Point Verification Checklist (Organized into 3 Clean Columns) ── */}
              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
                      <CheckSquare className="w-4 h-4 text-[#0077B6]" />
                      <span>9-Point Mandatory Quality Standards</span>
                    </h3>
                    <p className="text-[11px] text-slate-500">Tap standard to verify each item before final packing and driver dispatch.</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleSelectAllChecks(!allChecksPassed)}
                      className="px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold transition-all cursor-pointer shadow-2xs"
                    >
                      {allChecksPassed ? 'Clear All' : 'Mark All Passed ✓'}
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {QC_SECTIONS.map((sec) => {
                    const SectionIcon = sec.icon;
                    return (
                      <div key={sec.title} className="bg-slate-50/70 rounded-2xl p-3 border border-slate-200/80 space-y-2">
                        <div className="flex items-center gap-1.5 pb-1 border-b border-slate-200/60">
                          <div className={`w-5 h-5 rounded-md flex items-center justify-center text-xs border ${sec.color}`}>
                            <SectionIcon className="w-3 h-3" />
                          </div>
                          <span className="text-[11px] font-extrabold text-slate-800">{sec.title}</span>
                        </div>

                        <div className="space-y-1.5">
                          {sec.items.map((it) => {
                            const isChecked = checklist[it.id];
                            return (
                              <button
                                key={it.id}
                                type="button"
                                onClick={() => toggleChecklistItem(it.id)}
                                className={`w-full text-left p-2.5 rounded-xl border transition-all cursor-pointer flex items-start gap-2 select-none group ${
                                  isChecked
                                    ? 'bg-emerald-50 border-emerald-300 text-emerald-950 shadow-2xs'
                                    : 'bg-white hover:bg-slate-100/70 border-slate-200 text-slate-700'
                                }`}
                              >
                                <div className={`w-4 h-4 rounded-md flex items-center justify-center shrink-0 border mt-0.5 transition-colors ${
                                  isChecked ? 'bg-emerald-600 border-emerald-600 text-white' : 'border-slate-300 bg-white group-hover:border-slate-400'
                                }`}>
                                  {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                                </div>
                                <div className="min-w-0">
                                  <p className={`text-xs font-bold leading-tight ${isChecked ? 'line-through opacity-85 text-emerald-900' : 'text-slate-800'}`}>
                                    {it.label}
                                  </p>
                                  <p className="text-[10px] text-slate-400 mt-0.5 leading-tight">{it.desc}</p>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* ── Item Manifest Inspection & Rewash Flagging ── */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
                      <ShoppingBag className="w-4 h-4 text-[#0077B6]" />
                      <span>Garment Item Manifest ({selectedOrder.items.length})</span>
                    </h3>
                    <p className="text-[11px] text-slate-500">Inspect each physical item. If a garment needs rewash, flag it below.</p>
                  </div>
                  {anyItemRewash && (
                    <span className="text-[11px] font-bold text-purple-700 bg-purple-50 border border-purple-200 px-2.5 py-0.5 rounded-full">
                      {selectedOrder.items.filter(it => it.qcStatus === 'REWASH').length} item(s) flagged for rewash
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {selectedOrder.items.map((it, idx) => {
                    const isRewash = it.qcStatus === 'REWASH';
                    return (
                      <div
                        key={idx}
                        className={`p-3 rounded-2xl border transition-all flex items-center justify-between text-xs ${
                          isRewash
                            ? 'bg-purple-50 border-purple-300 text-purple-950 ring-1 ring-purple-200'
                            : 'bg-slate-50/70 border-slate-200 text-slate-800'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className={`w-6 h-6 rounded-xl flex items-center justify-center text-xs font-bold shrink-0 ${
                            isRewash ? 'bg-purple-600 text-white' : 'bg-emerald-100 text-emerald-800'
                          }`}>
                            {isRewash ? <RotateCcw className="w-3.5 h-3.5" /> : <Check className="w-3.5 h-3.5" />}
                          </span>
                          <div className="min-w-0">
                            <p className="font-extrabold truncate text-slate-900">{it.name}</p>
                            <p className="text-[10px] text-slate-500">
                              Qty: {it.qty} {isRewash && it.rewashReason ? `• Reason: ${it.rewashReason}` : '• Ready'}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          {!isRewash ? (
                            <button
                              type="button"
                              onClick={() => {
                                setRewashTargetItemIdx(idx);
                                setCustomRewashReason('');
                              }}
                              className="px-2.5 py-1.5 bg-white hover:bg-purple-50 text-purple-700 border border-purple-200 hover:border-purple-300 rounded-xl text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1 shadow-2xs"
                            >
                              <RotateCcw className="w-3 h-3" />
                              <span>Rewash</span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleClearItemRewash(idx)}
                              className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1 shadow-2xs"
                            >
                              <Check className="w-3 h-3" />
                              <span>Clear / Pass</span>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* ── High-Impact Bottom Action Bar ── */}
              <div className="pt-4 border-t border-slate-100 space-y-3">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setIsMachineDrawerOpen(true)}
                      className="px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs"
                    >
                      <Wrench className="w-4 h-4 text-slate-500" />
                      <span>Machinery Controls</span>
                    </button>
                  </div>

                  <div className="flex items-center gap-2.5 w-full sm:w-auto">
                    {/* Send to Rewash Button */}
                    <button
                      type="button"
                      disabled={isSubmitting}
                      onClick={() => submitQC('reprocess')}
                      className="flex-1 sm:flex-initial px-5 py-3.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300/80 rounded-2xl text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-2 active:scale-98 shadow-xs"
                    >
                      <AlertTriangle className="w-4 h-4 text-amber-600" />
                      <span>Route to Rewash</span>
                    </button>

                    {/* Approve & Release to Delivery Button */}
                    <button
                      type="button"
                      disabled={isSubmitting}
                      onClick={() => submitQC('passed')}
                      className={`flex-1 sm:flex-initial px-6 py-3.5 rounded-2xl text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-2 shadow-lg active:scale-98 text-white ${
                        allChecksPassed && !anyItemRewash
                          ? 'bg-gradient-to-r from-emerald-600 via-teal-600 to-[#03045E] hover:from-emerald-700 hover:to-[#023E8A] shadow-emerald-600/25 ring-2 ring-emerald-400/40'
                          : anyItemRewash
                            ? 'bg-gradient-to-r from-purple-700 to-[#03045E] hover:from-purple-800'
                            : 'bg-gradient-to-r from-[#03045E] to-[#0077B6] hover:from-[#023E8A]'
                      }`}
                    >
                      <Truck className="w-4 h-4 text-emerald-300" />
                      <span>
                        {anyItemRewash
                          ? `Approve Partial & Route ${selectedOrder.items.filter(it => it.qcStatus === 'REWASH').length} Item(s) to Rewash`
                          : allChecksPassed
                            ? 'Approve 100% Quality & Release to Driver'
                            : 'Approve Quality Inspection & Seal Bag'}
                      </span>
                      <ArrowRight className="w-4 h-4 text-white/80" />
                    </button>
                  </div>
                </div>

                {!allChecksPassed && !anyItemRewash && (
                  <p className="text-[11px] text-slate-400 text-right">
                    💡 Tip: {TOTAL_CHECKLIST_COUNT - checkedCount} inspection criteria unchecked. You can click &apos;Mark All Passed&apos; to verify all at once.
                  </p>
                )}
              </div>

            </div>
          ) : (
            <div className="bg-white rounded-3xl p-16 text-center border-2 border-dashed border-slate-200 shadow-2xs space-y-4 flex flex-col items-center justify-center min-h-[460px]">
              <div className="w-16 h-16 bg-[#0077B6]/10 text-[#0077B6] rounded-3xl flex items-center justify-center shadow-inner">
                <ScanSearch className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900">Select an Order from the QC Queue</h3>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                  Click any order from the left list to review its items, verify the 9 quality standards, and handover for driver delivery.
                </p>
              </div>
            </div>
          )}
        </div>

      </div>

      {/* ── MODAL: Friendly In-App Reason Selector for Rewash (No window.prompt!) ── */}
      {rewashTargetItemIdx !== null && selectedOrder && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={() => setRewashTargetItemIdx(null)}
        >
          <div
            className="w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl border border-slate-100 space-y-4 animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center">
                  <RotateCcw className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-extrabold text-sm text-slate-900">Flag Item for Rewash</h4>
                  <p className="text-[11px] text-slate-500 truncate max-w-[260px]">
                    {selectedOrder.items[rewashTargetItemIdx]?.name}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setRewashTargetItemIdx(null)}
                className="p-1 rounded-xl text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600 font-medium">
              Select the primary reason this garment requires reprocessing:
            </p>

            <div className="grid grid-cols-2 gap-2">
              {COMMON_REWASH_REASONS.map((reason) => (
                <button
                  key={reason}
                  type="button"
                  onClick={() => handleConfirmItemRewash(reason)}
                  className="p-2.5 rounded-xl border border-slate-200 hover:border-purple-300 hover:bg-purple-50/60 text-xs font-bold text-slate-700 hover:text-purple-900 transition-all text-left cursor-pointer"
                >
                  {reason}
                </button>
              ))}
            </div>

            <div className="space-y-1.5 pt-1">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Or Enter Custom Reason</label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={customRewashReason}
                  onChange={(e) => setCustomRewashReason(e.target.value)}
                  placeholder="e.g. Left cuff ink spot..."
                  className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-hidden focus:ring-2 focus:ring-purple-500"
                />
                <button
                  type="button"
                  disabled={!customRewashReason.trim()}
                  onClick={() => handleConfirmItemRewash(customRewashReason.trim())}
                  className="px-4 py-2 bg-purple-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs"
                >
                  Apply
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: Clean Machine Controls & Rewash Launcher ── */}
      {isMachineDrawerOpen && selectedOrder && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={() => setIsMachineDrawerOpen(false)}
        >
          <div
            className="w-full max-w-lg bg-white rounded-3xl p-6 shadow-2xl border border-slate-100 space-y-4 animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-[#0077B6]/10 text-[#0077B6] flex items-center justify-center">
                  <Wrench className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-slate-900">Plant Machinery Assignment</h3>
                  <p className="text-[11px] text-slate-500">Assign batch for Order #{selectedOrder.id} • {selectedOrder.customerName}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsMachineDrawerOpen(false)}
                className="p-1 rounded-xl text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Available Washer / Dryer Unit</label>
                <select
                  value={selectedMachineId}
                  onChange={(e) => setSelectedMachineId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-[#0077B6]"
                >
                  <option value="WASHER-01">Washer #1 — Miele Professional 18kg (Active / Available)</option>
                  <option value="WASHER-02">Washer #2 — Primus Heavy Load 24kg (Active / Available)</option>
                  <option value="WASHER-03">Washer #3 — Speed Queen Fast Cycle 14kg (Available)</option>
                  <option value="DRYER-01">Dryer #1 — Electrolux Pro 20kg (Warm Air)</option>
                  <option value="DRYER-02">Dryer #2 — Huebsch 25kg (Gas Heated)</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Processing Program</label>
                <select
                  value={cycleType}
                  onChange={(e) => setCycleType(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-[#0077B6]"
                >
                  <option value="Intensive Stain Removal 60°C">Intensive Stain Removal 60°C (Recommended for Rewash)</option>
                  <option value="Eco Wash 40°C">Eco Wash 40°C (Standard)</option>
                  <option value="Delicates & Silks 30°C">Delicates & Silks 30°C</option>
                  <option value="Sanitizing High-Heat 90°C">Sanitizing High-Heat 90°C</option>
                  <option value="Standard Warm Dry 50m">Standard Warm Dry 50m</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Water Temp</label>
                  <select
                    value={temperature}
                    onChange={(e) => setTemperature(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-800"
                  >
                    <option value="30°C">30°C (Gentle)</option>
                    <option value="40°C">40°C (Warm)</option>
                    <option value="60°C">60°C (Stain-Break)</option>
                    <option value="90°C">90°C (Hospital Sanitize)</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Duration (Mins)</label>
                  <input
                    type="number"
                    min="10"
                    max="120"
                    value={durationMinutes}
                    onChange={(e) => setDurationMinutes(parseInt(e.target.value, 10) || 45)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-800"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsMachineDrawerOpen(false)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors cursor-pointer"
              >
                Close
              </button>
              <button
                type="button"
                onClick={handleStartMachineRun}
                disabled={machineRunSubmitting}
                className="flex-1 py-2.5 bg-[#03045E] hover:bg-[#023E8A] disabled:opacity-50 text-white font-black rounded-xl text-xs transition-colors flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
              >
                {machineRunSubmitting ? 'Starting...' : 'Start Cycle on Machine'}
              </button>
            </div>

            <div className="pt-1 text-center">
              <button
                type="button"
                onClick={() => setIsFaultModalOpen(true)}
                className="text-[11px] text-rose-600 hover:text-rose-800 font-bold hover:underline cursor-pointer"
              >
                ⚠️ Report Breakdown / Fault for {selectedMachineId}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: Report Machine Fault Dialog (No window.prompt!) ── */}
      {isFaultModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={() => setIsFaultModalOpen(false)}
        >
          <div
            className="w-full max-w-sm bg-white rounded-3xl p-6 shadow-2xl border border-rose-100 space-y-4 animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2.5 text-rose-600">
              <AlertTriangle className="w-5 h-5" />
              <h4 className="font-extrabold text-sm text-slate-900">Report Mechanical Fault</h4>
            </div>

            <p className="text-xs text-slate-600">
              Reporting breakdown for <span className="font-bold text-slate-900">{selectedMachineId}</span>. This will notify plant management and take the unit offline.
            </p>

            <textarea
              value={faultReason}
              onChange={(e) => setFaultReason(e.target.value)}
              placeholder="Describe issue: e.g. Water inlet solenoid leak or motor imbalance..."
              rows={3}
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-rose-500 focus:outline-hidden"
            />

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsFaultModalOpen(false)}
                className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!faultReason.trim()}
                onClick={handleReportMachineFault}
                className="flex-1 py-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-bold rounded-xl text-xs transition-colors cursor-pointer"
              >
                Submit Outage Alert
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: QC Passed & Released for Driver Delivery ── */}
      {deliverySuccessModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={() => setDeliverySuccessModal(null)}
        >
          <div
            className="relative w-full max-w-md bg-white rounded-3xl p-6 sm:p-7 shadow-2xl border border-slate-100 text-center space-y-4 animate-in zoom-in-95 duration-150 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-emerald-500 via-[#00B4D8] to-[#03045E]" />

            <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-3xl flex items-center justify-center mx-auto shadow-inner mt-2 border border-emerald-100">
              <Truck className="w-8 h-8 text-emerald-600" />
            </div>

            <div>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-200">
                QC Passed • Dispatched for Delivery
              </span>
              <h3 className="text-lg font-black text-[#03045E] mt-1.5 tracking-tight">
                Package Sealed & Ready for Driver
              </h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Order <span className="font-mono font-bold text-slate-800">{deliverySuccessModal.orderId}</span> has passed all 9 quality checkpoints and is waiting at the collection bay.
              </p>
            </div>

            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 text-left space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-400 font-bold uppercase text-[9px] tracking-wider">Customer</span>
                <span className="font-bold text-slate-900">{deliverySuccessModal.customerName}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400 font-bold uppercase text-[9px] tracking-wider">Bag QR Tag</span>
                <span className="font-mono font-bold text-[#0077B6]">{deliverySuccessModal.bagQr}</span>
              </div>
              <div className="flex items-center justify-between pt-1 border-t border-slate-200/60">
                <span className="text-slate-400 font-bold uppercase text-[9px] tracking-wider">Next Step</span>
                <span className="font-extrabold text-emerald-700 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Assigned driver will collect from bay
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setDeliverySuccessModal(null)}
                className="flex-1 py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-2xl text-xs font-black transition-all cursor-pointer"
              >
                Inspect Next Order
              </button>
              {onNavigateTab && (
                <button
                  type="button"
                  onClick={() => {
                    setDeliverySuccessModal(null);
                    onNavigateTab('orders');
                  }}
                  className="flex-1 py-3 px-4 bg-[#03045E] hover:bg-[#023E8A] text-white rounded-2xl text-xs font-black transition-all shadow-md shadow-[#03045E]/20 cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <ShoppingBag className="w-3.5 h-3.5 text-[#48CAE4]" />
                  <span>Processing Board</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
