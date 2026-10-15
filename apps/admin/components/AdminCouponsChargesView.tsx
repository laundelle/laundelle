import React, { useState, useEffect } from 'react';
import {
  Tag,
  DollarSign,
  Percent,
  Plus,
  Trash2,
  Edit2,
  CheckCircle2,
  AlertCircle,
  Save,
  RefreshCw,
  Copy,
  Check,
  Calendar,
  Layers,
  Sparkles,
  ShoppingBag,
  Info,
  ShieldCheck,
  ToggleLeft,
  ToggleRight,
  X,
} from 'lucide-react';
import {
  dbFetchPricingCharges,
  dbUpdatePricingCharges,
  dbFetchAdminCoupons,
  dbCreateCoupon,
  dbUpdateCoupon,
  dbDeleteCoupon,
} from '@laundelle/api-client';
import { Coupon, PricingCharges, CustomChargeItem } from '@laundelle/types';

export const AdminCouponsChargesView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'charges' | 'coupons'>('charges');

  // Loading & Action states
  const [loading, setLoading] = useState<boolean>(true);
  const [savingCharges, setSavingCharges] = useState<boolean>(false);
  const [chargesSuccess, setChargesSuccess] = useState<string | null>(null);
  const [chargesError, setChargesError] = useState<string | null>(null);

  // Charges state
  const [pricingCharges, setPricingCharges] = useState<PricingCharges>({
    taxRate: 20,
    taxEnabled: true,
    deliveryCharge: 2.99,
    freeDeliveryThreshold: 25.0,
    smallOrderFee: 3.5,
    smallOrderThreshold: 20.0,
    serviceFee: 1.49,
    otherCharges: [],
  });

  // Coupons state
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [couponSearch, setCouponSearch] = useState<string>('');
  const [couponFilter, setCouponFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [couponModalOpen, setCouponModalOpen] = useState<boolean>(false);
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);
  const [couponSubmitting, setCouponSubmitting] = useState<boolean>(false);
  const [couponFormError, setCouponFormError] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Form state for creating/editing coupon
  const [couponFormData, setCouponFormData] = useState<{
    code: string;
    description: string;
    discountType: 'percentage' | 'fixed';
    discountValue: number;
    minOrderAmount: number;
    maxDiscountAmount: string;
    expiresAt: string;
    usageLimit: string;
    isActive: boolean;
  }>({
    code: '',
    description: '',
    discountType: 'percentage',
    discountValue: 10,
    minOrderAmount: 0,
    maxDiscountAmount: '',
    expiresAt: '',
    usageLimit: '',
    isActive: true,
  });

  // Load all initial data
  const loadData = async () => {
    setLoading(true);
    setChargesError(null);
    try {
      const [chargesData, couponsData] = await Promise.all([
        dbFetchPricingCharges(),
        dbFetchAdminCoupons(),
      ]);

      if (chargesData) {
        setPricingCharges({
          taxRate: typeof chargesData.taxRate === 'number' ? chargesData.taxRate : 20,
          taxEnabled: chargesData.taxEnabled !== false,
          deliveryCharge: typeof chargesData.deliveryCharge === 'number' ? chargesData.deliveryCharge : 2.99,
          freeDeliveryThreshold: typeof chargesData.freeDeliveryThreshold === 'number' ? chargesData.freeDeliveryThreshold : 25.0,
          smallOrderFee: typeof chargesData.smallOrderFee === 'number' ? chargesData.smallOrderFee : 3.5,
          smallOrderThreshold: typeof chargesData.smallOrderThreshold === 'number' ? chargesData.smallOrderThreshold : 20.0,
          serviceFee: typeof chargesData.serviceFee === 'number' ? chargesData.serviceFee : 1.49,
          otherCharges: Array.isArray(chargesData.otherCharges) ? chargesData.otherCharges : [],
        });
      }

      if (Array.isArray(couponsData)) {
        setCoupons(couponsData);
      }
    } catch (err: any) {
      console.error('Failed to load pricing or coupons:', err);
      setChargesError('Failed to load settings. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Charges Save Handler
  const handleSaveCharges = async () => {
    setSavingCharges(true);
    setChargesSuccess(null);
    setChargesError(null);
    try {
      const res = await dbUpdatePricingCharges(pricingCharges);
      if (res.success) {
        setChargesSuccess('Platform charges and fees updated successfully!');
        if (res.data) {
          setPricingCharges(res.data);
        }
        setTimeout(() => setChargesSuccess(null), 4000);
      } else {
        setChargesError(res.error || 'Failed to update charges.');
      }
    } catch (e: any) {
      setChargesError(e.message || 'An error occurred while saving.');
    } finally {
      setSavingCharges(false);
    }
  };

  // Custom Surcharge Handlers
  const handleAddCustomCharge = () => {
    const newCharge: CustomChargeItem = {
      id: `custom_${Date.now()}`,
      name: 'Special Handling Fee',
      type: 'fixed',
      amount: 1.5,
      enabled: true,
      description: 'Applied per order',
    };
    setPricingCharges((prev) => ({
      ...prev,
      otherCharges: [...prev.otherCharges, newCharge],
    }));
  };

  const handleUpdateCustomCharge = (id: string, field: keyof CustomChargeItem, value: any) => {
    setPricingCharges((prev) => ({
      ...prev,
      otherCharges: prev.otherCharges.map((item) =>
        item.id === id ? { ...item, [field]: value } : item
      ),
    }));
  };

  const handleDeleteCustomCharge = (id: string) => {
    setPricingCharges((prev) => ({
      ...prev,
      otherCharges: prev.otherCharges.filter((item) => item.id !== id),
    }));
  };

  // Open Create/Edit Coupon Modal
  const handleOpenCouponModal = (coupon?: Coupon) => {
    setCouponFormError(null);
    if (coupon) {
      setEditingCoupon(coupon);
      setCouponFormData({
        code: coupon.code,
        description: coupon.description || '',
        discountType: coupon.discountType,
        discountValue: coupon.discountValue,
        minOrderAmount: coupon.minOrderAmount || 0,
        maxDiscountAmount: coupon.maxDiscountAmount ? String(coupon.maxDiscountAmount) : '',
        expiresAt: coupon.expiresAt ? new Date(coupon.expiresAt).toISOString().split('T')[0] : '',
        usageLimit: coupon.usageLimit ? String(coupon.usageLimit) : '',
        isActive: coupon.isActive,
      });
    } else {
      setEditingCoupon(null);
      setCouponFormData({
        code: '',
        description: '',
        discountType: 'percentage',
        discountValue: 15,
        minOrderAmount: 20,
        maxDiscountAmount: '',
        expiresAt: '',
        usageLimit: '',
        isActive: true,
      });
    }
    setCouponModalOpen(true);
  };

  // Save Coupon (Create or Update)
  const handleSubmitCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    setCouponFormError(null);

    const cleanCode = couponFormData.code.trim().toUpperCase();
    if (!cleanCode) {
      setCouponFormError('Coupon code is required.');
      return;
    }

    if (couponFormData.discountValue <= 0) {
      setCouponFormError('Discount value must be greater than 0.');
      return;
    }

    if (couponFormData.discountType === 'percentage' && couponFormData.discountValue > 100) {
      setCouponFormError('Percentage discount cannot exceed 100%.');
      return;
    }

    setCouponSubmitting(true);
    try {
      const payload: any = {
        code: cleanCode,
        description: couponFormData.description.trim(),
        discountType: couponFormData.discountType,
        discountValue: Number(couponFormData.discountValue),
        minOrderAmount: Number(couponFormData.minOrderAmount) || 0,
        maxDiscountAmount: couponFormData.maxDiscountAmount
          ? Number(couponFormData.maxDiscountAmount)
          : undefined,
        expiresAt: couponFormData.expiresAt
          ? new Date(couponFormData.expiresAt).toISOString()
          : null,
        usageLimit: couponFormData.usageLimit ? Number(couponFormData.usageLimit) : null,
        isActive: couponFormData.isActive,
      };

      if (editingCoupon) {
        const res = await dbUpdateCoupon(editingCoupon.id, payload);
        if (res.success && res.coupon) {
          setCoupons((prev) =>
            prev.map((c) => (c.id === editingCoupon.id ? { ...c, ...res.coupon } : c))
          );
          setCouponModalOpen(false);
        } else {
          setCouponFormError(res.error || 'Failed to update coupon');
        }
      } else {
        const res = await dbCreateCoupon(payload);
        if (res.success && res.coupon) {
          setCoupons((prev) => [res.coupon, ...prev]);
          setCouponModalOpen(false);
        } else {
          setCouponFormError(res.error || 'Failed to create coupon');
        }
      }
    } catch (err: any) {
      setCouponFormError(err.message || 'An error occurred.');
    } finally {
      setCouponSubmitting(false);
    }
  };

  // Quick Toggle Active State
  const handleToggleCouponActive = async (coupon: Coupon) => {
    try {
      const updatedStatus = !coupon.isActive;
      const res = await dbUpdateCoupon(coupon.id, { isActive: updatedStatus });
      if (res.success) {
        setCoupons((prev) =>
          prev.map((c) => (c.id === coupon.id ? { ...c, isActive: updatedStatus } : c))
        );
      }
    } catch (err) {
      console.error('Failed to toggle coupon status:', err);
    }
  };

  // Delete Coupon
  const handleDeleteCoupon = async (couponId: string, code: string) => {
    if (!window.confirm(`Are you sure you want to delete coupon code "${code}"?`)) return;
    try {
      const res = await dbDeleteCoupon(couponId);
      if (res.success) {
        setCoupons((prev) => prev.filter((c) => c.id !== couponId));
      } else {
        alert(res.error || 'Failed to delete coupon.');
      }
    } catch (err: any) {
      alert(err.message || 'Failed to delete coupon.');
    }
  };

  // Copy code helper
  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  // Filtered coupons
  const filteredCoupons = coupons.filter((coupon) => {
    const matchesSearch =
      coupon.code.toLowerCase().includes(couponSearch.toLowerCase()) ||
      (coupon.description || '').toLowerCase().includes(couponSearch.toLowerCase());
    if (!matchesSearch) return false;

    if (couponFilter === 'active') return coupon.isActive;
    if (couponFilter === 'inactive') return !coupon.isActive;
    return true;
  });

  return (
    <div className="p-6 md:p-8 space-y-5 max-w-7xl mx-auto font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-100">
        <div>
          <h1 className="text-xl font-heading font-bold text-slate-900 tracking-tight">Coupons & Pricing Charges</h1>
          <p className="text-xs text-slate-500">Discount codes, taxes, delivery fees, and order charges</p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={loadData}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition shadow-2xs cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-blue-600 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>

          {activeTab === 'coupons' && (
            <button
              onClick={() => handleOpenCouponModal()}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-2xs transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Create Coupon</span>
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-2xl p-1.5 shadow-xs border border-slate-100 flex items-center gap-1.5">
        <button
          onClick={() => setActiveTab('charges')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition cursor-pointer ${
            activeTab === 'charges'
              ? 'bg-slate-900 text-white shadow-2xs'
              : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          <DollarSign className="w-3.5 h-3.5" />
          <span>Platform Charges & Taxes</span>
        </button>

        <button
          onClick={() => setActiveTab('coupons')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition cursor-pointer ${
            activeTab === 'coupons'
              ? 'bg-slate-900 text-white shadow-2xs'
              : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          <Tag className="w-3.5 h-3.5" />
          <span>Discount Coupons ({coupons.length})</span>
        </button>
      </div>

      {/* ============================================================== */}
      {/* TAB 1: CHARGES & FEES CONFIGURATION */}
      {/* ============================================================== */}
      {activeTab === 'charges' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Charges Form (Left 2 cols) */}
          <div className="lg:col-span-2 space-y-6">
            {chargesSuccess && (
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-3 text-emerald-800 text-sm">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <span>{chargesSuccess}</span>
              </div>
            )}

            {chargesError && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-2xl flex items-center gap-3 text-red-800 text-sm">
                <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
                <span>{chargesError}</span>
              </div>
            )}

            {/* Delivery & Logistics Charges */}
            <div className="bg-white rounded-2xl border border-gray-200/80 p-6 shadow-xs space-y-5">
              <div className="flex items-center gap-3 pb-3 border-b border-gray-100">
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                  🚚
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Delivery & Logistics Fee</h3>
                  <p className="text-xs text-gray-500">Base delivery charge and free delivery threshold</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                    Base Delivery Fee (£)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-gray-400 font-medium">£</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={pricingCharges.deliveryCharge}
                      onChange={(e) =>
                        setPricingCharges((prev) => ({
                          ...prev,
                          deliveryCharge: parseFloat(e.target.value) || 0,
                        }))
                      }
                      className="w-full pl-8 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-[#0077B6]/20 focus:border-[#0077B6]"
                    />
                  </div>
                  <p className="text-[11px] text-gray-400 mt-1">Charged on orders below the free delivery threshold.</p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                    Free Delivery Threshold (£)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-gray-400 font-medium">£</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={pricingCharges.freeDeliveryThreshold}
                      onChange={(e) =>
                        setPricingCharges((prev) => ({
                          ...prev,
                          freeDeliveryThreshold: parseFloat(e.target.value) || 0,
                        }))
                      }
                      className="w-full pl-8 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-[#0077B6]/20 focus:border-[#0077B6]"
                    />
                  </div>
                  <p className="text-[11px] text-gray-400 mt-1">Orders at or above this amount enjoy free delivery.</p>
                </div>
              </div>
            </div>

            {/* Small Order Fee & Platform Service Fee */}
            <div className="bg-white rounded-2xl border border-gray-200/80 p-6 shadow-xs space-y-5">
              <div className="flex items-center gap-3 pb-3 border-b border-gray-100">
                <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                  ⚡
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Small Order & Service Fees</h3>
                  <p className="text-xs text-gray-500">Protect minimum basket economics and platform operating costs</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                    Small Order Threshold (£)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-gray-400 font-medium">£</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={pricingCharges.smallOrderThreshold}
                      onChange={(e) =>
                        setPricingCharges((prev) => ({
                          ...prev,
                          smallOrderThreshold: parseFloat(e.target.value) || 0,
                        }))
                      }
                      className="w-full pl-8 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-[#0077B6]/20 focus:border-[#0077B6]"
                    />
                  </div>
                  <p className="text-[11px] text-gray-400 mt-1">Orders under this value incur a small order surcharge.</p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                    Small Order Fee (£)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-gray-400 font-medium">£</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={pricingCharges.smallOrderFee}
                      onChange={(e) =>
                        setPricingCharges((prev) => ({
                          ...prev,
                          smallOrderFee: parseFloat(e.target.value) || 0,
                        }))
                      }
                      className="w-full pl-8 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-[#0077B6]/20 focus:border-[#0077B6]"
                    />
                  </div>
                  <p className="text-[11px] text-gray-400 mt-1">Fixed fee applied when order falls under threshold.</p>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                    Fixed Platform Service Fee (£)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-gray-400 font-medium">£</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={pricingCharges.serviceFee}
                      onChange={(e) =>
                        setPricingCharges((prev) => ({
                          ...prev,
                          serviceFee: parseFloat(e.target.value) || 0,
                        }))
                      }
                      className="w-full pl-8 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-[#0077B6]/20 focus:border-[#0077B6]"
                    />
                  </div>
                  <p className="text-[11px] text-gray-400 mt-1">
                    Standard booking & operational care fee charged on every customer order.
                  </p>
                </div>
              </div>
            </div>

            {/* Taxes (VAT) Configuration */}
            <div className="bg-white rounded-2xl border border-gray-200/80 p-6 shadow-xs space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                    %
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">Tax & VAT Settings</h3>
                    <p className="text-xs text-gray-500">Government taxes or standard UK VAT rate</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-gray-600">
                    {pricingCharges.taxEnabled ? 'Enabled' : 'Disabled'}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setPricingCharges((prev) => ({ ...prev, taxEnabled: !prev.taxEnabled }))
                    }
                    className="cursor-pointer text-gray-400 hover:text-[#0077B6] transition"
                  >
                    {pricingCharges.taxEnabled ? (
                      <ToggleRight className="w-8 h-8 text-[#0077B6]" />
                    ) : (
                      <ToggleLeft className="w-8 h-8 text-gray-300" />
                    )}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                  Tax Rate (%)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    disabled={!pricingCharges.taxEnabled}
                    value={pricingCharges.taxRate}
                    onChange={(e) =>
                      setPricingCharges((prev) => ({
                        ...prev,
                        taxRate: parseFloat(e.target.value) || 0,
                      }))
                    }
                    className="w-full pr-8 pl-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-[#0077B6]/20 focus:border-[#0077B6] disabled:bg-gray-50 disabled:text-gray-400"
                  />
                  <span className="absolute right-3 top-2.5 text-gray-400 font-medium">%</span>
                </div>
                <p className="text-[11px] text-gray-400 mt-1">
                  Standard UK VAT is 20%. Automatically calculated on taxable goods and services.
                </p>
              </div>
            </div>

            {/* Custom Surcharges & Other Charges */}
            <div className="bg-white rounded-2xl border border-gray-200/80 p-6 shadow-xs space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
                    ✨
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">Custom Surcharges & Extras</h3>
                    <p className="text-xs text-gray-500">
                      Add custom fees such as Eco-packaging, Express handling, or Peak-hour fees
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleAddCustomCharge}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#0077B6] bg-blue-50 hover:bg-blue-100 rounded-lg transition cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Surcharge
                </button>
              </div>

              {pricingCharges.otherCharges.length === 0 ? (
                <div className="py-6 text-center border border-dashed border-gray-200 rounded-xl">
                  <Layers className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                  <p className="text-xs text-gray-500">No custom surcharges configured.</p>
                  <p className="text-[11px] text-gray-400">Click &ldquo;Add Surcharge&rdquo; to add custom fees.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {pricingCharges.otherCharges.map((item) => (
                    <div
                      key={item.id}
                      className="p-3.5 bg-gray-50/70 border border-gray-200 rounded-xl flex flex-col sm:flex-row items-start sm:items-center gap-3"
                    >
                      <div className="flex-1 w-full sm:w-auto">
                        <input
                          type="text"
                          value={item.name}
                          onChange={(e) => handleUpdateCustomCharge(item.id, 'name', e.target.value)}
                          placeholder="Charge Title (e.g. Eco Packaging)"
                          className="w-full text-xs font-semibold px-2.5 py-1.5 bg-white border border-gray-200 rounded-lg focus:outline-hidden focus:border-[#0077B6]"
                        />
                      </div>

                      <div className="w-32">
                        <select
                          value={item.type}
                          onChange={(e) =>
                            handleUpdateCustomCharge(item.id, 'type', e.target.value as 'fixed' | 'percentage')
                          }
                          className="w-full text-xs px-2 py-1.5 bg-white border border-gray-200 rounded-lg focus:outline-hidden focus:border-[#0077B6]"
                        >
                          <option value="fixed">Fixed (£)</option>
                          <option value="percentage">Percent (%)</option>
                        </select>
                      </div>

                      <div className="w-24 relative">
                        <input
                          type="number"
                          step="0.1"
                          min="0"
                          value={item.amount}
                          onChange={(e) =>
                            handleUpdateCustomCharge(item.id, 'amount', parseFloat(e.target.value) || 0)
                          }
                          className="w-full text-xs pl-2 pr-5 py-1.5 bg-white border border-gray-200 rounded-lg focus:outline-hidden focus:border-[#0077B6]"
                        />
                        <span className="absolute right-2 top-1.5 text-xs text-gray-400">
                          {item.type === 'percentage' ? '%' : '£'}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-center">
                        <button
                          type="button"
                          onClick={() => handleUpdateCustomCharge(item.id, 'enabled', !item.enabled)}
                          title={item.enabled ? 'Enabled' : 'Disabled'}
                          className="cursor-pointer"
                        >
                          {item.enabled ? (
                            <ToggleRight className="w-6 h-6 text-emerald-600" />
                          ) : (
                            <ToggleLeft className="w-6 h-6 text-gray-300" />
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDeleteCustomCharge(item.id)}
                          className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition cursor-pointer"
                          title="Remove Surcharge"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Save Button */}
            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={handleSaveCharges}
                disabled={savingCharges}
                className="inline-flex items-center gap-2 px-6 py-3 bg-[#0077B6] hover:bg-[#023E8A] text-white font-semibold text-sm rounded-xl shadow-md shadow-[#0077B6]/20 transition cursor-pointer disabled:opacity-50"
              >
                <Save className={`w-4 h-4 ${savingCharges ? 'animate-spin' : ''}`} />
                {savingCharges ? 'Saving Changes...' : 'Save All Charges'}
              </button>
            </div>
          </div>

          {/* Live Checkout Preview (Right col) */}
          <div className="space-y-6">
            <div className="bg-gradient-to-br from-slate-900 to-[#03045E] text-white rounded-3xl p-6 shadow-xl relative overflow-hidden">
              <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
                <ShoppingBag className="w-36 h-36" />
              </div>

              <div className="flex items-center gap-2 text-[#48CAE4] text-xs font-bold uppercase tracking-wider mb-4">
                <Sparkles className="w-4 h-4" />
                Live Customer Checkout Simulator
              </div>

              <h4 className="text-lg font-bold mb-1">Receipt Preview</h4>
              <p className="text-xs text-white/70 mb-5">
                Simulated calculation for an example order with your active configuration.
              </p>

              {/* Simulation 1: Small order (£15) */}
              <div className="bg-white/10 rounded-2xl p-4 backdrop-blur-md mb-4 border border-white/10 text-xs space-y-2">
                <div className="flex justify-between font-bold text-white/90 pb-2 border-b border-white/10">
                  <span>Scenario A: Small Basket (£15.00)</span>
                  <span className="text-[#48CAE4]">Below £{pricingCharges.smallOrderThreshold}</span>
                </div>
                <div className="flex justify-between text-white/70">
                  <span>Subtotal</span>
                  <span>£15.00</span>
                </div>
                <div className="flex justify-between text-white/70">
                  <span>Delivery Fee</span>
                  <span>£{pricingCharges.deliveryCharge.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-amber-300">
                  <span>Small Order Fee</span>
                  <span>+£{pricingCharges.smallOrderFee.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-white/70">
                  <span>Service Fee</span>
                  <span>+£{pricingCharges.serviceFee.toFixed(2)}</span>
                </div>
                {pricingCharges.otherCharges
                  .filter((c) => c.enabled)
                  .map((c) => (
                    <div key={c.id} className="flex justify-between text-white/70">
                      <span>{c.name}</span>
                      <span>
                        +£{c.type === 'percentage' ? ((15 * c.amount) / 100).toFixed(2) : c.amount.toFixed(2)}
                      </span>
                    </div>
                  ))}
                {pricingCharges.taxEnabled && (
                  <div className="flex justify-between text-white/70">
                    <span>VAT ({pricingCharges.taxRate}%)</span>
                    <span>
                      +£{((15 * pricingCharges.taxRate) / 100).toFixed(2)}
                    </span>
                  </div>
                )}
                <div className="pt-2 border-t border-white/20 flex justify-between font-bold text-sm text-white">
                  <span>Estimated Total</span>
                  <span className="text-[#48CAE4]">
                    £
                    {(
                      15 +
                      pricingCharges.deliveryCharge +
                      pricingCharges.smallOrderFee +
                      pricingCharges.serviceFee +
                      pricingCharges.otherCharges
                        .filter((c) => c.enabled)
                        .reduce(
                          (sum, c) => sum + (c.type === 'percentage' ? (15 * c.amount) / 100 : c.amount),
                          0
                        ) +
                      (pricingCharges.taxEnabled ? (15 * pricingCharges.taxRate) / 100 : 0)
                    ).toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Simulation 2: Free Delivery basket (£40) */}
              <div className="bg-white/10 rounded-2xl p-4 backdrop-blur-md border border-white/10 text-xs space-y-2">
                <div className="flex justify-between font-bold text-white/90 pb-2 border-b border-white/10">
                  <span>Scenario B: Standard Basket (£40.00)</span>
                  <span className="text-emerald-400">Free Delivery Met</span>
                </div>
                <div className="flex justify-between text-white/70">
                  <span>Subtotal</span>
                  <span>£40.00</span>
                </div>
                <div className="flex justify-between text-emerald-400">
                  <span>Delivery Fee</span>
                  <span>FREE (£0.00)</span>
                </div>
                <div className="flex justify-between text-white/70">
                  <span>Service Fee</span>
                  <span>+£{pricingCharges.serviceFee.toFixed(2)}</span>
                </div>
                {pricingCharges.otherCharges
                  .filter((c) => c.enabled)
                  .map((c) => (
                    <div key={c.id} className="flex justify-between text-white/70">
                      <span>{c.name}</span>
                      <span>
                        +£{c.type === 'percentage' ? ((40 * c.amount) / 100).toFixed(2) : c.amount.toFixed(2)}
                      </span>
                    </div>
                  ))}
                {pricingCharges.taxEnabled && (
                  <div className="flex justify-between text-white/70">
                    <span>VAT ({pricingCharges.taxRate}%)</span>
                    <span>
                      +£{((40 * pricingCharges.taxRate) / 100).toFixed(2)}
                    </span>
                  </div>
                )}
                <div className="pt-2 border-t border-white/20 flex justify-between font-bold text-sm text-white">
                  <span>Estimated Total</span>
                  <span className="text-emerald-400">
                    £
                    {(
                      40 +
                      pricingCharges.serviceFee +
                      pricingCharges.otherCharges
                        .filter((c) => c.enabled)
                        .reduce(
                          (sum, c) => sum + (c.type === 'percentage' ? (40 * c.amount) / 100 : c.amount),
                          0
                        ) +
                      (pricingCharges.taxEnabled ? (40 * pricingCharges.taxRate) / 100 : 0)
                    ).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            <div className="p-4 bg-blue-50/60 rounded-2xl border border-blue-100 flex items-start gap-3 text-xs text-blue-900">
              <Info className="w-5 h-5 text-[#0077B6] shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold block mb-0.5">Real-Time Sync</span>
                Changes saved here take immediate effect for all customer web and mobile checkouts without requiring server restarts.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 2: COUPONS MANAGEMENT */}
      {/* ============================================================== */}
      {activeTab === 'coupons' && (
        <div className="space-y-6">
          {/* Controls Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-gray-200 shadow-xs">
            <div className="relative flex-1">
              <input
                type="text"
                placeholder="Search coupons by code or description..."
                value={couponSearch}
                onChange={(e) => setCouponSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-hidden focus:border-[#0077B6]"
              />
              <Tag className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
            </div>

            <div className="flex items-center gap-2">
              <select
                value={couponFilter}
                onChange={(e) => setCouponFilter(e.target.value as any)}
                className="px-3 py-2 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 bg-white focus:outline-hidden focus:border-[#0077B6]"
              >
                <option value="all">All Coupons</option>
                <option value="active">Active Only</option>
                <option value="inactive">Inactive Only</option>
              </select>

              <button
                onClick={() => handleOpenCouponModal()}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#0077B6] hover:bg-[#023E8A] text-white text-sm font-semibold rounded-xl shadow-xs transition cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                New Coupon
              </button>
            </div>
          </div>

          {/* Coupons Table */}
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-xs">
            {filteredCoupons.length === 0 ? (
              <div className="text-center py-16 px-4">
                <Tag className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <h3 className="text-base font-semibold text-gray-900">No coupons found</h3>
                <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
                  {couponSearch
                    ? 'No coupons match your search query.'
                    : 'Get started by creating discount codes to drive customer conversions.'}
                </p>
                {!couponSearch && (
                  <button
                    onClick={() => handleOpenCouponModal()}
                    className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 bg-[#0077B6] text-white text-xs font-semibold rounded-xl hover:bg-[#023E8A] transition cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    Create First Coupon
                  </button>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50/80 border-b border-gray-200 text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                      <th className="py-3.5 px-4">Code</th>
                      <th className="py-3.5 px-4">Discount</th>
                      <th className="py-3.5 px-4">Min Spend</th>
                      <th className="py-3.5 px-4">Max Cap</th>
                      <th className="py-3.5 px-4">Usage / Limit</th>
                      <th className="py-3.5 px-4">Expires</th>
                      <th className="py-3.5 px-4 text-center">Status</th>
                      <th className="py-3.5 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-sm">
                    {filteredCoupons.map((coupon) => (
                      <tr key={coupon.id} className="hover:bg-gray-50/50 transition">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-gray-900 px-2.5 py-1 bg-gray-100 border border-gray-200 rounded-lg text-xs">
                              {coupon.code}
                            </span>
                            <button
                              onClick={() => handleCopyCode(coupon.code)}
                              className="text-gray-400 hover:text-[#0077B6] transition cursor-pointer"
                              title="Copy code"
                            >
                              {copiedCode === coupon.code ? (
                                <Check className="w-3.5 h-3.5 text-emerald-600" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>
                          {coupon.description && (
                            <p className="text-[11px] text-gray-500 mt-1 truncate max-w-xs">
                              {coupon.description}
                            </p>
                          )}
                        </td>

                        <td className="py-3 px-4 font-semibold text-gray-900">
                          {coupon.discountType === 'percentage' ? (
                            <span className="inline-flex items-center gap-1 text-[#0077B6]">
                              <Percent className="w-3.5 h-3.5" />
                              {coupon.discountValue}% OFF
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-emerald-600">
                              £{coupon.discountValue.toFixed(2)} OFF
                            </span>
                          )}
                        </td>

                        <td className="py-3 px-4 text-gray-600 text-xs">
                          {coupon.minOrderAmount > 0 ? `£${coupon.minOrderAmount.toFixed(2)}` : 'None'}
                        </td>

                        <td className="py-3 px-4 text-gray-600 text-xs">
                          {coupon.maxDiscountAmount ? `£${coupon.maxDiscountAmount.toFixed(2)}` : 'No Cap'}
                        </td>

                        <td className="py-3 px-4 text-xs text-gray-700">
                          <span className="font-medium">{coupon.usageCount || 0}</span>
                          <span className="text-gray-400">
                            {' '}
                            / {coupon.usageLimit ? coupon.usageLimit : '∞'}
                          </span>
                        </td>

                        <td className="py-3 px-4 text-xs text-gray-600">
                          {coupon.expiresAt ? (
                            new Date(coupon.expiresAt).toLocaleDateString('en-GB', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                            })
                          ) : (
                            <span className="text-gray-400">Never</span>
                          )}
                        </td>

                        <td className="py-3 px-4 text-center">
                          <button
                            type="button"
                            onClick={() => handleToggleCouponActive(coupon)}
                            className="cursor-pointer inline-flex items-center gap-1"
                            title="Click to toggle"
                          >
                            {coupon.isActive ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
                                Active
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-600 border border-gray-200">
                                Inactive
                              </span>
                            )}
                          </button>
                        </td>

                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleOpenCouponModal(coupon)}
                              className="p-1.5 text-gray-400 hover:text-[#0077B6] hover:bg-blue-50 rounded-lg transition cursor-pointer"
                              title="Edit Coupon"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteCoupon(coupon.id, coupon.code)}
                              className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition cursor-pointer"
                              title="Delete Coupon"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* COUPON CREATE / EDIT MODAL */}
      {/* ============================================================== */}
      {couponModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white w-full max-w-lg rounded-3xl p-6 shadow-2xl relative animate-in fade-in zoom-in duration-150">
            <button
              onClick={() => setCouponModalOpen(false)}
              className="absolute top-5 right-5 text-gray-400 hover:text-gray-700 bg-gray-100 p-2 rounded-full cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#0077B6] flex items-center justify-center font-bold">
                <Tag className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">
                  {editingCoupon ? 'Edit Coupon' : 'Create New Coupon'}
                </h3>
                <p className="text-xs text-gray-500">Configure discount value, minimums and limits</p>
              </div>
            </div>

            {couponFormError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{couponFormError}</span>
              </div>
            )}

            <form onSubmit={handleSubmitCoupon} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Coupon Code *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. WELCOME25"
                    value={couponFormData.code}
                    onChange={(e) =>
                      setCouponFormData((prev) => ({
                        ...prev,
                        code: e.target.value.toUpperCase().replace(/\s+/g, ''),
                      }))
                    }
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm font-mono font-bold uppercase focus:outline-hidden focus:border-[#0077B6]"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Description
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 25% off for first-time laundry orders"
                    value={couponFormData.description}
                    onChange={(e) =>
                      setCouponFormData((prev) => ({ ...prev, description: e.target.value }))
                    }
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-hidden focus:border-[#0077B6]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Discount Type
                  </label>
                  <select
                    value={couponFormData.discountType}
                    onChange={(e) =>
                      setCouponFormData((prev) => ({
                        ...prev,
                        discountType: e.target.value as 'percentage' | 'fixed',
                      }))
                    }
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-hidden focus:border-[#0077B6]"
                  >
                    <option value="percentage">Percentage (%)</option>
                    <option value="fixed">Fixed Amount (£)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Discount Value *
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      required
                      value={couponFormData.discountValue}
                      onChange={(e) =>
                        setCouponFormData((prev) => ({
                          ...prev,
                          discountValue: parseFloat(e.target.value) || 0,
                        }))
                      }
                      className="w-full pl-3 pr-8 py-2 border border-gray-200 rounded-xl text-sm font-semibold focus:outline-hidden focus:border-[#0077B6]"
                    />
                    <span className="absolute right-3 top-2 text-xs text-gray-400 font-bold">
                      {couponFormData.discountType === 'percentage' ? '%' : '£'}
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Min Order Spend (£)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0"
                    value={couponFormData.minOrderAmount}
                    onChange={(e) =>
                      setCouponFormData((prev) => ({
                        ...prev,
                        minOrderAmount: parseFloat(e.target.value) || 0,
                      }))
                    }
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-hidden focus:border-[#0077B6]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Max Discount Cap (£)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="Optional"
                    value={couponFormData.maxDiscountAmount}
                    onChange={(e) =>
                      setCouponFormData((prev) => ({ ...prev, maxDiscountAmount: e.target.value }))
                    }
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-hidden focus:border-[#0077B6]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Expiration Date
                  </label>
                  <input
                    type="date"
                    value={couponFormData.expiresAt}
                    onChange={(e) =>
                      setCouponFormData((prev) => ({ ...prev, expiresAt: e.target.value }))
                    }
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-hidden focus:border-[#0077B6]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Total Usage Limit
                  </label>
                  <input
                    type="number"
                    min="1"
                    placeholder="Unlimited"
                    value={couponFormData.usageLimit}
                    onChange={(e) =>
                      setCouponFormData((prev) => ({ ...prev, usageLimit: e.target.value }))
                    }
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-hidden focus:border-[#0077B6]"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-between border-t border-gray-100">
                <label className="flex items-center gap-2 text-xs font-medium text-gray-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={couponFormData.isActive}
                    onChange={(e) =>
                      setCouponFormData((prev) => ({ ...prev, isActive: e.target.checked }))
                    }
                    className="rounded-sm text-[#0077B6] focus:ring-[#0077B6]"
                  />
                  Coupon is Active & Redeemable
                </label>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setCouponModalOpen(false)}
                    className="px-4 py-2 border border-gray-200 rounded-xl text-xs font-semibold text-gray-600 hover:bg-gray-50 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={couponSubmitting}
                    className="px-5 py-2 bg-[#0077B6] hover:bg-[#023E8A] text-white rounded-xl text-xs font-semibold shadow-xs cursor-pointer disabled:opacity-50"
                  >
                    {couponSubmitting ? 'Saving...' : editingCoupon ? 'Update Coupon' : 'Create Coupon'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
