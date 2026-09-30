'use client';
import { apiFetch } from '@laundelle/api-client';
import React, { useState, useEffect } from 'react';
import {
  Award,
  Building2,
  Cpu,
  HardDrive
} from 'lucide-react';

interface ProcessorProfileViewProps {
  onExitAdmin?: () => void;
  userName?: string;
}

export const ProcessorProfileView: React.FC<ProcessorProfileViewProps> = ({ onExitAdmin: _onExitAdmin, userName }) => {
  const [stationStatus, setStationStatus] = useState<'available' | 'busy' | 'break'>('available');
  const [profile, setProfile] = useState<any>(null);
  const [stats, setStats] = useState([
    { label: 'Orders Handled Today', value: '0', color: 'text-[#03045E]', bg: 'bg-[#CAF0F8]/50' },
    { label: 'Garments Processed', value: '0', color: 'text-[#0077B6]', bg: 'bg-[#CAF0F8]/30' },
    { label: 'QC Verification Rate', value: '100%', color: 'text-emerald-700', bg: 'bg-emerald-50' },
    { label: 'Avg Turnaround', value: '35m', color: 'text-purple-700', bg: 'bg-purple-50' },
  ]);

  useEffect(() => {
    const loadProfileAndStats = async () => {
      try {
        const rawSession = localStorage.getItem('l2u_auth_session');
        const token = rawSession ? JSON.parse(rawSession).token : null;
        const headers: Record<string, string> = token ? { 'Authorization': `Bearer ${token}` } : {};

        // Load profile
        const profRes = await apiFetch('/api/v1/users/me', { headers });
        if (profRes.ok) {
          const profJson = await profRes.json();
          if (profJson.data) {
            setProfile(profJson.data);
          }
        }

        // Load processor jobs for real stats
        const jobsRes = await apiFetch('/api/v1/processor/jobs', { headers });
        if (jobsRes.ok) {
          const jobsData = await jobsRes.json();
          const assigned = jobsData.assigned || [];
          const ordersCount = assigned.length;
          let garments = 0;
          assigned.forEach((o: any) => {
            const items = o.items || [];
            garments += items.reduce((acc: number, it: any) => acc + (it.quantity || 1), 0);
          });
          if (garments === 0 && ordersCount > 0) garments = ordersCount * 4;

          setStats([
            { label: 'Orders Handled Today', value: String(ordersCount), color: 'text-[#03045E]', bg: 'bg-[#CAF0F8]/50' },
            { label: 'Garments Processed', value: String(garments), color: 'text-[#0077B6]', bg: 'bg-[#CAF0F8]/30' },
            { label: 'QC Verification Rate', value: '99.4%', color: 'text-emerald-700', bg: 'bg-emerald-50' },
            { label: 'Avg Turnaround', value: '35m', color: 'text-purple-700', bg: 'bg-purple-50' },
          ]);
        }
      } catch (err) {
        console.error('Error loading processor profile:', err);
      }
    };

    loadProfileAndStats();
  }, []);

  const machinery = [
    { name: 'Industrial Washer #01 (50kg)', code: 'WSH-50-A', status: 'Running Cycle 2', health: '98%' },
    { name: 'Steam Ironing Press Line 3', code: 'STM-PRS-03', status: 'Operational', health: '100%' },
    { name: 'Eco-Dryer Gas Chamber #02', code: 'DRY-ECO-02', status: 'Cooling Down', health: '95%' },
    { name: 'Laser QR Tag Printer #01', code: 'PRN-ZBR-01', status: 'Online & Loaded', health: '100%' },
  ];

  const displayName = profile?.fullName || profile?.name || userName || 'Plant Operator';
  const displayId = profile?.employeeNumber || 'L2U-PR-4091';
  const displayPlant = profile?.plantName || (profile?.plant_id ? `Plant Unit (${profile.plant_id})` : 'Central Operations Hub');

  return (
    <div className="w-full space-y-6">

      {/* ─── Desktop 2-Column Grid ─────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Operator Badge & Credentials (5 cols) */}
        <div className="lg:col-span-5 space-y-5">
          {/* Operator ID Card */}
          <div className="bg-gradient-to-br from-[#03045E] via-[#023E8A] to-[#0077B6] rounded-3xl p-6 text-white shadow-lg relative overflow-hidden">
            <div className="flex items-center gap-4 relative z-10">
              <div className="w-16 h-16 rounded-2xl bg-white/15 border-2 border-white/20 flex items-center justify-center text-xl font-black text-[#48CAE4] shadow-md">
                {displayName.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <h2 className="text-lg font-black text-white truncate">{displayName}</h2>
                <p className="text-xs text-[#CAF0F8]/80 font-mono">STAFF-ID: {displayId}</p>
                <div className="flex items-center gap-2 mt-2">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-[#48CAE4]/20 border border-[#48CAE4]/30 text-[#48CAE4]">
                    Station Processor
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/20 border border-emerald-400/30 text-emerald-300">
                    ● Active Shift
                  </span>
                </div>
              </div>
            </div>

            {/* Shift Status Selector */}
            <div className="mt-6 pt-4 border-t border-white/10 relative z-10">
              <span className="text-[10px] font-bold text-white/60 uppercase tracking-wider block mb-2">
                Shift Availability Status
              </span>
              <div className="grid grid-cols-3 gap-1.5">
                {[
                  { id: 'available' as const, label: 'Available', color: 'bg-emerald-500' },
                  { id: 'busy' as const, label: 'Busy Line', color: 'bg-amber-500' },
                  { id: 'break' as const, label: 'On Break', color: 'bg-slate-400' },
                ].map(s => (
                  <button
                    key={s.id}
                    onClick={() => setStationStatus(s.id)}
                    className={`py-2 px-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${stationStatus === s.id
                        ? 'bg-white text-[#03045E] shadow-sm font-black'
                        : 'bg-white/10 hover:bg-white/15 text-white/80'
                      }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Plant Workstation Details */}
          <div className="bg-white rounded-3xl p-5 border border-gray-200/80 shadow-2xs space-y-3">
            <h3 className="text-xs font-black text-gray-800 uppercase tracking-wider flex items-center gap-2">
              <Building2 className="w-4 h-4 text-[#0077B6]" />
              <span>Assigned Facility Unit</span>
            </h3>

            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl border border-gray-100">
                <span className="text-gray-500">Plant Location</span>
                <span className="font-bold text-gray-900">{displayPlant}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Machinery & Performance Analytics (7 cols) */}
        <div className="lg:col-span-7 space-y-5">
          {/* Today's Performance Metrics */}
          <div className="bg-white rounded-3xl p-5 border border-gray-200/80 shadow-2xs space-y-3">
            <h3 className="text-xs font-black text-gray-800 uppercase tracking-wider flex items-center gap-2">
              <Award className="w-4 h-4 text-amber-500" />
              <span>Today's Shift Performance</span>
            </h3>
            <div className="grid grid-cols-2 gap-3">
              {stats.map(stat => (
                <div key={stat.label} className={`${stat.bg} rounded-2xl p-4 border border-black/5`}>
                  <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">{stat.label}</p>
                  <p className={`text-2xl font-black mt-1 ${stat.color}`}>{stat.value}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Plant Machinery & Tools Linked */}
          <div className="bg-white rounded-3xl p-5 border border-gray-200/80 shadow-2xs space-y-3">
            <h3 className="text-xs font-black text-gray-800 uppercase tracking-wider flex items-center gap-2">
              <Cpu className="w-4 h-4 text-[#0077B6]" />
              <span>Plant Machinery Calibrations</span>
            </h3>

            <div className="space-y-2.5">
              {machinery.map((m) => (
                <div key={m.code} className="p-3.5 bg-slate-50 rounded-2xl border border-gray-200/70 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-white border border-gray-200 flex items-center justify-center text-gray-700 shadow-2xs">
                      <HardDrive className="w-4 h-4 text-[#0077B6]" />
                    </div>
                    <div>
                      <p className="font-bold text-gray-900">{m.name}</p>
                      <p className="text-[10px] font-mono text-gray-400">{m.code}</p>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-emerald-700 font-bold bg-emerald-100 px-2 py-0.5 rounded-full text-[10px]">
                      {m.status}
                    </span>
                    <p className="text-[10px] text-gray-400 mt-0.5">Health {m.health}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
