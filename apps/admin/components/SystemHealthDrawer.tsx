'use client';
import { apiFetch } from '@laundelle/api-client';

import React, { useState, useEffect } from 'react';
import {
  Activity, CheckCircle, AlertTriangle, XCircle, RefreshCw,
  X, ShieldCheck, Database, HardDrive, Bell, Clock, WifiOff
} from 'lucide-react';
import { SystemHealthReport, UnifiedAlert } from '@laundelle/types';

interface SystemHealthDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SystemHealthDrawer: React.FC<SystemHealthDrawerProps> = ({ isOpen, onClose }) => {
  const [health, setHealth] = useState<SystemHealthReport | null>(null);
  const [alerts, setAlerts] = useState<UnifiedAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [resolvingId, setResolvingId] = useState<string | null>(null);

  const fetchHealthAndAlerts = async () => {
    setLoading(true);
    try {
      const rawSession = localStorage.getItem('l2u_auth_session');
      const token = rawSession ? JSON.parse(rawSession).token : null;
      const headers = { ...(token ? { Authorization: `Bearer ${token}` } : {}) };

      const [healthRes, alertsRes] = await Promise.all([
        apiFetch('/api/v1/system/health', { headers }),
        apiFetch('/api/v1/system/alerts?resolved=false', { headers })
      ]);

      const healthData = await healthRes.json();
      const alertsData = await alertsRes.json();

      if (healthData.data?.health) setHealth(healthData.data.health);
      if (alertsData.data?.alerts) setAlerts(alertsData.data.alerts);
    } catch (e) {
      console.error('Failed to load system health', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchHealthAndAlerts();
    }
  }, [isOpen]);

  const handleResolveAlert = async (alertId: string) => {
    setResolvingId(alertId);
    try {
      const rawSession = localStorage.getItem('l2u_auth_session');
      const token = rawSession ? JSON.parse(rawSession).token : null;
      await apiFetch('/api/v1/system/alerts', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ alertId })
      });
      await fetchHealthAndAlerts();
    } catch (e) {
      console.error('Failed to resolve alert', e);
    } finally {
      setResolvingId(null);
    }
  };

  if (!isOpen) return null;

  const getProbeIcon = (name: string) => {
    if (name.includes('Database')) return Database;
    if (name.includes('Storage')) return HardDrive;
    if (name.includes('Notification')) return Bell;
    if (name.includes('Maintenance')) return Clock;
    return WifiOff;
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex justify-end">
      <div className="bg-white w-full max-w-lg h-full shadow-2xl flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className={`p-2.5 rounded-2xl ${
                health?.overallStatus === 'HEALTHY'
                  ? 'bg-emerald-100 text-emerald-700'
                  : health?.overallStatus === 'DEGRADED'
                  ? 'bg-amber-100 text-amber-700'
                  : 'bg-rose-100 text-rose-700'
              }`}
            >
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-heading font-extrabold text-[#03045E] text-lg">System Health & Probes</h3>
              <p className="text-xs text-gray-500">Real-time architecture and operational integrity</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={fetchHealthAndAlerts}
              className="p-2 hover:bg-gray-100 rounded-xl text-gray-500 cursor-pointer"
              title="Refresh Probes"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-xl text-gray-500 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {/* Status Banner */}
          <div
            className={`p-4 rounded-2xl border flex items-center justify-between ${
              health?.overallStatus === 'HEALTHY'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                : health?.overallStatus === 'DEGRADED'
                ? 'bg-amber-50 border-amber-200 text-amber-900'
                : 'bg-rose-50 border-rose-200 text-rose-900'
            }`}
          >
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider block">Global Platform Status</span>
              <h4 className="text-base font-heading font-black mt-0.5">
                {health?.overallStatus || 'HEALTHY'}
              </h4>
            </div>
            <div className="text-right">
              <span className="text-xs font-mono font-bold block">{health?.syncBacklogCount || 0} queued syncs</span>
              <span className="text-[10px] text-gray-500">{alerts.length} active alerts</span>
            </div>
          </div>

          {/* Subsystem Probes */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Subsystem Health Probes</h4>
            <div className="grid gap-2">
              {(health?.probes || []).map((probe, idx) => {
                const Icon = getProbeIcon(probe.name);
                return (
                  <div
                    key={idx}
                    className="p-3 bg-slate-50 border border-gray-100 rounded-2xl flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-white rounded-xl text-gray-600 shadow-2xs">
                        <Icon className="w-4 h-4 text-[#0077B6]" />
                      </div>
                      <div>
                        <span className="text-xs font-bold text-gray-900 block">{probe.name}</span>
                        <span className="text-[10px] text-gray-400 font-mono">Latency: {probe.latencyMs}ms</span>
                      </div>
                    </div>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        probe.status === 'UP'
                          ? 'bg-emerald-100 text-emerald-800'
                          : probe.status === 'SLOW'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      {probe.status}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Active Operational Alerts */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Active Unified Alerts ({alerts.length})</h4>
            </div>
            {alerts.length === 0 ? (
              <div className="p-4 bg-gray-50 rounded-2xl text-center text-xs text-gray-400 font-medium">
                No active operational alerts across plants or fleet.
              </div>
            ) : (
              <div className="space-y-2">
                {alerts.map((alert) => (
                  <div
                    key={alert.id}
                    className={`p-3.5 rounded-2xl border flex items-start justify-between gap-3 ${
                      alert.severity === 'CRITICAL'
                        ? 'bg-rose-50/70 border-rose-200'
                        : 'bg-amber-50/70 border-amber-200'
                    }`}
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase ${
                            alert.severity === 'CRITICAL'
                              ? 'bg-rose-600 text-white'
                              : 'bg-amber-500 text-white'
                          }`}
                        >
                          {alert.type}
                        </span>
                        <span className="text-xs font-bold text-gray-900">{alert.title}</span>
                      </div>
                      <p className="text-xs text-gray-600 leading-relaxed mt-1">{alert.message}</p>
                      <span className="text-[10px] text-gray-400 block pt-1">
                        Raised: {new Date(alert.createdAt).toLocaleTimeString()}
                      </span>
                    </div>

                    <button
                      onClick={() => handleResolveAlert(alert.id)}
                      disabled={resolvingId === alert.id}
                      className="px-2.5 py-1 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-lg text-[10px] font-bold shrink-0 cursor-pointer shadow-2xs"
                    >
                      {resolvingId === alert.id ? 'Resolving...' : 'Resolve'}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
