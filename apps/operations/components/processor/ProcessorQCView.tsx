'use client';
import { apiFetch } from '@laundelle/api-client';
import React, { useState, useEffect } from 'react';
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
  ShoppingBag
} from 'lucide-react';

interface QCItem {
  id?: string;
  name: string;
  qty: number;
  cleaning: 'pass' | 'fail';
  damage: 'none' | 'minor' | 'major';
  status: 'pass' | 'review' | 'fail';
  qcStatus?: 'PASSED' | 'REWASH';
  rewashReason?: string;
}

interface QCOrder {
  id: string;
  customerName: string;
  serviceType: string;
  itemCount: number;
  processorName: string;
  completionTime: string;
  bagQr: string;
  plantId?: string;
  specialInstructions?: string;
  items: QCItem[];
}

interface ProcessorQCViewProps {
  onNavigateTab?: (tab: any) => void;
}

const CHECKLIST_ITEMS = [
  'All items present according to manifest',
  'Garments thoroughly cleaned & freshened',
  'No visible remaining surface stains',
  'Items completely dry — zero moisture',
  'Steam ironing & flat fold standards met',
  'No fabric tears, shrinkage or damage',
  'Customer special instructions followed',
  'Package ID & bag QR label verified',
  'Anti-static protective film sealed'
];

const ISSUE_TYPES = [
  'Stain Remains (Rewash)',
  'Damp / Incomplete Dry',
  'Ironing Wrinkles',
  'Missing Item',
  'Fabric Damage',
  'Quantity Mismatch',
  'Other'
];

