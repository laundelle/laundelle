import React, { useState, useEffect } from 'react';
import {
  Settings,
  Clock,
  Shield,
  Bell,
  Truck,
  CheckCircle2,
  Save,
  RotateCcw,
  Sparkles,
  Sliders,
  SlidersHorizontal,
  Volume2,
  Mail,
  Phone,
  User,
  Building2
} from 'lucide-react';
import { getStoredSession } from '@laundelle/api-client';

interface ManagerSettingsState {
  plantOperatingHoursStart: string;
  plantOperatingHoursEnd: string;
  shiftCapacityLimit: number;
  machineryMaintenanceNoticeHours: number;
  expressPriorityMode: boolean;
  autoDispatchReadyBags: boolean;
  requireScanBeforeDispatch: boolean;
  maxPackagesPerDriverTrip: number;
  managerDisplayName: string;
  contactEmail: string;
  contactPhone: string;
  bottleneckSmsAlerts: boolean;
  soundAlertsIncomingOrders: boolean;
}

const DEFAULT_SETTINGS: ManagerSettingsState = {
  plantOperatingHoursStart: '08:00',
  plantOperatingHoursEnd: '20:00',
  shiftCapacityLimit: 160,
  machineryMaintenanceNoticeHours: 24,
  expressPriorityMode: true,
  autoDispatchReadyBags: true,
  requireScanBeforeDispatch: true,
  maxPackagesPerDriverTrip: 20,
  managerDisplayName: '',
  contactEmail: '',
  contactPhone: '',
  bottleneckSmsAlerts: true,
  soundAlertsIncomingOrders: true,
};

const STORAGE_KEY = 'laundelle_manager_portal_settings';

