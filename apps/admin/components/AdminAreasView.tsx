import React, { useState, useEffect } from 'react';
import { MapPin, Plus, RefreshCw, Edit, X, User, Trash2, Clock, Calendar, CheckCircle2, ShieldCheck, Search } from 'lucide-react';
import { dbFetchPlants, dbCreatePlant, dbUpdatePlant, dbFetchSlots, dbFetchStaff, dbCreateSlot, dbDeleteSlot, dbUpdateSlot, getStoredSession } from '@laundelle/api-client';
import { extractOutwardCode } from '@laundelle/utils';
import { PostcodeMultiSelect } from './PostcodeMultiSelect';

export const AdminAreasView: React.FC = () => {
  const session = getStoredSession();
  const isManager = session?.user?.role === 'manager';

  const [activeSubTab, setActiveSubTab] = useState<'locations' | 'slots'>('locations');
  const [plants, setPlants] = useState<any[]>([]);
  const [slots, setSlots] = useState<any[]>([]);
  const [managers, setManagers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [locationSearch, setLocationSearch] = useState('');
  const [slotTypeFilter, setSlotTypeFilter] = useState('all');

  // Modal form states for Plants
  const [modalOpen, setModalOpen] = useState(false);
  const [editingPlant, setEditingPlant] = useState<any | null>(null);

  const [plantName, setPlantName] = useState('');
  const [plantCode, setPlantCode] = useState('');
  const [plantAddress, setPlantAddress] = useState('');
  const [plantPincodes, setPlantPincodes] = useState('');
  const [plantStatus, setPlantStatus] = useState('ACTIVE');
  const [plantManagerId, setPlantManagerId] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Modal form states for Slots
  const [slotModalOpen, setSlotModalOpen] = useState(false);
  const [editingSlot, setEditingSlot] = useState<any | null>(null);
  const [slotStartTime, setSlotStartTime] = useState('09:00');
  const [slotEndTime, setSlotEndTime] = useState('12:00');
  const [slotType, setSlotType] = useState<'both' | 'pickup' | 'delivery'>('both');
  const [slotCapacity, setSlotCapacity] = useState(15);
  const [slotPlantId, setSlotPlantId] = useState('');
  const [slotSubmitting, setSlotSubmitting] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [dbPlants, dbSlots, dbStaff] = await Promise.all([
        dbFetchPlants(),
        dbFetchSlots(),
        dbFetchStaff()
      ]);
      const safePlants = Array.isArray(dbPlants) ? dbPlants : ((dbPlants as any)?.plants || []);
      const safeSlots = Array.isArray(dbSlots) ? dbSlots : ((dbSlots as any)?.slots || []);
      const safeStaff = Array.isArray(dbStaff) ? dbStaff : ((dbStaff as any)?.staff || []);

      setPlants(safePlants);
      setSlots(safeSlots);
      setManagers(safeStaff.filter((u: any) => u.role === 'manager' || u.role === 'plant_manager'));

      // If manager, auto set their plant
      if (session?.user?.id) {
        const myPlant = safePlants.find((p: any) => p.manager_id === session.user.id);
        if (myPlant) {
          setSlotPlantId(String(myPlant._id));
        } else if (safePlants.length > 0) {
          setSlotPlantId(String(safePlants[0]._id));
        }
      } else if (safePlants.length > 0) {
        setSlotPlantId(String(safePlants[0]._id));
      }
    } catch (e) {
      console.error('Error fetching admin area data:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openAddModal = () => {
    setEditingPlant(null);
    setPlantName('');
    setPlantCode('');
    setPlantAddress('');
    setPlantPincodes('');
    setPlantStatus('ACTIVE');
    setPlantManagerId('');
    setModalOpen(true);
  };

  const openEditModal = (plant: any) => {
    setEditingPlant(plant);
    setPlantName(plant.name);
    setPlantCode(plant.code);
    setPlantAddress(plant.address || '');
    setPlantPincodes(Array.isArray(plant.service_pincodes) ? plant.service_pincodes.join(', ') : (plant.service_pincodes || ''));
    setPlantStatus(plant.status || 'ACTIVE');
    setPlantManagerId(plant.manager_id || '');
    setModalOpen(true);
  };

  const handleSubmitPlant = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    const pins = Array.from(new Set(
      plantPincodes
        .split(',')
        .map(p => extractOutwardCode(p) || p.trim().toUpperCase().replace(/\s+/g, ''))
        .filter(Boolean)
    ));

    const plantData = {
      name: plantName,
      code: plantCode,
      address: plantAddress,
      service_pincodes: pins,
      status: plantStatus,
      manager_id: plantManagerId || null
    };

    let res;
    if (editingPlant) {
      res = await dbUpdatePlant(editingPlant._id, plantData);
    } else {
      res = await dbCreatePlant(plantData);
    }

    setSubmitting(false);
    if (res.success) {
      alert(editingPlant ? '✓ Plant location updated successfully!' : '✓ Plant location created successfully!');
      setModalOpen(false);
      loadData();
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('l2u_plants_changed'));
      }
    } else {
      alert(`Error saving plant: ${res.error || 'Unknown error'}`);
    }
  };

  const openAddSlotModal = () => {
    setEditingSlot(null);
    setSlotStartTime('09:00');
    setSlotEndTime('12:00');
    setSlotType('both');
    setSlotCapacity(15);
    if (isManager && session?.user?.id) {
      const myPlant = plants.find((p: any) => 
        String(p.manager_id) === String(session.user.id) ||
        (p.manager_public_id && (session.user as any).publicId && String(p.manager_public_id) === String((session.user as any).publicId)) ||
        (p.manager_email && session.user.email && String(p.manager_email).toLowerCase() === String(session.user.email).toLowerCase())
      );
      if (myPlant) {
        setSlotPlantId(String(myPlant._id));
      }
    }
    setSlotModalOpen(true);
  };

  const openEditSlotModal = (slot: any) => {
    setEditingSlot(slot);
    setSlotStartTime(slot.startTime || '09:00');
    setSlotEndTime(slot.endTime || '12:00');
    setSlotType(slot.slotType || slot.type || 'both');
    setSlotCapacity(slot.capacity || slot.maxCapacity || 15);
    if (slot.plant_id) {
      setSlotPlantId(String(slot.plant_id));
    }
    setSlotModalOpen(true);
  };

  const handleSaveSlot = async (e: React.FormEvent) => {
    e.preventDefault();
    setSlotSubmitting(true);

    let targetPlantId = slotPlantId;
    if (isManager && session?.user?.id) {
      const myPlant = plants.find((p: any) => 
        String(p.manager_id) === String(session.user.id) ||
        (p.manager_public_id && (session.user as any).publicId && String(p.manager_public_id) === String((session.user as any).publicId)) ||
        (p.manager_email && session.user.email && String(p.manager_email).toLowerCase() === String(session.user.email).toLowerCase())
      );
      if (myPlant) targetPlantId = String(myPlant._id);
    }

    const chosenPlant = plants.find(p => String(p._id) === String(targetPlantId));

    const payload = {
      startTime: slotStartTime,
      endTime: slotEndTime,
      slot: `${slotStartTime} - ${slotEndTime}`,
      slotType,
      capacity: Number(slotCapacity) || 15,
      plant_id: targetPlantId || (chosenPlant ? String(chosenPlant._id) : null),
      plant_name: chosenPlant ? chosenPlant.name : '',
      plant_code: chosenPlant ? chosenPlant.code : '',
      isActive: editingSlot ? (editingSlot.isActive !== false) : true
    };

    let res;
    if (editingSlot) {
      const slotId = editingSlot._id || editingSlot.id;
      res = await dbUpdateSlot(slotId, payload);
    } else {
      res = await dbCreateSlot(payload);
    }
    setSlotSubmitting(false);

    if (res.success) {
      alert(editingSlot ? '✓ Booking slot updated successfully!' : '✓ Booking slot created successfully!');
      setSlotModalOpen(false);
      setEditingSlot(null);
      loadData();
    } else {
      alert(`Error saving slot: ${res.error || 'Failed'}`);
    }
  };

  const handleDeleteSlot = async (slotId: string) => {
    if (!confirm('Are you sure you want to delete this booking slot? Customers will no longer be able to select it.')) return;
    const res = await dbDeleteSlot(slotId);
    if (res.success) {
      loadData();
    } else {
      alert(`Error deleting slot: ${res.error || 'Failed'}`);
    }
  };

  const handleToggleSlotActive = async (slot: any) => {
    const slotId = slot.id || slot._id;
    const res = await dbUpdateSlot(slotId, { isActive: !slot.isActive });
    if (res.success) {
      loadData();
    } else {
      alert(`Error updating slot: ${res.error || 'Failed'}`);
    }
  };

  const getManagerName = (managerId: string) => {
    if (!managerId) return 'Unassigned';
    const found = managers.find(m => String(m._id) === String(managerId) || m.id === managerId || m.publicId === managerId);
    return found ? (found.full_name || found.name) : 'Assigned Manager';
  };

  const filteredPlants = plants.filter((p) => {
    const q = locationSearch.toLowerCase().trim();
    if (!q) return true;
    return (
      (p.name || '').toLowerCase().includes(q) ||
      (p.code || '').toLowerCase().includes(q) ||
      (p.address || '').toLowerCase().includes(q)
    );
  });

  const filteredSlots = slots.filter((slot) => {
    if (slotTypeFilter === 'all') return true;
    return slot.type === slotTypeFilter || slot.slotType === slotTypeFilter;
  });

  return (
    <div className="w-full space-y-4 md:space-y-5 p-4 sm:p-8 pb-20 md:pb-6">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight">
            Facilities & Schedules
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Laundry plants and dynamic booking time slots.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadData}
            disabled={loading}
            className="px-3.5 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-2xs"
            title="Refresh Plants & Slots"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-blue-600 ${loading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Refresh Data</span>
          </button>

          {activeSubTab === 'slots' ? (
            <button
              onClick={openAddSlotModal}
              className="bg-blue-600 hover:bg-blue-700 text-white px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-2xs cursor-pointer transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create Slot</span>
            </button>
          ) : !isManager ? (
            <button
              onClick={openAddModal}
              className="bg-blue-600 hover:bg-blue-700 text-white px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-2xs cursor-pointer transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create Plant</span>
            </button>
          ) : null}
        </div>
      </div>

      {/* Modern Segmented Navigation Switcher (No Postcode Coverage) */}
      <div className="bg-slate-100/70 p-1 rounded-xl flex items-center gap-1 w-fit">
        <button
          onClick={() => setActiveSubTab('locations')}
          className={`px-4 py-2 rounded-lg text-xs font-medium transition-all cursor-pointer flex items-center gap-2 ${
            activeSubTab === 'locations'
              ? 'bg-white text-slate-900 shadow-xs font-semibold'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <span>Laundry Plants</span>
          <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-semibold ${
            activeSubTab === 'locations' ? 'bg-blue-50 text-blue-700' : 'bg-slate-200/70 text-slate-600'
          }`}>
            {plants.length}
          </span>
        </button>

        <button
          onClick={() => setActiveSubTab('slots')}
          className={`px-4 py-2 rounded-lg text-xs font-medium transition-all cursor-pointer flex items-center gap-2 ${
            activeSubTab === 'slots'
              ? 'bg-white text-slate-900 shadow-xs font-semibold'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <span>Booking Schedules</span>
          <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-semibold ${
            activeSubTab === 'slots' ? 'bg-blue-50 text-blue-700' : 'bg-slate-200/70 text-slate-600'
          }`}>
            {slots.length}
          </span>
        </button>
      </div>

      {loading ? (
        <div className="text-center py-16 text-xs text-slate-400 font-medium space-y-2">
          <RefreshCw className="w-5 h-5 text-blue-600 animate-spin mx-auto" />
          <p>Syncing facilities and schedules...</p>
        </div>
      ) : (
        <>
          {/* TAB 1: LOCATIONS / PLANTS */}
          {activeSubTab === 'locations' && (
            <div className="space-y-4">
              <div className="bg-white rounded-2xl p-4 shadow-xs border border-slate-100 flex items-center justify-between gap-3">
                <div className="relative w-full sm:w-72">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search plant name, code, address..."
                    value={locationSearch}
                    onChange={(e) => setLocationSearch(e.target.value)}
                    className="w-full pl-9 pr-3.5 py-2 bg-slate-50 border border-slate-200/70 rounded-xl text-xs font-medium focus:bg-white focus:border-blue-500 focus:outline-hidden"
                  />
                </div>
                <div className="text-xs text-slate-500 font-medium">
                  Showing <span className="text-slate-900 font-bold">{filteredPlants.length}</span> plants
                </div>
              </div>

              <div className="bg-white rounded-2xl shadow-xs border border-slate-100 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200 uppercase tracking-wider text-[10px]">
                      <tr>
                        <th className="py-3 px-4">Plant Code</th>
                        <th className="py-3 px-4">Facility Name & Address</th>
                        <th className="py-3 px-4">Assigned Manager</th>
                        <th className="py-3 px-4">Coverage Postcodes</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredPlants.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-16 text-center text-slate-400">
                            {locationSearch ? 'No laundry facilities match your search.' : 'No laundry plants registered.'}
                          </td>
                        </tr>
                      ) : (
                        filteredPlants.map((loc) => {
                          const plantIdKey = loc._id ? String(loc._id) : loc.id || loc.publicId;
                          return (
                            <tr key={plantIdKey} className="hover:bg-slate-50/80 transition-colors">
                              <td className="py-3 px-4">
                                <span className="font-mono font-semibold text-xs text-slate-900 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200/60">
                                  {loc.code}
                                </span>
                              </td>
                              <td className="py-3 px-4 space-y-0.5 max-w-sm">
                                <h4 className="font-semibold text-xs text-slate-900">{loc.name}</h4>
                                <p className="text-[11px] text-slate-400 truncate">{loc.address || 'No address provided'}</p>
                              </td>
                              <td className="py-3 px-4">
                                <div className="flex items-center gap-2">
                                  <div className="w-6 h-6 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                                    <User className="w-3.5 h-3.5" />
                                  </div>
                                  <span className="font-medium text-slate-700 text-xs">
                                    {getManagerName(loc.manager_id)}
                                  </span>
                                </div>
                              </td>
                              <td className="py-3 px-4 max-w-xs">
                                <div className="flex flex-wrap gap-1">
                                  {Array.isArray(loc.service_pincodes) && loc.service_pincodes.length > 0 ? (
                                    loc.service_pincodes.map((pin: string) => (
                                      <span
                                        key={pin}
                                        className="px-2 py-0.5 bg-slate-100 text-slate-700 text-[10px] font-medium font-mono rounded-md"
                                      >
                                        {pin}
                                      </span>
                                    ))
                                  ) : (
                                    <span className="text-slate-400 font-medium">None</span>
                                  )}
                                </div>
                              </td>
                              <td className="py-3 px-4">
                                <span
                                  className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase ${
                                    loc.status === 'ACTIVE'
                                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-100/60'
                                      : 'bg-rose-50 text-rose-700 border border-rose-100/60'
                                  }`}
                                >
                                  <span
                                    className={`w-1.5 h-1.5 rounded-full ${
                                      loc.status === 'ACTIVE' ? 'bg-emerald-500' : 'bg-rose-500'
                                    }`}
                                  />
                                  {loc.status || 'ACTIVE'}
                                </span>
                              </td>
                              <td className="py-3 px-4 text-right">
                                {isManager ? (
                                  <span className="px-2.5 py-1 bg-slate-50 text-slate-500 rounded-xl text-[11px] font-medium border border-slate-200/60 inline-flex items-center gap-1">
                                    <ShieldCheck className="w-3 h-3 text-blue-500" />
                                    <span>Assigned by Admin</span>
                                  </span>
                                ) : (
                                  <button
                                    onClick={() => openEditModal(loc)}
                                    className="px-3 py-1 bg-white hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-medium transition-all cursor-pointer inline-flex items-center gap-1.5 border border-slate-200 shadow-2xs"
                                  >
                                    <Edit className="w-3 h-3 text-slate-500" />
                                    <span>Edit</span>
                                  </button>
                                )}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: SLOTS / BOOKING SCHEDULES */}
          {activeSubTab === 'slots' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white border border-slate-100 rounded-2xl p-4 shadow-xs">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                    <Clock className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-semibold text-slate-900">Booking Time Slots</h3>
                    <p className="text-[11px] text-slate-400">
                      Customer checkout pickup and delivery slots.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-auto">
                  <select
                    value={slotTypeFilter}
                    onChange={(e) => setSlotTypeFilter(e.target.value)}
                    className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-hidden cursor-pointer"
                  >
                    <option value="all">All Slot Types</option>
                    <option value="both">Both (Pickup & Delivery)</option>
                    <option value="pickup">Pickup Only</option>
                    <option value="delivery">Delivery Only</option>
                  </select>

                  <button
                    onClick={openAddSlotModal}
                    className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold transition-all shadow-2xs cursor-pointer flex items-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>New Slot</span>
                  </button>
                </div>
              </div>

              {filteredSlots.length === 0 ? (
                <div className="bg-white rounded-2xl p-16 text-center border border-slate-100 shadow-xs space-y-3">
                  <Clock className="w-8 h-8 text-slate-300 mx-auto" />
                  <h3 className="text-sm font-semibold text-slate-700">No booking slots configured</h3>
                  <button
                    onClick={openAddSlotModal}
                    className="mt-2 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-2xs cursor-pointer inline-flex items-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Create Slot</span>
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {filteredSlots.map((s) => (
                    <div
                      key={s._id || s.id}
                      className={`bg-white rounded-2xl p-4 shadow-xs border transition-all space-y-2.5 ${
                        s.isActive !== false ? 'border-slate-100 hover:border-slate-200' : 'border-slate-200 opacity-60'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded-md text-[10px] font-semibold uppercase tracking-wider">
                          {s.slotType || s.type || 'both'}
                        </span>
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => handleToggleSlotActive(s)}
                            className={`px-2 py-0.5 rounded-full text-[10px] font-semibold cursor-pointer transition-colors ${
                              s.isActive !== false
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-100/60'
                                : 'bg-slate-100 text-slate-500 border border-slate-200'
                            }`}
                            title="Toggle active status"
                          >
                            {s.isActive !== false ? 'Active' : 'Disabled'}
                          </button>
                          <button
                            onClick={() => openEditSlotModal(s)}
                            className="p-1 text-slate-400 hover:text-blue-600 rounded-lg transition-colors cursor-pointer"
                            title="Edit Slot"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteSlot(s.id || s._id)}
                            className="p-1 text-slate-400 hover:text-rose-600 rounded-lg transition-colors cursor-pointer"
                            title="Delete Slot"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-blue-600" />
                        <span className="text-sm font-bold text-slate-900">
                          {s.slot || `${s.startTime} - ${s.endTime}`}
                        </span>
                      </div>

                      <div className="space-y-1 text-xs pt-2 border-t border-slate-100">
                        <div className="flex justify-between text-slate-500 text-[11px]">
                          <span>Capacity:</span>
                          <span className="font-semibold text-slate-800">{s.capacity || s.maxCapacity || 15} orders</span>
                        </div>
                        <div className="flex justify-between text-slate-400 text-[11px]">
                          <span>Plant:</span>
                          <span className="font-medium text-slate-700 truncate max-w-[140px]">
                            {s.plant_name ? `${s.plant_name} (${s.plant_code || ''})` : (s.plant_id || 'All Facilities')}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}


      {/* Add / Edit Plant Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <form onSubmit={handleSubmitPlant} className="bg-white w-full max-w-md rounded-2xl p-6 shadow-xl space-y-4 relative border border-slate-100">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-blue-600" />
                <span>{editingPlant ? 'Edit Plant Details' : 'Create New Plant'}</span>
              </h3>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Plant Name</label>
                  <input
                    type="text"
                    required
                    value={plantName}
                    onChange={(e) => setPlantName(e.target.value)}
                    placeholder="Preston Central Hub"
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-800 focus:outline-hidden focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-700 mb-1">Plant Code</label>
                  <input
                    type="text"
                    required
                    disabled={!!editingPlant}
                    value={plantCode}
                    onChange={(e) => setPlantCode(e.target.value)}
                    placeholder="PLANT-A"
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-800 focus:outline-hidden focus:border-blue-500 disabled:bg-slate-100 disabled:text-slate-400"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Plant Address</label>
                <input
                  type="text"
                  required
                  value={plantAddress}
                  onChange={(e) => setPlantAddress(e.target.value)}
                  placeholder="Unit 4 Docklands, Preston"
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-800 focus:outline-hidden focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Service area postcodes (comma separated)</label>
                <PostcodeMultiSelect
                  required
                  value={plantPincodes}
                  onChange={(val) => setPlantPincodes(val)}
                  placeholder="Type postcode district (e.g. PR1, M1, BD2)..."
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Operational Status</label>
                <select
                  value={plantStatus}
                  onChange={(e) => setPlantStatus(e.target.value)}
                  className="w-full p-2 bg-white border border-slate-200 rounded-xl text-slate-800 focus:outline-hidden focus:border-blue-500 cursor-pointer"
                >
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="INACTIVE">INACTIVE</option>
                </select>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="w-1/2 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 rounded-xl text-xs font-medium cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="w-1/2 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-medium cursor-pointer shadow-2xs disabled:opacity-50 transition-colors"
              >
                {submitting ? 'Saving...' : editingPlant ? 'Save Changes' : 'Create Location'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Create / Edit Dynamic Slot Modal */}
      {slotModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <form onSubmit={handleSaveSlot} className="bg-white w-full max-w-md rounded-2xl p-6 shadow-xl space-y-4 relative border border-slate-100">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Clock className="w-4 h-4 text-blue-600" />
                <span>{editingSlot ? 'Edit Booking Slot' : 'Create Booking Slot'}</span>
              </h3>
              <button
                type="button"
                onClick={() => setSlotModalOpen(false)}
                className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-medium text-slate-700 mb-1">Laundry Facility / Plant</label>
                <select
                  value={slotPlantId}
                  onChange={(e) => setSlotPlantId(e.target.value)}
                  className="w-full p-2 bg-white border border-slate-200 rounded-xl text-slate-800 focus:outline-hidden focus:border-blue-500 cursor-pointer"
                >
                  {plants.map((p) => (
                    <option key={p._id ? String(p._id) : p.code} value={String(p._id || p.id)}>
                      {p.name} ({p.code}) — {Array.isArray(p.service_pincodes) ? p.service_pincodes.join(', ') : p.service_pincodes}
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-slate-400 mt-1">
                  Customers in this plant&apos;s service postcodes will see this slot at checkout.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Start Time</label>
                  <input
                    type="time"
                    required
                    value={slotStartTime}
                    onChange={(e) => setSlotStartTime(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-800 focus:outline-hidden focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-700 mb-1">End Time</label>
                  <input
                    type="time"
                    required
                    value={slotEndTime}
                    onChange={(e) => setSlotEndTime(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-800 focus:outline-hidden focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Slot Applicability</label>
                  <select
                    value={slotType}
                    onChange={(e) => setSlotType(e.target.value as any)}
                    className="w-full p-2 bg-white border border-slate-200 rounded-xl text-slate-800 focus:outline-hidden focus:border-blue-500 cursor-pointer"
                  >
                    <option value="both">Both Pickup & Delivery</option>
                    <option value="pickup">Pickup Only</option>
                    <option value="delivery">Delivery Only</option>
                  </select>
                </div>

                <div>
                  <label className="block font-medium text-slate-700 mb-1">Hourly Order Capacity</label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    required
                    value={slotCapacity}
                    onChange={(e) => setSlotCapacity(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-800 focus:outline-hidden focus:border-blue-500"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setSlotModalOpen(false)}
                className="w-1/2 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 rounded-xl text-xs font-medium cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={slotSubmitting}
                className="w-1/2 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-medium cursor-pointer shadow-2xs disabled:opacity-50 transition-colors"
              >
                {slotSubmitting ? 'Saving...' : editingSlot ? 'Update Slot' : 'Create Slot'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
