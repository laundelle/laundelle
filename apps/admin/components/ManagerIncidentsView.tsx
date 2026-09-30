import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  Search,
  Filter,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Clock,
  DollarSign,
  FileText,
  RotateCcw,
  X,
  Plus,
  ArrowRight,
  Package,
  AlertOctagon,
  User,
  ExternalLink,
  ChevronRight,
  MessageSquare
} from 'lucide-react';
import { IncidentRecord, IncidentType, IncidentPriority, IncidentStatus } from '@laundelle/types';
import {
  dbFetchManagerIncidents,
  dbCreateManagerIncident,
  dbAddIncidentNote,
  dbResolveIncident
} from '@laundelle/api-client';

export const ManagerIncidentsView: React.FC = () => {
  const [incidents, setIncidents] = useState<IncidentRecord[]>([]);
  const [selectedIncident, setSelectedIncident] = useState<IncidentRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');

  // Modal: File Incident
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [newOrderId, setNewOrderId] = useState('');
  const [newCustomerName, setNewCustomerName] = useState('');
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newType, setNewType] = useState<IncidentType>('lost_item');
  const [newPriority, setNewPriority] = useState<IncidentPriority>('medium');
  const [newItemName, setNewItemName] = useState('');
  const [newItemEstValue, setNewItemEstValue] = useState('');

  // Investigation Note
  const [newNote, setNewNote] = useState('');

  // Resolution
  const [resolveType, setResolveType] = useState<'refund' | 'credit' | 'rewash' | 'replacement' | 'dismissed'>('refund');
  const [resolveAmount, setResolveAmount] = useState('');
  const [resolveExplanation, setResolveExplanation] = useState('');

  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4500);
  };

  const loadIncidents = async () => {
    setLoading(true);
    const res = await dbFetchManagerIncidents({
      status: statusFilter !== 'all' ? statusFilter : undefined,
      type: typeFilter !== 'all' ? typeFilter : undefined,
      priority: priorityFilter !== 'all' ? priorityFilter : undefined
    });
    setLoading(false);
    if (res.success && res.incidents) {
      setIncidents(res.incidents);
      if (res.incidents.length > 0) {
        if (!selectedIncident || !res.incidents.find((i: any) => i.id === selectedIncident.id)) {
          setSelectedIncident(res.incidents[0]);
        } else {
          const updated = res.incidents.find((i: any) => i.id === selectedIncident.id);
          if (updated) setSelectedIncident(updated);
        }
      } else {
        setSelectedIncident(null);
      }
    }
  };

  useEffect(() => {
    loadIncidents();
  }, [statusFilter, typeFilter, priorityFilter]);

  const handleCreateIncident = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newDesc.trim()) {
      showToast('error', 'Incident title and description are required.');
      return;
    }
    setActionLoading(true);
    const res = await dbCreateManagerIncident({
      orderId: newOrderId.trim() || undefined,
      customerName: newCustomerName.trim() || undefined,
      title: newTitle.trim(),
      description: newDesc.trim(),
      type: newType,
      priority: newPriority,
      itemDetails: newItemName.trim() ? {
        name: newItemName.trim(),
        estimatedValue: newItemEstValue ? Number(newItemEstValue) : undefined
      } : undefined
    });
    setActionLoading(false);

    if (res.success) {
      showToast('success', `Incident #${res.incident?.incidentNumber} registered!`);
      setCreateModalOpen(false);
      setNewOrderId('');
      setNewCustomerName('');
      setNewTitle('');
      setNewDesc('');
      setNewItemName('');
      setNewItemEstValue('');
      loadIncidents();
    } else {
      showToast('error', res.error || 'Failed to file incident report.');
    }
  };

  const handleAddNote = async () => {
    if (!selectedIncident || !newNote.trim()) return;
    setActionLoading(true);
    const res = await dbAddIncidentNote(selectedIncident.id || (selectedIncident as any)._id, newNote.trim());
    setActionLoading(false);

    if (res.success) {
      showToast('success', 'Investigation note appended to case file.');
      setNewNote('');
      loadIncidents();
    } else {
      showToast('error', res.error || 'Failed to post note.');
    }
  };

  const handleResolve = async () => {
    if (!selectedIncident || !resolveExplanation.trim()) {
      showToast('error', 'Resolution explanation is strictly required.');
      return;
    }
    setActionLoading(true);
    const res = await dbResolveIncident(selectedIncident.id || (selectedIncident as any)._id, {
      type: resolveType,
      amount: resolveAmount ? Number(resolveAmount) : undefined,
      explanation: resolveExplanation.trim()
    });
    setActionLoading(false);

    if (res.success) {
      showToast('success', `Incident resolved successfully via ${resolveType.toUpperCase()}!`);
      setResolveExplanation('');
      setResolveAmount('');
      loadIncidents();
    } else {
      showToast('error', res.error || 'Failed to resolve incident.');
    }
  };

  // Filtered incidents
  const filteredIncidents = incidents.filter((inc) => {
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch = !q || (
      (inc.incidentNumber || '').toLowerCase().includes(q) ||
      (inc.orderId || '').toLowerCase().includes(q) ||
      (inc.customerName || '').toLowerCase().includes(q) ||
      (inc.title || '').toLowerCase().includes(q) ||
      (inc.description || '').toLowerCase().includes(q)
    );

    const incStatus = (inc.status || '').toLowerCase();
    const matchesStatus =
      statusFilter === 'all' ||
      incStatus === statusFilter.toLowerCase() ||
      (statusFilter === 'reported' && (incStatus === 'reported' || incStatus === 'open')) ||
      (statusFilter.startsWith('resolved') && incStatus === statusFilter.toLowerCase());

    const incType = (inc.type || '').toLowerCase();
    const matchesType = typeFilter === 'all' || incType === typeFilter.toLowerCase();

    const incPriority = (inc.priority || '').toLowerCase();
    const matchesPriority = priorityFilter === 'all' || incPriority === priorityFilter.toLowerCase();

    return matchesSearch && matchesStatus && matchesType && matchesPriority;
  });

  // KPI Calculations
  const activeCount = incidents.filter(i => !i.status.startsWith('resolved')).length;
  const investigatingCount = incidents.filter(i => i.status === 'investigating').length;
  const damageLostCount = incidents.filter(i => ['lost_item', 'damaged_item', 'wrong_item'].includes(i.type)).length;
  const resolvedCount = incidents.filter(i => i.status.startsWith('resolved')).length;

  return (
    <div className="w-full space-y-6 p-4 sm:p-8 pb-24 font-sans">
      {/* Toast Notification */}
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
            <span className="bg-red-600 text-white px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider">
              Quality & Security
            </span>
            <span className="text-xs text-gray-500 font-medium">Dispute Resolution Console</span>
          </div>
          <h1 className="text-xl md:text-3xl font-heading font-extrabold text-[#03045E] mt-1 tracking-tight">
            Incident & Claims Management
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Track garment damage reports, missing items, delivery discrepancies, and execute official managerial resolutions.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={loadIncidents}
            disabled={loading}
            className="p-2.5 bg-white hover:bg-gray-50 border border-gray-200 rounded-2xl text-[#03045E] cursor-pointer flex items-center gap-1.5 shadow-2xs transition-all"
            title="Refresh Incidents"
          >
            <RefreshCw className={`w-4 h-4 text-[#0077B6] ${loading ? 'animate-spin' : ''}`} />
            <span className="text-xs font-bold font-mono hidden sm:inline">Refresh</span>
          </button>
          <button
            onClick={() => setCreateModalOpen(true)}
            className="px-4 py-2.5 bg-[#03045E] hover:bg-[#0077B6] text-white rounded-2xl text-xs font-bold flex items-center gap-2 shadow-xs cursor-pointer transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>File Incident Report</span>
          </button>
        </div>
      </div>

      {/* KPI Overview Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-5">
        <div className="bg-white rounded-2xl md:rounded-3xl p-4 md:p-5 border border-gray-100 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Active Claims</span>
            <h3 className="text-2xl md:text-3xl font-heading font-extrabold text-red-600 mt-1">{activeCount}</h3>
            <span className="text-[10px] text-red-700 font-bold">Pending investigation</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-red-50 flex items-center justify-center text-red-600">
            <AlertOctagon className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white rounded-2xl md:rounded-3xl p-4 md:p-5 border border-gray-100 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Under Investigation</span>
            <h3 className="text-2xl md:text-3xl font-heading font-extrabold text-purple-600 mt-1">{investigatingCount}</h3>
            <span className="text-[10px] text-gray-400 font-medium">Evidence being audited</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-purple-50 flex items-center justify-center text-purple-600">
            <Clock className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white rounded-2xl md:rounded-3xl p-4 md:p-5 border border-gray-100 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Lost / Damaged Items</span>
            <h3 className="text-2xl md:text-3xl font-heading font-extrabold text-amber-600 mt-1">{damageLostCount}</h3>
            <span className="text-[10px] text-gray-400 font-medium">Garment physical defects</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-600">
            <Package className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white rounded-2xl md:rounded-3xl p-4 md:p-5 border border-gray-100 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Resolved Cases</span>
            <h3 className="text-2xl md:text-3xl font-heading font-extrabold text-emerald-600 mt-1">{resolvedCount}</h3>
            <span className="text-[10px] text-emerald-700 font-medium">Compensated or closed</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white rounded-2xl md:rounded-3xl p-4 border border-gray-100 shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
          <div className="relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by ticket #, order ID, customer..."
              className="w-full pl-10 pr-4 py-2.5 bg-gray-50 rounded-xl text-xs focus:ring-2 focus:ring-[#03045E] focus:outline-hidden"
            />
          </div>

          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2.5 bg-gray-50 rounded-xl text-xs font-semibold focus:outline-hidden"
            >
              <option value="all">Status: All Records</option>
              <option value="reported">Reported (New)</option>
              <option value="investigating">Under Investigation</option>
              <option value="resolved_refund">Resolved - Refund</option>
              <option value="resolved_rewash">Resolved - Free Rewash</option>
              <option value="resolved_credit">Resolved - Account Credit</option>
              <option value="resolved_replacement">Resolved - Replacement</option>
              <option value="resolved_dismissed">Resolved - Dismissed</option>
            </select>
          </div>

          <div>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="w-full px-3 py-2.5 bg-gray-50 rounded-xl text-xs font-semibold focus:outline-hidden"
            >
              <option value="all">Category: All Categories</option>
              <option value="lost_item">Lost Item</option>
              <option value="damaged_item">Damaged Item</option>
              <option value="wrong_item">Wrong Item Delivered</option>
              <option value="missing_item">Missing Item Shortfall</option>
              <option value="customer_complaint">Customer Complaint</option>
              <option value="delivery_dispute">Delivery Dispute</option>
              <option value="payment_dispute">Payment Dispute</option>
            </select>
          </div>

          <div>
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="w-full px-3 py-2.5 bg-gray-50 rounded-xl text-xs font-semibold focus:outline-hidden"
            >
              <option value="all">Priority: All Priorities</option>
              <option value="urgent">Urgent</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>
        </div>
      </div>

      {/* Master-Detail Case File Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Tickets List (5 cols) */}
        <div className="lg:col-span-5 bg-white rounded-3xl p-4 md:p-6 shadow-xs border border-gray-100 space-y-3">
          <div className="flex items-center justify-between pb-3 border-b border-gray-100">
            <h3 className="text-xs font-bold text-[#03045E] uppercase tracking-wider">
              Incident Case Files ({filteredIncidents.length})
            </h3>
            <span className="text-[11px] text-gray-400">Select case to view full evidence</span>
          </div>

          {filteredIncidents.length === 0 ? (
            <div className="py-16 text-center text-gray-400 text-xs">
              No incident tickets found matching criteria.
            </div>
          ) : (
            <div className="space-y-2.5 max-h-[700px] overflow-y-auto pr-1">
              {filteredIncidents.map((inc) => {
                const isSelected = selectedIncident?.id === inc.id || (selectedIncident as any)?._id === (inc as any)._id;
                const isResolved = inc.status?.startsWith('resolved');

                return (
                  <div
                    key={inc.id || (inc as any)._id}
                    onClick={() => setSelectedIncident(inc)}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between space-y-2.5 ${
                      isSelected
                        ? 'bg-[#EBF7FF] border-[#0077B6] shadow-sm ring-2 ring-[#0077B6]/20'
                        : 'bg-white border-gray-100 hover:border-gray-200'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-xs text-[#03045E]">#{inc.incidentNumber}</span>
                          <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase ${
                            inc.priority === 'urgent' ? 'bg-red-100 text-red-700' :
                            inc.priority === 'high' ? 'bg-amber-100 text-amber-700' :
                            'bg-blue-50 text-blue-700'
                          }`}>
                            {inc.priority}
                          </span>
                          <span className={`px-2 py-0.5 rounded-md text-[9px] font-bold capitalize ${
                            isResolved ? 'bg-emerald-100 text-emerald-800' :
                            inc.status === 'investigating' ? 'bg-purple-100 text-purple-800' :
                            'bg-amber-50 text-amber-800'
                          }`}>
                            {inc.status?.replace(/_/g, ' ')}
                          </span>
                        </div>
                        <h4 className="font-bold text-gray-900 text-xs mt-1 truncate max-w-xs">{inc.title}</h4>
                      </div>
                      {inc.orderId && (
                        <span className="font-mono text-[10px] font-bold text-[#0077B6] bg-white px-2 py-0.5 rounded-md border border-gray-100 shrink-0">
                          #{inc.orderId}
                        </span>
                      )}
                    </div>

                    <p className="text-gray-500 text-[11px] line-clamp-2 leading-relaxed">
                      {inc.description}
                    </p>

                    <div className="flex items-center justify-between pt-2 border-t border-gray-100/80 text-[10px] text-gray-400">
                      <span>Customer: <strong className="text-gray-700">{inc.customerName || 'Customer'}</strong></span>
                      <span>{new Date(inc.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column: Case File & Resolution Terminal (7 cols) */}
        <div className="lg:col-span-7 bg-white rounded-3xl p-6 shadow-xs border border-gray-100 space-y-6">
          {!selectedIncident ? (
            <div className="py-24 text-center text-gray-400 text-xs">
              Select an incident from the list to inspect case details.
            </div>
          ) : (
            <div className="space-y-6">
              {/* Header */}
              <div className="flex items-start justify-between pb-4 border-b border-gray-100 flex-wrap gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-heading font-extrabold text-[#03045E]">
                      #{selectedIncident.incidentNumber}
                    </h2>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-[#03045E]/10 text-[#03045E]">
                      {selectedIncident.type?.replace(/_/g, ' ')}
                    </span>
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold capitalize ${
                      selectedIncident.status?.startsWith('resolved') ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                    }`}>
                      {selectedIncident.status?.replace(/_/g, ' ')}
                    </span>
                  </div>
                  <h3 className="text-sm font-bold text-gray-900 mt-1">{selectedIncident.title}</h3>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Reported by {selectedIncident.reportedByName} ({selectedIncident.reportedByRole}) on {new Date(selectedIncident.createdAt).toLocaleString()}
                  </p>
                </div>

                {selectedIncident.orderId && (
                  <div className="p-3 bg-gray-50 rounded-2xl border border-gray-100 text-right text-xs">
                    <span className="text-[10px] text-gray-400 uppercase font-bold block">Linked Order</span>
                    <span className="font-mono font-bold text-[#0077B6]">#{selectedIncident.orderId}</span>
                  </div>
                )}
              </div>

              {/* Customer & Garment Breakdown Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 space-y-1.5">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Customer Information</span>
                  <p className="font-bold text-gray-900">{selectedIncident.customerName || 'Registered Customer'}</p>
                  <p className="text-gray-500 text-[11px]">{selectedIncident.customerPhone || 'Phone unavailable'}</p>
                </div>

                <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 space-y-1.5">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Affected Garment Item</span>
                  <p className="font-bold text-gray-900">{selectedIncident.itemDetails?.name || 'Garment Item'}</p>
                  {selectedIncident.itemDetails?.estimatedValue && (
                    <p className="font-mono text-[11px] font-bold text-amber-700">
                      Replacement Value: £{selectedIncident.itemDetails.estimatedValue}
                    </p>
                  )}
                </div>
              </div>

              {/* Dispute Narrative Description */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Incident Narrative</span>
                <p className="p-4 bg-gray-50 rounded-2xl border border-gray-100 text-xs text-gray-700 leading-relaxed">
                  "{selectedIncident.description}"
                </p>
              </div>

              {/* Activity Trail / Investigation Notes */}
              <div className="space-y-3 pt-2 border-t border-gray-100">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#03045E] uppercase tracking-wider">
                    Investigation Trail ({selectedIncident.investigationNotes?.length || 0})
                  </span>
                </div>

                <div className="space-y-2 max-h-48 overflow-y-auto pr-1 text-xs">
                  {(selectedIncident.investigationNotes || []).map((note, nIdx) => (
                    <div key={nIdx} className="p-3 bg-gray-50 rounded-xl border border-gray-100 space-y-1">
                      <div className="flex items-center justify-between text-[10px] text-gray-400">
                        <span className="font-bold text-gray-700">{note.actorName} ({note.actorRole})</span>
                        <span>{new Date(note.timestamp).toLocaleString()}</span>
                      </div>
                      <p className="text-gray-700">{note.note}</p>
                    </div>
                  ))}
                </div>

                {/* Post note form */}
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    placeholder="Append case inspection finding or driver interview notes..."
                    className="flex-1 px-3 py-2 bg-gray-50 rounded-xl border border-gray-200 text-xs focus:outline-hidden"
                  />
                  <button
                    onClick={handleAddNote}
                    disabled={actionLoading}
                    className="px-4 py-2 bg-[#03045E] hover:bg-[#0077B6] text-white rounded-xl text-xs font-bold cursor-pointer transition-colors"
                  >
                    Add Note
                  </button>
                </div>
              </div>

              {/* Resolution Area */}
              <div className="pt-2 border-t border-gray-100">
                {selectedIncident.status?.startsWith('resolved') && selectedIncident.resolution ? (
                  <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-emerald-900 flex items-center gap-1.5 text-sm">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        Resolved Case ({selectedIncident.resolution.type?.toUpperCase()})
                      </span>
                      {selectedIncident.resolution.amount && (
                        <span className="font-bold font-mono text-emerald-800 text-sm">
                          £{selectedIncident.resolution.amount}
                        </span>
                      )}
                    </div>
                    <p className="text-emerald-800 leading-relaxed font-medium">
                      "{selectedIncident.resolution.explanation}"
                    </p>
                    <span className="text-[10px] text-emerald-600 block">
                      Executed by {selectedIncident.resolution.resolvedByName} on {new Date(selectedIncident.resolution.resolvedAt).toLocaleString()}
                    </span>
                  </div>
                ) : (
                  <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200 space-y-3 text-xs">
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold text-[#03045E] uppercase tracking-wider text-xs">
                        Manager Official Resolution Console
                      </h4>
                      <span className="text-[10px] text-amber-700 font-bold bg-amber-50 px-2 py-0.5 rounded-md">
                        Action Required
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-[10px] font-bold text-gray-700 block mb-1">Resolution Remedy Action</label>
                        <select
                          value={resolveType}
                          onChange={(e) => setResolveType(e.target.value as any)}
                          className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs font-semibold"
                        >
                          <option value="refund">💸 Issue Customer Refund</option>
                          <option value="rewash">🔄 Trigger Free Rewash Cycle</option>
                          <option value="credit">💳 Issue Wallet Account Credit</option>
                          <option value="replacement">📦 Garment Replacement Payout</option>
                          <option value="dismissed">❌ Dismiss Claim (Pre-existing/Invalid)</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-[10px] font-bold text-gray-700 block mb-1">Financial Value (£)</label>
                        <input
                          type="number"
                          value={resolveAmount}
                          onChange={(e) => setResolveAmount(e.target.value)}
                          placeholder="e.g. 35.00"
                          className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs"
                        />
                      </div>

                      <div className="sm:col-span-2">
                        <label className="text-[10px] font-bold text-gray-700 block mb-1">
                          Mandatory Operational Resolution Justification
                        </label>
                        <textarea
                          value={resolveExplanation}
                          onChange={(e) => setResolveExplanation(e.target.value)}
                          rows={2}
                          placeholder="Provide detailed reasoning for the audit trail and customer notification..."
                          className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs"
                        />
                      </div>
                    </div>

                    <div className="flex justify-end pt-1">
                      <button
                        onClick={handleResolve}
                        disabled={actionLoading}
                        className="px-5 py-2.5 bg-[#03045E] hover:bg-[#0077B6] text-white rounded-xl text-xs font-bold cursor-pointer transition-colors shadow-xs"
                      >
                        {actionLoading ? 'Executing Resolution...' : 'Commit Official Resolution'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal: File New Incident */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white w-full max-w-xl rounded-3xl p-6 shadow-2xl space-y-4 relative">
            <button
              onClick={() => setCreateModalOpen(false)}
              className="absolute top-5 right-5 text-gray-400 hover:text-gray-700 bg-gray-100 p-2 rounded-full cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div>
              <h3 className="text-base font-bold text-[#03045E]">File Official Incident Report</h3>
              <p className="text-xs text-gray-500">Register a customer claim, garment loss, or quality defect in the immutable audit log</p>
            </div>

            <form onSubmit={handleCreateIncident} className="space-y-3 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-gray-700 block mb-1">Category</label>
                  <select
                    value={newType}
                    onChange={(e) => setNewType(e.target.value as any)}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold"
                  >
                    <option value="lost_item">Lost Item</option>
                    <option value="damaged_item">Damaged Item</option>
                    <option value="wrong_item">Wrong Item Delivered</option>
                    <option value="missing_item">Missing Item Shortfall</option>
                    <option value="customer_complaint">Customer Complaint</option>
                    <option value="delivery_dispute">Delivery Dispute</option>
                    <option value="payment_dispute">Payment Dispute</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-gray-700 block mb-1">Priority</label>
                  <select
                    value={newPriority}
                    onChange={(e) => setNewPriority(e.target.value as any)}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold"
                  >
                    <option value="low">Low - Standard inquiry</option>
                    <option value="medium">Medium - Normal review</option>
                    <option value="high">High - Immediate claim</option>
                    <option value="urgent">Urgent - VIP / Critical</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-gray-700 block mb-1">Linked Order ID (Optional)</label>
                  <input
                    type="text"
                    value={newOrderId}
                    onChange={(e) => setNewOrderId(e.target.value)}
                    placeholder="e.g. ord_abc123"
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-gray-700 block mb-1">Customer Name (Optional)</label>
                  <input
                    type="text"
                    value={newCustomerName}
                    onChange={(e) => setNewCustomerName(e.target.value)}
                    placeholder="e.g. Eleanor Vance"
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="text-[11px] font-bold text-gray-700 block mb-1">Incident Headline / Title</label>
                  <input
                    type="text"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="e.g. Cashmere sweater shrunk during dry cycle"
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-gray-700 block mb-1">Affected Garment Description</label>
                  <input
                    type="text"
                    value={newItemName}
                    onChange={(e) => setNewItemName(e.target.value)}
                    placeholder="e.g. Grey Ralph Lauren Sweater"
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-gray-700 block mb-1">Estimated Value (£)</label>
                  <input
                    type="number"
                    value={newItemEstValue}
                    onChange={(e) => setNewItemEstValue(e.target.value)}
                    placeholder="e.g. 150"
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="text-[11px] font-bold text-gray-700 block mb-1">Comprehensive Narrative</label>
                  <textarea
                    value={newDesc}
                    onChange={(e) => setNewDesc(e.target.value)}
                    rows={3}
                    placeholder="Detailed explanation of the damage/loss, who observed it, and any intake photos available..."
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-5 py-2 bg-[#03045E] hover:bg-[#0077B6] text-white rounded-xl text-xs font-bold cursor-pointer shadow-xs"
                >
                  {actionLoading ? 'Filing Report...' : 'Register Incident'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