export const ManagerSettingsView: React.FC = () => {
  const session = getStoredSession();
  const [settings, setSettings] = useState<ManagerSettingsState>(DEFAULT_SETTINGS);
  const [activeSection, setActiveSection] = useState<'facility' | 'dispatch' | 'profile'>('facility');
  const [isSaved, setIsSaved] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(stored) });
      } else {
        setSettings({
          ...DEFAULT_SETTINGS,
          managerDisplayName: session?.user?.name || 'Plant Operations Manager',
          contactEmail: session?.user?.email || 'manager@laundelle.com',
          contactPhone: '+44 7700 900500',
        });
      }
    } catch {
      setSettings(DEFAULT_SETTINGS);
    }
  }, []);

  const handleChange = <K extends keyof ManagerSettingsState>(key: K, value: ManagerSettingsState[K]) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
    setIsSaved(false);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
      setIsSaved(true);
      setSaveMessage('✓ Plant operational preferences saved successfully.');
      setTimeout(() => {
        setIsSaved(false);
        setSaveMessage('');
      }, 3500);
    } catch {
      alert('Failed to save settings to local storage.');
    }
  };

  const handleReset = () => {
    if (confirm('Reset all operational configurations back to system defaults?')) {
      setSettings({
        ...DEFAULT_SETTINGS,
        managerDisplayName: session?.user?.name || 'Plant Operations Manager',
        contactEmail: session?.user?.email || 'manager@laundelle.com',
        contactPhone: '+44 7700 900500',
      });
      localStorage.removeItem(STORAGE_KEY);
      setIsSaved(true);
      setSaveMessage('✓ Reset to standard operational defaults.');
      setTimeout(() => {
        setIsSaved(false);
        setSaveMessage('');
      }, 3500);
    }
  };

  return (
    <div className="w-full space-y-5 p-4 sm:p-8 pb-24 md:pb-8 font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight">
            Facility Settings & Operational Controls
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Configure shift thresholds, driver dispatch parameters, and local alert preferences.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleReset}
            className="px-3.5 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5 shadow-2xs"
          >
            <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
            <span>Reset Defaults</span>
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5 shadow-2xs"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Save Preferences</span>
          </button>
        </div>
      </div>

      {saveMessage && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-semibold flex items-center gap-2 animate-in fade-in duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{saveMessage}</span>
        </div>
      )}

      {/* Navigation Sub-Tabs */}
      <div className="bg-white rounded-2xl p-1.5 shadow-xs border border-slate-100 flex items-center gap-1.5 max-w-md">
        <button
          type="button"
          onClick={() => setActiveSection('facility')}
          className={`flex-1 py-2 px-3 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
            activeSection === 'facility'
              ? 'bg-slate-900 text-white shadow-2xs'
              : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          <Building2 className="w-3.5 h-3.5" />
          <span>Plant & Shift</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveSection('dispatch')}
          className={`flex-1 py-2 px-3 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
            activeSection === 'dispatch'
              ? 'bg-slate-900 text-white shadow-2xs'
              : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          <Truck className="w-3.5 h-3.5" />
          <span>Dispatch & Fleet</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveSection('profile')}
          className={`flex-1 py-2 px-3 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
            activeSection === 'profile'
              ? 'bg-slate-900 text-white shadow-2xs'
              : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          <Bell className="w-3.5 h-3.5" />
          <span>Alerts & Manager</span>
        </button>
      </div>

      <form onSubmit={handleSave} className="space-y-4">
        {/* SECTION 1: Facility & Shift */}
        {activeSection === 'facility' && (
          <div className="bg-white rounded-2xl p-5 md:p-6 shadow-xs border border-slate-100 space-y-6">
            <div>
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Clock className="w-4 h-4 text-blue-600" />
                <span>Operating Hours & Plant Shift Capacity</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Set operating hours during which processing machines run and orders are staged.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Plant Shift Start Time
                </label>
                <input
                  type="time"
                  value={settings.plantOperatingHoursStart}
                  onChange={(e) => handleChange('plantOperatingHoursStart', e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:border-blue-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Plant Shift End Time
                </label>
                <input
                  type="time"
                  value={settings.plantOperatingHoursEnd}
                  onChange={(e) => handleChange('plantOperatingHoursEnd', e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:border-blue-500 focus:outline-hidden"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Shift Max Bag Capacity
                </label>
                <input
                  type="number"
                  min="20"
                  max="1000"
                  value={settings.shiftCapacityLimit}
                  onChange={(e) => handleChange('shiftCapacityLimit', Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:border-blue-500 focus:outline-hidden"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Triggers capacity warning when active processing reaches this ceiling.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Preventive Maintenance Notice (Hours)
                </label>
                <input
                  type="number"
                  min="4"
                  max="168"
                  value={settings.machineryMaintenanceNoticeHours}
                  onChange={(e) => handleChange('machineryMaintenanceNoticeHours', Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:border-blue-500 focus:outline-hidden"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Advance alert window for machinery servicing inspection routines.
                </p>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100 flex items-center justify-between p-3 bg-slate-50 rounded-xl">
              <div>
                <span className="text-xs font-semibold text-slate-900 block">Express Priority Processing</span>
                <span className="text-[11px] text-slate-500">
                  Prioritize express wash orders at the top of the sorting and washing queue.
                </span>
              </div>
              <input
                type="checkbox"
                checked={settings.expressPriorityMode}
                onChange={(e) => handleChange('expressPriorityMode', e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded-md cursor-pointer accent-blue-600"
              />
            </div>
          </div>
        )}

        {/* SECTION 2: Dispatch & Fleet */}
        {activeSection === 'dispatch' && (
          <div className="bg-white rounded-2xl p-5 md:p-6 shadow-xs border border-slate-100 space-y-6">
            <div>
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Truck className="w-4 h-4 text-blue-600" />
                <span>Driver Dispatch & Route Handover Rules</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Automations for assigning processed laundry packages to delivery vans.
              </p>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-xl">
                <div>
                  <span className="text-xs font-semibold text-slate-900 block">
                    Auto-Queue Ready Bags to Assigned Drivers
                  </span>
                  <span className="text-[11px] text-slate-500">
                    Immediately assigns completed garments to drivers covering the customer's postcode sector.
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={settings.autoDispatchReadyBags}
                  onChange={(e) => handleChange('autoDispatchReadyBags', e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded-md cursor-pointer accent-blue-600"
                />
              </div>

              <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-xl">
                <div>
                  <span className="text-xs font-semibold text-slate-900 block">
                    Enforce QR Scan Before Driver Handover
                  </span>
                  <span className="text-[11px] text-slate-500">
                    Requires driver mobile app to scan bag barcode before order status marks 'OUT_FOR_DELIVERY'.
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={settings.requireScanBeforeDispatch}
                  onChange={(e) => handleChange('requireScanBeforeDispatch', e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded-md cursor-pointer accent-blue-600"
                />
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100 max-w-sm">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Max Bag Limit Per Delivery Van Run
              </label>
              <input
                type="number"
                min="5"
                max="50"
                value={settings.maxPackagesPerDriverTrip}
                onChange={(e) => handleChange('maxPackagesPerDriverTrip', Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:border-blue-500 focus:outline-hidden"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Ensures drivers are not overloaded and maintains timely delivery SLA windows.
              </p>
            </div>
          </div>
        )}

        {/* SECTION 3: Profile & Alerts */}
        {activeSection === 'profile' && (
          <div className="bg-white rounded-2xl p-5 md:p-6 shadow-xs border border-slate-100 space-y-6">
            <div>
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Bell className="w-4 h-4 text-blue-600" />
                <span>Manager Operational Profile & Notifications</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Contact information for operational dispatch and immediate alerts.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Manager Display Name
                </label>
                <div className="relative">
                  <User className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={settings.managerDisplayName}
                    onChange={(e) => handleChange('managerDisplayName', e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:border-blue-500 focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Operations Contact Email
                </label>
                <div className="relative">
                  <Mail className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    value={settings.contactEmail}
                    onChange={(e) => handleChange('contactEmail', e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:border-blue-500 focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Direct Escalation Phone
                </label>
                <div className="relative">
                  <Phone className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="tel"
                    value={settings.contactPhone}
                    onChange={(e) => handleChange('contactPhone', e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:border-blue-500 focus:outline-hidden"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-3 pt-2 border-t border-slate-100">
              <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-xl">
                <div>
                  <span className="text-xs font-semibold text-slate-900 block">
                    SMS Bottleneck Alerts
                  </span>
                  <span className="text-[11px] text-slate-500">
                    Receive urgent mobile SMS when plant capacity exceeds 90% or machine failure is logged.
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={settings.bottleneckSmsAlerts}
                  onChange={(e) => handleChange('bottleneckSmsAlerts', e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded-md cursor-pointer accent-blue-600"
                />
              </div>

              <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-xl">
                <div>
                  <span className="text-xs font-semibold text-slate-900 block">
                    Audible Tone for New Arrivals
                  </span>
                  <span className="text-[11px] text-slate-500">
                    Plays sound notification in manager workstation when drivers deliver new dirty bags into plant.
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={settings.soundAlertsIncomingOrders}
                  onChange={(e) => handleChange('soundAlertsIncomingOrders', e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded-md cursor-pointer accent-blue-600"
                />
              </div>
            </div>
          </div>
        )}

        <div className="flex items-center justify-end gap-2 pt-2">
          <button
            type="submit"
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5 shadow-2xs"
          >
            <Save className="w-4 h-4" />
            <span>Save All Settings</span>
          </button>
        </div>
      </form>
    </div>
  );
};
