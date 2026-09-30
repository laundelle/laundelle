import React, { useState, useEffect } from 'react';
import {
  Users,
  Truck,
  Package,
  Search,
  RefreshCw,
  Edit,
  Mail,
  Phone,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  X,
  Lock,
  Plus,
  Car,
  MapPin
} from 'lucide-react';
import { dbFetchManagerStaff, dbManagerUpdateStaff, dbManagerCreateStaff } from '@laundelle/api-client';

interface StaffMember {
  _id: string;
  id?: string;
  publicId?: string;
  staffId?: string;
  full_name: string;
  email: string;
  phone?: string;
  role: 'driver' | 'processor';
  is_active: boolean;
  availability?: 'available' | 'busy' | 'offline';
  status?: string;
  vehicle?: string;
  assigned_postcodes?: string[];
  assignedSectors?: string[];
  plant_id?: string;
  manager_id?: string;
  created_at?: string;
}

export const ManagerStaffView: React.FC = () => {
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'driver' | 'processor'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'suspended'>('all');

  // Edit Modal State
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editIsActive, setEditIsActive] = useState(true);
  const [editAvailability, setEditAvailability] = useState<'available' | 'busy' | 'offline'>('available');
  const [editVehicle, setEditVehicle] = useState('');
  const [editPostcodes, setEditPostcodes] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [saving, setSaving] = useState(false);

  // Add Staff Modal State
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newVehicle, setNewVehicle] = useState('');
  const [newRole, setNewRole] = useState<'driver' | 'processor'>('driver');
  const [adding, setAdding] = useState(false);

  // Notification / Toast
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const loadStaff = async () => {
    setLoading(true);
    const data = await dbFetchManagerStaff();
    setStaffList(data);
    setLoading(false);
  };

  useEffect(() => {
    loadStaff();
  }, []);

  const showNotification = (type: 'success' | 'error', message: string) => {
    setFeedback({ type, message });
    setTimeout(() => {
      setFeedback(null);
    }, 4000);
  };

  // Open Edit Modal
  const handleOpenEdit = (staff: StaffMember) => {
    setEditingStaff(staff);
    setEditName(staff.full_name || '');
    setEditEmail(staff.email || '');
    setEditPhone(staff.phone || '');
    setEditIsActive(staff.is_active !== false);
    setEditAvailability(staff.availability || (staff.status as any) || 'available');
    setEditVehicle(staff.vehicle || '');
    const postcodes = staff.assigned_postcodes || staff.assignedSectors || [];
    setEditPostcodes(postcodes.join(', '));
    setEditPassword('');
    setEditModalOpen(true);
  };

  // Submit Edit
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStaff) return;
    setSaving(true);

    const payload: any = {
      full_name: editName.trim(),
      email: editEmail.trim(),
      phone: editPhone.trim(),
      is_active: editIsActive,
      availability: editAvailability,
      // NOTE: assigned_postcodes not sent — managed via plant service area
    };

    if (editingStaff.role === 'driver') {
      payload.vehicle = editVehicle.trim();
    }

    if (editPassword.trim().length > 0) {
      if (editPassword.trim().length < 6) {
        showNotification('error', 'Password must be at least 6 characters.');
        setSaving(false);
        return;
      }
      payload.password = editPassword.trim();
    }

    const result = await dbManagerUpdateStaff(editingStaff._id, payload);
    setSaving(false);

    if (result.success) {
      showNotification('success', `Details for ${editName} updated successfully!`);
      setEditModalOpen(false);
      setEditingStaff(null);
      loadStaff();
    } else {
      showNotification('error', result.error || 'Failed to update staff member.');
    }
  };

  // Submit Add Staff (Driver or Processor)
  const handleAddStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newEmail.trim() || !newPassword.trim()) {
      showNotification('error', 'Name, email, and password are required.');
      return;
    }
    if (newPassword.trim().length < 6) {
      showNotification('error', 'Password must be at least 6 characters.');
      return;
    }

    setAdding(true);

    const payload: any = {
      full_name: newName.trim(),
      email: newEmail.trim(),
      phone: newPhone.trim(),
      password: newPassword.trim(),
      role: newRole,
      is_active: true,
      availability: 'available',
      // Postcodes are auto-inherited from manager's plant — not sent from UI
    };

    if (newRole === 'driver') {
      payload.vehicle = newVehicle.trim() || 'Logistics Van';
    }


    const result = await dbManagerCreateStaff(payload);
    setAdding(false);

    if (result.success) {
      showNotification('success', `${newRole === 'driver' ? 'Driver' : 'Processor'} ${newName} added and assigned to your facility!`);
      setAddModalOpen(false);
      setNewName('');
      setNewEmail('');
      setNewPhone('');
      setNewPassword('');
      setNewVehicle('');
      setNewRole('driver');
      loadStaff();
    } else {
      showNotification('error', result.error || 'Failed to add staff member.');
    }
  };

  // Filtered staff
  const filteredStaff = staffList.filter(s => {
    const matchesRole = roleFilter === 'all' || s.role === roleFilter;
    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'active' && s.is_active !== false) ||
      (statusFilter === 'suspended' && s.is_active === false);

    const query = searchQuery.toLowerCase().trim();
    const matchesQuery =
      !query ||
      s.full_name?.toLowerCase().includes(query) ||
      s.email?.toLowerCase().includes(query) ||
      s.phone?.includes(query) ||
      s.vehicle?.toLowerCase().includes(query) ||
      s._id?.toLowerCase().includes(query);

    return matchesRole && matchesStatus && matchesQuery;
  });

  const driverCount = staffList.filter(s => s.role === 'driver').length;
  const processorCount = staffList.filter(s => s.role === 'processor').length;
  const activeCount = staffList.filter(s => s.is_active !== false).length;

  return (
    <div className="w-full space-y-6 md:space-y-8 p-4 md:p-8 pb-24 md:pb-8">
      {/* Toast Feedback */}
      {feedback && (
        <div
          className={`fixed top-5 right-5 z-50 flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-xl text-xs font-bold transition-all animate-in fade-in slide-in-from-top-4 ${
            feedback.type === 'success'
              ? 'bg-[#03045E] text-white border border-[#0077B6]'
              : 'bg-red-600 text-white'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-white shrink-0" />
          )}
          <span>{feedback.message}</span>
          <button
            onClick={() => setFeedback(null)}
            className="ml-2 hover:opacity-70 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="bg-[#0077B6] text-white px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider">
              Assigned Personnel
            </span>
            <span className="text-xs text-gray-500 font-medium">Facility Staff Only</span>
          </div>
          <h1 className="text-xl md:text-3xl font-heading font-extrabold text-[#03045E] mt-1 tracking-tight">
            Manage Assigned Staff
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">
            View, monitor, and update details for drivers and station processors assigned to your facility.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={loadStaff}
            disabled={loading}
            className="p-2.5 bg-white hover:bg-gray-50 border border-gray-200 rounded-2xl text-[#03045E] cursor-pointer flex items-center gap-1.5 shadow-2xs transition-all"
            title="Sync Staff List"
          >
            <RefreshCw className={`w-4 h-4 text-[#0077B6] ${loading ? 'animate-spin' : ''}`} />
            <span className="text-xs font-bold font-mono hidden sm:inline">Refresh</span>
          </button>

          <button
            onClick={() => setAddModalOpen(true)}
            className="px-4 py-2.5 bg-[#023E8A] hover:bg-[#03045E] text-white rounded-2xl text-xs font-bold flex items-center gap-2 shadow-md transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Staff</span>
          </button>
        </div>
      </div>

      {/* KPI Overview Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-5">
        <div className="bg-white rounded-2xl md:rounded-3xl p-4 md:p-5 border border-gray-100 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Total Staff</span>
            <h3 className="text-2xl md:text-3xl font-heading font-extrabold text-[#03045E] mt-1">{staffList.length}</h3>
            <span className="text-[10px] text-gray-400 font-medium">Assigned to your plant</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-[#EBF7FF] flex items-center justify-center text-[#0077B6]">
            <Users className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white rounded-2xl md:rounded-3xl p-4 md:p-5 border border-gray-100 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Drivers</span>
            <h3 className="text-2xl md:text-3xl font-heading font-extrabold text-[#0077B6] mt-1">{driverCount}</h3>
            <span className="text-[10px] text-gray-400 font-medium">Logistics & Courier</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-[#CAF0F8]/50 flex items-center justify-center text-[#0077B6]">
            <Truck className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white rounded-2xl md:rounded-3xl p-4 md:p-5 border border-gray-100 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Processors</span>
            <h3 className="text-2xl md:text-3xl font-heading font-extrabold text-violet-600 mt-1">{processorCount}</h3>
            <span className="text-[10px] text-gray-400 font-medium">Facility Operators</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-violet-50 flex items-center justify-center text-violet-600">
            <Package className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white rounded-2xl md:rounded-3xl p-4 md:p-5 border border-gray-100 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Active Status</span>
            <h3 className="text-2xl md:text-3xl font-heading font-extrabold text-emerald-600 mt-1">{activeCount}</h3>
            <span className="text-[10px] text-emerald-700 font-bold">Authorized for shifts</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600">
            <ShieldCheck className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Control Bar: Search & Filters */}
      <div className="bg-white rounded-2xl md:rounded-3xl p-4 border border-gray-100 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Search */}
        <div className="relative w-full md:max-w-md">
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by name, email, phone, vehicle..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium focus:outline-hidden focus:border-[#0077B6] focus:bg-white transition-all"
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

        {/* Filters */}
        <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
          {/* Role Filter */}
          <div className="flex bg-gray-100 p-1 rounded-xl shrink-0">
            {(['all', 'driver', 'processor'] as const).map((r) => (
              <button
                key={r}
                onClick={() => setRoleFilter(r)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold capitalize transition-colors cursor-pointer ${
                  roleFilter === r
                    ? 'bg-white text-[#03045E] shadow-2xs'
                    : 'text-gray-500 hover:text-gray-800'
                }`}
              >
                {r === 'all' ? 'All Roles' : `${r}s`}
              </button>
            ))}
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e: any) => setStatusFilter(e.target.value)}
            className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-bold text-gray-700 cursor-pointer focus:outline-hidden shrink-0"
          >
            <option value="all">All Status</option>
            <option value="active">Active Only</option>
            <option value="suspended">Suspended Only</option>
          </select>
        </div>
      </div>

      {/* Staff Members List */}
      {loading ? (
        <div className="w-full min-h-[300px] flex flex-col items-center justify-center space-y-3 bg-white rounded-3xl border border-gray-100">
          <RefreshCw className="w-8 h-8 text-[#0077B6] animate-spin" />
          <p className="text-xs font-bold text-gray-400">Loading your facility staff...</p>
        </div>
      ) : filteredStaff.length === 0 ? (
        <div className="w-full p-12 text-center bg-white rounded-3xl border border-gray-100 space-y-3">
          <div className="w-14 h-14 bg-gray-50 text-gray-400 rounded-full flex items-center justify-center mx-auto">
            <Users className="w-7 h-7" />
          </div>
          <h3 className="text-base font-bold text-[#03045E]">No Staff Members Found</h3>
          <p className="text-xs text-gray-400 max-w-sm mx-auto">
            {searchQuery || roleFilter !== 'all' || statusFilter !== 'all'
              ? 'No staff members match your active filters. Try resetting the search or filter criteria.'
              : 'There are currently no staff members assigned to your facility. Click "Add Driver" to register delivery staff.'}
          </p>
          {(searchQuery || roleFilter !== 'all' || statusFilter !== 'all') && (
            <button
              onClick={() => {
                setSearchQuery('');
                setRoleFilter('all');
                setStatusFilter('all');
              }}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-[#03045E] rounded-xl text-xs font-bold cursor-pointer transition-colors"
            >
              Reset Filters
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-5">
          {filteredStaff.map((staff) => {
            const isDriver = staff.role === 'driver';
            const isActive = staff.is_active !== false;
            const availability = staff.availability || staff.status || 'available';
            const postcodes = staff.assigned_postcodes || staff.assignedSectors || [];

            return (
              <div
                key={staff._id}
                className="bg-white rounded-3xl p-5 border border-gray-100 shadow-xs hover:shadow-md transition-all flex flex-col justify-between space-y-4"
              >
                {/* Header & Badges */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-11 h-11 rounded-2xl flex items-center justify-center font-bold font-mono text-sm shrink-0 ${
                        isDriver
                          ? 'bg-[#EBF7FF] text-[#0077B6]'
                          : 'bg-violet-50 text-violet-700'
                      }`}
                    >
                      {staff.full_name
                        .split(' ')
                        .map(n => n[0])
                        .slice(0, 2)
                        .join('')
                        .toUpperCase() || 'ST'}
                    </div>

                    <div className="min-w-0">
                      <h3 className="font-heading font-bold text-sm text-[#03045E] truncate">
                        {staff.full_name}
                      </h3>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider ${
                            isDriver
                              ? 'bg-[#CAF0F8] text-[#0077B6]'
                              : 'bg-violet-100 text-violet-800'
                          }`}
                        >
                          {isDriver ? <Truck className="w-3 h-3" /> : <Package className="w-3 h-3" />}
                          {isDriver ? 'Driver' : 'Processor'}
                        </span>

                        <span
                          className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider ${
                            isActive
                              ? 'bg-emerald-50 text-emerald-700'
                              : 'bg-red-50 text-red-600'
                          }`}
                        >
                          {isActive ? 'Active' : 'Suspended'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Availability indicator */}
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold capitalize shrink-0 ${
                      availability === 'available'
                        ? 'bg-emerald-50 text-emerald-700'
                        : availability === 'busy'
                        ? 'bg-amber-50 text-amber-700'
                        : 'bg-gray-100 text-gray-500'
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        availability === 'available'
                          ? 'bg-emerald-500'
                          : availability === 'busy'
                          ? 'bg-amber-500'
                          : 'bg-gray-400'
                      }`}
                    />
                    {availability}
                  </span>
                </div>

                {/* Contact & Driver Info */}
                <div className="space-y-2 py-2 border-y border-gray-100 text-xs text-gray-600">
                  <div className="flex items-center gap-2">
                    <Mail className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                    <span className="truncate">{staff.email}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                    <span>{staff.phone || 'No phone recorded'}</span>
                  </div>

                  {isDriver && (
                    <>
                      <div className="flex items-center gap-2">
                        <Car className="w-3.5 h-3.5 text-[#0077B6] shrink-0" />
                        <span className="font-medium text-gray-700">{staff.vehicle || 'Standard Logistics Van'}</span>
                      </div>

                      <div className="flex items-start gap-2 pt-0.5">
                        <MapPin className="w-3.5 h-3.5 text-[#0077B6] shrink-0 mt-0.5" />
                        <div className="flex flex-wrap gap-1">
                          {postcodes.length > 0 ? (
                            postcodes.map((pc, idx) => (
                              <span
                                key={idx}
                                className="px-1.5 py-0.5 bg-gray-100 text-gray-700 rounded-md text-[10px] font-mono font-bold"
                              >
                                {pc}
                              </span>
                            ))
                          ) : (
                            <span className="text-gray-400 text-[11px]">All facility postcodes</span>
                          )}
                        </div>
                      </div>
                    </>
                  )}
                </div>

                {/* Footer Action */}
                <div className="flex items-center justify-between pt-1">
                  <span className="text-[10px] text-gray-400 font-mono">
                    ID: {staff.publicId || staff.staffId || staff.id || staff._id}
                  </span>

                  <button
                    onClick={() => handleOpenEdit(staff)}
                    className="px-3 py-1.5 bg-[#EBF7FF] hover:bg-[#CAF0F8] text-[#0077B6] rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Edit className="w-3.5 h-3.5" />
                    <span>Edit Details</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Edit Staff Modal */}
      {editModalOpen && editingStaff && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white w-full max-w-lg rounded-3xl p-6 shadow-2xl space-y-5 relative max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 bg-[#EBF7FF] text-[#0077B6] rounded-xl flex items-center justify-center">
                  <Edit className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-heading font-extrabold text-[#03045E] text-base leading-tight">
                    Edit Staff Details
                  </h3>
                  <p className="text-[11px] text-gray-400">
                    {editingStaff.role === 'driver' ? 'Delivery Driver' : 'Station Processor'} &bull; Facility Scoped
                  </p>
                </div>
              </div>

              <button
                onClick={() => {
                  setEditModalOpen(false);
                  setEditingStaff(null);
                }}
                className="text-gray-400 hover:text-gray-600 p-1.5 rounded-full hover:bg-gray-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium focus:outline-hidden focus:border-[#0077B6] focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1">Email Address</label>
                  <input
                    type="email"
                    required
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium focus:outline-hidden focus:border-[#0077B6] focus:bg-white"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1">Phone Number</label>
                  <input
                    type="text"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    placeholder="+44 7700 900000"
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium focus:outline-hidden focus:border-[#0077B6] focus:bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1">Account Status</label>
                  <select
                    value={editIsActive ? 'active' : 'suspended'}
                    onChange={(e) => setEditIsActive(e.target.value === 'active')}
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-700 focus:outline-hidden focus:border-[#0077B6]"
                  >
                    <option value="active">Active (Authorized)</option>
                    <option value="suspended">Suspended (Locked Out)</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1">Shift Availability</label>
                  <select
                    value={editAvailability}
                    onChange={(e: any) => setEditAvailability(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-700 focus:outline-hidden focus:border-[#0077B6]"
                  >
                    <option value="available">Available</option>
                    <option value="busy">Busy (On Job)</option>
                    <option value="offline">Offline</option>
                  </select>
                </div>
              </div>

              {editingStaff.role === 'driver' && (
                <>
                  <div>
                    <label className="text-xs font-bold text-gray-700 block mb-1">Assigned Vehicle</label>
                    <input
                      type="text"
                      value={editVehicle}
                      onChange={(e) => setEditVehicle(e.target.value)}
                      placeholder="e.g. Ford Transit - BD21 XYZ"
                      className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium focus:outline-hidden focus:border-[#0077B6] focus:bg-white"
                    />
                  </div>

                  {/* Inherited Postcodes (read-only) */}
                  <div className="p-3 bg-blue-50/50 rounded-xl border border-blue-100 space-y-1.5">
                    <p className="text-[10px] font-black uppercase tracking-wider text-[#0077B6]">
                      Inherited Postcodes (read-only)
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {(editingStaff.assigned_postcodes || editingStaff.assignedSectors || []).length > 0 ? (
                        (editingStaff.assigned_postcodes || editingStaff.assignedSectors || []).map((pc: string, idx: number) => (
                          <span
                            key={idx}
                            className="px-2 py-0.5 bg-white rounded-md border border-blue-200 text-[10px] font-mono font-bold text-[#0077B6]"
                          >
                            {pc}
                          </span>
                        ))
                      ) : (
                        <span className="text-[10px] text-gray-400 italic">Postcodes auto-synced from manager's plant</span>
                      )}
                    </div>
                    <p className="text-[10px] text-gray-400 font-medium">
                      Managed via plant's service area — update the plant to change coverage.
                    </p>
                  </div>
                </>
              )}

              {/* Reset Password */}
              <div className="pt-2 border-t border-gray-100">
                <label className="text-xs font-bold text-gray-700 flex items-center gap-1.5 mb-1">
                  <Lock className="w-3.5 h-3.5 text-gray-400" />
                  <span>Reset Staff Password (Optional)</span>
                </label>
                <input
                  type="password"
                  placeholder="Enter new password to reset, or leave blank to keep current"
                  value={editPassword}
                  onChange={(e) => setEditPassword(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium focus:outline-hidden focus:border-[#0077B6] focus:bg-white"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => {
                    setEditModalOpen(false);
                    setEditingStaff(null);
                  }}
                  className="px-4 py-2.5 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-100 text-xs font-bold cursor-pointer transition-colors"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2.5 rounded-xl bg-[#023E8A] hover:bg-[#03045E] text-white text-xs font-bold flex items-center gap-1.5 shadow-md cursor-pointer transition-colors disabled:opacity-50"
                >
                  {saving && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>{saving ? 'Saving...' : 'Update Details'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Driver Modal */}
      {addModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white w-full max-w-lg rounded-3xl p-6 shadow-2xl space-y-5 relative max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 bg-[#EBF7FF] text-[#0077B6] rounded-xl flex items-center justify-center">
                  <Users className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-heading font-extrabold text-[#03045E] text-base leading-tight">
                    Add New Staff Member
                  </h3>
                  <p className="text-[11px] text-gray-400">
                    Directly registered and assigned to your laundry facility
                  </p>
                </div>
              </div>

              <button
                onClick={() => setAddModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 p-1.5 rounded-full hover:bg-gray-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Role Toggle */}
            <div className="flex items-center gap-2 p-1 bg-gray-100 rounded-xl">
              {(['driver', 'processor'] as const).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setNewRole(r)}
                  className={`flex-1 py-2 rounded-lg text-xs font-bold capitalize transition-colors cursor-pointer flex items-center justify-center gap-1.5 ${
                    newRole === r ? 'bg-white text-[#03045E] shadow-sm' : 'text-gray-500 hover:text-gray-800'
                  }`}
                >
                  {r === 'driver' ? <Truck className="w-3.5 h-3.5" /> : <Package className="w-3.5 h-3.5" />}
                  {r === 'driver' ? 'Delivery Driver' : 'Station Processor'}
                </button>
              ))}
            </div>

            {/* Auto-assign info banner */}
            <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 flex items-start gap-2">
              <MapPin className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <p className="text-[11px] text-emerald-700 font-semibold leading-relaxed">
                This staff member will be auto-assigned to <strong>your plant</strong> and inherit your plant's service postcodes automatically.
              </p>
            </div>

            <form onSubmit={handleAddStaff} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. John Doe"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium focus:outline-hidden focus:border-[#0077B6] focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1">Email Address</label>
                  <input
                    type="email"
                    required
                    placeholder="staff@laundelle.co.uk"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium focus:outline-hidden focus:border-[#0077B6] focus:bg-white"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1">Phone Number</label>
                  <input
                    type="text"
                    placeholder="+44 7700 900505"
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium focus:outline-hidden focus:border-[#0077B6] focus:bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1">Initial Password</label>
                <input
                  type="password"
                  required
                  placeholder="Minimum 6 characters"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium focus:outline-hidden focus:border-[#0077B6] focus:bg-white"
                />
              </div>

              {/* Driver-specific fields */}
              {newRole === 'driver' && (
                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1">Assigned Vehicle</label>
                  <input
                    type="text"
                    placeholder="e.g. Ford Transit - BD21 XYZ"
                    value={newVehicle}
                    onChange={(e) => setNewVehicle(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium focus:outline-hidden focus:border-[#0077B6] focus:bg-white"
                  />
                </div>
              )}



              <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setAddModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-100 text-xs font-bold cursor-pointer transition-colors"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={adding}
                  className="px-5 py-2.5 rounded-xl bg-[#023E8A] hover:bg-[#03045E] text-white text-xs font-bold flex items-center gap-1.5 shadow-md cursor-pointer transition-colors disabled:opacity-50"
                >
                  {adding && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>{adding ? 'Registering...' : `Add ${newRole === 'driver' ? 'Driver' : 'Processor'}`}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
