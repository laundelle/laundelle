import React, { useState, useEffect, useRef } from 'react';
import {
  Plus,
  Edit2,
  Check,
  X,
  RefreshCw,
  Sparkles,
  Tag,
  Clock,
  Search,
  UploadCloud,
  Image as ImageIcon,
  Trash2,
  Camera,
  AlertCircle
} from 'lucide-react';
import { dbAdminFetchServices, dbAdminCreateService, dbAdminUpdateService } from '@laundelle/api-client';
import { LAUNDELLE_SERVICE_IMAGES, getOptimizedImageUrl } from '@laundelle/config';

// Map service names to the exact Cloudinary images used on the customer portal
const CUSTOMER_SERVICE_IMAGES: Record<string, string> = Object.entries(LAUNDELLE_SERVICE_IMAGES).reduce(
  (acc, [name, meta]) => {
    acc[name] = getOptimizedImageUrl(meta);
    return acc;
  },
  {} as Record<string, string>
);

const DEFAULT_SERVICE_FALLBACK =
  CUSTOMER_SERVICE_IMAGES['Wash + Dry + Fold'] ||
  'https://res.cloudinary.com/b2st53lu/image/upload/f_auto,q_auto/laundelle/services/wash-dry-fold';

export const resolveServiceImage = (srv: any): string => {
  if (srv?.imageUrl && !srv.imageUrl.startsWith('/Images/')) {
    return srv.imageUrl;
  }
  if (srv?.image && !srv.image.startsWith('/Images/')) {
    return srv.image;
  }
  if (srv?.name && CUSTOMER_SERVICE_IMAGES[srv.name]) {
    return CUSTOMER_SERVICE_IMAGES[srv.name];
  }
  return DEFAULT_SERVICE_FALLBACK;
};