export const ProcessorQCView: React.FC<ProcessorQCViewProps> = ({ onNavigateTab }) => {
  const [pendingOrders, setPendingOrders] = useState<QCOrder[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<QCOrder | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Inspection Checklist State
  const [checklist, setChecklist] = useState<boolean[]>(Array(CHECKLIST_ITEMS.length).fill(false));
  const [issueType, setIssueType] = useState('');
  const [issueNotes, setIssueNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isQCModalOpen, setIsQCModalOpen] = useState(false);
  const [deliverySuccessModal, setDeliverySuccessModal] = useState<{
    orderId: string;
    customerName: string;
    serviceType: string;
    bagQr: string;
    driverName?: string;
  } | null>(null);

  // Machine Run Selector State
  const [isMachineModalOpen, setIsMachineModalOpen] = useState(false);
  const [selectedMachineId, setSelectedMachineId] = useState('WASHER-01');
  const [cycleType, setCycleType] = useState('Intensive Stain Removal 60°C');
  const [temperature, setTemperature] = useState('60°C');
  const [durationMinutes, setDurationMinutes] = useState(45);
  const [machineRunSubmitting, setMachineRunSubmitting] = useState(false);

  // Close modal on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isQCModalOpen && !isSubmitting) {
        setIsQCModalOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isQCModalOpen, isSubmitting]);

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
            serviceType: o.items?.[0]?.name || o.service || 'Laundry Service',
            itemCount: rawItems.length,
            processorName: o.processor?.name || 'Processing Line',
            completionTime: o.updated_at ? new Date(o.updated_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : '--:--',
            bagQr: o.package?.qr_code || o.qr_code || o.qr_tracking?.qrTagId || (o.publicId ? `BAG-${o.publicId}` : `BAG-${o.id}`),
            plantId: o.plant_id || o.plantId || 'PLANT-LON-01',
            specialInstructions: o.specialInstructions || '',
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
        // Auto select first order if none selected or previous was removed
        setSelectedOrder(prev => {
          if (!prev) return mapped[0] || null;
          const found = mapped.find(m => m.id === prev.id);
          return found || mapped[0] || null;
        });
      }
    } catch (e) {
      console.error('Error loading QC jobs:', e);
    }
  };

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
          notes: `Rewash batch for order #${selectedOrder.id}`
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to start machine run');
      alert(`Machine run started on ${selectedMachineId} for order #${selectedOrder.id}!`);
      setIsMachineModalOpen(false);
    } catch (e: any) {
      alert(e.message || 'Error starting machine run');
    } finally {
      setMachineRunSubmitting(false);
    }
  };

  useEffect(() => {
    loadQCOrders();
    const interval = setInterval(() => loadQCOrders(), 10000);
    return () => clearInterval(interval);
  }, []);

  // Reset checklist when selected order changes
  useEffect(() => {
    setChecklist(Array(CHECKLIST_ITEMS.length).fill(false));
    setIssueType('');
    setIssueNotes('');
  }, [selectedOrder?.id]);

  const toggleChecklistItem = (index: number) => {
    setChecklist(prev => {
      const copy = [...prev];
      copy[index] = !copy[index];
      return copy;
    });
  };

  const checkAllItems = () => {
    const allAreChecked = checklist.every(Boolean);
    setChecklist(Array(CHECKLIST_ITEMS.length).fill(!allAreChecked));
  };

  const submitQC = async (status: 'passed' | 'failed' | 'reprocess', notes: string) => {
    if (!selectedOrder) return false;
    setIsSubmitting(true);
    try {
      const rawSession = localStorage.getItem('l2u_auth_session');
      const token = rawSession ? JSON.parse(rawSession).token : null;

      const hasItemRewash = selectedOrder.items.some(it => it.qcStatus === 'REWASH');
      const effectiveStatus = (status === 'passed' && hasItemRewash) ? 'rewash' : (status === 'reprocess' ? 'rewash' : status);

      const checklistObj: Record<string, boolean> = {};
      CHECKLIST_ITEMS.forEach((item, idx) => {
        checklistObj[item] = checklist[idx];
      });

      const itemChecks = selectedOrder.items.map((it, idx) => ({
        itemId: it.id || `${selectedOrder.id}-item-${idx}`,
        passed: it.qcStatus !== 'REWASH',
        rewashRequired: it.qcStatus === 'REWASH',
        notes: it.rewashReason || notes,
        reason: it.rewashReason || issueType || notes
      }));

      const res = await apiFetch(`/api/v1/processor/jobs/${selectedOrder.id}/qc`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          status: effectiveStatus,
          notes,
          reason: issueType || notes,
          checklist: checklistObj,
          itemChecks
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'QC update failed');

      // Trigger global refresh
      window.dispatchEvent(new CustomEvent('l2u_processor_orders_changed', { detail: { orderId: selectedOrder.id } }));
      window.dispatchEvent(new Event('l2u_orders_change'));

      if (effectiveStatus === 'passed') {
        setIsQCModalOpen(false);
        setDeliverySuccessModal({
          orderId: selectedOrder.id,
          customerName: selectedOrder.customerName,
          serviceType: selectedOrder.serviceType,
          bagQr: selectedOrder.bagQr,
          driverName: data.driver?.name || data.assigned_driver_name
        });
        loadQCOrders();
      } else {
        setIsQCModalOpen(false);
        loadQCOrders();
        // If rewash is required, prompt machine selector!
        setIsMachineModalOpen(true);
      }
      return true;
    } catch (e: any) {
      alert(e.message || 'Error recording QC status');
      return false;
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredOrders = pendingOrders.filter(o => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return o.id.toLowerCase().includes(q) || o.customerName.toLowerCase().includes(q) || o.bagQr.toLowerCase().includes(q);
  });

  const checkedCount = checklist.filter(Boolean).length;
  const allChecked = checkedCount === CHECKLIST_ITEMS.length;

  return (
    <div className="w-full space-y-6">

      {/* ─── Desktop 2-Column Split Workspace ───────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* ── Left Column: QC Queue (5 cols) ─────────────────────────────────── */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white rounded-3xl p-5 border border-gray-200/80 shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black text-gray-900 flex items-center gap-2">
                <ScanSearch className="w-4 h-4 text-[#0077B6]" />
                <span>Inspection Queue ({filteredOrders.length})</span>
              </h3>
              <span className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                Awaiting QC
              </span>
            </div>

            {/* Search filter */}
            <div className="relative">
              <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search queue by Order # or Name..."
                className="w-full pl-10 pr-3 py-2 bg-slate-50 border border-gray-200 rounded-xl text-xs font-medium focus:outline-hidden focus:ring-2 focus:ring-[#0077B6]"
              />
            </div>

            {/* Queue List */}
            <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
              {filteredOrders.length === 0 ? (
                <div className="text-center py-12 px-4 space-y-2">
                  <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto" />
                  <p className="font-extrabold text-sm text-gray-800">All Quality Checks Complete!</p>
                  <p className="text-xs text-gray-400">No orders are waiting for inspection right now.</p>
                </div>
              ) : (
                filteredOrders.map(order => {
                  const isSelected = selectedOrder?.id === order.id;
                  return (
                    <div
                      key={order.id}
                      onClick={() => {
                        setSelectedOrder(order);
                        setIsQCModalOpen(true);
                      }}
                      className={`p-3.5 rounded-2xl border transition-all cursor-pointer text-left group ${isSelected
                          ? 'bg-[#03045E] text-white border-[#03045E] shadow-md shadow-[#03045E]/20 scale-[1.01]'
                          : 'bg-slate-50/70 hover:bg-slate-100 border-gray-200/80 text-gray-800'
                        }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono font-black text-xs tracking-tight">{order.id}</span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${isSelected ? 'bg-white/20 text-white' : 'bg-amber-100 text-amber-900'
                          }`}>
                          Ready for QC
                        </span>
                      </div>
                      <p className={`text-xs font-extrabold truncate mt-1 ${isSelected ? 'text-white' : 'text-gray-900'}`}>
                        {order.customerName}
                      </p>
                      <div className={`flex items-center justify-between text-[10px] mt-1.5 ${isSelected ? 'text-white/70' : 'text-gray-500'
                        }`}>
                        <span className="truncate">{order.serviceType}</span>
                        <span className="font-mono font-bold shrink-0">{order.completionTime}</span>
                      </div>
                      <div className="mt-2.5 pt-2 border-t border-gray-100/50 flex items-center justify-between text-[10px]">
                        <span className={isSelected ? 'text-white/60' : 'text-gray-400'}>{order.itemCount} item(s)</span>
                        <span className={`font-black flex items-center gap-1 ${isSelected ? 'text-[#48CAE4]' : 'text-[#0077B6] group-hover:underline'}`}>
                          <span>Verify Checklist</span>
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

        {/* ── Right Column: Inspection Workspace Preview (7 cols) ──────────── */}
        <div className="lg:col-span-7">
          {selectedOrder ? (
            <div className="bg-white rounded-3xl p-6 lg:p-7 shadow-sm border border-gray-200/80 space-y-6 animate-in fade-in zoom-in-95 duration-150 relative overflow-hidden">
              {/* Top Accent Stripe */}
              <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-amber-400 via-[#00B4D8] to-emerald-500" />

              {/* Order Overview Header */}
              <div className="flex items-start justify-between gap-4 border-b border-gray-100 pb-5">
                <div className="flex items-center gap-3.5">
                  <div className="w-14 h-14 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center shrink-0 border border-amber-200/60 shadow-2xs">
                    <ClipboardCheck className="w-7 h-7" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono font-black text-lg text-[#03045E] tracking-tight">{selectedOrder.id}</span>
                      <span className="text-xs font-mono font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-md">
                        {selectedOrder.bagQr}
                      </span>
                    </div>
                    <h3 className="text-base font-extrabold text-gray-900 mt-0.5">{selectedOrder.customerName}</h3>
                    <p className="text-xs text-gray-500 font-medium">{selectedOrder.serviceType}</p>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Verification Progress</span>
                  <span className={`text-sm font-black font-mono mt-0.5 block ${allChecked ? 'text-emerald-600' : 'text-amber-600'
                    }`}>
                    {checkedCount} / {CHECKLIST_ITEMS.length} Passed
                  </span>
                </div>
              </div>

              {/* Verification Progress Hero Banner */}
              <div className="bg-gradient-to-br from-slate-50 to-blue-50/40 p-5 rounded-2xl border border-gray-200/80 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-[#0077B6]" />
                    <span className="text-xs font-black text-[#03045E] uppercase tracking-wider">Garment Verification Status</span>
                  </div>
                  <span className="text-xs font-bold text-[#0077B6] font-mono">
                    {Math.round((checkedCount / CHECKLIST_ITEMS.length) * 100)}% Complete
                  </span>
                </div>

                {/* Progress Bar */}
                <div className="w-full h-2.5 bg-gray-200 rounded-full overflow-hidden p-0.5">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      allChecked ? 'bg-emerald-500' : 'bg-gradient-to-r from-amber-400 via-[#00B4D8] to-emerald-500'
                    }`}
                    style={{ width: `${(checkedCount / CHECKLIST_ITEMS.length) * 100}%` }}
                  />
                </div>

                <div className="flex items-center justify-between pt-1">
                  <span className="text-[11px] text-gray-500">
                    {allChecked ? 'All 9 inspection standards satisfied.' : `${CHECKLIST_ITEMS.length - checkedCount} inspection criteria remaining.`}
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsQCModalOpen(true)}
                    className="px-4 py-2 bg-[#03045E] hover:bg-[#023E8A] text-white rounded-xl text-xs font-black transition-all shadow-xs cursor-pointer flex items-center gap-1.5 active:scale-95"
                  >
                    <Search className="w-3.5 h-3.5 text-[#48CAE4]" />
                    <span>Open Verification Modal</span>
                    <ArrowRight className="w-3.5 h-3.5 text-white/70" />
                  </button>
                </div>
              </div>

              {/* Garment Item-Level Checklist */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">
                    Garment Inspection Checklist ({selectedOrder.items.length})
                  </span>
                  <span className="text-[11px] text-gray-400">Click to flag individual rewash</span>
                </div>
                <div className="space-y-2">
                  {selectedOrder.items.map((it, idx) => {
                    const isRewash = it.qcStatus === 'REWASH';
                    return (
                      <div
                        key={idx}
                        className={`p-3 rounded-2xl border transition-all flex items-center justify-between text-xs ${
                          isRewash
                            ? 'bg-purple-50/90 border-purple-300 text-purple-950'
                            : 'bg-slate-50/70 border-gray-200 text-gray-800'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                            isRewash ? 'bg-purple-600 text-white' : 'bg-emerald-100 text-emerald-800'
                          }`}>
                            {isRewash ? '🔄' : '✓'}
                          </span>
                          <div className="min-w-0">
                            <p className="font-bold truncate">{it.name}</p>
                            <p className="text-[10px] text-gray-500">Qty: {it.qty}{isRewash && it.rewashReason ? ` • ${it.rewashReason}` : ''}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => {
                              const updated = [...selectedOrder.items];
                              updated[idx] = { ...updated[idx], qcStatus: 'PASSED', rewashReason: undefined };
                              setSelectedOrder({ ...selectedOrder, items: updated });
                            }}
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                              !isRewash ? 'bg-emerald-600 text-white shadow-2xs' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-100'
                            }`}
                          >
                            Pass
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const reason = prompt('Reason for rewash:', it.rewashReason || 'Surface stain / wrinkle');
                              const updated = [...selectedOrder.items];
                              updated[idx] = { ...updated[idx], qcStatus: 'REWASH', rewashReason: reason || 'Rewash required' };
                              setSelectedOrder({ ...selectedOrder, items: updated });
                            }}
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                              isRewash ? 'bg-purple-700 text-white shadow-2xs' : 'bg-white text-purple-700 border border-purple-200 hover:bg-purple-50'
                            }`}
                          >
                            Rewash
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Decision Action Buttons */}
              <div className="pt-2 flex flex-col sm:flex-row items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsMachineModalOpen(true)}
                  className="w-full sm:w-auto py-3 px-4 bg-cyan-50 hover:bg-cyan-100 text-cyan-900 border border-cyan-200 rounded-2xl text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <span>🔄</span>
                  <span>Link Machine</span>
                </button>

                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => submitQC('reprocess', issueNotes || 'Rewash requested by QC operator')}
                  className="w-full sm:w-auto py-3 px-4 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 rounded-2xl text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-2 active:scale-98"
                >
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  <span>Send to Rewash</span>
                </button>

                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => setIsQCModalOpen(true)}
                  className="w-full sm:flex-1 py-3 px-5 bg-gradient-to-r from-emerald-600 via-[#0077B6] to-[#03045E] hover:from-emerald-700 hover:to-[#023E8A] text-white rounded-2xl text-xs font-black shadow-lg shadow-emerald-600/20 transition-all cursor-pointer flex items-center justify-center gap-2 active:scale-98"
                >
                  <ClipboardCheck className="w-4 h-4 text-emerald-300" />
                  <span>Inspect & Complete QC</span>
                  <ArrowRight className="w-4 h-4 text-white/70" />
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-3xl p-12 text-center border-2 border-dashed border-gray-200 shadow-2xs space-y-4 min-h-[460px] flex flex-col items-center justify-center">
              <div className="w-16 h-16 bg-amber-50 text-amber-600 rounded-3xl flex items-center justify-center shadow-inner">
                <ScanSearch className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-lg font-black text-gray-900">Select an Order from the Queue</h3>
                <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
                  Click any order on the left to open the 2-column checklist modal and verify garment quality.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ─── QUALITY VERIFICATION & 2-COLUMN CHECKLIST MODAL ────────────────── */}
      {isQCModalOpen && selectedOrder && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-150"
          onClick={(e) => {
            if (e.target === e.currentTarget && !isSubmitting) {
              setIsQCModalOpen(false);
            }
          }}
        >
          <div
            className="relative w-full max-w-4xl bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden my-auto max-h-[92vh] flex flex-col animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Top Accent Stripe */}
            <div className="h-1.5 bg-gradient-to-r from-amber-400 via-[#00B4D8] to-emerald-500 shrink-0" />

            {/* Modal Header */}
            <div className="p-5 sm:p-6 pb-4 border-b border-gray-100 flex items-start justify-between gap-4 shrink-0 bg-white">
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="w-13 h-13 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center shrink-0 border border-amber-200/60 shadow-2xs">
                  <ClipboardCheck className="w-6 h-6" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono font-black text-lg text-[#03045E] tracking-tight">{selectedOrder.id}</span>
                    <span className="text-xs font-mono font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-md">
                      {selectedOrder.bagQr}
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-50 text-amber-800 border border-amber-200">
                      Quality Inspection
                    </span>
                  </div>
                  <h3 className="text-base font-extrabold text-gray-900 mt-0.5 truncate">{selectedOrder.customerName}</h3>
                  <p className="text-xs text-gray-500 font-medium truncate">{selectedOrder.serviceType} · {selectedOrder.itemCount} item(s)</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => !isSubmitting && setIsQCModalOpen(false)}
                className="p-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-500 hover:text-gray-800 cursor-pointer transition-colors shrink-0"
                title="Close (Esc)"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Scrollable Body */}
            <div className="p-5 sm:p-6 space-y-5 overflow-y-auto flex-1 bg-white">
              {/* Verification Progress Hero Card in Modal */}
              <div className="bg-gradient-to-br from-slate-50 to-blue-50/40 p-5 rounded-3xl border border-gray-200/80 shadow-2xs space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-[#0077B6]" />
                    <div>
                      <h4 className="text-sm font-black text-[#03045E] tracking-tight">Verification Progress</h4>
                      <p className="text-[11px] text-gray-500">
                        Inspect all 9 quality checkpoints before approving driver delivery handover.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 self-end sm:self-auto">
                    <div className="text-right">
                      <span className={`text-base font-black font-mono block leading-none ${allChecked ? 'text-emerald-600' : 'text-[#0077B6]'}`}>
                        {checkedCount} / {CHECKLIST_ITEMS.length} Passed
                      </span>
                      <span className="text-[10px] font-bold text-gray-400 mt-0.5 block">
                        {Math.round((checkedCount / CHECKLIST_ITEMS.length) * 100)}% Verified
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={checkAllItems}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-2xs ${
                        allChecked
                          ? 'bg-emerald-100 hover:bg-emerald-200 text-emerald-800'
                          : 'bg-[#03045E] hover:bg-[#023E8A] text-white'
                      }`}
                    >
                      {allChecked ? 'Deselect All' : 'Mark All Passed ✓'}
                    </button>
                  </div>
                </div>

                {/* Progress Bar Track */}
                <div className="w-full h-3 bg-gray-200/70 rounded-full overflow-hidden p-0.5 shadow-inner">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      allChecked
                        ? 'bg-emerald-500 shadow-xs'
                        : 'bg-gradient-to-r from-amber-400 via-[#00B4D8] to-emerald-500'
                    }`}
                    style={{ width: `${(checkedCount / CHECKLIST_ITEMS.length) * 100}%` }}
                  />
                </div>
              </div>

              {/* ── Checklist in 2 Columns ───────────────────────────────────────── */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-gray-800 uppercase tracking-wider flex items-center gap-1.5">
                    <ClipboardCheck className="w-4 h-4 text-[#0077B6]" />
                    9-Point Quality Inspection Checklist (2 Columns)
                  </span>
                  <span className="text-[11px] text-gray-400">Click to verify each checkpoint</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {CHECKLIST_ITEMS.map((item, idx) => {
                    const isChecked = checklist[idx];
                    return (
                      <div
                        key={idx}
                        onClick={() => toggleChecklistItem(idx)}
                        className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 select-none ${
                          isChecked
                            ? 'bg-emerald-50/80 border-emerald-300 text-emerald-950 shadow-2xs'
                            : 'bg-slate-50/70 hover:bg-slate-100/80 border-gray-200 text-gray-700'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div
                            className={`w-6 h-6 rounded-xl flex items-center justify-center shrink-0 border font-mono text-xs font-black transition-colors ${
                              isChecked
                                ? 'bg-emerald-500 border-emerald-500 text-white'
                                : 'border-gray-300 bg-white text-gray-400'
                            }`}
                          >
                            {isChecked ? <Check className="w-3.5 h-3.5" /> : idx + 1}
                          </div>
                          <span className={`text-xs font-bold leading-tight ${isChecked ? 'line-through opacity-85' : ''}`}>
                            {item}
                          </span>
                        </div>
                        <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full shrink-0 ${
                          isChecked ? 'bg-emerald-200/70 text-emerald-900' : 'bg-gray-100 text-gray-400'
                        }`}>
                          {isChecked ? 'Passed' : 'Pending'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* ── Garment Item-Level Checklist in Modal ── */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-gray-800 uppercase tracking-wider flex items-center gap-1.5">
                    <ShoppingBag className="w-4 h-4 text-[#0077B6]" />
                    Item-Level Garment Inspection ({selectedOrder.items.length})
                  </span>
                  <span className="text-[11px] text-gray-400">Flag individual items needing rewash</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {selectedOrder.items.map((it, idx) => {
                    const isRewash = it.qcStatus === 'REWASH';
                    return (
                      <div
                        key={idx}
                        className={`p-3 rounded-2xl border transition-all flex items-center justify-between text-xs ${
                          isRewash
                            ? 'bg-purple-50/90 border-purple-300 text-purple-950'
                            : 'bg-slate-50/70 border-gray-200 text-gray-800'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                            isRewash ? 'bg-purple-600 text-white' : 'bg-emerald-100 text-emerald-800'
                          }`}>
                            {isRewash ? '🔄' : '✓'}
                          </span>
                          <div className="min-w-0">
                            <p className="font-bold truncate">{it.name}</p>
                            <p className="text-[10px] text-gray-500">Qty: {it.qty}{isRewash && it.rewashReason ? ` • ${it.rewashReason}` : ''}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => {
                              const updated = [...selectedOrder.items];
                              updated[idx] = { ...updated[idx], qcStatus: 'PASSED', rewashReason: undefined };
                              setSelectedOrder({ ...selectedOrder, items: updated });
                            }}
                            className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                              !isRewash ? 'bg-emerald-600 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-100'
                            }`}
                          >
                            Pass
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const reason = prompt('Reason for rewash:', it.rewashReason || 'Surface stain / wrinkle');
                              const updated = [...selectedOrder.items];
                              updated[idx] = { ...updated[idx], qcStatus: 'REWASH', rewashReason: reason || 'Rewash required' };
                              setSelectedOrder({ ...selectedOrder, items: updated });
                            }}
                            className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                              isRewash ? 'bg-purple-700 text-white' : 'bg-white text-purple-700 border border-purple-200 hover:bg-purple-50'
                            }`}
                          >
                            Rewash
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Issue Flagging & Rewash Notes */}
              <div className="space-y-3 bg-slate-50 p-4 rounded-2xl border border-gray-200">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-gray-800 flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                    <span>Flag Issue / Rewash Note (Optional)</span>
                  </span>
                  {issueType && (
                    <button
                      type="button"
                      onClick={() => { setIssueType(''); setIssueNotes(''); }}
                      className="text-[11px] text-red-600 font-bold hover:underline cursor-pointer"
                    >
                      Clear Issue
                    </button>
                  )}
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {ISSUE_TYPES.map(type => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setIssueType(issueType === type ? '' : type)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                        issueType === type
                          ? 'bg-red-600 text-white border-red-600 shadow-xs'
                          : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-100'
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>

                <input
                  type="text"
                  value={issueNotes}
                  onChange={(e) => setIssueNotes(e.target.value)}
                  placeholder="Optional notes: e.g. Left cuff requires spot stain re-treatment..."
                  className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl text-xs font-medium focus:outline-hidden focus:ring-2 focus:ring-[#0077B6]"
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 sm:p-5 bg-slate-50 border-t border-gray-100 flex items-center gap-3 shrink-0">
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => setIsQCModalOpen(false)}
                className="px-5 py-3.5 bg-white hover:bg-gray-100 text-gray-700 border border-gray-200 rounded-2xl text-xs font-bold transition-all cursor-pointer"
              >
                Cancel (Esc)
              </button>

              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => submitQC('reprocess', issueNotes || 'Rewash requested by QC operator')}
                className="px-4 py-3.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 rounded-2xl text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <span className="hidden sm:inline">Send to Rewash</span>
                <span className="sm:hidden">Rewash</span>
              </button>

              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => submitQC('passed', issueNotes || 'Passed 9-point QC inspection & dispatched for delivery')}
                className="flex-1 py-3.5 px-6 bg-gradient-to-r from-emerald-600 via-[#0077B6] to-[#03045E] hover:from-emerald-700 hover:to-[#023E8A] text-white rounded-2xl text-xs font-black shadow-lg shadow-emerald-600/20 transition-all cursor-pointer flex items-center justify-center gap-2 active:scale-98"
              >
                <Truck className="w-4 h-4 text-emerald-300" />
                <span>
                  {selectedOrder.items.some(it => it.qcStatus === 'REWASH')
                    ? `Approve Partial & Route ${selectedOrder.items.filter(it => it.qcStatus === 'REWASH').length} to Rewash`
                    : 'Approve QC & Handover for Driver Delivery'}
                </span>
                <ArrowRight className="w-4 h-4 text-white/70" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── MACHINE RUN SELECTOR MODAL ─── */}
      {isMachineModalOpen && selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white w-full max-w-md rounded-3xl p-6 shadow-2xl border border-gray-100 space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-cyan-50 flex items-center justify-center text-cyan-600 text-sm">
                  🔄
                </div>
                <div>
                  <h3 className="font-extrabold text-gray-900 text-sm">Assign Batch to Plant Machine</h3>
                  <p className="text-[11px] text-gray-500">Order #{selectedOrder.id} • {selectedOrder.customerName}</p>
                </div>
              </div>
              <button
                onClick={() => setIsMachineModalOpen(false)}
                className="p-1 rounded-full text-gray-400 hover:text-gray-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1">Select Machine</label>
                <select
                  value={selectedMachineId}
                  onChange={(e) => setSelectedMachineId(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-medium text-gray-800 focus:ring-2 focus:ring-[#0077B6]"
                >
                  <option value="WASHER-01">Washer #1 — Miele Pro 18kg (Available)</option>
                  <option value="WASHER-02">Washer #2 — Primus 24kg (Available)</option>
                  <option value="WASHER-03">Washer #3 — Speed Queen 14kg (Available)</option>
                  <option value="DRYER-01">Dryer #1 — Electrolux Pro 20kg (Available)</option>
                  <option value="DRYER-02">Dryer #2 — Huebsch 25kg (Available)</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1">Program / Cycle Type</label>
                <select
                  value={cycleType}
                  onChange={(e) => setCycleType(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-medium text-gray-800 focus:ring-2 focus:ring-[#0077B6]"
                >
                  <option value="Intensive Stain Removal 60°C">Intensive Stain Removal 60°C (Rewash standard)</option>
                  <option value="Eco Wash 40°C">Eco Wash 40°C (Standard)</option>
                  <option value="Delicates & Silks 30°C">Delicates & Silks 30°C</option>
                  <option value="Sanitizing High-Heat 90°C">Sanitizing High-Heat 90°C</option>
                  <option value="Standard Warm Dry 50m">Standard Warm Dry 50m</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1">Water Temp</label>
                  <select
                    value={temperature}
                    onChange={(e) => setTemperature(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-medium text-gray-800"
                  >
                    <option value="30°C">30°C</option>
                    <option value="40°C">40°C</option>
                    <option value="60°C">60°C</option>
                    <option value="90°C">90°C</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1">Duration (Mins)</label>
                  <input
                    type="number"
                    min="10"
                    max="120"
                    value={durationMinutes}
                    onChange={(e) => setDurationMinutes(parseInt(e.target.value, 10) || 45)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-bold text-gray-800"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsMachineModalOpen(false)}
                className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl text-xs transition-colors cursor-pointer"
              >
                Skip / Close
              </button>
              <button
                type="button"
                onClick={handleStartMachineRun}
                disabled={machineRunSubmitting}
                className="flex-1 py-2.5 bg-[#03045E] hover:bg-[#0077B6] disabled:opacity-50 text-white font-bold rounded-xl text-xs transition-colors flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
              >
                {machineRunSubmitting ? 'Starting Run...' : 'Start Machine Run'}
              </button>
            </div>

            <div className="pt-1 text-center">
              <button
                type="button"
                onClick={async () => {
                  const faultReason = prompt(`Report mechanical breakdown for ${selectedMachineId}:`, 'Motor vibration / drum leak');
                  if (faultReason) {
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
                      alert(`Machine #${selectedMachineId} marked under FAULT/MAINTENANCE. Operational exception and alert dispatched to Plant Manager.`);
                      setIsMachineModalOpen(false);
                    } catch (e) {
                      alert('Machine failure alert dispatched.');
                    }
                  }
                }}
                className="text-[11px] text-rose-600 hover:text-rose-800 font-bold underline cursor-pointer"
              >
                ⚠️ Report Machine Fault / Breakdown
              </button>
            </div>
          </div>
        </div>
      )}


      {/* ─── Released for Driver Delivery Modal ────────────────────────────── */}
      {deliverySuccessModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={() => setDeliverySuccessModal(null)}
        >
          <div
            className="relative w-full max-w-lg bg-white rounded-3xl p-6 sm:p-7 shadow-2xl border border-gray-100 text-center space-y-4 animate-in zoom-in-95 duration-150 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Top Stripe */}
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-emerald-500 via-[#0077B6] to-[#03045E]" />

            <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-3xl flex items-center justify-center mx-auto shadow-inner mt-2">
              <Truck className="w-8 h-8 text-emerald-600" />
            </div>

            <div>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-100 text-emerald-800 border border-emerald-200">
                QC Passed • Dispatched for Delivery
              </span>
              <h3 className="text-xl font-black text-[#03045E] mt-1.5 tracking-tight">
                Handed Over for Driver Delivery
              </h3>
              <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                Garments for order <span className="font-mono font-bold text-gray-800">{deliverySuccessModal.orderId}</span> have met all quality specifications, packaged and sealed.
              </p>
            </div>

            {/* Delivery Details Card */}
            <div className="bg-slate-50 p-4 rounded-2xl border border-gray-100 text-left space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-gray-400 font-bold uppercase text-[9px] tracking-wider">Customer</span>
                <span className="font-bold text-gray-900">{deliverySuccessModal.customerName}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-400 font-bold uppercase text-[9px] tracking-wider">Bag QR Tag</span>
                <span className="font-mono font-bold text-[#0077B6]">{deliverySuccessModal.bagQr}</span>
              </div>
              <div className="flex items-center justify-between pt-1 border-t border-gray-200/60">
                <span className="text-gray-400 font-bold uppercase text-[9px] tracking-wider">Next Step</span>
                <span className="font-extrabold text-emerald-700 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Driver will pick up & deliver to customer
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeliverySuccessModal(null)}
                className="flex-1 py-3.5 px-4 bg-slate-100 hover:bg-slate-200 text-gray-800 rounded-2xl text-xs font-black transition-all cursor-pointer"
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
                  className="flex-1 py-3.5 px-4 bg-[#03045E] hover:bg-[#023E8A] text-white rounded-2xl text-xs font-black transition-all shadow-md shadow-[#03045E]/20 cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <ShoppingBag className="w-3.5 h-3.5 text-[#48CAE4]" />
                  <span>View Processing Board</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
