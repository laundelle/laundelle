import React, { useState, useEffect } from 'react';
import { Search, MapPin, Calendar, Bell, Shield, ArrowLeft, ChevronDown, Check, AlertTriangle } from 'lucide-react';
import { AdminRole, SystemAlert } from '@laundelle/types';
import { apiFetch, dbFetchPlants } from '@laundelle/api-client';

interface AdminTopbarProps {
  currentRole: AdminRole;
  onChangeRole: (role: AdminRole) => void;
  selectedLocation: string;
  onChangeLocation: (loc: string) => void;
  dateFilter: string;
  onChangeDateFilter: (df: string) => void;
  customStartDate?: string;
  onChangeCustomStartDate?: (date: string) => void;
  customEndDate?: string;
  onChangeCustomEndDate?: (date: string) => void;
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
  customStartDate,
  onChangeCustomStartDate,
  customEndDate,
  onChangeCustomEndDate,
  onOpenGlobalSearch,
  onExitAdmin,
}) => {
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [roleDropdownOpen, setRoleDropdownOpen] = useState(false);
  const [alerts, setAlerts] = useState<SystemAlert[]>([]);
  const [plants, setPlants] = useState<any[]>([]);

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
      } catch { }
    };

    const fetchAllPlants = async () => {
      try {
        const data = await dbFetchPlants();
        const safe = Array.isArray(data) ? data : ((data as any)?.plants || []);
        setPlants(safe);
      } catch { }
    };

    fetchAlerts();
    fetchAllPlants();

    window.addEventListener('l2u_plants_changed', fetchAllPlants);
    return () => {
      window.removeEventListener('l2u_plants_changed', fetchAllPlants);
    };
  }, []);

  const unresolvedAlerts = alerts.filter(a => a.status === 'unresolved');

  return (
    <header className="w-full bg-white border-b border-slate-100 px-4 sm:px-8 py-3 flex items-center justify-between gap-4 sticky top-0 z-30">
      {/* Top Left Section: Plant Location Dropdown + Global Search Bar */}
      <div className="flex items-center gap-3 flex-1 max-w-xl">
        {/* Plant Location Selector (Top Left) */}
        <div className="relative shrink-0">
          <div className="flex items-center gap-1.5 bg-slate-50/90 hover:bg-slate-100 text-slate-800 px-3 py-2 rounded-xl text-xs font-bold border border-slate-200/90 hover:border-slate-300 transition-colors shadow-2xs">
            <MapPin className="w-3.5 h-3.5 text-blue-600 shrink-0" />
            <select
              value={selectedLocation}
              onChange={(e) => onChangeLocation(e.target.value)}
              className="bg-transparent focus:outline-hidden font-bold cursor-pointer text-xs pr-1 text-slate-800"
              title="Select plant location"
            >
              <option value="All Locations">All Locations</option>
              {plants.map((plant: any) => (
                <option key={plant._id || plant.id} value={plant.name}>
                  {plant.name} {plant.code ? `(${plant.code})` : ''}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Global Search Bar Button */}
        <div className="flex-1 min-w-0">
          <button
            onClick={onOpenGlobalSearch}
            className="w-full bg-slate-50/70 hover:bg-slate-100/70 border border-slate-200/70 rounded-xl px-3.5 py-2 flex items-center justify-between text-xs text-slate-400 transition-all cursor-pointer"
          >
            <div className="flex items-center gap-2 overflow-hidden whitespace-nowrap text-ellipsis">
              <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span className="truncate">Search orders, customers, staff, audit...</span>
            </div>
            <kbd className="hidden sm:inline-block px-1.5 py-0.5 bg-white border border-slate-200 rounded text-[10px] font-mono text-slate-400">
              Ctrl K
            </kbd>
          </button>
        </div>
      </div>

      {/* Control Tools Right Side: Date Filter + Alerts */}
      <div className="flex items-center gap-2 md:gap-3 shrink-0">
        {/* Real-Time Date Range Filter */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 bg-white text-slate-700 px-3 py-1.5 rounded-xl text-xs font-semibold border border-slate-200 hover:border-slate-300 transition-colors shadow-2xs">
            <Calendar className="w-3.5 h-3.5 text-blue-600 shrink-0" />
            <select
              value={dateFilter}
              onChange={(e) => onChangeDateFilter(e.target.value)}
              className="bg-transparent focus:outline-hidden font-semibold cursor-pointer text-xs pr-1"
            >
              <option value="Today">Today</option>
              <option value="Yesterday">Yesterday</option>
              <option value="This Week">This Week</option>
              <option value="Custom Range">Custom Range</option>
            </select>
          </div>

          {(dateFilter === 'Custom' || dateFilter === 'Custom Range') && (
            <div className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1 rounded-xl border border-slate-200 text-xs shadow-2xs animate-in fade-in duration-150">
              <input
                type="date"
                value={customStartDate || ''}
                onChange={(e) => onChangeCustomStartDate?.(e.target.value)}
                className="bg-transparent text-xs text-slate-700 font-medium focus:outline-hidden cursor-pointer"
                title="Start Date"
              />
              <span className="text-slate-400 font-bold text-[10px]">to</span>
              <input
                type="date"
                value={customEndDate || ''}
                onChange={(e) => onChangeCustomEndDate?.(e.target.value)}
                className="bg-transparent text-xs text-slate-700 font-medium focus:outline-hidden cursor-pointer"
                title="End Date"
              />
            </div>
          )}
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
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-blue-600 rounded-full" />
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
      </div>
    </header>
  );
};