// Canvas-based image optimizer to keep database lean and fast
const processImageFile = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      reject(new Error('Please upload an image file (PNG, JPG, or WEBP).'));
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      reject(new Error('File size exceeds 5MB limit. Please choose a smaller image.'));
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const MAX_WIDTH = 1200;
        const MAX_HEIGHT = 1200;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height = Math.round((height * MAX_WIDTH) / width);
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width = Math.round((width * MAX_HEIGHT) / height);
            height = MAX_HEIGHT;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(event.target?.result as string);
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        try {
          const dataUrl = canvas.toDataURL('image/webp', 0.85);
          resolve(dataUrl);
        } catch {
          const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
          resolve(dataUrl);
        }
      };
      img.onerror = () => reject(new Error('Failed to read image content.'));
      img.src = event.target?.result as string;
    };
    reader.onerror = () => reject(new Error('Failed to read selected file.'));
    reader.readAsDataURL(file);
  });
};

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
    imageUrl: '',
    enabled: true
  });
  const [saving, setSaving] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadServices = async () => {
    setLoading(true);
    try {
      const data = await dbAdminFetchServices();
      setServices(data || []);
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
    setUploadError(null);
    setIsDragging(false);
    setFormData({
      name: '',
      categoryLabel: 'Wash & Fold',
      description: '',
      basePrice: '12.00',
      pricePerKg: '3.50',
      turnaround: '24-48 Hours',
      imageUrl: '',
      enabled: true
    });
    setModalOpen(true);
  };

  const openEditModal = (srv: any) => {
    setEditingService(srv);
    setUploadError(null);
    setIsDragging(false);
    setFormData({
      name: srv.name || '',
      categoryLabel: srv.categoryLabel || srv.category || 'Wash & Fold',
      description: srv.description || '',
      basePrice: String(srv.basePrice || srv.price || '0'),
      pricePerKg: String(srv.pricePerKg || '0'),
      turnaround: srv.turnaround || '24-48 Hours',
      imageUrl: resolveServiceImage(srv),
      enabled: srv.enabled !== false
    });
    setModalOpen(true);
  };

  const handleFileSelect = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploadError(null);
    try {
      const dataUrl = await processImageFile(files[0]);
      setFormData(prev => ({ ...prev, imageUrl: dataUrl }));
    } catch (err: any) {
      setUploadError(err.message || 'Error processing image.');
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      await handleFileSelect(e.dataTransfer.files);
    }
  };

  const handleRemovePhoto = () => {
    setFormData(prev => ({ ...prev, imageUrl: '' }));
    setUploadError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
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
        imageUrl: (formData.imageUrl || '').trim(),
        image: (formData.imageUrl || '').trim(),
        enabled: formData.enabled
      };

      if (editingService) {
        const id = editingService.id || editingService._id || editingService.publicId;
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
    <div className="w-full space-y-5 p-6 sm:p-8 pb-24 font-sans">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-heading font-bold text-slate-900 tracking-tight">Services & Pricing</h1>
          <p className="text-xs text-slate-500">Configure laundry services and base pricing</p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={loadServices}
            disabled={loading}
            className="px-3.5 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-2xs"
            title="Refresh Services Catalog"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-blue-600 ${loading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
          <button
            onClick={openAddModal}
            className="bg-blue-600 hover:bg-blue-700 text-white px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-2xs cursor-pointer transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Add Service</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-2xl p-1.5 shadow-xs border border-slate-100 flex items-center gap-1.5">
        <button
          onClick={() => setActiveTab('services')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
            activeTab === 'services' ? 'bg-slate-900 text-white shadow-2xs' : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          Services ({services.length})
        </button>
        <button
          onClick={() => setActiveTab('pricing')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
            activeTab === 'pricing' ? 'bg-slate-900 text-white shadow-2xs' : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          Pricing Rules
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
            const img = resolveServiceImage(srv);

            return (
              <div key={srvId} className="bg-white rounded-3xl overflow-hidden shadow-xs border border-gray-100 flex flex-col justify-between group">
                <div>
                  <div className="relative h-44 overflow-hidden bg-slate-100">
                    <img
                      src={img}
                      alt={srv.name}
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).src = CUSTOMER_SERVICE_IMAGES[srv.name] || DEFAULT_SERVICE_FALLBACK;
                      }}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
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
                const img = resolveServiceImage(srv);

                return (
                  <tr key={srvId} className="hover:bg-gray-50">
                    <td className="py-3.5 px-4 font-bold text-[#03045E]">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl overflow-hidden bg-slate-100 shrink-0 border border-slate-200">
                          <img
                            src={img}
                            alt={srv.name}
                            onError={(e) => {
                              (e.currentTarget as HTMLImageElement).src = CUSTOMER_SERVICE_IMAGES[srv.name] || DEFAULT_SERVICE_FALLBACK;
                            }}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <span>{srv.name}</span>
                      </div>
                    </td>
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

      {/* Add / Edit Service Modal with Drag & Drop Photo Upload */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="bg-white w-full max-w-lg rounded-3xl p-6 shadow-2xl space-y-5 relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setModalOpen(false)}
              className="absolute top-5 right-5 text-gray-400 hover:text-gray-700 bg-gray-100 p-2 rounded-full cursor-pointer transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <h3 className="text-lg font-heading font-extrabold text-[#03045E]">
                {editingService ? 'Edit Laundry Service' : 'Add New Laundry Service'}
              </h3>
              <p className="text-xs text-gray-500">Live configuration in MongoDB services catalog</p>
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
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-[#03045E] focus:outline-hidden"
                />
              </div>

              {/* Service Photo Drag & Drop / Upload */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5 flex items-center justify-between">
                  <span>Service Photo</span>
                  {formData.imageUrl && (
                    <span className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1">
                      <Check className="w-3 h-3" /> Photo Attached
                    </span>
                  )}
                </label>

                {/* Hidden File Input */}
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={(e) => handleFileSelect(e.target.files)}
                  accept="image/png,image/jpeg,image/jpg,image/webp"
                  className="hidden"
                />

                {formData.imageUrl ? (
                  /* Photo Preview State */
                  <div className="relative rounded-2xl overflow-hidden border border-slate-200 bg-slate-50 group">
                    <div className="h-44 w-full overflow-hidden bg-slate-100 flex items-center justify-center">
                      <img
                        src={formData.imageUrl}
                        alt="Service preview"
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).src = DEFAULT_SERVICE_FALLBACK;
                        }}
                        className="w-full h-full object-cover"
                      />
                    </div>

                    {/* Overlay Action Bar */}
                    <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2.5 p-4">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="px-3.5 py-2 bg-white text-slate-800 hover:bg-slate-100 rounded-xl text-xs font-bold shadow-md flex items-center gap-1.5 transition-all cursor-pointer"
                      >
                        <Camera className="w-3.5 h-3.5 text-blue-600" />
                        <span>Change Photo</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleRemovePhoto}
                        className="px-3.5 py-2 bg-red-600 text-white hover:bg-red-700 rounded-xl text-xs font-bold shadow-md flex items-center gap-1.5 transition-all cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Remove</span>
                      </button>
                    </div>

                    <div className="p-2.5 bg-white border-t border-slate-100 flex items-center justify-between text-xs">
                      <span className="text-[11px] text-slate-500 font-medium truncate max-w-[220px]">
                        Service photo ready
                      </span>
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="text-xs font-bold text-blue-600 hover:text-blue-800 cursor-pointer"
                      >
                        Upload Another
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Drag & Drop Zone */
                  <div
                    onDragOver={handleDragOver}
                    onDragEnter={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-2 ${
                      isDragging
                        ? 'border-blue-600 bg-blue-50/60 scale-[1.01]'
                        : 'border-slate-200 hover:border-blue-400 bg-slate-50/60 hover:bg-slate-50'
                    }`}
                  >
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-colors ${
                      isDragging ? 'bg-blue-600 text-white' : 'bg-blue-50 text-blue-600'
                    }`}>
                      <UploadCloud className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-800">
                        Drag and drop your photo here, or <span className="text-blue-600 underline">browse files</span>
                      </p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        High resolution PNG, JPG, or WEBP (up to 5MB)
                      </p>
                    </div>
                  </div>
                )}

                {uploadError && (
                  <div className="mt-2 text-xs text-red-600 flex items-center gap-1.5 bg-red-50 p-2 rounded-xl border border-red-100">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{uploadError}</span>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Category</label>
                  <select
                    value={formData.categoryLabel}
                    onChange={(e) => setFormData({ ...formData, categoryLabel: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-[#03045E] focus:outline-hidden cursor-pointer"
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
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-[#03045E] focus:outline-hidden"
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
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-[#03045E] focus:outline-hidden"
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
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-[#03045E] focus:outline-hidden"
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
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-[#03045E] focus:outline-hidden"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="srvEnabled"
                  checked={formData.enabled}
                  onChange={(e) => setFormData({ ...formData, enabled: e.target.checked })}
                  className="w-4 h-4 accent-[#03045E] rounded-md cursor-pointer"
                />
                <label htmlFor="srvEnabled" className="text-xs font-bold text-gray-700 cursor-pointer">
                  Service is active and available for customer bookings
                </label>
              </div>

              <div className="flex gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="w-1/2 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-2xl text-xs font-bold cursor-pointer transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving || !formData.name.trim()}
                  className="w-1/2 py-3 bg-[#03045E] hover:bg-[#023E8A] text-white rounded-2xl text-xs font-bold cursor-pointer shadow-md disabled:opacity-50 transition-colors"
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
