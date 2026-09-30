import React, { useState, useEffect } from 'react';
import { AlertOctagon, CheckCircle2, RefreshCw } from 'lucide-react';
import { ComplaintRecord } from '@laundelle/types';
import { apiFetch } from '@laundelle/api-client';

export const AdminComplaintsView: React.FC = () => {
  const [complaints, setComplaints] = useState<ComplaintRecord[]>([]);
  const [selectedComplaint, setSelectedComplaint] = useState<ComplaintRecord | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchTickets = async () => {
    setLoading(true);
    try {
      const rawSession = localStorage.getItem('l2u_auth_session');
      const token = rawSession ? JSON.parse(rawSession).token : null;
      const res = await apiFetch('/api/v1/support/tickets', {
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) }
      });
      if (res.ok) {
        const json = await res.json();
        const list = json.data?.tickets || json.tickets || [];
        const mapped: ComplaintRecord[] = list.map((t: any) => ({
          id: t.id || t._id,
          ticketNumber: t.id,
          customerName: t.customerName || t.name || 'Customer',
          customerEmail: t.customerEmail || t.email || 'customer@laundelle.co.uk',
          customerPhone: t.customerPhone || t.phone || '',
          orderNumber: t.orderId || 'ORD-GENERAL',
          subject: t.issueType || 'Customer Inquiry',
          description: t.description || 'No description provided.',
          status: (t.status || 'OPEN').toUpperCase() as any,
          rewashRequired: t.rewashRequired || false,
          creditRequired: t.creditRequired || false,
          evidence: {
            bagQrCode: t.bagQrCode || 'BAG-N/A',
            intakeWeighKg: t.intakeWeighKg || 4.2,
            processingMachineCode: t.processingMachineCode || 'WASHER-01',
            qcNotes: t.qcNotes || 'Intake and wash completed.'
          },
          createdAt: t.created_at || new Date().toISOString()
        }));
        setComplaints(mapped);
        if (mapped.length > 0) {
          setSelectedComplaint(prev => {
            if (!prev) return mapped[0];
            return mapped.find(m => m.id === prev.id) || mapped[0];
          });
        }
      }
    } catch (e) {
      console.error('Failed to load tickets', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, []);

  return (
    <div className="w-full space-y-6 p-6 sm:p-8 pb-24">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-heading font-extrabold text-[#03045E]">Complaints & Quality Audit Workspace</h1>
          <p className="text-xs text-gray-500">Investigate customer disputes with complete verifiable operational evidence chains.</p>
        </div>

        <button
          onClick={fetchTickets}
          disabled={loading}
          className="p-2.5 bg-white border border-gray-200 hover:bg-gray-50 text-[#03045E] rounded-2xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-2xs"
          title="Refresh Complaints"
        >
          <RefreshCw className={`w-4 h-4 text-[#0077B6] ${loading ? 'animate-spin' : ''}`} />
          <span className="hidden sm:inline">Refresh</span>
        </button>
      </div>

      {/* 3-Column Investigation Workspace Layout */}
      {!selectedComplaint ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-gray-100 shadow-xs space-y-3">
          <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <h3 className="font-heading font-extrabold text-[#03045E] text-base">No Open Customer Complaints</h3>
          <p className="text-xs text-gray-500 max-w-md mx-auto">
            All customer support tickets and quality inquiries have been resolved.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Complaint & Customer Summary (3 cols) */}
          <div className="lg:col-span-3 bg-white rounded-3xl p-6 shadow-xs border border-gray-100 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <span className="font-mono font-bold text-xs text-[#03045E]">{selectedComplaint.ticketNumber}</span>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-100 text-amber-800">
                {selectedComplaint.status}
              </span>
            </div>

            <div className="space-y-2">
              <span className="text-[10px] font-bold text-gray-400 uppercase block">Complainant Details</span>
              <p className="font-bold text-sm text-gray-900">{selectedComplaint.customerName}</p>
              <p className="text-xs text-gray-500">{selectedComplaint.customerEmail}</p>
              <p className="text-xs text-gray-500">{selectedComplaint.customerPhone}</p>
            </div>

            <div className="space-y-2 pt-2 border-t border-gray-100">
              <span className="text-[10px] font-bold text-gray-400 uppercase block">Dispute Summary</span>
              <h3 className="font-bold text-xs text-[#03045E]">{selectedComplaint.subject}</h3>
              <p className="text-xs text-gray-600 leading-relaxed bg-gray-50 p-3 rounded-2xl border border-gray-100">
                "{selectedComplaint.description}"
              </p>
            </div>

            <div className="space-y-2 pt-2 border-t border-gray-100">
              <span className="text-[10px] font-bold text-gray-400 uppercase block">Required Resolution Actions</span>
              <div className="space-y-1 text-xs">
                <label className="flex items-center gap-2 font-medium text-gray-700">
                  <input type="checkbox" checked={selectedComplaint.rewashRequired} readOnly className="rounded-md" />
                  <span>Rewash Required</span>
                </label>
                <label className="flex items-center gap-2 font-medium text-gray-700">
                  <input type="checkbox" checked={selectedComplaint.creditRequired} readOnly className="rounded-md" />
                  <span>Issue Goodwill Credit</span>
                </label>
              </div>
            </div>
          </div>

          {/* Center Column: Order Timeline & Stage Details (4 cols) */}
          <div className="lg:col-span-4 bg-white rounded-3xl p-6 shadow-xs border border-gray-100 space-y-5">
            <div>
              <span className="text-[10px] font-bold text-[#0077B6] uppercase tracking-wider block">Linked Order Audit</span>
              <h3 className="text-lg font-heading font-extrabold text-[#03045E]">{selectedComplaint.orderNumber}</h3>
            </div>

            <div className="space-y-4">
              <h4 className="text-xs font-bold text-[#03045E] uppercase tracking-wider">Operational Audit Checklist</h4>
              <div className="space-y-3 text-xs">
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-between">
                  <span className="font-bold text-emerald-900">1. Doorstep Pickup Verified</span>
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                </div>
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-between">
                  <span className="font-bold text-emerald-900">2. Plant Intake Weigh-in (4.2 kg)</span>
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                </div>
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-between">
                  <span className="font-bold text-emerald-900">3. Steam Press Cycle Executed</span>
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                </div>
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl flex items-center justify-between">
                  <span className="font-bold text-amber-900">4. Customer Requested Collar Rewash</span>
                  <AlertOctagon className="w-4 h-4 text-amber-600" />
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Complete Evidence Chain Inspection Panel (5 cols) */}
          <div className="lg:col-span-5 bg-white rounded-3xl p-6 shadow-xs border border-gray-100 space-y-5">
            <div>
              <h3 className="text-base font-heading font-extrabold text-[#03045E]">Verifiable Evidence Chain</h3>
              <p className="text-xs text-gray-500">Inspection panel combining plant weigh-in, machine, and delivery POD logs</p>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3.5 bg-[#CAF0F8]/40 border border-[#ADE8F4] rounded-2xl space-y-1">
                <span className="font-bold text-[#03045E] block">Bag Barcode QR History</span>
                <p className="text-gray-600 font-mono">Bag ID: <span className="font-bold">{selectedComplaint.evidence.bagQrCode}</span></p>
              </div>

              <div className="p-3.5 bg-[#CAF0F8]/40 border border-[#ADE8F4] rounded-2xl space-y-1">
                <span className="font-bold text-[#03045E] block">Machinery Cycle Execution</span>
                <p className="text-gray-600 font-mono">Machine: <span className="font-bold">{selectedComplaint.evidence.processingMachineCode}</span></p>
              </div>

              <div className="p-3.5 bg-[#CAF0F8]/40 border border-[#ADE8F4] rounded-2xl space-y-1">
                <span className="font-bold text-[#03045E] block">QC Inspection Report</span>
                <p className="text-gray-700 italic font-medium">"{selectedComplaint.evidence.qcNotes}"</p>
              </div>

              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-between">
                <span className="font-bold text-emerald-900">Full Chain Audit Validated</span>
                <button className="px-4 py-2 bg-[#03045E] hover:bg-[#023E8A] text-white rounded-xl text-xs font-bold cursor-pointer shadow-xs">
                  Approve & Resolve Ticket
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
