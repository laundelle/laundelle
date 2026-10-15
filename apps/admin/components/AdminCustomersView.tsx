import React, { useState, useEffect } from 'react';
import { Search, ShieldAlert, Phone, Mail, AlertTriangle, RefreshCw, X, Eye, RotateCcw, MapPin, Calendar, ShoppingBag } from 'lucide-react';
import { CustomerCRM, CustomerFlag, CustomerNote } from '@laundelle/types';
import { dbAdminFetchCustomers, dbAdminAddCustomerFlag, dbAdminAddCustomerNote } from '@laundelle/api-client';

export const AdminCustomersView: React.FC = () => {
  const [customers, setCustomers] = useState<CustomerCRM[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerCRM | null>(null);
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  // Modals & form state
  const [flagModalOpen, setFlagModalOpen] = useState(false);
  const [flagType, setFlagType] = useState<'Chargeback' | 'Fraud Concern' | 'Repeated No-Show' | 'Abusive Behavior' | 'Risk Review'>('Risk Review');
  const [flagReason, setFlagReason] = useState('');
  const [flags, setFlags] = useState<CustomerFlag[]>([]);

  const [notes, setNotes] = useState<CustomerNote[]>([]);
  const [newNote, setNewNote] = useState('');
  const [savingAction, setSavingAction] = useState(false);

  const loadCustomerData = async () => {
    setLoading(true);
    try {
      const data = await dbAdminFetchCustomers(searchTerm, statusFilter);
      setCustomers(data.customers);
      setFlags(data.flags);
      setNotes(data.notes);
      if (data.customers.length > 0) {
        setSelectedCustomer(prev => {
          if (!prev) return null;
          const found = data.customers.find((c: any) => c.id === prev.id);
          return found || null;
        });
      } else {
        setSelectedCustomer(null);
      }
    } catch (e) {
      console.error('Failed to load customer CRM data:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCustomerData();
  }, [searchTerm, statusFilter]);

  const filteredCustomers = customers;

  const handleAddFlag = async () => {
    if (!selectedCustomer || !flagReason.trim()) return;
    setSavingAction(true);
    try {
      const res = await dbAdminAddCustomerFlag({
        customerId: selectedCustomer.id,
        customerName: selectedCustomer.fullName,
        flagType,
        reason: flagReason.trim(),
        severity: 'high'
      });
      if (res.success && res.flag) {
        setFlags([res.flag, ...flags]);
        setFlagReason('');
        setFlagModalOpen(false);
        if (flagType === 'Chargeback' || flagType === 'Fraud Concern') {
          setCustomers(customers.map(c => c.id === selectedCustomer.id ? { ...c, status: 'blocked' } : c));
          setSelectedCustomer({ ...selectedCustomer, status: 'blocked' });
        }
      }
    } finally {
      setSavingAction(false);
    }
  };

  const handleAddNote = async () => {
    if (!selectedCustomer || !newNote.trim()) return;
    setSavingAction(true);
    try {
      const res = await dbAdminAddCustomerNote(selectedCustomer.id, newNote.trim());
      if (res.success && res.note) {
        setNotes([res.note, ...notes]);
        setNewNote('');
      }
    } finally {
      setSavingAction(false);
    }
  };

  return (
    <div className="w-full space-y-4 md:space-y-5 p-4 sm:p-8 pb-20 md:pb-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight">Customer CRM</h1>
          <p className="text-xs text-slate-500 mt-0.5">Customer accounts, lifetime activity, and risk flags.</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadCustomerData}
            disabled={loading}
            className="px-3.5 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer"
            title="Refresh Customer CRM Data"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-blue-600 ${loading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Refresh CRM</span>
          </button>
          <button
            onClick={() => selectedCustomer && setFlagModalOpen(true)}
            disabled={!selectedCustomer}
            className="bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer"
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>Flag Risk</span>
          </button>
        </div>
      </div>

      {/* Search & Status Bar */}
      <div className="bg-white rounded-2xl p-4 shadow-xs border border-slate-100 flex flex-col sm:flex-row gap-3 justify-between items-center">
        <div className="relative flex-1 w-full max-w-md">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search customer name, email, phone..."
            className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200/70 rounded-xl text-xs font-medium focus:bg-white focus:border-blue-500 focus:outline-hidden"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200/70 rounded-xl text-xs font-medium text-slate-700 focus:bg-white focus:border-blue-500 focus:outline-hidden cursor-pointer"
          >
            <option value="all">All Customer Statuses</option>
            <option value="vip">VIP Customers</option>
            <option value="high_value">High Value</option>
            <option value="regular">Regular</option>
            <option value="new">New</option>
            <option value="blocked">Blocked / Risk</option>
          </select>
          {(searchTerm !== '' || statusFilter !== 'all') && (
            <button
              onClick={() => {
                setSearchTerm('');
                setStatusFilter('all');
              }}
              className="px-3 py-2 rounded-xl text-xs font-semibold text-blue-600 hover:bg-slate-50 transition-colors flex items-center gap-1.5 cursor-pointer border border-slate-200"
              title="Reset Filters"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
          )}
        </div>
      </div>

      {/* Customer CRM Box - Fixed Sized with Vertical Scroll */}
      <div className="w-full bg-white rounded-2xl shadow-xs border border-slate-100 overflow-hidden flex flex-col h-[calc(100vh-270px)] min-h-[460px]">
        <div className="flex-1 overflow-y-auto overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="sticky top-0 z-10 bg-slate-50 text-slate-500 font-semibold border-b border-slate-200 uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4">Contact Phone</th>
                <th className="py-3 px-4">Address / Postcode</th>
                <th className="py-3 px-4">Account Status</th>
                <th className="py-3 px-4">Total Orders</th>
                <th className="py-3 px-4">Lifetime Spend</th>
                <th className="py-3 px-4">Repeat Rate</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading && filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-16 text-center text-slate-400">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-blue-600" />
                    Loading customers...
                  </td>
                </tr>
              ) : filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-16 text-center text-slate-400">
                    No customer records match your filter.
                  </td>
                </tr>
              ) : (
                filteredCustomers.map((cust) => {
                  return (
                    <tr
                      key={cust.id}
                      onClick={() => {
                        setSelectedCustomer(cust);
                        setIsCustomerModalOpen(true);
                      }}
                      className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                    >
                      <td className="py-3 px-4 flex items-center gap-3">
                        <img src={cust.avatarUrl} alt={cust.fullName} className="w-8 h-8 rounded-full object-cover shrink-0 border border-slate-200" />
                        <div>
                          <p className="font-semibold text-slate-900 text-xs group-hover:text-blue-600 transition-colors">{cust.fullName}</p>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-mono font-medium text-slate-400">{cust.publicId || cust.customerId || cust.id}</span>
                            <span className="text-[11px] text-slate-400">{cust.email}</span>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-600">
                        {cust.phone || '—'}
                      </td>
                      <td className="py-3 px-4 text-slate-600 max-w-[160px] truncate" title={cust.address || cust.postcode || '—'}>
                        {cust.address || cust.postcode || '—'}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider ${
                            cust.status === 'vip'
                              ? 'bg-purple-50 text-purple-700 border border-purple-100/60'
                              : cust.status === 'blocked'
                              ? 'bg-red-50 text-red-700 border border-red-100/60'
                              : cust.status === 'high_value'
                              ? 'bg-blue-50 text-blue-700 border border-blue-100/60'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {cust.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-700">{cust.totalOrders}</td>
                      <td className="py-3 px-4 font-bold text-slate-900 text-sm">£{cust.lifetimeSpend.toFixed(2)}</td>
                      <td className="py-3 px-4 font-semibold text-emerald-600">{cust.repeatRate}%</td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedCustomer(cust);
                            setIsCustomerModalOpen(true);
                          }}
                          className="px-3 py-1 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-xl text-xs font-medium transition-all cursor-pointer inline-flex items-center gap-1.5 shadow-2xs group-hover:border-slate-300"
                        >
                          <Eye className="w-3.5 h-3.5 text-blue-600" />
                          <span>Profile</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Customer CRM Profile Modal */}
      {isCustomerModalOpen && selectedCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 sm:p-6 animate-in fade-in">
          <div className="bg-white w-full max-w-3xl rounded-3xl p-6 sm:p-8 max-h-[90vh] overflow-y-auto shadow-2xl border border-gray-100 space-y-6 relative">
            <div className="flex items-start sm:items-center justify-between pb-4 border-b border-gray-100 flex-col sm:flex-row gap-4">
              <div className="flex items-center gap-4">
                <img
                  src={selectedCustomer.avatarUrl}
                  alt={selectedCustomer.fullName}
                  className="w-14 h-14 rounded-full object-cover border-2 border-[#00B4D8] shadow-xs shrink-0"
                />
                <div>
                  <div className="flex items-center gap-2.5">
                    <h2 className="text-xl font-heading font-extrabold text-[#03045E]">{selectedCustomer.fullName}</h2>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${
                        selectedCustomer.status === 'vip'
                          ? 'bg-purple-100 text-purple-800'
                          : selectedCustomer.status === 'blocked'
                          ? 'bg-red-100 text-red-800'
                          : selectedCustomer.status === 'high_value'
                          ? 'bg-[#CAF0F8] text-[#03045E]'
                          : 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {selectedCustomer.status}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500 mt-1">
                    <span className="font-mono text-[11px] font-bold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-md">
                      {selectedCustomer.publicId || selectedCustomer.customerId || selectedCustomer.id}
                    </span>
                    <span className="flex items-center gap-1"><Mail className="w-3.5 h-3.5 text-[#0077B6]" />{selectedCustomer.email || 'No email'}</span>
                    <span className="flex items-center gap-1"><Phone className="w-3.5 h-3.5 text-[#0077B6]" />{selectedCustomer.phone || 'No phone'}</span>
                    {selectedCustomer.address && (
                      <span className="flex items-center gap-1 text-slate-600"><MapPin className="w-3.5 h-3.5 text-emerald-600" />{selectedCustomer.address}</span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setFlagModalOpen(true)}
                  className="bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <ShieldAlert className="w-4 h-4 text-red-600" />
                  <span>Flag Risk</span>
                </button>
                <button
                  onClick={() => setIsCustomerModalOpen(false)}
                  className="p-2 bg-gray-100 hover:bg-gray-200 rounded-full text-gray-500 hover:text-gray-800 transition-colors cursor-pointer"
                  title="Close Profile"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Lifetime Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center p-4 bg-gray-50 rounded-2xl border border-gray-100">
              <div>
                <span className="text-[10px] font-bold text-gray-400 uppercase block">Lifetime Spend</span>
                <span className="text-lg font-black text-[#03045E]">£{selectedCustomer.lifetimeSpend.toFixed(2)}</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-gray-400 uppercase block">Total Orders</span>
                <span className="text-lg font-black text-[#03045E]">{selectedCustomer.totalOrders}</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-gray-400 uppercase block">Avg Order Value</span>
                <span className="text-lg font-black text-[#03045E]">£{selectedCustomer.averageOrderValue.toFixed(2)}</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-gray-400 uppercase block">Repeat Rate</span>
                <span className="text-lg font-black text-emerald-600">{selectedCustomer.repeatRate}%</span>
              </div>
            </div>

            {/* Care Preferences & Details */}
            <div className="p-4 bg-[#CAF0F8]/40 border border-[#ADE8F4] rounded-2xl space-y-2 text-xs">
              <span className="font-bold text-[#03045E] block">Customer Profile & Care Preferences</span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <p className="text-gray-700">Preferred Service: <span className="font-semibold text-[#03045E]">{selectedCustomer.preferredService}</span></p>
                <p className="text-gray-700">Detergent: <span className="font-semibold text-[#03045E]">{selectedCustomer.preferredDetergent}</span></p>
                <p className="text-gray-700">Softener: <span className="font-semibold text-[#03045E]">{selectedCustomer.preferredSoftener}</span></p>
              </div>
              {selectedCustomer.lastOrderDate && (
                <p className="text-gray-600 pt-1 border-t border-[#ADE8F4]/50 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-[#0077B6]" />
                  <span>Last Order Activity: <span className="font-semibold text-slate-800">{new Date(selectedCustomer.lastOrderDate).toLocaleString('en-GB')}</span></span>
                </p>
              )}
            </div>

            {/* Recent Orders History */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#03045E] uppercase tracking-wider block">Recent Orders Activity</span>
                <span className="text-xs text-slate-500 font-semibold">{selectedCustomer.totalOrders} total order{selectedCustomer.totalOrders === 1 ? '' : 's'}</span>
              </div>
              {selectedCustomer.recentOrders && selectedCustomer.recentOrders.length > 0 ? (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {selectedCustomer.recentOrders.map((ord: any) => (
                    <div key={ord.id} className="p-3 bg-slate-50 border border-slate-200/80 rounded-2xl flex items-center justify-between text-xs">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 font-bold shrink-0">
                          <ShoppingBag className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="font-bold text-slate-900">{ord.orderNumber || ord.id}</p>
                          <p className="text-[11px] text-slate-500">{ord.service || 'Laundry Service'} • {ord.date ? new Date(ord.date).toLocaleDateString('en-GB') : 'Recent'}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-black text-slate-900">£{Number(ord.total || 0).toFixed(2)}</p>
                        <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase bg-blue-100/70 text-blue-800">
                          {String(ord.status).replace(/_/g, ' ')}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 text-center text-xs text-slate-400">
                  No orders recorded yet for this customer.
                </div>
              )}
            </div>

            {/* Active Risk Flags */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-red-900 uppercase tracking-wider">Active Risk Flags</span>
                <button
                  onClick={() => setFlagModalOpen(true)}
                  className="text-xs font-bold text-red-600 hover:underline cursor-pointer"
                >
                  + Add Risk Flag
                </button>
              </div>

              {flags.filter(f => f.customerId === selectedCustomer.id).length === 0 ? (
                <p className="text-xs text-gray-400 italic">No active risk flags for this customer.</p>
              ) : (
                flags.filter(f => f.customerId === selectedCustomer.id).map(f => (
                  <div key={f.id} className="p-3 bg-red-50 border border-red-200 rounded-2xl text-xs space-y-1">
                    <div className="flex items-center justify-between font-bold text-red-900">
                      <span>{f.flagType}</span>
                      <span className="text-[10px] bg-red-200 px-2 py-0.5 rounded-full">{f.severity}</span>
                    </div>
                    <p className="text-[11px] text-red-800">{f.reason}</p>
                  </div>
                ))
              )}
            </div>

            {/* Internal Staff Notes */}
            <div className="space-y-3">
              <span className="text-xs font-bold text-[#03045E] uppercase tracking-wider block">Internal Staff Notes</span>
              
              <div className="space-y-2 max-h-36 overflow-y-auto">
                {notes.filter(n => n.customerId === selectedCustomer.id).map(n => (
                  <div key={n.id} className="p-3 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-900 space-y-1">
                    <p className="font-medium">{n.note}</p>
                    <p className="text-[10px] text-amber-700 font-bold">— {n.authorName} ({n.authorRole})</p>
                  </div>
                ))}
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  placeholder="Add internal note..."
                  className="flex-1 px-3 py-2.5 bg-gray-50 rounded-xl text-xs focus:ring-2 focus:ring-[#03045E] focus:outline-hidden"
                />
                <button
                  onClick={handleAddNote}
                  disabled={savingAction || !newNote.trim()}
                  className="px-5 py-2.5 bg-[#03045E] hover:bg-[#023E8A] disabled:opacity-50 text-white rounded-xl text-xs font-bold cursor-pointer transition-colors"
                >
                  {savingAction ? 'Saving...' : 'Save Note'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Flag Customer Risk Modal */}
      {flagModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="bg-white w-full max-w-md rounded-3xl p-6 shadow-2xl space-y-5 relative">
            <div>
              <h3 className="text-base font-bold text-red-900 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-red-600" />
                <span>Flag Customer Risk / Block</span>
              </h3>
              <p className="text-xs text-gray-500">Add an auditable risk flag for {selectedCustomer?.fullName}</p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Risk Category</label>
                <select
                  value={flagType}
                  onChange={(e: any) => setFlagType(e.target.value)}
                  className="w-full px-3 py-2.5 bg-gray-50 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-[#03045E] focus:outline-hidden"
                >
                  <option value="Chargeback">Chargeback</option>
                  <option value="Fraud Concern">Fraud Concern</option>
                  <option value="Repeated No-Show">Repeated No-Show</option>
                  <option value="Abusive Behavior">Abusive Behavior</option>
                  <option value="Risk Review">Risk Review</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Reason & Audit Trail Notes</label>
                <textarea
                  rows={3}
                  value={flagReason}
                  onChange={(e) => setFlagReason(e.target.value)}
                  placeholder="Provide explicit operational rationale for flagging/blocking customer..."
                  className="w-full px-3 py-2.5 bg-gray-50 rounded-xl text-xs focus:ring-2 focus:ring-[#03045E] focus:outline-hidden"
                />
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setFlagModalOpen(false)}
                className="w-1/2 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-2xl text-xs font-bold cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleAddFlag}
                disabled={!flagReason.trim()}
                className="w-1/2 py-3 bg-red-600 hover:bg-red-700 text-white rounded-2xl text-xs font-bold cursor-pointer shadow-md disabled:opacity-50"
              >
                Confirm Risk Flag
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
