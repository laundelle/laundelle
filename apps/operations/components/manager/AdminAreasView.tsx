import React, { useState, useEffect } from 'react';
import { MapPin, Plus, RefreshCw, Edit, X, User, Trash2, Clock, Calendar, CheckCircle2, ShieldCheck, Search } from 'lucide-react';
import { dbFetchPlants, dbCreatePlant, dbUpdatePlant, dbFetchPostcodeSectors, dbFetchSlots, dbFetchStaff, dbCreateSlot, dbDeleteSlot, dbUpdateSlot, getStoredSession } from '@laundelle/api-client';
import { PostcodeMultiSelect } from './PostcodeMultiSelect';

export const AdminAreasView: React.FC = () => {
  const session = getStoredSession();
  const isManager = session?.user?.role === 'manager';

  const [activeSubTab, setActiveSubTab] = useState<'locations' | 'sectors' | 'slots'>(isManager ? 'slots' : 'locations');
  const [plants, setPlants] = useState<any[]>([]);
  const [sectors, setSectors] = useState<any[]>([]);
  const [slots, setSlots] = useState<any[]>([]);
  const [managers, setManagers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [locationSearch, setLocationSearch] = useState('');
  const [sectorSearch, setSectorSearch] = useState('');
  const [sectorDistrictFilter, setSectorDistrictFilter] = useState('all');
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
  const [slotStartTime, setSlotStartTime] = useState('09:00');
  const [slotEndTime, setSlotEndTime] = useState('12:00');
  const [slotType, setSlotType] = useState<'both' | 'pickup' | 'delivery'>('both');
  const [slotCapacity, setSlotCapacity] = useState(15);
  const [slotPlantId, setSlotPlantId] = useState('');
  const [slotSubmitting, setSlotSubmitting] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [dbPlants, dbSectors, dbSlots, dbStaff] = await Promise.all([
        dbFetchPlants(),
        dbFetchPostcodeSectors(),
        dbFetchSlots(),
        dbFetchStaff()
      ]);
      setPlants(dbPlants);
      setSectors(dbSectors);
      setSlots(dbSlots);
      setManagers(dbStaff.filter((u: any) => u.role === 'manager'));

      // If manager, auto set their plant
      if (session?.user?.id) {
        const myPlant = dbPlants.find((p: any) => p.manager_id === session.user.id);
        if (myPlant) {
          setSlotPlantId(String(myPlant._id));
        } else if (dbPlants.length > 0) {
          setSlotPlantId(String(dbPlants[0]._id));
        }
      } else if (dbPlants.length > 0) {
        setSlotPlantId(String(dbPlants[0]._id));
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

    const pins = plantPincodes.split(',').map(p => p.trim().toUpperCase()).filter(Boolean);

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
    } else {
      alert(`Error saving plant: ${res.error || 'Unknown error'}`);
    }
  };

  const openAddSlotModal = () => {
    setSlotStartTime('09:00');
    setSlotEndTime('12:00');
    setSlotType('both');
    setSlotCapacity(15);
    if (isManager && session?.user?.id) {
      const myPlant = plants.find((p: any) => p.manager_id === session.user.id);
      if (myPlant) {
        setSlotPlantId(String(myPlant._id));
      }
    }
    setSlotModalOpen(true);
  };

  const handleCreateSlot = async (e: React.FormEvent) => {
    e.preventDefault();
    setSlotSubmitting(true);

    let targetPlantId = slotPlantId;
    if (isManager && session?.user?.id) {
      const myPlant = plants.find((p: any) => p.manager_id === session.user.id);
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
      isActive: true
    };

    const res = await dbCreateSlot(payload);
    setSlotSubmitting(false);

    if (res.success) {
      alert('✓ Booking slot created successfully!');
      setSlotModalOpen(false);
      loadData();
    } else {
      alert(`Error creating slot: ${res.error || 'Failed'}`);
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
    const found = managers.find(m => m._id === managerId);
    return found ? found.full_name : managerId;
  };

  const getPlantForSector = (sectorPlantId: string) => {
    if (!sectorPlantId) return 'Unassigned';
    const found = plants.find(p => p._id === sectorPlantId);
    return found ? `${found.name} (${found.code})` : sectorPlantId;
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

  const uniqueDistricts = React.useMemo(() => {
    const d = new Set<string>();
    sectors.forEach((s) => {
      if (s.district) d.add(s.district);
    });
    return Array.from(d).sort();
  }, [sectors]);

  const filteredSectors = sectors.filter((sec) => {
    const q = sectorSearch.toLowerCase().trim();
    const matchesSearch = !q || (
      (sec.district || '').toLowerCase().includes(q) ||
      (sec.sector || '').toLowerCase().includes(q)
    );
    const matchesDistrict = sectorDistrictFilter === 'all' || sec.district === sectorDistrictFilter;
    return matchesSearch && matchesDistrict;
  });

  const filteredSlots = slots.filter((slot) => {
    if (slotTypeFilter === 'all') return true;
    return slot.type === slotTypeFilter;
  });

  return (
    <div className="w-full space-y-6 p-6 sm:p-8 pb-24">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-heading font-extrabold text-[#03045E]">
            {isManager ? 'Facility Slots & Coverage' : 'Service Areas & Plants'}
          </h1>
          <p className="text-xs text-gray-500">
            {isManager
              ? 'Manage dynamic booking slots and service operations for your laundry facility.'
              : 'Configure laundry plants, postal coverage sectors, and schedules.'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadData}
            disabled={loading}
            className="p-2.5 bg-white border border-gray-200 hover:bg-gray-50 text-[#03045E] rounded-2xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-2xs"
            title="Refresh Plants, Sectors & Slots"
          >
            <RefreshCw className={`w-4 h-4 text-[#0077B6] ${loading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Refresh Data</span>
          </button>
          {activeSubTab === 'slots' ? (
            <button
              onClick={openAddSlotModal}
              className="bg-[#03045E] hover:bg-[#023E8A] text-white px-4 py-2.5 rounded-2xl text-xs font-bold flex items-center gap-2 shadow-sm cursor-pointer"
            >
              <Plus className="w-4 h-4 text-[#48CAE4]" />
              <span>+ Create Booking Slot</span>
            </button>
          ) : !isManager ? (
            <button
              onClick={openAddModal}
              className="bg-[#03045E] hover:bg-[#023E8A] text-white px-4 py-2.5 rounded-2xl text-xs font-bold flex items-center gap-2 shadow-sm cursor-pointer"
            >
              <Plus className="w-4 h-4 text-[#48CAE4]" />
              <span>Create New Plant</span>
            </button>
          ) : null}
        </div>
      </div>

      {/* Tabs - Hidden for Manager, visible for Admin */}
      {!isManager && (
        <div className="bg-white rounded-3xl p-2 shadow-xs border border-gray-100 flex items-center gap-2 overflow-x-auto">
          <button
            onClick={() => setActiveSubTab('locations')}
            className={`px-5 py-2.5 rounded-2xl text-xs font-extrabold transition-all cursor-pointer ${activeSubTab === 'locations' ? 'bg-[#03045E] text-white shadow-sm' : 'text-gray-600'
              }`}
          >
            Laundry Plants ({plants.length})
          </button>
          <button
            onClick={() => setActiveSubTab('sectors')}
            className={`px-5 py-2.5 rounded-2xl text-xs font-extrabold transition-all cursor-pointer ${activeSubTab === 'sectors' ? 'bg-[#03045E] text-white shadow-sm' : 'text-gray-600'
              }`}
          >
            Postcode Coverage ({sectors.length})
          </button>
          <button
            onClick={() => setActiveSubTab('slots')}
            className={`px-5 py-2.5 rounded-2xl text-xs font-extrabold transition-all cursor-pointer ${activeSubTab === 'slots' ? 'bg-[#03045E] text-white shadow-sm' : 'text-gray-600'
              }`}
          >
            Booking Schedules ({slots.length})
          </button>
        </div>
      )}


      {loading ? (
        <div className="text-center py-12 text-sm text-gray-500 font-bold space-y-2">
          <RefreshCw className="w-8 h-8 text-[#03045E] animate-spin mx-auto" />
          <p>Syncing service areas data...</p>
        </div>
      ) : (
        <>
          {activeSubTab === 'locations' && (
            <div className="space-y-4">
              <div className="bg-white rounded-3xl p-4 shadow-xs border border-gray-100 flex items-center justify-between gap-3">
                <div className="relative w-full sm:w-72">
                  <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search plant name, code, address..."
                    value={locationSearch}
                    onChange={(e) => setLocationSearch(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-[#03045E] focus:outline-hidden"
                  />
                </div>
                <div className="text-xs text-gray-500 font-bold">
                  Showing <span className="text-[#03045E] font-black">{filteredPlants.length}</span> plants
                </div>
              </div>

              <div className="bg-white rounded-3xl shadow-xs border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#f8fafc] text-gray-500 font-bold border-b border-gray-100 uppercase tracking-wider text-[10px]">
                      <tr>
                        <th className="py-4 px-5">Plant Code</th>
                        <th className="py-4 px-5">Facility Name & Address</th>
                        <th className="py-4 px-5">Assigned Manager</th>
                        <th className="py-4 px-5">Coverage Postcodes</th>
                        <th className="py-4 px-5">Operating Status</th>
                        <th className="py-4 px-5 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {filteredPlants.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-12 text-center text-gray-400">
                            No laundry facilities match your search.
                          </td>
                        </tr>
                      ) : (
                        filteredPlants.map((loc) => (
                        <tr key={loc._id} className="hover:bg-[#CAF0F8]/30 transition-colors">
                          <td className="py-4 px-5">
                            <span className="font-mono font-black text-xs text-[#03045E] bg-[#CAF0F8] px-2.5 py-1 rounded-lg border border-[#ADE8F4]">
                              {loc.code}
                            </span>
                          </td>
                          <td className="py-4 px-5 space-y-0.5 max-w-sm">
                            <h4 className="font-bold text-sm text-[#03045E]">{loc.name}</h4>
                            <p className="text-xs text-gray-500 truncate">{loc.address || 'No address provided'}</p>
                          </td>
                          <td className="py-4 px-5">
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-lg bg-red-50 text-[#E63946] flex items-center justify-center shrink-0">
                                <User className="w-3.5 h-3.5" />
                              </div>
                              <span className="font-extrabold text-[#03045E] text-xs">
                                {getManagerName(loc.manager_id)}
                              </span>
                            </div>
                          </td>
                          <td className="py-4 px-5 max-w-xs">
                            <div className="flex flex-wrap gap-1">
                              {Array.isArray(loc.service_pincodes) && loc.service_pincodes.length > 0 ? (
                                loc.service_pincodes.map((pin: string) => (
                                  <span
                                    key={pin}
                                    className="px-2 py-0.5 bg-blue-50 text-[#0077B6] text-[10px] font-extrabold font-mono rounded-md border border-blue-100"
                                  >
                                    {pin}
                                  </span>
                                ))
                              ) : (
                                <span className="text-gray-400 italic">None</span>
                              )}
                            </div>
                          </td>
                          <td className="py-4 px-5">
                            <span
                              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-extrabold uppercase ${
                                loc.status === 'ACTIVE'
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : 'bg-red-50 text-red-700 border border-red-200'
                              }`}
                            >
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${
                                  loc.status === 'ACTIVE' ? 'bg-emerald-600 animate-ping' : 'bg-red-500'
                                }`}
                              />
                              {loc.status || 'ACTIVE'}
                            </span>
                          </td>
                          <td className="py-4 px-5 text-right">
                            <button
                              onClick={() => openEditModal(loc)}
                              className="px-3.5 py-1.5 bg-[#CAF0F8] hover:bg-[#ADE8F4] text-[#03045E] rounded-xl text-xs font-bold transition-all cursor-pointer inline-flex items-center gap-1.5 shadow-2xs"
                            >
                              <Edit className="w-3.5 h-3.5 text-[#0077B6]" />
                              <span>Edit Plant</span>
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

          {activeSubTab === 'sectors' && (
            <div className="space-y-4">
              <div className="bg-white rounded-3xl p-4 shadow-xs border border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto flex-1">
                  <div className="relative w-full sm:w-72">
                    <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Search postcode sector or district (e.g. PR1, BB)..."
                      value={sectorSearch}
                      onChange={(e) => setSectorSearch(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-[#03045E] focus:outline-hidden"
                    />
                  </div>

                  <select
                    value={sectorDistrictFilter}
                    onChange={(e) => setSectorDistrictFilter(e.target.value)}
                    className="w-full sm:w-auto px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold text-gray-700 focus:outline-hidden cursor-pointer"
                  >
                    <option value="all">All Districts</option>
                    {uniqueDistricts.map((d) => (
                      <option key={d} value={d}>
                        District {d}
                      </option>
                    ))}
                  </select>

                  {(sectorSearch || sectorDistrictFilter !== 'all') && (
                    <button
                      onClick={() => {
                        setSectorSearch('');
                        setSectorDistrictFilter('all');
                      }}
                      className="text-xs font-bold text-[#0077B6] hover:text-[#03045E] cursor-pointer"
                    >
                      Reset
                    </button>
                  )}
                </div>

                <div className="text-xs text-gray-500 font-bold self-end sm:self-auto">
                  Showing <span className="text-[#03045E] font-black">{filteredSectors.length}</span> of {sectors.length} sectors
                </div>
              </div>

              <div className="bg-white rounded-3xl shadow-xs border border-gray-100 overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#f8fafc] text-gray-500 font-bold border-b border-gray-100 uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="py-3.5 px-4">District</th>
                      <th className="py-3.5 px-4">Postcode Sector</th>
                      <th className="py-3.5 px-4">Assigned Laundry Plant</th>
                      <th className="py-3.5 px-4">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredSectors.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="py-12 text-center text-gray-400">
                          No postcode sectors match your filter.
                        </td>
                      </tr>
                    ) : (
                      filteredSectors.map((sec) => (
                    <tr key={sec._id || `${sec.district}-${sec.sector}`} className="hover:bg-gray-50">
                      <td className="py-3.5 px-4 font-bold text-gray-900">{sec.district}</td>
                      <td className="py-3.5 px-4 font-mono font-bold text-[#03045E]">{sec.sector}</td>
                      <td className="py-3.5 px-4 font-extrabold text-gray-700">{getPlantForSector(sec.plant_id)}</td>
                      <td className="py-3.5 px-4">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${sec.is_active ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                          }`}>
                          {sec.is_active ? 'Active Coverage' : 'Inactive'}
                        </span>
                      </td>
                    </tr>
                  )))}
                </tbody>
              </table>
            </div>
          </div>
        )}

          {activeSubTab === 'slots' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white border border-gray-100 rounded-2xl p-4 shadow-xs">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-[#0077B6] text-white flex items-center justify-center shadow-xs">
                    <Clock className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-[#03045E]">Dynamic Facility Booking Slots</h3>
                    <p className="text-[11px] text-gray-500">
                      Slots created here are automatically mapped to customer checkouts based on postcode coverage.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-auto">
                  <select
                    value={slotTypeFilter}
                    onChange={(e) => setSlotTypeFilter(e.target.value)}
                    className="px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold text-gray-700 focus:outline-hidden cursor-pointer"
                  >
                    <option value="all">All Slot Types</option>
                    <option value="both">Both (Pickup & Delivery)</option>
                    <option value="pickup">Pickup Only</option>
                    <option value="delivery">Delivery Only</option>
                  </select>

                  <button
                    onClick={openAddSlotModal}
                    className="px-3.5 py-2 bg-[#03045E] hover:bg-[#023E8A] text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5 text-[#48CAE4]" />
                    <span>New Slot</span>
                  </button>
                </div>
              </div>

              {filteredSlots.length === 0 ? (
                <div className="bg-white rounded-3xl p-12 text-center border border-gray-100 shadow-xs space-y-3">
                  <Clock className="w-12 h-12 text-gray-300 mx-auto" />
                  <h3 className="text-sm font-bold text-gray-700">No booking slots configured yet</h3>
                  <p className="text-xs text-gray-400 max-w-sm mx-auto">
                    {slotTypeFilter !== 'all'
                      ? 'No slots match the selected slot type filter.'
                      : 'Plant managers can create dynamic pickup and delivery slots for their assigned facility.'}
                  </p>
                  <button
                    onClick={openAddSlotModal}
                    className="mt-2 px-5 py-2.5 bg-[#03045E] hover:bg-[#023E8A] text-white text-xs font-bold rounded-xl shadow-xs cursor-pointer inline-flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4 text-[#48CAE4]" />
                    <span>Create First Slot</span>
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {filteredSlots.map((s) => (
                    <div
                      key={s._id || s.id}
                      className={`bg-white rounded-3xl p-5 shadow-xs border transition-all space-y-3 ${
                        s.isActive !== false ? 'border-gray-100 hover:border-[#0077B6]/40' : 'border-gray-200 opacity-60'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="px-2.5 py-0.5 bg-[#CAF0F8] text-[#03045E] rounded-full text-[10px] font-extrabold uppercase tracking-wider">
                          {s.slotType || s.type || 'both'}
                        </span>
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => handleToggleSlotActive(s)}
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold cursor-pointer transition-colors ${
                              s.isActive !== false
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                                : 'bg-gray-100 text-gray-500 border border-gray-200 hover:bg-gray-200'
                            }`}
                            title="Toggle active status"
                          >
                            {s.isActive !== false ? 'Active' : 'Disabled'}
                          </button>
                          <button
                            onClick={() => handleDeleteSlot(s.id || s._id)}
                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                            title="Delete Slot"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-[#0077B6]" />
                        <span className="text-sm font-black text-[#03045E]">
                          {s.slot || `${s.startTime} - ${s.endTime}`}
                        </span>
                      </div>

                      <div className="space-y-1.5 text-xs pt-2 border-t border-gray-100">
                        <div className="flex justify-between text-gray-500 text-[11px]">
                          <span>Hourly Capacity:</span>
                          <span className="font-bold text-gray-800">{s.capacity || s.maxCapacity || 15} orders</span>
                        </div>
                        <div className="flex justify-between text-[#0077B6] font-semibold text-[11px]">
                          <span>Assigned Plant:</span>
                          <span className="font-bold truncate max-w-[140px]">
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <form onSubmit={handleSubmitPlant} className="bg-white w-full max-w-md rounded-3xl p-6 shadow-2xl space-y-4 relative">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-base font-bold text-[#03045E] flex items-center gap-2">
                <MapPin className="w-5 h-5 text-[#00B4D8]" />
                <span>{editingPlant ? 'Edit Plant Details' : 'Create New Plant'}</span>
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
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Plant Name</label>
                  <input
                    type="text"
                    required
                    value={plantName}
                    onChange={(e) => setPlantName(e.target.value)}
                    placeholder="Preston Central Hub"
                    className="w-full px-4 py-2.5 bg-gray-50 border rounded-xl font-semibold focus:ring-2 focus:ring-[#03045E] focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">Plant Code</label>
                  <input
                    type="text"
                    required
                    disabled={!!editingPlant}
                    value={plantCode}
                    onChange={(e) => setPlantCode(e.target.value)}
                    placeholder="PLANT-A"
                    className="w-full px-4 py-2.5 bg-gray-50 border rounded-xl font-semibold focus:ring-2 focus:ring-[#03045E] focus:outline-hidden disabled:opacity-60"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Plant Address</label>
                <input
                  type="text"
                  required
                  value={plantAddress}
                  onChange={(e) => setPlantAddress(e.target.value)}
                  placeholder="Unit 4 Docklands, Preston"
                  className="w-full px-4 py-2.5 bg-gray-50 border rounded-xl font-semibold focus:ring-2 focus:ring-[#03045E] focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Service area postcodes (comma separated)</label>
                <PostcodeMultiSelect
                  required
                  value={plantPincodes}
                  onChange={(val) => setPlantPincodes(val)}
                  placeholder="Type postcode district (e.g. PR1, M1, BD2)..."
                />
              </div>


              <div>
                <label className="block font-bold text-gray-700 mb-1">Operational Status</label>
                <select
                  value={plantStatus}
                  onChange={(e) => setPlantStatus(e.target.value)}
                  className="w-full p-2.5 bg-gray-50 border rounded-xl font-semibold focus:ring-2 focus:ring-[#03045E] focus:outline-hidden cursor-pointer"
                >
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="INACTIVE">INACTIVE</option>
                </select>
              </div>
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
                {submitting ? 'Saving...' : editingPlant ? 'Save Changes' : 'Create Location'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Create Dynamic Slot Modal */}
      {slotModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <form onSubmit={handleCreateSlot} className="bg-white w-full max-w-md rounded-3xl p-6 shadow-2xl space-y-4 relative animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-base font-bold text-[#03045E] flex items-center gap-2">
                <Clock className="w-5 h-5 text-[#00B4D8]" />
                <span>Create Booking Slot</span>
              </h3>
              <button
                type="button"
                onClick={() => setSlotModalOpen(false)}
                className="p-1.5 hover:bg-gray-100 rounded-full transition-colors cursor-pointer"
              >
                <X className="w-4 h-4 text-gray-400" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              {!isManager && (
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Laundry Facility / Plant</label>
                  <select
                    value={slotPlantId}
                    onChange={(e) => setSlotPlantId(e.target.value)}
                    className="w-full p-2.5 bg-gray-50 border rounded-xl font-semibold focus:ring-2 focus:ring-[#03045E] focus:outline-hidden cursor-pointer"
                  >
                    {plants.map((p) => (
                      <option key={p._id} value={String(p._id)}>
                        {p.name} ({p.code}) — {Array.isArray(p.service_pincodes) ? p.service_pincodes.join(', ') : p.service_pincodes}
                      </option>
                    ))}
                  </select>
                  <p className="text-[10px] text-gray-400 mt-1">
                    Customers in this plant's service postcodes will see this slot at checkout.
                  </p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Start Time</label>
                  <input
                    type="time"
                    required
                    value={slotStartTime}
                    onChange={(e) => setSlotStartTime(e.target.value)}
                    className="w-full px-4 py-2.5 bg-gray-50 border rounded-xl font-semibold focus:ring-2 focus:ring-[#03045E] focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">End Time</label>
                  <input
                    type="time"
                    required
                    value={slotEndTime}
                    onChange={(e) => setSlotEndTime(e.target.value)}
                    className="w-full px-4 py-2.5 bg-gray-50 border rounded-xl font-semibold focus:ring-2 focus:ring-[#03045E] focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Slot Applicability</label>
                  <select
                    value={slotType}
                    onChange={(e) => setSlotType(e.target.value as any)}
                    className="w-full p-2.5 bg-gray-50 border rounded-xl font-semibold focus:ring-2 focus:ring-[#03045E] focus:outline-hidden cursor-pointer"
                  >
                    <option value="both">Both Pickup & Delivery</option>
                    <option value="pickup">Pickup Only</option>
                    <option value="delivery">Delivery Only</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">Hourly Order Capacity</label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    required
                    value={slotCapacity}
                    onChange={(e) => setSlotCapacity(Number(e.target.value))}
                    className="w-full px-4 py-2.5 bg-gray-50 border rounded-xl font-semibold focus:ring-2 focus:ring-[#03045E] focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="bg-[#CAF0F8]/40 border border-[#ADE8F4] rounded-xl p-3 text-[11px] text-[#03045E] space-y-1">
                <span className="font-bold flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#0077B6]" />
                  Preview:
                </span>
                <p>
                  Timing: <strong>{slotStartTime} - {slotEndTime}</strong> ({slotType}) • Plant: <strong>{plants.find(p => String(p._id) === String(slotPlantId))?.name || 'Selected Plant'}</strong>
                </p>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setSlotModalOpen(false)}
                className="w-1/2 py-2.5 bg-gray-100 text-gray-700 rounded-xl text-xs font-bold cursor-pointer hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={slotSubmitting}
                className="w-1/2 py-2.5 bg-[#03045E] hover:bg-[#023E8A] text-white rounded-xl text-xs font-black cursor-pointer shadow-md disabled:opacity-50 transition-colors"
              >
                {slotSubmitting ? 'Creating...' : 'Create Slot'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
