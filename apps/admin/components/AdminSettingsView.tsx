import React, { useState, useEffect } from 'react';
import {
  Settings,
  Shield,
  FileText,
  Eye,
  X,
  RefreshCw,
  Save,
  CheckCircle2,
  Building2,
  Sliders,
  Lock,
  Search,
  RotateCcw,
  Clock,
  Mail,
  Phone,
  AlertTriangle,
  Sparkles,
  Database
} from 'lucide-react';
import { AuditLogRecord } from '@laundelle/types';
import { dbAdminFetchAuditLogs } from '@laundelle/api-client';

interface BusinessSettings {
  tradingName: string;
  companyRegNumber: string;
  currency: string;
  standardSla: string;
  minOrderValue: number;
  deliveryFee: number;
  freeDeliveryThreshold: number;
  supportEmail: string;
  supportPhone: string;
}

interface OperationalPolicies {
  autoAssignDrivers: boolean;
  autoBalancePlantCapacity: boolean;
  strictGarmentTagQc: boolean;
  bottleneckAlertThreshold: number;
  notifyCustomerOnStageChange: boolean;
  overdueWashAlertHours: number;
}

interface SecuritySettings {
  sessionTimeoutMinutes: number;
  requireTwoFactorForManagers: boolean;
  enforceAuditReasonOnOverrides: boolean;
}

const DEFAULT_BUSINESS: BusinessSettings = {
  tradingName: 'Laundelle Premium Laundry Operations',
  companyRegNumber: '12498210',
  currency: 'GBP (£)',
  standardSla: '24 - 48 Hours Guarantee',
  minOrderValue: 15.0,
  deliveryFee: 4.5,
  freeDeliveryThreshold: 40.0,
  supportEmail: 'ops@laundelle.com',
  supportPhone: '+44 800 123 4567',
};

const DEFAULT_OPERATIONS: OperationalPolicies = {
  autoAssignDrivers: true,
  autoBalancePlantCapacity: true,
  strictGarmentTagQc: true,
  bottleneckAlertThreshold: 90,
  notifyCustomerOnStageChange: true,
  overdueWashAlertHours: 24,
};

const DEFAULT_SECURITY: SecuritySettings = {
  sessionTimeoutMinutes: 60,
  requireTwoFactorForManagers: false,
  enforceAuditReasonOnOverrides: true,
};

const BIZ_KEY = 'laundelle_admin_business_settings';
const OPS_KEY = 'laundelle_admin_ops_policies';
const SEC_KEY = 'laundelle_admin_security_settings';

