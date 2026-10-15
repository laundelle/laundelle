import React, { useState, useEffect } from 'react';
import { Settings, Shield, FileText, Eye, X, RefreshCw } from 'lucide-react';
import { AuditLogRecord } from '@laundelle/types';
import { dbAdminFetchAuditLogs } from '@laundelle/api-client';

export const AdminSettingsView: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<'business' | 'permissions' | 'audit'>('audit');
  const [auditLogs, setAuditLogs] = useState<AuditLogRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAudit, setSelectedAudit] = useState<AuditLogRecord | null>(null);

  const loadLogs = async () => {
    setLoading(true);
    try {
      const logs = await dbAdminFetchAuditLogs();
      setAuditLogs(logs);
    } catch (e) {
      console.error('Failed to load audit logs:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, []);

  const tabs = [
    { id: 'audit' as const, label: 'Audit Log', shortLabel: `Log (${auditLogs.length})`, icon: FileText },
    { id: 'permissions' as const, label: 'Security', shortLabel: 'Security', icon: Shield },
    { id: 'business' as const, label: 'Business Info', shortLabel: 'Business', icon: Settings },
  ];

  return (
    <div className="w-full space-y-5 p-4 sm:p-8 pb-24 md:pb-8 font-sans">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-heading font-bold text-slate-900 tracking-tight">Settings & Audit Log</h1>
          <p className="text-xs text-slate-500 mt-0.5">Configuration, permissions, and system audit trail</p>
        </div>

        {activeSubTab === 'audit' && (
          <button
            onClick={loadLogs}
            className="px-3.5 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 shadow-2xs cursor-pointer flex items-center gap-1.5 text-xs font-semibold transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-blue-600 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-2xl p-1.5 shadow-xs border border-slate-100 flex items-center gap-1.5 max-w-md">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveSubTab(tab.id)}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeSubTab === tab.id ? 'bg-slate-900 text-white shadow-2xs' : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <tab.icon className="w-3.5 h-3.5 shrink-0" />
            <span className="hidden sm:inline">{tab.label}</span>
            <span className="sm:hidden">{tab.shortLabel}</span>
          </button>
        ))}
      </div>

      {activeSubTab === 'audit' && (
        <>
          {loading && auditLogs.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 text-center border border-slate-100 shadow-xs">
              <RefreshCw className="w-7 h-7 text-blue-600 animate-spin mx-auto mb-2" />
              <p className="text-xs font-medium text-slate-500">Loading audit records...</p>
            </div>
          ) : auditLogs.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 text-center border border-slate-100 shadow-xs">
              <FileText className="w-7 h-7 text-slate-300 mx-auto mb-2" />
              <p className="text-xs font-semibold text-slate-600">No audit records logged yet</p>
            </div>
          ) : (
            <div className="w-full bg-white rounded-2xl shadow-xs border border-slate-100 overflow-hidden flex flex-col h-[calc(100vh-270px)] min-h-[460px]">
              {/* Mobile: Cards */}
              <div className="md:hidden flex-1 overflow-y-auto p-3 space-y-2.5">
                {auditLogs.map((aud) => (
                  <div key={aud.id} className="bg-slate-50/60 rounded-xl p-3 border border-slate-100 space-y-1.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <span className="font-mono text-[10px] text-slate-400 block">{aud.createdAt}</span>
                        <p className="font-semibold text-xs text-slate-900 truncate">{aud.actorName}</p>
                        <p className="font-mono font-semibold text-[11px] text-blue-600">{aud.action}</p>
                      </div>
                      <button
                        onClick={() => setSelectedAudit(aud)}
                        className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg cursor-pointer shrink-0"
                      >
                        <Eye className="w-3.5 h-3.5 text-slate-600" />
                      </button>
                    </div>
                    <p className="text-[11px] text-slate-600 leading-snug">{aud.reason}</p>
                    <div className="flex gap-1.5 flex-wrap">
                      <span className="text-[10px] font-medium text-slate-700 bg-white border border-slate-200 px-2 py-0.5 rounded-md">{aud.actorRole}</span>
                      <span className="text-[10px] text-slate-500 bg-white border border-slate-200 px-2 py-0.5 rounded-md">{aud.entityType} ({aud.entityId})</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop: Table */}
              <div className="hidden md:block flex-1 overflow-y-auto overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="sticky top-0 z-10 bg-slate-50 text-slate-500 font-semibold border-b border-slate-200 uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="py-3 px-4">Date & Time</th>
                      <th className="py-3 px-4">Actor</th>
                      <th className="py-3 px-4">Role</th>
                      <th className="py-3 px-4">Action</th>
                      <th className="py-3 px-4">Entity</th>
                      <th className="py-3 px-4">Reason / Notes</th>
                      <th className="py-3 px-4 text-right">Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {auditLogs.map((aud) => (
                      <tr key={aud.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3 px-4 font-mono text-slate-500 text-[11px]">{aud.createdAt}</td>
                        <td className="py-3 px-4 font-semibold text-slate-900">{aud.actorName}</td>
                        <td className="py-3 px-4 text-slate-700">{aud.actorRole}</td>
                        <td className="py-3 px-4 font-mono font-medium text-blue-600">{aud.action}</td>
                        <td className="py-3 px-4 text-slate-500">{aud.entityType} ({aud.entityId})</td>
                        <td className="py-3 px-4 text-slate-600 max-w-xs truncate">{aud.reason}</td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => setSelectedAudit(aud)}
                            className="p-1.5 hover:bg-slate-100 text-slate-600 rounded-lg cursor-pointer transition-colors"
                          >
                            <Eye className="w-3.5 h-3.5 text-slate-600" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {activeSubTab === 'permissions' && (
        <div className="bg-white rounded-2xl md:rounded-3xl p-4 md:p-6 shadow-xs border border-gray-100 space-y-4">
          <h3 className="font-heading font-extrabold text-base text-[#03045E]">Role-Based Access Control & Security</h3>
          <p className="text-xs text-gray-500">Enforced at API gateway level with cryptographically signed tokens and role authorization middleware.</p>
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs text-emerald-900 leading-relaxed space-y-2">
            <p className="font-bold">Active Authorization Policies:</p>
            <ul className="list-disc list-inside space-y-1 text-emerald-800">
              <li>Customer accounts cannot access internal administrative, manager, processor, or driver endpoints.</li>
              <li>Plant Managers have restricted access to their designated plant facilities, machinery, and assigned drivers.</li>
              <li>Every administrative override, status change, and inventory adjustment records an immutable entry into the MongoDB audit trail.</li>
            </ul>
          </div>
        </div>
      )}

      {activeSubTab === 'business' && (
        <div className="bg-white rounded-2xl md:rounded-3xl p-4 md:p-6 shadow-xs border border-gray-100 space-y-4">
          <h3 className="font-heading font-extrabold text-base text-[#03045E]">Business & Platform Information</h3>
          <p className="text-xs text-gray-500">Core operational profile and business contact details.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="p-4 bg-gray-50 rounded-2xl space-y-1">
              <span className="font-bold text-gray-400 uppercase text-[10px] block">Trading Name</span>
              <span className="font-bold text-[#03045E] text-sm">Laundelle Premium Laundry Ops</span>
            </div>
            <div className="p-4 bg-gray-50 rounded-2xl space-y-1">
              <span className="font-bold text-gray-400 uppercase text-[10px] block">Operating Currency</span>
              <span className="font-bold text-[#03045E] text-sm">GBP (£) - United Kingdom</span>
            </div>
            <div className="p-4 bg-gray-50 rounded-2xl space-y-1">
              <span className="font-bold text-gray-400 uppercase text-[10px] block">Standard Turnaround SLA</span>
              <span className="font-bold text-[#03045E] text-sm">24 - 48 Hours Guarantee</span>
            </div>
            <div className="p-4 bg-gray-50 rounded-2xl space-y-1">
              <span className="font-bold text-gray-400 uppercase text-[10px] block">Central Dispatch Plant</span>
              <span className="font-bold text-[#03045E] text-sm">PLANT-1 (West London Facility)</span>
            </div>
          </div>
        </div>
      )}

      {/* Audit Detail Modal */}
      {selectedAudit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="bg-white w-full max-w-lg rounded-3xl p-6 shadow-2xl space-y-5 relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setSelectedAudit(null)}
              className="absolute top-5 right-5 text-gray-400 hover:text-gray-700 bg-gray-100 p-2 rounded-full cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <h3 className="text-base font-bold text-[#03045E]">Audit Event Detail</h3>
              <p className="text-xs text-gray-500">Action: <span className="font-mono font-bold text-[#0077B6]">{selectedAudit.action}</span></p>
            </div>

            <div className="p-3 bg-gray-50 rounded-2xl text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-gray-500">Actor:</span>
                <span className="font-bold text-gray-900">{selectedAudit.actorName} ({selectedAudit.actorRole})</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Timestamp:</span>
                <span className="font-mono text-gray-700">{selectedAudit.createdAt}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Entity:</span>
                <span className="font-bold text-[#03045E]">{selectedAudit.entityType} ({selectedAudit.entityId})</span>
              </div>
              <div>
                <span className="text-gray-500 block mb-0.5">Reason / Log:</span>
                <p className="font-medium text-gray-800">{selectedAudit.reason}</p>
              </div>
            </div>

            <div className="space-y-2">
              <span className="font-bold text-xs text-gray-700 block">Payload / State Record:</span>
              <pre className="font-mono text-[11px] bg-gray-900 text-emerald-400 p-3 rounded-2xl overflow-auto max-h-48">
                {JSON.stringify(selectedAudit.newValues || selectedAudit, null, 2)}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
