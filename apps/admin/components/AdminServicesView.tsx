import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Check, X, RefreshCw, Sparkles, Tag, Clock, Search } from 'lucide-react';
import { dbAdminFetchServices, dbAdminCreateService, dbAdminUpdateService } from '@laundelle/api-client';

export const AdminServicesView: React.FC = () => {
  const [services, setServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'services' | 'pricing'>('services');
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  // Modal states
  const [modalOpen, setModalOpen] = useState(false);
  const [editingService, setEditingService] = useState<any | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    categoryLabel: 'Wash & Fold',
    description: '',
    basePrice: '12.00',
    pricePerKg: '3.50',
    turnaround: '24-48 Hours',
    imageUrl: 'https://images.unsplash.com/photo-1545173168-9f1947eebb7f?auto=format&fit=crop&w=800&q=80',
    enabled: true
  });
  const [saving, setSaving] = useState(false);

  const loadServices = async () => {
    setLoading(true);
    try {
      const data = await dbAdminFetchServices();
      setServices(data);
    } catch (e) {
      console.error('Error fetching services:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadServices();
  }, []);

  const openAddModal = () => {
    setEditingService(null);
    setFormData({
      name: '',
      categoryLabel: 'Wash & Fold',
      description: '',
      basePrice: '12.00',
      pricePerKg: '3.50',
      turnaround: '24-48 Hours',
      imageUrl: 'https://images.unsplash.com/photo-1545173168-9f1947eebb7f?auto=format&fit=crop&w=800&q=80',
      enabled: true
    });
    setModalOpen(true);
  };

  const openEditModal = (srv: any) => {
    setEditingService(srv);
    setFormData({
      name: srv.name || '',
      categoryLabel: srv.categoryLabel || srv.category || 'Wash & Fold',
      description: srv.description || '',
      basePrice: String(srv.basePrice || srv.price || '0'),
      pricePerKg: String(srv.pricePerKg || '0'),
      turnaround: srv.turnaround || '24-48 Hours',
      imageUrl: srv.imageUrl || srv.image || 'https://images.unsplash.com/photo-1545173168-9f1947eebb7f?auto=format&fit=crop&w=800&q=80',
      enabled: srv.enabled !== false
    });
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    setSaving(true);
    try {
      const payload = {
        name: formData.name.trim(),
        category: formData.categoryLabel.toLowerCase().replace(/\s+/g, '_'),
        categoryLabel: formData.categoryLabel,
        description: formData.description.trim(),
        price: parseFloat(formData.basePrice) || 0,
        basePrice: parseFloat(formData.basePrice) || 0,
        pricePerKg: parseFloat(formData.pricePerKg) || 0,
        turnaround: formData.turnaround,
        imageUrl: formData.imageUrl.trim(),
        image: formData.imageUrl.trim(),
        enabled: formData.enabled
      };

      if (editingService) {
        const id = editingService.id || editingService._id;
        await dbAdminUpdateService(id, payload);
      } else {
        await dbAdminCreateService(payload);
      }
      setModalOpen(false);
      await loadServices();
    } catch (err) {
      console.error('Failed to save service:', err);
    } finally {
      setSaving(false);
    }
  };

  const categories = React.useMemo(() => {
    const cats = new Set<string>();
    services.forEach(s => {
      const c = s.categoryLabel || s.category;
      if (c) cats.add(c);
    });
    return Array.from(cats).sort();
  }, [services]);

  const filteredServices = services.filter(s => {
    const q = searchQuery.toLowerCase().trim();
    const matchesQuery = !q || (
      (s.name || '').toLowerCase().includes(q) ||
      (s.description || '').toLowerCase().includes(q) ||
      (s.categoryLabel || s.category || '').toLowerCase().includes(q)
    );

    const matchesCategory =
      categoryFilter === 'all' ||
      (s.categoryLabel || s.category || '').toLowerCase() === categoryFilter.toLowerCase();

    const isEnabled = s.enabled !== false;
    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'active' && isEnabled) ||
      (statusFilter === 'disabled' && !isEnabled);

    return matchesQuery && matchesCategory && matchesStatus;
  });

  return (
    <div className="w-full space-y-6 p-6 sm:p-8 pb-24">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-heading font-extrabold text-[#03045E]">Services Catalog & Dynamic Pricing Builder</h1>
          <p className="text-xs text-gray-500">Configure base laundry services, add-ons, turnaround times, and sector pricing rules.</p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadServices}
            disabled={loading}
            className="p-2.5 bg-white border border-gray-200 hover:bg-gray-50 text-[#03045E] rounded-2xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-2xs"
            title="Refresh Services Catalog"
          >
            <RefreshCw className={`w-4 h-4 text-[#0077B6] ${loading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
          <button
            onClick={openAddModal}
            className="bg-[#03045E] hover:bg-[#023E8A] text-white px-4 py-2.5 rounded-2xl text-xs font-bold flex items-center gap-2 shadow-sm cursor-pointer"
          >
            <Plus className="w-4 h-4 text-[#48CAE4]" />
            <span>Add New Service</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-3xl p-2 shadow-xs border border-gray-100 flex items-center gap-2">
        <button
          onClick={() => setActiveTab('services')}
          className={`px-5 py-2.5 rounded-2xl text-xs font-extrabold transition-all cursor-pointer ${
            activeTab === 'services' ? 'bg-[#03045E] text-white shadow-sm' : 'text-gray-600'
          }`}
        >
          Services Catalog ({services.length})
        </button>
        <button
          onClick={() => setActiveTab('pricing')}
          className={`px-5 py-2.5 rounded-2xl text-xs font-extrabold transition-all cursor-pointer ${
            activeTab === 'pricing' ? 'bg-[#03045E] text-white shadow-sm' : 'text-gray-600'
          }`}
        >
          Dynamic Pricing Rules ({services.length})
        </button>
      </div>

      {/* Filter Bar */}
      {activeTab === 'services' && (
        <div className="bg-white rounded-3xl p-4 shadow-xs border border-gray-100 flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto flex-1">
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search services by name, description..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-[#03045E] focus:outline-hidden"
              />
            </div>

            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full sm:w-auto px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold text-gray-700 focus:outline-hidden cursor-pointer"
            >
              <option value="all">All Categories</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full sm:w-auto px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold text-gray-700 focus:outline-hidden cursor-pointer"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active Only</option>
              <option value="disabled">Disabled Only</option>
            </select>

            {(searchQuery || categoryFilter !== 'all' || statusFilter !== 'all') && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setCategoryFilter('all');
                  setStatusFilter('all');
                }}
                className="text-xs font-bold text-[#0077B6] hover:text-[#03045E] cursor-pointer whitespace-nowrap"
              >
                Reset
              </button>
            )}
          </div>

          <div className="text-xs text-gray-500 font-bold self-end md:self-auto">
            Showing <span className="text-[#03045E] font-black">{filteredServices.length}</span> services
          </div>
        </div>
      )}

      {loading && services.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-gray-100 shadow-xs">
          <RefreshCw className="w-8 h-8 text-[#0077B6] animate-spin mx-auto mb-3" />
          <p className="text-xs font-bold text-gray-500">Loading catalog from database...</p>
        </div>
      ) : activeTab === 'services' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {filteredServices.map((srv) => {
            const srvId = srv.id || srv._id;
            const basePrice = srv.basePrice !== undefined ? srv.basePrice : srv.price || 0;
            const pricePerKg = srv.pricePerKg || 0;
            const img = srv.imageUrl || srv.image || 'https://images.unsplash.com/photo-1545173168-9f1947eebb7f?auto=format&fit=crop&w=800&q=80';

            return (
              <div key={srvId} className="bg-white rounded-3xl overflow-hidden shadow-xs border border-gray-100 flex flex-col justify-between group">
                <div>
                  <div className="relative h-44 overflow-hidden">
                    <img src={img} alt={srv.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                    <span className={`absolute top-3 right-3 px-2 py-0.5 rounded-full text-[10px] font-bold shadow-xs ${
                      srv.enabled !== false ? 'bg-emerald-500 text-white' : 'bg-gray-500 text-white'
                    }`}>
                      {srv.enabled !== false ? 'Active' : 'Disabled'}
                    </span>
                  </div>
                  <div className="p-5 space-y-3">
                    <span className="px-2.5 py-0.5 bg-[#CAF0F8] text-[#03045E] rounded-full text-[10px] font-extrabold">
                      {srv.categoryLabel || srv.category || 'General'}
                    </span>
                    <h3 className="font-heading font-extrabold text-sm text-[#03045E]">{srv.name}</h3>
                    <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed">{srv.description}</p>

                    <div className="pt-2 border-t border-gray-100 grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-[10px] text-gray-400 font-bold block">Base Price</span>
                        <span className="font-extrabold text-gray-900">£{Number(basePrice).toFixed(2)}</span>
                      </div>
                      {pricePerKg > 0 ? (
                        <div>
                          <span className="text-[10px] text-gray-400 font-bold block">Per KG Price</span>
                          <span className="font-extrabold text-gray-900">£{Number(pricePerKg).toFixed(2)} /kg</span>
                        </div>
                      ) : (
                        <div>
                          <span className="text-[10px] text-gray-400 font-bold block">Turnaround</span>
                          <span className="font-extrabold text-gray-700">{srv.turnaround || '24h'}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="p-5 pt-0">
                  <button
                    onClick={() => openEditModal(srv)}
                    className="w-full py-2.5 bg-gray-100 hover:bg-[#CAF0F8] hover:text-[#03045E] text-gray-800 rounded-xl text-xs font-bold cursor-pointer transition-colors flex items-center justify-center gap-2"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    <span>Edit Service & Pricing</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-white rounded-3xl shadow-xs border border-gray-100 overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#f8fafc] text-gray-500 font-bold border-b border-gray-100 uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3.5 px-4">Service</th>
                <th className="py-3.5 px-4">Category</th>
                <th className="py-3.5 px-4">Base Price</th>
                <th className="py-3.5 px-4">Price / KG</th>
                <th className="py-3.5 px-4">Turnaround</th>
                <th className="py-3.5 px-4">Express Surcharge</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {services.map((srv) => {
                const srvId = srv.id || srv._id;
                const basePrice = srv.basePrice !== undefined ? srv.basePrice : srv.price || 0;
                const pricePerKg = srv.pricePerKg || 0;

                return (
                  <tr key={srvId} className="hover:bg-gray-50">
                    <td className="py-3.5 px-4 font-bold text-[#03045E]">{srv.name}</td>
                    <td className="py-3.5 px-4 text-gray-600">{srv.categoryLabel || srv.category}</td>
                    <td className="py-3.5 px-4 font-bold">£{Number(basePrice).toFixed(2)}</td>
                    <td className="py-3.5 px-4">{pricePerKg > 0 ? `£${Number(pricePerKg).toFixed(2)} /kg` : 'Fixed / Item'}</td>
                    <td className="py-3.5 px-4 text-gray-600">{srv.turnaround || '24-48 Hours'}</td>
                    <td className="py-3.5 px-4 font-bold text-emerald-600">+£5.00</td>
                    <td className="py-3.5 px-4">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        srv.enabled !== false ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-600'
                      }`}>
                        {srv.enabled !== false ? 'Active' : 'Disabled'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => openEditModal(srv)}
                        className="px-3 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-bold text-xs cursor-pointer"
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Add / Edit Service Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="bg-white w-full max-w-lg rounded-3xl p-6 shadow-2xl space-y-5 relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setModalOpen(false)}
              className="absolute top-5 right-5 text-gray-400 hover:text-gray-700 bg-gray-100 p-2 rounded-full cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <h3 className="text-lg font-heading font-extrabold text-[#03045E]">
                {editingService ? 'Edit Laundry Service' : 'Add New Laundry Service'}
              </h3>
              <p className="text-xs text-gray-500">Live configuration in MongoDB services collection</p>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Service Name</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Wash + Dry + Fold"
                  className="w-full px-3.5 py-2.5 bg-gray-50 rounded-xl text-xs font-medium focus:ring-2 focus:ring-[#03045E] focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Category</label>
                  <select
                    value={formData.categoryLabel}
                    onChange={(e) => setFormData({ ...formData, categoryLabel: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-gray-50 rounded-xl text-xs font-medium focus:ring-2 focus:ring-[#03045E] focus:outline-hidden"
                  >
                    <option value="Wash & Fold">Wash & Fold</option>
                    <option value="Wash & Steam">Wash & Steam</option>
                    <option value="Ironing">Ironing</option>
                    <option value="Duvets & Linen">Duvets & Linen</option>
                    <option value="Dry Cleaning">Dry Cleaning</option>
                    <option value="Special Care">Special Care</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Turnaround Time</label>
                  <input
                    type="text"
                    value={formData.turnaround}
                    onChange={(e) => setFormData({ ...formData, turnaround: e.target.value })}
                    placeholder="e.g. 24-48 Hours"
                    className="w-full px-3.5 py-2.5 bg-gray-50 rounded-xl text-xs font-medium focus:ring-2 focus:ring-[#03045E] focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Base Price (£)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={formData.basePrice}
                    onChange={(e) => setFormData({ ...formData, basePrice: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-gray-50 rounded-xl text-xs font-medium focus:ring-2 focus:ring-[#03045E] focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Price Per KG (£)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.pricePerKg}
                    onChange={(e) => setFormData({ ...formData, pricePerKg: e.target.value })}
                    placeholder="0 if fixed rate"
                    className="w-full px-3.5 py-2.5 bg-gray-50 rounded-xl text-xs font-medium focus:ring-2 focus:ring-[#03045E] focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Service Description</label>
                <textarea
                  rows={2}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Describe items covered, washing steps, detergents used..."
                  className="w-full px-3.5 py-2.5 bg-gray-50 rounded-xl text-xs font-medium focus:ring-2 focus:ring-[#03045E] focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Image URL</label>
                <input
                  type="text"
                  value={formData.imageUrl}
                  onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                  placeholder="https://..."
                  className="w-full px-3.5 py-2.5 bg-gray-50 rounded-xl text-xs font-medium focus:ring-2 focus:ring-[#03045E] focus:outline-hidden"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="srvEnabled"
                  checked={formData.enabled}
                  onChange={(e) => setFormData({ ...formData, enabled: e.target.checked })}
                  className="w-4 h-4 accent-[#03045E] rounded-md"
                />
                <label htmlFor="srvEnabled" className="text-xs font-bold text-gray-700 cursor-pointer">
                  Service is active and available for customer bookings
                </label>
              </div>

              <div className="flex gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="w-1/2 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-2xl text-xs font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving || !formData.name.trim()}
                  className="w-1/2 py-3 bg-[#03045E] hover:bg-[#023E8A] text-white rounded-2xl text-xs font-bold cursor-pointer shadow-md disabled:opacity-50"
                >
                  {saving ? 'Saving...' : editingService ? 'Update Service' : 'Create Service'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