export const AdminSettingsView: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<'business' | 'operations' | 'permissions' | 'audit'>('business');
  const [auditLogs, setAuditLogs] = useState<AuditLogRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAudit, setSelectedAudit] = useState<AuditLogRecord | null>(null);
  const [auditSearch, setAuditSearch] = useState('');

  // Form states
  const [business, setBusiness] = useState<BusinessSettings>(DEFAULT_BUSINESS);
  const [operations, setOperations] = useState<OperationalPolicies>(DEFAULT_OPERATIONS);
  const [security, setSecurity] = useState<SecuritySettings>(DEFAULT_SECURITY);
  const [successToast, setSuccessToast] = useState('');

  const loadLogs = async () => {
    setLoading(true);
    try {
      const logs = await dbAdminFetchAuditLogs();
      setAuditLogs(logs || []);
    } catch (e) {
      console.error('Failed to load audit logs:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
    try {
      const storedBiz = localStorage.getItem(BIZ_KEY);
      if (storedBiz) setBusiness({ ...DEFAULT_BUSINESS, ...JSON.parse(storedBiz) });

      const storedOps = localStorage.getItem(OPS_KEY);
      if (storedOps) setOperations({ ...DEFAULT_OPERATIONS, ...JSON.parse(storedOps) });

      const storedSec = localStorage.getItem(SEC_KEY);
      if (storedSec) setSecurity({ ...DEFAULT_SECURITY, ...JSON.parse(storedSec) });
    } catch {}
  }, []);

  const showToast = (msg: string) => {
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(''), 3500);
  };

  const handleSaveBusiness = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem(BIZ_KEY, JSON.stringify(business));
    showToast('✓ Platform & Business Profile saved successfully.');
  };

  const handleSaveOperations = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem(OPS_KEY, JSON.stringify(operations));
    showToast('✓ Operational policies and dispatch automations updated.');
  };

  const handleSaveSecurity = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem(SEC_KEY, JSON.stringify(security));
    showToast('✓ Security and session parameters saved.');
  };

  const handleClearCache = () => {
    if (confirm('Purge local operational cache and re-sync all live service metrics?')) {
      showToast('✓ Local temporary cache cleared. Refreshing metrics...');
      loadLogs();
    }
  };

  const tabs = [
    { id: 'business' as const, label: 'Business Profile', icon: Building2 },
    { id: 'operations' as const, label: 'Operational Policies', icon: Sliders },
    { id: 'permissions' as const, label: 'Security & Access', icon: Shield },
    { id: 'audit' as const, label: `Audit Log (${auditLogs.length})`, icon: FileText },
  ];

  const filteredLogs = auditLogs.filter((aud) => {
    const q = auditSearch.toLowerCase().trim();
    if (!q) return true;
    return (
      aud.actorName?.toLowerCase().includes(q) ||
      aud.action?.toLowerCase().includes(q) ||
      aud.reason?.toLowerCase().includes(q) ||
      aud.entityType?.toLowerCase().includes(q) ||
      aud.entityId?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="w-full space-y-5 p-4 sm:p-8 pb-24 md:pb-8 font-sans">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight">System Settings & Controls</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Configure business profiles, automated plant policies, security thresholds, and system audit trail.
          </p>
        </div>

        {activeSubTab === 'audit' && (
          <button
            onClick={loadLogs}
            className="px-3.5 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 shadow-2xs cursor-pointer flex items-center gap-1.5 text-xs font-semibold transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-blue-600 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh Logs</span>
          </button>
        )}
      </div>

      {successToast && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-semibold flex items-center gap-2 animate-in fade-in duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successToast}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="bg-white rounded-2xl p-1.5 shadow-xs border border-slate-100 flex items-center gap-1.5 overflow-x-auto w-fit max-w-full">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveSubTab(tab.id)}
            className={`py-2 px-3.5 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap ${
              activeSubTab === tab.id ? 'bg-slate-900 text-white shadow-2xs' : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <tab.icon className="w-3.5 h-3.5 shrink-0" />
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* TAB 1: BUSINESS PROFILE */}
      {activeSubTab === 'business' && (
        <form onSubmit={handleSaveBusiness} className="space-y-4 max-w-4xl">
          <div className="bg-white rounded-2xl p-5 md:p-6 shadow-xs border border-slate-100 space-y-6">
            <div>
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-blue-600" />
                <span>Business & Platform Identity</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Core trading profile displayed on customer invoices and operational communications.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Company Trading Name</label>
                <input
                  type="text"
                  required
                  value={business.tradingName}
                  onChange={(e) => setBusiness({ ...business, tradingName: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:border-blue-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Company Registration Number</label>
                <input
                  type="text"
                  value={business.companyRegNumber}
                  onChange={(e) => setBusiness({ ...business, companyRegNumber: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:border-blue-500 focus:outline-hidden font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Primary Operating Currency</label>
                <select
                  value={business.currency}
                  onChange={(e) => setBusiness({ ...business, currency: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:border-blue-500 focus:outline-hidden cursor-pointer"
                >
                  <option value="GBP (£)">GBP (£) - British Pound</option>
                  <option value="EUR (€)">EUR (€) - Euro</option>
                  <option value="USD ($)">USD ($) - US Dollar</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Standard Turnaround SLA</label>
                <select
                  value={business.standardSla}
                  onChange={(e) => setBusiness({ ...business, standardSla: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:border-blue-500 focus:outline-hidden cursor-pointer"
                >
                  <option value="24 Hours Express">24 Hours Express</option>
                  <option value="24 - 48 Hours Guarantee">24 - 48 Hours Guarantee</option>
                  <option value="48 - 72 Hours Standard">48 - 72 Hours Standard</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-slate-100">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Minimum Order Value (£)</label>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  value={business.minOrderValue}
                  onChange={(e) => setBusiness({ ...business, minOrderValue: Number(e.target.value) })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:border-blue-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Standard Delivery Fee (£)</label>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  value={business.deliveryFee}
                  onChange={(e) => setBusiness({ ...business, deliveryFee: Number(e.target.value) })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:border-blue-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Free Delivery Spend (£)</label>
                <input
                  type="number"
                  step="1"
                  min="0"
                  value={business.freeDeliveryThreshold}
                  onChange={(e) => setBusiness({ ...business, freeDeliveryThreshold: Number(e.target.value) })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:border-blue-500 focus:outline-hidden"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Central Operations Email</label>
                <div className="relative">
                  <Mail className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    value={business.supportEmail}
                    onChange={(e) => setBusiness({ ...business, supportEmail: e.target.value })}
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:border-blue-500 focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Emergency Dispatch Contact</label>
                <div className="relative">
                  <Phone className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="tel"
                    required
                    value={business.supportPhone}
                    onChange={(e) => setBusiness({ ...business, supportPhone: e.target.value })}
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:border-blue-500 focus:outline-hidden"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="submit"
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5 shadow-2xs"
            >
              <Save className="w-4 h-4" />
              <span>Save Business Profile</span>
            </button>
          </div>
        </form>
      )}

      {/* TAB 2: OPERATIONAL POLICIES */}
      {activeSubTab === 'operations' && (
        <form onSubmit={handleSaveOperations} className="space-y-4 max-w-4xl">
          <div className="bg-white rounded-2xl p-5 md:p-6 shadow-xs border border-slate-100 space-y-6">
            <div>
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Sliders className="w-4 h-4 text-blue-600" />
                <span>Automations & Plant Quality Controls</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Configure automated workflows, load redistribution, and garment handling thresholds.
              </p>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-xl">
                <div>
                  <span className="text-xs font-semibold text-slate-900 block">Automated Driver Route Dispatch</span>
                  <span className="text-[11px] text-slate-500">
                    Auto-cluster nearby pickup & delivery orders into optimal driver van routes.
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={operations.autoAssignDrivers}
                  onChange={(e) => setOperations({ ...operations, autoAssignDrivers: e.target.checked })}
                  className="w-4 h-4 text-blue-600 rounded-md cursor-pointer accent-blue-600"
                />
              </div>

              <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-xl">
                <div>
                  <span className="text-xs font-semibold text-slate-900 block">Plant Load Rebalancing</span>
                  <span className="text-[11px] text-slate-500">
                    Automatically divert overflow orders to nearby plants when facility capacity exceeds threshold.
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={operations.autoBalancePlantCapacity}
                  onChange={(e) => setOperations({ ...operations, autoBalancePlantCapacity: e.target.checked })}
                  className="w-4 h-4 text-blue-600 rounded-md cursor-pointer accent-blue-600"
                />
              </div>

              <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-xl">
                <div>
                  <span className="text-xs font-semibold text-slate-900 block">Strict Garment Tag Quality Check</span>
                  <span className="text-[11px] text-slate-500">
                    Requires processors to verify barcode and color-tag every garment before drying.
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={operations.strictGarmentTagQc}
                  onChange={(e) => setOperations({ ...operations, strictGarmentTagQc: e.target.checked })}
                  className="w-4 h-4 text-blue-600 rounded-md cursor-pointer accent-blue-600"
                />
              </div>

              <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-xl">
                <div>
                  <span className="text-xs font-semibold text-slate-900 block">Customer Real-time Notifications</span>
                  <span className="text-[11px] text-slate-500">
                    Send automated SMS and email updates to customers as orders progress through wash and iron stages.
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={operations.notifyCustomerOnStageChange}
                  onChange={(e) => setOperations({ ...operations, notifyCustomerOnStageChange: e.target.checked })}
                  className="w-4 h-4 text-blue-600 rounded-md cursor-pointer accent-blue-600"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Bottleneck Alert Trigger Threshold (%)
                </label>
                <input
                  type="number"
                  min="50"
                  max="100"
                  value={operations.bottleneckAlertThreshold}
                  onChange={(e) => setOperations({ ...operations, bottleneckAlertThreshold: Number(e.target.value) })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:border-blue-500 focus:outline-hidden"
                />
                <p className="text-[11px] text-slate-400 mt-1">Alerts regional managers when facility reaches this capacity.</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Overdue Washing Alert Window (Hours)
                </label>
                <input
                  type="number"
                  min="6"
                  max="72"
                  value={operations.overdueWashAlertHours}
                  onChange={(e) => setOperations({ ...operations, overdueWashAlertHours: Number(e.target.value) })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:border-blue-500 focus:outline-hidden"
                />
                <p className="text-[11px] text-slate-400 mt-1">Highlights delayed bags on the manager dashboard.</p>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="submit"
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5 shadow-2xs"
            >
              <Save className="w-4 h-4" />
              <span>Save Policies</span>
            </button>
          </div>
        </form>
      )}

      {/* TAB 3: SECURITY & PERMISSIONS */}
      {activeSubTab === 'permissions' && (
        <form onSubmit={handleSaveSecurity} className="space-y-4 max-w-4xl">
          <div className="bg-white rounded-2xl p-5 md:p-6 shadow-xs border border-slate-100 space-y-6">
            <div>
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Shield className="w-4 h-4 text-blue-600" />
                <span>Security Policies & Access Control</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Session longevity, authentication controls, and administrative audit requirements.
              </p>
            </div>

            <div className="max-w-sm">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Admin & Manager Session Inactivity Timeout
              </label>
              <select
                value={security.sessionTimeoutMinutes}
                onChange={(e) => setSecurity({ ...security, sessionTimeoutMinutes: Number(e.target.value) })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:border-blue-500 focus:outline-hidden cursor-pointer"
              >
                <option value={15}>15 Minutes (High Security)</option>
                <option value={30}>30 Minutes</option>
                <option value={60}>1 Hour (Standard)</option>
                <option value={240}>4 Hours</option>
                <option value={480}>8 Hours (Full Shift)</option>
              </select>
            </div>

            <div className="space-y-3 pt-2 border-t border-slate-100">
              <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-xl">
                <div>
                  <span className="text-xs font-semibold text-slate-900 block">
                    Enforce Mandatory Reason for Overrides
                  </span>
                  <span className="text-[11px] text-slate-500">
                    Requires staff to enter a reason whenever canceling orders or manually adjusting stock.
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={security.enforceAuditReasonOnOverrides}
                  onChange={(e) => setSecurity({ ...security, enforceAuditReasonOnOverrides: e.target.checked })}
                  className="w-4 h-4 text-blue-600 rounded-md cursor-pointer accent-blue-600"
                />
              </div>

              <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-xl">
                <div>
                  <span className="text-xs font-semibold text-slate-900 block">
                    Require Two-Factor Verification for Managers
                  </span>
                  <span className="text-[11px] text-slate-500">
                    Requires OTP verification for all plant managers accessing operations and staff records.
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={security.requireTwoFactorForManagers}
                  onChange={(e) => setSecurity({ ...security, requireTwoFactorForManagers: e.target.checked })}
                  className="w-4 h-4 text-blue-600 rounded-md cursor-pointer accent-blue-600"
                />
              </div>
            </div>

            <div className="p-4 bg-slate-50 border border-slate-200/60 rounded-xl flex items-center justify-between gap-4">
              <div>
                <span className="text-xs font-semibold text-slate-900 block">Maintenance & Cache Invalidation</span>
                <span className="text-[11px] text-slate-500">
                  Purge stale temporary data, refresh capacity counters, and reset cached API queries.
                </span>
              </div>
              <button
                type="button"
                onClick={handleClearCache}
                className="px-3.5 py-1.5 bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 rounded-xl text-xs font-semibold transition-colors cursor-pointer shrink-0"
              >
                Clear Cache
              </button>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="submit"
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5 shadow-2xs"
            >
              <Save className="w-4 h-4" />
              <span>Save Security Settings</span>
            </button>
          </div>
        </form>
      )}

      {/* TAB 4: AUDIT LOG */}
      {activeSubTab === 'audit' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl p-4 shadow-xs border border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-80">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search actor, action, entity, reason..."
                value={auditSearch}
                onChange={(e) => setAuditSearch(e.target.value)}
                className="w-full pl-9 pr-3.5 py-2 bg-slate-50 border border-slate-200/70 rounded-xl text-xs font-medium focus:bg-white focus:border-blue-500 focus:outline-hidden"
              />
            </div>
            <div className="text-xs text-slate-500 font-medium">
              Showing <span className="text-slate-900 font-bold">{filteredLogs.length}</span> audit records
            </div>
          </div>

          {loading && auditLogs.length === 0 ? (
            <div className="bg-white rounded-2xl p-16 text-center border border-slate-100 shadow-xs space-y-2">
              <RefreshCw className="w-6 h-6 text-blue-600 animate-spin mx-auto" />
              <p className="text-xs font-medium text-slate-500">Loading audit log events...</p>
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="bg-white rounded-2xl p-16 text-center border border-slate-100 shadow-xs space-y-2">
              <FileText className="w-8 h-8 text-slate-300 mx-auto" />
              <p className="text-xs font-semibold text-slate-700">No audit events match your criteria</p>
            </div>
          ) : (
            <div className="w-full bg-white rounded-2xl shadow-xs border border-slate-100 overflow-hidden flex flex-col h-[calc(100vh-290px)] min-h-[460px]">
              <div className="flex-1 overflow-y-auto overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="sticky top-0 z-10 bg-slate-50 text-slate-500 font-semibold border-b border-slate-200 uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="py-3 px-4">Timestamp</th>
                      <th className="py-3 px-4">Actor</th>
                      <th className="py-3 px-4">Role</th>
                      <th className="py-3 px-4">Action</th>
                      <th className="py-3 px-4">Entity</th>
                      <th className="py-3 px-4">Reason / Notes</th>
                      <th className="py-3 px-4 text-right">Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredLogs.map((aud) => (
                      <tr key={aud.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4 font-mono text-slate-500 text-[11px] whitespace-nowrap">{aud.createdAt}</td>
                        <td className="py-3 px-4 font-semibold text-slate-900">{aud.actorName}</td>
                        <td className="py-3 px-4 text-slate-600">{aud.actorRole}</td>
                        <td className="py-3 px-4">
                          <span className="font-mono font-semibold text-[11px] text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">
                            {aud.action}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-500 font-mono text-[11px]">
                          {aud.entityType} ({aud.entityId})
                        </td>
                        <td className="py-3 px-4 text-slate-600 max-w-xs truncate">{aud.reason}</td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => setSelectedAudit(aud)}
                            className="p-1.5 hover:bg-slate-100 text-slate-600 rounded-lg cursor-pointer transition-colors"
                            title="View Full Payload"
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
        </div>
      )}

      {/* Audit Detail Modal */}
      {selectedAudit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white w-full max-w-lg rounded-2xl p-6 shadow-xl space-y-4 relative max-h-[90vh] overflow-y-auto border border-slate-100">
            <button
              onClick={() => setSelectedAudit(null)}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-700 bg-slate-50 p-2 rounded-full cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div>
              <h3 className="text-sm font-bold text-slate-900">Audit Record Detail</h3>
              <p className="text-xs text-slate-500">
                Action: <span className="font-mono font-bold text-blue-600">{selectedAudit.action}</span>
              </p>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl text-xs space-y-2 border border-slate-100">
              <div className="flex justify-between">
                <span className="text-slate-400">Actor:</span>
                <span className="font-semibold text-slate-900">
                  {selectedAudit.actorName} ({selectedAudit.actorRole})
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Timestamp:</span>
                <span className="font-mono text-slate-700">{selectedAudit.createdAt}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Entity:</span>
                <span className="font-semibold text-slate-900">
                  {selectedAudit.entityType} ({selectedAudit.entityId})
                </span>
              </div>
              <div>
                <span className="text-slate-400 block mb-0.5">Reason / Description:</span>
                <p className="font-medium text-slate-800">{selectedAudit.reason}</p>
              </div>
            </div>

            <div className="space-y-1.5">
              <span className="font-semibold text-xs text-slate-700 block">Payload / State Snapshot:</span>
              <pre className="font-mono text-[11px] bg-slate-900 text-emerald-400 p-3 rounded-xl overflow-auto max-h-48">
                {JSON.stringify(selectedAudit.newValues || selectedAudit, null, 2)}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
