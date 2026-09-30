import React, { useState, useEffect } from 'react';
import { Users, Mail, Phone, Plus, X, Lock, RefreshCw, Edit, MapPin, Eye, ShieldCheck, Calendar, Search } from 'lucide-react';
import { dbFetchStaff, dbCreateStaffMember, dbUpdateStaffMember, dbFetchPlants, dbFetchManagers, dbFetchManagerDetails, dbAdminFetchOrders } from '@laundelle/api-client';

export const AdminStaffView: React.FC = () => {
  const [staff, setStaff] = useState<any[]>([]);
  const [plants, setPlants] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [roleFilter, setRoleFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [plantFilter, setPlantFilter] = useState('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<any | null>(null);
  const [viewingStaff, setViewingStaff] = useState<any | null>(null);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);


  // New admin member form state
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState('manager');
  const [password, setPassword] = useState('');
  const [plantId, setPlantId] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [assignedPostcodes, setAssignedPostcodes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Manager-based inheritance (for driver/processor creation)
  const [managers, setManagers] = useState<any[]>([]);
  const [selectedManagerId, setSelectedManagerId] = useState('');
  const [managerPlantPreview, setManagerPlantPreview] = useState<{ plantName: string; postcodes: string[] } | null>(null);
  const [loadingManagerPreview, setLoadingManagerPreview] = useState(false);

  // Driver fields
  const [vehicleType, setVehicleType] = useState('Van');
  const [vehicleReg, setVehicleReg] = useState('');
  const [licenseNum, setLicenseNum] = useState('');
  const [emergencyName, setEmergencyName] = useState('');
  const [emergencyPhone, setEmergencyPhone] = useState('');


  const loadStaff = async () => {
    setLoading(true);
    const [dbStaff, dbOrders] = await Promise.all([
      dbFetchStaff(),
      dbAdminFetchOrders()
    ]);
    setOrders(dbOrders || []);

    const roleLabels: Record<string, string> = {
      super_admin: 'Super Admin',
      admin: 'Administrator',
      manager: 'PLANT MANAGER',
      driver: 'DRIVER',
      processor: 'PROCESSOR',
    };

    const mapped = dbStaff.map((u: any): any => ({
      id: u._id,
      userId: u._id,
      employeeNumber: u.employee_number || u.employeeNumber || `EMP-${u._id.substring(u._id.length - 4).toUpperCase()}`,
      fullName: u.full_name || u.name || 'Anonymous Staff',
      email: u.email,
      phone: u.phone || '+44 7700 900505',
      role: u.role || 'manager',
      roleLabel: roleLabels[u.role] || (u.role ? u.role.toUpperCase() : 'Plant Manager'),
      status: u.is_active ? 'active' : 'suspended',
      isActive: u.is_active !== false,
      plantId: u.plant_id || '',
      assigned_postcodes: u.assigned_postcodes || u.assignedSectors || [],
      vehicle: u.vehicle || '',
      vehicleType: u.vehicle_type || u.vehicleType || 'Van',
      vehicleReg: u.vehicle_reg || u.vehicleReg || '',
      licenseNum: u.license_number || u.licenseNum || '',
      emergencyContact: u.emergency_contact || (u.emergencyName || u.emergencyPhone ? { name: u.emergencyName || '', phone: u.emergencyPhone || '' } : null),
      hireDate: u.created_at ? u.created_at.split('T')[0] : '2025-01-01',
      primaryLocation: u.primaryLocation || 'Preston Operations Hub',
      avatarUrl: u.avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=200',
      activeJobsCount: 0
    }));

    setStaff(mapped);
    setLoading(false);
  };

  const loadPlants = async () => {
    const dbPlants = await dbFetchPlants();
    setPlants(dbPlants);
    const dbManagers = await dbFetchManagers();
    setManagers(dbManagers);
  };

  const handleManagerSelect = async (managerId: string) => {
    setSelectedManagerId(managerId);
    setManagerPlantPreview(null);
    if (!managerId) return;
    setLoadingManagerPreview(true);
    try {
      const details = await dbFetchManagerDetails(managerId);
      if (details?.plant) {
        setManagerPlantPreview({
          plantName: `${details.plant.name} (${details.plant.code})`,
          postcodes: details.inheritedPostcodes || details.plant.service_pincodes || []
        });
      }
    } catch {
      // Preview unavailable — not critical
    } finally {
      setLoadingManagerPreview(false);
    }
  };

  useEffect(() => {
    loadStaff();
    loadPlants();
  }, []);

  const openAddModal = () => {
    setEditingStaff(null);
    setFullName('');
    setEmail('');
    setPhone('');
    setRole('manager');
    setPassword('');
    setPlantId('');
    setAssignedPostcodes('');
    setIsActive(true);
    setVehicleType('Van');
    setVehicleReg('');
    setLicenseNum('');
    setEmergencyName('');
    setEmergencyPhone('');
    setSelectedManagerId('');
    setManagerPlantPreview(null);
    setModalOpen(true);
  };

  const openEditModal = (stf: any) => {
    setEditingStaff(stf);
    setFullName(stf.fullName);
    setEmail(stf.email);
    setPhone(stf.phone);
    setRole(stf.role);
    setPassword('');
    setPlantId(stf.plantId || '');
    setAssignedPostcodes((stf.assigned_postcodes || []).join(', '));
    setIsActive(stf.isActive);
    setVehicleType(stf.vehicleType || 'Van');
    setVehicleReg(stf.vehicleReg || '');
    setLicenseNum(stf.licenseNum || '');
    setEmergencyName(stf.emergencyContact?.name || '');
    setEmergencyPhone(stf.emergencyContact?.phone || '');
    setModalOpen(true);
  };

  const handleCreateOrUpdateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    if (role === 'driver') {
      if (!vehicleReg.trim()) {
        alert('Vehicle Registration Number is required for delivery drivers.');
        setSubmitting(false);
        return;
      }
      if (!editingStaff && !selectedManagerId) {
        alert('Please select a Plant Manager for this driver. Postcodes will be auto-inherited from their plant.');
        setSubmitting(false);
        return;
      }
    }

    if (role === 'processor') {
      if (!editingStaff && !selectedManagerId) {
        alert('Please select a Plant Manager for this processor. Postcodes will be auto-inherited from their plant.');
        setSubmitting(false);
        return;
      }
    }

    if (role === 'manager' && !plantId) {
      // manager requires a plant — OK to leave empty (warning only)
    }

    const staffData: any = {
      full_name: fullName,
      email,
      phone,
      role,
      is_active: isActive,
    };

    if (['driver', 'processor'].includes(role)) {
      // For driver/processor: send manager_id; backend resolves plant + postcodes
      if (editingStaff) {
        // On edit: just send updatable fields (no manager/plant/postcode change)
      } else {
        staffData.manager_id = selectedManagerId;
      }
      // Driver-specific
      if (role === 'driver') {
        staffData.vehicle_type = vehicleType;
        staffData.vehicle_reg = vehicleReg.trim().toUpperCase();
        staffData.license_number = licenseNum.trim();
        staffData.emergency_contact = { name: emergencyName.trim(), phone: emergencyPhone.trim() };
        staffData.vehicle = `${vehicleType} - ${vehicleReg.trim().toUpperCase()}`;
      }
    } else if (role === 'manager') {
      staffData.plant_id = plantId || null;
    }
    // admin/super_admin: no plant or postcode fields

    if (password) {
      staffData.password = password;
    }

    let res;
    if (editingStaff) {
      res = await dbUpdateStaffMember(editingStaff.id, staffData);
    } else {
      if (!password) {
        alert('Password is required when creating a new user.');
        setSubmitting(false);
        return;
      }
      res = await dbCreateStaffMember({ ...staffData, password });
    }
    setSubmitting(false);

    if (res.success) {
      alert(editingStaff ? '✓ Staff member updated successfully!' : '✓ Staff member created successfully!');
      setModalOpen(false);
      loadStaff();
      loadPlants();
    } else {
      alert(`Error saving staff member: ${res.error || 'Unknown error'}`);
    }
  };

  const filteredStaff = staff.filter(s => {
    const matchesRole = roleFilter === 'all' || s.role === roleFilter;

    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'active' && s.isActive !== false && s.status !== 'suspended') ||
      (statusFilter === 'suspended' && (s.isActive === false || s.status === 'suspended'));

    const matchesPlant =
      plantFilter === 'all' ||
      String(s.plantId) === String(plantFilter);

    const q = searchQuery.toLowerCase().trim();
    const matchesQuery = !q || (
      (s.fullName || '').toLowerCase().includes(q) ||
      (s.email || '').toLowerCase().includes(q) ||
      (s.phone || '').includes(q) ||
      (s.employeeNumber || '').toLowerCase().includes(q) ||
      (s.vehicle || '').toLowerCase().includes(q)
    );

    return matchesRole && matchesStatus && matchesPlant && matchesQuery;
  });

  const getPlantName = (pId: string) => {
    if (!pId) return 'Unassigned';
    const found = plants.find(p => p._id === pId);
    return found ? `${found.name} (${found.code})` : pId;
  };

  return (
    <div className="w-full space-y-6 p-6 sm:p-8 pb-24">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-heading font-extrabold text-[#03045E]">Staff & Plant Managers</h1>
          <p className="text-xs text-gray-500">Manage operational staff, drivers, processors, and Plant Managers.</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => { loadStaff(); loadPlants(); }}
            disabled={loading}
            className="p-2.5 bg-white border border-gray-200 hover:bg-gray-50 text-[#03045E] rounded-2xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-2xs"
            title="Refresh Staff & Plant Managers"
          >
            <RefreshCw className={`w-4 h-4 text-[#0077B6] ${loading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Refresh Staff</span>
          </button>
          <button
            onClick={openAddModal}
            className="bg-[#03045E] hover:bg-[#023E8A] text-white px-4 py-2.5 rounded-2xl text-xs font-bold flex items-center gap-2 shadow-sm cursor-pointer"
          >
            <Plus className="w-4 h-4 text-[#48CAE4]" />
            <span>Add Staff / Plant Manager</span>
          </button>
        </div>
      </div>

      {/* Role Filter Tabs */}
      <div className="bg-white rounded-3xl p-3 shadow-xs border border-gray-100 flex items-center gap-2 overflow-x-auto">
        {[
          { id: 'all', label: 'All Staff' },
          { id: 'manager', label: 'Plant Managers' },
          { id: 'driver', label: 'Drivers' },
          { id: 'processor', label: 'Processors' },
          { id: 'admin', label: 'Administrators' },
        ].map((r) => (
          <button
            key={r.id}
            onClick={() => setRoleFilter(r.id)}
            className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer ${roleFilter === r.id ? 'bg-[#03045E] text-white shadow-sm' : 'text-gray-600 hover:bg-gray-100'
              }`}
          >
            {r.label}
          </button>
        ))}
      </div>

      {/* Search & Extra Filters Bar */}
      <div className="bg-white rounded-3xl p-4 shadow-xs border border-gray-100 flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto flex-1">
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by name, email, phone, EMP #..."
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
            <option value="all">All Statuses</option>
            <option value="active">Active Only</option>
            <option value="suspended">Suspended Only</option>
          </select>

          <select
            value={plantFilter}
            onChange={(e) => setPlantFilter(e.target.value)}
            className="w-full sm:w-auto px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold text-gray-700 focus:outline-hidden cursor-pointer"
          >
            <option value="all">All Facilities</option>
            {plants.map((p) => (
              <option key={p._id} value={p._id}>
                {p.name} ({p.code})
              </option>
            ))}
          </select>

          {(searchQuery || roleFilter !== 'all' || statusFilter !== 'all' || plantFilter !== 'all') && (
            <button
              onClick={() => {
                setSearchQuery('');
                setRoleFilter('all');
                setStatusFilter('all');
                setPlantFilter('all');
              }}
              className="text-xs font-bold text-[#0077B6] hover:text-[#03045E] cursor-pointer whitespace-nowrap"
            >
              Reset Filters
            </button>
          )}
        </div>

        <div className="text-xs text-gray-500 font-bold self-end md:self-auto">
          Showing <span className="text-[#03045E] font-black">{filteredStaff.length}</span> staff members
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-sm text-gray-500 font-bold space-y-2">
          <RefreshCw className="w-8 h-8 text-[#03045E] animate-spin mx-auto" />
          <p>Syncing staff records with center database...</p>
        </div>
      ) : (
        /* Staff Tabular Format (Rows and Columns) */
        <div className="w-full bg-white rounded-3xl shadow-xs border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#f8fafc] text-gray-500 font-bold border-b border-gray-100 uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-4 px-5">Staff Member</th>
                  <th className="py-4 px-5">Role</th>
                  <th className="py-4 px-5">Operational Assignment</th>
                  <th className="py-4 px-5">Contact Details</th>
                  <th className="py-4 px-5">Status</th>
                  <th className="py-4 px-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredStaff.map((stf) => (
                  <tr
                    key={stf.id}
                    onClick={() => {
                      setViewingStaff(stf);
                      setDetailsModalOpen(true);
                    }}
                    className="hover:bg-[#CAF0F8]/30 transition-colors cursor-pointer group"
                  >
                    <td className="py-4 px-5 flex items-center gap-3">
                      <img
                        src={stf.avatarUrl}
                        alt={stf.fullName}
                        className="w-10 h-10 rounded-2xl object-cover shadow-2xs border border-[#00B4D8]/50 shrink-0"
                      />
                      <div>
                        <h4 className="font-extrabold text-sm text-[#03045E] group-hover:text-[#0077B6] transition-colors">
                          {stf.fullName}
                        </h4>
                        <span className="text-[10px] font-bold text-gray-400 font-mono block">
                          {stf.employeeNumber}
                        </span>
                      </div>
                    </td>
                    <td className="py-4 px-5">
                      <span
                        className={`px-3 py-1 rounded-full text-[10px] font-extrabold tracking-wider uppercase ${
                          stf.role === 'manager'
                            ? 'bg-[#FFF0F2] text-[#E63946]'
                            : stf.role === 'driver'
                            ? 'bg-[#EBF7FF] text-[#0077B6]'
                            : stf.role === 'processor'
                            ? 'bg-[#EFEAEE] text-[#7209B7]'
                            : 'bg-[#CAF0F8] text-[#03045E]'
                        }`}
                      >
                        {stf.roleLabel}
                      </span>
                    </td>
                    <td className="py-4 px-5">
                      {stf.role === 'manager' || stf.role === 'processor' ? (
                        <div className="flex items-center gap-1.5 text-xs text-gray-700">
                          <MapPin className="w-3.5 h-3.5 text-[#E63946] shrink-0" />
                          <span className="font-semibold">{getPlantName(stf.plantId)}</span>
                        </div>
                      ) : stf.role === 'driver' && stf.assigned_postcodes?.length > 0 ? (
                        <div className="flex flex-wrap gap-1 max-w-xs">
                          {stf.assigned_postcodes.map((pc: string) => (
                            <span
                              key={pc}
                              className="px-2 py-0.5 rounded-md bg-blue-50 text-[#0077B6] text-[10px] font-bold font-mono border border-blue-100"
                            >
                              {pc}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-gray-400 italic font-medium">Headquarters Hub</span>
                      )}
                    </td>
                    <td className="py-4 px-5 space-y-0.5 text-xs">
                      <p className="flex items-center gap-1.5 font-medium text-gray-700">
                        <Mail className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                        <span>{stf.email}</span>
                      </p>
                      <p className="flex items-center gap-1.5 font-medium text-gray-700">
                        <Phone className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                        <span>{stf.phone}</span>
                      </p>
                    </td>
                    <td className="py-4 px-5">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-extrabold ${
                          stf.isActive
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-red-50 text-red-600 border border-red-200'
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            stf.isActive ? 'bg-emerald-600 animate-ping' : 'bg-red-500'
                          }`}
                        />
                        {stf.isActive ? 'active' : 'suspended'}
                      </span>
                    </td>
                    <td className="py-4 px-5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setViewingStaff(stf);
                            setDetailsModalOpen(true);
                          }}
                          className="px-3 py-1.5 bg-[#CAF0F8] hover:bg-[#ADE8F4] text-[#03045E] rounded-xl text-xs font-bold transition-all cursor-pointer inline-flex items-center gap-1 shadow-2xs group-hover:bg-[#03045E] group-hover:text-white"
                        >
                          <Eye className="w-3.5 h-3.5 text-[#0077B6] group-hover:text-[#48CAE4]" />
                          <span>View</span>
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            openEditModal(stf);
                          }}
                          className="p-1.5 text-gray-400 hover:text-[#03045E] hover:bg-gray-100 rounded-xl transition-all cursor-pointer"
                          title="Edit Staff Member"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Staff Details Modal */}
      {detailsModalOpen && viewingStaff && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 sm:p-6 animate-in fade-in">
          <div className="bg-white w-full max-w-xl rounded-3xl p-6 sm:p-8 shadow-2xl border border-gray-100 space-y-6 relative">
            <div className="flex items-start justify-between pb-4 border-b border-gray-100">
              <div className="flex items-center gap-4">
                <img
                  src={viewingStaff.avatarUrl}
                  alt={viewingStaff.fullName}
                  className="w-16 h-16 rounded-2xl object-cover border-2 border-[#00B4D8] shadow-sm shrink-0"
                />
                <div>
                  <div className="flex items-center gap-2.5">
                    <h3 className="text-xl font-heading font-extrabold text-[#03045E]">
                      {viewingStaff.fullName}
                    </h3>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                        viewingStaff.isActive
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-red-50 text-red-600 border border-red-200'
                      }`}
                    >
                      {viewingStaff.isActive ? 'Active' : 'Suspended'}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 font-mono font-bold mt-0.5">
                    ID: {viewingStaff.employeeNumber}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={async () => {
                    await loadStaff();
                    setStaff(prev => {
                      const updated = prev.find(s => s.id === viewingStaff.id);
                      if (updated) setViewingStaff(updated);
                      return prev;
                    });
                  }}
                  disabled={loading}
                  className="p-2 bg-gray-100 hover:bg-gray-200 rounded-full text-gray-500 hover:text-[#0077B6] transition-colors cursor-pointer"
                  title="Refresh Staff Record"
                >
                  <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-[#0077B6]' : ''}`} />
                </button>
                <button
                  onClick={() => setDetailsModalOpen(false)}
                  className="p-2 bg-gray-100 hover:bg-gray-200 rounded-full text-gray-500 hover:text-gray-800 transition-colors cursor-pointer"
                  title="Close Modal"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3.5 bg-gray-50 rounded-2xl border border-gray-100 space-y-1">
                <span className="text-[10px] font-bold text-gray-400 uppercase block">Role & Permissions</span>
                <span className="font-extrabold text-[#03045E] text-sm block">{viewingStaff.roleLabel}</span>
              </div>
              <div className="p-3.5 bg-gray-50 rounded-2xl border border-gray-100 space-y-1">
                <span className="text-[10px] font-bold text-gray-400 uppercase block">Hire / Record Date</span>
                <span className="font-extrabold text-gray-800 text-sm block">{viewingStaff.hireDate || '2025-01-01'}</span>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-4 bg-blue-50/50 rounded-2xl border border-blue-100 space-y-2">
                <span className="text-[10px] font-bold text-[#0077B6] uppercase tracking-wider block">Operational Assignment</span>
                {viewingStaff.role === 'manager' ? (
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-[#E63946] shrink-0" />
                    <div>
                      <p className="font-bold text-[#03045E]">{getPlantName(viewingStaff.plantId)}</p>
                      <p className="text-[11px] text-gray-500">Assigned Operational Laundry Facility</p>
                    </div>
                  </div>
                ) : viewingStaff.role === 'processor' ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-[#E63946] shrink-0" />
                      <div>
                        <p className="font-bold text-[#03045E]">{getPlantName(viewingStaff.plantId)}</p>
                        <p className="text-[11px] text-gray-500">Assigned Plant Facility</p>
                      </div>
                    </div>
                  </div>

                ) : viewingStaff.role === 'driver' ? (
                  <div className="space-y-2.5">
                    {/* Vehicle & License Info */}
                    <div className="p-3 bg-white rounded-xl border border-blue-200 space-y-1.5">
                      <span className="text-[10px] font-bold text-gray-400 uppercase block">Vehicle Information</span>
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-gray-700">Type & Reg:</span>
                        <span className="font-extrabold text-[#03045E] font-mono">
                          {viewingStaff.vehicle || `${viewingStaff.vehicleType || 'Vehicle'} - ${viewingStaff.vehicleReg || 'Unregistered'}`}
                        </span>
                      </div>
                      {viewingStaff.licenseNum && (
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-gray-700">License:</span>
                          <span className="font-extrabold text-gray-900 font-mono">{viewingStaff.licenseNum}</span>
                        </div>
                      )}
                    </div>

                    {/* Emergency Contact */}
                    {viewingStaff.emergencyContact?.name && (
                      <div className="p-3 bg-white rounded-xl border border-blue-200 text-xs">
                        <span className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Emergency Contact</span>
                        <p className="font-bold text-gray-800">{viewingStaff.emergencyContact.name}</p>
                        {viewingStaff.emergencyContact.phone && (
                          <p className="font-mono text-gray-600 mt-0.5">{viewingStaff.emergencyContact.phone}</p>
                        )}
                      </div>
                    )}

                    <div>
                      <p className="font-bold text-[#03045E] mb-1.5">Assigned Delivery Postcodes:</p>
                      <div className="flex flex-wrap gap-1.5">
                        {(viewingStaff.assigned_postcodes || []).length > 0 ? (
                          viewingStaff.assigned_postcodes.map((pc: string) => (
                            <span key={pc} className="px-2.5 py-1 bg-white font-mono font-bold text-[#0077B6] rounded-lg border border-blue-200 text-xs">
                              {pc}
                            </span>
                          ))
                        ) : (
                          <span className="text-gray-400 italic">No postcodes assigned</span>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="font-bold text-[#03045E]">Central Administrative Operations</p>
                )}
              </div>

              <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 space-y-2.5">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Contact Information</span>
                <p className="flex items-center gap-2 font-medium text-gray-800">
                  <Mail className="w-4 h-4 text-[#0077B6] shrink-0" />
                  <a href={`mailto:${viewingStaff.email}`} className="hover:underline">{viewingStaff.email}</a>
                </p>
                <p className="flex items-center gap-2 font-medium text-gray-800">
                  <Phone className="w-4 h-4 text-[#0077B6] shrink-0" />
                  <a href={`tel:${viewingStaff.phone}`} className="hover:underline">{viewingStaff.phone}</a>
                </p>
              </div>

              {/* Specific Role Details / Drilldown Section */}
              {viewingStaff.role === 'manager' && (
                <div className="space-y-2 pt-2 border-t border-gray-100">
                  <h4 className="font-heading font-extrabold text-[#03045E] text-xs uppercase tracking-wider">
                    Staff Managed Under Facility ({staff.filter(s => String(s.plantId) === String(viewingStaff.plantId) && String(s.id) !== String(viewingStaff.id)).length})
                  </h4>
                  {staff.filter(s => String(s.plantId) === String(viewingStaff.plantId) && String(s.id) !== String(viewingStaff.id)).length === 0 ? (
                    <p className="text-xs text-gray-400 italic p-3 bg-gray-50 rounded-xl border border-gray-100">No personnel currently assigned under this manager's facility.</p>
                  ) : (
                    <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                      {staff.filter(s => String(s.plantId) === String(viewingStaff.plantId) && String(s.id) !== String(viewingStaff.id)).map(s => (
                        <div key={s.id} className="p-2.5 bg-gray-50 rounded-xl border border-gray-100 flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2">
                            <span className={`w-2.5 h-2.5 rounded-full ${s.role === 'driver' ? 'bg-[#0077B6]' : 'bg-purple-600'}`} />
                            <div>
                              <span className="font-bold text-gray-900 block">{s.fullName}</span>
                              <span className="text-[10px] text-gray-400">{s.phone} • {s.email}</span>
                            </div>
                          </div>
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase bg-indigo-50 text-[#03045E] border border-indigo-100">
                            {s.role}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {viewingStaff.role === 'driver' && (
                <div className="space-y-2 pt-2 border-t border-gray-100">
                  <h4 className="font-heading font-extrabold text-[#03045E] text-xs uppercase tracking-wider">
                    Orders Served by {viewingStaff.fullName} ({orders.filter(o => String(o.assigned_driver_id || o.driver_id || o.driver?.id) === String(viewingStaff.id) || o.driver?.name?.toLowerCase() === viewingStaff.fullName?.toLowerCase()).length})
                  </h4>
                  {orders.filter(o => String(o.assigned_driver_id || o.driver_id || o.driver?.id) === String(viewingStaff.id) || o.driver?.name?.toLowerCase() === viewingStaff.fullName?.toLowerCase()).length === 0 ? (
                    <p className="text-xs text-gray-400 italic p-3 bg-gray-50 rounded-xl border border-gray-100">No orders served by this driver yet.</p>
                  ) : (
                    <div className="max-h-52 overflow-y-auto border border-gray-200 rounded-xl">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-gray-50 text-gray-500 font-bold uppercase text-[9px]">
                          <tr>
                            <th className="py-2.5 px-3">Order ID</th>
                            <th className="py-2.5 px-3">Customer</th>
                            <th className="py-2.5 px-3">Status</th>
                            <th className="py-2.5 px-3 text-right">Total</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {orders.filter(o => String(o.assigned_driver_id || o.driver_id || o.driver?.id) === String(viewingStaff.id) || o.driver?.name?.toLowerCase() === viewingStaff.fullName?.toLowerCase()).map(ord => (
                            <tr key={ord.id} className="hover:bg-gray-50">
                              <td className="py-2 px-3 font-mono font-bold text-[#03045E]">{ord.id}</td>
                              <td className="py-2 px-3 font-bold text-gray-900">{ord.customer_name || ord.customerName || ord.customer?.full_name || 'Customer'}</td>
                              <td className="py-2 px-3">
                                <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-[#CAF0F8] text-[#03045E]">
                                  {ord.statusLabel || ord.status}
                                </span>
                              </td>
                              <td className="py-2 px-3 font-extrabold text-gray-900 text-right">£{ord.total?.toFixed ? ord.total.toFixed(2) : ord.total || '0.00'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {viewingStaff.role === 'processor' && (
                <div className="space-y-2 pt-2 border-t border-gray-100">
                  <h4 className="font-heading font-extrabold text-[#03045E] text-xs uppercase tracking-wider">
                    Orders Processed by {viewingStaff.fullName} ({orders.filter(o => String(o.assigned_processor_id || o.processor_id || o.processor?.id) === String(viewingStaff.id) || o.processor?.name?.toLowerCase() === viewingStaff.fullName?.toLowerCase()).length})
                  </h4>
                  {orders.filter(o => String(o.assigned_processor_id || o.processor_id || o.processor?.id) === String(viewingStaff.id) || o.processor?.name?.toLowerCase() === viewingStaff.fullName?.toLowerCase()).length === 0 ? (
                    <p className="text-xs text-gray-400 italic p-3 bg-gray-50 rounded-xl border border-gray-100">No orders processed by this operator yet.</p>
                  ) : (
                    <div className="max-h-52 overflow-y-auto border border-gray-200 rounded-xl">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-gray-50 text-gray-500 font-bold uppercase text-[9px]">
                          <tr>
                            <th className="py-2.5 px-3">Order ID</th>
                            <th className="py-2.5 px-3">Customer</th>
                            <th className="py-2.5 px-3">Stage</th>
                            <th className="py-2.5 px-3 text-right">Total</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {orders.filter(o => String(o.assigned_processor_id || o.processor_id || o.processor?.id) === String(viewingStaff.id) || o.processor?.name?.toLowerCase() === viewingStaff.fullName?.toLowerCase()).map(ord => (
                            <tr key={ord.id} className="hover:bg-gray-50">
                              <td className="py-2 px-3 font-mono font-bold text-[#03045E]">{ord.id}</td>
                              <td className="py-2 px-3 font-bold text-gray-900">{ord.customer_name || ord.customerName || ord.customer?.full_name || 'Customer'}</td>
                              <td className="py-2 px-3">
                                <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-purple-100 text-purple-900 uppercase">
                                  {ord.status || 'Processing'}
                                </span>
                              </td>
                              <td className="py-2 px-3 font-extrabold text-gray-900 text-right">£{ord.total?.toFixed ? ord.total.toFixed(2) : ord.total || '0.00'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>


            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-gray-100">
              <button
                onClick={() => setDetailsModalOpen(false)}
                className="px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                Close
              </button>
              <button
                onClick={() => {
                  const target = viewingStaff;
                  setDetailsModalOpen(false);
                  openEditModal(target);
                }}
                className="px-5 py-2.5 bg-[#03045E] hover:bg-[#023E8A] text-white rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 shadow-sm"
              >
                <Edit className="w-3.5 h-3.5 text-[#48CAE4]" />
                <span>Edit Staff Member</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Staff Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <form onSubmit={handleCreateOrUpdateStaff} className="bg-white w-full max-w-md rounded-3xl p-6 shadow-2xl space-y-4 relative">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-base font-bold text-[#03045E] flex items-center gap-2">
                <Users className="w-5 h-5 text-[#00B4D8]" />
                <span>{editingStaff ? 'Edit Staff Member' : 'Add Staff Member'}</span>
              </h3>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="p-1.5 hover:bg-gray-100 rounded-full transition-colors cursor-pointer"
              >
                <X className="w-4 h-4 text-gray-400" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-gray-700 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. John Doe"
                  className="w-full px-4 py-2.5 bg-gray-50 border rounded-xl font-semibold focus:ring-2 focus:ring-[#03045E] focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Email Address</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. john@laundelle.co.uk"
                  className="w-full px-4 py-2.5 bg-gray-50 border rounded-xl font-semibold focus:ring-2 focus:ring-[#03045E] focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Phone Number</label>
                <input
                  type="text"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="e.g. +44 7700 900505"
                  className="w-full px-4 py-2.5 bg-gray-50 border rounded-xl font-semibold focus:ring-2 focus:ring-[#03045E] focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">
                  Password {editingStaff && <span className="text-gray-400 font-normal">(leave blank to keep unchanged)</span>}
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-gray-400 absolute left-3.5 top-3" />
                  <input
                    type="password"
                    required={!editingStaff}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter password"
                    className="w-full pl-9 pr-4 py-2.5 bg-gray-50 border rounded-xl font-semibold focus:ring-2 focus:ring-[#03045E] focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Role</label>
                  <select
                    value={role}
                    onChange={(e) => {
                      setRole(e.target.value);
                      if (!['manager', 'driver', 'processor'].includes(e.target.value)) setPlantId('');
                    }}
                    className="w-full p-2.5 bg-gray-50 border rounded-xl font-semibold focus:ring-2 focus:ring-[#03045E] focus:outline-hidden cursor-pointer"
                  >
                    <option value="manager">Plant Manager</option>
                    <option value="driver">Driver</option>
                    <option value="processor">Processor</option>
                    <option value="admin">Administrator</option>
                    <option value="super_admin">Super Admin</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">Status</label>
                  <select
                    value={isActive ? 'active' : 'suspended'}
                    onChange={(e) => setIsActive(e.target.value === 'active')}
                    className="w-full p-2.5 bg-gray-50 border rounded-xl font-semibold focus:ring-2 focus:ring-[#03045E] focus:outline-hidden cursor-pointer"
                  >
                    <option value="active">Active</option>
                    <option value="suspended">Suspended</option>
                  </select>
                </div>
              </div>

              {/* Plant Assignment — only for Manager role */}
              {role === 'manager' && (
                <div>
                  <label className="block font-bold text-gray-700 mb-1">
                    Assign Plant Location
                  </label>
                  <select
                    value={plantId}
                    onChange={(e) => setPlantId(e.target.value)}
                    className="w-full p-2.5 bg-gray-50 border rounded-xl font-semibold focus:ring-2 focus:ring-[#E63946] focus:outline-hidden cursor-pointer"
                  >
                    <option value="">-- Select Plant --</option>
                    {plants.map(p => (
                      <option key={p._id} value={p._id}>
                        {p.name} ({p.code})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Manager Selection — for Driver/Processor (postcodes auto-inherited) */}
              {['driver', 'processor'].includes(role) && !editingStaff && (
                <div>
                  <label className="block font-bold text-gray-700 mb-1">
                    Select Plant Manager <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={selectedManagerId}
                    onChange={(e) => handleManagerSelect(e.target.value)}
                    required
                    className="w-full p-2.5 bg-gray-50 border rounded-xl font-semibold focus:ring-2 focus:ring-[#03045E] focus:outline-hidden cursor-pointer"
                  >
                    <option value="">-- Select Manager --</option>
                    {managers.map(m => (
                      <option key={m._id} value={m._id}>
                        {m.full_name || m.name} ({m.email})
                      </option>
                    ))}
                  </select>
                  <p className="text-[10px] text-gray-400 mt-1 font-medium">
                    Plant and postcodes are automatically inherited from the selected manager.
                  </p>

                  {/* Plant + Postcode Preview */}
                  {loadingManagerPreview && (
                    <div className="mt-2 p-3 bg-blue-50 rounded-xl border border-blue-100 text-xs text-[#0077B6] font-semibold animate-pulse">
                      Loading postcode preview...
                    </div>
                  )}
                  {managerPlantPreview && !loadingManagerPreview && (
                    <div className="mt-2 p-3 bg-blue-50 rounded-xl border border-blue-100 space-y-1.5">
                      <p className="text-[10px] font-black uppercase tracking-wider text-[#0077B6]">
                        Inherited from Manager's Plant
                      </p>
                      <p className="text-xs font-bold text-[#03045E]">{managerPlantPreview.plantName}</p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {managerPlantPreview.postcodes.length > 0 ? (
                          managerPlantPreview.postcodes.map((pc: string) => (
                            <span
                              key={pc}
                              className="px-2 py-0.5 bg-white rounded-md border border-blue-200 text-[10px] font-mono font-bold text-[#0077B6]"
                            >
                              {pc}
                            </span>
                          ))
                        ) : (
                          <span className="text-[10px] text-gray-400 italic">No postcodes configured for this plant</span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* When editing driver/processor: show read-only inherited postcodes */}
              {['driver', 'processor'].includes(role) && editingStaff && (
                <div className="p-3 bg-blue-50/50 rounded-xl border border-blue-100 space-y-1.5">
                  <p className="text-[10px] font-black uppercase tracking-wider text-[#0077B6]">
                    Inherited Postcodes (read-only)
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {(editingStaff.assigned_postcodes || []).length > 0 ? (
                      editingStaff.assigned_postcodes.map((pc: string) => (
                        <span
                          key={pc}
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
                    Postcodes are managed by the plant's service area — not editable here.
                  </p>
                </div>
              )}

              {/* Driver Specific Fields */}
              {role === 'driver' && (
                <div className="p-3 bg-blue-50/50 rounded-2xl border border-blue-100 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-black uppercase tracking-wider text-[#0077B6]">Driver & Vehicle Details</span>
                    <span className="text-[10px] text-gray-400 font-bold">Registration Required</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="block font-bold text-gray-700 mb-1 text-[11px]">Vehicle Type</label>
                      <select
                        value={vehicleType}
                        onChange={(e) => setVehicleType(e.target.value)}
                        className="w-full p-2 bg-white border rounded-xl font-semibold text-xs focus:ring-2 focus:ring-[#03045E] focus:outline-hidden"
                      >
                        <option value="Van">Van (Long Wheelbase)</option>
                        <option value="Car">Car</option>
                        <option value="Motorbike">Motorbike</option>
                        <option value="Bicycle">Cargo Bicycle</option>
                      </select>
                    </div>

                    <div>
                      <label className="block font-bold text-gray-700 mb-1 text-[11px]">
                        Vehicle Reg <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={vehicleReg}
                        onChange={(e) => setVehicleReg(e.target.value)}
                        placeholder="e.g. LN71 WXY"
                        className="w-full px-3 py-2 bg-white border rounded-xl font-mono uppercase font-bold text-xs focus:ring-2 focus:ring-[#03045E] focus:outline-hidden"
                      >
                      </input>
                    </div>
                  </div>

                  <div>
                    <label className="block font-bold text-gray-700 mb-1 text-[11px]">Driver License Number</label>
                    <input
                      type="text"
                      value={licenseNum}
                      onChange={(e) => setLicenseNum(e.target.value)}
                      placeholder="e.g. UK-DRV-99201"
                      className="w-full px-3 py-2 bg-white border rounded-xl font-mono text-xs focus:ring-2 focus:ring-[#03045E] focus:outline-hidden"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="block font-bold text-gray-700 mb-1 text-[11px]">Emergency Contact Name</label>
                      <input
                        type="text"
                        value={emergencyName}
                        onChange={(e) => setEmergencyName(e.target.value)}
                        placeholder="e.g. Jane Doe"
                        className="w-full px-3 py-2 bg-white border rounded-xl text-xs focus:ring-2 focus:ring-[#03045E] focus:outline-hidden"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-gray-700 mb-1 text-[11px]">Emergency Phone</label>
                      <input
                        type="text"
                        value={emergencyPhone}
                        onChange={(e) => setEmergencyPhone(e.target.value)}
                        placeholder="e.g. +44 7700 900111"
                        className="w-full px-3 py-2 bg-white border rounded-xl text-xs focus:ring-2 focus:ring-[#03045E] focus:outline-hidden"
                      />
                    </div>
                  </div>
                </div>
              )}


            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="w-1/2 py-2.5 bg-gray-100 text-gray-700 rounded-xl text-xs font-bold cursor-pointer hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="w-1/2 py-2.5 bg-[#03045E] hover:bg-[#023E8A] text-white rounded-xl text-xs font-black cursor-pointer shadow-md disabled:opacity-50 transition-colors"
              >
                {submitting ? 'Saving...' : editingStaff ? 'Save Changes' : 'Create Staff'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
