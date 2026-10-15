import React, { useState, useEffect } from 'react';
import { Search, MapPin, Calendar, Bell, Shield, ArrowLeft, ChevronDown, Check, AlertTriangle } from 'lucide-react';
import { AdminRole, SystemAlert } from '@laundelle/types';
import { apiFetch } from '@laundelle/api-client';

interface AdminTopbarProps {
  currentRole: AdminRole;
  onChangeRole: (role: AdminRole) => void;
  selectedLocation: string;
  onChangeLocation: (loc: string) => void;
  dateFilter: string;
  onChangeDateFilter: (df: string) => void;
  onOpenGlobalSearch: () => void;
  onExitAdmin: () => void;
}

export const AdminTopbar: React.FC<AdminTopbarProps> = ({
  currentRole,
  onChangeRole,
  selectedLocation,
  onChangeLocation,
  dateFilter,
  onChangeDateFilter,
  onOpenGlobalSearch,
  onExitAdmin,
}) => {
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [roleDropdownOpen, setRoleDropdownOpen] = useState(false);
  const [alerts, setAlerts] = useState<SystemAlert[]>([]);

  useEffect(() => {
    const fetchAlerts = async () => {
      try {
        const rawSession = localStorage.getItem('l2u_auth_session');
        const token = rawSession ? JSON.parse(rawSession).token : null;
        const res = await apiFetch('/api/v1/system/alerts?resolved=false', {
          headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) }
        });
        if (res.ok) {
          const json = await res.json();
          if (json.data?.alerts) {
            setAlerts(json.data.alerts);
          }
        }
      } catch {}
    };
    fetchAlerts();
  }, []);

  const unresolvedAlerts = alerts.filter(a => a.status === 'unresolved');

  return (
    <header className="w-full bg-white border-b border-slate-100 px-4 sm:px-8 py-3 flex items-center justify-between gap-4 sticky top-0 z-30">
      {/* Global Search Bar Button */}
      <div className="flex items-center gap-3 flex-1 max-w-md">
        <button
          onClick={onOpenGlobalSearch}
          className="w-full bg-slate-50/70 hover:bg-slate-100/70 border border-slate-200/70 rounded-xl px-3.5 py-2 flex items-center justify-between text-xs text-slate-400 transition-all cursor-pointer"
        >
          <div className="flex items-center gap-2 overflow-hidden whitespace-nowrap text-ellipsis">
            <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="truncate">Search orders, customers, batches...</span>
          </div>
          <kbd className="hidden sm:inline-block px-1.5 py-0.5 bg-white border border-slate-200 rounded text-[10px] font-mono text-slate-400">
            Ctrl K
          </kbd>
        </button>
      </div>

      {/* Control Tools Right Side */}
      <div className="flex items-center gap-2 md:gap-3 shrink-0">
        {/* Location Selector */}
        <div className="relative hidden md:block">
          <div className="flex items-center gap-1.5 bg-white text-slate-700 px-3 py-1.5 rounded-xl text-xs font-medium border border-slate-200 hover:border-slate-300 transition-colors">
            <MapPin className="w-3.5 h-3.5 text-blue-600" />
            <select
              value={selectedLocation}
              onChange={(e) => onChangeLocation(e.target.value)}
              className="bg-transparent focus:outline-hidden font-medium cursor-pointer text-xs pr-1"
            >
              <option value="All Locations">All Locations</option>
              <option value="Preston Operations Hub">Preston Hub</option>
              <option value="Blackburn Facility Center">Blackburn Plant</option>
              <option value="Bolton Logistics Hub">Bolton Hub</option>
              <option value="Chorley Service Station">Chorley Station</option>
            </select>
          </div>
        </div>

        {/* Date Filter */}
        <div className="hidden md:flex items-center gap-1.5 bg-white text-slate-700 px-3 py-1.5 rounded-xl text-xs font-medium border border-slate-200 hover:border-slate-300 transition-colors">
          <Calendar className="w-3.5 h-3.5 text-blue-600" />
          <select
            value={dateFilter}
            onChange={(e) => onChangeDateFilter(e.target.value)}
            className="bg-transparent focus:outline-hidden font-medium cursor-pointer text-xs"
          >
            <option value="Today">Today</option>
            <option value="Tomorrow">Tomorrow</option>
            <option value="This Week">This Week</option>
            <option value="Custom">Custom Range</option>
          </select>
        </div>

        {/* Notifications Dropdown */}
        <div className="relative">
          <button
            onClick={() => setNotificationsOpen(!notificationsOpen)}
            className="p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-50 relative cursor-pointer transition-colors border border-transparent hover:border-slate-100"
            title="System Alerts"
          >
            <Bell className="w-4 h-4 text-slate-600" />
            {unresolvedAlerts.length > 0 && (
              <span className="absolute 1.5 top-1.5 right-1.5 w-2 h-2 bg-blue-600 rounded-full" />
            )}
          </button>

          {notificationsOpen && (
            <div className="absolute right-0 mt-2 w-72 sm:w-80 bg-white rounded-2xl shadow-xl border border-slate-100 p-4 space-y-3 z-50 animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <span className="text-xs font-bold text-slate-900">Operations Alerts</span>
                <span className="text-[10px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full font-semibold">
                  {unresolvedAlerts.length} Active
                </span>
              </div>

              <div className="space-y-2 max-h-64 overflow-y-auto">
                {unresolvedAlerts.length === 0 ? (
                  <p className="text-xs text-slate-400 py-3 text-center">No active alerts</p>
                ) : (
                  unresolvedAlerts.map((alt) => (
                    <div key={alt.id} className="p-2.5 bg-slate-50 rounded-xl space-y-1 border border-slate-100">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                          {alt.title}
                        </span>
                        <span className="text-[9px] font-medium text-slate-400">{alt.createdAt.slice(11, 16)}</span>
                      </div>
                      <p className="text-[11px] text-slate-600 leading-snug">{alt.message}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Role Badge / Switcher */}
        <div className="relative">
          <button
            onClick={() => setRoleDropdownOpen(!roleDropdownOpen)}
            className="flex items-center gap-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer border border-slate-200 transition-all"
          >
            <Shield className="w-3.5 h-3.5 text-blue-600 shrink-0" />
            <span className="capitalize hidden sm:inline">{currentRole.replace('_', ' ')}</span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          </button>

          {roleDropdownOpen && (
            <div className="absolute right-0 mt-2 w-52 bg-white rounded-2xl shadow-xl border border-slate-100 p-2 z-50 space-y-1 animate-in fade-in zoom-in-95 duration-150">
              <span className="block px-3 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Switch Operational Mode
              </span>

              {(['manager', 'processor', 'admin'] as AdminRole[]).map((r) => (
                <button
                  key={r}
                  onClick={() => {
                    onChangeRole(r);
                    setRoleDropdownOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium cursor-pointer transition-colors ${
                    currentRole === r
                      ? 'bg-blue-50 text-blue-700 font-semibold'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  <span className="capitalize">{r.replace('_', ' ')}</span>
                  {currentRole === r && <Check className="w-3.5 h-3.5 text-blue-600" />}
                </button>
              ))}

              <div className="pt-1 border-t border-slate-100 mt-1">
                <button
                  onClick={onExitAdmin}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium text-slate-500 hover:bg-slate-50 hover:text-slate-700 cursor-pointer transition-colors"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Exit to Public Site</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
