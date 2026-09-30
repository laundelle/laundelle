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
    <div className="w-full space-y-6 p-4 sm:p-8 pb-24 md:pb-8">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-heading font-extrabold text-[#03045E] leading-tight">Settings & Audit Log</h1>
          <p className="text-xs text-gray-500 mt-0.5">Business configuration, staff permission policies, and live MongoDB audit trail.</p>
        </div>

        {activeSubTab === 'audit' && (
          <button
            onClick={loadLogs}
            className="p-2.5 bg-white border border-gray-200 text-gray-700 rounded-2xl hover:bg-gray-50 shadow-xs cursor-pointer flex items-center gap-2 text-xs font-bold"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh Audit Trail</span>
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-2xl md:rounded-3xl p-1.5 md:p-2 shadow-xs border border-gray-100 flex items-center gap-1.5">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveSubTab(tab.id)}
            className={`flex-1 py-2.5 px-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeSubTab === tab.id ? 'bg-[#03045E] text-white shadow-sm' : 'text-gray-500 hover:bg-gray-50'
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
            <div className="bg-white rounded-3xl p-12 text-center border border-gray-100 shadow-xs">
              <RefreshCw className="w-8 h-8 text-[#0077B6] animate-spin mx-auto mb-3" />
              <p className="text-xs font-bold text-gray-500">Querying live audit logs from MongoDB...</p>
            </div>
          ) : auditLogs.length === 0 ? (
            <div className="bg-white rounded-3xl p-12 text-center border border-gray-100 shadow-xs">
              <FileText className="w-8 h-8 text-gray-300 mx-auto mb-3" />
              <p className="text-xs font-bold text-gray-500">No system audit records logged yet.</p>
              <p className="text-[11px] text-gray-400 mt-1">Actions such as manager overrides, staff changes, and catalog updates will be recorded here.</p>
            </div>
          ) : (
            <>
              {/* Mobile: Cards */}
              <div className="md:hidden space-y-3">
                {auditLogs.map((aud) => (
                  <div key={aud.id} className="bg-white rounded-2xl p-4 border border-gray-100 space-y-2 shadow-xs">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <span className="font-mono text-[10px] text-gray-400 block">{aud.createdAt}</span>
                        <p className="font-bold text-xs text-gray-900 truncate">{aud.actorName}</p>
                        <p className="font-mono font-bold text-[11px] text-[#0077B6]">{aud.action}</p>
                      </div>
                      <button
                        onClick={() => setSelectedAudit(aud)}
                        className="p-1.5 bg-[#CAF0F8] hover:bg-[#ADE8F4] text-[#03045E] rounded-xl cursor-pointer shrink-0"
                      >
                        <Eye className="w-3.5 h-3.5 text-[#0077B6]" />
                      </button>
                    </div>
                    <p className="text-[11px] text-gray-600 leading-snug">{aud.reason}</p>
                    <div className="flex gap-2 flex-wrap">
                      <span className="text-[10px] font-semibold text-[#03045E] bg-[#CAF0F8] px-2 py-0.5 rounded-full">{aud.actorRole}</span>
                      <span className="text-[10px] text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">{aud.entityType} ({aud.entityId})</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop: Table */}
              <div className="hidden md:block bg-white rounded-3xl shadow-xs border border-gray-100 overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#f8fafc] text-gray-500 font-bold border-b border-gray-100 uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="py-3.5 px-4">Date & Time</th>
                      <th className="py-3.5 px-4">Actor</th>
                      <th className="py-3.5 px-4">Role</th>
                      <th className="py-3.5 px-4">Action</th>
                      <th className="py-3.5 px-4">Entity</th>
                      <th className="py-3.5 px-4">Reason / Notes</th>
                      <th className="py-3.5 px-4 text-right">Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {auditLogs.map((aud) => (
                      <tr key={aud.id} className="hover:bg-gray-50">
                        <td className="py-3.5 px-4 font-mono text-gray-500">{aud.createdAt}</td>
                        <td className="py-3.5 px-4 font-bold text-gray-900">{aud.actorName}</td>
                        <td className="py-3.5 px-4 font-semibold text-[#03045E]">{aud.actorRole}</td>
                        <td className="py-3.5 px-4 font-mono font-bold text-[#0077B6]">{aud.action}</td>
                        <td className="py-3.5 px-4 text-gray-600">{aud.entityType} ({aud.entityId})</td>
                        <td className="py-3.5 px-4 text-gray-600 max-w-xs">{aud.reason}</td>
                        <td className="py-3.5 px-4 text-right">
                          <button
                            onClick={() => setSelectedAudit(aud)}
                            className="p-1.5 bg-[#CAF0F8] hover:bg-[#ADE8F4] text-[#03045E] rounded-xl cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5 text-[#0077B6]" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
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
