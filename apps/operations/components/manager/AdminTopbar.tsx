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
    <header className="w-full bg-white border-b border-gray-200 px-4 sm:px-8 py-3.5 flex items-center justify-between gap-4 sticky top-0 z-30 shadow-xs">
      {/* Global Search Bar Button */}
      <div className="flex items-center gap-3 flex-1 max-w-xl">
        <button
          onClick={onOpenGlobalSearch}
          className="w-full bg-gray-50 hover:bg-gray-100/80 border border-gray-200 rounded-2xl px-4 py-2.5 flex items-center justify-between text-xs text-gray-500 transition-all cursor-pointer shadow-2xs"
        >
          <div className="flex items-center gap-2 overflow-hidden whitespace-nowrap text-ellipsis">
            <Search className="w-4 h-4 text-[#0077B6] shrink-0" />
            <span className="truncate">Search Order #, Customer, Bag...</span>
          </div>
          <kbd className="hidden sm:inline-block px-2 py-0.5 bg-white border border-gray-200 rounded-md text-[10px] font-mono text-gray-400">
            Ctrl + K
          </kbd>
        </button>
      </div>

      {/* Control Tools Right Side */}
      <div className="flex items-center gap-1.5 md:gap-3 shrink-0">
        {/* Location Selector */}
        <div className="relative hidden md:block">
          <div className="flex items-center gap-1.5 bg-[#CAF0F8]/50 text-[#03045E] px-3 py-1.5 rounded-xl text-xs font-bold border border-[#ADE8F4]">
            <MapPin className="w-3.5 h-3.5 text-[#0077B6]" />
            <select
              value={selectedLocation}
              onChange={(e) => onChangeLocation(e.target.value)}
              className="bg-transparent focus:outline-hidden font-bold cursor-pointer text-xs pr-2"
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
        <div className="hidden md:flex items-center gap-1.5 bg-gray-100 text-gray-700 px-3 py-1.5 rounded-xl text-xs font-semibold">
          <Calendar className="w-3.5 h-3.5 text-[#0077B6]" />
          <select
            value={dateFilter}
            onChange={(e) => onChangeDateFilter(e.target.value)}
            className="bg-transparent focus:outline-hidden font-semibold cursor-pointer text-xs"
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
            className="p-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 relative cursor-pointer transition-colors"
            title="System Alerts"
          >
            <Bell className="w-4 h-4 text-[#03045E]" />
            {unresolvedAlerts.length > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white rounded-full text-[10px] font-bold flex items-center justify-center animate-pulse">
                {unresolvedAlerts.length}
              </span>
            )}
          </button>

          {notificationsOpen && (
            <div className="absolute right-0 mt-2 w-72 sm:w-80 bg-white rounded-2xl shadow-xl border border-gray-200 p-4 space-y-3 z-50 animate-in fade-in zoom-in duration-150">
              <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                <span className="text-xs font-bold text-[#03045E]">Operations Alerts</span>
                <span className="text-[10px] bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-bold">
                  {unresolvedAlerts.length} Active
                </span>
              </div>

              <div className="space-y-2 max-h-64 overflow-y-auto">
                {unresolvedAlerts.map((alt) => (
                  <div key={alt.id} className="p-2.5 bg-red-50/70 border border-red-100 rounded-xl space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-red-900 flex items-center gap-1">
                        <AlertTriangle className="w-3.5 h-3.5 text-red-600" />
                        {alt.title}
                      </span>
                      <span className="text-[9px] font-semibold text-red-600">{alt.createdAt.slice(11, 16)}</span>
                    </div>
                    <p className="text-[11px] text-red-800 leading-snug">{alt.message}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Role Switcher */}
        <div className="relative">
          <button
            onClick={() => setRoleDropdownOpen(!roleDropdownOpen)}
            className="flex items-center gap-1.5 bg-[#03045E] text-white px-2.5 py-1.5 md:px-3.5 rounded-xl text-xs font-bold cursor-pointer hover:bg-[#023E8A] transition-all"
          >
            <Shield className="w-3.5 h-3.5 text-[#48CAE4] shrink-0" />
            <span className="capitalize hidden sm:inline">{currentRole.replace('_', ' ')}</span>
            <ChevronDown className="w-3.5 h-3.5 opacity-70 shrink-0" />
          </button>

          {roleDropdownOpen && (
            <div className="absolute right-0 mt-2 w-52 bg-white rounded-2xl shadow-xl border border-gray-200 p-2 z-50 space-y-1 animate-in fade-in zoom-in duration-150">
              <span className="block px-3 py-1 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                Switch Portal Role
              </span>
              {[
                { role: 'super_admin', label: 'Super Admin' },
                { role: 'admin', label: 'Admin / Ops' },
                { role: 'manager', label: 'Plant Manager' },
                { role: 'driver', label: 'Driver Portal (Mobile)' },
                { role: 'processor', label: 'Processor Station' },
              ].map((item) => (
                <button
                  key={item.role}
                  onClick={() => {
                    onChangeRole(item.role as AdminRole);
                    setRoleDropdownOpen(false);
                  }}
                  className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold cursor-pointer flex items-center justify-between transition-colors ${
                    currentRole === item.role ? 'bg-[#CAF0F8] text-[#03045E]' : 'hover:bg-gray-100 text-gray-700'
                  }`}
                >
                  <span>{item.label}</span>
                  {currentRole === item.role && <Check className="w-3.5 h-3.5 text-[#0077B6]" />}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Exit Admin Portal -> Customer Website */}
        <button
          onClick={onExitAdmin}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
          title="Back to Customer Portal"
        >
          <ArrowLeft className="w-3.5 h-3.5 text-[#0077B6]" />
          <span className="hidden sm:inline">Customer Site</span>
        </button>
      </div>
    </header>
  );
};
