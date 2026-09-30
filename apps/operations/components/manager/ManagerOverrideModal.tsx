import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  RotateCcw,
  Key,
  Truck,
  Calendar,
  MapPin,
  AlertTriangle,
  CheckCircle2,
  Lock,
  FileText,
  RefreshCw,
  UserCheck,
  Clock,
  ArrowRightLeft,
  X,
  Plus,
  Trash2,
  PauseCircle,
  PlayCircle,
  PackageX,
  History,
  PhoneCall,
  Edit3
} from 'lucide-react';
import {
  dbManagerOrderOverride,
  dbManagerAssignDriver,
  dbFetchOrderAuditLogs,
  dbFetchManagerIncidents,
  dbCreateManagerIncident,
  dbAddIncidentNote,
  dbResolveIncident,
  getStoredSession
} from '@laundelle/api-client';
import { canPerformOverride, canResolveDispute } from '@laundelle/auth';

interface ManagerOverrideModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: any;
  drivers: any[];
  onSuccess: () => void;
  userRole?: string;
}

const TIME_SLOTS = [
  '08:00 - 10:00',
  '10:00 - 12:00',
  '12:00 - 14:00',
  '14:00 - 16:00',
  '16:00 - 18:00',
  '18:00 - 20:00'
];

export const ManagerOverrideModal: React.FC<ManagerOverrideModalProps> = ({
  isOpen,
  onClose,
  order,
  drivers,
  onSuccess,
  userRole
}) => {
  const session = getStoredSession();
  const effectiveRole = (userRole || session?.user?.role || 'manager').toLowerCase().trim();
  const isAdmin = effectiveRole === 'admin' || effectiveRole === 'super_admin';
  const isOrderCompleted = order?.status === 'delivered' || order?.status === 'completed' || Boolean(order?.is_delivered);

  const [activeTab, setActiveTab] = useState<'order' | 'pickup' | 'delivery' | 'incidents' | 'audit'>(
    isOrderCompleted ? 'audit' : 'order'
  );

  useEffect(() => {
    if (isOrderCompleted && (activeTab === 'order' || activeTab === 'pickup' || activeTab === 'delivery')) {
      setActiveTab('audit');
    }
  }, [isOrderCompleted, activeTab]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Common Reason
  const [reason, setReason] = useState('');

  // Reassign Driver
  const [selectedDriverId, setSelectedDriverId] = useState<string>(order?.assigned_driver_id || '');

  // Reschedule Form
  const [pickupDate, setPickupDate] = useState<string>(order?.pickupDate || '');
  const [pickupSlot, setPickupSlot] = useState<string>(order?.pickupSlot || TIME_SLOTS[0]);
  const [deliveryDate, setDeliveryDate] = useState<string>(order?.deliveryDate || '');
  const [deliverySlot, setDeliverySlot] = useState<string>(order?.deliverySlot || TIME_SLOTS[0]);

  // Edit Address / Contact Form
  const [editAddress, setEditAddress] = useState<string>(order?.address || '');
  const [editPostcode, setEditPostcode] = useState<string>(order?.postcode || '');
  const [editPhone, setEditPhone] = useState<string>(order?.phone || order?.customer_phone || '');
  const [editInstructions, setEditInstructions] = useState<string>(order?.specialInstructions || '');

  // Edit Items
  const [items, setItems] = useState<any[]>(
    Array.isArray(order?.items)
      ? order.items.map((i: any) => ({ ...i }))
      : []
  );

  // Advance Stage
  const [selectedStage, setSelectedStage] = useState<string>('washing');

  // Audit Logs
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);

  // Phase 2: Incidents & Disputes State
  const [orderIncidents, setOrderIncidents] = useState<any[]>([]);
  const [loadingIncidents, setLoadingIncidents] = useState(false);
  const [showNewIncidentForm, setShowNewIncidentForm] = useState(false);
  const [selectedIncident, setSelectedIncident] = useState<any | null>(null);

  // New Incident Form
  const [incType, setIncType] = useState<string>('lost_item');
  const [incPriority, setIncPriority] = useState<string>('medium');
  const [incTitle, setIncTitle] = useState('');
  const [incDesc, setIncDesc] = useState('');
  const [incItemName, setIncItemName] = useState('');
  const [incItemEstValue, setIncItemEstValue] = useState('');

  // Investigation & Resolution
  const [investigationNote, setInvestigationNote] = useState('');
  const [resolveType, setResolveType] = useState<string>(isAdmin ? 'refund' : 'rewash');
  const [resolveAmount, setResolveAmount] = useState('');
  const [resolveExplanation, setResolveExplanation] = useState('');

  // Update internal states when order changes
  useEffect(() => {
    if (order) {
      setSelectedDriverId(order.assigned_driver_id || '');
      setPickupDate(order.pickupDate || '');
      setPickupSlot(order.pickupSlot || TIME_SLOTS[0]);
      setDeliveryDate(order.deliveryDate || '');
      setDeliverySlot(order.deliverySlot || TIME_SLOTS[0]);
      setEditAddress(order.address || '');
      setEditPostcode(order.postcode || '');
      setEditPhone(order.phone || order.customer_phone || '');
      setEditInstructions(order.specialInstructions || '');
      setItems(Array.isArray(order.items) ? order.items.map((i: any) => ({ ...i })) : []);
      setReason('');
      setError(null);
      setSuccessMsg(null);
      setShowNewIncidentForm(false);
      setSelectedIncident(null);
      setResolveType(isAdmin ? 'refund' : 'rewash');
      fetchOrderIncidents();
    }
  }, [order, isAdmin]);

  // Fetch audit logs when tab is audit
  useEffect(() => {
    if (isOpen && order && activeTab === 'audit') {
      fetchAuditLogs();
    }
    if (isOpen && order && activeTab === 'incidents') {
      fetchOrderIncidents();
    }
  }, [isOpen, order, activeTab]);

  const fetchAuditLogs = async () => {
    if (!order?.id) return;
    setLoadingLogs(true);
    const res = await dbFetchOrderAuditLogs(order.id);
    setLoadingLogs(false);
    if (res.success && res.logs) {
      setAuditLogs(res.logs);
    }
  };

  const fetchOrderIncidents = async () => {
    if (!order?.id) return;
    setLoadingIncidents(true);
    const res = await dbFetchManagerIncidents({ orderId: order.id });
    setLoadingIncidents(false);
    if (res.success && res.incidents) {
      setOrderIncidents(res.incidents);
      if (res.incidents.length > 0 && !selectedIncident) {
        setSelectedIncident(res.incidents[0]);
      }
    }
  };

  const handleCreateIncident = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!incTitle.trim() || !incDesc.trim()) {
      setError('Incident title and description are required.');
      return;
    }
    setLoading(true);
    setError(null);
    const res = await dbCreateManagerIncident({
      orderId: order.id,
      title: incTitle.trim(),
      description: incDesc.trim(),
      type: incType,
      priority: incPriority,
      itemDetails: incItemName.trim() ? {
        name: incItemName.trim(),
        estimatedValue: incItemEstValue ? Number(incItemEstValue) : undefined
      } : undefined
    });
    setLoading(false);
    if (res.success) {
      setSuccessMsg(`Incident #${res.incident?.incidentNumber} registered successfully!`);
      setShowNewIncidentForm(false);
      setIncTitle('');
      setIncDesc('');
      setIncItemName('');
      setIncItemEstValue('');
      fetchOrderIncidents();
      onSuccess();
    } else {
      setError(res.error || 'Failed to file incident report.');
    }
  };

  const handleAddIncidentNote = async () => {
    if (!selectedIncident || !investigationNote.trim()) return;
    setLoading(true);
    setError(null);
    const res = await dbAddIncidentNote(selectedIncident.id || selectedIncident._id, investigationNote.trim());
    setLoading(false);
    if (res.success) {
      setInvestigationNote('');
      setSuccessMsg('Investigation note appended.');
      fetchOrderIncidents();
    } else {
      setError(res.error || 'Failed to add note.');
    }
  };

  const handleResolveIncident = async () => {
    if (!selectedIncident || !resolveExplanation.trim()) {
      setError('Resolution explanation is mandatory.');
      return;
    }
    if (!canResolveDispute(effectiveRole, resolveType)) {
      setError('Access Denied: Admin authorization required for financial remedies (refunds, credits, replacements).');
      return;
    }
    setLoading(true);
    setError(null);
    const res = await dbResolveIncident(selectedIncident.id || selectedIncident._id, {
      type: resolveType,
      amount: resolveAmount ? Number(resolveAmount) : undefined,
      explanation: resolveExplanation.trim()
    });
    setLoading(false);
    if (res.success) {
      setSuccessMsg(`Incident resolved successfully (${resolveType.toUpperCase()})!`);
      setResolveExplanation('');
      setResolveAmount('');
      fetchOrderIncidents();
      onSuccess();
    } else {
      setError(res.error || 'Failed to resolve incident.');
    }
  };

  if (!isOpen || !order) return null;

  const handleExecuteAction = async (action: string, payload?: any, requireReason = true) => {
    setError(null);
    setSuccessMsg(null);

    if (!canPerformOverride(effectiveRole, action)) {
      setError('Access Denied: Admin authorization required for this override action.');
      return;
    }

    const trimmedReason = reason.trim();
    if (requireReason && !trimmedReason) {
      setError('A valid operational reason is strictly mandatory for this override action.');
      return;
    }

    setLoading(true);
    const dataToSend = {
      ...(payload || {}),
      reason: trimmedReason
    };

    const res = await dbManagerOrderOverride(order.id, action, dataToSend);
    setLoading(false);

    if (res.success) {
      setSuccessMsg(`Action executed successfully! Status updated to ${res.status || 'updated'}.`);
      setReason('');
      onSuccess();
      // If on audit tab, refresh
      if (activeTab === 'audit') {
        fetchAuditLogs();
      }
    } else {
      setError(res.error || 'Execution failed. Please check parameters.');
    }
  };

  const handleReassignDriver = async () => {
    setError(null);
    setSuccessMsg(null);
    setLoading(true);

    const res = await dbManagerAssignDriver(order.id, selectedDriverId || null);
    setLoading(false);

    if (res.success) {
      setSuccessMsg(`Driver successfully updated!`);
      onSuccess();
    } else {
      setError(res.error || 'Failed to assign driver.');
    }
  };

  const handleUpdateItemsCount = (index: number, delta: number) => {
    const next = [...items];
    const newQty = Math.max(1, (Number(next[index].quantity) || 1) + delta);
    next[index].quantity = newQty;
    setItems(next);
  };

  const handleRemoveItem = (index: number) => {
    const next = items.filter((_, idx) => idx !== index);
    setItems(next);
  };

  const handleAddItem = () => {
    setItems([
      ...items,
      {
        id: `custom_${Date.now()}`,
        name: 'Additional Garment',
        quantity: 1,
        price: 5.0,
        unit: 'item'
      }
    ]);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-150">
      <div className="bg-white w-full max-w-3xl rounded-3xl shadow-2xl border border-gray-100 flex flex-col max-h-[85vh] sm:max-h-[90vh] overflow-hidden my-auto">
        {/* Modal Header */}
        <div className="p-4 sm:p-6 bg-linear-to-r from-[#03045E] to-[#0077B6] text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center backdrop-blur-xs border border-white/20">
              <ShieldAlert className="w-5 h-5 text-[#90E0EF]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold font-heading leading-tight">
                  Manager Command & Control
                </h2>
                <span className="font-mono text-xs px-2 py-0.5 rounded-full bg-white/20 text-[#CAF0F8] font-bold">
                  #{order.id}
                </span>
              </div>
              <p className="text-xs text-[#CAF0F8]/80 mt-0.5">
                Current Status: <span className="font-bold text-white capitalize">{order.statusLabel || order.status?.replace(/_/g, ' ')}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-white/10 text-white/80 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Security / Audit Alert Banner */}
        {isOrderCompleted ? (
          <div className="bg-emerald-50 px-4 sm:px-6 py-2.5 border-b border-emerald-200/60 flex items-center gap-2 shrink-0">
            <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
            <span className="text-[11px] font-bold text-emerald-900">
              Order Completed: This order is delivered and completed. Operational override controls are disabled.
            </span>
          </div>
        ) : (
          <div className="bg-amber-50 px-4 sm:px-6 py-2 border-b border-amber-200/60 flex items-center gap-2 shrink-0">
            <Lock className="w-3.5 h-3.5 text-amber-700 shrink-0" />
            <span className="text-[11px] font-semibold text-amber-900">
              Manager Action: Every override is permanently written to the tamper-evident audit log with your manager ID and timestamp.
            </span>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="flex border-b border-gray-100 bg-gray-50/70 px-4 sm:px-6 gap-1 shrink-0 overflow-x-auto">
          {!isOrderCompleted && (
            <>
              <button
                onClick={() => setActiveTab('order')}
                className={`py-3 px-3.5 font-bold text-xs flex items-center gap-2 border-b-2 cursor-pointer transition-all whitespace-nowrap ${
                  activeTab === 'order'
                    ? 'border-[#03045E] text-[#03045E] bg-white rounded-t-xl'
                    : 'border-transparent text-gray-500 hover:text-gray-900'
                }`}
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Order Control</span>
              </button>
              <button
                onClick={() => setActiveTab('pickup')}
                className={`py-3 px-3.5 font-bold text-xs flex items-center gap-2 border-b-2 cursor-pointer transition-all whitespace-nowrap ${
                  activeTab === 'pickup'
                    ? 'border-[#03045E] text-[#03045E] bg-white rounded-t-xl'
                    : 'border-transparent text-gray-500 hover:text-gray-900'
                }`}
              >
                <Truck className="w-3.5 h-3.5" />
                <span>Pickup Control</span>
              </button>
              <button
                onClick={() => setActiveTab('delivery')}
                className={`py-3 px-3.5 font-bold text-xs flex items-center gap-2 border-b-2 cursor-pointer transition-all whitespace-nowrap ${
                  activeTab === 'delivery'
                    ? 'border-[#03045E] text-[#03045E] bg-white rounded-t-xl'
                    : 'border-transparent text-gray-500 hover:text-gray-900'
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Delivery Control</span>
              </button>
            </>
          )}
          <button
            onClick={() => setActiveTab('incidents')}
            className={`py-3 px-3.5 font-bold text-xs flex items-center gap-2 border-b-2 cursor-pointer transition-all whitespace-nowrap ${
              activeTab === 'incidents'
                ? 'border-[#03045E] text-[#03045E] bg-white rounded-t-xl'
                : 'border-transparent text-gray-500 hover:text-gray-900'
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5 text-red-500" />
            <span>Incidents & Disputes</span>
            {orderIncidents.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-red-600 text-white text-[10px]">
                {orderIncidents.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('audit')}
            className={`py-3 px-3.5 font-bold text-xs flex items-center gap-2 border-b-2 cursor-pointer transition-all whitespace-nowrap ${
              activeTab === 'audit'
                ? 'border-[#03045E] text-[#03045E] bg-white rounded-t-xl'
                : 'border-transparent text-gray-500 hover:text-gray-900'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>Audit Trail</span>
            {auditLogs.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-[#03045E] text-white text-[10px]">
                {auditLogs.length}
              </span>
            )}
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-5">
          {/* Notifications */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-2xl flex items-center gap-3 text-red-700 text-xs font-semibold">
              <AlertTriangle className="w-4 h-4 shrink-0 text-red-600" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-3 text-emerald-800 text-xs font-semibold">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Mandatory Reason Input (Shown on action tabs) */}
          {['order', 'pickup', 'delivery'].includes(activeTab) && (
            <div className="bg-gray-50 p-4 rounded-2xl border border-gray-200/80 space-y-1.5">
              <label className="flex items-center justify-between text-xs font-bold text-gray-700">
                <span className="flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-[#0077B6]" />
                  Operational Reason / Justification
                </span>
                <span className="text-[10px] text-red-600 font-semibold uppercase tracking-wider">
                  Mandatory for rollbacks, overrides & cancellations
                </span>
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={2}
                placeholder="E.g. Driver mistakenly tapped Pickup Completed; Customer phone died at doorstep verified identity verbally; Rescheduled per phone request..."
                className="w-full px-3 py-2 bg-white rounded-xl border border-gray-200 text-xs focus:ring-2 focus:ring-[#03045E] focus:outline-hidden"
              />
            </div>
          )}

          {/* TAB 1: ORDER CONTROL */}
          {activeTab === 'order' && (
            <div className="space-y-6">
              {/* Quick Status Rollbacks & Emergency Actions (Admin Only) */}
              {isAdmin && (
                <div>
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">
                    Workflow Rollbacks & Life-Cycle Actions (Admin Only)
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Rollback Pickup */}
                    <div className="p-3.5 rounded-2xl border border-amber-200 bg-amber-50/40 space-y-2">
                      <div className="flex items-center gap-2 text-amber-900 font-bold text-xs">
                        <RotateCcw className="w-4 h-4 text-amber-600 shrink-0" />
                        <span>Rollback Pickup</span>
                      </div>
                      <p className="text-[11px] text-gray-600">
                        Driver accidentally marked pickup complete without collecting garments. Reverts order back to collection queue.
                      </p>
                      <button
                        disabled={loading}
                        onClick={() => handleExecuteAction('rollback_pickup')}
                        className="w-full py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold text-xs cursor-pointer transition-colors"
                      >
                        Revert to Awaiting Pickup
                      </button>
                    </div>

                    {/* Rollback Delivery */}
                    <div className="p-3.5 rounded-2xl border border-purple-200 bg-purple-50/40 space-y-2">
                      <div className="flex items-center gap-2 text-purple-900 font-bold text-xs">
                        <RotateCcw className="w-4 h-4 text-purple-600 shrink-0" />
                        <span>Rollback Delivery</span>
                      </div>
                      <p className="text-[11px] text-gray-600">
                        Delivered by mistake or to wrong door. Reopens delivery workflow so driver or plant can rectify.
                      </p>
                      <button
                        disabled={loading}
                        onClick={() => handleExecuteAction('rollback_delivery')}
                        className="w-full py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold text-xs cursor-pointer transition-colors"
                      >
                        Revert Delivery Status
                      </button>
                    </div>

                    {/* Cancel Order */}
                    <div className="p-3.5 rounded-2xl border border-red-200 bg-red-50/40 space-y-2">
                      <div className="flex items-center gap-2 text-red-900 font-bold text-xs">
                        <PackageX className="w-4 h-4 text-red-600 shrink-0" />
                        <span>Cancel Order</span>
                      </div>
                      <p className="text-[11px] text-gray-600">
                        Customer requested immediate cancellation or order is non-serviceable. Enforces mandatory audit reason.
                      </p>
                      <button
                        disabled={loading}
                        onClick={() => handleExecuteAction('cancel_order')}
                        className="w-full py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold text-xs cursor-pointer transition-colors"
                      >
                        Terminate / Cancel Order
                      </button>
                    </div>

                    {/* Reopen Order */}
                    <div className="p-3.5 rounded-2xl border border-emerald-200 bg-emerald-50/40 space-y-2">
                      <div className="flex items-center gap-2 text-emerald-900 font-bold text-xs">
                        <PlayCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>Reopen Cancelled Order</span>
                      </div>
                      <p className="text-[11px] text-gray-600">
                        Accidentally cancelled order or customer changed mind to proceed. Restores order to active pipeline.
                      </p>
                      <button
                        disabled={loading}
                        onClick={() => handleExecuteAction('reopen_order', undefined, false)}
                        className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs cursor-pointer transition-colors"
                      >
                        Reopen & Reactivate
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Reassign Driver Form */}
              <div className="p-4 rounded-2xl border border-gray-200 bg-white space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-bold text-[#03045E]">
                    <UserCheck className="w-4 h-4 text-[#0077B6]" />
                    <span>Reassign Dedicated Driver</span>
                  </div>
                  <span className="text-[11px] text-gray-500 font-semibold">
                    Current: {order.driver?.name || order.assigned_driver_name || 'Unassigned'}
                  </span>
                </div>
                <div className="flex gap-2">
                  <select
                    value={selectedDriverId}
                    onChange={(e) => setSelectedDriverId(e.target.value)}
                    className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-[#03045E] focus:outline-hidden"
                  >
                    <option value="">-- Unassign (Return to Plant Pool) --</option>
                    {drivers.map((d) => (
                      <option key={d._id} value={d._id}>
                        {d.full_name} ({d.availability || d.status || 'Active'}) - {d.vehicle || 'Driver'}
                      </option>
                    ))}
                  </select>
                  <button
                    disabled={loading}
                    onClick={handleReassignDriver}
                    className="px-4 py-2 bg-[#03045E] hover:bg-[#0077B6] text-white rounded-xl text-xs font-bold cursor-pointer transition-colors flex items-center gap-1.5"
                  >
                    <ArrowRightLeft className="w-3.5 h-3.5" />
                    <span>Apply</span>
                  </button>
                </div>
              </div>

              {/* Reschedule Slot Form */}
              <div className="p-4 rounded-2xl border border-gray-200 bg-white space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-[#03045E]">
                  <Calendar className="w-4 h-4 text-[#0077B6]" />
                  <span>Reschedule Pickup / Delivery Slot</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-gray-600">Pickup Date</label>
                    <input
                      type="date"
                      value={pickupDate}
                      onChange={(e) => setPickupDate(e.target.value)}
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-gray-600">Pickup Slot</label>
                    <select
                      value={pickupSlot}
                      onChange={(e) => setPickupSlot(e.target.value)}
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs"
                    >
                      {TIME_SLOTS.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-gray-600">Delivery Date</label>
                    <input
                      type="date"
                      value={deliveryDate}
                      onChange={(e) => setDeliveryDate(e.target.value)}
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-gray-600">Delivery Slot</label>
                    <select
                      value={deliverySlot}
                      onChange={(e) => setDeliverySlot(e.target.value)}
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs"
                    >
                      {TIME_SLOTS.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <button
                  disabled={loading}
                  onClick={() =>
                    handleExecuteAction(
                      'reschedule_slot',
                      { pickupDate, pickupSlot, deliveryDate, deliverySlot },
                      false
                    )
                  }
                  className="w-full py-2 bg-[#0077B6] hover:bg-[#03045E] text-white rounded-xl text-xs font-bold cursor-pointer transition-colors"
                >
                  Confirm Slot Changes
                </button>
              </div>

              {/* Edit Address & Customer Contact */}
              <div className="p-4 rounded-2xl border border-gray-200 bg-white space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-[#03045E]">
                  <MapPin className="w-4 h-4 text-[#0077B6]" />
                  <span>Edit Address & Contact (Fix Delivery Blockers)</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="sm:col-span-2 space-y-1">
                    <label className="text-[11px] font-bold text-gray-600">Street Address</label>
                    <input
                      type="text"
                      value={editAddress}
                      onChange={(e) => setEditAddress(e.target.value)}
                      placeholder="Full street address..."
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-gray-600">Postcode</label>
                    <input
                      type="text"
                      value={editPostcode}
                      onChange={(e) => setEditPostcode(e.target.value)}
                      placeholder="e.g. SW1A 1AA"
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-gray-600">Contact Phone</label>
                    <input
                      type="text"
                      value={editPhone}
                      onChange={(e) => setEditPhone(e.target.value)}
                      placeholder="+44 7123 456789"
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs"
                    />
                  </div>
                  <div className="sm:col-span-2 space-y-1">
                    <label className="text-[11px] font-bold text-gray-600">Access Instructions</label>
                    <input
                      type="text"
                      value={editInstructions}
                      onChange={(e) => setEditInstructions(e.target.value)}
                      placeholder="Door code, concierge directions..."
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs"
                    />
                  </div>
                </div>
                <button
                  disabled={loading}
                  onClick={() =>
                    handleExecuteAction(
                      'edit_order_details',
                      {
                        address: editAddress,
                        postcode: editPostcode,
                        phone: editPhone,
                        specialInstructions: editInstructions
                      },
                      false
                    )
                  }
                  className="w-full py-2 bg-[#0077B6] hover:bg-[#03045E] text-white rounded-xl text-xs font-bold cursor-pointer transition-colors"
                >
                  Save Address & Contact Update
                </button>
              </div>

              {/* Edit Order Items & Bags (Admin Only) */}
              {isAdmin && (
                <div className="p-4 rounded-2xl border border-gray-200 bg-white space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs font-bold text-[#03045E]">
                      <Edit3 className="w-4 h-4 text-[#0077B6]" />
                      <span>Garment Inventory Adjuster (Admin Only)</span>
                    </div>
                    <button
                      onClick={handleAddItem}
                      className="px-2 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-[10px] font-bold cursor-pointer flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Add Item</span>
                    </button>
                  </div>

                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {items.map((item, idx) => (
                      <div key={item.id || idx} className="p-2.5 bg-gray-50 rounded-xl flex items-center justify-between text-xs">
                        <div className="flex-1 pr-2">
                          <input
                            type="text"
                            value={item.name}
                            onChange={(e) => {
                              const next = [...items];
                              next[idx].name = e.target.value;
                              setItems(next);
                            }}
                            className="w-full bg-transparent font-bold text-gray-800 focus:outline-hidden"
                          />
                          <span className="text-[10px] text-gray-400">£{item.price || 5.0} each</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex items-center border border-gray-200 rounded-lg bg-white overflow-hidden">
                            <button
                              onClick={() => handleUpdateItemsCount(idx, -1)}
                              className="px-2 py-0.5 hover:bg-gray-100 text-gray-600 font-bold"
                            >
                              -
                            </button>
                            <span className="px-2 font-mono font-bold text-xs">{item.quantity}</span>
                            <button
                              onClick={() => handleUpdateItemsCount(idx, 1)}
                              className="px-2 py-0.5 hover:bg-gray-100 text-gray-600 font-bold"
                            >
                              +
                            </button>
                          </div>
                          <button
                            onClick={() => handleRemoveItem(idx)}
                            className="p-1 hover:bg-red-50 text-red-500 rounded cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <button
                    disabled={loading}
                    onClick={() => handleExecuteAction('edit_order_items', { items }, false)}
                    className="w-full py-2 bg-[#0077B6] hover:bg-[#03045E] text-white rounded-xl text-xs font-bold cursor-pointer transition-colors"
                  >
                    Save Item Corrections
                  </button>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: PICKUP CONTROL */}
          {activeTab === 'pickup' && (
            <div className="space-y-4">
              {/* Manual Pickup OTP Override (Admin Only) */}
              {isAdmin && (
                <div className="p-4 rounded-2xl border border-blue-200 bg-blue-50/40 space-y-2">
                  <div className="flex items-center gap-2 text-[#03045E] font-bold text-xs">
                    <Key className="w-4 h-4 text-[#0077B6] shrink-0" />
                    <span>Manual Pickup OTP Override (Admin Only Emergency Bypass)</span>
                  </div>
                  <p className="text-[11px] text-gray-600">
                    Customer phone is out of battery, OTP was not received, or customer cannot view SMS. Administrator verifies customer verbally and overrides OTP verification to complete pickup immediately.
                  </p>
                  <div className="pt-2">
                    <button
                      disabled={loading}
                      onClick={() => handleExecuteAction('force_pickup_otp')}
                      className="w-full py-2.5 bg-[#03045E] hover:bg-[#0077B6] text-white rounded-xl font-bold text-xs cursor-pointer transition-colors flex items-center justify-center gap-2"
                    >
                      <Key className="w-3.5 h-3.5" />
                      <span>Force Pickup Verification (OTP Bypass)</span>
                    </button>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Resend / Regenerate OTP */}
                <div className="p-3.5 rounded-2xl border border-gray-200 bg-white space-y-2">
                  <div className="flex items-center gap-2 text-gray-900 font-bold text-xs">
                    <RefreshCw className="w-4 h-4 text-[#0077B6]" />
                    <span>Generate Fresh OTP</span>
                  </div>
                  <p className="text-[11px] text-gray-500">
                    Generates a new 6-digit pickup PIN and pushes it directly to customer notifications.
                  </p>
                  <button
                    disabled={loading}
                    onClick={() => handleExecuteAction('resend_pickup_otp', undefined, false)}
                    className="w-full py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-xl font-bold text-xs cursor-pointer transition-colors"
                  >
                    Generate & Send Fresh PIN
                  </button>
                </div>

                {/* Mark Customer Unavailable */}
                <div className="p-3.5 rounded-2xl border border-amber-200 bg-amber-50/40 space-y-2">
                  <div className="flex items-center gap-2 text-amber-900 font-bold text-xs">
                    <PhoneCall className="w-4 h-4 text-amber-600" />
                    <span>Mark Customer Unavailable</span>
                  </div>
                  <p className="text-[11px] text-gray-600">
                    Driver at doorstep but customer not answering or security denied entry. Flag for rescheduling.
                  </p>
                  <button
                    disabled={loading}
                    onClick={() => handleExecuteAction('mark_customer_unavailable')}
                    className="w-full py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold text-xs cursor-pointer transition-colors"
                  >
                    Flag Unavailable • Reschedule
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: DELIVERY CONTROL */}
          {activeTab === 'delivery' && (
            <div className="space-y-4">
              {/* Force Delivery PIN (Admin Only) */}
              {isAdmin && (
                <div className="p-4 rounded-2xl border border-emerald-200 bg-emerald-50/40 space-y-2">
                  <div className="flex items-center gap-2 text-emerald-900 font-bold text-xs">
                    <Key className="w-4 h-4 text-emerald-700 shrink-0" />
                    <span>Manual Delivery PIN Override (Admin Only Handover Confirmation)</span>
                  </div>
                  <p className="text-[11px] text-gray-600">
                    Customer does not have their delivery PIN at hand or network is unavailable at doorstep. Administrator confirms handover to verified recipient and bypasses the PIN requirement.
                  </p>
                  <div className="pt-2">
                    <button
                      disabled={loading}
                      onClick={() => handleExecuteAction('force_delivery_pin')}
                      className="w-full py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl font-bold text-xs cursor-pointer transition-colors flex items-center justify-center gap-2"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Force Complete Delivery (PIN Bypass)</span>
                    </button>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Resend / Regenerate Delivery PIN */}
                <div className="p-3.5 rounded-2xl border border-gray-200 bg-white space-y-2">
                  <div className="flex items-center gap-2 text-gray-900 font-bold text-xs">
                    <RefreshCw className="w-4 h-4 text-emerald-600" />
                    <span>Generate Fresh Delivery PIN</span>
                  </div>
                  <p className="text-[11px] text-gray-500">
                    Generates a new 4-digit doorstep delivery PIN and pushes it directly to customer notifications.
                  </p>
                  <button
                    disabled={loading}
                    onClick={() => handleExecuteAction('resend_delivery_otp', undefined, false)}
                    className="w-full py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-xl font-bold text-xs cursor-pointer transition-colors"
                  >
                    Generate & Send Fresh Delivery PIN
                  </button>
                </div>

                {/* Return to Plant Storage */}
                <div className="p-3.5 rounded-2xl border border-blue-200 bg-blue-50/40 space-y-2">
                  <div className="flex items-center gap-2 text-blue-900 font-bold text-xs">
                    <Truck className="w-4 h-4 text-blue-600" />
                    <span>Return to Plant Safe Storage</span>
                  </div>
                  <p className="text-[11px] text-gray-600">
                    Failed delivery attempt. Unassigns driver and secures garments back in plant inventory.
                  </p>
                  <button
                    disabled={loading}
                    onClick={() => handleExecuteAction('return_to_plant')}
                    className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs cursor-pointer transition-colors"
                  >
                    Log Return to Plant
                  </button>
                </div>

                {/* Put On Hold (Admin Only) */}
                {isAdmin && (
                  <div className="p-3.5 rounded-2xl border border-amber-200 bg-amber-50/40 space-y-2">
                    <div className="flex items-center gap-2 text-amber-900 font-bold text-xs">
                      <PauseCircle className="w-4 h-4 text-amber-600" />
                      <span>Put Order On Operational Hold</span>
                    </div>
                    <p className="text-[11px] text-gray-600">
                      Freezes processing or dispatch while awaiting customer instructions or resolving dispute.
                    </p>
                    <button
                      disabled={loading}
                      onClick={() => handleExecuteAction('put_on_hold')}
                      className="w-full py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold text-xs cursor-pointer transition-colors"
                    >
                      Freeze Order (Put On Hold)
                    </button>
                  </div>
                )}
              </div>

              {/* Stage Advance Fast-Track */}
              <div className="p-4 rounded-2xl border border-gray-200 bg-white space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-bold text-[#03045E]">
                    <PlayCircle className="w-4 h-4 text-[#0077B6]" />
                    <span>Advance Pipeline Stage</span>
                  </div>
                  <button
                    onClick={() => handleExecuteAction('flag_rewash')}
                    className="px-2.5 py-1 bg-amber-50 text-amber-700 hover:bg-amber-100 rounded-lg text-[10px] font-bold cursor-pointer transition-colors"
                  >
                    Trigger Rewash
                  </button>
                </div>
                <div className="flex gap-2">
                  <select
                    value={selectedStage}
                    onChange={(e) => setSelectedStage(e.target.value)}
                    className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-[#03045E] focus:outline-hidden"
                  >
                    <option value="washing">Washing Cycle</option>
                    <option value="drying">Drying Cycle</option>
                    <option value="folding_steaming">Folding & Steaming</option>
                    <option value="ready_for_qc">Quality Inspection Ready</option>
                    <option value="ready_for_delivery">Ready for Delivery</option>
                  </select>
                  <button
                    disabled={loading}
                    onClick={() => handleExecuteAction('advance_stage', { nextStage: selectedStage }, false)}
                    className="px-4 py-2 bg-[#03045E] hover:bg-[#0077B6] text-white rounded-xl text-xs font-bold cursor-pointer transition-colors"
                  >
                    Fast-Track Stage
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB: INCIDENTS & DISPUTES */}
          {activeTab === 'incidents' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-[#03045E] uppercase tracking-wider">
                    Incident Reports & Disputes ({orderIncidents.length})
                  </h3>
                  <p className="text-[11px] text-gray-500">
                    Log and resolve lost items, garment damages, wrong deliveries, and customer complaints.
                  </p>
                </div>
                <button
                  onClick={() => setShowNewIncidentForm(!showNewIncidentForm)}
                  className="px-3 py-1.5 bg-[#03045E] hover:bg-[#0077B6] text-white rounded-xl text-xs font-bold cursor-pointer transition-colors flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{showNewIncidentForm ? 'Cancel Report' : 'File Incident'}</span>
                </button>
              </div>

              {/* Form to file new incident on this order */}
              {showNewIncidentForm && (
                <form onSubmit={handleCreateIncident} className="p-4 bg-red-50/40 border border-red-200 rounded-2xl space-y-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-red-900">
                    <ShieldAlert className="w-4 h-4 text-red-600" />
                    <span>File New Incident Report for Order #{order.id}</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div>
                      <label className="text-[11px] font-bold text-gray-700 block mb-1">Incident Category</label>
                      <select
                        value={incType}
                        onChange={(e) => setIncType(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs font-semibold"
                      >
                        <option value="lost_item">Lost Item (Transit / Plant)</option>
                        <option value="damaged_item">Damaged Item (Torn / Discolored / Shrunk)</option>
                        <option value="wrong_item">Wrong Item Delivered / Mixed Bag</option>
                        <option value="missing_item">Missing Item Shortfall</option>
                        <option value="customer_complaint">Customer Quality Complaint</option>
                        <option value="delivery_dispute">Doorstep Delivery Dispute</option>
                        <option value="payment_dispute">Weigh-in / Payment Dispute</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-gray-700 block mb-1">Priority</label>
                      <select
                        value={incPriority}
                        onChange={(e) => setIncPriority(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs font-semibold"
                      >
                        <option value="low">Low - Standard inquiry</option>
                        <option value="medium">Medium - Normal inspection</option>
                        <option value="high">High - Escalated claim</option>
                        <option value="urgent">Urgent - VIP / Critical loss</option>
                      </select>
                    </div>

                    <div className="sm:col-span-2">
                      <label className="text-[11px] font-bold text-gray-700 block mb-1">Incident Title</label>
                      <input
                        type="text"
                        value={incTitle}
                        onChange={(e) => setIncTitle(e.target.value)}
                        placeholder="e.g. Silk shirt torn along left seam during press cycle"
                        className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs font-medium"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-gray-700 block mb-1">Affected Garment / Item</label>
                      <input
                        type="text"
                        value={incItemName}
                        onChange={(e) => setIncItemName(e.target.value)}
                        placeholder="e.g. Blue Hugo Boss Blazer"
                        className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-gray-700 block mb-1">Estimated Value (£)</label>
                      <input
                        type="number"
                        value={incItemEstValue}
                        onChange={(e) => setIncItemEstValue(e.target.value)}
                        placeholder="e.g. 120"
                        className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="text-[11px] font-bold text-gray-700 block mb-1">Full Detailed Narrative</label>
                      <textarea
                        value={incDesc}
                        onChange={(e) => setIncDesc(e.target.value)}
                        rows={2}
                        placeholder="State what happened, who observed it, and current item location..."
                        className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setShowNewIncidentForm(false)}
                      className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-xl text-xs font-bold cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="px-4 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold cursor-pointer shadow-xs"
                    >
                      Submit Official Incident Report
                    </button>
                  </div>
                </form>
              )}

              {/* Incidents List or Empty State */}
              {loadingIncidents ? (
                <div className="py-8 text-center text-xs text-gray-400">Loading incident records...</div>
              ) : orderIncidents.length === 0 && !showNewIncidentForm ? (
                <div className="p-8 text-center bg-gray-50 rounded-2xl border border-gray-200/60 space-y-2">
                  <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
                  <p className="text-xs font-bold text-gray-700">No active incidents for this order</p>
                  <p className="text-[11px] text-gray-400">All garments and delivery processes are clear of disputes.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {orderIncidents.map((inc) => {
                    const isResolved = inc.status?.startsWith('resolved');
                    const isSelected = selectedIncident?._id === inc._id || selectedIncident?.id === inc.id;

                    return (
                      <div
                        key={inc._id || inc.id}
                        className={`p-4 rounded-2xl border transition-all text-xs space-y-3 ${
                          isSelected ? 'bg-white border-[#0077B6] shadow-sm ring-1 ring-[#0077B6]/20' : 'bg-gray-50 border-gray-200/80'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-xs text-[#03045E]">#{inc.incidentNumber}</span>
                              <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${
                                inc.priority === 'urgent' ? 'bg-red-100 text-red-700' :
                                inc.priority === 'high' ? 'bg-amber-100 text-amber-700' :
                                'bg-blue-50 text-blue-700'
                              }`}>
                                {inc.priority}
                              </span>
                              <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold capitalize ${
                                isResolved ? 'bg-emerald-100 text-emerald-800' :
                                inc.status === 'investigating' ? 'bg-purple-100 text-purple-800' :
                                'bg-amber-50 text-amber-800'
                              }`}>
                                {inc.status?.replace(/_/g, ' ')}
                              </span>
                            </div>
                            <h4 className="font-bold text-gray-900 text-xs mt-1">{inc.title}</h4>
                            <p className="text-gray-600 text-[11px] mt-0.5 leading-relaxed">{inc.description}</p>
                          </div>
                          {inc.itemDetails?.estimatedValue && (
                            <span className="px-2.5 py-1 bg-amber-50 text-amber-900 rounded-xl font-bold font-mono text-xs shrink-0 border border-amber-200">
                              Est. £{inc.itemDetails.estimatedValue}
                            </span>
                          )}
                        </div>

                        {/* Investigation Notes Feed */}
                        {inc.investigationNotes && inc.investigationNotes.length > 0 && (
                          <div className="space-y-1.5 pt-2 border-t border-gray-100">
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                              Investigation Activity Trail ({inc.investigationNotes.length})
                            </span>
                            <div className="space-y-1 max-h-32 overflow-y-auto pr-1">
                              {inc.investigationNotes.map((nt: any, nIdx: number) => (
                                <div key={nIdx} className="p-2 bg-white rounded-xl border border-gray-100 text-[11px] space-y-0.5">
                                  <div className="flex items-center justify-between text-[10px] text-gray-400">
                                    <span className="font-bold text-gray-700">{nt.actorName || 'Manager'}</span>
                                    <span>{new Date(nt.timestamp).toLocaleTimeString()}</span>
                                  </div>
                                  <p className="text-gray-700">{nt.note}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Resolution details if resolved */}
                        {isResolved && inc.resolution && (
                          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl space-y-1 text-[11px]">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-emerald-900 flex items-center gap-1">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                Resolved via {inc.resolution.type?.toUpperCase()}
                              </span>
                              {inc.resolution.amount && (
                                <span className="font-bold font-mono text-emerald-800">£{inc.resolution.amount}</span>
                              )}
                            </div>
                            <p className="text-emerald-800">{inc.resolution.explanation}</p>
                            <span className="text-[10px] text-emerald-600 block">
                              By {inc.resolution.resolvedByName || 'Plant Manager'} on {new Date(inc.resolution.resolvedAt).toLocaleDateString()}
                            </span>
                          </div>
                        )}

                        {/* If not resolved, allow adding note and resolving */}
                        {!isResolved && (
                          <div className="space-y-2.5 pt-2 border-t border-gray-100">
                            {/* Add Note Bar */}
                            <div className="flex gap-2">
                              <input
                                type="text"
                                value={selectedIncident?.id === inc.id ? investigationNote : ''}
                                onChange={(e) => {
                                  setSelectedIncident(inc);
                                  setInvestigationNote(e.target.value);
                                }}
                                placeholder="Add note to investigation trail..."
                                className="flex-1 px-3 py-1.5 bg-white border border-gray-200 rounded-xl text-xs focus:outline-hidden"
                              />
                              <button
                                onClick={handleAddIncidentNote}
                                disabled={loading}
                                className="px-3 py-1.5 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-xl text-xs font-bold cursor-pointer transition-colors"
                              >
                                Post Note
                              </button>
                            </div>

                            {/* Resolution Console Box */}
                            <div className="p-3 bg-gray-100/70 rounded-xl border border-gray-200 space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] font-bold text-[#03045E] uppercase tracking-wider block">
                                  {isAdmin ? 'Administrator Resolution Action Deck' : 'Operational Resolution Deck'}
                                </span>
                                {!isAdmin && (
                                  <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                                    Financial Remedies Restricted to Admin
                                  </span>
                                )}
                              </div>

                              {!isAdmin && (
                                <div className="p-2 bg-blue-50 border border-blue-200 rounded-xl text-[10px] text-[#03045E] flex items-center gap-1.5 font-medium">
                                  <AlertTriangle className="w-3.5 h-3.5 text-[#0077B6] shrink-0" />
                                  <span>Operational resolution: Trigger rewash cycle or dismiss claim. Monetary remedies (Refunds, Credits, Replacements) require Admin authorization.</span>
                                </div>
                              )}

                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                                <div className={!isAdmin ? 'sm:col-span-2' : ''}>
                                  <label className="text-[10px] font-bold text-gray-600 block mb-0.5">Resolution Remedy</label>
                                  <select
                                    value={selectedIncident?.id === inc.id ? resolveType : (isAdmin ? 'refund' : 'rewash')}
                                    onChange={(e) => {
                                      setSelectedIncident(inc);
                                      setResolveType(e.target.value);
                                    }}
                                    className="w-full px-2.5 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-semibold"
                                  >
                                    <option value="rewash">🔄 Trigger Free Rewash Cycle</option>
                                    {isAdmin && (
                                      <>
                                        <option value="refund">💸 Issue Customer Refund (Admin Only)</option>
                                        <option value="credit">💳 Issue Wallet Goodwill Credit (Admin Only)</option>
                                        <option value="replacement">📦 Garment Replacement Value (Admin Only)</option>
                                      </>
                                    )}
                                    <option value="dismissed">❌ Dismiss Claim (Pre-existing/Invalid)</option>
                                    <option value="manual">📝 Operational Note / Resolved Manually</option>
                                  </select>
                                </div>
                                {isAdmin && (
                                  <div>
                                    <label className="text-[10px] font-bold text-gray-600 block mb-0.5">Remedy Value (£)</label>
                                    <input
                                      type="number"
                                      value={selectedIncident?.id === inc.id ? resolveAmount : ''}
                                      onChange={(e) => {
                                        setSelectedIncident(inc);
                                        setResolveAmount(e.target.value);
                                      }}
                                      placeholder="e.g. 25.00"
                                      className="w-full px-2.5 py-1.5 bg-white border border-gray-200 rounded-lg text-xs"
                                    />
                                  </div>
                                )}
                                <div className="sm:col-span-2">
                                  <input
                                    type="text"
                                    value={selectedIncident?.id === inc.id ? resolveExplanation : ''}
                                    onChange={(e) => {
                                      setSelectedIncident(inc);
                                      setResolveExplanation(e.target.value);
                                    }}
                                    placeholder="Mandatory official justification explanation for customer and audit trail..."
                                    className="w-full px-2.5 py-1.5 bg-white border border-gray-200 rounded-lg text-xs"
                                  />
                                </div>
                              </div>
                              <div className="flex justify-end pt-1">
                                <button
                                  onClick={() => {
                                    setSelectedIncident(inc);
                                    handleResolveIncident();
                                  }}
                                  disabled={loading}
                                  className="px-4 py-1.5 bg-[#03045E] hover:bg-[#0077B6] text-white rounded-xl text-xs font-bold cursor-pointer transition-colors shadow-xs"
                                >
                                  Execute Official Resolution
                                </button>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 4: AUDIT TRAIL */}
          {activeTab === 'audit' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-[#03045E] uppercase tracking-wider">
                  Cryptographic Audit Log Trail
                </h3>
                <button
                  onClick={fetchAuditLogs}
                  disabled={loadingLogs}
                  className="px-2.5 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-[11px] font-bold cursor-pointer flex items-center gap-1.5 transition-colors"
                >
                  <RefreshCw className={`w-3 h-3 ${loadingLogs ? 'animate-spin' : ''}`} />
                  <span>Refresh</span>
                </button>
              </div>

              {loadingLogs ? (
                <div className="py-12 text-center text-gray-400 text-xs">
                  Loading tamper-evident audit trail...
                </div>
              ) : auditLogs.length === 0 ? (
                <div className="py-12 text-center text-gray-400 text-xs bg-gray-50 rounded-2xl border border-gray-100">
                  No manager overrides recorded for this order yet.
                </div>
              ) : (
                <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
                  {auditLogs.map((log: any, idx: number) => (
                    <div
                      key={log._id || idx}
                      className="p-3.5 bg-gray-50 rounded-2xl border border-gray-200/80 text-xs space-y-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-[#03045E] flex items-center gap-1.5">
                          <ShieldAlert className="w-3.5 h-3.5 text-[#0077B6]" />
                          {log.action?.replace(/_/g, ' ') || log.event?.replace(/_/g, ' ') || 'Manager Override'}
                        </span>
                        <span className="text-[10px] font-mono text-gray-400">
                          {new Date(log.timestamp).toLocaleString()}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 text-[11px] text-gray-600">
                        <span className="font-semibold text-gray-900">{log.actorName || 'Plant Manager'}</span>
                        <span>•</span>
                        <span className="px-1.5 py-0.2 bg-[#03045E]/10 text-[#03045E] font-bold rounded text-[10px]">
                          {log.authorizedBy || 'Plant Manager'}
                        </span>
                      </div>

                      {log.reason && (
                        <div className="p-2 bg-amber-50/70 border border-amber-200/60 rounded-xl text-amber-950 text-[11px]">
                          <span className="font-bold">Reason: </span>
                          <span>{log.reason}</span>
                        </div>
                      )}

                      {log.oldValues?.status && (
                        <div className="text-[10px] text-gray-400 flex items-center gap-2">
                          <span>Status Changed:</span>
                          <span className="line-through">{log.oldValues.status}</span>
                          <span>→</span>
                          <span className="font-bold text-gray-800">{log.newValues?.status || 'updated'}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between shrink-0">
          <span className="text-[11px] text-gray-400 font-mono">
            Order Ref: #{order.id}
          </span>
          <button
            onClick={onClose}
            className="px-5 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-xl text-xs font-bold cursor-pointer transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
