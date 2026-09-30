import React, { useState, useEffect } from 'react';
import {
  Truck,
  Users,
  Search,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Phone,
  Car,
  MapPin,
  ArrowRightLeft,
  X,
  ShieldAlert,
  Clock,
  ExternalLink,
  Lock,
  UserCheck,
  ChevronRight,
  Eye
} from 'lucide-react';
import {
  dbFetchManagerStaff,
  dbFetchManagerOrders,
  dbManagerAssignDriver,
  dbManagerOrderOverride,
  dbManagerBatchReassignOrders,
  dbManagerReassignAllDriverOrders,
  dbManagerUpdateStaff,
  getStoredSession
} from '@laundelle/api-client';
import { ManagerOverrideModal } from './ManagerOverrideModal';

export const ManagerDriversView: React.FC = () => {
  const session = getStoredSession();
  const userRole = (session?.user?.role || 'manager').toLowerCase().trim();
  const isAdmin = userRole === 'admin' || userRole === 'super_admin';

  const [drivers, setDrivers] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [activeFilter, setActiveFilter] = useState('all');

  // Selected driver for detailed inspection modal
  const [inspectDriver, setInspectDriver] = useState<any | null>(null);

  // Modals state
  const [overrideModalOpen, setOverrideModalOpen] = useState(false);
  const [orderForOverride, setOrderForOverride] = useState<any | null>(null);

  const [emergencyModalOpen, setEmergencyModalOpen] = useState(false);
  const [emergencyDriver, setEmergencyDriver] = useState<any | null>(null);
  const [emergencyTargetDriverId, setEmergencyTargetDriverId] = useState<string>('');

  const [editDriverModalOpen, setEditDriverModalOpen] = useState(false);
  const [editingDriver, setEditingDriver] = useState<any | null>(null);
  const [editPhone, setEditPhone] = useState('');
  const [editVehicle, setEditVehicle] = useState('');
  const [editPostcodes, setEditPostcodes] = useState('');
  const [editPassword, setEditPassword] = useState('');

  const [actionLoading, setActionLoading] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  const loadData = async () => {
    setLoading(true);
    const [staffData, ordersData] = await Promise.all([
      dbFetchManagerStaff(),
      dbFetchManagerOrders()
    ]);
    const driversOnly = (staffData || []).filter((s: any) => s.role === 'driver');
    setDrivers(driversOnly);
    setOrders(ordersData || []);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  // Quick toggle driver availability
  const handleToggleAvailability = async (driver: any, nextStatus: 'available' | 'busy' | 'offline') => {
    const res = await dbManagerUpdateStaff(driver._id, { availability: nextStatus });
    if (res.success) {
      showToast('success', `${driver.full_name} is now marked as ${nextStatus.toUpperCase()}`);
      loadData();
      if (inspectDriver && inspectDriver._id === driver._id) {
        setInspectDriver({ ...inspectDriver, availability: nextStatus });
      }
    } else {
      showToast('error', res.error || 'Failed to update availability.');
    }
  };

  // Save driver credentials edit
  const handleSaveDriverEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDriver) return;
    setActionLoading(true);

    const postcodes = editPostcodes.split(',').map(p => p.trim().toUpperCase()).filter(Boolean);

    const payload: any = {
      phone: editPhone,
      vehicle: editVehicle,
      assigned_postcodes: postcodes
    };
    if (editPassword) payload.password = editPassword;

    const res = await dbManagerUpdateStaff(editingDriver._id, payload);
    setActionLoading(false);

    if (res.success) {
      showToast('success', `Driver ${editingDriver.full_name} details updated.`);
      setEditDriverModalOpen(false);
      setEditingDriver(null);
      loadData();
    } else {
      showToast('error', res.error || 'Failed to update driver details.');
    }
  };

  // Emergency batch reassign
  const handleEmergencyReassign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emergencyDriver || !emergencyTargetDriverId) return;
    setActionLoading(true);

    const res = await dbManagerReassignAllDriverOrders(emergencyDriver._id, emergencyTargetDriverId);
    setActionLoading(false);

    if (res.success) {
      showToast('success', `Emergency Re-route complete! ${res.count || 0} orders transferred.`);
      setEmergencyModalOpen(false);

      setEmergencyDriver(null);
      loadData();
    } else {
      showToast('error', res.error || 'Failed to re-assign driver orders.');
    }
  };

  const getCustomerName = (ord: any) => {
    if (ord.customer_name) return ord.customer_name;
    if (ord.customerName) return ord.customerName;
    if (ord.customer && (ord.customer.full_name || ord.customer.name)) {
      return ord.customer.full_name || ord.customer.name;
    }
    if (ord.userName) return ord.userName;
    if (ord.user_name) return ord.user_name;
    return 'Customer';
  };

  // Filtered drivers list
  const filteredDrivers = drivers.filter((d) => {
    const q = searchQuery.toLowerCase().trim();
    const matchesQuery = !q || (
      (d.full_name || '').toLowerCase().includes(q) ||
      (d.email || '').toLowerCase().includes(q) ||
      (d.phone || '').includes(q) ||
      (d.vehicle || '').toLowerCase().includes(q) ||
      (d.assigned_postcodes || []).some((pc: string) => pc.toLowerCase().includes(q))
    );

    const driverStatus = (d.availability || d.status || 'available').toLowerCase();
    const matchesStatus = statusFilter === 'all' || driverStatus === statusFilter.toLowerCase();

    const matchesActive =
      activeFilter === 'all' ||
      (activeFilter === 'active' && d.is_active !== false) ||
      (activeFilter === 'suspended' && d.is_active === false);

    return matchesQuery && matchesStatus && matchesActive;
  });

  // Get orders served by a specific driver
  const getDriverOrders = (driverId: string, driverName?: string) => {
    return orders.filter(
      (o) =>
        String(o.assigned_driver_id || o.driver_id || o.driver?.id) === String(driverId) ||
        (driverName && o.driver?.name?.toLowerCase() === driverName.toLowerCase())
    );
  };

  return (
    <div className="w-full space-y-6 md:space-y-8 p-4 md:p-8 pb-24 md:pb-8">
      {/* Toast */}
      {toast && (
        <div
          className={`fixed top-5 right-5 z-50 flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-xl text-xs font-bold transition-all animate-in fade-in slide-in-from-top-4 ${
            toast.type === 'success' ? 'bg-[#03045E] text-white border border-[#0077B6]' : 'bg-red-600 text-white'
          }`}
        >
          {toast.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-white shrink-0" />
          )}
          <span>{toast.message}</span>
          <button onClick={() => setToast(null)} className="ml-2 hover:opacity-70 cursor-pointer">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="bg-[#0077B6] text-white px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider">
              Fleet Dispatch
            </span>
            <span className="text-xs text-gray-500 font-medium">Logistics & Driver Management</span>
          </div>
          <h1 className="text-xl md:text-3xl font-heading font-extrabold text-[#03045E] mt-1 tracking-tight">
            Delivery Drivers Directory
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">
            View logistics drivers, monitor active status, and inspect orders served by each driver.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={loadData}
            disabled={loading}
            className="p-2.5 bg-white hover:bg-gray-50 border border-gray-200 rounded-2xl text-[#03045E] cursor-pointer flex items-center gap-1.5 shadow-2xs transition-all"
            title="Refresh Fleet"
          >
            <RefreshCw className={`w-4 h-4 text-[#0077B6] ${loading ? 'animate-spin' : ''}`} />
            <span className="text-xs font-bold font-mono hidden sm:inline">Refresh</span>
          </button>
        </div>
      </div>

      {/* Search & Action Bar */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-3 bg-white p-4 rounded-3xl border border-gray-100 shadow-xs">
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto flex-1">
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search driver name, phone, vehicle, postcode..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-[#03045E] focus:outline-hidden"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full sm:w-auto px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold text-gray-700 focus:outline-hidden cursor-pointer"
          >
            <option value="all">All Availability</option>
            <option value="available">Available</option>
            <option value="on_route">On Route / En Route</option>
            <option value="busy">Busy / Dispatched</option>
            <option value="off_duty">Off Duty / Away</option>
          </select>

          <select
            value={activeFilter}
            onChange={(e) => setActiveFilter(e.target.value)}
            className="w-full sm:w-auto px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold text-gray-700 focus:outline-hidden cursor-pointer"
          >
            <option value="all">All Account Statuses</option>
            <option value="active">Active Only</option>
            <option value="suspended">Suspended Only</option>
          </select>

          {(searchQuery || statusFilter !== 'all' || activeFilter !== 'all') && (
            <button
              onClick={() => {
                setSearchQuery('');
                setStatusFilter('all');
                setActiveFilter('all');
              }}
              className="text-xs font-bold text-[#0077B6] hover:text-[#03045E] cursor-pointer whitespace-nowrap"
            >
              Reset
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 text-xs text-gray-500 font-bold self-end md:self-auto">
          <span>Total Drivers:</span>
          <span className="px-3 py-1 bg-[#CAF0F8] text-[#03045E] rounded-full font-extrabold">
            {filteredDrivers.length}
          </span>
        </div>
      </div>

      {/* Drivers List Directory Table */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-xs overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-xs text-gray-500 font-bold space-y-2">
            <RefreshCw className="w-8 h-8 text-[#03045E] animate-spin mx-auto" />
            <p>Loading logistics driver fleet...</p>
          </div>
        ) : filteredDrivers.length === 0 ? (
          <div className="py-16 text-center text-xs text-gray-500 font-bold space-y-2">
            <Truck className="w-10 h-10 text-gray-300 mx-auto" />
            <p>No delivery drivers found matching query.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#f8fafc] text-gray-500 font-bold border-b border-gray-100 uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-4 px-5">Driver Name</th>
                  <th className="py-4 px-5">Contact Phone</th>
                  <th className="py-4 px-5">Vehicle Unit</th>
                  <th className="py-4 px-5">Coverage Postcodes</th>
                  <th className="py-4 px-5">Status</th>
                  <th className="py-4 px-5">Orders Served</th>
                  <th className="py-4 px-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredDrivers.map((driver) => {
                  const driverOrders = getDriverOrders(driver._id, driver.full_name);
                  const status = driver.availability || driver.status || 'available';

                  return (
                    <tr
                      key={driver._id}
                      onClick={() => setInspectDriver(driver)}
                      className="hover:bg-[#CAF0F8]/30 transition-colors cursor-pointer group"
                    >
                      <td className="py-4 px-5 font-bold text-gray-900 flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-[#03045E] text-white flex items-center justify-center font-extrabold text-xs">
                          {driver.full_name?.charAt(0)?.toUpperCase() || 'D'}
                        </div>
                        <div>
                          <span className="block font-extrabold text-gray-900 text-sm">{driver.full_name}</span>
                          <span className="text-[10px] text-gray-400 font-normal">{driver.email || 'Logistics Courier'}</span>
                        </div>
                      </td>
                      <td className="py-4 px-5 font-medium text-gray-700">
                        {driver.phone || 'N/A'}
                      </td>
                      <td className="py-4 px-5 font-bold text-gray-800">
                        <span className="inline-flex items-center gap-1 bg-gray-100 px-2.5 py-1 rounded-lg text-xs">
                          <Car className="w-3.5 h-3.5 text-[#0077B6]" />
                          {driver.vehicle || 'Standard Van'}
                        </span>
                      </td>
                      <td className="py-4 px-5">
                        <div className="flex flex-wrap gap-1 max-w-xs">
                          {(driver.assigned_postcodes || driver.assignedSectors || []).length > 0 ? (
                            (driver.assigned_postcodes || driver.assignedSectors || []).map((pc: string) => (
                              <span key={pc} className="px-2 py-0.5 bg-indigo-50 text-[#03045E] rounded-md font-mono text-[10px] font-bold border border-indigo-100">
                                {pc}
                              </span>
                            ))
                          ) : (
                            <span className="text-gray-400 italic text-[11px]">All Sectors</span>
                          )}
                        </div>
                      </td>
                      <td className="py-4 px-5">
                        <span
                          className={`px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${
                            status === 'available'
                              ? 'bg-emerald-100 text-emerald-800'
                              : status === 'busy'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-gray-200 text-gray-700'
                          }`}
                        >
                          {status}
                        </span>
                      </td>
                      <td className="py-4 px-5 font-extrabold text-[#03045E]">
                        <span className="px-2.5 py-1 bg-[#CAF0F8] text-[#03045E] rounded-lg font-mono text-xs">
                          {driverOrders.length} orders
                        </span>
                      </td>
                      <td className="py-4 px-5 text-right">
                        <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => setInspectDriver(driver)}
                            className="px-3 py-1.5 bg-[#CAF0F8] hover:bg-[#ADE8F4] text-[#03045E] rounded-xl text-xs font-bold transition-all cursor-pointer inline-flex items-center gap-1 group-hover:bg-[#03045E] group-hover:text-white"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>View Orders</span>
                          </button>
                          <button
                            onClick={() => {
                              setEditingDriver(driver);
                              setEditPhone(driver.phone || '');
                              setEditVehicle(driver.vehicle || '');
                              const pc = driver.assigned_postcodes || driver.assignedSectors || [];
                              setEditPostcodes(pc.join(', '));
                              setEditPassword('');
                              setEditDriverModalOpen(true);
                            }}
                            className="p-1.5 hover:bg-gray-100 text-gray-500 rounded-lg transition-colors cursor-pointer"
                            title="Edit Driver Credentials"
                          >
                            <Lock className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Driver Detail & Served Orders Modal */}
      {inspectDriver && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white w-full max-w-4xl rounded-3xl p-6 md:p-8 shadow-2xl space-y-6 relative max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-gray-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-[#03045E] text-white flex items-center justify-center font-extrabold text-lg shadow-md">
                  {inspectDriver.full_name?.charAt(0)?.toUpperCase() || 'D'}
                </div>
                <div>
                  <h2 className="text-xl font-heading font-extrabold text-[#03045E]">
                    {inspectDriver.full_name}
                  </h2>
                  <p className="text-xs text-gray-500 font-medium flex items-center gap-2 mt-0.5">
                    <span>{inspectDriver.email || 'Logistics Driver'}</span>
                    <span>•</span>
                    <span className="font-mono">{inspectDriver.phone || 'No Phone'}</span>
                  </p>
                </div>
              </div>

              <button
                onClick={() => setInspectDriver(null)}
                className="p-2 bg-gray-100 hover:bg-gray-200 rounded-full text-gray-500 hover:text-gray-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Driver Profile Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3.5 bg-gray-50 rounded-2xl border border-gray-200 space-y-1">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Assigned Vehicle</span>
                <p className="font-bold text-gray-900 text-sm flex items-center gap-1.5">
                  <Car className="w-4 h-4 text-[#0077B6]" />
                  {inspectDriver.vehicle || 'Standard Courier Van'}
                </p>
              </div>

              <div className="p-3.5 bg-gray-50 rounded-2xl border border-gray-200 space-y-1">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Status</span>
                <div className="flex items-center justify-between">
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                      inspectDriver.availability === 'available'
                        ? 'bg-emerald-100 text-emerald-800'
                        : inspectDriver.availability === 'busy'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-gray-200 text-gray-700'
                    }`}
                  >
                    {inspectDriver.availability || inspectDriver.status || 'available'}
                  </span>
                  <button
                    onClick={() => {
                      const next = inspectDriver.availability === 'available' ? 'busy' : inspectDriver.availability === 'busy' ? 'offline' : 'available';
                      handleToggleAvailability(inspectDriver, next);
                    }}
                    className="text-[10px] font-bold text-indigo-600 hover:underline cursor-pointer"
                  >
                    Toggle
                  </button>
                </div>
              </div>

              <div className="p-3.5 bg-gray-50 rounded-2xl border border-gray-200 space-y-1">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Coverage Sectors</span>
                <div className="flex flex-wrap gap-1">
                  {(inspectDriver.assigned_postcodes || inspectDriver.assignedSectors || []).length > 0 ? (
                    (inspectDriver.assigned_postcodes || inspectDriver.assignedSectors || []).map((pc: string) => (
                      <span key={pc} className="px-2 py-0.5 bg-white text-indigo-900 border border-indigo-200 rounded-md font-mono text-[10px] font-bold">
                        {pc}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-gray-400 italic">All Sectors</span>
                  )}
                </div>
              </div>
            </div>

            {/* Orders Served Section */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <h3 className="font-heading font-extrabold text-[#03045E] text-base">
                  Orders Served by {inspectDriver.full_name} ({getDriverOrders(inspectDriver._id, inspectDriver.full_name).length})
                </h3>
              </div>

              {getDriverOrders(inspectDriver._id, inspectDriver.full_name).length === 0 ? (
                <div className="p-8 text-center bg-gray-50 rounded-2xl border border-gray-200 text-xs text-gray-500 font-bold space-y-1">
                  <Clock className="w-8 h-8 text-gray-300 mx-auto" />
                  <p>No orders served by this driver yet.</p>
                </div>
              ) : (
                <div className="border border-gray-200 rounded-2xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#f8fafc] text-gray-500 font-bold border-b border-gray-200 uppercase tracking-wider text-[10px]">
                      <tr>
                        <th className="py-3 px-4">Order ID</th>
                        <th className="py-3 px-4">Customer</th>
                        <th className="py-3 px-4">Address</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4">Payment</th>
                        <th className="py-3 px-4 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {getDriverOrders(inspectDriver._id, inspectDriver.full_name).map((ord) => (
                        <tr
                          key={ord.id}
                          onClick={() => {
                            setOrderForOverride(ord);
                            setOverrideModalOpen(true);
                          }}
                          className="hover:bg-indigo-50/50 transition-colors cursor-pointer"
                        >
                          <td className="py-3 px-4 font-mono font-bold text-[#03045E]">{ord.id}</td>
                          <td className="py-3 px-4 font-bold text-gray-900">{getCustomerName(ord)}</td>
                          <td className="py-3 px-4 text-gray-600 truncate max-w-xs">{ord.address}</td>
                          <td className="py-3 px-4">
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#CAF0F8] text-[#03045E]">
                              {ord.statusLabel || ord.status}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                (ord.paymentStatus || ord.payment_status) === 'Paid'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-amber-100 text-amber-800'
                              }`}
                            >
                              {ord.paymentStatus || ord.payment_status || 'Pending'}
                            </span>
                          </td>
                          <td className="py-3 px-4 font-extrabold text-gray-900 text-right">
                            £{ord.total?.toFixed ? ord.total.toFixed(2) : ord.total || '0.00'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2 border-t border-gray-100">
              <button
                onClick={() => setInspectDriver(null)}
                className="px-5 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                Close Driver Inspection
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Driver Credentials Modal */}
      {editDriverModalOpen && editingDriver && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white w-full max-w-md rounded-3xl p-6 shadow-2xl space-y-4 relative animate-in fade-in zoom-in-95 duration-150">
            <button
              onClick={() => setEditDriverModalOpen(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 bg-gray-100 p-2 rounded-full cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div>
              <h3 className="text-lg font-heading font-extrabold text-[#03045E]">
                Edit Driver: {editingDriver.full_name}
              </h3>
              <p className="text-xs text-gray-500">Update phone, vehicle unit, and assigned service postcodes.</p>
            </div>

            <form onSubmit={handleSaveDriverEdit} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-gray-700 mb-1">Contact Phone</label>
                <input
                  type="text"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl font-semibold focus:ring-2 focus:ring-[#03045E] focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Assigned Vehicle</label>
                <input
                  type="text"
                  value={editVehicle}
                  onChange={(e) => setEditVehicle(e.target.value)}
                  placeholder="e.g. Ford Transit VAN-02"
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl font-semibold focus:ring-2 focus:ring-[#03045E] focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Assigned Postcodes (Comma Separated)</label>
                <input
                  type="text"
                  value={editPostcodes}
                  onChange={(e) => setEditPostcodes(e.target.value)}
                  placeholder="e.g. PR1, PR2, M1"
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl font-semibold focus:ring-2 focus:ring-[#03045E] focus:outline-hidden uppercase"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Reset Driver Password (Optional)</label>
                <input
                  type="password"
                  value={editPassword}
                  onChange={(e) => setEditPassword(e.target.value)}
                  placeholder="Leave blank to keep unchanged"
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl font-semibold focus:ring-2 focus:ring-[#03045E] focus:outline-hidden"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditDriverModalOpen(false)}
                  className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="flex-1 py-2.5 bg-[#03045E] hover:bg-[#023E8A] text-white font-bold rounded-xl cursor-pointer"
                >
                  {actionLoading ? 'Saving...' : 'Save Updates'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Override Modal */}
      {overrideModalOpen && orderForOverride && (
        <ManagerOverrideModal
          isOpen={overrideModalOpen}
          order={orderForOverride}
          drivers={drivers}
          onClose={() => {
            setOverrideModalOpen(false);
            setOrderForOverride(null);
          }}
          onSuccess={() => {
            showToast('success', 'Order status updated successfully');
            loadData();
          }}
        />
      )}

    </div>
  );
};
