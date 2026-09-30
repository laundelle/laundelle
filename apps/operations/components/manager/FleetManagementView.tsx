'use client';
import { apiFetch } from '@laundelle/api-client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Truck, Plus, AlertTriangle, CheckCircle, ShieldAlert, Wrench,
  FileText, UserCheck, X, RefreshCw, AlertCircle, Search, RotateCcw
} from 'lucide-react';
import { Vehicle, VehicleDocument } from '@laundelle/types';

interface FleetManagementViewProps {
  plantId: string;
  plantName: string;
  staffDrivers?: Array<{ id: string; name: string; full_name?: string }>;
}

export const FleetManagementView: React.FC<FleetManagementViewProps> = ({
  plantId,
  plantName,
  staffDrivers = []
}) => {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const filteredVehicles = useMemo(() => {
    return vehicles.filter((v) => {
      if (searchQuery) {
        const q = searchQuery.toLowerCase().trim();
        const regMatch = (v.registrationNumber || (v as any).registration || '').toLowerCase().includes(q);
        const makeMatch = (v.make || '').toLowerCase().includes(q);
        const modelMatch = (v.model || '').toLowerCase().includes(q);
        const driver = staffDrivers.find((d) => String(d.id) === String(v.currentDriverId));
        const driverMatch = (driver?.name || driver?.full_name || '').toLowerCase().includes(q);
        if (!regMatch && !makeMatch && !modelMatch && !driverMatch) return false;
      }
      if (statusFilter !== 'all') {
        const hasBlockedDocs = (v.documents || []).some((d) => d.status === 'EXPIRED_BLOCKED');
        if (statusFilter === 'blocked') return hasBlockedDocs;
        if (statusFilter === 'maintenance') return v.status === 'MAINTENANCE';
        if (statusFilter === 'assigned') return Boolean(v.currentDriverId) && v.status !== 'MAINTENANCE' && !hasBlockedDocs;
        if (statusFilter === 'available') return !v.currentDriverId && v.status !== 'MAINTENANCE' && !hasBlockedDocs;
      }
      return true;
    });
  }, [vehicles, searchQuery, statusFilter, staffDrivers]);

  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [assigningVehicle, setAssigningVehicle] = useState<Vehicle | null>(null);
  const [selectedDriverId, setSelectedDriverId] = useState('');
  const [assignMileage, setAssignMileage] = useState('');
  const [assignError, setAssignError] = useState<string | null>(null);
  const [assignLoading, setAssignLoading] = useState(false);

  // Maintenance modal
  const [maintenanceVehicle, setMaintenanceVehicle] = useState<Vehicle | null>(null);
  const [maintType, setMaintType] = useState<'ROUTINE' | 'REPAIR' | 'INSPECTION' | 'TYRES' | 'EMERGENCY'>('ROUTINE');
  const [maintDesc, setMaintDesc] = useState('');
  const [maintCost, setMaintCost] = useState('');
  const [maintLoading, setMaintLoading] = useState(false);

  // New vehicle form state
  const [newReg, setNewReg] = useState('');
  const [newMake, setNewMake] = useState('');
  const [newModel, setNewModel] = useState('');
  const [newYear, setNewYear] = useState('2023');
  const [newType, setNewType] = useState<'VAN' | 'ELECTRIC_VAN' | 'CARGO_BIKE' | 'TRUCK'>('VAN');
  const [newCapacityKg, setNewCapacityKg] = useState('600');
  const [newCapacityBags, setNewCapacityBags] = useState('60');
  const [newInsuranceExpiry, setNewInsuranceExpiry] = useState('');
  const [newMotExpiry, setNewMotExpiry] = useState('');
  const [addLoading, setAddLoading] = useState(false);

  const fetchVehicles = async () => {
    setLoading(true);
    setError(null);
    try {
      const rawSession = localStorage.getItem('l2u_auth_session');
      const token = rawSession ? JSON.parse(rawSession).token : null;
      const res = await apiFetch(`/api/v1/vehicles?plantId=${encodeURIComponent(plantId)}`, {
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) }
      });
      const data = await res.json();
      if (data.success && data.data?.vehicles) {
        setVehicles(data.data.vehicles);
      } else {
        setError(data.error?.message || 'Failed to load fleet vehicles');
      }
    } catch (e: any) {
      setError(e.message || 'Error loading fleet');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVehicles();
  }, [plantId]);

  const handleAssignDriver = async () => {
    if (!assigningVehicle || !selectedDriverId) return;
    setAssignLoading(true);
    setAssignError(null);

    const driver = staffDrivers.find((d) => String(d.id) === selectedDriverId);
    const driverName = driver?.full_name || driver?.name || 'Assigned Courier';

    try {
      const rawSession = localStorage.getItem('l2u_auth_session');
      const token = rawSession ? JSON.parse(rawSession).token : null;
      const res = await apiFetch(`/api/v1/vehicles/${assigningVehicle.id}/assign`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          driverId: selectedDriverId,
          driverName,
          plantId,
          mileageStartKm: assignMileage ? Number(assignMileage) : undefined
        })
      });

      const resData = await res.json();
      if (!res.ok || !resData.success) {
        setAssignError(resData.error?.message || 'Failed to assign driver to vehicle');
      } else {
        setAssigningVehicle(null);
        setSelectedDriverId('');
        setAssignMileage('');
        await fetchVehicles();
      }
    } catch (e: any) {
      setAssignError(e.message || 'Error during assignment');
    } finally {
      setAssignLoading(false);
    }
  };

  const handleUnassignDriver = async (vehicleId: string) => {
    if (!confirm('Are you sure you want to unassign the current driver from this vehicle?')) return;
    try {
      const rawSession = localStorage.getItem('l2u_auth_session');
      const token = rawSession ? JSON.parse(rawSession).token : null;
      await apiFetch(`/api/v1/vehicles/${vehicleId}/assign`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ reason: 'Shift unassignment by manager' })
      });
      await fetchVehicles();
    } catch (e: any) {
      alert(e.message || 'Failed to unassign driver');
    }
  };

  const handleCreateVehicle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newReg || !newMake || !newModel) return;
    setAddLoading(true);

    const docs: Partial<VehicleDocument>[] = [];
    if (newInsuranceExpiry) {
      docs.push({ type: 'INSURANCE', expiryDate: newInsuranceExpiry });
    }
    if (newMotExpiry) {
      docs.push({ type: 'MOT', expiryDate: newMotExpiry });
    }

    try {
      const rawSession = localStorage.getItem('l2u_auth_session');
      const token = rawSession ? JSON.parse(rawSession).token : null;
      const res = await apiFetch('/api/v1/vehicles', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          registrationNumber: newReg.trim().toUpperCase(),
          make: newMake.trim(),
          model: newModel.trim(),
          year: Number(newYear) || 2023,
          type: newType,
          plantId,
          plantName,
          capacityKg: Number(newCapacityKg) || 500,
          capacityBags: Number(newCapacityBags) || 50,
          documents: docs
        })
      });

      const resData = await res.json();
      if (!res.ok || !resData.success) {
        alert(resData.error?.message || 'Failed to create vehicle');
      } else {
        setShowAddModal(false);
        setNewReg('');
        setNewMake('');
        setNewModel('');
        await fetchVehicles();
      }
    } catch (e: any) {
      alert(e.message || 'Error creating vehicle');
    } finally {
      setAddLoading(false);
    }
  };

  const handleAddMaintenance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!maintenanceVehicle || !maintDesc || !maintCost) return;
    setMaintLoading(true);
    try {
      const rawSession = localStorage.getItem('l2u_auth_session');
      const token = rawSession ? JSON.parse(rawSession).token : null;
      const res = await apiFetch(`/api/v1/vehicles/${maintenanceVehicle.id}/maintenance`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          serviceType: maintType,
          description: maintDesc,
          cost: Number(maintCost),
          plantId
        })
      });
      const resData = await res.json();
      if (!res.ok || !resData.success) {
        alert(resData.error?.message || 'Failed to log maintenance');
      } else {
        setMaintenanceVehicle(null);
        setMaintDesc('');
        setMaintCost('');
        await fetchVehicles();
      }
    } catch (e: any) {
      alert(e.message || 'Error logging maintenance');
    } finally {
      setMaintLoading(false);
    }
  };

  const renderDocBadge = (status: VehicleDocument['status'], days: number, type: string) => {
    if (status === 'EXPIRED_BLOCKED') {
      return (
        <span
          key={type}
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-100 text-rose-800 border border-rose-300"
          title={`${type} Expired (${Math.abs(days)}d ago) - Operations Blocked`}
        >
          <ShieldAlert className="w-3 h-3 text-rose-600" />
          {type}: EXPIRED ({days}d)
        </span>
      );
    }
    if (status === 'URGENT') {
      return (
        <span
          key={type}
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300"
          title={`${type} Expires soon in ${days} days`}
        >
          <AlertTriangle className="w-3 h-3 text-amber-600" />
          {type}: {days}d left
        </span>
      );
    }
    if (status === 'WARNING') {
      return (
        <span
          key={type}
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-yellow-50 text-yellow-800 border border-yellow-200"
          title={`${type} Warning: ${days} days left`}
        >
          {type}: {days}d
        </span>
      );
    }
    return (
      <span
        key={type}
        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-50 text-emerald-700"
      >
        <CheckCircle className="w-3 h-3 text-emerald-600" />
        {type}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-heading font-extrabold text-[#03045E]">Facility Vehicle Fleet</h2>
          <p className="text-xs text-gray-500">
            Real-time delivery vans, safety compliance documents, capacity limits, and driver lineage.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchVehicles}
            disabled={loading}
            className="p-2.5 bg-white border border-gray-200 hover:bg-gray-50 text-[#03045E] rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-2xs cursor-pointer"
            title="Refresh Fleet"
          >
            <RefreshCw className={`w-4 h-4 text-[#0077B6] ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh Fleet</span>
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2.5 bg-[#0077B6] hover:bg-[#023E8A] text-white rounded-xl text-xs font-extrabold flex items-center gap-1.5 shadow-sm transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Add Vehicle</span>
          </button>
        </div>
      </div>

      {/* Fleet Summary Counters */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-2xs">
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Total Fleet</span>
          <span className="text-2xl font-black text-[#03045E] mt-1 block">{vehicles.length}</span>
          <span className="text-[10px] text-gray-500">Registered units</span>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-2xs">
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Active Drivers</span>
          <span className="text-2xl font-black text-emerald-600 mt-1 block">
            {vehicles.filter((v) => v.currentDriverId).length}
          </span>
          <span className="text-[10px] text-gray-500">Assigned & en route</span>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-2xs">
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Safety Blocked</span>
          <span className="text-2xl font-black text-rose-600 mt-1 block">
            {
              vehicles.filter((v) =>
                (v.documents || []).some((d) => d.status === 'EXPIRED_BLOCKED')
              ).length
            }
          </span>
          <span className="text-[10px] text-gray-500">Expired documents</span>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-2xs">
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Maintenance</span>
          <span className="text-2xl font-black text-amber-600 mt-1 block">
            {vehicles.filter((v) => v.status === 'MAINTENANCE').length}
          </span>
          <span className="text-[10px] text-gray-500">In workshop</span>
        </div>
      </div>

      {/* Fleet Control Bar: Search & Filters */}
      <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative w-full md:max-w-md">
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by registration, make, model, or assigned driver..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-9 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium focus:outline-hidden focus:border-[#0077B6] focus:bg-white transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-bold text-gray-700 cursor-pointer focus:outline-hidden"
          >
            <option value="all">All Vehicle Statuses</option>
            <option value="assigned">Active & Assigned</option>
            <option value="available">Unassigned / Standby</option>
            <option value="maintenance">In Maintenance</option>
            <option value="blocked">Safety Blocked</option>
          </select>

          {(searchQuery !== '' || statusFilter !== 'all') && (
            <button
              onClick={() => {
                setSearchQuery('');
                setStatusFilter('all');
              }}
              className="px-3 py-2 rounded-xl text-xs font-bold text-[#0077B6] hover:bg-[#CAF0F8]/50 transition-colors flex items-center gap-1.5 cursor-pointer border border-[#ADE8F4]"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
          )}
        </div>
      </div>

      {/* Vehicles Table */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-gray-200 text-gray-500 font-bold uppercase text-[10px]">
              <tr>
                <th className="p-3.5">Registration</th>
                <th className="p-3.5">Make & Model</th>
                <th className="p-3.5">Driver Assignment</th>
                <th className="p-3.5">Capacity</th>
                <th className="p-3.5">Safety & Documents</th>
                <th className="p-3.5">Status</th>
                <th className="p-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-gray-400">
                    Loading facility fleet...
                  </td>
                </tr>
              ) : filteredVehicles.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-gray-400">
                    {searchQuery || statusFilter !== 'all'
                      ? 'No fleet vehicles match your active search or status filter.'
                      : 'No vehicles registered for this plant yet. Click "Add Vehicle" to register your first delivery van.'}
                  </td>
                </tr>
              ) : (
                filteredVehicles.map((v) => {
                  const hasExpiredDocs = (v.documents || []).some((d) => d.status === 'EXPIRED_BLOCKED');
                  return (
                    <tr key={v.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-3.5 font-mono font-black text-[#03045E]">
                        {v.registrationNumber}
                        <span className="block text-[10px] text-gray-400 font-normal font-sans">{v.type}</span>
                      </td>
                      <td className="p-3.5 font-medium text-gray-900">
                        {v.make} {v.model} ({v.year})
                        {v.currentMileageKm !== undefined && (
                          <span className="block text-[10px] text-gray-400">{v.currentMileageKm} km</span>
                        )}
                      </td>
                      <td className="p-3.5">
                        {v.currentDriverId ? (
                          <div>
                            <span className="font-bold text-gray-900 block">{v.currentDriverName || 'Assigned'}</span>
                            <button
                              onClick={() => handleUnassignDriver(v.id)}
                              className="text-[10px] text-rose-600 hover:underline cursor-pointer"
                            >
                              Unassign
                            </button>
                          </div>
                        ) : (
                          <span className="text-gray-400 italic">Unassigned</span>
                        )}
                      </td>
                      <td className="p-3.5">
                        <span className="font-bold text-gray-900">{v.capacityKg} kg</span>
                        <span className="text-gray-400 text-[10px] block">{v.capacityBags} bags max</span>
                      </td>
                      <td className="p-3.5">
                        <div className="flex flex-wrap gap-1 max-w-xs">
                          {(v.documents || []).length > 0 ? (
                            v.documents.map((d) => renderDocBadge(d.status, d.daysUntilExpiry, d.type))
                          ) : (
                            <span className="text-[10px] text-gray-400">No documents on file</span>
                          )}
                        </div>
                      </td>
                      <td className="p-3.5">
                        <span
                          className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                            hasExpiredDocs
                              ? 'bg-rose-100 text-rose-700 font-black'
                              : v.status === 'ACTIVE'
                              ? 'bg-emerald-100 text-emerald-800'
                              : v.status === 'MAINTENANCE'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          {hasExpiredDocs ? 'BLOCKED (DOCS)' : v.status}
                        </span>
                      </td>
                      <td className="p-3.5 text-right space-x-1">
                        <button
                          onClick={() => {
                            setAssigningVehicle(v);
                            setSelectedDriverId(v.currentDriverId || '');
                            setAssignError(null);
                          }}
                          className="px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-[#0077B6] rounded-lg text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer"
                        >
                          <UserCheck className="w-3.5 h-3.5" />
                          <span>Assign</span>
                        </button>
                        <button
                          onClick={() => {
                            setMaintenanceVehicle(v);
                            setMaintDesc('');
                            setMaintCost('');
                          }}
                          className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-gray-700 rounded-lg text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer"
                        >
                          <Wrench className="w-3.5 h-3.5" />
                          <span>Log Service</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Assign Driver Modal */}
      {assigningVehicle && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h3 className="font-heading font-extrabold text-[#03045E]">Assign Driver to Vehicle</h3>
                <p className="text-xs text-gray-500">
                  {assigningVehicle.registrationNumber} — {assigningVehicle.make} {assigningVehicle.model}
                </p>
              </div>
              <button
                onClick={() => setAssigningVehicle(null)}
                className="p-1 hover:bg-gray-100 rounded-full text-gray-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {assignError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2 text-rose-800 text-xs">
                <ShieldAlert className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
                <div className="font-medium">{assignError}</div>
              </div>
            )}

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-gray-700 block mb-1">Select Active Courier Driver</label>
                <select
                  value={selectedDriverId}
                  onChange={(e) => setSelectedDriverId(e.target.value)}
                  className="w-full p-2.5 border rounded-xl bg-gray-50 focus:bg-white text-xs font-bold"
                >
                  <option value="">-- Choose Driver --</option>
                  {staffDrivers.map((d) => (
                    <option key={d.id} value={String(d.id)}>
                      {d.full_name || d.name} (Driver ID: {d.id})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-bold text-gray-700 block mb-1">Starting Odometer Mileage (km)</label>
                <input
                  type="number"
                  placeholder={String(assigningVehicle.currentMileageKm || 0)}
                  value={assignMileage}
                  onChange={(e) => setAssignMileage(e.target.value)}
                  className="w-full p-2.5 border rounded-xl bg-gray-50 focus:bg-white text-xs font-mono"
                />
              </div>

              <div className="p-3 bg-slate-50 rounded-xl text-[11px] text-gray-500 space-y-1">
                <div className="flex justify-between">
                  <span>Vehicle Capacity:</span>
                  <span className="font-bold text-gray-800">
                    {assigningVehicle.capacityKg} kg / {assigningVehicle.capacityBags} bags
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Document Status:</span>
                  <span
                    className={
                      (assigningVehicle.documents || []).some((d) => d.status === 'EXPIRED_BLOCKED')
                        ? 'text-rose-600 font-bold'
                        : 'text-emerald-600 font-bold'
                    }
                  >
                    {(assigningVehicle.documents || []).some((d) => d.status === 'EXPIRED_BLOCKED')
                      ? 'EXPIRED (Assignment will be blocked)'
                      : 'Compliant & Valid'}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t">
              <button
                type="button"
                onClick={() => setAssigningVehicle(null)}
                className="px-4 py-2 border rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAssignDriver}
                disabled={assignLoading || !selectedDriverId}
                className="px-4 py-2 bg-[#0077B6] hover:bg-[#023E8A] text-white rounded-xl text-xs font-bold shadow-sm disabled:opacity-50"
              >
                {assignLoading ? 'Validating...' : 'Confirm Assignment'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Vehicle Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleCreateVehicle}
            className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-heading font-extrabold text-[#03045E]">Register Fleet Vehicle</h3>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="p-1 hover:bg-gray-100 rounded-full text-gray-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="col-span-2 sm:col-span-1">
                <label className="font-bold text-gray-700 block mb-1">Registration Plate *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. LD68 VNZ"
                  value={newReg}
                  onChange={(e) => setNewReg(e.target.value)}
                  className="w-full p-2.5 border rounded-xl bg-gray-50 font-mono font-bold uppercase"
                />
              </div>

              <div className="col-span-2 sm:col-span-1">
                <label className="font-bold text-gray-700 block mb-1">Vehicle Type</label>
                <select
                  value={newType}
                  onChange={(e) => setNewType(e.target.value as any)}
                  className="w-full p-2.5 border rounded-xl bg-gray-50 font-bold"
                >
                  <option value="VAN">Standard Van (Diesel/Petrol)</option>
                  <option value="ELECTRIC_VAN">Electric Van (EV)</option>
                  <option value="CARGO_BIKE">Eco Cargo Bike</option>
                  <option value="TRUCK">Heavy Logistics Truck</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-gray-700 block mb-1">Make *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ford / Mercedes"
                  value={newMake}
                  onChange={(e) => setNewMake(e.target.value)}
                  className="w-full p-2.5 border rounded-xl bg-gray-50"
                />
              </div>

              <div>
                <label className="font-bold text-gray-700 block mb-1">Model *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Transit Custom"
                  value={newModel}
                  onChange={(e) => setNewModel(e.target.value)}
                  className="w-full p-2.5 border rounded-xl bg-gray-50"
                />
              </div>

              <div>
                <label className="font-bold text-gray-700 block mb-1">Payload Weight (kg)</label>
                <input
                  type="number"
                  value={newCapacityKg}
                  onChange={(e) => setNewCapacityKg(e.target.value)}
                  className="w-full p-2.5 border rounded-xl bg-gray-50 font-mono font-bold"
                />
              </div>

              <div>
                <label className="font-bold text-gray-700 block mb-1">Max Laundry Bags</label>
                <input
                  type="number"
                  value={newCapacityBags}
                  onChange={(e) => setNewCapacityBags(e.target.value)}
                  className="w-full p-2.5 border rounded-xl bg-gray-50 font-mono font-bold"
                />
              </div>

              <div>
                <label className="font-bold text-gray-700 block mb-1">Insurance Expiry</label>
                <input
                  type="date"
                  value={newInsuranceExpiry}
                  onChange={(e) => setNewInsuranceExpiry(e.target.value)}
                  className="w-full p-2.5 border rounded-xl bg-gray-50"
                />
              </div>

              <div>
                <label className="font-bold text-gray-700 block mb-1">MOT / Inspection Expiry</label>
                <input
                  type="date"
                  value={newMotExpiry}
                  onChange={(e) => setNewMotExpiry(e.target.value)}
                  className="w-full p-2.5 border rounded-xl bg-gray-50"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 border rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={addLoading}
                className="px-4 py-2 bg-[#0077B6] hover:bg-[#023E8A] text-white rounded-xl text-xs font-bold shadow-sm disabled:opacity-50"
              >
                {addLoading ? 'Registering...' : 'Register Vehicle'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Log Maintenance Modal */}
      {maintenanceVehicle && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleAddMaintenance}
            className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h3 className="font-heading font-extrabold text-[#03045E]">Log Vehicle Service</h3>
                <p className="text-xs text-gray-500">{maintenanceVehicle.registrationNumber}</p>
              </div>
              <button
                type="button"
                onClick={() => setMaintenanceVehicle(null)}
                className="p-1 hover:bg-gray-100 rounded-full text-gray-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-gray-700 block mb-1">Service Type</label>
                <select
                  value={maintType}
                  onChange={(e) => setMaintType(e.target.value as any)}
                  className="w-full p-2.5 border rounded-xl bg-gray-50 font-bold"
                >
                  <option value="ROUTINE">Routine Service & Oil Change</option>
                  <option value="REPAIR">Mechanical Repair</option>
                  <option value="INSPECTION">Safety Inspection / MOT</option>
                  <option value="TYRES">Tyres & Brakes</option>
                  <option value="EMERGENCY">Emergency Roadside Repair</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-gray-700 block mb-1">Work Description *</label>
                <textarea
                  required
                  rows={2}
                  placeholder="e.g. Replaced brake pads and oil filter"
                  value={maintDesc}
                  onChange={(e) => setMaintDesc(e.target.value)}
                  className="w-full p-2.5 border rounded-xl bg-gray-50"
                />
              </div>

              <div>
                <label className="font-bold text-gray-700 block mb-1">Cost (£) *</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="150.00"
                  value={maintCost}
                  onChange={(e) => setMaintCost(e.target.value)}
                  className="w-full p-2.5 border rounded-xl bg-gray-50 font-mono font-bold"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t">
              <button
                type="button"
                onClick={() => setMaintenanceVehicle(null)}
                className="px-4 py-2 border rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={maintLoading}
                className="px-4 py-2 bg-[#03045E] hover:bg-[#023E8A] text-white rounded-xl text-xs font-bold shadow-sm disabled:opacity-50"
              >
                {maintLoading ? 'Logging...' : 'Save Service Record'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
