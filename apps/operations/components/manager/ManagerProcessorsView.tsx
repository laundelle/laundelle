import React, { useState, useEffect } from 'react';
import {
  Package,
  Users,
  Search,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Phone,
  ArrowRightLeft,
  X,
  ShieldAlert,
  Clock,
  Sparkles,
  Lock,
  RotateCcw,
  CheckCheck,
  ChevronRight,
  Layers,
  Flame,
  Wind,
  Eye
} from 'lucide-react';
import {
  dbFetchManagerStaff,
  dbFetchManagerOrders,
  dbManagerAssignProcessor,
  dbManagerOrderOverride,
  dbManagerUpdateStaff
} from '@laundelle/api-client';
import { ManagerOverrideModal } from './ManagerOverrideModal';

export const ManagerProcessorsView: React.FC = () => {
  const [processors, setProcessors] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [activeFilter, setActiveFilter] = useState('all');

  // Selected processor for detailed inspection modal
  const [inspectProcessor, setInspectProcessor] = useState<any | null>(null);

  // Modals
  const [overrideModalOpen, setOverrideModalOpen] = useState(false);
  const [orderForOverride, setOrderForOverride] = useState<any | null>(null);

  const parsePhone = (raw?: string) => {
    if (!raw) return { code: '+44', num: '' };
    const match = raw.match(/^(\+\d{1,4})\s*(.*)$/);
    if (match) return { code: match[1], num: match[2].trim() };
    return { code: '+44', num: raw.replace(/^\+44/, '').trim() };
  };

  const [editProcessorModalOpen, setEditProcessorModalOpen] = useState(false);
  const [editingProcessor, setEditingProcessor] = useState<any | null>(null);
  const [editPhoneCountryCode, setEditPhoneCountryCode] = useState('+44');
  const [editPhone, setEditPhone] = useState('');
  const [editPassword, setEditPassword] = useState('');

  const [actionLoading, setActionLoading] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  const loadData = async () => {
    setLoading(true);
    const [staffData, ordersData] = await Promise.all([
      dbFetchManagerStaff(),
      dbFetchManagerOrders()
    ]);
    const processorsOnly = (staffData || []).filter((s: any) => s.role === 'processor');
    setProcessors(processorsOnly);
    setOrders(ordersData || []);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  // Quick toggle availability
  const handleToggleAvailability = async (processor: any, nextStatus: 'available' | 'busy' | 'offline') => {
    const res = await dbManagerUpdateStaff(processor._id, { availability: nextStatus });
    if (res.success) {
      showToast('success', `${processor.full_name} status updated to ${nextStatus.toUpperCase()}`);
      loadData();
      if (inspectProcessor && inspectProcessor._id === processor._id) {
        setInspectProcessor({ ...inspectProcessor, availability: nextStatus });
      }
    } else {
      showToast('error', res.error || 'Failed to update processor status.');
    }
  };

  // Save processor details edit
  const handleSaveProcessorEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProcessor) return;
    setActionLoading(true);

    const fullEditPhone = editPhone.trim() ? `${editPhoneCountryCode} ${editPhone.trim().replace(/^0/, '')}`.trim() : '';
    const payload: any = { phone: fullEditPhone };
    if (editPassword) payload.password = editPassword;

    const res = await dbManagerUpdateStaff(editingProcessor._id, payload);
    setActionLoading(false);

    if (res.success) {
      showToast('success', `Processor ${editingProcessor.full_name} details updated.`);
      setEditProcessorModalOpen(false);
      setEditingProcessor(null);
      loadData();
    } else {
      showToast('error', res.error || 'Failed to update processor details.');
    }
  };

  const getCustomerName = (ord: any) => {
    if (ord.customer_name) return ord.customer_name;
    if (ord.customerName) return ord.customerName;
    if (ord.customer && (ord.customer.full_name || ord.customer.name)) {
      return ord.customer.full_name || ord.customer.name;
    }
    if (ord.userName) return ord.userName;
    if (ord.user_name) return ord.user_name;
    return 'Customer';
  };

  // Filtered processors list
  const filteredProcessors = processors.filter((p) => {
    const q = searchQuery.toLowerCase().trim();
    const matchesQuery = !q || (
      (p.full_name || '').toLowerCase().includes(q) ||
      (p.email || '').toLowerCase().includes(q) ||
      (p.phone || '').includes(q) ||
      (p.specialization || '').toLowerCase().includes(q) ||
      (p.shift || '').toLowerCase().includes(q)
    );

    const procStatus = (p.availability || p.status || 'available').toLowerCase();
    const matchesStatus = statusFilter === 'all' || procStatus === statusFilter.toLowerCase();

    const matchesActive =
      activeFilter === 'all' ||
      (activeFilter === 'active' && p.is_active !== false) ||
      (activeFilter === 'suspended' && p.is_active === false);

    return matchesQuery && matchesStatus && matchesActive;
  });

  // Get orders processed by a specific processor
  const getProcessorOrders = (processorId: string, processorName?: string) => {
    return orders.filter(
      (o) =>
        String(o.assigned_processor_id || o.processor_id || o.processor?.id) === String(processorId) ||
        (processorName && o.processor?.name?.toLowerCase() === processorName.toLowerCase())
    );
  };

  return (
    <div className="w-full space-y-6 md:space-y-8 p-4 md:p-8 pb-24 md:pb-8">
      {/* Toast */}
      {toast && (
        <div
          className={`fixed top-5 right-5 z-50 flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-xl text-xs font-bold transition-all animate-in fade-in slide-in-from-top-4 ${
            toast.type === 'success' ? 'bg-[#03045E] text-white border border-[#0077B6]' : 'bg-red-600 text-white'
          }`}
        >
          {toast.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-white shrink-0" />
          )}
          <span>{toast.message}</span>
          <button onClick={() => setToast(null)} className="ml-2 hover:opacity-70 cursor-pointer">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="bg-[#7209B7] text-white px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider">
              Plant Operations
            </span>
            <span className="text-xs text-gray-500 font-medium">Workstation & Processing Pipeline</span>
          </div>
          <h1 className="text-xl md:text-3xl font-heading font-extrabold text-[#03045E] mt-1 tracking-tight">
            Station Processors Directory
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Manage workstation allocation, monitor active status, and inspect orders processed by each processor.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={loadData}
            disabled={loading}
            className="p-2.5 bg-white hover:bg-gray-50 border border-gray-200 rounded-2xl text-[#03045E] cursor-pointer flex items-center gap-1.5 shadow-2xs transition-all"
            title="Refresh Stations"
          >
            <RefreshCw className={`w-4 h-4 text-[#0077B6] ${loading ? 'animate-spin' : ''}`} />
            <span className="text-xs font-bold font-mono hidden sm:inline">Refresh</span>
          </button>
        </div>
      </div>

      {/* Search & Action Bar */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-3 bg-white p-4 rounded-3xl border border-gray-100 shadow-xs">
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto flex-1">
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search processor name, phone, shift..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-[#03045E] focus:outline-hidden"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full sm:w-auto px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold text-gray-700 focus:outline-hidden cursor-pointer"
          >
            <option value="all">All Station Availability</option>
            <option value="available">Available / Ready</option>
            <option value="busy">Busy / Active Run</option>
            <option value="off_duty">Off Duty / Away</option>
          </select>

          <select
            value={activeFilter}
            onChange={(e) => setActiveFilter(e.target.value)}
            className="w-full sm:w-auto px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold text-gray-700 focus:outline-hidden cursor-pointer"
          >
            <option value="all">All Account Statuses</option>
            <option value="active">Active Only</option>
            <option value="suspended">Suspended Only</option>
          </select>

          {(searchQuery || statusFilter !== 'all' || activeFilter !== 'all') && (
            <button
              onClick={() => {
                setSearchQuery('');
                setStatusFilter('all');
                setActiveFilter('all');
              }}
              className="text-xs font-bold text-[#0077B6] hover:text-[#03045E] cursor-pointer whitespace-nowrap"
            >
              Reset
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 text-xs text-gray-500 font-bold self-end md:self-auto">
          <span>Total Processors:</span>
          <span className="px-3 py-1 bg-[#CAF0F8] text-[#03045E] rounded-full font-extrabold">
            {filteredProcessors.length}
          </span>
        </div>
      </div>

      {/* Processors List Directory Table */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-xs overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-xs text-gray-500 font-bold space-y-2">
            <RefreshCw className="w-8 h-8 text-[#03045E] animate-spin mx-auto" />
            <p>Loading workstation processors...</p>
          </div>
        ) : filteredProcessors.length === 0 ? (
          <div className="py-16 text-center text-xs text-gray-500 font-bold space-y-2">
            <Package className="w-10 h-10 text-gray-300 mx-auto" />
            <p>No station processors found matching query.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#f8fafc] text-gray-500 font-bold border-b border-gray-100 uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-4 px-5">Processor Name</th>
                  <th className="py-4 px-5">Contact Phone</th>
                  <th className="py-4 px-5">Status</th>
                  <th className="py-4 px-5">Orders Processed</th>
                  <th className="py-4 px-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredProcessors.map((processor) => {
                  const processorOrders = getProcessorOrders(processor._id, processor.full_name);
                  const status = processor.availability || processor.status || 'available';

                  return (
                    <tr
                      key={processor._id}
                      onClick={() => setInspectProcessor(processor)}
                      className="hover:bg-[#CAF0F8]/30 transition-colors cursor-pointer group"
                    >
                      <td className="py-4 px-5 font-bold text-gray-900 flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-[#7209B7] text-white flex items-center justify-center font-extrabold text-xs">
                          {processor.full_name?.charAt(0)?.toUpperCase() || 'P'}
                        </div>
                        <div>
                          <span className="block font-extrabold text-gray-900 text-sm">{processor.full_name}</span>
                          <span className="text-[10px] text-gray-400 font-normal">{processor.email || 'Station Specialist'}</span>
                        </div>
                      </td>
                      <td className="py-4 px-5 font-medium text-gray-700">
                        {processor.phone || 'N/A'}
                      </td>
                      <td className="py-4 px-5">
                        <span
                          className={`px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${
                            status === 'available'
                              ? 'bg-emerald-100 text-emerald-800'
                              : status === 'busy'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-gray-200 text-gray-700'
                          }`}
                        >
                          {status}
                        </span>
                      </td>
                      <td className="py-4 px-5 font-extrabold text-[#7209B7]">
                        <span className="px-2.5 py-1 bg-purple-50 text-purple-900 rounded-lg font-mono text-xs border border-purple-200">
                          {processorOrders.length} orders
                        </span>
                      </td>
                      <td className="py-4 px-5 text-right">
                        <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => setInspectProcessor(processor)}
                            className="px-3 py-1.5 bg-[#CAF0F8] hover:bg-[#ADE8F4] text-[#03045E] rounded-xl text-xs font-bold transition-all cursor-pointer inline-flex items-center gap-1 group-hover:bg-[#03045E] group-hover:text-white"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>View Orders</span>
                          </button>
                          <button
                            onClick={() => {
                              setEditingProcessor(processor);
                              const p = parsePhone(processor.phone);
                              setEditPhoneCountryCode(p.code);
                              setEditPhone(p.num);
                              setEditPassword('');
                              setEditProcessorModalOpen(true);
                            }}
                            className="p-1.5 hover:bg-gray-100 text-gray-500 rounded-lg transition-colors cursor-pointer"
                            title="Edit Processor Credentials"
                          >
                            <Lock className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Processor Detail & Processed Orders Modal */}
      {inspectProcessor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white w-full max-w-4xl rounded-3xl p-6 md:p-8 shadow-2xl space-y-6 relative max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-gray-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-[#7209B7] text-white flex items-center justify-center font-extrabold text-lg shadow-md">
                  {inspectProcessor.full_name?.charAt(0)?.toUpperCase() || 'P'}
                </div>
                <div>
                  <h2 className="text-xl font-heading font-extrabold text-[#03045E]">
                    {inspectProcessor.full_name}
                  </h2>
                  <p className="text-xs text-gray-500 font-medium flex items-center gap-2 mt-0.5">
                    <span>{inspectProcessor.email || 'Station Processor'}</span>
                    <span>•</span>
                    <span className="font-mono">{inspectProcessor.phone || 'No Phone'}</span>
                  </p>
                </div>
              </div>

              <button
                onClick={() => setInspectProcessor(null)}
                className="p-2 bg-gray-100 hover:bg-gray-200 rounded-full text-gray-500 hover:text-gray-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Processor Profile Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3.5 bg-gray-50 rounded-2xl border border-gray-200 space-y-1">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Assigned Unit</span>
                <p className="font-bold text-gray-900 text-sm flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-[#7209B7]" />
                  Processing Plant
                </p>
              </div>

              <div className="p-3.5 bg-gray-50 rounded-2xl border border-gray-200 space-y-1">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Status</span>
                <div className="flex items-center justify-between">
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                      inspectProcessor.availability === 'available'
                        ? 'bg-emerald-100 text-emerald-800'
                        : inspectProcessor.availability === 'busy'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-gray-200 text-gray-700'
                    }`}
                  >
                    {inspectProcessor.availability || inspectProcessor.status || 'available'}
                  </span>
                  <button
                    onClick={() => {
                      const next = inspectProcessor.availability === 'available' ? 'busy' : inspectProcessor.availability === 'busy' ? 'offline' : 'available';
                      handleToggleAvailability(inspectProcessor, next);
                    }}
                    className="text-[10px] font-bold text-purple-600 hover:underline cursor-pointer"
                  >
                    Toggle
                  </button>
                </div>
              </div>
            </div>

            {/* Orders Processed Section */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <h3 className="font-heading font-extrabold text-[#03045E] text-base">
                  Orders Processed by {inspectProcessor.full_name} ({getProcessorOrders(inspectProcessor._id, inspectProcessor.full_name).length})
                </h3>
              </div>

              {getProcessorOrders(inspectProcessor._id, inspectProcessor.full_name).length === 0 ? (
                <div className="p-8 text-center bg-gray-50 rounded-2xl border border-gray-200 text-xs text-gray-500 font-bold space-y-1">
                  <Clock className="w-8 h-8 text-gray-300 mx-auto" />
                  <p>No orders processed by this station operator yet.</p>
                </div>
              ) : (
                <div className="border border-gray-200 rounded-2xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#f8fafc] text-gray-500 font-bold border-b border-gray-200 uppercase tracking-wider text-[10px]">
                      <tr>
                        <th className="py-3 px-4">Order ID</th>
                        <th className="py-3 px-4">Customer</th>
                        <th className="py-3 px-4">Processing Stage</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4">Payment</th>
                        <th className="py-3 px-4 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {getProcessorOrders(inspectProcessor._id, inspectProcessor.full_name).map((ord) => (
                        <tr
                          key={ord.id}
                          onClick={() => {
                            setOrderForOverride(ord);
                            setOverrideModalOpen(true);
                          }}
                          className="hover:bg-purple-50/50 transition-colors cursor-pointer"
                        >
                          <td className="py-3 px-4 font-mono font-bold text-[#03045E]">{ord.id}</td>
                          <td className="py-3 px-4 font-bold text-gray-900">{getCustomerName(ord)}</td>
                          <td className="py-3 px-4">
                            <span className="px-2 py-0.5 bg-purple-100 text-purple-900 font-bold rounded-md text-[10px] uppercase">
                              {ord.status || 'Processing'}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#CAF0F8] text-[#03045E]">
                              {ord.statusLabel || ord.status}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                (ord.paymentStatus || ord.payment_status) === 'Paid'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-amber-100 text-amber-800'
                              }`}
                            >
                              {ord.paymentStatus || ord.payment_status || 'Pending'}
                            </span>
                          </td>
                          <td className="py-3 px-4 font-extrabold text-gray-900 text-right">
                            £{ord.total?.toFixed ? ord.total.toFixed(2) : ord.total || '0.00'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2 border-t border-gray-100">
              <button
                onClick={() => setInspectProcessor(null)}
                className="px-5 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                Close Inspection
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Processor Credentials Modal */}
      {editProcessorModalOpen && editingProcessor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white w-full max-w-md rounded-3xl p-6 shadow-2xl space-y-4 relative animate-in fade-in zoom-in-95 duration-150">
            <button
              onClick={() => setEditProcessorModalOpen(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 bg-gray-100 p-2 rounded-full cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div>
              <h3 className="text-lg font-heading font-extrabold text-[#03045E]">
                Edit Processor: {editingProcessor.full_name}
              </h3>
              <p className="text-xs text-gray-500">Update contact phone and system login credentials.</p>
            </div>

            <form onSubmit={handleSaveProcessorEdit} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-gray-700 mb-1">Contact Phone</label>
                <div className="flex gap-2">
                  <select
                    value={editPhoneCountryCode}
                    onChange={(e) => setEditPhoneCountryCode(e.target.value)}
                    className="w-24 px-2 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-[#03045E] focus:outline-hidden cursor-pointer shrink-0"
                  >
                    <option value="+44">UK (+44)</option>
                    <option value="+1">US (+1)</option>
                    <option value="+91">IN (+91)</option>
                    <option value="+971">AE (+971)</option>
                    <option value="+61">AU (+61)</option>
                    <option value="+33">FR (+33)</option>
                    <option value="+49">DE (+49)</option>
                    <option value="+353">IE (+353)</option>
                  </select>
                  <input
                    type="tel"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    placeholder="7700 900456"
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl font-semibold focus:ring-2 focus:ring-[#03045E] focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Reset Password (Optional)</label>
                <input
                  type="password"
                  value={editPassword}
                  onChange={(e) => setEditPassword(e.target.value)}
                  placeholder="Leave blank to keep unchanged"
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl font-semibold focus:ring-2 focus:ring-[#03045E] focus:outline-hidden"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditProcessorModalOpen(false)}
                  className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="flex-1 py-2.5 bg-[#03045E] hover:bg-[#023E8A] text-white font-bold rounded-xl cursor-pointer"
                >
                  {actionLoading ? 'Saving...' : 'Save Updates'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Override Modal */}
      {overrideModalOpen && orderForOverride && (
        <ManagerOverrideModal
          isOpen={overrideModalOpen}
          order={orderForOverride}
          drivers={[]}
          onClose={() => {
            setOverrideModalOpen(false);
            setOrderForOverride(null);
          }}
          onSuccess={() => {
            showToast('success', 'Order status updated successfully');
            loadData();
          }}
        />
      )}

    </div>
  );
};
